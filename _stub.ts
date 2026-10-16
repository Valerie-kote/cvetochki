import { NextRequest, NextResponse } from "next/server";

// Заглушка для API route при статической сборке под Capacitor.
// В реальном веб-сервере (preview/production) этот файл не используется —
// импортится реальная реализация.
export const dynamic = "force-static";

export function GET() {
  return NextResponse.json({ error: "ИИ недоступен в офлайн-режиме" });
}
