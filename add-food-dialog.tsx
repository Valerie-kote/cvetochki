"use client";

import * as React from "react";
import {
  Search,
  Star,
  Clock,
  BookOpen,
  Plus,
  Barcode,
  Camera,
  Sparkles,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/store/app-store";
import { FoodItem, MealType, Recipe } from "@/lib/types";
import { calcPortionMacros, id } from "@/lib/calc";
import { makeRecipeTotals } from "@/lib/sample-data";
import { toast } from "sonner";

type Tab = "search" | "favorite" | "frequent" | "recipes";

interface AddFoodDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  meal: MealType;
  date: string;
}

const TAB_META: { id: Tab; label: string; Icon: typeof Star }[] = [
  { id: "search", label: "Поиск", Icon: Search },
  { id: "favorite", label: "Избранное", Icon: Star },
  { id: "frequent", label: "Часто", Icon: Clock },
  { id: "recipes", label: "Мои рецепты", Icon: BookOpen },
];

export function AddFoodDialog({
  open,
  onOpenChange,
  meal,
  date,
}: AddFoodDialogProps) {
  const foods = useAppStore((s) => s.foods);
  const recipes = useAppStore((s) => s.recipes);
  const lastUsedFoods = useAppStore((s) => s.lastUsedFoods);
  const toggleFavoriteFood = useAppStore((s) => s.toggleFavoriteFood);
  const addDiaryEntry = useAppStore((s) => s.addDiaryEntry);
  const addFood = useAppStore((s) => s.addFood);

  const [tab, setTab] = React.useState<Tab>("search");
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<FoodItem | Recipe | null>(null);
  const [grams, setGrams] = React.useState<number>(100);
  const [note, setNote] = React.useState("");
  const [barcodeInput, setBarcodeInput] = React.useState("");
  const [showBarcode, setShowBarcode] = React.useState(false);

  // manual create
  const [showManual, setShowManual] = React.useState(false);
  const [manualName, setManualName] = React.useState("");
  const [manualKcal, setManualKcal] = React.useState<number>(0);
  const [manualP, setManualP] = React.useState<number>(0);
  const [manualF, setManualF] = React.useState<number>(0);
  const [manualC, setManualC] = React.useState<number>(0);

  // recipe overrides
  const [removed, setRemoved] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelected(null);
    setGrams(100);
    setNote("");
    setRemoved([]);
    setShowBarcode(false);
    setShowManual(false);
  }, [open, meal, date]);

  const q = query.trim().toLowerCase();
  const searched = q
    ? foods.filter((f) => f.name.toLowerCase().includes(q))
    : foods;

  const favorite = foods.filter((f) => f.favorite);
  const frequent = Object.entries(lastUsedFoods)
    .sort((a, b) => b[1] - a[1])
    .map(([fid, _count]) => foods.find((f) => f.id === fid))
    .filter(Boolean) as FoodItem[];

  const handleSelectFood = (f: FoodItem) => {
    setSelected(f);
    setGrams(f.defaultPortion ?? 100);
  };

  const handleSelectRecipe = (r: Recipe) => {
    setSelected(r);
    setRemoved([]);
  };

  const handleConfirm = () => {
    if (!selected) return;
    if (isFood(selected)) {
      addDiaryEntry({
        date,
        meal,
        food: selected,
        grams,
        note: note || undefined,
        source: tab === "favorite" ? "favorite" : tab === "frequent" ? "frequent" : "search",
      });
      toast.success(`Добавлено: ${selected.name} (${grams} г)`);
    } else {
      addDiaryEntry({
        date,
        meal,
        recipe: selected,
        note: note || undefined,
        overrides: removed.length
          ? { removedIngredients: removed }
          : undefined,
        source: "recipe",
      });
      const tail =
        removed.length > 0
          ? `, без: ${removed.join(", ")}`
          : "";
      toast.success(`Добавлено: ${selected.title}${tail}`);
    }
    onOpenChange(false);
  };

  const isFood = (x: FoodItem | Recipe): x is FoodItem => "kcal" in x && !("ingredients" in x);

  const macros = React.useMemo(() => {
    if (!selected) return null;
    if (isFood(selected)) {
      return calcPortionMacros(selected, grams);
    }
    return makeRecipeTotals(selected);
  }, [selected, grams]);

  // AI-имитация распознавания
  const simulateBarcode = () => {
    const code = barcodeInput.trim();
    if (!code) {
      toast.error("Введите штрихкод");
      return;
    }
    // Имитация базы: чётная длина > 8 — найден
    if (code.length >= 8 && /^\d+$/.test(code)) {
      const found: FoodItem = {
        id: id(),
        name: `Продукт ${code.slice(-4)}`,
        kcal: 80 + (parseInt(code.slice(-3), 10) % 200),
        protein: 2 + (parseInt(code.slice(-2), 10) % 10),
        fat: 1 + (parseInt(code.slice(-1), 10) % 8),
        carbs: 5 + (parseInt(code.slice(-3), 10) % 30),
        defaultPortion: 100,
        barcode: code,
        source: "barcode",
        category: "Сканирование",
      };
      addFood(found);
      handleSelectFood(found);
      setTab("search");
      setQuery("");
      toast.success("Продукт найден в базе");
    } else {
      toast.error("Штрихкод не найден. Добавьте вручную.");
      setShowManual(true);
    }
  };

  const handleManualCreate = () => {
    if (!manualName.trim()) {
      toast.error("Введите название");
      return;
    }
    const newFood: FoodItem = {
      id: id(),
      name: manualName.trim(),
      kcal: manualKcal,
      protein: manualP,
      fat: manualF,
      carbs: manualC,
      defaultPortion: 100,
      source: "manual",
      category: "Свои продукты",
    };
    addFood(newFood);
    toast.success(`Продукт «${newFood.name}» добавлен в базу`);
    handleSelectFood(newFood);
    setGrams(100);
    setTab("search");
    setShowManual(false);
    setManualName("");
    setManualKcal(0);
    setManualP(0);
    setManualF(0);
    setManualC(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden rounded-3xl p-0 sm:max-w-lg">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle className="flex items-center gap-2">
            <Plus className="size-5 text-primary" />
            Добавить в приём пищи
          </DialogTitle>
          <DialogDescription>
            {mealLabel(meal)} · {date}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="px-5">
          <TabsList className="grid w-full grid-cols-4 rounded-2xl">
            {TAB_META.map(({ id, label, Icon }) => (
              <TabsTrigger key={id} value={id} className="rounded-2xl">
                <Icon className="size-4" />
                <span className="ml-1 hidden sm:inline">{label}</span>
                <span className="ml-1 sm:hidden">{label.slice(0, 3)}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-3 flex items-center gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                tab === "recipes"
                  ? "Поиск рецепта"
                  : "Поиск продукта или текст: «Съела яблоко»"
              }
              className="rounded-xl"
            />
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl"
              onClick={() => setShowBarcode((v) => !v)}
              title="Сканировать штрихкод"
            >
              <Barcode className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl"
              onClick={() => setShowManual((v) => !v)}
              title="Ввести вручную"
            >
              <Plus className="size-4" />
            </Button>
          </div>

          {showBarcode && (
            <div className="mt-3 grid gap-2 rounded-2xl border border-border/70 bg-muted/40 p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Camera className="size-4" />
                Введите штрихкод или наведите камеру на упаковку
              </div>
              <div className="flex gap-2">
                <Input
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="0000000000000"
                  className="rounded-xl font-feature-num"
                />
                <Button
                  size="sm"
                  className="rounded-xl"
                  onClick={simulateBarcode}
                >
                  <Sparkles className="size-4" /> ИИ
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Если штрихкод не найден — продукт можно добавить вручную.
              </p>
            </div>
          )}

          {showManual && (
            <div className="mt-3 grid gap-2 rounded-2xl border border-border/70 bg-muted/40 p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Plus className="size-4" /> Свой продукт (КБЖУ на 100 г)
              </div>
              <Input
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="Название продукта"
                className="rounded-xl"
              />
              <div className="grid grid-cols-4 gap-2">
                <Input
                  type="number"
                  value={manualKcal}
                  onChange={(e) => setManualKcal(+e.target.value)}
                  placeholder="ккал"
                  className="rounded-xl"
                />
                <Input
                  type="number"
                  value={manualP}
                  onChange={(e) => setManualP(+e.target.value)}
                  placeholder="Б"
                  className="rounded-xl"
                />
                <Input
                  type="number"
                  value={manualF}
                  onChange={(e) => setManualF(+e.target.value)}
                  placeholder="Ж"
                  className="rounded-xl"
                />
                <Input
                  type="number"
                  value={manualC}
                  onChange={(e) => setManualC(+e.target.value)}
                  placeholder="У"
                  className="rounded-xl"
                />
              </div>
              <Button size="sm" onClick={handleManualCreate} className="rounded-xl">
                Сохранить в базу
              </Button>
            </div>
          )}

          <TabsContent value="search" className="mt-3">
            <ScrollArea className="h-72 rounded-2xl">
              <FoodList foods={searched} onSelect={handleSelectFood} onToggleFav={toggleFavoriteFood} selected={selected && isFood(selected) ? (selected as FoodItem).id : undefined} />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="favorite" className="mt-3">
            {favorite.length === 0 ? (
              <EmptyHint text="Здесь появятся продукты, отмеченные звездой" />
            ) : (
              <ScrollArea className="h-72 rounded-2xl">
                <FoodList foods={favorite} onSelect={handleSelectFood} onToggleFav={toggleFavoriteFood} selected={selected && isFood(selected) ? (selected as FoodItem).id : undefined} />
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="frequent" className="mt-3">
            {frequent.length === 0 ? (
              <EmptyHint text="Часто используемые появятся после нескольких дней использования" />
            ) : (
              <ScrollArea className="h-72 rounded-2xl">
                <FoodList foods={frequent} onSelect={handleSelectFood} onToggleFav={toggleFavoriteFood} selected={selected && isFood(selected) ? (selected as FoodItem).id : undefined} />
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="recipes" className="mt-3">
            {recipes.length === 0 ? (
              <EmptyHint text="Создайте первый рецепт на экране «База и Рецепты»" />
            ) : (
              <ScrollArea className="h-72 rounded-2xl">
                <ul className="flex flex-col gap-2">
                  {recipes
                    .filter((r) => (q ? r.title.toLowerCase().includes(q) : true))
                    .map((r) => {
                      const totals = makeRecipeTotals(r);
                      const sel = selected && !isFood(selected) ? (selected as Recipe).id === r.id : false;
                      return (
                        <li key={r.id}>
                          <button
                            onClick={() => handleSelectRecipe(r)}
                            className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-3 text-left transition-colors ${
                              sel ? "border-primary bg-primary/10" : "border-border/70 hover:bg-muted/60"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate font-semibold">{r.title}</span>
                                {r.favorite && <Star className="size-3.5 text-amber-500" />}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {r.servingsCount} порц. · {r.portionWeight ?? "-"} г · {r.ingredients.length} ингр.
                              </div>
                            </div>
                            <div className="text-right text-xs">
                              <div className="font-feature-num font-bold">{totals.kcal}</div>
                              <div className="text-muted-foreground">ккал</div>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                </ul>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>

        {/* Блок выбора и заметок */}
        {selected && (
          <div className="mt-3 flex flex-col gap-3 border-t border-border/70 px-5 pt-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-semibold">
                  {isFood(selected) ? selected.name : selected.title}
                </div>
                <div className="text-xs text-muted-foreground">
                  {!isFood(selected) && selected.servingsCount + " порц."}
                  {isFood(selected) && selected.category}
                </div>
              </div>
              {macros && (
                <div className="text-right text-xs">
                  <div className="font-feature-num text-base font-bold text-primary">
                    {macros.kcal} ккал
                  </div>
                  <div className="text-muted-foreground">
                    Б {macros.protein} · Ж {macros.fat} · У {macros.carbs}
                  </div>
                </div>
              )}
            </div>

            {/* Редактирование рецепта «на сегодня» */}
            {!isFood(selected) && (
              <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-3">
                <div className="text-xs font-semibold text-muted-foreground">
                  Убрать ингредиенты только на сегодня (без изменения рецепта в базе)
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selected.ingredients.map((ing) => {
                    const off = removed.includes(ing.name);
                    return (
                      <button
                        key={ing.name}
                        onClick={() =>
                          setRemoved((r) =>
                            r.includes(ing.name) ? r.filter((x) => x !== ing.name) : [...r, ing.name]
                          )
                        }
                        className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                          off
                            ? "border-destructive/40 bg-destructive/10 text-destructive line-through"
                            : "border-border bg-background hover:bg-muted"
                        }`}
                      >
                        {ing.name} · {ing.amount} г
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isFood(selected) && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={grams}
                  onChange={(e) => setGrams(+e.target.value)}
                  min={1}
                  className="w-28 rounded-xl font-feature-num"
                />
                <span className="text-sm text-muted-foreground">грамм</span>
              </div>
            )}

            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Заметки"
              className="min-h-16 rounded-2xl text-sm"
            />
          </div>
        )}

        <DialogFooter className="border-t border-border/70 px-5 py-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            <X className="size-4" /> Отмена
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selected}
            className="rounded-xl"
          >
            <Plus className="size-4" /> Добавить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FoodList({
  foods,
  onSelect,
  onToggleFav,
  selected,
}: {
  foods: FoodItem[];
  onSelect: (f: FoodItem) => void;
  onToggleFav: (id: string) => void;
  selected?: string;
}) {
  if (foods.length === 0) {
    return <EmptyHint text="Ничего не найдено" />;
  }
  return (
    <ul className="flex flex-col gap-1.5 pr-2">
      {foods.map((f) => {
        const sel = selected === f.id;
        return (
          <li key={f.id} className="flex items-center gap-1.5">
            <button
              onClick={() => onSelect(f)}
              className={`flex flex-1 items-center justify-between gap-3 rounded-2xl border p-3 text-left transition-colors ${
                sel
                  ? "border-primary bg-primary/10"
                  : "border-transparent bg-muted/40 hover:bg-muted"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{f.name}</div>
                <div className="text-xs text-muted-foreground">
                  {f.kcal} ккал · Б {f.protein} · Ж {f.fat} · У {f.carbs}
                </div>
              </div>
              <Badge variant="secondary" className="rounded-full text-[10px]">
                {f.defaultPortion ?? 100} г
              </Badge>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => onToggleFav(f.id)}
              aria-label="В избранное"
            >
              <Star
                className={`size-4 ${f.favorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
              />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="grid h-40 place-items-center text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

export function mealLabel(m: MealType): string {
  switch (m) {
    case "breakfast":
      return "Завтрак";
    case "lunch":
      return "Обед";
    case "dinner":
      return "Ужин";
    case "snack":
      return "Перекусы";
  }
}

export function mealEmoji(m: MealType): string {
  switch (m) {
    case "breakfast":
      return "🌅";
    case "lunch":
      return "☀️";
    case "dinner":
      return "🌙";
    case "snack":
      return "🌱";
  }
}
