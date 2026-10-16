"use client";

import * as React from "react";
import {
  ArrowLeft,
  Search,
  Plus,
  Trash2,
  Star,
  Save,
  Camera,
  Sparkles,
  X,
  ChevronRight,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "@/store/app-store";
import { calcPortionMacros, round1, ymd } from "@/lib/calc";
import { FoodItem, Recipe, RecipeIngredient } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Step = "info" | "ingredients" | "steps" | "review";

const STEP_META: { id: Step; label: string; hint: string }[] = [
  { id: "info", label: "Описание", hint: "Название и порции" },
  { id: "ingredients", label: "Ингредиенты", hint: "КБЖУ и продукты из списка" },
  { id: "steps", label: "Шаги", hint: "Как готовить" },
  { id: "review", label: "Итог", hint: "Проверка и сохранение" },
];

export function CreateRecipeScreen({ onClose }: { onClose: () => void }) {
  const foods = useAppStore((s) => s.foods);
  const addRecipe = useAppStore((s) => s.addRecipe);
  const addFood = useAppStore((s) => s.addFood);

  const [step, setStep] = React.useState<Step>("info");
  const [title, setTitle] = React.useState("");
  const [servings, setServings] = React.useState(1);
  const [portionWeight, setPortionWeight] = React.useState<number | undefined>(undefined);
  const [photoUrl, setPhotoUrl] = React.useState<string | undefined>(undefined);
  const [notes, setNotes] = React.useState("");
  const [ingredients, setIngredients] = React.useState<RecipeIngredient[]>([]);
  const [steps, setSteps] = React.useState<string[]>([""]);

  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [manualFoodOpen, setManualFoodOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  // ── подсчёт КБЖУ ──
  const totals = React.useMemo(
    () =>
      ingredients.reduce(
        (acc, i) => ({
          kcal: acc.kcal + i.kcal,
          protein: acc.protein + i.protein,
          fat: acc.fat + i.fat,
          carbs: acc.carbs + i.carbs,
        }),
        { kcal: 0, protein: 0, fat: 0, carbs: 0 }
      ),
    [ingredients]
  );

  const perPortion = React.useMemo(
    () => ({
      kcal: Math.round(totals.kcal / Math.max(1, servings)),
      protein: round1(totals.protein / Math.max(1, servings)),
      fat: round1(totals.fat / Math.max(1, servings)),
      carbs: round1(totals.carbs / Math.max(1, servings)),
    }),
    [totals, servings]
  );

  const totalWeight = ingredients.reduce((s, i) => s + i.amount, 0);
  const computedPortionWeight = portionWeight ?? Math.round(totalWeight / Math.max(1, servings));

  const stepIndex = STEP_META.findIndex((s) => s.id === step);

  const canNext = (() => {
    if (step === "info") return title.trim().length > 0 && servings > 0;
    if (step === "ingredients") return ingredients.length > 0;
    if (step === "steps") return steps.some((s) => s.trim());
    return true;
  })();

  const handleSave = () => {
    if (!title.trim()) {
      toast.error("Введите название");
      setStep("info");
      return;
    }
    if (ingredients.length === 0) {
      toast.error("Добавьте ингредиенты");
      setStep("ingredients");
      return;
    }
    const recipe: Omit<Recipe, "id" | "createdAt"> = {
      title: title.trim(),
      servingsCount: Math.max(1, servings),
      ingredients,
      steps: steps.filter((s) => s.trim()),
      portionWeight: computedPortionWeight,
      notes: notes.trim() || undefined,
      photoUrl,
      source: "manual",
      favorite: false,
    };
    addRecipe({ ...recipe, id: makeId(), createdAt: Date.now() } as Recipe);
    toast.success(`Рецепт «${recipe.title}» создан`);
    onClose();
  };

  return (
    <div className="mx-auto flex max-w-screen-md flex-col gap-4 px-4 pb-4 pt-2">
      {/* Шапка */}
      <header className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full">
          <ArrowLeft className="size-5" /> Назад
        </Button>
        <h1 className="text-xl font-extrabold tracking-tight">Создать рецепт</h1>
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
            const done = idx < stepIndex;
            const active = idx === stepIndex;
            return (
              <li key={s.id} className="flex flex-1 items-center">
                <button
                  onClick={() => setStep(s.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-2 py-1 text-xs transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : done
                        ? "text-primary"
                        : "text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "grid size-6 place-items-center rounded-full border text-[10px] font-bold",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : done
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground"
                    )}
                  >
                    {done ? <Check className="size-3.5" /> : idx + 1}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden">{s.label.slice(0, 4)}</span>
                </button>
                {idx < STEP_META.length - 1 && (
                  <ChevronRight className="mx-1 size-3 text-muted-foreground" />
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
            <CardTitle className="text-base">Описание рецепта</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-0">
            <Field label="Название рецепта *">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Овощная запеканка"
                className="rounded-xl"
                autoFocus
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Количество порций *">
                <Input
                  type="number"
                  min={1}
                  value={servings}
                  onChange={(e) => setServings(Math.max(1, +e.target.value))}
                  className="rounded-xl font-feature-num"
                />
              </Field>
              <Field label="Вес порции, г (опц.)">
                <Input
                  type="number"
                  value={portionWeight ?? ""}
                  onChange={(e) =>
                    setPortionWeight(e.target.value ? +e.target.value : undefined)
                  }
                  placeholder={`авто: ${computedPortionWeight}`}
                  className="rounded-xl font-feature-num"
                />
              </Field>
            </div>
            <Field label="Фото блюда (URL, опц.)">
              <div className="flex gap-2">
                <Input
                  value={photoUrl ?? ""}
                  onChange={(e) => setPhotoUrl(e.target.value || undefined)}
                  placeholder="https://..."
                  className="rounded-xl"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-xl shrink-0"
                  onClick={() => toast.info("Имитация съёмки. Введите URL или оставьте пустым.")}
                  title="Снять блюдо"
                >
                  <Camera className="size-4" />
                </Button>
              </div>
            </Field>
            <Field label="Заметки автора (опц.)">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Добавить больше чеснока, готовить 20 минут"
                className="min-h-16 rounded-2xl text-sm"
              />
            </Field>
          </CardContent>
        </Card>
      )}

      {/* === Шаг 2: Ингредиенты === */}
      {step === "ingredients" && (
        <div className="space-y-3">
          <Card className="soft-card p-3">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                className="rounded-full"
                onClick={() => setPickerOpen(true)}
              >
                <Plus className="size-4" /> Из списка продуктов
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={() => setManualFoodOpen(true)}
              >
                <Plus className="size-4" /> Свой продукт с КБЖУ
              </Button>
            </div>
          </Card>

          {ingredients.length === 0 ? (
            <Card className="soft-card p-5">
              <p className="text-center text-sm text-muted-foreground">
                Список ингредиентов пуст. Добавьте первый — из справочника или создайте свой.
              </p>
            </Card>
          ) : (
            <Card className="soft-card p-3">
              <CardHeader className="space-y-0 px-0 pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>Ингредиенты ({ingredients.length})</span>
                  <span className="text-xs text-muted-foreground">итого: {round1(totalWeight)} г</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="space-y-2">
                  {ingredients.map((ing, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-2 rounded-2xl border border-border/70 bg-muted/30 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{ing.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {ing.kcal} ккал · Б {ing.protein} · Ж {ing.fat} · У {ing.carbs}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={ing.amount}
                          onChange={(e) => {
                            const v = Math.max(0, +e.target.value);
                            const f = foods.find((x) => x.id === ing.foodId);
                            const m = f ? calcPortionMacros(f, v) : { kcal: 0, protein: 0, fat: 0, carbs: 0 };
                            setIngredients((arr) =>
                              arr.map((x, i) =>
                                i === idx ? { ...x, amount: v, ...m } : x
                              )
                            );
                          }}
                          className="h-9 w-20 rounded-lg font-feature-num text-sm"
                        />
                        <span className="text-xs text-muted-foreground">г</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full text-destructive"
                          onClick={() => setIngredients((arr) => arr.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Предпросмотр КБЖУ на порцию */}
          <Card className="soft-card p-3">
            <CardHeader className="space-y-0 px-0 pb-2">
              <CardTitle className="text-base">КБЖУ на 1 порцию</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-4 gap-2">
                <MacroBlock label="ккал" value={perPortion.kcal} />
                <MacroBlock label="Б, г" value={perPortion.protein} />
                <MacroBlock label="Ж, г" value={perPortion.fat} />
                <MacroBlock label="У, г" value={perPortion.carbs} />
              </div>
              <div className="mt-2 text-center text-xs text-muted-foreground">
                {computedPortionWeight} г в одной порции
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* === Шаг 3: Шаги === */}
      {step === "steps" && (
        <Card className="soft-card p-5">
          <CardHeader className="flex-row items-center justify-between space-y-0 px-0 pb-3">
            <CardTitle className="text-base">Шаги приготовления</CardTitle>
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => setSteps([...steps, ""])}>
              <Plus className="size-4" /> Шаг
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 p-0">
            {steps.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">
                Шаги необязательны, но помогут вам при готовке
              </p>
            )}
            <ol className="space-y-2">
              {steps.map((s, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {idx + 1}
                  </span>
                  <Textarea
                    value={s}
                    onChange={(e) => {
                      const next = [...steps];
                      next[idx] = e.target.value;
                      setSteps(next);
                    }}
                    placeholder={`Шаг ${idx + 1}: что делать`}
                    className="min-h-14 flex-1 rounded-2xl text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full text-destructive"
                    onClick={() => setSteps(steps.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* === Шаг 4: Проверка === */}
      {step === "review" && (
        <div className="space-y-3">
          <Card className="soft-card p-5">
            <CardHeader className="space-y-0 px-0 pb-3">
              <CardTitle className="text-base">Финальная проверка</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-0">
              <div>
                <div className="text-[11px] text-muted-foreground">Название</div>
                <div className="text-lg font-bold">{title || "—"}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Порций">
                  <Input value={servings} disabled className="rounded-xl font-feature-num" />
                </Field>
                <Field label="Вес порции, г">
                  <Input value={computedPortionWeight} disabled className="rounded-xl font-feature-num" />
                </Field>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <MacroBlock label="ккал" value={perPortion.kcal} />
                <MacroBlock label="Б, г" value={perPortion.protein} />
                <MacroBlock label="Ж, г" value={perPortion.fat} />
                <MacroBlock label="У, г" value={perPortion.carbs} />
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground">Ингредиенты</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {ingredients.map((ing, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">
                      {ing.name} · {ing.amount} г
                    </Badge>
                  ))}
                </div>
              </div>
              {steps.filter(Boolean).length > 0 && (
                <div>
                  <div className="text-[11px] text-muted-foreground">Шаги</div>
                  <ol className="mt-1 space-y-1 text-sm">
                    {steps.filter(Boolean).map((s, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                          {i + 1}
                        </span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {notes && (
                <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-3 text-sm italic text-muted-foreground">
                  «{notes}»
                </div>
              )}
            </CardContent>
          </Card>
          <Button className="rounded-2xl py-6 text-base" onClick={handleSave}>
            <Save className="size-5" /> Сохранить рецепт
          </Button>
        </div>
      )}

      {/* Нижние кнопки навигации по шагам */}
      <div className="flex items-center justify-between gap-2 pb-2">
        <Button
          variant="ghost"
          className="rounded-xl"
          disabled={stepIndex === 0}
          onClick={() => setStep(STEP_META[stepIndex - 1].id)}
        >
          <ArrowLeft className="size-4" /> Назад
        </Button>
        {step !== "review" ? (
          <Button
            className="rounded-xl"
            disabled={!canNext}
            onClick={() => setStep(STEP_META[stepIndex + 1].id)}
          >
            Далее <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button className="rounded-xl" onClick={handleSave}>
            <Save className="size-4" /> Сохранить
          </Button>
        )}
      </div>

      {/* === Пикер продукта из списка === */}
      {pickerOpen && (
        <ProductPicker
          foods={foods}
          search={search}
          onSearchChange={setSearch}
          onClose={() => setPickerOpen(false)}
          onPick={(f) => {
            const m = calcPortionMacros(f, f.defaultPortion ?? 100);
            setIngredients((arr) => [
              ...arr,
              {
                name: f.name,
                foodId: f.id,
                amount: f.defaultPortion ?? 100,
                kcal: m.kcal,
                protein: m.protein,
                fat: m.fat,
                carbs: m.carbs,
              },
            ]);
            toast.success(`Добавлено: ${f.name}`);
            setPickerOpen(false);
          }}
          onToggleFav={(id) => useAppStore.getState().toggleFavoriteFood(id)}
        />
      )}

      {/* === Создание своего продукта с КБЖУ === */}
      {manualFoodOpen && (
        <ManualFoodDialog
          onClose={() => setManualFoodOpen(false)}
          onSave={(name, kcal, p, f, c, portion) => {
            const newFood: FoodItem = {
              id: makeId(),
              name,
              kcal,
              protein: p,
              fat: f,
              carbs: c,
              defaultPortion: portion,
              source: "manual",
              category: "Свои продукты",
            };
            addFood(newFood);
            // сразу добавим в ингредиенты рецепта
            const m = calcPortionMacros(newFood, portion);
            setIngredients((arr) => [
              ...arr,
              {
                name,
                foodId: newFood.id,
                amount: portion,
                kcal: m.kcal,
                protein: m.protein,
                fat: m.fat,
                carbs: m.carbs,
              },
            ]);
            toast.success(`Создан продукт: ${name}`);
            setManualFoodOpen(false);
          }}
        />
      )}
    </div>
  );
}

// === Пикер продукта из списка ===
function ProductPicker({
  foods,
  search,
  onSearchChange,
  onClose,
  onPick,
  onToggleFav,
}: {
  foods: FoodItem[];
  search: string;
  onSearchChange: (v: string) => void;
  onClose: () => void;
  onPick: (f: FoodItem) => void;
  onToggleFav: (id: string) => void;
}) {
  const q = search.trim().toLowerCase();
  const filtered = q ? foods.filter((f) => f.name.toLowerCase().includes(q)) : foods;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-lg rounded-t-3xl bg-background p-4 shadow-2xl sm:rounded-3xl">
        <header className="flex items-center justify-between gap-2 pb-3">
          <h2 className="text-base font-bold">Выбрать продукт</h2>
          <Button variant="ghost" size="icon" className="rounded-full" onClick={onClose}>
            <X className="size-5" />
          </Button>
        </header>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Поиск продукта"
            className="rounded-xl pl-9"
            autoFocus
          />
        </div>
        <ScrollArea className="mt-3 h-72 rounded-2xl">
          <ul className="flex flex-col gap-1.5 pr-2">
            {filtered.length === 0 && (
              <li className="py-6 text-center text-sm text-muted-foreground">Ничего не найдено</li>
            )}
            {filtered.map((f) => (
              <li key={f.id} className="flex items-center gap-1.5">
                <button
                  onClick={() => onPick(f)}
                  className="flex flex-1 items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background p-3 text-left hover:bg-muted/60"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{f.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {f.kcal} ккал · Б {f.protein} · Ж {f.fat} · У {f.carbs}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {f.defaultPortion ?? 100} г
                  </Badge>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full shrink-0"
                  onClick={() => onToggleFav(f.id)}
                >
                  <Star className={cn("size-4", f.favorite && "fill-amber-400 text-amber-400")} />
                </Button>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </div>
    </div>
  );
}

// === Создание своего продукта с КБЖУ ===
function ManualFoodDialog({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (
    name: string,
    kcal: number,
    protein: number,
    fat: number,
    carbs: number,
    portion: number
  ) => void;
}) {
  const [name, setName] = React.useState("");
  const [kcal, setKcal] = React.useState<number>(0);
  const [protein, setProtein] = React.useState<number>(0);
  const [fat, setFat] = React.useState<number>(0);
  const [carbs, setCarbs] = React.useState<number>(0);
  const [portion, setPortion] = React.useState<number>(100);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-lg rounded-t-3xl bg-background p-4 shadow-2xl sm:rounded-3xl">
        <header className="flex items-center justify-between gap-2 pb-3">
          <h2 className="text-base font-bold">Новый продукт с КБЖУ</h2>
          <Button variant="ghost" size="icon" className="rounded-full" onClick={onClose}>
            <X className="size-5" />
          </Button>
        </header>
        <div className="space-y-3">
          <Field label="Название *">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Греческий йогурт"
              className="rounded-xl"
              autoFocus
            />
          </Field>
          <Label className="text-xs text-muted-foreground">
            КБЖУ указывается <b>на 100 г</b>
          </Label>
          <div className="grid grid-cols-4 gap-2">
            <Field label="ккал">
              <Input
                type="number"
                value={kcal}
                onChange={(e) => setKcal(+e.target.value)}
                className="rounded-xl font-feature-num"
              />
            </Field>
            <Field label="Б, г">
              <Input
                type="number"
                value={protein}
                onChange={(e) => setProtein(+e.target.value)}
                className="rounded-xl font-feature-num"
              />
            </Field>
            <Field label="Ж, г">
              <Input
                type="number"
                value={fat}
                onChange={(e) => setFat(+e.target.value)}
                className="rounded-xl font-feature-num"
              />
            </Field>
            <Field label="У, г">
              <Input
                type="number"
                value={carbs}
                onChange={(e) => setCarbs(+e.target.value)}
                className="rounded-xl font-feature-num"
              />
            </Field>
          </div>
          <Field label="Порция по умолчанию, г">
            <Input
              type="number"
              value={portion}
              onChange={(e) => setPortion(+e.target.value)}
              className="rounded-xl font-feature-num"
            />
          </Field>
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <Label className="flex items-center gap-1.5">
              <Sparkles className="size-4 text-primary" />
              Можно сфотографировать этикетку — ИИ заполнит КБЖУ автоматически
            </Label>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 rounded-xl"
              onClick={() => toast.info("Имитация съёмки. Введите значения вручную.")}
            >
              <Camera className="size-4" /> Снять этикетку
            </Button>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button
            onClick={() => {
              if (!name.trim()) {
                toast.error("Введите название");
                return;
              }
              onSave(name.trim(), kcal, protein, fat, carbs, portion);
            }}
          >
            Создать и добавить
          </Button>
        </div>
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

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

// заглушка, чтобы избежать неиспользуемого импорта
void ymd;
