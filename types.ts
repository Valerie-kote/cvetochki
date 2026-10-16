// Общие типы приложения «Цветочки»

export type Sex = "female" | "male";
export type Goal = "deficit" | "maintain" | "surplus";
export type BmrFormula = "mifflin" | "harris";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "veryActive";

export type GoalIntensity =
  | "deficit-soft"   // −10% от TDEE — мягкое похудение
  | "deficit-medium" // −15% от TDEE — рекомендуемый дефицит
  | "deficit-strong" // −20% от TDEE — активное похудение (осторожно)
  | "maintain"      // поддержание
  | "surplus-soft"  // +10% — плавный набор
  | "surplus-strong" // +15% — активный набор

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface FoodItem {
  id: string;
  name: string;
  // на 100 г
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber?: number;
  sugar?: number;
  // единицы измерения, граммовка по умолчанию
  defaultPortion?: number; // грамм
  category?: string;
  barcode?: string;
  favorite?: boolean;
  // микроэлементы (на 100 г), опционально
  micro?: Partial<Micronutrients>;
  source?: "manual" | "barcode" | "ai" | "sample";
}

export interface Micronutrients {
  // витамины
  vitaminA: number; // мкг
  vitaminC: number; // мг
  vitaminD: number; // мкг
  vitaminE: number; // мг
  vitaminB1: number; // мг
  vitaminB2: number; // мг
  vitaminB6: number; // мг
  vitaminB12: number; // мкг
  vitaminB9: number; // мкг
  vitaminK: number; // мкг
  vitaminPP: number; // мг
  // минералы
  calcium: number; // мг
  iron: number; // мг
  magnesium: number; // мг
  phosphorus: number; // мг
  potassium: number; // мг
  sodium: number; // мг
  zinc: number; // мг
  iodine: number; // мкг
  selenium: number; // мкг
}

export interface RecipeIngredient {
  foodId?: string;
  name: string;
  amount: number; // грамм (на 1 порцию из servingsCount)
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  micro?: Partial<Micronutrients>;
  // признак временного удаления из приёма пищи «на сегодня»
  removedToday?: boolean;
  note?: string;
}

export interface Recipe {
  id: string;
  title: string;
  servingsCount: number;
  ingredients: RecipeIngredient[];
  steps: string[];
  photoUrl?: string;
  portionWeight?: number; // грамм в одной порции
  notes?: string; // комментарий автора
  favorite?: boolean;
  source?: "manual" | "imported";
  createdAt: number;
}

export interface DiaryEntry {
  id: string;
  date: string; // YYYY-MM-DD
  meal: MealType;
  foodId?: string;
  name: string;
  amount: number; // грамм
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber?: number;
  micro?: Partial<Micronutrients>;
  note?: string; // заметка пользователя
  fromRecipeId?: string;
  // переопределённые ингредиенты (для редактирования рецепта «на сегодня»)
  overrides?: {
    removedIngredients?: string[]; // имена удалённых
    addedIngredients?: RecipeIngredient[];
  };
  source?: "manual" | "search" | "favorite" | "frequent" | "recipe" | "ai";
  createdAt: number;
}

export interface WeightEntry {
  date: string; // YYYY-MM-DD
  weight: number; // кг, 2 знака после запятой
  // Обмеры в см, 2 знака после запятой
  neck?: number;        // шея
  chest?: number;       // грудь
  chestUnder?: number;  // под грудью
  waist?: number;       // талия
  belly?: number;       // живот
  hips?: number;        // бёдра
  thigh?: number;       // ляшка (бицепс бедра)
  calf?: number;        // голень
}

export interface CycleEntry {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;
  symptoms?: string[];
  notes?: string;
}

export interface WaterEntry {
  date: string; // YYYY-MM-DD
  glasses: number; // стаканы по 250 мл
}

export interface MoodEntry {
  date: string;
  mood:
    | "great"
    | "good"
    | "happy"
    | "calm"
    | "energetic"
    | "ok"
    | "anxious"
    | "irritable"
    | "down"
    | "bad";
  symptoms?: string[]; // самочувствие
}

export interface PillEntry {
  id: string;
  date: string;
  name: string;
  dose?: string;
  taken: boolean;
  micro?: Partial<Micronutrients>;
  source?: "directory" | "manual" | "ai" | "photo";
}

export interface ActivityEntry {
  id: string;
  date: string;
  type: "workout" | "steps" | "sleep";
  name?: string; // упражнение
  sets?: number;
  reps?: number;
  weight?: number; // кг
  steps?: number;
  hours?: number; // сон
  burnedKcal?: number;
  addToRation?: boolean;
}

export interface PressureEntry {
  id: string;
  date: string;
  systolic: number;
  diastolic: number;
  pulse: number;
  notes?: string;
}

export interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  type: "doctor" | "personal" | "birthday" | "other";
}

export interface IgnoredDay {
  date: string;
  reason?: string;
}

export interface Profile {
  name?: string;
  sex: Sex;
  age: number;
  height: number; // см
  currentWeight: number; // кг, 2 знака после запятой
  targetWeight: number; // кг, 2 знака после запятой
  goal: Goal;
  goalIntensity?: GoalIntensity; // уточнённая цель (дефицит мягкий/умеренный/быстрый и т.д.)
  startDate: string; // YYYY-MM-DD
  formula: BmrFormula;
  activity: ActivityLevel;
  // ручная корректировка КБЖУ
  customTargets?: {
    kcal: number;
    protein: number;
    fat: number;
    carbs: number;
  };
  waterGoal: number; // мл/день
  allergies: string[];
  useAllergies: boolean;
  notifications: {
    water: boolean;
    weeklyReport: boolean;
    meals: boolean;
  };
  theme: "light" | "dark" | "system";
  onboarded?: boolean; // true после первого onboarding
}

export interface GoalHistoryEntry {
  date: string;
  goal: Goal;
  kcalTarget: number;
  note?: string;
}

export interface FlowerEntry {
  date: string;
  type: "daisy" | "rose" | "tulip";
  reason?: string;
}

export interface DaySummary {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  water: number;
  mood?: MoodEntry["mood"];
  weight?: number;
  cyclePhase?: string;
}

export interface Screen {
  id: "home" | "health" | "calendar" | "recipes" | "reports" | "profile";
  label: string;
}
