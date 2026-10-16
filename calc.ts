// Утилиты: даты, расчёт КБЖУ, ИМТ, BMR, единицы
import {
  ActivityLevel,
  BmrFormula,
  FoodItem,
  Micronutrients,
  Profile,
} from "./types";

// ===================== ДАТЫ =====================

const MONTHS_RU = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

const WEEKDAYS_RU = [
  "Воскресенье",
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
];

const WEEKDAYS_SHORT_RU = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

export function pad2(n: number): string {
  return n < 10 ? "0" + n : String(n);
}

/** YYYY-MM-DD по локальному времени */
export function ymd(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function ymdToDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

export function formatHeaderDate(d: Date = new Date()): {
  weekday: string;
  dayMonth: string;
  year: number;
  full: string;
} {
  const weekday = WEEKDAYS_RU[d.getDay()];
  const dayMonth = `${d.getDate()} ${MONTHS_RU[d.getMonth()]}`;
  const year = d.getFullYear();
  return {
    weekday,
    dayMonth,
    year,
    full: `${weekday}, ${dayMonth} ${year}`,
  };
}

export function monthName(d: Date): string {
  const names = [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
  ];
  return names[d.getMonth()];
}

export function weekdayShort(n: number): string {
  return WEEKDAYS_SHORT_RU[((n % 7) + 7) % 7];
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isoToRu(s: string): string {
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return s;
  return `${pad2(d)}.${pad2(m)}.${y}`;
}

// ===================== РАСЧЁТЫ =====================

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9,
};

export function calcBMR(p: Profile): number {
  const { weight, height, age, sex, formula } = {
    weight: p.currentWeight,
    height: p.height,
    age: p.age,
    sex: p.sex,
    formula: p.formula,
  };
  if (formula === "mifflin") {
    const base = 10 * weight + 6.25 * height - 5 * age;
    return Math.round(sex === "female" ? base - 161 : base + 5);
  }
  // Harris-Benedict
  const base =
    sex === "female"
      ? 447.593 + 9.247 * weight + 3.098 * height - 4.33 * age
      : 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age;
  return Math.round(base);
}

export function calcTDEE(p: Profile): number {
  return Math.round(calcBMR(p) * ACTIVITY_FACTOR[p.activity]);
}

export function calcTargetKcal(p: Profile): number {
  if (p.customTargets?.kcal) return p.customTargets.kcal;
  const tdee = calcTDEE(p);
  // уточнённая цель имеет приоритет
  if (p.goalIntensity) {
    switch (p.goalIntensity) {
      case "deficit-soft": return Math.round(tdee * 0.9);
      case "deficit-medium": return Math.round(tdee * 0.85);
      case "deficit-strong": return Math.round(tdee * 0.8);
      case "maintain": return tdee;
      case "surplus-soft": return Math.round(tdee * 1.1);
      case "surplus-strong": return Math.round(tdee * 1.15);
    }
  }
  // fallback на старую логику
  if (p.goal === "deficit") return Math.round(tdee * 0.85);
  if (p.goal === "surplus") return Math.round(tdee * 1.1);
  return tdee;
}

export const GOAL_INTENSITY_META: Record<
  import("./types").GoalIntensity,
  { title: string; hint: string; emoji: string; pct: string }
> = {
  "deficit-soft": {
    title: "Мягкий дефицит",
    hint: "−10% от TDEE. Самый комфортный темп, без срывов.",
    emoji: "🌱",
    pct: "−10%",
  },
  "deficit-medium": {
    title: "Умеренный дефицит",
    hint: "−15% от TDEE. Рекомендуемый темп для большинства.",
    emoji: "🌸",
    pct: "−15%",
  },
  "deficit-strong": {
    title: "Активный дефицит",
    hint: "−20% от TDEE. Быстро, но требует внимания к белку и самочувствию.",
    emoji: "💪",
    pct: "−20%",
  },
  maintain: {
    title: "Поддержание",
    hint: "Сохранение веса. Для тех, кто уже у цели или на recomposition.",
    emoji: "🌿",
    pct: "0%",
  },
  "surplus-soft": {
    title: "Плавный профицит",
    hint: "+10% от TDEE. Мышечный набор без лишнего жира.",
    emoji: "🌻",
    pct: "+10%",
  },
  "surplus-strong": {
    title: "Активный профицит",
    hint: "+15% от TDEE. Для эктоморфов и серьёзного набора.",
    emoji: "⭐",
    pct: "+15%",
  },
};

export interface TargetMacros {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;       // клетчатка, г
  water: number;       // вода, мл
}

export function calcTargetMacros(p: Profile): TargetMacros {
  if (p.customTargets?.kcal) {
    return {
      kcal: p.customTargets.kcal,
      protein: p.customTargets.protein,
      fat: p.customTargets.fat,
      carbs: p.customTargets.carbs,
      // при ручной корректировке клетчатку и воду оставляем авто
      fiber: calcFiber(p),
      water: p.waterGoal || calcWater(p),
    };
  }
  const kcal = calcTargetKcal(p);
  // белок зависит от интенсивности цели
  // мягкий дефицит — 1.5 г/кг
  // умеренный дефицит — 1.7 г/кг (сохранение мышц)
  // активный дефицит — 1.9 г/кг (защита мышц)
  // поддержание — 1.4 г/кг
  // плавный профицит — 1.7 г/кг
  // активный профицит — 2.0 г/кг
  const proteinPerKg =
    p.goalIntensity === "deficit-soft" ? 1.5
    : p.goalIntensity === "deficit-medium" ? 1.7
    : p.goalIntensity === "deficit-strong" ? 1.9
    : p.goalIntensity === "surplus-soft" ? 1.7
    : p.goalIntensity === "surplus-strong" ? 2.0
    : p.goal === "deficit" ? 1.6
    : p.goal === "surplus" ? 1.8
    : 1.4;
  const protein = Math.round(p.currentWeight * proteinPerKg);
  // жиры: 30% от калорий (1 г жиров = 9 ккал)
  const fat = Math.round((kcal * 0.3) / 9);
  // углеводы = остаток от калорий после белков и жиров
  // (1 г углеводов = 4 ккал — исправлено с 9)
  const carbs = Math.max(
    0,
    Math.round((kcal - protein * 4 - fat * 9) / 4)
  );
  return {
    kcal,
    protein,
    fat,
    carbs,
    fiber: calcFiber(p),
    water: p.waterGoal || calcWater(p),
  };
}

// Клетчатка: 14 г на 1000 ккал (AICR рекомендация)
export function calcFiber(p: Profile): number {
  const kcal = p.customTargets?.kcal ?? calcTargetKcal(p);
  return Math.round((kcal / 1000) * 14);
}

// Вода: 30 мл/кг веса (минимум 1500, максимум 3500)
export function calcWater(p: Profile): number {
  const v = Math.round(p.currentWeight * 30);
  return Math.max(1500, Math.min(3500, v));
}

export function calcBMI(weight: number, heightCm: number): {
  value: number;
  category: "under" | "norm" | "over" | "obese";
  label: string;
  idealMin: number;
  idealMax: number;
  toIdealKg: number;
} {
  const h = heightCm / 100;
  const bmi = weight / (h * h);
  let category: "under" | "norm" | "over" | "obese" = "norm";
  if (bmi < 18.5) category = "under";
  else if (bmi < 25) category = "norm";
  else if (bmi < 30) category = "over";
  else category = "obese";

  const labels: Record<string, string> = {
    under: "Недостаток веса",
    norm: "Норма",
    over: "Избыточный вес",
    obese: "Ожирение",
  };

  const idealMin = 18.5 * h * h;
  const idealMax = 24.9 * h * h;

  return {
    value: Math.round(bmi * 10) / 10,
    category,
    label: labels[category],
    idealMin: Math.round(idealMin * 10) / 10,
    idealMax: Math.round(idealMax * 10) / 10,
    toIdealKg: Math.max(0, Math.round((weight - idealMax) * 10) / 10),
  };
}

// ===================== РАСЧЁТ ПОРЦИИ =====================

export function calcPortionMacros(
  food: Pick<FoodItem, "kcal" | "protein" | "fat" | "carbs">,
  grams: number
) {
  const k = grams / 100;
  return {
    kcal: Math.round(food.kcal * k),
    protein: round1(food.protein * k),
    fat: round1(food.fat * k),
    carbs: round1(food.carbs * k),
  };
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function round0(n: number): number {
  return Math.round(n);
}

export function sumMicro(
  micros: (Partial<Micronutrients> | undefined)[]
): Partial<Micronutrients> {
  const keys: (keyof Micronutrients)[] = [
    "vitaminA",
    "vitaminC",
    "vitaminD",
    "vitaminE",
    "vitaminB1",
    "vitaminB2",
    "vitaminB6",
    "vitaminB12",
    "vitaminB9",
    "vitaminK",
    "vitaminPP",
    "calcium",
    "iron",
    "magnesium",
    "phosphorus",
    "potassium",
    "sodium",
    "zinc",
    "iodine",
    "selenium",
  ];
  const out: Partial<Micronutrients> = {};
  for (const k of keys) {
    let s = 0;
    for (const m of micros) {
      if (m && typeof m[k] === "number") s += m[k] as number;
    }
    out[k] = round1(s);
  }
  return out;
}

// Справочник микроэлементов: единицы + норма (женщины 25-50)
export const MICRO_NORMS: Record<keyof Micronutrients, { name: string; unit: string; daily: number }> = {
  vitaminA: { name: "Витамин A", unit: "мкг", daily: 800 },
  vitaminC: { name: "Витамин C", unit: "мг", daily: 90 },
  vitaminD: { name: "Витамин D", unit: "мкг", daily: 15 },
  vitaminE: { name: "Витамин E", unit: "мг", daily: 15 },
  vitaminB1: { name: "B1 (тиамин)", unit: "мг", daily: 1.5 },
  vitaminB2: { name: "B2 (рибофлавин)", unit: "мг", daily: 1.6 },
  vitaminB6: { name: "B6 (пиридоксин)", unit: "мг", daily: 1.6 },
  vitaminB12: { name: "B12 (кобаламин)", unit: "мкг", daily: 2.4 },
  vitaminB9: { name: "B9 (фолат)", unit: "мкг", daily: 400 },
  vitaminK: { name: "Витамин K", unit: "мкг", daily: 90 },
  vitaminPP: { name: "PP (ниацин)", unit: "мг", daily: 15 },
  calcium: { name: "Кальций", unit: "мг", daily: 1000 },
  iron: { name: "Железо", unit: "мг", daily: 18 },
  magnesium: { name: "Магний", unit: "мг", daily: 320 },
  phosphorus: { name: "Фосфор", unit: "мг", daily: 700 },
  potassium: { name: "Калий", unit: "мг", daily: 2600 },
  sodium: { name: "Натрий", unit: "мг", daily: 2300 },
  zinc: { name: "Цинк", unit: "мг", daily: 8 },
  iodine: { name: "Йод", unit: "мкг", daily: 150 },
  selenium: { name: "Селен", unit: "мкг", daily: 55 },
};

export function id(): string {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 9)
  );
}
