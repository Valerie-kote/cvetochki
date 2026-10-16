"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import {
  ActivityEntry,
  CalendarEvent,
  CycleEntry,
  DiaryEntry,
  FlowerEntry,
  FoodItem,
  GoalHistoryEntry,
  IgnoredDay,
  MealType,
  PillEntry,
  Profile,
  Recipe,
  WeightEntry,
  WaterEntry,
  MoodEntry,
  PressureEntry,
} from "../lib/types";
import { DEFAULT_PROFILE, SAMPLE_FOODS, SAMPLE_RECIPES } from "../lib/sample-data";
import {
  calcPortionMacros,
  id,
  ymd,
} from "../lib/calc";

// Применить «на сегодня» — переопределить ингредиенты рецепта
export function applyRecipeOverrides(
  recipe: Recipe,
  overrides?: {
    removedIngredients?: string[];
    addedIngredients?: Recipe["ingredients"];
  }
): Recipe["ingredients"] {
  let list = [...recipe.ingredients];
  if (overrides?.removedIngredients?.length) {
    list = list.filter(
      (i) => !overrides.removedIngredients!.includes(i.name)
    );
  }
  if (overrides?.addedIngredients?.length) {
    list = [...list, ...overrides.addedIngredients];
  }
  return list;
}

interface AddDiaryArgs {
  date: string;
  meal: MealType;
  food?: FoodItem;
  recipe?: Recipe;
  grams?: number;
  note?: string;
  overrides?: DiaryEntry["overrides"];
  source?: DiaryEntry["source"];
}

interface StoreState {
  profile: Profile;
  foods: FoodItem[];
  recipes: Recipe[];
  diary: DiaryEntry[];
  weights: WeightEntry[];
  cycle: CycleEntry[];
  water: WaterEntry[];
  mood: MoodEntry[];
  pills: PillEntry[];
  activity: ActivityEntry[];
  pressure: PressureEntry[];
  events: CalendarEvent[];
  ignoredDays: IgnoredDay[];
  goalHistory: GoalHistoryEntry[];
  flowers: FlowerEntry[];
  lastUsedFoods: Record<string, number>;

  updateProfile: (patch: Partial<Profile>) => void;
  setProfile: (p: Profile) => void;

  addFood: (food: FoodItem) => void;
  updateFood: (fid: string, patch: Partial<FoodItem>) => void;
  toggleFavoriteFood: (fid: string) => void;

  addRecipe: (r: Recipe) => void;
  updateRecipe: (id: string, patch: Partial<Recipe>) => void;
  deleteRecipe: (id: string) => void;
  toggleFavoriteRecipe: (id: string) => void;

  addDiaryEntry: (args: AddDiaryArgs) => void;
  updateDiaryEntry: (id: string, patch: Partial<DiaryEntry>) => void;
  deleteDiaryEntry: (id: string) => void;
  repeatYesterdayMeal: (date: string, meal: MealType) => void;

  addWeight: (w: WeightEntry) => void;
  updateWeight: (date: string, patch: Partial<WeightEntry>) => void;

  addCycle: (c: CycleEntry) => void;
  updateCycle: (id: string, patch: Partial<CycleEntry>) => void;

  setWater: (date: string, glasses: number) => void;
  addWater: (date: string, delta: number) => void;

  setMood: (m: MoodEntry) => void;

  addPill: (p: PillEntry) => void;
  togglePill: (id: string) => void;
  deletePill: (id: string) => void;

  addActivity: (a: ActivityEntry) => void;
  deleteActivity: (id: string) => void;

  addPressure: (p: PressureEntry) => void;
  deletePressure: (id: string) => void;

  addEvent: (e: CalendarEvent) => void;
  deleteEvent: (id: string) => void;

  toggleIgnoredDay: (date: string, reason?: string) => void;

  addFlower: (f: FlowerEntry) => void;
  addGoalHistory: (g: GoalHistoryEntry) => void;

  exportJson: () => string;
  importJson: (s: string) => boolean;
  resetAll: () => void;
}

const todayStr = () => ymd(new Date());

export const useAppStore = create<StoreState>()(
  persist(
    (set, get) => ({
      profile: DEFAULT_PROFILE,
      foods: SAMPLE_FOODS,
      recipes: SAMPLE_RECIPES,
      // Чистый лист при первом запуске — без демо-записей дневника
      diary: [],
      weights: [],
      cycle: [],
      water: [],
      mood: [],
      pills: [],
      activity: [],
      pressure: [],
      events: [],
      ignoredDays: [],
      goalHistory: [],
      flowers: [],
      lastUsedFoods: {},

      updateProfile: (patch) =>
        set((s) => ({ profile: { ...s.profile, ...patch } })),
      setProfile: (p) => set({ profile: p }),

      addFood: (food) => set((s) => ({ foods: [food, ...s.foods] })),
      updateFood: (fid, patch) =>
        set((s) => ({
          foods: s.foods.map((f) => (f.id === fid ? { ...f, ...patch } : f)),
        })),
      toggleFavoriteFood: (fid) =>
        set((s) => ({
          foods: s.foods.map((f) =>
            f.id === fid ? { ...f, favorite: !f.favorite } : f
          ),
        })),

      addRecipe: (r) => set((s) => ({ recipes: [r, ...s.recipes] })),
      updateRecipe: (rid, patch) =>
        set((s) => ({
          recipes: s.recipes.map((r) => (r.id === rid ? { ...r, ...patch } : r)),
        })),
      deleteRecipe: (rid) =>
        set((s) => ({ recipes: s.recipes.filter((r) => r.id !== rid) })),
      toggleFavoriteRecipe: (rid) =>
        set((s) => ({
          recipes: s.recipes.map((r) =>
            r.id === rid ? { ...r, favorite: !r.favorite } : r
          ),
        })),

      addDiaryEntry: ({ date, meal, food, recipe, grams, note, overrides, source }) => {
        const finalEntry: DiaryEntry = (() => {
          if (recipe) {
            const ingredients = applyRecipeOverrides(recipe, overrides);
            const totals = ingredients.reduce(
              (acc, i) => ({
                kcal: acc.kcal + i.kcal,
                protein: acc.protein + i.protein,
                fat: acc.fat + i.fat,
                carbs: acc.carbs + i.carbs,
              }),
              { kcal: 0, protein: 0, fat: 0, carbs: 0 }
            );
            const perPortion = {
              kcal: Math.round(totals.kcal / recipe.servingsCount),
              protein: Math.round(totals.protein / recipe.servingsCount),
              fat: Math.round(totals.fat / recipe.servingsCount),
              carbs: Math.round(totals.carbs / recipe.servingsCount),
            };
            return {
              id: id(),
              date,
              meal,
              foodId: recipe.id,
              name: recipe.title,
              amount: recipe.portionWeight ?? 0,
              kcal: perPortion.kcal,
              protein: perPortion.protein,
              fat: perPortion.fat,
              carbs: perPortion.carbs,
              note,
              fromRecipeId: recipe.id,
              overrides,
              source: source ?? "recipe",
              createdAt: Date.now(),
            };
          }
          if (food) {
            const g = grams ?? food.defaultPortion ?? 100;
            const m = calcPortionMacros(food, g);
            return {
              id: id(),
              date,
              meal,
              foodId: food.id,
              name: food.name,
              amount: g,
              kcal: m.kcal,
              protein: m.protein,
              fat: m.fat,
              carbs: m.carbs,
              note,
              source: source ?? "search",
              createdAt: Date.now(),
            };
          }
          return {
            id: id(),
            date,
            meal,
            name: "Свой продукт",
            amount: grams ?? 100,
            kcal: 0,
            protein: 0,
            fat: 0,
            carbs: 0,
            note,
            source: source ?? "manual",
            createdAt: Date.now(),
          };
        })();
        const foodId = food?.id;
        const lastUsedFoods = { ...get().lastUsedFoods };
        if (foodId) {
          lastUsedFoods[foodId] = (lastUsedFoods[foodId] ?? 0) + 1;
        }
        set((s) => ({
          diary: [...s.diary, finalEntry],
          lastUsedFoods,
        }));
      },
      updateDiaryEntry: (eid, patch) =>
        set((s) => ({
          diary: s.diary.map((d) => (d.id === eid ? { ...d, ...patch } : d)),
        })),
      deleteDiaryEntry: (eid) =>
        set((s) => ({ diary: s.diary.filter((d) => d.id !== eid) })),
      repeatYesterdayMeal: (date, meal) => {
        const yesterday = ymd(new Date(Date.now() - 86400_000));
        const yEntries = get().diary.filter(
          (d) => d.date === yesterday && d.meal === meal
        );
        if (yEntries.length === 0) return;
        const newEntries: DiaryEntry[] = yEntries.map((d) => ({
          ...d,
          id: id(),
          date,
          createdAt: Date.now(),
        }));
        set((s) => ({ diary: [...s.diary, ...newEntries] }));
      },

      addWeight: (w) =>
        set((s) => {
          const others = s.weights.filter((x) => x.date !== w.date);
          return { weights: [...others, w] };
        }),
      updateWeight: (date, patch) =>
        set((s) => ({
          weights: s.weights.map((w) => (w.date === date ? { ...w, ...patch } : w)),
        })),

      addCycle: (c) => set((s) => ({ cycle: [c, ...s.cycle] })),
      updateCycle: (cid, patch) =>
        set((s) => ({
          cycle: s.cycle.map((c) => (c.id === cid ? { ...c, ...patch } : c)),
        })),

      setWater: (date, glasses) =>
        set((s) => {
          const others = s.water.filter((w) => w.date !== date);
          return { water: [...others, { date, glasses }] };
        }),
      addWater: (date, delta) => {
        const existing = get().water.find((w) => w.date === date);
        const next = Math.max(0, (existing?.glasses ?? 0) + delta);
        get().setWater(date, next);
      },

      setMood: (m) =>
        set((s) => {
          const others = s.mood.filter((x) => x.date !== m.date);
          return { mood: [...others, m] };
        }),

      addPill: (p) => set((s) => ({ pills: [p, ...s.pills] })),
      togglePill: (pid) =>
        set((s) => ({
          pills: s.pills.map((p) => (p.id === pid ? { ...p, taken: !p.taken } : p)),
        })),
      deletePill: (pid) =>
        set((s) => ({ pills: s.pills.filter((p) => p.id !== pid) })),

      addActivity: (a) => set((s) => ({ activity: [a, ...s.activity] })),
      deleteActivity: (aid) =>
        set((s) => ({ activity: s.activity.filter((a) => a.id !== aid) })),

      addPressure: (p) => set((s) => ({ pressure: [p, ...s.pressure] })),
      deletePressure: (pid) =>
        set((s) => ({ pressure: s.pressure.filter((p) => p.id !== pid) })),

      addEvent: (e) => set((s) => ({ events: [e, ...s.events] })),
      deleteEvent: (eid) =>
        set((s) => ({ events: s.events.filter((e) => e.id !== eid) })),

      toggleIgnoredDay: (date, reason) =>
        set((s) => {
          const exists = s.ignoredDays.find((i) => i.date === date);
          if (exists) {
            return { ignoredDays: s.ignoredDays.filter((i) => i.date !== date) };
          }
          return { ignoredDays: [...s.ignoredDays, { date, reason }] };
        }),

      addFlower: (f) =>
        set((s) => {
          const exists = s.flowers.find(
            (x) => x.date === f.date && x.type === f.type
          );
          if (exists) return {};
          return { flowers: [...s.flowers, f] };
        }),
      addGoalHistory: (g) =>
        set((s) => ({ goalHistory: [...s.goalHistory, g] })),

      exportJson: () => {
        const s = get();
        const payload = {
          profile: s.profile,
          foods: s.foods,
          recipes: s.recipes,
          diary: s.diary,
          weights: s.weights,
          cycle: s.cycle,
          water: s.water,
          mood: s.mood,
          pills: s.pills,
          activity: s.activity,
          pressure: s.pressure,
          events: s.events,
          ignoredDays: s.ignoredDays,
          goalHistory: s.goalHistory,
          flowers: s.flowers,
          lastUsedFoods: s.lastUsedFoods,
          exportedAt: new Date().toISOString(),
          version: 1,
        };
        return JSON.stringify(payload, null, 2);
      },
      importJson: (str) => {
        try {
          const data = JSON.parse(str);
          set({
            profile: data.profile ?? DEFAULT_PROFILE,
            foods: data.foods ?? SAMPLE_FOODS,
            recipes: data.recipes ?? SAMPLE_RECIPES,
            diary: data.diary ?? [],
            weights: data.weights ?? [],
            cycle: data.cycle ?? [],
            water: data.water ?? [],
            mood: data.mood ?? [],
            pills: data.pills ?? [],
            activity: data.activity ?? [],
            pressure: data.pressure ?? [],
            events: data.events ?? [],
            ignoredDays: data.ignoredDays ?? [],
            goalHistory: data.goalHistory ?? [],
            flowers: data.flowers ?? [],
            lastUsedFoods: data.lastUsedFoods ?? {},
          });
          return true;
        } catch {
          return false;
        }
      },
      resetAll: () => {
        set({
          profile: { ...DEFAULT_PROFILE, onboarded: false },
          foods: SAMPLE_FOODS,
          recipes: SAMPLE_RECIPES,
          diary: [],
          weights: [],
          cycle: [],
          water: [],
          mood: [],
          pills: [],
          activity: [],
          pressure: [],
          events: [],
          ignoredDays: [],
          goalHistory: [],
          flowers: [],
          lastUsedFoods: {},
        });
      },
    }),
    {
      name: "flower-app-store",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);

// Селекторы-помощники
export function useDiaryForDate(date: string) {
  return useAppStore(
    useShallow((s) => s.diary.filter((d) => d.date === date))
  );
}

export function useDayTotals(date: string) {
  return useAppStore(
    useShallow((s) => {
      const entries = s.diary.filter((d) => d.date === date);
      const pills = s.pills.filter((p) => p.date === date && p.taken);
      const waterEntry = s.water.find((w) => w.date === date);
      const totals = entries.reduce(
        (acc, d) => ({
          kcal: acc.kcal + d.kcal,
          protein: acc.protein + d.protein,
          fat: acc.fat + d.fat,
          carbs: acc.carbs + d.carbs,
        }),
        { kcal: 0, protein: 0, fat: 0, carbs: 0 }
      );
      return {
        entries,
        pills,
        waterGlasses: waterEntry?.glasses ?? 0,
        totals,
      };
    })
  );
}
