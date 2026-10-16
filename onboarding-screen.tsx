"use client";

import * as React from "react";
import { Flower, ArrowRight, ArrowLeft, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import {
  ACTIVITY_DESCRIPTIONS,
  FORMULA_DESCRIPTIONS,
} from "@/lib/sample-data";
import {
  calcBMI,
  calcBMR,
  calcTargetKcal,
  calcTargetMacros,
  calcTDEE,
  GOAL_INTENSITY_META,
  ymd,
} from "@/lib/calc";
import {
  ActivityLevel,
  BmrFormula,
  Goal,
  GoalIntensity,
  Profile,
  Sex,
} from "@/lib/types";
import { toast } from "sonner";

type Step =
  | "welcome"
  | "name"
  | "sex"
  | "age"
  | "height"
  | "weight"
  | "activity"
  | "formula"
  | "goal"
  | "cycle"
  | "summary"
  | "flower";

const BASE_STEPS: Step[] = [
  "welcome",
  "name",
  "sex",
  "age",
  "height",
  "weight",
  "activity",
  "formula",
  "goal",
  "cycle",
  "summary",
  "flower",
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const updateProfile = useAppStore((s) => s.updateProfile);
  const addWeight = useAppStore((s) => s.addWeight);
  const addGoalHistory = useAppStore((s) => s.addGoalHistory);
  const addCycle = useAppStore((s) => s.addCycle);
  const setMood = useAppStore((s) => s.setMood);
  const addFlower = useAppStore((s) => s.addFlower);

  // Шаги для женщин vs мужчин (мужчины пропускают cycle)
  const STEPS = React.useMemo<Step[]>(() => {
    const p = useAppStore.getState().profile;
    if (p.sex === "male") {
      return BASE_STEPS.filter((s) => s !== "cycle");
    }
    return BASE_STEPS;
  }, []);

  const [stepIdx, setStepIdx] = React.useState(0);
  const [draft, setDraft] = React.useState<Profile>(() => {
    const p = useAppStore.getState().profile;
    return {
      ...p,
      age: p.age || 30,
      height: p.height || 168,
      currentWeight: 0,
      targetWeight: 0,
      sex: p.sex || "female",
      activity: p.activity || "light",
      formula: p.formula || "mifflin",
      goal: p.goal || "deficit",
      goalIntensity: p.goalIntensity || "deficit-medium",
      startDate: ymd(new Date()),
    };
  });

  // Состояние шага «цикл + самочувствие»
  const today = ymd(new Date());
  const [cycleStart, setCycleStart] = React.useState<string>("");
  const [cycleEnd, setCycleEnd] = React.useState<string>("");
  const [mood, setMoodState] = React.useState<string>("good");
  const [wellbeing, setWellbeing] = React.useState<string[]>([]);
  const [showFlower, setShowFlower] = React.useState(false);

  const toggleSymptom = (s: string) => {
    setWellbeing((arr) => arr.includes(s) ? arr.filter((x) => x !== s) : [...arr, s]);
  };
  void showFlower; void setShowFlower;

  const step = STEPS[stepIdx];

  const set = (patch: Partial<Profile>) => setDraft((d) => ({ ...d, ...patch }));

  // Сохраняет данные цикла и самочувствия + начисляет цветочек
  const saveCycleAndMood = () => {
    if (cycleStart) {
      addCycle({
        id: Math.random().toString(36).slice(2),
        startDate: cycleStart,
        endDate: cycleEnd || undefined,
      });
    }
    setMood({
      date: today,
      mood: mood as any,
      symptoms: wellbeing,
    });
    addFlower({
      date: today,
      type: "daisy",
      reason: "Первый день — ты начала путь заботы о себе",
    });
  };

  const next = () => {
    setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
  };
  const prev = () => setStepIdx((i) => Math.max(0, i - 1));

  const canNext = (() => {
    if (step === "name") return (draft.name ?? "").trim().length > 0;
    if (step === "sex") return !!draft.sex;
    if (step === "age") return draft.age > 0 && draft.age < 120;
    if (step === "height") return draft.height > 100 && draft.height < 250;
    if (step === "weight") return draft.currentWeight > 0 && draft.targetWeight > 0;
    if (step === "activity") return !!draft.activity;
    if (step === "formula") return !!draft.formula;
    if (step === "goal") return !!draft.goalIntensity;
    if (step === "cycle") {
      return !!mood;
    }
    return true;
  })();

  // Переход со summary → flower (с сохранением цикла, но БЕЗ сохранения профиля)
  const goSummaryToFlower = () => {
    if (draft.sex === "female") {
      saveCycleAndMood();
    } else {
      // мужчины тоже получают цветочек за старт
      addFlower({
        date: today,
        type: "daisy",
        reason: "Первый день — ты начал путь заботы о себе",
      });
    }
    // Профиль сохраняем только после клика на цветочек
    setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
  };

  // Завершение онбординга после клика на цветочек — теперь сохраняем профиль
  const handleFlowerClick = () => {
    handleFinishProfile();
    onComplete();
  };

  // расчёт КБЖУ
  const bmr = calcBMR(draft);
  const tdee = calcTDEE(draft);
  const targetKcal = calcTargetKcal(draft);
  const macros = calcTargetMacros(draft);
  const bmi = calcBMI(draft.currentWeight || 60, draft.height || 168);

  const handleFinishProfile = () => {
    const finalProfile: Profile = { ...draft, onboarded: true };
    updateProfile(finalProfile);
    if (draft.currentWeight > 0) {
      addWeight({
        date: ymd(new Date()),
        weight: Math.round(draft.currentWeight * 100) / 100,
      });
    }
    addGoalHistory({
      date: ymd(new Date()),
      goal: draft.goal,
      kcalTarget: targetKcal,
      note: "Старт через онбординг",
    });
  };

  // Шаг flower — финальный, показываем анимацию. Клик на цветочек — завершение.
  if (step === "flower") {
    const reason = draft.sex === "female"
      ? "Первый день — ты начала путь заботы о себе"
      : "Первый день — ты начал путь заботы о себе";
    return <FlowerRewardOverlay reason={reason} onClick={handleFlowerClick} />;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-screen-sm flex-col px-5 py-8">
      {/* Прогресс-бар */}
      {step !== "welcome" && (
        <div className="mb-6 flex gap-1">
          {STEPS.slice(1).map((s, i) => (
            <div
              key={s}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                i < stepIdx ? "bg-primary" : i === stepIdx - 1 ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>
      )}

      <div className="flex flex-1 flex-col">
        {step === "welcome" && (
          <WelcomeStep onStart={next} />
        )}

        {step === "name" && (
          <StepShell
            title="Как тебя зовут?"
            subtitle="Имя будет видно вверху приложения. Можешь использовать любое — реальные или ласковое."
          >
            <BigInput
              value={draft.name ?? ""}
              onChange={(v) => set({ name: v })}
              placeholder="Анна"
              autoFocus
              maxLength={40}
            />
          </StepShell>
        )}

        {step === "sex" && (
          <StepShell
            title="Расскажи о себе"
            subtitle="Это поможет точнее рассчитать твою норму"
          >
            <div className="grid grid-cols-2 gap-3">
              {(["female", "male"] as Sex[]).map((s) => (
                <button
                  key={s}
                  onClick={() => set({ sex: s })}
                  className={cn(
                    "rounded-3xl border p-5 text-center transition-all",
                    draft.sex === s
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background hover:bg-muted/60"
                  )}
                >
                  <div className="text-5xl">
                    {s === "female" ? "👩" : "👨"}
                  </div>
                  <div className="mt-2 font-semibold">
                    {s === "female" ? "Женский" : "Мужской"}
                  </div>
                </button>
              ))}
            </div>
          </StepShell>
        )}

        {step === "age" && (
          <StepShell title="Сколько тебе лет?" subtitle="Возраст влияет на обмен веществ">
            <BigNumber
              value={draft.age}
              onChange={(v) => set({ age: v })}
              unit="лет"
              min={10}
              max={100}
            />
          </StepShell>
        )}

        {step === "height" && (
          <StepShell title="Какой у тебя рост?" subtitle="Нужен для расчёта ИМТ">
            <BigNumber
              value={draft.height}
              onChange={(v) => set({ height: v })}
              unit="см"
              min={120}
              max={230}
            />
          </StepShell>
        )}

        {step === "weight" && (
          <StepShell
            title="Твой текущий и целевой вес"
            subtitle="Можно изменить позже. Формат 00,00 — две цифры после запятой"
          >
            <div className="grid grid-cols-2 gap-3">
              <DecimalField
                label="Текущий вес, кг"
                value={draft.currentWeight}
                onChange={(v) => set({ currentWeight: v })}
              />
              <DecimalField
                label="Целевой вес, кг"
                value={draft.targetWeight}
                onChange={(v) => set({ targetWeight: v })}
              />
            </div>
            {draft.currentWeight > 0 && draft.height > 0 && (
              <div className="mt-4 rounded-2xl border border-border/70 bg-muted/40 p-3 text-center text-sm">
                <div className="text-xs text-muted-foreground">Твой ИМТ</div>
                <div className="font-feature-num text-2xl font-bold tabular-nums">
                  {bmi.value}
                </div>
                <div className="text-xs text-primary">{bmi.label}</div>
              </div>
            )}
          </StepShell>
        )}

        {step === "activity" && (
          <StepShell
            title="Уровень активности"
            subtitle="Выбери описание, которое лучше всего тебе подходит"
          >
            <div className="space-y-2">
              {(Object.keys(ACTIVITY_DESCRIPTIONS) as ActivityLevel[]).map((lvl) => {
                const meta = ACTIVITY_DESCRIPTIONS[lvl];
                const sel = draft.activity === lvl;
                return (
                  <button
                    key={lvl}
                    onClick={() => set({ activity: lvl })}
                    className={cn(
                      "w-full rounded-2xl border p-3 text-left transition-all",
                      sel
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background hover:bg-muted/60"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{meta.title}</span>
                      {sel && <Check className="size-4 text-primary" />}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {meta.description}
                    </div>
                    <div className="mt-1 text-[10px] italic text-muted-foreground/70">
                      {meta.examples}
                    </div>
                  </button>
                );
              })}
            </div>
          </StepShell>
        )}

        {step === "formula" && (
          <StepShell
            title="Формула расчёта обмена"
            subtitle="Можешь выбрать формулу или оставить рекомендуемую"
          >
            <div className="space-y-2">
              {(Object.keys(FORMULA_DESCRIPTIONS) as BmrFormula[]).map((f) => {
                const meta = FORMULA_DESCRIPTIONS[f];
                const sel = draft.formula === f;
                return (
                  <button
                    key={f}
                    onClick={() => set({ formula: f })}
                    className={cn(
                      "w-full rounded-2xl border p-3 text-left transition-all",
                      sel
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background hover:bg-muted/60"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{meta.title}</span>
                      {sel && <Check className="size-4 text-primary" />}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {meta.description}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 rounded-2xl border border-dashed border-border bg-muted/40 p-3 text-sm">
              <div className="text-xs text-muted-foreground">Предварительный расчёт</div>
              <div className="font-feature-num text-base font-bold tabular-nums">
                BMR {bmr} · TDEE {tdee} ккал
              </div>
            </div>
          </StepShell>
        )}

        {step === "goal" && (
          <StepShell
            title="Твоя цель"
            subtitle="Выбери темп — это определит калорийность на день"
          >
            <div className="space-y-2">
              {([
                "deficit-soft",   // -10%
                "deficit-medium", // -15%
                "deficit-strong", // -20%
                "maintain",       // 0%
                "surplus-soft",  // +10%
                "surplus-strong", // +15%
              ] as GoalIntensity[]).map((gi) => {
                const meta = GOAL_INTENSITY_META[gi];
                const sel = (draft.goalIntensity ?? "deficit-medium") === gi;
                const goal: Goal = gi.startsWith("deficit")
                  ? "deficit"
                  : gi.startsWith("surplus")
                    ? "surplus"
                    : "maintain";
                return (
                  <button
                    key={gi}
                    onClick={() => set({ goalIntensity: gi, goal })}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all",
                      sel
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background hover:bg-muted/60"
                    )}
                  >
                    <span className="text-3xl">{meta.emoji}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{meta.title}</span>
                        <Badge variant="secondary" className="text-[10px]">{meta.pct}</Badge>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{meta.hint}</div>
                    </div>
                    {sel && <Check className="size-5 text-primary" />}
                  </button>
                );
              })}
            </div>
          </StepShell>
        )}

        {step === "cycle" && (
          <StepShell
            title="Цикл и самочувствие"
            subtitle="Заполни, если хочешь отслеживать фазы и симптомы. Можно пропустить."
          >
            <Card className="soft-card p-4">
              <div className="text-xs font-semibold text-muted-foreground">
                Когда были последние месячные?
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Field label="Начало (опц.)">
                  <Input
                    type="date"
                    value={cycleStart}
                    onChange={(e) => setCycleStart(e.target.value)}
                    className="font-feature-num rounded-xl"
                  />
                </Field>
                <Field label="Конец (опц.)">
                  <Input
                    type="date"
                    value={cycleEnd}
                    onChange={(e) => setCycleEnd(e.target.value)}
                    className="font-feature-num rounded-xl"
                  />
                </Field>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Эти даты появятся в женском календаре красными цветочками 🌸.
              </p>
            </Card>

            <div className="mt-4 text-xs font-semibold text-muted-foreground">
              Какое у тебя сегодня настроение?
            </div>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {([
                { v: "great", e: "🤩", l: "Восторг" },
                { v: "good", e: "😄", l: "Отлично" },
                { v: "happy", e: "🙂", l: "Хорошо" },
                { v: "calm", e: "😌", l: "Спокойно" },
                { v: "energetic", e: "⚡", l: "Энергично" },
                { v: "ok", e: "😐", l: "Норма" },
                { v: "anxious", e: "😟", l: "Тревожно" },
                { v: "irritable", e: "😤", l: "Раздраж." },
                { v: "down", e: "😕", l: "Грустно" },
                { v: "bad", e: "😣", l: "Плохо" },
              ] as const).map((m) => (
                <button
                  key={m.v}
                  onClick={() => setMoodState(m.v as any)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-2xl border py-2 transition-all",
                    mood === m.v
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background hover:bg-muted/60"
                  )}
                >
                  <span className="text-2xl">{m.e}</span>
                  <span className="text-[9px] text-muted-foreground">{m.l}</span>
                </button>
              ))}
            </div>

            <div className="mt-4 text-xs font-semibold text-muted-foreground">
              Самочувствие сегодня (можно выбрать несколько)
            </div>
            <div className="mt-2 space-y-2">
              <div>
                <div className="text-[10px] font-semibold text-emerald-500">✨ Положительные</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {[
                    "Прилив сил",
                    "Ясность ума",
                    "Бодрость",
                    "Хорошее настроение",
                    "Лёгкость в теле",
                    "Творческий подъём",
                    "Уверенность",
                    "Живой интерес к жизни",
                  ].map((s) => (
                    <SymptomChip key={s} label={s} active={wellbeing.includes(s)} onClick={() => toggleSymptom(s)} tone="pos" />
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground">😐 Нейтральные</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {[
                    "Изменение аппетита",
                    "Чувствительность к запахам",
                    "Лёгкая отёчность",
                    "Изменение стула",
                    "Потливость",
                    "Сонливость днём",
                  ].map((s) => (
                    <SymptomChip key={s} label={s} active={wellbeing.includes(s)} onClick={() => toggleSymptom(s)} tone="neu" />
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold text-rose-500">🌧 Негативные</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {[
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
                  ].map((s) => (
                    <SymptomChip key={s} label={s} active={wellbeing.includes(s)} onClick={() => toggleSymptom(s)} tone="neg" />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-3 text-sm text-muted-foreground">
              <Sparkles className="mr-1 inline size-4 text-primary" />
              За первое заполнение ты получишь <b>ромашку 🌼</b> — символ первого шага
              заботы о себе.
            </div>
          </StepShell>
        )}

        {step === "summary" && (
          <StepShell
            title="Твоя норма на день"
            subtitle="Приложение само подобрало КБЖУ, клетчатку и воду. Можешь изменить в Профиле позже."
          >
            <Card className="soft-card p-5">
              <div className="grid grid-cols-4 gap-2 text-center">
                <MacroBig label="ккал" value={targetKcal} />
                <MacroBig label="Б, г" value={macros.protein} />
                <MacroBig label="Ж, г" value={macros.fat} />
                <MacroBig label="У, г" value={macros.carbs} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-2xl border border-border/70 bg-muted/30 p-2">
                  <div className="font-feature-num text-base font-bold tabular-nums">
                    {macros.fiber} г
                  </div>
                  <div className="text-[10px] text-muted-foreground">Клетчатка</div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/30 p-2">
                  <div className="font-feature-num text-base font-bold tabular-nums">
                    {macros.water} мл
                  </div>
                  <div className="text-[10px] text-muted-foreground">Вода</div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
                <div>
                  <div className="font-feature-num text-base font-bold text-foreground tabular-nums">{bmr}</div>
                  <div>BMR</div>
                </div>
                <div>
                  <div className="font-feature-num text-base font-bold text-foreground tabular-nums">{tdee}</div>
                  <div>TDEE</div>
                </div>
                <div>
                  <div className="font-feature-num text-base font-bold text-foreground tabular-nums">{bmi.value}</div>
                  <div>ИМТ</div>
                </div>
              </div>
            </Card>
            <div className="mt-4 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-3 text-sm text-muted-foreground">
              <Sparkles className="mr-1 inline size-4 text-primary" />
              Эти цифры станут целью на Главном экране. Можешь переписать их вручную в Профиле, если диетолог дал другие значения.
            </div>
          </StepShell>
        )}
      </div>

      {/* Нижние кнопки */}
      {step !== "welcome" && step !== "flower" && (
        <div className="mt-6 flex items-center justify-between gap-2">
          <Button variant="ghost" onClick={prev} disabled={stepIdx === 1}>
            <ArrowLeft className="size-5" /> Назад
          </Button>
          {step === "summary" ? (
            <Button onClick={goSummaryToFlower} className="rounded-full">
              <Flower className="size-5" /> Получить ромашку
            </Button>
          ) : (
            <Button onClick={next} disabled={!canNext} className="rounded-full">
              Далее <ArrowRight className="size-5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function WelcomeStep({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <div className="text-7xl">🌼</div>
      <h1 className="mt-6 text-4xl font-extrabold tracking-tight">Цветочки</h1>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        Мягкий дневник питания, здоровья и цикла. Заботливый ИИ поможет не
        ругать себя, а видеть прогресс.
      </p>
      <Card className="mt-6 w-full max-w-xs p-4 text-left text-xs text-muted-foreground">
        <div className="flex items-start gap-2">
          <span className="text-base">🌸</span>
          <div>
            <b>Без агрессии.</b> Даже если превысила калории — приложение
            подскажет, что это нормально.
          </div>
        </div>
        <div className="mt-3 flex items-start gap-2">
          <span className="text-base">🌷</span>
          <div>
            <b>В конце месяца</b> ты получишь букет виртуальных цветочков за
            успешные дни.
          </div>
        </div>
      </Card>
      <Button
        onClick={onStart}
        className="mt-8 w-full max-w-xs rounded-2xl py-6 text-base"
      >
        Давай настроимся <ArrowRight className="size-5" />
      </Button>
    </div>
  );
}

function StepShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <h2 className="text-2xl font-extrabold tracking-tight">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-5 flex-1">{children}</div>
    </div>
  );
}

function BigNumber({
  value,
  onChange,
  unit,
  min,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  unit: string;
  min: number;
  max: number;
}) {
  // Храним локальное строковое значение, чтобы пользователь мог спокойно
  // набирать цифры (иначе при вводе "3" оно сразу превращалось в min=10)
  const [localValue, setLocalValue] = React.useState<string>(value ? String(value) : "");

  // Синхронизация с внешним value (например, при возврате назад)
  React.useEffect(() => {
    setLocalValue(value ? String(value) : "");
  }, [value]);

  const commit = () => {
    // при потере фокуса — нормализуем: пусто = 0, иначе в диапазоне [min, max]
    if (!localValue.trim()) {
      onChange(0);
      return;
    }
    let v = parseInt(localValue, 10);
    if (isNaN(v)) v = 0;
    if (v < min) v = min;
    if (v > max) v = max;
    onChange(v);
    setLocalValue(v ? String(v) : "");
  };

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="flex items-baseline gap-2">
        <input
          type="number"
          inputMode="numeric"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="font-feature-num w-40 bg-transparent text-center text-6xl font-extrabold tabular-nums outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          autoFocus
          placeholder="—"
        />
        <span className="text-xl text-muted-foreground">{unit}</span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Введи число от {min} до {max}
      </p>
    </div>
  );
}

function BigInput({
  value,
  onChange,
  placeholder,
  autoFocus,
  maxLength,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  maxLength?: number;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        maxLength={maxLength}
        className="w-full max-w-xs bg-transparent text-center text-4xl font-extrabold outline-none placeholder:text-muted-foreground/40"
      />
    </div>
  );
}

function SymptomChip({
  label,
  active,
  onClick,
  tone,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  tone: "pos" | "neu" | "neg";
}) {
  const activeCls =
    tone === "pos"
      ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : tone === "neg"
        ? "border-rose-400 bg-rose-400/10 text-rose-600 dark:text-rose-300"
        : "border-primary bg-primary/10 text-primary";
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs transition-colors",
        active ? activeCls : "border-border bg-background hover:bg-muted"
      )}
    >
      {label}
    </button>
  );
}

function DecimalField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
      {label}
      <Input
        type="number"
        step="0.01"
        value={value || ""}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          onChange(isNaN(v) ? 0 : Math.round(v * 100) / 100);
        }}
        className="font-feature-num rounded-xl text-center text-lg tabular-nums"
        placeholder="0,00"
        autoFocus
      />
    </label>
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

function MacroBig({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/40 p-3">
      <div className="font-feature-num text-xl font-bold text-primary tabular-nums">
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function FlowerRewardOverlay({
  reason,
  onClick,
}: {
  reason: string;
  onClick: () => void;
}) {
  const [clicked, setClicked] = React.useState(false);

  const handleClick = () => {
    if (clicked) return;
    setClicked(true);
    // через 1.4s (анимация исчезновения) — переходим к дневнику
    setTimeout(onClick, 1400);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background/95 px-6 text-center backdrop-blur-sm">
      <button
        onClick={handleClick}
        className={`flower-pop relative cursor-pointer text-[140px] transition-transform focus:outline-none ${clicked ? "flower-vanish" : "flower-pulse"}`}
        aria-label="Получить ромашку"
      >
        🌼
        {/* Искры */}
        {clicked && (
          <>
            <span className="spark s1" style={{ ["--i" as any]: 1 }}>✨</span>
            <span className="spark s2" style={{ ["--i" as any]: 2 }}>⭐</span>
            <span className="spark s3" style={{ ["--i" as any]: 3 }}>✨</span>
            <span className="spark s4" style={{ ["--i" as any]: 4 }}>⭐</span>
            <span className="spark s5" style={{ ["--i" as any]: 5 }}>✨</span>
            <span className="spark s6" style={{ ["--i" as any]: 6 }}>⭐</span>
            <span className="spark s7" style={{ ["--i" as any]: 7 }}>✨</span>
            <span className="spark s8" style={{ ["--i" as any]: 8 }}>⭐</span>
          </>
        )}
      </button>
      <div className="flower-pop-text space-y-2">
        <h2 className="text-2xl font-extrabold tracking-tight">
          {clicked ? "До встречи в дневнике 🌼" : "Твоя первая ромашка!"}
        </h2>
        <p className="mx-auto max-w-xs text-sm text-muted-foreground">
          {reason}. Приложение будет дарить цветочки за важные шаги — без
          наказаний, только поощрение.
        </p>
        <p className="text-xs text-muted-foreground">
          {clicked ? "Идём в дневник питания..." : "Нажми на ромашку, чтобы продолжить"}
        </p>
        <p className="text-[11px] text-muted-foreground/70">
          В конце месяца ты соберёшь целый букет.
        </p>
      </div>
      <style jsx>{`
        @keyframes flowerPop {
          0% { transform: scale(0) rotate(-180deg); opacity: 0; }
          50% { transform: scale(1.2) rotate(20deg); opacity: 1; }
          70% { transform: scale(0.95) rotate(-10deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes flowerFadeIn {
          0% { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes flowerPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
        @keyframes flowerVanish {
          0% { transform: scale(1) rotate(0deg); opacity: 1; filter: brightness(1); }
          30% { transform: scale(1.3) rotate(15deg); filter: brightness(1.4) drop-shadow(0 0 30px rgba(255, 200, 100, 0.8)); }
          60% { transform: scale(0.8) rotate(-20deg); opacity: 0.8; }
          100% { transform: scale(0) rotate(360deg); opacity: 0; }
        }
        @keyframes sparkFly {
          0% { transform: translate(0, 0) scale(0); opacity: 0; }
          30% { opacity: 1; transform: translate(0, 0) scale(1); }
          100% {
            transform: translate(
              calc(cos(var(--angle)) * var(--dist)),
              calc(sin(var(--angle)) * var(--dist) - 60px)
            ) scale(0.3) rotate(720deg);
            opacity: 0;
          }
        }
        .flower-pop {
          animation: flowerPop 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          display: inline-block;
          filter: drop-shadow(0 8px 24px rgba(156, 175, 136, 0.35));
        }
        .flower-pulse {
          animation: flowerPop 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                    flowerPulse 2s ease-in-out 1.2s infinite;
        }
        .flower-vanish {
          animation: flowerVanish 1.4s ease-out forwards !important;
        }
        .flower-pop-text {
          animation: flowerFadeIn 1s ease-out 0.6s forwards;
          opacity: 0;
        }
        .spark {
          position: absolute;
          top: 50%;
          left: 50%;
          font-size: 28px;
          pointer-events: none;
          --angle: calc(var(--i) * 45deg);
          --dist: 120px;
          animation: sparkFly 1.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
