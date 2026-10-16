"use client";

import * as React from "react";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Barcode,
  Camera,
  Sparkles,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { id, MICRO_NORMS, round1 } from "@/lib/calc";
import { FoodItem, Micronutrients } from "@/lib/types";
import { toast } from "sonner";

type Step = "info" | "macros" | "micro" | "notes" | "review";

const STEP_META: { id: Step; label: string; hint: string }[] = [
  { id: "info", label: "Описание", hint: "Название, производитель, штрихкод" },
  { id: "macros", label: "КБЖУ", hint: "Калории и БЖУ на 100 г" },
  { id: "micro", label: "Микро", hint: "Витамины и минералы" },
  { id: "notes", label: "Заметки", hint: "Комментарий" },
  { id: "review", label: "Итог", hint: "Проверка" },
];

export function AddFoodScreen({ onClose }: { onClose: () => void }) {
  const addFood = useAppStore((s) => s.addFood);

  const [step, setStep] = React.useState<Step>("info");
  const [name, setName] = React.useState("");
  const [brand, setBrand] = React.useState("");
  const [barcode, setBarcode] = React.useState("");
  const [focusBarcode, setFocusBarcode] = React.useState(false);
  const [portion, setPortion] = React.useState<number>(100);
  const [category, setCategory] = React.useState("Свои продукты");
  const [kcal, setKcal] = React.useState<number>(0);
  const [protein, setProtein] = React.useState<number>(0);
  const [fat, setFat] = React.useState<number>(0);
  const [carbs, setCarbs] = React.useState<number>(0);
  const [fiber, setFiber] = React.useState<number>(0);
  const [micro, setMicro] = React.useState<Partial<Micronutrients>>({});
  const [notes, setNotes] = React.useState("");

  const stepIdx = STEP_META.findIndex((s) => s.id === step);

  const canNext = (() => {
    if (step === "info") return name.trim().length > 0;
    if (step === "macros") return kcal > 0 || protein > 0 || fat > 0 || carbs > 0;
    return true;
  })();

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Введите название");
      setStep("info");
      return;
    }
    const newFood: FoodItem = {
      id: id(),
      name: name.trim(),
      kcal: round1(kcal),
      protein: round1(protein),
      fat: round1(fat),
      carbs: round1(carbs),
      fiber: fiber > 0 ? fiber : undefined,
      defaultPortion: portion,
      barcode: barcode || undefined,
      category,
      micro: Object.keys(micro).length > 0 ? micro : undefined,
      source: "manual",
    };
    addFood(newFood);
    toast.success(`Продукт «${newFood.name}» добавлен в базу`);
    onClose();
  };

  return (
    <div className="mx-auto flex max-w-screen-md flex-col gap-4 px-4 pb-4 pt-2">
      <header className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full">
          <ArrowLeft className="size-5" /> Назад
        </Button>
        <h1 className="text-xl font-extrabold tracking-tight">Свой продукт</h1>
        <Button
          size="sm"
          className="rounded-full"
          onClick={handleSave}
          disabled={step !== "review"}
        >
          <Save className="size-4" /> Сохранить
        </Button>
      </header>

      {/* Степпер */}
      <Card className="soft-card p-3">
        <ol className="flex items-center">
          {STEP_META.map((s, idx) => {
            const done = idx < stepIdx;
            const active = idx === stepIdx;
            return (
              <li key={s.id} className="flex flex-1 items-center">
                <button
                  onClick={() => setStep(s.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-2 py-1 text-xs transition-colors",
                    active ? "bg-primary/10 text-primary" : done ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "grid size-6 place-items-center rounded-full border text-[10px] font-bold",
                      active ? "border-primary bg-primary text-primary-foreground" : done ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground"
                    )}
                  >
                    {done ? <Check className="size-3.5" /> : idx + 1}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden">{s.label.slice(0, 4)}</span>
                </button>
                {idx < STEP_META.length - 1 && (
                  <span className="mx-1 text-xs text-muted-foreground">›</span>
                )}
              </li>
            );
          })}
        </ol>
      </Card>

      {/* === Шаг 1: Описание === */}
      {step === "info" && (
        <Card className="soft-card p-5">
          <CardHeader className="space-y-0 px-0 pb-3">
            <CardTitle className="text-base">Описание продукта</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-0">
            <Field label="Название продукта *">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Греческий йогурт"
                className="rounded-xl"
                autoFocus
              />
            </Field>
            <Field label="Производитель (опц.)">
              <Input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Ehrmann"
                className="rounded-xl"
              />
            </Field>
            <Field label="Штрихкод (опц.)">
              <div className="flex gap-2">
                <Input
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="4600000000000"
                  className="font-feature-num rounded-xl tabular-nums"
                  id="barcode-input"
                  ref={(el) => { if (el && focusBarcode) el.focus(); }}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-xl shrink-0"
                  onClick={() => {
                    setFocusBarcode(true);
                    setTimeout(() => setFocusBarcode(false), 100);
                    toast.info("Сканирование камерой требует ИИ-модуль. Сейчас можно ввести штрихкод вручную — поле готово к вводу.");
                  }}
                  title="Сканировать камерой"
                >
                  <Barcode className="size-4" />
                </Button>
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Категория">
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Молочное"
                  className="rounded-xl"
                />
              </Field>
              <Field label="Порция по умолчанию, г">
                <Input
                  type="number"
                  value={portion}
                  onChange={(e) => setPortion(+e.target.value || 100)}
                  className="font-feature-num rounded-xl tabular-nums"
                />
              </Field>
            </div>
          </CardContent>
        </Card>
      )}

      {/* === Шаг 2: КБЖУ === */}
      {step === "macros" && (
        <Card className="soft-card p-5">
          <CardHeader className="space-y-0 px-0 pb-3">
            <CardTitle className="text-base">КБЖУ на 100 г</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-0">
            <div className="grid grid-cols-4 gap-2">
              <Field label="ккал">
                <Input
                  type="number"
                  step="0.01"
                  value={kcal || ""}
                  onChange={(e) => setKcal(parseFloat(e.target.value) || 0)}
                  className="font-feature-num rounded-xl tabular-nums"
                  placeholder="0"
                  autoFocus
                />
              </Field>
              <Field label="Б, г">
                <Input
                  type="number"
                  step="0.01"
                  value={protein || ""}
                  onChange={(e) => setProtein(parseFloat(e.target.value) || 0)}
                  className="font-feature-num rounded-xl tabular-nums"
                  placeholder="0"
                />
              </Field>
              <Field label="Ж, г">
                <Input
                  type="number"
                  step="0.01"
                  value={fat || ""}
                  onChange={(e) => setFat(parseFloat(e.target.value) || 0)}
                  className="font-feature-num rounded-xl tabular-nums"
                  placeholder="0"
                />
              </Field>
              <Field label="У, г">
                <Input
                  type="number"
                  step="0.01"
                  value={carbs || ""}
                  onChange={(e) => setCarbs(parseFloat(e.target.value) || 0)}
                  className="font-feature-num rounded-xl tabular-nums"
                  placeholder="0"
                />
              </Field>
            </div>
            <Field label="Клетчатка, г (опц.)">
              <Input
                type="number"
                step="0.01"
                value={fiber || ""}
                onChange={(e) => setFiber(parseFloat(e.target.value) || 0)}
                className="font-feature-num rounded-xl tabular-nums"
                placeholder="0"
              />
            </Field>
            <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <Label className="flex items-center gap-1.5">
                <Camera className="size-4 text-primary" />
                Можно сфотографировать этикетку — ИИ распознает КБЖУ и микроэлементы автоматически
              </Label>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 rounded-xl"
                onClick={() => toast.info("Имитация съёмки. Введите значения вручную или это будет доступно после подключения ИИ.")}
              >
                <Sparkles className="size-4" /> Снять этикетку
              </Button>
            </div>
            {(kcal > 0 || protein > 0 || fat > 0 || carbs > 0) && (
              <div className="rounded-2xl border border-border/70 bg-muted/30 p-3 text-center text-sm">
                <div className="text-xs text-muted-foreground">На порцию {portion} г:</div>
                <div className="font-feature-num text-base font-bold tabular-nums">
                  {Math.round(kcal * portion / 100)} ккал · Б {round1(protein * portion / 100)} · Ж {round1(fat * portion / 100)} · У {round1(carbs * portion / 100)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* === Шаг 3: Микроэлементы === */}
      {step === "micro" && (
        <Card className="soft-card p-5">
          <CardHeader className="space-y-0 px-0 pb-3">
            <CardTitle className="text-base">Микроэлементы (опц.)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-0">
            <p className="text-sm text-muted-foreground">
              Укажи значения с этикетки (на 100 г). Если не знаешь — пропусти.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(Object.keys(MICRO_NORMS) as (keyof Micronutrients)[]).map((k) => {
                const meta = MICRO_NORMS[k];
                const v = micro[k] as number | undefined;
                return (
                  <Field key={k} label={`${meta.name}, ${meta.unit}`}>
                    <Input
                      type="number"
                      step="0.01"
                      value={v ?? ""}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setMicro((m) => {
                          const next = { ...m };
                          if (!isNaN(val) && val > 0) {
                            next[k] = val;
                          } else {
                            delete next[k];
                          }
                          return next;
                        });
                      }}
                      className="font-feature-num rounded-xl text-sm tabular-nums"
                      placeholder="0"
                    />
                  </Field>
                );
              })}
            </div>
            {Object.keys(micro).length > 0 && (
              <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-3 text-xs">
                <b>Выбрано:</b> {Object.keys(micro).length} микроэлементов.
                Они будут учитываться в дневной сводке.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* === Шаг 4: Заметки === */}
      {step === "notes" && (
        <Card className="soft-card p-5">
          <CardHeader className="space-y-0 px-0 pb-3">
            <CardTitle className="text-base">Заметки (опц.)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-0">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Заметки"
              className="min-h-24 rounded-2xl text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Например: «нужно взвешивать в сухом виде», «вкус кисловатый», «не нравится с молоком».
            </p>
          </CardContent>
        </Card>
      )}

      {/* === Шаг 5: Проверка === */}
      {step === "review" && (
        <Card className="soft-card p-5">
          <CardHeader className="space-y-0 px-0 pb-3">
            <CardTitle className="text-base">Финальная проверка</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-0">
            <div>
              <div className="text-[11px] text-muted-foreground">Название</div>
              <div className="text-lg font-bold">{name || "—"}</div>
              {brand && (
                <div className="text-xs text-muted-foreground">{brand}</div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Категория">
                <Input value={category} disabled className="rounded-xl" />
              </Field>
              <Field label="Порция, г">
                <Input value={portion} disabled className="font-feature-num rounded-xl tabular-nums" />
              </Field>
            </div>
            {barcode && (
              <div>
                <div className="text-[11px] text-muted-foreground">Штрихкод</div>
                <div className="font-feature-num text-sm tabular-nums">{barcode}</div>
              </div>
            )}
            <div className="grid grid-cols-4 gap-2">
              <MacroBlock label="ккал" value={kcal} />
              <MacroBlock label="Б, г" value={protein} />
              <MacroBlock label="Ж, г" value={fat} />
              <MacroBlock label="У, г" value={carbs} />
            </div>
            {fiber > 0 && (
              <div className="text-center text-xs text-muted-foreground">
                Клетчатка: <b className="text-foreground">{fiber} г</b>
              </div>
            )}
            {Object.keys(micro).length > 0 && (
              <div>
                <div className="text-[11px] text-muted-foreground">Микроэлементы</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {Object.entries(micro).map(([k, v]) => (
                    <Badge key={k} variant="secondary" className="text-[10px]">
                      {MICRO_NORMS[k as keyof Micronutrients].name}: {round1(v as number)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {notes && (
              <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-3 text-sm italic text-muted-foreground">
                «{notes}»
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Нижние кнопки */}
      <div className="flex items-center justify-between gap-2 pb-2">
        <Button
          variant="ghost"
          className="rounded-xl"
          disabled={stepIdx === 0}
          onClick={() => setStep(STEP_META[stepIdx - 1].id)}
        >
          <ArrowLeft className="size-4" /> Назад
        </Button>
        {step !== "review" ? (
          <Button
            className="rounded-xl"
            disabled={!canNext}
            onClick={() => setStep(STEP_META[stepIdx + 1].id)}
          >
            Далее ›
          </Button>
        ) : (
          <Button className="rounded-xl" onClick={handleSave}>
            <Save className="size-4" /> Сохранить
          </Button>
        )}
      </div>
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

function MacroBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/30 p-2 text-center">
      <div className="font-feature-num text-base font-bold tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

void X;
void Trash2;
void Plus;
