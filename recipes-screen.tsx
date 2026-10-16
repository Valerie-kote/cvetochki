"use client";

import * as React from "react";
import {
  Search,
  Star,
  Barcode,
  Camera,
  Plus,
  Sparkles,
  Trash2,
  Share2,
  ShoppingCart,
  Replace,
  X,
  ChefHat,
  Clock,
  Link as LinkIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "@/store/app-store";
import { calcPortionMacros, id, round1 } from "@/lib/calc";
import { makeRecipeTotals } from "@/lib/sample-data";
import { FoodItem, Recipe, RecipeIngredient } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  importRecipeFromUrl,
  suggestReplacements as aiSuggestReplacements,
} from "@/lib/ai-client";
import { toast } from "sonner";

export function RecipesScreen({
  onNavigateCreate,
  onNavigateAddFood,
}: {
  onNavigateCreate: () => void;
  onNavigateAddFood: () => void;
}) {
  const foods = useAppStore((s) => s.foods);
  const recipes = useAppStore((s) => s.recipes);
  const toggleFavFood = useAppStore((s) => s.toggleFavoriteFood);
  const addFood = useAppStore((s) => s.addFood);
  const addRecipe = useAppStore((s) => s.addRecipe); // нужен для импорта
  const deleteRecipe = useAppStore((s) => s.deleteRecipe);
  const toggleFavRecipe = useAppStore((s) => s.toggleFavoriteRecipe);

  const [query, setQuery] = React.useState("");
  const [showBarcode, setShowBarcode] = React.useState(false);
  const [barcode, setBarcode] = React.useState("");
  const [manualFood, setManualFood] = React.useState(false);
  const [recipeCard, setRecipeCard] = React.useState<Recipe | null>(null);
  const [shoppingList, setShoppingList] = React.useState(false);
  const [importUrl, setImportUrl] = React.useState("");
  const [importOpen, setImportOpen] = React.useState(false);

  const q = query.trim().toLowerCase();
  const filtered = q ? foods.filter((f) => f.name.toLowerCase().includes(q)) : foods;
  const favoriteFoods = foods.filter((f) => f.favorite);
  const filteredRecipes = q ? recipes.filter((r) => r.title.toLowerCase().includes(q)) : recipes;

  const simulateBarcode = () => {
    const code = barcode.trim();
    if (!code) return toast.error("Введите штрихкод");
    if (code.length >= 8 && /^\d+$/.test(code)) {
      const newFood: FoodItem = {
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
      addFood(newFood);
      toast.success(`Найден: ${newFood.name}`);
      setShowBarcode(false);
      setBarcode("");
    } else {
      toast.error("Не найден — добавьте вручную");
      onNavigateAddFood();
    }
  };

  return (
    <div className="mx-auto flex max-w-screen-md flex-col gap-4 px-4 pb-4 pt-2">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">База и рецепты</h1>
          <p className="text-sm text-muted-foreground">
            Продукты, штрихкоды, свои блюда и списки покупок
          </p>
        </div>
      </header>

      <Tabs defaultValue="products" className="space-y-3">
        <TabsList className="grid w-full grid-cols-2 rounded-2xl">
          <TabsTrigger value="products" className="rounded-xl">
            <Search className="size-4" /> Продукты
          </TabsTrigger>
          <TabsTrigger value="recipes" className="rounded-xl">
            <ChefHat className="size-4" /> Мои рецепты
          </TabsTrigger>
        </TabsList>

        {/* === Продукты === */}
        <TabsContent value="products" className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Текстовый поиск"
              className="rounded-xl"
            />
            <Button variant="outline" size="icon" className="rounded-xl shrink-0" onClick={() => setShowBarcode((v) => !v)} title="Сканер штрихкода">
              <Barcode className="size-4" />
            </Button>
            <Button variant="outline" size="icon" className="rounded-xl shrink-0" onClick={() => onNavigateAddFood()} title="Ввести вручную">
              <Plus className="size-4" />
            </Button>
          </div>

          {showBarcode && (
            <Card className="soft-card p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Camera className="size-4" />
                Наведите камеру или введите штрихкод
              </div>
              <div className="mt-2 flex gap-2">
                <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="0000000000" className="rounded-xl font-feature-num" />
                <Button size="sm" className="rounded-xl" onClick={simulateBarcode}>
                  <Sparkles className="size-4" /> Поиск
                </Button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Если код не найден в международной базе — продукт можно внести вручную,
                а этикетку распознает ИИ.
              </p>
            </Card>
          )}

          <Card className="soft-card p-3">
            <CardHeader className="space-y-0 px-0 pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Star className="size-5 text-amber-400" />
                Избранные продукты
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {favoriteFoods.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Звездочкой отмечайте продукты, которые нужны быстро.
                </p>
              ) : (
                <ScrollArea className="h-40">
                  <FoodGrid
                    foods={favoriteFoods}
                    onToggleFav={toggleFavFood}
                    onEdit={(f) => onNavigateAddFood()}
                  />
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <Card className="soft-card p-3">
            <CardHeader className="space-y-0 px-0 pb-2">
              <CardTitle className="text-base">
                Все продукты ({filtered.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-72">
                <FoodGrid
                  foods={filtered}
                  onToggleFav={toggleFavFood}
                  onEdit={() => onNavigateAddFood()}
                />
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === Рецепты === */}
        <TabsContent value="recipes" className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="rounded-2xl py-6 text-base" onClick={onNavigateCreate}>
              <Plus className="size-5" /> Создать рецепт
            </Button>
            <Button variant="outline" className="rounded-2xl py-6 text-base" onClick={() => setImportOpen(true)}>
              <LinkIcon className="size-5" /> Импорт по ссылке
            </Button>
          </div>

          {filteredRecipes.length === 0 ? (
            <Card className="soft-card p-5">
              <p className="text-sm text-muted-foreground">
                {recipes.length === 0
                  ? "Создайте первый рецепт — это просто: имя, ингредиенты, шаги."
                  : "Ничего не найдено"}
              </p>
            </Card>
          ) : (
            <ul className="grid gap-2">
              {filteredRecipes.map((r) => {
                const totals = makeRecipeTotals(r);
                return (
                  <li key={r.id}>
                    <Card className="soft-card overflow-hidden">
                      <button onClick={() => setRecipeCard(r)} className="block w-full p-4 text-left">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-bold">{r.title}</span>
                              {r.favorite && <Star className="size-3.5 text-amber-400" fill="currentColor" />}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {r.ingredients.length} ингр. · {r.servingsCount} порц. · {r.portionWeight ?? "-"} г
                            </div>
                          </div>
                          <div className="text-right text-xs">
                            <div className="font-feature-num text-base font-bold text-primary">{totals.kcal}</div>
                            <div className="text-muted-foreground">ккал/порц</div>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {r.ingredients.slice(0, 4).map((i) => (
                            <Badge key={i.name} variant="outline" className="text-[10px]">
                              {i.name}
                            </Badge>
                          ))}
                          {r.ingredients.length > 4 && (
                            <Badge variant="outline" className="text-[10px]">
                              +{r.ingredients.length - 4}
                            </Badge>
                          )}
                        </div>
                      </button>
                      <div className="flex items-center justify-between gap-2 border-t border-border/70 bg-muted/40 px-3 py-2">
                        <Button variant="ghost" size="sm" className="rounded-full text-xs" onClick={() => setShoppingList(true)}>
                          <ShoppingCart className="size-4" /> Покупки
                        </Button>
                        <div className="flex items-center gap-0.5">
                          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => toggleFavRecipe(r.id)}>
                            <Star className={cn("size-4", r.favorite && "fill-amber-400 text-amber-400")} />
                          </Button>
                          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setRecipeCard(r)}>
                            <ChefHat className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="rounded-full text-destructive" onClick={() => { deleteRecipe(r.id); toast.success("Удалено"); }}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      {manualFood && (
        <ManualFoodDialog
          onClose={() => setManualFood(false)}
          onSave={(f) => {
            addFood({ ...f, id: id() });
            setManualFood(false);
            toast.success(`Добавлено: ${f.name}`);
          }}
        />
      )}

      {recipeCard && (
        <RecipeSheet
          recipe={recipeCard}
          onClose={() => setRecipeCard(null)}
          onUpdate={(patch) => {
            const u = useAppStore.getState();
            u.updateRecipe(recipeCard.id, patch);
            setRecipeCard({ ...recipeCard, ...patch });
          }}
          foods={foods}
        />
      )}

      {shoppingList && (
        <ShoppingDialog recipes={recipes} onClose={() => setShoppingList(false)} />
      )}

      {importOpen && (
        <ImportRecipeDialog
          url={importUrl}
          onUrlChange={setImportUrl}
          onClose={() => setImportOpen(false)}
          onImport={(r) => {
            addRecipe({ ...r, id: id(), createdAt: Date.now(), source: "imported" });
            setImportOpen(false);
            toast.success("Рецепт импортирован");
          }}
        />
      )}
    </div>
  );
}

function FoodGrid({
  foods,
  onToggleFav,
  onEdit,
}: {
  foods: FoodItem[];
  onToggleFav: (id: string) => void;
  onEdit: (f: FoodItem) => void;
}) {
  if (foods.length === 0) {
    return <p className="px-2 py-4 text-sm text-muted-foreground">Ничего не найдено</p>;
  }
  return (
    <ul className="flex flex-col gap-1.5 p-1 pr-2">
      {foods.map((f) => (
        <li key={f.id} className="flex items-center gap-1.5">
          <button onClick={() => onEdit(f)} className="flex flex-1 items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background p-2.5 text-left hover:bg-muted/60">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{f.name}</div>
              <div className="text-[11px] text-muted-foreground">
                {f.kcal} ккал · Б {f.protein} · Ж {f.fat} · У {f.carbs}
                {f.barcode ? ` · ${f.barcode}` : ""}
              </div>
            </div>
            <Badge variant="secondary" className="text-[10px]">
              {f.defaultPortion ?? 100} г
            </Badge>
          </button>
          <Button variant="ghost" size="icon" className="rounded-full shrink-0" onClick={() => onToggleFav(f.id)}>
            <Star className={cn("size-4", f.favorite && "fill-amber-400 text-amber-400")} />
          </Button>
        </li>
      ))}
    </ul>
  );
}

function ManualFoodDialog({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (f: Omit<FoodItem, "id">) => void;
}) {
  const [name, setName] = React.useState("");
  const [kcal, setKcal] = React.useState(0);
  const [protein, setProtein] = React.useState(0);
  const [fat, setFat] = React.useState(0);
  const [carbs, setCarbs] = React.useState(0);
  const [portion, setPortion] = React.useState(100);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle>Новый продукт</DialogTitle>
          <DialogDescription>КБЖУ указывается на 100 г</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label="Название">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Греческий йогурт" className="rounded-xl" />
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
          <Field label="Порция по умолчанию, г">
            <Input type="number" value={portion} onChange={(e) => setPortion(+e.target.value)} className="rounded-xl font-feature-num" />
          </Field>
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <Label className="flex items-center gap-1.5">
              <Camera className="size-4 text-primary" />
              Можно сфотографировать этикетку — ИИ сам заполнит КБЖУ
            </Label>
            <Button variant="outline" size="sm" className="mt-2 rounded-xl" onClick={() => toast.info("Имитация съёмки. Заполните поля вручную или импортируйте позже.")}>
              <Camera className="size-4" /> Снять этикетку
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}><X className="size-4" /> Отмена</Button>
          <Button
            onClick={() => {
              if (!name.trim()) return toast.error("Введите название");
              onSave({ name: name.trim(), kcal, protein, fat, carbs, defaultPortion: portion, source: "manual", category: "Свои продукты" });
            }}
          >
            <Plus className="size-4" /> Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function RecipeSheet({
  recipe,
  foods,
  onClose,
  onUpdate,
}: {
  recipe: Recipe;
  foods: FoodItem[];
  onClose: () => void;
  onUpdate: (patch: Partial<Recipe>) => void;
}) {
  const [recalcOpen, setRecalcOpen] = React.useState(false);
  const [replaceTarget, setReplaceTarget] = React.useState<RecipeIngredient | null>(null);
  const [availableKg, setAvailableKg] = React.useState<number>(0);
  const [targetIngredient, setTargetIngredient] = React.useState<RecipeIngredient | null>(null);

  // Пересчёт: «нужно 200 г курицы, есть 80 г»
  const openRecalc = (ing: RecipeIngredient) => {
    setTargetIngredient(ing);
    setAvailableKg(ing.amount);
    setRecalcOpen(true);
  };

  const recalc = () => {
    if (!targetIngredient) return;
    const factor = availableKg / targetIngredient.amount;
    const nextIngredients = recipe.ingredients.map((i) => ({
      ...i,
      amount: round1(i.amount * factor),
      kcal: round1(i.kcal * factor),
      protein: round1(i.protein * factor),
      fat: round1(i.fat * factor),
      carbs: round1(i.carbs * factor),
    }));
    onUpdate({ ingredients: nextIngredients });
    setRecalcOpen(false);
    toast.success(`Рецепт пересчитан на коэффициент ${factor.toFixed(2)}`);
  };

  const totals = makeRecipeTotals(recipe);

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl">{recipe.title}</SheetTitle>
          <SheetDescription>
            {recipe.servingsCount} порц. · {recipe.portionWeight ?? "-"} г
          </SheetDescription>
        </SheetHeader>

        <div className="mt-3 grid gap-3">
          {/* КБЖУ */}
          <div className="grid grid-cols-4 gap-2">
            <MacroBlock label="ккал" value={totals.kcal} />
            <MacroBlock label="Б" value={totals.protein} unit="г" />
            <MacroBlock label="Ж" value={totals.fat} unit="г" />
            <MacroBlock label="У" value={totals.carbs} unit="г" />
          </div>

          {/* Действия */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => toast.info("Поделиться — откроется карточка для мессенджера")}>
              <Share2 className="size-4" /> Поделиться
            </Button>
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => toast.success("Рецепт добавлен в избранное")}>
              <Star className="size-4" /> В избранное
            </Button>
          </div>

          {/* Ингредиенты */}
          <div className="rounded-2xl border border-border/70 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">Ингредиенты</span>
              <span className="text-xs text-muted-foreground">{recipe.ingredients.length}</span>
            </div>
            <ul className="space-y-1.5">
              {recipe.ingredients.map((ing, idx) => (
                <li key={idx} className="flex items-center gap-2 rounded-xl bg-muted/40 px-2 py-1.5 text-sm">
                  <span className="flex-1 truncate">{ing.name}</span>
                  <span className="font-feature-num text-xs tabular-nums">{ing.amount} г</span>
                  <Button variant="ghost" size="sm" className="rounded-full text-xs" onClick={() => openRecalc(ing)}>
                    <Replace className="size-3.5" /> Пересчитать
                  </Button>
                  <Button variant="ghost" size="sm" className="rounded-full text-xs" onClick={() => setReplaceTarget(ing)}>
                    <Sparkles className="size-3.5" /> Заменить
                  </Button>
                </li>
              ))}
            </ul>
          </div>

          {/* Шаги */}
          <div className="rounded-2xl border border-border/70 p-3">
            <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              <Clock className="size-4 text-primary" /> Шаги
            </div>
            <ol className="space-y-2">
              {recipe.steps.map((s, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    {idx + 1}
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>

          {recipe.notes && (
            <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-3 text-sm italic text-muted-foreground">
              «{recipe.notes}»
            </div>
          )}
        </div>
      </SheetContent>

      {recalcOpen && targetIngredient && (
        <Dialog open onOpenChange={(v) => !v && setRecalcOpen(false)}>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle>Умный пересчёт порций</DialogTitle>
              <DialogDescription>
                В рецепте нужно {targetIngredient.amount} г «{targetIngredient.name}».
                Сколько у вас есть?
              </DialogDescription>
            </DialogHeader>
            <Field label="Доступно, г">
              <Input type="number" value={availableKg} onChange={(e) => setAvailableKg(+e.target.value)} className="rounded-xl font-feature-num" />
            </Field>
            <p className="text-xs text-muted-foreground">
              ИИ пересчитает остальные ингредиенты так, чтобы пропорции сохранились,
              и покажет новую калорийность.
            </p>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setRecalcOpen(false)}>Отмена</Button>
              <Button onClick={recalc}>Пересчитать</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {replaceTarget && (
        <ReplaceIngredientDialog
          target={replaceTarget}
          foods={foods}
          onClose={() => setReplaceTarget(null)}
          onReplace={(food) => {
            const m = calcPortionMacros(food, replaceTarget.amount);
            const nextIngredients = recipe.ingredients.map((i) =>
              i.name === replaceTarget.name
                ? { ...i, name: food.name, foodId: food.id, ...m }
                : i
            );
            onUpdate({ ingredients: nextIngredients });
            setReplaceTarget(null);
            toast.success(`Замена: ${replaceTarget.name} → ${food.name}`);
          }}
        />
      )}
    </Sheet>
  );
}

function ReplaceIngredientDialog({
  target,
  foods,
  onClose,
  onReplace,
}: {
  target: RecipeIngredient;
  foods: FoodItem[];
  onClose: () => void;
  onReplace: (food: FoodItem) => void;
}) {
  const [aiBusy, setAiBusy] = React.useState(false);
  const [aiResults, setAiResults] = React.useState<
    { id: string; name: string; reason: string }[]
  >([]);

  // простые кандидаты по КБЖУ
  const candidates = React.useMemo(
    () =>
      foods
        .filter(
          (f) =>
            Math.abs(f.kcal - target.kcal) < 80 &&
            f.name !== target.name
        )
        .slice(0, 8),
    [foods, target]
  );

  const askAi = async () => {
    setAiBusy(true);
    try {
      const reps = await aiSuggestReplacements(
        {
          name: target.name,
          amount: target.amount,
          kcal: target.kcal,
          protein: target.protein,
          fat: target.fat,
          carbs: target.carbs,
        },
        candidates.map((c) => ({
          id: c.id,
          name: c.name,
          kcal: c.kcal,
          protein: c.protein,
          fat: c.fat,
          carbs: c.carbs,
        }))
      );
      setAiResults(reps);
    } catch (e: any) {
      toast.error("ИИ недоступен: " + (e?.message ?? ""));
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle>Замена ингредиента</DialogTitle>
          <DialogDescription>
            Подберём аналог с похожим КБЖУ для «{target.name}».
          </DialogDescription>
        </DialogHeader>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={askAi}
          disabled={aiBusy}
        >
          <Sparkles className={cn("size-4", aiBusy && "animate-pulse")} />
          {aiBusy ? "ИИ подбирает..." : "Спросить ИИ"}
        </Button>
        <div className="space-y-2">
          {aiResults.length > 0 && (
            <>
              <div className="text-xs font-semibold text-primary">ИИ-рекомендации:</div>
              {aiResults.map((r) => {
                const f = candidates.find((c) => c.id === r.id);
                if (!f) return null;
                return (
                  <ReplaceButton
                    key={r.id}
                    name={r.name}
                    sub={`${f.kcal} ккал/100г · ${r.reason}`}
                    onClick={() => onReplace(f)}
                  />
                );
              })}
            </>
          )}
          <div className="text-xs font-semibold text-muted-foreground">Все кандидаты:</div>
          {candidates.length === 0 && (
            <p className="text-sm text-muted-foreground">Похожих продуктов в базе нет</p>
          )}
          {candidates.map((f) => (
            <ReplaceButton
              key={f.id}
              name={f.name}
              sub={`${f.kcal} ккал/100г · Б ${f.protein} · Ж ${f.fat} · У ${f.carbs}`}
              onClick={() => onReplace(f)}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReplaceButton({
  name,
  sub,
  onClick,
}: {
  name: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border/70 p-3 text-left hover:bg-muted/60"
    >
      <div>
        <div className="text-sm font-semibold">{name}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
      <Replace className="size-4 text-muted-foreground" />
    </button>
  );
}

function ShoppingDialog({
  recipes,
  onClose,
}: {
  recipes: Recipe[];
  onClose: () => void;
}) {
  const [selected, setSelected] = React.useState<Record<string, number>>({});
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl rounded-3xl">
        <DialogHeader>
          <DialogTitle>Рассчитать покупки</DialogTitle>
          <DialogDescription>
            Отметьте рецепты — приложение составит единый список продуктов с общим весом.
          </DialogDescription>
        </DialogHeader>
        <ul className="grid gap-2">
          {recipes.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 rounded-2xl border border-border/70 p-3">
              <span className="text-sm font-semibold">{r.title}</span>
              <Input
                type="number"
                value={selected[r.id] ?? 0}
                onChange={(e) => setSelected({ ...selected, [r.id]: +e.target.value })}
                className="h-8 w-16 rounded-lg font-feature-num"
                min={0}
              />
            </li>
          ))}
        </ul>
        {Object.entries(selected).filter(([, c]) => c > 0).length > 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-3">
            <div className="mb-2 text-sm font-semibold">Список покупок</div>
            <ShoppingList recipes={recipes} selected={selected} />
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}><X className="size-4" /> Закрыть</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ShoppingList({
  recipes,
  selected,
}: {
  recipes: Recipe[];
  selected: Record<string, number>;
}) {
  const map = new Map<string, number>();
  for (const [rid, count] of Object.entries(selected)) {
    if (count <= 0) continue;
    const r = recipes.find((x) => x.id === rid);
    if (!r) continue;
    for (const ing of r.ingredients) {
      const perPortion = ing.amount / r.servingsCount;
      const total = perPortion * count;
      map.set(ing.name, (map.get(ing.name) ?? 0) + total);
    }
  }
  return (
    <ul className="space-y-1 text-sm">
      {[...map.entries()].map(([name, g]) => (
        <li key={name} className="flex items-center justify-between gap-2 rounded-lg bg-background px-2 py-1">
          <span>{name}</span>
          <span className="font-feature-num text-xs tabular-nums">{round1(g)} г</span>
        </li>
      ))}
    </ul>
  );
}

function ImportRecipeDialog({
  url,
  onUrlChange,
  onClose,
  onImport,
}: {
  url: string;
  onUrlChange: (v: string) => void;
  onClose: () => void;
  onImport: (r: Omit<Recipe, "id" | "createdAt">) => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const handleImport = async () => {
    if (!url.trim()) return toast.error("Вставьте ссылку");
    setBusy(true);
    try {
      const recipe = await importRecipeFromUrl(url);
      onImport({
        title: recipe.title || "Импортированный рецепт",
        servingsCount: recipe.servingsCount || 1,
        ingredients: (recipe.ingredients ?? []).map((i) => ({
          name: i.name,
          amount: i.amount,
          kcal: i.kcal,
          protein: i.protein,
          fat: i.fat,
          carbs: i.carbs,
        })),
        steps: recipe.steps ?? [],
        notes: `Источник: ${url}${recipe.notes ? " · " + recipe.notes : ""}`,
        source: "imported",
      });
    } catch (e: any) {
      toast.error("ИИ не смог извлечь рецепт: " + (e?.message ?? ""));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle>Импорт рецепта</DialogTitle>
          <DialogDescription>
            Вставьте ссылку — ИИ сам вытащит ингредиенты и граммовки
          </DialogDescription>
        </DialogHeader>
        <Input value={url} onChange={(e) => onUrlChange(e.target.value)} placeholder="https://..." className="rounded-xl" />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}><X className="size-4" /> Отмена</Button>
          <Button onClick={handleImport} disabled={busy}>
            <Sparkles className={cn("size-4", busy && "animate-pulse")} />{" "}
            {busy ? "Идёт распознавание..." : "Импортировать"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MacroBlock({ label, value, unit }: { label: string; value: number; unit?: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/30 p-2 text-center">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="font-feature-num text-sm font-bold tabular-nums">
        {value}
        {unit && <span className="text-[10px] text-muted-foreground"> {unit}</span>}
      </div>
    </div>
  );
}

function MacroLine({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-feature-num text-base font-bold text-primary tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
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
