import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ingredient = body?.ingredient;
    const candidates: {
      id: string;
      name: string;
      kcal: number;
      protein: number;
      fat: number;
      carbs: number;
    }[] = body?.candidates ?? [];
    if (!ingredient || !Array.isArray(candidates)) {
      return NextResponse.json(
        { error: "Нужны ingredient и candidates" },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "Ты — кулинар. Подбираешь замену ингредиенту с похожим КБЖУ и кулинарной ролью. Получаешь целевой ингредиент (имя и КБЖУ на 100 г) и список кандидатов. Верни ТОЛЬКО JSON-массив до 3 лучших замен: [{id,name,reason}]. reason — коротко, почему подходит (по 1-2 признака). Никакого markdown.",
        },
        {
          role: "user",
          content: JSON.stringify({ ingredient, candidates }, null, 2),
        },
      ],
      temperature: 0.4,
    });

    const raw = completion.choices?.[0]?.message?.content ?? "[]";
    const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    let parsed: { id: string; name: string; reason: string }[] = [];
    try {
      parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) parsed = [];
    } catch {
      parsed = [];
    }
    return NextResponse.json({ replacements: parsed });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Ошибка ИИ" },
      { status: 500 }
    );
  }
}
