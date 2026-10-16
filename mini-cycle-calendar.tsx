"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Plus, Flower } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";
import {
  addDays,
  formatHeaderDate,
  monthName,
  ymd,
  ymdToDate,
} from "@/lib/calc";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface MiniCycleCalendarProps {
  /** компактный режим — без навигации по месяцам */
  compact?: boolean;
}

// Возвращает даты менструации (от startDate до endDate, обычно 5 дней)
function menstruationDates(
  cycle: { startDate: string; endDate?: string }[]
): Set<string> {
  const set = new Set<string>();
  for (const c of cycle) {
    const start = ymdToDate(c.startDate);
    const end = c.endDate ? ymdToDate(c.endDate) : addDays(start, 4);
    let cur = start;
    while (cur <= end) {
      set.add(ymd(cur));
      cur = addDays(cur, 1);
    }
  }
  return set;
}

// Прогноз следующих месячных: последний startDate + средний цикл (28 дней)
function predictNext(cycle: { startDate: string; endDate?: string }[]): string | null {
  if (cycle.length === 0) return null;
  const lastStart = [...cycle].sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  const start = ymdToDate(lastStart.startDate);
  const next = addDays(start, 28);
  return ymd(next);
}

// Расчёт фаз цикла и фертильности
function calcCyclePhases(
  cycle: { startDate: string; endDate?: string }[]
): {
  ovulationDate: string | null;
  fertileStart: string | null;
  fertileEnd: string | null;
  nextPeriod: string | null;
} {
  if (cycle.length === 0) {
    return {
      ovulationDate: null,
      fertileStart: null,
      fertileEnd: null,
      nextPeriod: null,
    };
  }
  const lastStart = [...cycle].sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  const start = ymdToDate(lastStart.startDate);
  // Овуляция — на 14-й день после начала цикла (стандартный цикл 28 дней)
  const ovulation = addDays(start, 14);
  // Фертильное окно: 5 дней до овуляции + 1 день после
  const fertileStart = addDays(ovulation, -5);
  const fertileEnd = addDays(ovulation, 1);
  // Следующие месячные: + 28 дней
  const nextPeriod = addDays(start, 28);
  return {
    ovulationDate: ymd(ovulation),
    fertileStart: ymd(fertileStart),
    fertileEnd: ymd(fertileEnd),
    nextPeriod: ymd(nextPeriod),
  };
}

// Возвращает set фертильных дней (включая овуляцию)
function fertileDates(
  cycle: { startDate: string; endDate?: string }[]
): { fertile: Set<string>; ovulation: Set<string> } {
  const phases = calcCyclePhases(cycle);
  const fertile = new Set<string>();
  const ovulation = new Set<string>();
  if (phases.fertileStart && phases.fertileEnd && phases.ovulationDate) {
    const start = ymdToDate(phases.fertileStart);
    const end = ymdToDate(phases.fertileEnd);
    let cur = start;
    while (cur <= end) {
      fertile.add(ymd(cur));
      cur = addDays(cur, 1);
    }
    ovulation.add(phases.ovulationDate);
  }
  return { fertile, ovulation };
}

export function MiniCycleCalendar({ compact }: MiniCycleCalendarProps) {
  const cycle = useAppStore((s) => s.cycle);
  const addCycle = useAppStore((s) => s.addCycle);

  const [cursor, setCursor] = React.useState(new Date());
  const [addOpen, setAddOpen] = React.useState(false);

  const redDays = menstruationDates(cycle);
  const nextPredicted = predictNext(cycle);
  const phases = calcCyclePhases(cycle);
  const { fertile: fertileDays, ovulation: ovulationDays } = fertileDates(cycle);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const firstDay = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const today = new Date();
  const todayStr = ymd(today);

  // фаза цикла на сегодня
  const lastCycle = [...cycle].sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
  const phaseLabel = (() => {
    if (!lastCycle) return "Цикл не задан";
    const start = ymdToDate(lastCycle.startDate);
    const end = lastCycle.endDate ? ymdToDate(lastCycle.endDate) : addDays(start, 4);
    if (today >= start && today <= end) return "Менструация";
    if (today < start) return "Ожидание цикла";
    const ovulation = addDays(start, 14);
    if (today >= addDays(end, 1) && today < ovulation) return "Фолликулярная фаза";
    if (today >= ovulation && today < addDays(ovulation, 2)) return "Овуляция";
    return "Лютеиновая фаза";
  })();

  return (
    <div className="rounded-3xl border border-border/70 bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Flower className="size-4 text-rose-400" />
          <span className="text-sm font-bold">Женский календарь</span>
        </div>
        {!compact && (
          <Button size="sm" variant="outline" className="rounded-full px-2 py-1 text-xs" onClick={() => setAddOpen(true)}>
            <Plus className="size-3" /> Цикл
          </Button>
        )}
      </div>

      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{phaseLabel}</span>
        {nextPredicted && (
          <span className="text-muted-foreground">
            след. ~{nextPredicted.slice(5)}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pb-2">
        {!compact && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 rounded-full"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
        )}
        <div className="text-xs font-semibold">
          {compact ? formatHeaderDate(cursor).dayMonth : `${monthName(cursor)} ${year}`}
        </div>
        {!compact && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 rounded-full"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        )}
      </div>

      {/* Сетка дней недели */}
      <div className="grid grid-cols-7 gap-0.5 text-center text-[9px] font-medium uppercase text-muted-foreground">
        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
          <div key={d} className="py-0.5">{d}</div>
        ))}
      </div>
      <div className="mt-0.5 grid grid-cols-7 gap-0.5">
        {cells.map((d, idx) => {
          if (!d) return <div key={idx} className="aspect-square" />;
          const ds = ymd(d);
          const isMenstr = redDays.has(ds);
          const isToday = ds === todayStr;
          const isPredicted = nextPredicted === ds;
          const isFertile = fertileDays.has(ds) && !isMenstr;
          const isOvulation = ovulationDays.has(ds);
          return (
            <div
              key={ds}
              className={cn(
                "relative grid aspect-square place-items-center rounded-full text-[10px] font-medium transition-colors",
                isMenstr
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
                  : isOvulation
                    ? "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300"
                    : isFertile
                      ? "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                      : isToday
                        ? "ring-1 ring-primary"
                        : "text-foreground/80"
              )}
              title={
                isMenstr ? "Менструация"
                : isOvulation ? "Овуляция (прогноз)"
                : isFertile ? "Фертильный день (высокая вероятность)"
                : isPredicted ? "Прогноз менструации"
                : undefined
              }
            >
              {d.getDate()}
              {isMenstr && (
                <span className="absolute -bottom-0.5 text-[10px]">🌸</span>
              )}
              {isOvulation && (
                <span className="absolute -bottom-0.5 text-[10px]">🥚</span>
              )}
              {isFertile && !isOvulation && (
                <span className="absolute -bottom-0.5 size-1.5 rounded-full bg-amber-500" />
              )}
              {isPredicted && !isMenstr && !isFertile && !isOvulation && (
                <span className="absolute -bottom-0.5 size-1.5 rounded-full bg-rose-400" />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="inline-grid size-3 place-items-center rounded-full bg-rose-100 text-[8px] dark:bg-rose-500/20">🌸</span>
          менструация
        </span>
        {phases.ovulationDate && (
          <span className="inline-flex items-center gap-1">
            <span className="inline-grid size-3 place-items-center rounded-full bg-violet-100 text-[8px] dark:bg-violet-500/20">🥚</span>
            овуляция
          </span>
        )}
        {phases.fertileStart && (
          <span className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-amber-500" />
            фертильные дни
          </span>
        )}
        {nextPredicted && (
          <span className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-rose-400" />
            прогноз месячных
          </span>
        )}
      </div>

      {/* Информация о фазах */}
      {phases.ovulationDate && (
        <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[9px]">
          <div className="rounded-lg bg-rose-50 p-1 dark:bg-rose-500/10">
            <div className="font-semibold text-rose-700 dark:text-rose-300">Месячные</div>
            <div className="text-muted-foreground">~{nextPredicted?.slice(5) ?? "—"}</div>
          </div>
          <div className="rounded-lg bg-violet-50 p-1 dark:bg-violet-500/10">
            <div className="font-semibold text-violet-700 dark:text-violet-300">Овуляция</div>
            <div className="text-muted-foreground">~{phases.ovulationDate.slice(5)}</div>
          </div>
          <div className="rounded-lg bg-amber-50 p-1 dark:bg-amber-500/10">
            <div className="font-semibold text-amber-700 dark:text-amber-300">Фертильное окно</div>
            <div className="text-muted-foreground">
              {phases.fertileStart?.slice(5)}–{phases.fertileEnd?.slice(5)}
            </div>
          </div>
        </div>
      )}

      {addOpen && (
        <CycleAddDialog
          onClose={() => setAddOpen(false)}
          onSave={(c) => {
            addCycle({ ...c, id: Math.random().toString(36).slice(2) });
            setAddOpen(false);
            toast.success("Цикл добавлен в календарик");
          }}
        />
      )}
    </div>
  );
}

function CycleAddDialog({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (c: { startDate: string; endDate?: string }) => void;
}) {
  const today = ymd(new Date());
  const [start, setStart] = React.useState(today);
  const [end, setEnd] = React.useState<string>("");

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle>Добавить цикл</DialogTitle>
          <DialogDescription>
            Укажи дату начала и (опционально) окончания месячных
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            Начало
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="rounded-xl font-feature-num" />
          </label>
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            Конец (опц.)
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="rounded-xl font-feature-num" />
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Отмена</Button>
          <Button
            onClick={() => {
              if (!start) return toast.error("Укажи дату начала");
              onSave({ startDate: start, endDate: end || undefined });
            }}
          >
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
