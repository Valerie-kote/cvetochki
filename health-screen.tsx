"use client";

import * as React from "react";
import {
  Weight,
  Ruler,
  Activity,
  Droplets,
  Smile,
  Pill,
  HeartPulse,
  Moon,
  Footprints,
  Dumbbell,
  Thermometer,
  Plus,
  Trash2,
  Camera,
  Sparkles,
  Calendar,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAppStore } from "@/store/app-store";
import { calcBMI, id, MICRO_NORMS, round1, sumMicro, ymd } from "@/lib/calc";
import { PILLS_DIRECTORY } from "@/lib/sample-data";
import { recognizePill } from "@/lib/ai-client";
import { MiniCycleCalendar } from "@/components/shared/mini-cycle-calendar";
import {
  ActivityEntry,
  MoodEntry,
  PillEntry,
  PressureEntry,
} from "@/lib/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MOOD_OPTIONS: { value: MoodEntry["mood"]; emoji: string; label: string }[] = [
  { value: "great", emoji: "🤩", label: "Восторг" },
  { value: "good", emoji: "😄", label: "Отлично" },
  { value: "happy", emoji: "🙂", label: "Хорошо" },
  { value: "calm", emoji: "😌", label: "Спокойно" },
  { value: "energetic", emoji: "⚡", label: "Энергично" },
  { value: "ok", emoji: "😐", label: "Норма" },
  { value: "anxious", emoji: "😟", label: "Тревожно" },
  { value: "irritable", emoji: "😤", label: "Раздраж." },
  { value: "down", emoji: "😕", label: "Грустно" },
  { value: "bad", emoji: "😣", label: "Плохо" },
];

const WELLBEING_SYMPTOMS_POS = [
  "Прилив сил",
  "Ясность ума",
  "Бодрость",
  "Хорошее настроение",
  "Лёгкость в теле",
  "Творческий подъём",
  "Уверенность",
  "Живой интерес к жизни",
];
const WELLBEING_SYMPTOMS_NEU = [
  "Изменение аппетита",
  "Чувствительность к запахам",
  "Лёгкая отёчность",
  "Изменение стула",
  "Потливость",
  "Сонливость днём",
];
const WELLBEING_SYMPTOMS_NEG = [
  "Головная боль",
  "Вздутие живота",
  "Усталость",
  "Бессонница",
  "Тошнота",
  "Слабость",
  "Раздражительность",
  "Плаксивость",
  "Боль в спине",
  "Боль в груди",
  "Тяга к сладкому",
  "Судороги в ногах",
];

// Цикл-симптомы по фазам
const CYCLE_SYMPTOMS_BEFORE = [
  // Положительные
  "Творческий подъём",
  "Интуиция обострена",
  // Нейтральные
  "Изменение аппетита",
  "Чувствительность к запахам",
  "Лёгкая отёчность",
  // Негативные
  "Тяга к сладкому",
  "Отечность",
  "Боль внизу живота",
  "Грудь набухла и болезненна",
  "Настроение скачет",
  "Сонливость",
  "Головная боль",
  "Раздражительность",
  "Плаксивость",
];
const CYCLE_SYMPTOMS_DURING = [
  // Положительные
  "Лёгкость в теле (после 2-го дня)",
  "Смягчение симптомов ПМС",
  // Нейтральные
  "Снижение аппетита",
  "Усталость к вечеру",
  // Негативные
  "Боль внизу живота",
  "Тянущая боль в пояснице",
  "Головная боль",
  "Тошнота",
  "Слабость",
  "Диарея",
  "Судороги в ногах",
  "Холод в конечностях",
  "Сильная утомляемость",
];
const CYCLE_SYMPTOMS_AFTER = [
  // Положительные
  "Прилив энергии",
  "Ясность ума",
  "Бодрость",
  "Хорошее настроение",
  "Повышенное либидо",
  "Уверенность",
  "Готовность к спорту",
  // Нейтральные
  "Стабильный аппетит",
  "Хорошая концентрация",
  // Негативные
  "Лёгкая усталость",
  "Головокружение (при низком давлении)",
];

// Совместимость со старым API (для компонентов, которые используют просто массив)
const WELLBEING_SYMPTOMS = [
  ...WELLBEING_SYMPTOMS_POS,
  ...WELLBEING_SYMPTOMS_NEU,
  ...WELLBEING_SYMPTOMS_NEG,
];

const CYCLE_SYMPTOMS = [
  ...CYCLE_SYMPTOMS_BEFORE,
  ...CYCLE_SYMPTOMS_DURING,
  ...CYCLE_SYMPTOMS_AFTER,
];

const PILL_DIRECTORY = PILLS_DIRECTORY;

export function HealthScreen() {
  const profile = useAppStore((s) => s.profile);
  const weights = useAppStore((s) => s.weights);
  const cycle = useAppStore((s) => s.cycle);
  const water = useAppStore((s) => s.water);
  const mood = useAppStore((s) => s.mood);
  const pills = useAppStore((s) => s.pills);
  const activity = useAppStore((s) => s.activity);
  const pressure = useAppStore((s) => s.pressure);

  const addWeight = useAppStore((s) => s.addWeight);
  const addWater = useAppStore((s) => s.addWater);
  const setMood = useAppStore((s) => s.setMood);
  const addPill = useAppStore((s) => s.addPill);
  const togglePill = useAppStore((s) => s.togglePill);
  const deletePill = useAppStore((s) => s.deletePill);
  const addActivity = useAppStore((s) => s.addActivity);
  const deleteActivity = useAppStore((s) => s.deleteActivity);
  const addPressure = useAppStore((s) => s.addPressure);
  const deletePressure = useAppStore((s) => s.deletePressure);
  const addCycle = useAppStore((s) => s.addCycle);

  const today = ymd(new Date());
  const waterToday = water.find((w) => w.date === today)?.glasses ?? 0;
  const todayMood = mood.find((m) => m.date === today);
  const todayPills = pills.filter((p) => p.date === today);
  const todayActivity = activity.filter((a) => a.date === today);

  const bmi = calcBMI(profile.currentWeight, profile.height);

  const weightChart = [...weights]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)
    .map((w) => ({
      date: w.date.slice(5),
      weight: w.weight,
      waist: w.waist,
      hips: w.hips,
    }));

  const [weightOpen, setWeightOpen] = React.useState(false);
  const [pillOpen, setPillOpen] = React.useState(false);
  const [actOpen, setActOpen] = React.useState(false);
  const [pressOpen, setPressOpen] = React.useState(false);
  const [cycleOpen, setCycleOpen] = React.useState(false);

  return (
    <div className="mx-auto flex max-w-screen-md flex-col gap-4 px-4 pb-4 pt-2">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Здоровье</h1>
          <p className="text-sm text-muted-foreground">
            Мягкая забота о теле и цикле
          </p>
        </div>
      </header>

      {/* Вес и обмеры */}
      <Card className="soft-card">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Weight className="size-5 text-primary" />
            Вес и обмеры
          </CardTitle>
          <Button size="sm" className="rounded-full" onClick={() => setWeightOpen(true)}>
            <Plus className="size-4" /> Сегодня
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Текущий" value={profile.currentWeight.toFixed(2)} unit="кг" />
            <Stat label="Цель" value={profile.targetWeight.toFixed(2)} unit="кг" />
            <Stat label="Разница" value={round1(profile.currentWeight - profile.targetWeight).toFixed(2)} unit="кг" />
          </div>
          {weightChart.length > 1 && (
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightChart} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
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
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "var(--primary)" }}
                    name="Вес, кг"
                  />
                  <Line
                    type="monotone"
                    dataKey="waist"
                    stroke="#c79a5e"
                    strokeWidth={2}
                    dot={false}
                    name="Талия, см"
                  />
                  <Line
                    type="monotone"
                    dataKey="hips"
                    stroke="#a76f8b"
                    strokeWidth={2}
                    dot={false}
                    name="Бёдра, см"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {weights.length > 0 && (
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
              <MiniMeasure label="Шея" value={weights[weights.length - 1].neck} unit="см" />
              <MiniMeasure label="Грудь" value={weights[weights.length - 1].chest} unit="см" />
              <MiniMeasure label="Под грудью" value={weights[weights.length - 1].chestUnder} unit="см" />
              <MiniMeasure label="Талия" value={weights[weights.length - 1].waist} unit="см" />
              <MiniMeasure label="Живот" value={weights[weights.length - 1].belly} unit="см" />
              <MiniMeasure label="Бёдра" value={weights[weights.length - 1].hips} unit="см" />
              <MiniMeasure label="Ляшка" value={weights[weights.length - 1].thigh} unit="см" />
              <MiniMeasure label="Голень" value={weights[weights.length - 1].calf} unit="см" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ИМТ */}
      <Card className="soft-card">
        <CardHeader className="space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Ruler className="size-5 text-primary" />
            Индекс массы тела
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="font-feature-num text-4xl font-extrabold tabular-nums">
              {bmi.value}
            </div>
            <Badge
              variant="secondary"
              className="rounded-full px-3 py-1 text-sm font-semibold"
            >
              {bmi.label}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Норма для вашего роста: {bmi.idealMin}–{bmi.idealMax} кг
          </p>
          <p className="text-sm text-primary">
            {bmi.toIdealKg > 0
              ? `До идеального веса осталось ${bmi.toIdealKg} кг`
              : "Вы в пределах нормы, молодец!"}
          </p>
        </CardContent>
      </Card>

      {/* Вода */}
      <Card className="soft-card">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Droplets className="size-5 text-primary" />
            Вода
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            сброс в 00:00 автоматически
          </span>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-feature-num text-2xl font-bold tabular-nums">
                {waterToday * 250} мл
              </div>
              <div className="text-xs text-muted-foreground">
                цель: {profile.waterGoal} мл
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {Array.from({ length: Math.max(waterToday, 0) }).map((_, i) => (
                <Droplets key={i} className="size-7 text-primary" fill="currentColor" />
              ))}
              {waterToday === 0 && (
                <span className="text-sm text-muted-foreground">Пора выпить стакан воды</span>
              )}
            </div>
            <Button
              size="sm"
              className="rounded-full"
              onClick={() => addWater(today, 1)}
            >
              <Plus className="size-4" /> +250 мл
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Женский календарь — мини-календарик с красными цветочками */}
      <MiniCycleCalendar />

      {/* Симптомы цикла */}
      <Card className="soft-card">
        <CardHeader className="space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="size-5 text-primary" />
            Симптомы перед/во время цикла
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CycleSymptomPicker date={today} symptoms={[]} />
        </CardContent>
      </Card>

      {/* Настроение + самочувствие */}
      <Card className="soft-card">
        <CardHeader className="space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Smile className="size-5 text-primary" />
            Настроение и самочувствие
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {MOOD_OPTIONS.map((m) => {
              const sel = todayMood?.mood === m.value;
              return (
                <button
                  key={m.value}
                  onClick={() => {
                    setMood({
                      date: today,
                      mood: m.value,
                      symptoms: todayMood?.symptoms ?? [],
                    });
                    toast.success(`Настроение: ${m.label}`);
                  }}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all ${
                    sel
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted/60"
                  }`}
                >
                  <span className="text-xl">{m.emoji}</span>
                  <span className="text-xs">{m.label}</span>
                </button>
              );
            })}
          </div>
          <WellbeingPicker date={today} symptoms={[]} initial={todayMood?.symptoms ?? []} />
        </CardContent>
      </Card>

      {/* Таблетки и витамины */}
      <Card className="soft-card">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Pill className="size-5 text-primary" />
            Таблетки и витамины
          </CardTitle>
          <Button size="sm" className="rounded-full" onClick={() => setPillOpen(true)}>
            <Plus className="size-4" /> Добавить
          </Button>
        </CardHeader>
        <CardContent>
          {todayPills.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Журнал пуст. Принятые витамины автоматически учитываются в балансе микроэлементов за день.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {todayPills.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-2xl border border-border/70 bg-muted/30 p-3"
                >
                  <div className="flex items-center gap-2">
                    <Switch checked={p.taken} onCheckedChange={() => togglePill(p.id)} />
                    <div>
                      <div className="text-sm font-semibold">{p.name}</div>
                      {p.dose && (
                        <div className="text-xs text-muted-foreground">{p.dose}</div>
                      )}
                      {p.micro && (
                        <div className="text-[10px] text-muted-foreground">
                          {Object.entries(p.micro).map(([k, v]) => `${MICRO_NORMS[k as keyof typeof MICRO_NORMS].name} +${round1(v as number)}`).join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full text-destructive"
                    onClick={() => deletePill(p.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Активность */}
      <Card className="soft-card">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="size-5 text-primary" />
            Активность и сон
          </CardTitle>
          <Button size="sm" className="rounded-full" onClick={() => setActOpen(true)}>
            <Plus className="size-4" /> Добавить
          </Button>
        </CardHeader>
        <CardContent>
          {todayActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Запишите тренировку, шаги или сон. Калории можно прибавить к рациону (по умолчанию выключено).
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {todayActivity.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-2 rounded-2xl border border-border/70 bg-muted/30 p-3"
                >
                  <div className="flex items-center gap-2">
                    {a.type === "workout" ? <Dumbbell className="size-4 text-primary" /> : a.type === "steps" ? <Footprints className="size-4 text-primary" /> : <Moon className="size-4 text-primary" />}
                    <div>
                      <div className="text-sm font-semibold">
                        {a.type === "workout" ? a.name : a.type === "steps" ? `Шаги: ${a.steps}` : `Сон: ${a.hours} ч`}
                      </div>
                      {a.type === "workout" && (
                        <div className="text-xs text-muted-foreground">
                          {a.sets}×{a.reps} · {a.weight ?? 0} кг · −{a.burnedKcal ?? 0} ккал
                        </div>
                      )}
                      {a.addToRation && (
                        <Badge variant="secondary" className="text-[10px]">
                          в рацион
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full text-destructive"
                    onClick={() => deleteActivity(a.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Давление */}
      <Card className="soft-card">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <HeartPulse className="size-5 text-primary" />
            Давление и пульс
          </CardTitle>
          <Button size="sm" className="rounded-full" onClick={() => setPressOpen(true)}>
            <Plus className="size-4" /> Замер
          </Button>
        </CardHeader>
        <CardContent>
          {pressure.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Простая запись для редких замеров или визитов к врачу.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {pressure.slice(0, 5).map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-2xl border border-border/70 bg-muted/30 p-3"
                >
                  <div className="flex items-center gap-2">
                    <Thermometer className="size-4 text-primary" />
                    <div>
                      <div className="font-feature-num text-sm font-bold tabular-nums">
                        {p.systolic}/{p.diastolic}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        пульс {p.pulse} · {p.date.slice(5)}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full text-destructive"
                    onClick={() => deletePressure(p.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Диалоги */}
      {weightOpen && (
        <WeightDialog
          onClose={() => setWeightOpen(false)}
          onSave={(w) => {
            addWeight(w);
            setWeightOpen(false);
            toast.success("Сохранено");
          }}
        />
      )}
      {pillOpen && (
        <PillDialog
          onClose={() => setPillOpen(false)}
          onSave={(p) => {
            addPill({ ...p, id: id(), date: today, taken: true });
            setPillOpen(false);
            toast.success("Добавлено");
          }}
        />
      )}
      {actOpen && (
        <ActivityDialog
          onClose={() => setActOpen(false)}
          onSave={(a) => {
            addActivity({ ...a, id: id(), date: today });
            setActOpen(false);
            toast.success("Сохранено");
          }}
        />
      )}
      {pressOpen && (
        <PressureDialog
          onClose={() => setPressOpen(false)}
          onSave={(p) => {
            addPressure({ ...p, id: id() });
            setPressOpen(false);
            toast.success("Сохранено");
          }}
        />
      )}
      {cycleOpen && (
        <CycleDialog
          onClose={() => setCycleOpen(false)}
          onSave={(c) => {
            addCycle({ ...c, id: id() });
            setCycleOpen(false);
            toast.success("Цикл добавлен");
          }}
        />
      )}
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/30 p-3 text-center">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="font-feature-num text-lg font-bold tabular-nums">
        {value} <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

function MiniMeasure({ label, value, unit }: { label: string; value?: number; unit: string }) {
  return (
    <div className="rounded-xl bg-muted/40 px-2 py-1">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="font-feature-num text-xs font-semibold tabular-nums">
        {value != null ? value.toFixed(2) : "—"} {value != null ? unit : ""}
      </div>
    </div>
  );
}

function CycleSymptomPicker({ date }: { date: string; symptoms: string[] }) {
  const cycle = useAppStore((s) => s.cycle);
  const updateCycle = useAppStore((s) => s.updateCycle);
  const last = cycle[0];

  if (!last) return null;

  const current = last.symptoms ?? [];
  const toggle = (sym: string) => {
    const next = current.includes(sym) ? current.filter((x) => x !== sym) : [...current, sym];
    updateCycle(last.id, { symptoms: next });
  };
  void date;

  // Определяем, в какой фазе мы находимся относительно последнего цикла
  const start = new Date(last.startDate);
  const today = new Date();
  const daysSince = Math.floor((today.getTime() - start.getTime()) / 86400000);
  const cycleLength = 28;
  const phase: "during" | "after" | "before" =
    daysSince <= 5 ? "during"
    : daysSince <= 14 ? "after"
    : "before";

  const PHASE_LABEL: Record<typeof phase, string> = {
    during: "Во время (дни 1–5)",
    after: "После (дни 6–14, фолликулярная фаза)",
    before: "Перед (дни 15–28, лютеиновая фаза)",
  };

  const PHASE_SYMPTOMS: Record<typeof phase, { title: string; symptoms: string[] }> = {
    during: { title: "🌧 Во время менструации", symptoms: CYCLE_SYMPTOMS_DURING },
    after: { title: "🌿 После (фолликулярная)", symptoms: CYCLE_SYMPTOMS_AFTER },
    before: { title: "🍂 Перед (лютеиновая / ПМС)", symptoms: CYCLE_SYMPTOMS_BEFORE },
  };

  const phaseMeta = PHASE_SYMPTOMS[phase];

  return (
    <div>
      <div className="mb-2 rounded-xl bg-primary/10 px-2 py-1 text-xs text-primary">
        Текущая фаза: {PHASE_LABEL[phase]}
      </div>
      <div className="space-y-3">
        <div>
          <div className="text-xs font-semibold">{phaseMeta.title}</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {phaseMeta.symptoms.map((s) => (
              <button
                key={s}
                onClick={() => toggle(s)}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  current.includes(s)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background hover:bg-muted"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function WellbeingPicker({ date, initial }: { date: string; symptoms: string[]; initial: string[] }) {
  const mood = useAppStore((s) => s.mood);
  const setMood = useAppStore((s) => s.setMood);
  const todayEntry = mood.find((m) => m.date === date);
  const [selected, setSelected] = React.useState<string[]>(initial);

  // синхронизация с внешним состоянием
  React.useEffect(() => {
    setSelected(todayEntry?.symptoms ?? []);
  }, [todayEntry?.symptoms, date]);

  const toggle = (sym: string) => {
    const next = selected.includes(sym)
      ? selected.filter((x) => x !== sym)
      : [...selected, sym];
    setSelected(next);
    setMood({
      date,
      mood: (todayEntry?.mood ?? "ok") as any,
      symptoms: next,
    });
  };

  const chipCls = (active: boolean, tone: "pos" | "neu" | "neg") => {
    const activeCls =
      tone === "pos"
        ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        : tone === "neg"
          ? "border-rose-400 bg-rose-400/10 text-rose-600 dark:text-rose-300"
          : "border-primary bg-primary/10 text-primary";
    return active ? activeCls : "border-border bg-background hover:bg-muted";
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="text-[10px] font-semibold text-emerald-500">✨ Положительные</div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {WELLBEING_SYMPTOMS_POS.map((s) => (
            <button
              key={s}
              onClick={() => toggle(s)}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${chipCls(selected.includes(s), "pos")}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-[10px] font-semibold text-muted-foreground">😐 Нейтральные</div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {WELLBEING_SYMPTOMS_NEU.map((s) => (
            <button
              key={s}
              onClick={() => toggle(s)}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${chipCls(selected.includes(s), "neu")}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-[10px] font-semibold text-rose-500">🌧 Негативные</div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {WELLBEING_SYMPTOMS_NEG.map((s) => (
            <button
              key={s}
              onClick={() => toggle(s)}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${chipCls(selected.includes(s), "neg")}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== Диалоги =====

function WeightDialog({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (w: import("@/lib/types").WeightEntry) => void;
}) {
  const today = ymd(new Date());
  const profile = useAppStore((s) => s.profile);
  const [weight, setWeight] = React.useState<number>(profile.currentWeight || 0);
  const [neck, setNeck] = React.useState<number | undefined>(undefined);
  const [chest, setChest] = React.useState<number | undefined>(undefined);
  const [chestUnder, setChestUnder] = React.useState<number | undefined>(undefined);
  const [waist, setWaist] = React.useState<number | undefined>(undefined);
  const [belly, setBelly] = React.useState<number | undefined>(undefined);
  const [hips, setHips] = React.useState<number | undefined>(undefined);
  const [thigh, setThigh] = React.useState<number | undefined>(undefined);
  const [calf, setCalf] = React.useState<number | undefined>(undefined);

  // парсит число в формате 00.00
  const parseDec = (s: string): number | undefined => {
    if (!s.trim()) return undefined;
    const v = parseFloat(s.replace(",", "."));
    if (isNaN(v)) return undefined;
    return Math.round(v * 100) / 100;
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle>Замер за сегодня</DialogTitle>
          <DialogDescription>
            {today} · вес и обмеры — 2 цифры после запятой
          </DialogDescription>
        </DialogHeader>
        <Field label="Вес, кг">
          <Input
            type="number"
            step="0.01"
            value={weight || ""}
            onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
            className="font-feature-num rounded-xl text-lg tabular-nums"
            placeholder="0,00"
            autoFocus
          />
        </Field>
        <div className="mt-2 text-xs font-semibold text-muted-foreground">
          Обмеры (необязательно)
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Шея, см">
            <Input type="number" step="0.01" value={neck ?? ""} onChange={(e) => setNeck(parseDec(e.target.value))} className="font-feature-num rounded-xl tabular-nums" placeholder="0,00" />
          </Field>
          <Field label="Грудь, см">
            <Input type="number" step="0.01" value={chest ?? ""} onChange={(e) => setChest(parseDec(e.target.value))} className="font-feature-num rounded-xl tabular-nums" placeholder="0,00" />
          </Field>
          <Field label="Под грудью, см">
            <Input type="number" step="0.01" value={chestUnder ?? ""} onChange={(e) => setChestUnder(parseDec(e.target.value))} className="font-feature-num rounded-xl tabular-nums" placeholder="0,00" />
          </Field>
          <Field label="Талия, см">
            <Input type="number" step="0.01" value={waist ?? ""} onChange={(e) => setWaist(parseDec(e.target.value))} className="font-feature-num rounded-xl tabular-nums" placeholder="0,00" />
          </Field>
          <Field label="Живот, см">
            <Input type="number" step="0.01" value={belly ?? ""} onChange={(e) => setBelly(parseDec(e.target.value))} className="font-feature-num rounded-xl tabular-nums" placeholder="0,00" />
          </Field>
          <Field label="Бёдра, см">
            <Input type="number" step="0.01" value={hips ?? ""} onChange={(e) => setHips(parseDec(e.target.value))} className="font-feature-num rounded-xl tabular-nums" placeholder="0,00" />
          </Field>
          <Field label="Ляшка, см">
            <Input type="number" step="0.01" value={thigh ?? ""} onChange={(e) => setThigh(parseDec(e.target.value))} className="font-feature-num rounded-xl tabular-nums" placeholder="0,00" />
          </Field>
          <Field label="Голень, см">
            <Input type="number" step="0.01" value={calf ?? ""} onChange={(e) => setCalf(parseDec(e.target.value))} className="font-feature-num rounded-xl tabular-nums" placeholder="0,00" />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button
            onClick={() => {
              if (!weight || weight <= 0) {
                toast.error("Введите вес");
                return;
              }
              onSave({
                date: today,
                weight: Math.round(weight * 100) / 100,
                neck,
                chest,
                chestUnder,
                waist,
                belly,
                hips,
                thigh,
                calf,
              });
            }}
          >
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PillDialog({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (p: Omit<PillEntry, "id" | "date" | "taken">) => void;
}) {
  const [name, setName] = React.useState("");
  const [dose, setDose] = React.useState("");
  const [source, setSource] = React.useState<PillEntry["source"]>("manual");
  const [aiText, setAiText] = React.useState("");

  const handlePreset = (preset: typeof PILL_DIRECTORY[number]) => {
    setName(preset.name);
    onSave({
      name: preset.name,
      dose: dose || undefined,
      micro: preset.micro,
      source: "directory",
    });
  };

  const [aiBusy, setAiBusy] = React.useState(false);

  const handleAi = async () => {
    const text = aiText.trim();
    if (!text) return;
    setAiBusy(true);
    try {
      const pill = await recognizePill(text);
      onSave({
        name: pill.name || text,
        dose: dose || pill.dose || undefined,
        micro: pill.micro ?? {},
        source: "ai",
      });
      toast.success("ИИ распознал состав витаминов");
    } catch (e: any) {
      toast.error("ИИ недоступен: " + (e?.message ?? ""));
      onSave({ name: text, dose: dose || undefined, micro: {}, source: "manual" });
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle>Добавить витамин/препарат</DialogTitle>
          <DialogDescription>
            Справочник, ИИ-распознавание или съёмка упаковки
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {PILL_DIRECTORY.map((p) => (
              <Button
                key={p.name}
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => handlePreset(p)}
              >
                {p.name}
              </Button>
            ))}
          </div>
          <Field label="Название">
            <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" placeholder="Витамин D3 2000 МЕ" />
          </Field>
          <Field label="Доза (опционально)">
            <Input value={dose} onChange={(e) => setDose(e.target.value)} className="rounded-xl" placeholder="1 капсула" />
          </Field>
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-3">
            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="size-4 text-primary" />
              ИИ-распознавание состава по названию или фотографии упаковки
            </Label>
            <Input
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              placeholder="Введите название или вставьте текст с упаковки"
              className="mt-2 rounded-xl"
            />
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => toast.info("Имитация съёмки этикетки. Используйте ввод названия.")}>
                <Camera className="size-4" /> Снять упаковку
              </Button>
              <Button size="sm" className="rounded-xl" onClick={handleAi} disabled={!aiText.trim() || aiBusy}>
                <Sparkles className={cn("size-4", aiBusy && "animate-pulse")} />
                {aiBusy ? "Думаю..." : "Распознать"}
              </Button>
            </div>
          </div>
          <Select value={source} onValueChange={(v) => setSource(v as PillEntry["source"])}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Источник" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Вручную</SelectItem>
              <SelectItem value="directory">Справочник</SelectItem>
              <SelectItem value="ai">ИИ</SelectItem>
              <SelectItem value="photo">Фото упаковки</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button
            onClick={() => {
              if (!name.trim()) {
                toast.error("Введите название");
                return;
              }
              onSave({ name: name.trim(), dose: dose || undefined, source });
            }}
          >
            Принято сегодня
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ActivityDialog({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (a: Omit<ActivityEntry, "id" | "date">) => void;
}) {
  const [type, setType] = React.useState<ActivityEntry["type"]>("workout");
  const [name, setName] = React.useState("");
  const [sets, setSets] = React.useState(3);
  const [reps, setReps] = React.useState(10);
  const [weight, setWeight] = React.useState(0);
  const [steps, setSteps] = React.useState(5000);
  const [hours, setHours] = React.useState(7);
  const [burned, setBurned] = React.useState(0);
  const [addToRation, setAddToRation] = React.useState(false);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle>Записать активность</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button variant={type === "workout" ? "default" : "outline"} size="sm" className="rounded-xl" onClick={() => setType("workout")}>
              <Dumbbell className="size-4" /> Тренировка
            </Button>
            <Button variant={type === "steps" ? "default" : "outline"} size="sm" className="rounded-xl" onClick={() => setType("steps")}>
              <Footprints className="size-4" /> Шаги
            </Button>
            <Button variant={type === "sleep" ? "default" : "outline"} size="sm" className="rounded-xl" onClick={() => setType("sleep")}>
              <Moon className="size-4" /> Сон
            </Button>
          </div>
          {type === "workout" && (
            <div className="grid grid-cols-2 gap-2">
              <Field label="Упражнение">
                <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" placeholder="Приседания" />
              </Field>
              <Field label="Подходы">
                <Input type="number" value={sets} onChange={(e) => setSets(+e.target.value)} className="rounded-xl" />
              </Field>
              <Field label="Повторения">
                <Input type="number" value={reps} onChange={(e) => setReps(+e.target.value)} className="rounded-xl" />
              </Field>
              <Field label="Вес, кг">
                <Input type="number" value={weight} onChange={(e) => setWeight(+e.target.value)} className="rounded-xl" />
              </Field>
            </div>
          )}
          {type === "steps" && (
            <Field label="Шаги">
              <Input type="number" value={steps} onChange={(e) => setSteps(+e.target.value)} className="rounded-xl" />
            </Field>
          )}
          {type === "sleep" && (
            <Field label="Часов сна">
              <Input type="number" value={hours} onChange={(e) => setHours(+e.target.value)} className="rounded-xl" />
            </Field>
          )}
          <Field label="Сожжено ккал">
            <Input type="number" value={burned} onChange={(e) => setBurned(+e.target.value)} className="rounded-xl" />
          </Field>
          <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/30 p-3">
            <Switch checked={addToRation} onCheckedChange={setAddToRation} id="add-ration" />
            <label htmlFor="add-ration" className="text-sm text-muted-foreground">
              Прибавлять сожженные калории к рациону? По умолчанию выключено, чтобы не компенсировать еду тренировками.
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button
            onClick={() => {
              onSave({
                type,
                name: type === "workout" ? name : undefined,
                sets: type === "workout" ? sets : undefined,
                reps: type === "workout" ? reps : undefined,
                weight: type === "workout" ? weight : undefined,
                steps: type === "steps" ? steps : undefined,
                hours: type === "sleep" ? hours : undefined,
                burnedKcal: burned,
                addToRation,
              });
            }}
          >
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PressureDialog({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (p: Omit<PressureEntry, "id">) => void;
}) {
  const [sys, setSys] = React.useState(120);
  const [dia, setDia] = React.useState(80);
  const [pulse, setPulse] = React.useState(70);
  const [notes, setNotes] = React.useState("");

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle>Замер давления</DialogTitle>
          <DialogDescription>{ymd(new Date())}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Систола">
            <Input type="number" value={sys} onChange={(e) => setSys(+e.target.value)} className="rounded-xl" />
          </Field>
          <Field label="Диастола">
            <Input type="number" value={dia} onChange={(e) => setDia(+e.target.value)} className="rounded-xl" />
          </Field>
          <Field label="Пульс">
            <Input type="number" value={pulse} onChange={(e) => setPulse(+e.target.value)} className="rounded-xl" />
          </Field>
        </div>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Комментарий (необязательно)" className="rounded-2xl" />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={() => onSave({ date: ymd(new Date()), systolic: sys, diastolic: dia, pulse, notes })}>
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CycleDialog({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (c: Omit<import("@/lib/types").CycleEntry, "id">) => void;
}) {
  const today = ymd(new Date());
  const [start, setStart] = React.useState(today);
  const [end, setEnd] = React.useState<string | undefined>(undefined);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle>Цикл</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Начало (YYYY-MM-DD)">
            <Input value={start} onChange={(e) => setStart(e.target.value)} className="rounded-xl font-feature-num" />
          </Field>
          <Field label="Конец (опц.)">
            <Input value={end ?? ""} onChange={(e) => setEnd(e.target.value || undefined)} className="rounded-xl font-feature-num" />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={() => onSave({ startDate: start, endDate: end })}>
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

void sumMicro;
