"use client";

import * as React from "react";
import {
  Plus,
  Mic,
  Repeat2,
  Trash2,
  StickyNote,
  Pencil,
  Droplets,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  useAppStore,
} from "@/store/app-store";
import { AddFoodDialog, mealLabel, mealEmoji } from "@/components/shared/add-food-dialog";
import { ProgressRing, MiniBar } from "@/components/shared/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { parseFood } from "@/lib/ai-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { calcTargetKcal, calcTargetMacros, formatHeaderDate, id, MICRO_NORMS, round1, sumMicro, ymd } from "@/lib/calc";
import { DiaryEntry, MealType, Micronutrients } from "@/lib/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export function HomeScreen({
  onNavigateCreate,
  onNavigateAddFood,
}: {
  onNavigateCreate: () => void;
  onNavigateAddFood: () => void;
}) {
  const profile = useAppStore((s) => s.profile);
  const today = ymd(new Date());
  // отдельные селекторы возвращают примитивы/массивы напрямую из стейта
  const diary = useAppStore((s) => s.diary);
  const pills = useAppStore((s) => s.pills);
  const waterGlasses = useAppStore((s) => s.water.find((w) => w.date === today)?.glasses ?? 0);
  const addDiaryEntry = useAppStore((s) => s.addDiaryEntry);
  const updateDiaryEntry = useAppStore((s) => s.updateDiaryEntry);
  const deleteDiaryEntry = useAppStore((s) => s.deleteDiaryEntry);
  const repeatYesterdayMeal = useAppStore((s) => s.repeatYesterdayMeal);
  const addWater = useAppStore((s) => s.addWater);

  const entries = React.useMemo(
    () => diary.filter((d) => d.date === today),
    [diary, today]
  );
  const todayPills = React.useMemo(
    () => pills.filter((p) => p.date === today && p.taken),
    [pills, today]
  );
  const totals = React.useMemo(
    () =>
      entries.reduce(
        (acc, d) => ({
          kcal: acc.kcal + d.kcal,
          protein: acc.protein + d.protein,
          fat: acc.fat + d.fat,
          carbs: acc.carbs + d.carbs,
        }),
        { kcal: 0, protein: 0, fat: 0, carbs: 0 }
      ),
    [entries]
  );

  const [addMeal, setAddMeal] = React.useState<MealType | null>(null);
  const [voiceInput, setVoiceInput] = React.useState("");
  const [voiceOpen, setVoiceOpen] = React.useState(false);
  const [showAllMicro, setShowAllMicro] = React.useState(false);
  const [editEntry, setEditEntry] = React.useState<DiaryEntry | null>(null);
  const [noteEntry, setNoteEntry] = React.useState<DiaryEntry | null>(null);
  const [manualOpen, setManualOpen] = React.useState(false);
  void manualOpen; void setManualOpen;

  const targets = calcTargetMacros(profile);
  const targetKcal = calcTargetKcal(profile);
  const remaining = Math.max(0, targetKcal - totals.kcal);
  const overKcal = totals.kcal > targetKcal;

  const headerDate = formatHeaderDate();

  // микро-элементы: из записей + таблетки
  const micros = React.useMemo(() => {
    const foods = useAppStore.getState().foods;
    const recipes = useAppStore.getState().recipes;
    const microsList: Partial<Micronutrients>[] = [];

    for (const e of entries) {
      const factor = e.amount / 100;
      if (e.foodId) {
        const f = foods.find((x) => x.id === e.foodId);
        if (f?.micro) {
          const scaled: Partial<Micronutrients> = {};
          for (const k in f.micro) {
            const v = (f.micro as any)[k];
            if (typeof v === "number") (scaled as any)[k] = v * factor;
          }
          microsList.push(scaled);
        }
        // если запись из рецепта
        if (e.fromRecipeId) {
          const r = recipes.find((x) => x.id === e.fromRecipeId);
          if (r) {
            for (const ing of r.ingredients) {
              const ingFood = foods.find((x) => x.id === ing.foodId);
              if (ingFood?.micro) {
                const scaled: Partial<Micronutrients> = {};
                for (const k in ingFood.micro) {
                  const v = (ingFood.micro as any)[k];
                  if (typeof v === "number")
                    (scaled as any)[k] =
                      (v * ing.amount) / 100 / r.servingsCount;
                }
                microsList.push(scaled);
              }
            }
          }
        }
      }
    }
    for (const p of todayPills) {
      if (p.micro) microsList.push(p.micro);
    }
    return sumMicro(microsList);
  }, [entries, todayPills]);

  const microKeys = Object.keys(MICRO_NORMS) as (keyof Micronutrients)[];
  const topMicros = microKeys.filter((k) => (micros[k] ?? 0) > 0).slice(0, 6);

  const [aiBusy, setAiBusy] = React.useState(false);

  const handleVoiceAdd = async () => {
    const text = voiceInput.trim();
    if (!text) return;
    setAiBusy(true);
    try {
      const items = await parseFood(text);
      if (items.length === 0) {
        toast.error("Не удалось разобрать фразу. Попробуйте уточнить, например «Съела яблоко 150 г»");
        return;
      }
      const foods = useAppStore.getState().foods;
      let added = 0;
      for (const item of items) {
        // ищем продукт в базе; если нет — создаём временный
        let food = foods.find((f) => f.name.toLowerCase() === item.name.toLowerCase());
        if (!food) {
          food = {
            id: id(),
            name: item.name,
            kcal: item.kcal,
            protein: item.protein,
            fat: item.fat,
            carbs: item.carbs,
            defaultPortion: item.grams,
            source: "ai",
            category: "ИИ-распознанное",
          };
          useAppStore.getState().addFood(food);
        }
        addDiaryEntry({
          date: today,
          meal: "snack",
          food,
          grams: item.grams,
          note: item.note,
          source: "ai",
        });
        added++;
      }
      toast.success(`ИИ добавил ${added} ${declOfNum(added, ["блюдо", "блюда", "блюд"])}`);
      setVoiceInput("");
      setVoiceOpen(false);
    } catch (e: any) {
      toast.error("Ошибка ИИ: " + (e?.message ?? "попробуйте позже"));
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-screen-md flex-col gap-4 px-4 pb-4">
      {/* Шапка с датой */}
      <header className="flex items-start justify-between gap-3 pt-2">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {headerDate.weekday}
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {headerDate.dayMonth}
          </h1>
          <div className="text-xs text-muted-foreground">{headerDate.year} · Цветочки</div>
        </div>
      </header>

      {/* Краткий итог сверху — кольцо калорий + мини-БЖУ */}
      <Card className="soft-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="flex items-center justify-center">
          <ProgressRing
            value={totals.kcal}
            max={targetKcal}
            size={148}
            stroke={14}
          >
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "font-feature-num text-2xl font-extrabold tabular-nums",
                  overKcal ? "text-destructive" : "text-foreground"
                )}
              >
                {totals.kcal}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                из {targetKcal} ккал
              </div>
              <div
                className={cn(
                  "mt-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  overKcal
                    ? "bg-destructive/10 text-destructive"
                    : "bg-primary/10 text-primary"
                )}
              >
                {overKcal
                  ? `+${totals.kcal - targetKcal} ккал`
                  : `Осталось: ${remaining} ккал`}
              </div>
            </div>
          </ProgressRing>
        </div>

        <div className="flex-1 space-y-3">
          <MiniBar
            value={totals.protein}
            max={targets.protein}
            label="Белки"
            unit=" г"
            color="#7d9b6c"
          />
          <MiniBar
            value={totals.fat}
            max={targets.fat}
            label="Жиры"
            unit=" г"
            color="#c79a5e"
          />
          <MiniBar
            value={totals.carbs}
            max={targets.carbs}
            label="Углеводы"
            unit=" г"
            color="#a76f8b"
          />
        </div>
      </Card>

      {/* Поле ввода еды: текст + голос */}
      <div className="flex gap-2">
        <Input
          value={voiceInput}
          onChange={(e) => setVoiceInput(e.target.value)}
          placeholder="«Съела яблоко 150» — ИИ распознает"
          className="rounded-2xl"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleVoiceAdd();
          }}
        />
        <Button
          variant="outline"
          size="icon"
          className="rounded-2xl shrink-0"
          onClick={() => setVoiceOpen((v) => !v)}
          title="Продиктовать голосом"
        >
          <Mic className="size-4" />
        </Button>
        <Button
          onClick={handleVoiceAdd}
          className="rounded-2xl shrink-0"
          disabled={!voiceInput.trim() || aiBusy}
        >
          <Sparkles className={cn("size-4", aiBusy && "animate-pulse")} />
          {aiBusy ? "Думаю..." : "Разобрать"}
        </Button>
      </div>

      {voiceOpen && (
        <Card className="soft-card flex items-center gap-3 p-3 text-sm text-muted-foreground">
          <Mic className="size-4 text-primary" />
          Диктовка голосом доступна через браузерное распознавание речи. ИИ-парсер
          попытается извлечь название и граммовку из текста выше.
        </Card>
      )}

      {/* Приёмы пищи */}
      {MEAL_ORDER.map((meal) => {
        const list = entries.filter((e) => e.meal === meal);
        const kcalMeal = list.reduce((s, e) => s + e.kcal, 0);
        return (
          <section key={meal} className="rounded-3xl border border-border/70 bg-card p-3">
            <header className="flex items-center justify-between gap-2 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{mealEmoji(meal)}</span>
                <div>
                  <div className="font-bold leading-tight">{mealLabel(meal)}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {list.length === 0
                      ? "пусто"
                      : `${list.length} · ${kcalMeal} ккал`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {list.length === 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full text-xs"
                    onClick={() => repeatYesterdayMeal(today, meal)}
                    title="Повторить вчерашний приём пищи"
                  >
                    <Repeat2 className="size-4" /> вчера
                  </Button>
                )}
                <Button
                  size="sm"
                  className="rounded-full"
                  onClick={() => setAddMeal(meal)}
                >
                  <Plus className="size-4" /> Добавить
                </Button>
              </div>
            </header>

            {list.length > 0 && (
              <ul className="flex flex-col gap-2">
                {list.map((e) => (
                  <DiaryItem
                    key={e.id}
                    entry={e}
                    onEdit={() => setEditEntry(e)}
                    onDelete={() => {
                      deleteDiaryEntry(e.id);
                      toast.success(`Удалено: ${e.name}`);
                    }}
                    onNote={() => setNoteEntry(e)}
                  />
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {/* Развернутый итог внизу */}
      <Card className="soft-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Итог за день</h2>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-xs"
            onClick={() => setShowAllMicro((v) => !v)}
          >
            {showAllMicro ? (
              <>
                <ChevronUp className="size-4" /> Свернуть
              </>
            ) : (
              <>
                <ChevronDown className="size-4" /> Микроэлементы
              </>
            )}
          </Button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MacroBlock label="Калории" value={totals.kcal} target={targetKcal} unit="ккал" />
          <MacroBlock label="Белки" value={totals.protein} target={targets.protein} unit="г" />
          <MacroBlock label="Жиры" value={totals.fat} target={targets.fat} unit="г" />
          <MacroBlock label="Углеводы" value={totals.carbs} target={targets.carbs} unit="г" />
        </div>

        {/* Микроэлементы: еда + таблетки */}
        {showAllMicro && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {topMicros.length === 0 ? (
              <p className="col-span-full text-sm text-muted-foreground">
                Добавьте продукты или витамины — здесь появятся микроэлементы за день.
              </p>
            ) : (
              microKeys
                .filter((k) => (micros[k] ?? 0) > 0)
                .map((k) => {
                  const norm = MICRO_NORMS[k];
                  const v = micros[k] ?? 0;
                  const ratio = Math.min(1, v / norm.daily);
                  return (
                    <div
                      key={k}
                      className="rounded-2xl border border-border/70 p-3"
                    >
                      <div className="text-xs font-semibold">{norm.name}</div>
                      <div className="font-feature-num text-sm text-muted-foreground tabular-nums">
                        {round1(v)} {norm.unit} / {norm.daily} {norm.unit}
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${ratio * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })
            )}
            {todayPills.length > 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-border bg-primary/5 p-3 text-xs text-muted-foreground">
                Учтены таблетки и витамины за сегодня: {todayPills.map((p) => p.name).join(", ")}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Кнопки внизу экрана */}
      <div className="grid grid-cols-2 gap-2 pb-2">
        <Button
          variant="outline"
          className="rounded-2xl py-6 text-base"
          onClick={onNavigateCreate}
        >
          <Plus className="size-5" /> Создать рецепт
        </Button>
        <Button
          variant="outline"
          className="rounded-2xl py-6 text-base"
          onClick={onNavigateAddFood}
        >
          <Plus className="size-5" /> Добавить продукт вручную
        </Button>
      </div>

      {/* Вода — в самом конце дневника, под всем рационом */}
      <Card className="soft-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Droplets className="size-6 text-primary" />
            <div>
              <div className="text-base font-bold">Вода за день</div>
              <div className="text-xs text-muted-foreground">
                {waterGlasses * 250} / {profile.waterGoal} мл · сброс в 00:00
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => addWater(today, -1)}
              disabled={waterGlasses === 0}
            >
              −
            </Button>
            <span className="font-feature-num w-12 text-center font-bold tabular-nums">
              {waterGlasses}
            </span>
            <Button
              size="sm"
              className="rounded-full"
              onClick={() => addWater(today, 1)}
            >
              +250 мл
            </Button>
          </div>
        </div>
        {waterGlasses > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {Array.from({ length: waterGlasses }).map((_, i) => (
              <Droplets key={i} className="size-5 text-primary" fill="currentColor" />
            ))}
          </div>
        )}
      </Card>

      {addMeal && (
        <AddFoodDialog
          open
          onOpenChange={(v) => !v && setAddMeal(null)}
          meal={addMeal}
          date={today}
        />
      )}

      {editEntry && (
        <EditEntryDialog
          entry={editEntry}
          onClose={() => setEditEntry(null)}
          onSave={(patch) => {
            updateDiaryEntry(editEntry.id, patch);
            setEditEntry(null);
            toast.success("Сохранено");
          }}
        />
      )}

      {noteEntry && (
        <NoteDialog
          entry={noteEntry}
          onClose={() => setNoteEntry(null)}
          onSave={(note) => {
            updateDiaryEntry(noteEntry.id, { note });
            setNoteEntry(null);
            toast.success("Заметка сохранена");
          }}
        />
      )}

    </div>
  );
}

function MacroBlock({
  label,
  value,
  target,
  unit,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
}) {
  const ratio = target > 0 ? Math.min(1, value / target) : 0;
  const over = value > target;
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/30 p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="font-feature-num text-base font-bold tabular-nums">
        {round1(value)}
        <span className="text-xs text-muted-foreground"> / {target} {unit}</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", over ? "bg-destructive" : "bg-primary")}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}

function DiaryItem({
  entry,
  onEdit,
  onDelete,
  onNote,
}: {
  entry: DiaryEntry;
  onEdit: () => void;
  onDelete: () => void;
  onNote: () => void;
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  return (
    <li className="flex items-start gap-2 rounded-2xl border border-border/70 bg-background/60 p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold">{entry.name}</span>
          {entry.fromRecipeId && (
            <Badge variant="secondary" className="rounded-full text-[10px]">
              рецепт
            </Badge>
          )}
          {entry.note && (
            <Badge variant="outline" className="rounded-full text-[10px] text-muted-foreground">
              <StickyNote className="mr-1 size-3" />
              заметка
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {entry.amount} г · {entry.kcal} ккал · Б {entry.protein} · Ж {entry.fat} · У {entry.carbs}
        </div>
        {entry.note && (
          <div className="mt-1 rounded-xl bg-muted/60 px-2 py-1 text-xs italic text-muted-foreground">
            «{entry.note}»
          </div>
        )}
      </div>
      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={onNote} title="Заметка">
          <StickyNote className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" className="rounded-full" onClick={onEdit} title="Изменить">
          <Pencil className="size-4" />
        </Button>
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full" title="Ещё">
              <span className="grid place-items-center text-lg leading-none">
                ⋯
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-44 rounded-2xl p-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start rounded-xl text-destructive"
              onClick={() => {
                setMenuOpen(false);
                onDelete();
              }}
            >
              <Trash2 className="mr-2 size-4" /> Удалить
            </Button>
          </PopoverContent>
        </Popover>
      </div>
    </li>
  );
}

function EditEntryDialog({
  entry,
  onClose,
  onSave,
}: {
  entry: DiaryEntry;
  onClose: () => void;
  onSave: (patch: Partial<DiaryEntry>) => void;
}) {
  const [amount, setAmount] = React.useState(entry.amount);
  const [kcal, setKcal] = React.useState(entry.kcal);
  const [protein, setProtein] = React.useState(entry.protein);
  const [fat, setFat] = React.useState(entry.fat);
  const [carbs, setCarbs] = React.useState(entry.carbs);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle>Изменить запись</DialogTitle>
          <DialogDescription>{entry.name}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label="Граммовка">
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(+e.target.value)}
              className="rounded-xl"
            />
          </Field>
          <div className="grid grid-cols-4 gap-2">
            <Field label="ккал">
              <Input type="number" value={kcal} onChange={(e) => setKcal(+e.target.value)} className="rounded-xl font-feature-num" />
            </Field>
            <Field label="Б">
              <Input type="number" value={protein} onChange={(e) => setProtein(+e.target.value)} className="rounded-xl font-feature-num" />
            </Field>
            <Field label="Ж">
              <Input type="number" value={fat} onChange={(e) => setFat(+e.target.value)} className="rounded-xl font-feature-num" />
            </Field>
            <Field label="У">
              <Input type="number" value={carbs} onChange={(e) => setCarbs(+e.target.value)} className="rounded-xl font-feature-num" />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button
            onClick={() =>
              onSave({
                amount,
                kcal,
                protein,
                fat,
                carbs,
              })
            }
          >
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NoteDialog({
  entry,
  onClose,
  onSave,
}: {
  entry: DiaryEntry;
  onClose: () => void;
  onSave: (note: string) => void;
}) {
  const [note, setNote] = React.useState(entry.note ?? "");
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle>Заметка к блюду</DialogTitle>
          <DialogDescription>{entry.name}</DialogDescription>
        </DialogHeader>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Заметки"
          className="min-h-24 rounded-2xl"
        />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={() => onSave(note)}>Сохранить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

function declOfNum(n: number, forms: [string, string, string]): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}

void id;
