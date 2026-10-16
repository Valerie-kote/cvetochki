"use client";

import * as React from "react";
import {
  TrendingDown,
  TrendingUp,
  Sparkles,
  CalendarDays,
  Flower,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/store/app-store";
import {
  addDays,
  calcTargetKcal,
  calcTargetMacros,
  id,
  ymd,
} from "@/lib/calc";
import { analyzeProgress as aiAnalyze } from "@/lib/ai-client";
import { FlowerEntry } from "@/lib/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Bar,
  BarChart,
  Cell,
} from "recharts";
import { toast } from "sonner";

type Period = "week" | "month" | "custom";

const FLOWER_META = {
  daisy: { emoji: "🌼", name: "Ромашка", desc: "Уложилась в норму калорий" },
  rose: { emoji: "🌹", name: "Роза", desc: "Идеальный баланс БЖУ" },
  tulip: { emoji: "🌷", name: "Тюльпан", desc: "Выпита вся вода" },
} as const;

export function ReportsScreen() {
  const profile = useAppStore((s) => s.profile);
  const diary = useAppStore((s) => s.diary);
  const weights = useAppStore((s) => s.weights);
  const water = useAppStore((s) => s.water);
  const activity = useAppStore((s) => s.activity);
  const mood = useAppStore((s) => s.mood);
  const cycle = useAppStore((s) => s.cycle);
  const flowers = useAppStore((s) => s.flowers);
  const goalHistory = useAppStore((s) => s.goalHistory);
  const addFlower = useAppStore((s) => s.addFlower);

  const [period, setPeriod] = React.useState<Period>("week");
  const [from, setFrom] = React.useState(ymd(addDays(new Date(), -6)));
  const [to, setTo] = React.useState(ymd(new Date()));
  const [aiText, setAiText] = React.useState<string>("");
  const [aiBusy, setAiBusy] = React.useState(false);

  const range = React.useMemo(() => {
    const start = period === "week" ? addDays(new Date(), -6) : period === "month" ? addDays(new Date(), -29) : (() => {
      const [y, m, d] = from.split("-").map(Number);
      return new Date(y, m - 1, d);
    })();
    const end = period === "custom" ? (() => {
      const [y, m, d] = to.split("-").map(Number);
      return new Date(y, m - 1, d);
    })() : new Date();
    const arr: string[] = [];
    let cur = new Date(start);
    while (cur <= end) {
      arr.push(ymd(cur));
      cur = addDays(cur, 1);
    }
    return arr;
  }, [period, from, to]);

  const target = calcTargetKcal(profile);
  const targets = calcTargetMacros(profile);

  // Статистика за период
  const stats = React.useMemo(() => {
    const inRange = range.flatMap((d) => diary.filter((e) => e.date === d));
    if (inRange.length === 0)
      return {
        avgKcal: 0,
        avgP: 0,
        avgF: 0,
        avgC: 0,
        deficit: 0,
        norm: 0,
        surplus: 0,
        noData: range.length,
      };
    const byDay = new Map<string, number>();
    const byDayMacros = new Map<string, { p: number; f: number; c: number }>();
    for (const e of inRange) {
      byDay.set(e.date, (byDay.get(e.date) ?? 0) + e.kcal);
      const cur = byDayMacros.get(e.date) ?? { p: 0, f: 0, c: 0 };
      byDayMacros.set(e.date, {
        p: cur.p + e.protein,
        f: cur.f + e.fat,
        c: cur.c + e.carbs,
      });
    }
    let deficit = 0,
      norm = 0,
      surplus = 0,
      noData = 0;
    let totalK = 0,
      totalP = 0,
      totalF = 0,
      totalC = 0;
    let daysWithData = 0;
    for (const d of range) {
      const k = byDay.get(d);
      if (k === undefined) {
        noData++;
        continue;
      }
      daysWithData++;
      totalK += k;
      const macros = byDayMacros.get(d)!;
      totalP += macros.p;
      totalF += macros.f;
      totalC += macros.c;
      if (k < target * 0.95) deficit++;
      else if (k > target * 1.05) surplus++;
      else norm++;
    }
    return {
      avgKcal: daysWithData > 0 ? Math.round(totalK / daysWithData) : 0,
      avgP: daysWithData > 0 ? Math.round(totalP / daysWithData) : 0,
      avgF: daysWithData > 0 ? Math.round(totalF / daysWithData) : 0,
      avgC: daysWithData > 0 ? Math.round(totalC / daysWithData) : 0,
      deficit,
      norm,
      surplus,
      noData,
    };
  }, [range, diary, target]);

  // Эта неделя vs прошлая
  const compare = React.useMemo(() => {
    const thisWeek = range;
    const lastWeekStart = addDays(new Date(), -13);
    const lastWeekEnd = addDays(new Date(), -7);
    const lastWeek: string[] = [];
    let cur = new Date(lastWeekStart);
    while (cur <= lastWeekEnd) {
      lastWeek.push(ymd(cur));
      cur = addDays(cur, 1);
    }
    const sumFor = (days: string[]) => {
      const inRange = diary.filter((e) => days.includes(e.date));
      return inRange.reduce((s, e) => s + e.kcal, 0);
    };
    return {
      thisWeek: sumFor(thisWeek),
      lastWeek: sumFor(lastWeek),
    };
  }, [range, diary]);

  // График веса (сглаженный)
  const weightSeries = React.useMemo(() => {
    const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
    // 7-дневное скользящее среднее
    return sorted.map((w, idx) => {
      const slice = sorted.slice(Math.max(0, idx - 6), idx + 1);
      const avg = slice.reduce((s, x) => s + x.weight, 0) / slice.length;
      return {
        date: w.date.slice(5),
        raw: w.weight,
        smooth: Math.round(avg * 100) / 100,
      };
    });
  }, [weights]);

  // График по дням периода
  const dayKcal = range.map((d) => {
    const list = diary.filter((e) => e.date === d);
    const kcal = list.reduce((s, e) => s + e.kcal, 0);
    let bucket = "no-data";
    if (list.length > 0) {
      if (kcal < target * 0.95) bucket = "deficit";
      else if (kcal > target * 1.05) bucket = "surplus";
      else bucket = "norm";
    }
    return {
      date: d.slice(5),
      kcal,
      bucket,
    };
  });

  const bucketColor: Record<string, string> = {
    deficit: "var(--primary)",
    norm: "#f59e0b",
    surplus: "#f43f5e",
    "no-data": "var(--muted)",
  };

  // Цветочки этого месяца
  const now = new Date();
  const monthFlowers = flowers.filter((f) => f.date.startsWith(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`));

  // AI-анализ
  const analyzeProgress = async () => {
    setAiBusy(true);
    try {
      const text = await aiAnalyze({
        profile,
        diary: range.flatMap((d) => diary.filter((e) => e.date === d)),
        weights,
        cycle,
        mood,
        activity,
        pills: useAppStore.getState().pills,
        water,
        period,
      });
      setAiText(text || "Не удалось получить ответ от ИИ.");
    } catch (e: any) {
      setAiText(
        `Локальный анализ: ${
          stats.avgKcal > 0
            ? `в среднем ${stats.avgKcal} ккал в день.`
            : "пока нет данных по калориям."
        } ${
          weightSeries.length > 1
            ? `Вес: ${weightSeries[0].smooth} → ${weightSeries.at(-1)!.smooth} кг.`
            : ""
        } ИИ сейчас недоступен, попробуйте позже.`
      );
    } finally {
      setAiBusy(false);
    }
  };

  const generateFlowersForRange = () => {
    for (const d of range) {
      const list = diary.filter((e) => e.date === d);
      const kcal = list.reduce((s, e) => s + e.kcal, 0);
      if (kcal >= target * 0.95 && kcal <= target * 1.05) {
        addFlower({ date: d, type: "daisy", reason: "В норме" } as FlowerEntry);
      }
      const macros = list.reduce(
        (acc, e) => ({
          p: acc.p + e.protein,
          f: acc.f + e.fat,
          c: acc.c + e.carbs,
        }),
        { p: 0, f: 0, c: 0 }
      );
      if (
        Math.abs(macros.p - targets.protein) <= targets.protein * 0.1 &&
        Math.abs(macros.f - targets.fat) <= targets.fat * 0.1 &&
        Math.abs(macros.c - targets.carbs) <= targets.carbs * 0.1
      ) {
        addFlower({ date: d, type: "rose", reason: "Идеальный баланс БЖУ" } as FlowerEntry);
      }
      const w = water.find((x) => x.date === d);
      if (w && w.glasses * 250 >= profile.waterGoal) {
        addFlower({ date: d, type: "tulip", reason: "Вода выпита" } as FlowerEntry);
      }
    }
    toast.success("Цветочки начислены");
  };

  void id;

  return (
    <div className="mx-auto flex max-w-screen-md flex-col gap-4 px-4 pb-4 pt-2">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Отчёты</h1>
          <p className="text-sm text-muted-foreground">Мягкая аналитика и букеты</p>
        </div>
      </header>

      {/* Период */}
      <Card className="soft-card p-3">
        <div className="flex items-center gap-2">
          <Button variant={period === "week" ? "default" : "outline"} size="sm" className="rounded-full" onClick={() => setPeriod("week")}>
            Неделя
          </Button>
          <Button variant={period === "month" ? "default" : "outline"} size="sm" className="rounded-full" onClick={() => setPeriod("month")}>
            Месяц
          </Button>
          <Button variant={period === "custom" ? "default" : "outline"} size="sm" className="rounded-full" onClick={() => setPeriod("custom")}>
            <CalendarDays className="size-4" /> Свой
          </Button>
        </div>
        {period === "custom" && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          </div>
        )}
        <div className="mt-2 text-xs text-muted-foreground">
          Период: {range[0]} → {range[range.length - 1]}
        </div>
      </Card>

      {/* Сводная статистика */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Средние ккал" value={stats.avgKcal} unit="ккал" target={`цель ${target}`} />
        <StatCard label="Белки" value={stats.avgP} unit="г" target={`цель ${targets.protein}`} />
        <StatCard label="Жиры" value={stats.avgF} unit="г" target={`цель ${targets.fat}`} />
        <StatCard label="Углеводы" value={stats.avgC} unit="г" target={`цель ${targets.carbs}`} />
      </div>

      {/* Дни по типу */}
      <Card className="soft-card">
        <CardHeader className="space-y-0 pb-2">
          <CardTitle className="text-base">Дни по типу</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2 text-center text-sm">
            <DayType label="Дефицит" value={stats.deficit} color="bg-primary" />
            <DayType label="Норма" value={stats.norm} color="bg-amber-400" />
            <DayType label="Профицит" value={stats.surplus} color="bg-rose-400" />
            <DayType label="Нет данных" value={stats.noData} color="bg-muted-foreground/30" />
          </div>
        </CardContent>
      </Card>

      {/* График калорий по дням */}
      <Card className="soft-card">
        <CardHeader className="space-y-0 pb-2">
          <CardTitle className="text-base">Калории по дням</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayKcal} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--background)",
                  }}
                />
                <Bar dataKey="kcal" radius={8}>
                  {dayKcal.map((entry, i) => (
                    <Cell key={i} fill={bucketColor[entry.bucket]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* График веса сглаженный */}
      <Card className="soft-card">
        <CardHeader className="space-y-0 pb-2">
          <CardTitle className="text-base">График веса (сглаженный)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightSeries} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <YAxis
                  domain={["dataMin - 1", "dataMax + 1"]}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--background)",
                  }}
                />
                <Line type="monotone" dataKey="raw" stroke="var(--muted-foreground)" strokeWidth={1.5} dot={false} name="Реальный вес" />
                <Line type="monotone" dataKey="smooth" stroke="var(--primary)" strokeWidth={3} dot={{ r: 2 }} name="Тренд" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Эта неделя vs Прошлая */}
      <Card className="soft-card">
        <CardHeader className="space-y-0 pb-2">
          <CardTitle className="text-base">Эта неделя vs Прошлая</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border/70 bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground">Эта неделя</div>
              <div className="font-feature-num text-xl font-bold tabular-nums">
                {compare.thisWeek}
              </div>
              <div className="text-xs text-muted-foreground">ккал за период</div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground">Прошлая неделя</div>
              <div className="font-feature-num text-xl font-bold tabular-nums">
                {compare.lastWeek}
              </div>
              <div className="text-xs text-muted-foreground">ккал за период</div>
            </div>
          </div>
          {compare.thisWeek !== 0 && compare.lastWeek !== 0 && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              {compare.thisWeek < compare.lastWeek ? (
                <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary">
                  <TrendingDown className="size-3.5" /> Стало лучше (−{compare.lastWeek - compare.thisWeek} ккал)
                </Badge>
              ) : (
                <Badge variant="secondary" className="rounded-full bg-rose-400/10 text-rose-400">
                  <TrendingUp className="size-3.5" /> Стало хуже (+{compare.thisWeek - compare.lastWeek} ккал)
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* История целей */}
      <Card className="soft-card">
        <CardHeader className="space-y-0 pb-2">
          <CardTitle className="text-base">История целей</CardTitle>
        </CardHeader>
        <CardContent>
          {goalHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пусто</p>
          ) : (
            <ul className="space-y-2">
              {goalHistory.map((g, idx) => (
                <li key={idx} className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/30 p-3 text-sm">
                  <span>
                    <span className="font-semibold">{g.date}</span>
                    <Badge variant="outline" className="ml-2 rounded-full text-[10px]">
                      {g.goal === "deficit" ? "Дефицит" : g.goal === "maintain" ? "Поддержание" : "Профицит"}
                    </Badge>
                    {g.note && <span className="ml-2 text-muted-foreground">«{g.note}»</span>}
                  </span>
                  <span className="font-feature-num text-xs tabular-nums">{g.kcalTarget} ккал</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Галерея цветочков */}
      <Card className="soft-card">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Flower className="size-5 text-primary" />
            Галерея «Цветочки»
          </CardTitle>
          <Button size="sm" variant="outline" className="rounded-full" onClick={generateFlowersForRange}>
            <Sparkles className="size-4" /> Начислить
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <FlowerBlock type="daisy" count={monthFlowers.filter((f) => f.type === "daisy").length} />
            <FlowerBlock type="rose" count={monthFlowers.filter((f) => f.type === "rose").length} />
            <FlowerBlock type="tulip" count={monthFlowers.filter((f) => f.type === "tulip").length} />
          </div>
          <div className="mt-3 flex justify-center text-3xl">
            {monthFlowers.map((f, idx) => (
              <span key={idx} className="mx-0.5" title={f.reason}>
                {FLOWER_META[f.type].emoji}
              </span>
            ))}
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            В конце месяца собирается букет. Никаких наказаний, только поощрение.
          </p>
        </CardContent>
      </Card>

      {/* Кнопка ИИ-анализа */}
      <Card className="soft-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-base font-semibold">Проанализировать прогресс</div>
            <p className="text-xs text-muted-foreground">
              ИИ свяжет питание, сон, цикл и настроение в заботливый текст
            </p>
          </div>
          <Button
            size="sm"
            className="rounded-xl"
            onClick={analyzeProgress}
            disabled={aiBusy}
          >
            <Sparkles className="size-4" /> {aiBusy ? "Думаю..." : "Анализ"}
          </Button>
        </div>
        {aiText && (
          <div className="mt-3 rounded-2xl border border-primary/30 bg-primary/5 p-3 text-sm italic text-foreground">
            «{aiText}»
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({ label, value, unit, target }: { label: string; value: number; unit: string; target: string }) {
  return (
    <Card className="soft-card p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="font-feature-num text-xl font-bold tabular-nums">
        {value} <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
      <div className="text-[10px] text-muted-foreground">{target}</div>
    </Card>
  );
}

function DayType({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/30 p-3">
      <div className="flex items-center justify-center">
        <span className={`size-2.5 rounded-full ${color}`} />
      </div>
      <div className="mt-1 font-feature-num text-xl font-bold tabular-nums">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function FlowerBlock({ type, count }: { type: keyof typeof FLOWER_META; count: number }) {
  const meta = FLOWER_META[type];
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/30 p-3">
      <div className="text-3xl">{meta.emoji}</div>
      <div className="mt-1 text-xs font-semibold">{meta.name}</div>
      <div className="text-[10px] text-muted-foreground">{meta.desc}</div>
      <div className="mt-1 font-feature-num text-base font-bold tabular-nums">{count}</div>
    </div>
  );
}

// silence unused imports
void id;
void ChevronLeft;
void ChevronRight;
