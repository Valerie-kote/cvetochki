"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { BottomNav, BrandLogo } from "@/components/shared/bottom-nav";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { HomeScreen } from "@/components/screens/home-screen";
import { HealthScreen } from "@/components/screens/health-screen";
import { CalendarScreen } from "@/components/screens/calendar-screen";
import { RecipesScreen } from "@/components/screens/recipes-screen";
import { ReportsScreen } from "@/components/screens/reports-screen";
import { ProfileScreen } from "@/components/screens/profile-screen";
import { CreateRecipeScreen } from "@/components/screens/create-recipe-screen";
import { AddFoodScreen } from "@/components/screens/add-food-screen";
import { OnboardingScreen } from "@/components/screens/onboarding-screen";
import { Screen } from "@/lib/types";
import { useAppStore } from "@/store/app-store";

type View = Screen["id"] | "create-recipe" | "add-food";

export default function Page() {
  const [view, setView] = React.useState<View>("home");
  const profile = useAppStore((s) => s.profile);
  const { setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  // синхронизируем тему с профилем — только на клиенте после монтирования
  React.useEffect(() => {
    if (!mounted) return;
    if (profile.theme === "light") setTheme("light");
    else if (profile.theme === "dark") setTheme("dark");
    else setTheme("system");
  }, [profile.theme, setTheme, mounted]);

  // Первый запуск — показываем онбординг
  if (mounted && !profile.onboarded) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <main className="flex-1">
          <OnboardingScreen onComplete={() => {}} />
        </main>
      </div>
    );
  }

  // специальный экран «Создать рецепт» — на весь экран
  if (view === "create-recipe") {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <main className="flex-1">
          <CreateRecipeScreen onClose={() => setView("recipes")} />
        </main>
      </div>
    );
  }

  // специальный экран «Добавить свой продукт» — на весь экран
  if (view === "add-food") {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <main className="flex-1">
          <AddFoodScreen onClose={() => setView("recipes")} />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Верхняя полоса — брэнд + тема */}
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border/60 glass-overlay px-4 py-3">
        <BrandLogo />
        <ThemeToggle />
      </header>

      <main className="flex-1">
        {view === "home" && (
          <HomeScreen
            onNavigateCreate={() => setView("create-recipe")}
            onNavigateAddFood={() => setView("add-food")}
          />
        )}
        {view === "health" && <HealthScreen />}
        {view === "calendar" && <CalendarScreen />}
        {view === "recipes" && (
          <RecipesScreen
            onNavigateCreate={() => setView("create-recipe")}
            onNavigateAddFood={() => setView("add-food")}
          />
        )}
        {view === "reports" && <ReportsScreen />}
        {view === "profile" && <ProfileScreen />}
      </main>

      <BottomNav active={view as Screen["id"]} onChange={(id) => setView(id)} />
    </div>
  );
}
