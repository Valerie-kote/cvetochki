"use client";

import * as React from "react";
import {
  User,
  Ruler,
  Weight,
  Target,
  Calculator,
  CalendarDays,
  AlertCircle,
  Bell,
  Database,
  Palette,
  Download,
  Upload,
  Trash2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAppStore } from "@/store/app-store";
import {
  calcBMI,
  calcBMR,
  calcTargetKcal,
  calcTargetMacros,
  calcTDEE,
  ymd,
} from "@/lib/calc";
import {
  ActivityLevel,
  BmrFormula,
  Goal,
  Sex,
} from "@/lib/types";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import {
  ACTIVITY_DESCRIPTIONS,
  FORMULA_DESCRIPTIONS,
} from "@/lib/sample-data";

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string }[] = (
  Object.keys(ACTIVITY_DESCRIPTIONS) as ActivityLevel[]
).map((k) => ({ value: k, label: ACTIVITY_DESCRIPTIONS[k].title }));

const GOAL_OPTIONS: { value: Goal; label: string }[] = [
  { value: "deficit", label: "Дефицит (похудение)" },
  { value: "maintain", label: "Поддержание" },
  { value: "surplus", label: "Профицит (набор)" },
];

export function ProfileScreen() {
  const profile = useAppStore((s) => s.profile);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const addGoalHistory = useAppStore((s) => s.addGoalHistory);
  const exportJson = useAppStore((s) => s.exportJson);
  const importJson = useAppStore((s) => s.importJson);
  const resetAll = useAppStore((s) => s.resetAll);

  const [draft, setDraft] = React.useState(profile);
  React.useEffect(() => setDraft(profile), [profile]);

  const [showAllergies, setShowAllergies] = React.useState(profile.useAllergies);
  const [allergyText, setAllergyText] = React.useState(profile.allergies.join(", "));
  const [resetOpen, setResetOpen] = React.useState(false);
  const [importText, setImportText] = React.useState("");
  const [importOpen, setImportOpen] = React.useState(false);

  const bmr = calcBMR(draft);
  const tdee = calcTDEE(draft);
  const target = calcTargetKcal(draft);
  const macros = calcTargetMacros(draft);
  const bmi = calcBMI(draft.currentWeight, draft.height);

  const set = (patch: Partial<typeof draft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
  };

  const handleSaveAll = () => {
    const next = {
      ...draft,
      useAllergies: showAllergies,
      allergies: showAllergies ? allergyText.split(",").map((s) => s.trim()).filter(Boolean) : [],
    };
    const goalChanged = next.goal !== profile.goal;
    updateProfile(next);
    if (goalChanged) {
      addGoalHistory({
        date: ymd(new Date()),
        goal: next.goal,
        kcalTarget: next.customTargets?.kcal ?? target,
        note: "Изменение цели",
      });
    }
    toast.success("Сохранено");
  };

  const handleExport = () => {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `цветочки-${ymd(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Данные выгружены");
  };

  const handleImport = () => {
    if (!importText.trim()) return toast.error("Вставьте JSON");
    if (importJson(importText)) {
      setImportOpen(false);
      setImportText("");
      toast.success("Данные загружены");
    } else {
      toast.error("Не удалось разобрать JSON");
    }
  };

  return (
    <div className="mx-auto flex max-w-screen-md flex-col gap-4 px-4 pb-4 pt-2">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Профиль</h1>
          <p className="text-sm text-muted-foreground">Личные данные и настройки</p>
        </div>
        <ThemeToggle />
      </header>

      {/* Личные данные */}
      <Card className="soft-card">
        <CardHeader className="space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="size-5 text-primary" /> Личные данные
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Имя (опц.)">
              <Input value={draft.name ?? ""} onChange={(e) => set({ name: e.target.value })} placeholder="Анна" className="rounded-xl" />
            </Field>
            <Field label="Дата старта">
              <Input type="date" value={draft.startDate} onChange={(e) => set({ startDate: e.target.value })} className="rounded-xl font-feature-num" />
            </Field>
            <Field label="Пол">
              <Select value={draft.sex} onValueChange={(v) => set({ sex: v as Sex })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">Женский</SelectItem>
                  <SelectItem value="male">Мужской</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Возраст">
              <Input type="number" value={draft.age} onChange={(e) => set({ age: +e.target.value })} className="rounded-xl font-feature-num" />
            </Field>
            <Field label="Рост, см">
              <Input type="number" value={draft.height} onChange={(e) => set({ height: +e.target.value })} className="rounded-xl font-feature-num" />
            </Field>
            <Field label="Текущий вес, кг (00.00)">
              <Input type="number" step="0.01" value={draft.currentWeight || ""} onChange={(e) => set({ currentWeight: parseFloat(e.target.value) || 0 })} className="rounded-xl font-feature-num tabular-nums" placeholder="0,00" />
            </Field>
            <Field label="Целевой вес, кг (00.00)">
              <Input type="number" step="0.01" value={draft.targetWeight || ""} onChange={(e) => set({ targetWeight: parseFloat(e.target.value) || 0 })} className="rounded-xl font-feature-num tabular-nums" placeholder="0,00" />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">
            Дата начала использования редактируема — можно указать, что считаешь калории давно,
            даже если приложение установлено вчера.
          </p>
        </CardContent>
      </Card>

      {/* Калькулятор норм */}
      <Card className="soft-card">
        <CardHeader className="space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="size-5 text-primary" /> Калькулятор норм
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3">
            <Field label="Активность">
              <Select value={draft.activity} onValueChange={(v) => set({ activity: v as ActivityLevel })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] leading-snug text-muted-foreground">
                {ACTIVITY_DESCRIPTIONS[draft.activity].description}
              </p>
            </Field>
            <Field label="Формула BMR">
              <Select value={draft.formula} onValueChange={(v) => set({ formula: v as BmrFormula })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mifflin">{FORMULA_DESCRIPTIONS.mifflin.title}</SelectItem>
                  <SelectItem value="harris">{FORMULA_DESCRIPTIONS.harris.title}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] leading-snug text-muted-foreground">
                {FORMULA_DESCRIPTIONS[draft.formula].description}
              </p>
            </Field>
          </div>
          <Field label="Цель">
            <Select value={draft.goal} onValueChange={(v) => set({ goal: v as Goal })}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GOAL_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <ResultBlock label="BMR" value={bmr} unit="ккал" />
            <ResultBlock label="TDEE" value={tdee} unit="ккал" />
            <ResultBlock label="Цель" value={target} unit="ккал" highlight />
          </div>

          {/* Ручная корректировка */}
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-3">
            <Label className="text-xs text-muted-foreground">
              Ручная корректировка КБЖУ (если диетолог дал другие цифры)
            </Label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              <Input
                type="number"
                placeholder="ккал"
                value={draft.customTargets?.kcal ?? ""}
                onChange={(e) => set({ customTargets: { ...(draft.customTargets ?? { kcal: 0, protein: 0, fat: 0, carbs: 0 }), kcal: +e.target.value } })}
                className="rounded-xl font-feature-num"
              />
              <Input
                type="number"
                placeholder="Б"
                value={draft.customTargets?.protein ?? ""}
                onChange={(e) => set({ customTargets: { ...(draft.customTargets ?? { kcal: 0, protein: 0, fat: 0, carbs: 0 }), protein: +e.target.value } })}
                className="rounded-xl font-feature-num"
              />
              <Input
                type="number"
                placeholder="Ж"
                value={draft.customTargets?.fat ?? ""}
                onChange={(e) => set({ customTargets: { ...(draft.customTargets ?? { kcal: 0, protein: 0, fat: 0, carbs: 0 }), fat: +e.target.value } })}
                className="rounded-xl font-feature-num"
              />
              <Input
                type="number"
                placeholder="У"
                value={draft.customTargets?.carbs ?? ""}
                onChange={(e) => set({ customTargets: { ...(draft.customTargets ?? { kcal: 0, protein: 0, fat: 0, carbs: 0 }), carbs: +e.target.value } })}
                className="rounded-xl font-feature-num"
              />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Если цифры заполнены — они становятся целью на Главном экране.
              Чтобы вернуться к авто-расчёту — очистите поле «ккал».
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/30 p-3 text-sm">
            <div className="text-xs text-muted-foreground">ИМТ: {bmi.value} · {bmi.label}</div>
            <div className="text-xs text-primary">
              {bmi.toIdealKg > 0
                ? `До идеального веса осталось ${bmi.toIdealKg} кг`
                : "Вы в пределах нормы"}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Текущие цели: {macros.kcal} ккал · Б {macros.protein} · Ж {macros.fat} · У {macros.carbs}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Аллергии */}
      <Card className="soft-card">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="size-5 text-primary" /> Аллергии и непереносимость
          </CardTitle>
          <Switch checked={showAllergies} onCheckedChange={setShowAllergies} />
        </CardHeader>
        <CardContent>
          {showAllergies ? (
            <Field label="Через запятую">
              <Input
                value={allergyText}
                onChange={(e) => setAllergyText(e.target.value)}
                placeholder="Лактоза, глютен, орехи"
                className="rounded-xl"
              />
            </Field>
          ) : (
            <p className="text-sm text-muted-foreground">
              Раздел можно скрыть полностью, если аллергий нет.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Уведомления */}
      <Card className="soft-card">
        <CardHeader className="space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="size-5 text-primary" /> Уведомления
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow
            label="Напоминания про воду"
            checked={draft.notifications.water}
            onChange={(v) => set({ notifications: { ...draft.notifications, water: v } })}
          />
          <ToggleRow
            label="Еженедельный отчёт"
            checked={draft.notifications.weeklyReport}
            onChange={(v) => set({ notifications: { ...draft.notifications, weeklyReport: v } })}
          />
          <ToggleRow
            label="Напоминания о приёмах пищи"
            checked={draft.notifications.meals}
            onChange={(v) => set({ notifications: { ...draft.notifications, meals: v } })}
          />
        </CardContent>
      </Card>

      {/* Тема */}
      <Card className="soft-card">
        <CardHeader className="space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="size-5 text-primary" /> Тема оформления
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={draft.theme} onValueChange={(v) => set({ theme: v as typeof draft.theme })}>
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Светлая</SelectItem>
              <SelectItem value="dark">Тёмная</SelectItem>
              <SelectItem value="system">Системная</SelectItem>
            </SelectContent>
          </Select>
          <p className="mt-2 text-xs text-muted-foreground">
            Кнопка переключателя темы находится вверху справа.
          </p>
        </CardContent>
      </Card>

      {/* Резервное копирование */}
      <Card className="soft-card">
        <CardHeader className="space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="size-5 text-primary" /> Резервное копирование
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="rounded-xl py-6 text-base" onClick={handleExport}>
              <Download className="size-5" /> Выгрузить в JSON
            </Button>
            <Button variant="outline" className="rounded-xl py-6 text-base" onClick={() => setImportOpen(true)}>
              <Upload className="size-5" /> Загрузить из JSON
            </Button>
          </div>
          <Button variant="ghost" className="rounded-xl text-destructive" onClick={() => setResetOpen(true)}>
            <Trash2 className="size-4" /> Сбросить все данные
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-2 pb-2">
        <Button variant="ghost" onClick={() => setDraft(profile)}>
          Отменить
        </Button>
        <Button onClick={handleSaveAll} className="rounded-xl">
          Сохранить
        </Button>
      </div>

      {resetOpen && (
        <Dialog open onOpenChange={(v) => !v && setResetOpen(false)}>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle>Сбросить все данные?</DialogTitle>
              <DialogDescription>
                Все записи дневника, веса, цикла и т. д. будут удалены.
                Справочник продуктов и рецепты вернутся к демо-набору.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setResetOpen(false)}>
                Отмена
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  resetAll();
                  setResetOpen(false);
                  toast.success("Данные сброшены");
                }}
              >
                <Trash2 className="size-4" /> Сбросить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {importOpen && (
        <Dialog open onOpenChange={(v) => !v && setImportOpen(false)}>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle>Загрузить из JSON</DialogTitle>
              <DialogDescription>
                Вставьте содержимое ранее выгруженного файла
              </DialogDescription>
            </DialogHeader>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="..."
              className="min-h-32 w-full rounded-xl border border-border bg-background p-2 text-xs font-mono"
            />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setImportOpen(false)}>Отмена</Button>
              <Button onClick={handleImport}>Загрузить</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function ResultBlock({ label, value, unit, highlight }: { label: string; value: number; unit: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${highlight ? "border-primary bg-primary/10" : "border-border/70 bg-muted/30"}`}>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="font-feature-num text-base font-bold tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground">{unit}</div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/30 p-3">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
      {label}
      {children}
    </label>
  );
}

void Ruler;
void Weight;
void Target;
void CalendarDays;
