"use client";

import * as React from "react";
import {
  Calendar as CalIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useAppStore } from "@/store/app-store";
import {
  formatHeaderDate,
  monthName,
  pad2,
  id,
  ymd,
  ymdToDate,
} from "@/lib/calc";
import { CalendarEvent } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type CellColor = "green" | "yellow" | "red" | "gray";

export function CalendarScreen() {
  const profile = useAppStore((s) => s.profile);
  const diary = useAppStore((s) => s.diary);
  const water = useAppStore((s) => s.water);
  const mood = useAppStore((s) => s.mood);
  const weights = useAppStore((s) => s.weights);
  const cycle = useAppStore((s) => s.cycle);
  const events = useAppStore((s) => s.events);
  const ignored = useAppStore((s) => s.ignoredDays);
  const toggleIgnored = useAppStore((s) => s.toggleIgnoredDay);
  const addEvent = useAppStore((s) => s.addEvent);
  const deleteEvent = useAppStore((s) => s.deleteEvent);

  const [cursor, setCursor] = React.useState(new Date());
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);
  const [eventOpen, setEventOpen] = React.useState(false);
  const [longPress, setLongPress] = React.useState<string | null>(null);

  // Цели по калориям
  const target = profile.customTargets?.kcal ?? 2000;
  const greenLow = target * 0.8;
  const greenHigh = target * 0.95;
  const yellowHigh = target * 1.05;

  // построение сетки месяца
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const firstDay = (first.getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const cellColorFor = (dateStr: string): CellColor => {
    const ig = ignored.find((i) => i.date === dateStr);
    if (ig) return "gray";
    const entries = diary.filter((e) => e.date === dateStr);
    if (entries.length === 0) return "gray";
    const kcal = entries.reduce((s, e) => s + e.kcal, 0);
    if (kcal >= greenLow && kcal <= greenHigh) return "green";
    if (kcal >= greenHigh && kcal <= yellowHigh) return "yellow";
    if (kcal > yellowHigh) return "red";
    return "gray";
  };

  const selectedEntries = selectedDate
    ? diary.filter((e) => e.date === selectedDate)
    : [];
  const selectedWater = selectedDate
    ? water.find((w) => w.date === selectedDate)
    : undefined;
  const selectedMood = selectedDate
    ? mood.find((m) => m.date === selectedDate)
    : undefined;
  const selectedWeight = selectedDate
    ? weights.find((w) => w.date === selectedDate)
    : undefined;
  const selectedCycle = selectedDate
    ? cycle.find((c) => c.startDate <= selectedDate && (!c.endDate || c.endDate >= selectedDate))
    : undefined;
  const selectedEvents = selectedDate
    ? events.filter((e) => e.date === selectedDate)
    : [];
  const isIgnored = selectedDate
    ? ignored.some((i) => i.date === selectedDate)
    : false;

  const todayStr = ymd(new Date());

  const colorDot: Record<CellColor, string> = {
    green: "bg-primary",
    yellow: "bg-amber-400",
    red: "bg-rose-400",
    gray: "bg-muted-foreground/30",
  };

  return (
    <div className="mx-auto flex max-w-screen-md flex-col gap-4 px-4 pb-4 pt-2">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Календарь</h1>
          <p className="text-sm text-muted-foreground">Мягкая история дней</p>
        </div>
        <Button size="sm" className="rounded-full" onClick={() => setEventOpen(true)}>
          <Plus className="size-4" /> Событие
        </Button>
      </header>

      {/* Легенда */}
      <Card className="soft-card p-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <LegendDot color="green" label="Дефицит" />
          <LegendDot color="yellow" label="Норма" />
          <LegendDot color="red" label="Профицит" />
          <LegendDot color="gray" label="Нет данных" />
        </div>
      </Card>

      <Card className="soft-card p-3">
        <div className="flex items-center justify-between pb-3">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setCursor(new Date(year, month - 1, 1))}>
            <ChevronLeft className="size-5" />
          </Button>
          <div className="font-bold">
            {monthName(cursor)} {year}
          </div>
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setCursor(new Date(year, month + 1, 1))}>
            <ChevronRight className="size-5" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((d, idx) => {
            if (!d) return <div key={idx} className="aspect-square" />;
            const ds = ymd(d);
            const color = cellColorFor(ds);
            const isToday = ds === todayStr;
            const isSelected = ds === selectedDate;
            const isIgnoredDay = ignored.some((i) => i.date === ds);
            return (
              <button
                key={ds}
                onClick={() => setSelectedDate(ds)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setLongPress(ds);
                }}
                className={cn(
                  "relative aspect-square rounded-2xl border text-xs transition-all",
                  isSelected
                    ? "border-primary bg-primary/10"
                    : isToday
                      ? "border-primary/50"
                      : "border-border/70 hover:bg-muted/60"
                )}
                title={isIgnoredDay ? "День игнорируется в статистике" : undefined}
              >
                <span className="absolute left-1 top-1 font-feature-num text-[11px] tabular-nums">
                  {d.getDate()}
                </span>
                <span
                  className={cn(
                    "absolute bottom-1.5 right-1.5 size-2 rounded-full",
                    colorDot[color]
                  )}
                />
                {isIgnoredDay && (
                  <EyeOff className="absolute bottom-1 left-1 size-3 text-muted-foreground" />
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Шторка сводки */}
      <Sheet open={!!selectedDate} onOpenChange={(v) => !v && setSelectedDate(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>
              {selectedDate && formatHeaderDate(ymdToDate(selectedDate)).full}
            </SheetTitle>
            <SheetDescription>
              {selectedEntries.length === 0
                ? "В этот день нет записей."
                : `${selectedEntries.length} блюд`}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 grid gap-3">
            <Summary label="Калории за день" value={
              selectedEntries.reduce((s, e) => s + e.kcal, 0) + " ккал"
            } />
            <div className="grid grid-cols-3 gap-2">
              <Summary label="Белки" value={
                selectedEntries.reduce((s, e) => s + e.protein, 0).toFixed(1) + " г"
              } />
              <Summary label="Жиры" value={
                selectedEntries.reduce((s, e) => s + e.fat, 0).toFixed(1) + " г"
              } />
              <Summary label="Углеводы" value={
                selectedEntries.reduce((s, e) => s + e.carbs, 0).toFixed(1) + " г"
              } />
            </div>
            {selectedWater && (
              <Summary label="Вода" value={selectedWater.glasses * 250 + " мл"} />
            )}
            {selectedMood && (
              <Summary label="Настроение" value={MOOD_EMOJI[selectedMood.mood]} />
            )}
            {selectedWeight && (
              <Summary label="Вес" value={selectedWeight.weight + " кг"} />
            )}
            {selectedCycle && (
              <Summary label="Фаза цикла" value="Менструация" />
            )}
            {selectedEvents.length > 0 && (
              <div className="rounded-2xl border border-border/70 bg-muted/40 p-3">
                <div className="mb-2 text-xs font-semibold text-muted-foreground">События</div>
                <ul className="space-y-1">
                  {selectedEvents.map((e) => (
                    <li key={e.id} className="flex items-center justify-between text-sm">
                      <span>{e.title}</span>
                      <Button variant="ghost" size="icon" className="rounded-full text-destructive" onClick={() => deleteEvent(e.id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => {
                  if (selectedDate) toggleIgnored(selectedDate);
                  toast.success(isIgnored ? "День снова учитывается" : "День не учитывается в статистике");
                }}
              >
                {isIgnored ? (
                  <>
                    <Eye className="size-4" /> Учитывать
                  </>
                ) : (
                  <>
                    <EyeOff className="size-4" /> Не учитывать
                  </>
                )}
              </Button>
            </div>
            <ul className="grid gap-1">
              {selectedEntries.map((e) => (
                <li key={e.id} className="rounded-xl bg-muted/30 px-2 py-1 text-xs">
                  <span className="font-semibold">{e.name}</span> · {e.amount} г · {e.kcal} ккал
                </li>
              ))}
            </ul>
          </div>
        </SheetContent>
      </Sheet>

      {/* События этого месяца */}
      <Card className="soft-card">
        <CardHeader className="space-y-0 pb-2">
          <CardTitle className="text-base">События месяца</CardTitle>
        </CardHeader>
        <CardContent>
          {events.filter((e) => e.date.startsWith(`${year}-${pad2(month + 1)}`)).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Список пуст. Можно добавить «Записаться к стоматологу», «День рождения» и т. п.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {events
                .filter((e) => e.date.startsWith(`${year}-${pad2(month + 1)}`))
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/30 p-3 text-sm"
                  >
                    <div>
                      <div className="font-semibold">{e.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {e.date} · {EVENT_TYPE_LABEL[e.type]}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-full text-destructive" onClick={() => deleteEvent(e.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {eventOpen && (
        <EventDialog
          date={selectedDate ?? todayStr}
          onClose={() => setEventOpen(false)}
          onSave={(e) => {
            addEvent({ ...e, id: id() });
            setEventOpen(false);
            toast.success("Событие добавлено");
          }}
        />
      )}

      {longPress && (
        <Dialog open onOpenChange={(v) => !v && setLongPress(null)}>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle>День {longPress}</DialogTitle>
              <DialogDescription>
                Долгое нажатие позволяет отметить этот день как «Не учитывать в статистике».
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setLongPress(null)}>
                <X className="size-4" /> Закрыть
              </Button>
              <Button
                onClick={() => {
                  toggleIgnored(longPress);
                  setLongPress(null);
                  toast.success("Статус изменён");
                }}
              >
                <EyeOff className="size-4" />
                {ignored.some((i) => i.date === longPress) ? "Снова учитывать" : "Не учитывать"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

const MOOD_EMOJI: Record<string, string> = {
  great: "😄",
  good: "🙂",
  ok: "😐",
  down: "😕",
  bad: "😣",
};

const EVENT_TYPE_LABEL: Record<CalendarEvent["type"], string> = {
  doctor: "Врач",
  personal: "Личное",
  birthday: "День рождения",
  other: "Другое",
};

function LegendDot({ color, label }: { color: CellColor; label: string }) {
  const map: Record<CellColor, string> = {
    green: "bg-primary",
    yellow: "bg-amber-400",
    red: "bg-rose-400",
    gray: "bg-muted-foreground/30",
  };
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("size-2.5 rounded-full", map[color])} />
      {label}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/30 p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="font-feature-num text-base font-bold tabular-nums">{value}</div>
    </div>
  );
}

function EventDialog({
  date,
  onClose,
  onSave,
}: {
  date: string;
  onClose: () => void;
  onSave: (e: Omit<CalendarEvent, "id">) => void;
}) {
  const [title, setTitle] = React.useState("");
  const [date2, setDate2] = React.useState(date);
  const [type, setType] = React.useState<CalendarEvent["type"]>("personal");
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle>Добавить событие</DialogTitle>
          <DialogDescription>Врач, личное, день рождения</DialogDescription>
        </DialogHeader>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Записаться к стоматологу" className="rounded-xl" />
        <Input value={date2} onChange={(e) => setDate2(e.target.value)} className="rounded-xl font-feature-num" />
        <div className="flex flex-wrap gap-1.5">
          {(["doctor", "personal", "birthday", "other"] as const).map((t) => (
            <Badge
              key={t}
              variant={type === t ? "default" : "outline"}
              className="cursor-pointer rounded-full"
              onClick={() => setType(t)}
            >
              {EVENT_TYPE_LABEL[t]}
            </Badge>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={() => { if (!title.trim()) { toast.error("Введите название"); return; } onSave({ title: title.trim(), date: date2, type }); }}>
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

void CalIcon;
