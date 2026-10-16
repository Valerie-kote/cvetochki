"use client";

// Клиентский модуль для вызова ИИ-эндпоинтов приложения «Цветочки».
// В dev/preview — обращается к API-роутам Next.js (/api/*),
// которые вызывают z-ai-web-dev-sdk на сервере.
// В APK на устройстве (без серверной части) — ИИ недоступен, и функции
// возвращают понятную ошибку «ИИ требует интернет-соединение».

export interface ParsedFoodItem {
  name: string;
  grams: number;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  note?: string;
}

export interface PillComposition {
  name: string;
  dose?: string;
  micro?: Record<string, number>;
  notes?: string;
}

export interface AIReplacement {
  id: string;
  name: string;
  reason: string;
}

export interface ImportedRecipe {
  title: string;
  servingsCount: number;
  ingredients: {
    name: string;
    amount: number;
    kcal: number;
    protein: number;
    fat: number;
    carbs: number;
  }[];
  steps: string[];
  notes?: string;
}

async function callApi<T>(endpoint: string, body: unknown): Promise<T> {
  let r: Response;
  try {
    r = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      "ИИ недоступен. Требуется интернет-соединение и работающий сервер."
    );
  }
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`HTTP ${r.status}: ${txt || r.statusText}`);
  }
  return r.json();
}

export async function parseFood(text: string): Promise<ParsedFoodItem[]> {
  const data = await callApi<{ items: ParsedFoodItem[]; error?: string }>(
    "/api/parse-food",
    { text }
  );
  return data.items ?? [];
}

export async function recognizePill(text: string): Promise<PillComposition> {
  const data = await callApi<{ pill: PillComposition; error?: string }>(
    "/api/pill-composition",
    { text }
  );
  return data.pill;
}

export async function analyzeProgress(payload: {
  profile: unknown;
  diary: unknown[];
  weights: unknown[];
  cycle: unknown[];
  mood: unknown[];
  activity: unknown[];
  pills: unknown[];
  water: unknown[];
  period?: string;
}): Promise<string> {
  const data = await callApi<{ text: string; error?: string }>(
    "/api/analyze-progress",
    payload
  );
  return data.text;
}

export async function importRecipeFromUrl(
  url: string
): Promise<ImportedRecipe> {
  const data = await callApi<{ recipe: ImportedRecipe; error?: string }>(
    "/api/import-recipe",
    { url }
  );
  return data.recipe;
}

export async function suggestReplacements(
  ingredient: {
    name: string;
    amount: number;
    kcal: number;
    protein: number;
    fat: number;
    carbs: number;
  },
  candidates: {
    id: string;
    name: string;
    kcal: number;
    protein: number;
    fat: number;
    carbs: number;
  }[]
): Promise<AIReplacement[]> {
  const data = await callApi<{ replacements: AIReplacement[]; error?: string }>(
    "/api/replace-ingredient",
    { ingredient, candidates }
  );
  return data.replacements ?? [];
}
