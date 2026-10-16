"use client";

import * as React from "react";
import {
  Home,
  HeartPulse,
  CalendarDays,
  UtensilsCrossed,
  BarChart3,
  User,
  Flower,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Screen } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";

export const SCREENS: Screen[] = [
  { id: "home", label: "Дневник" },
  { id: "health", label: "Здоровье" },
  { id: "calendar", label: "Календарь" },
  { id: "recipes", label: "Рецепты" },
  { id: "reports", label: "Отчёты" },
  { id: "profile", label: "Профиль" },
];

interface NavItemProps {
  screen: Screen;
  active: boolean;
  onClick: () => void;
}

function NavItem({ screen, active, onClick }: NavItemProps) {
  const Icon = (() => {
    switch (screen.id) {
      case "home":
        return Home;
      case "health":
        return HeartPulse;
      case "calendar":
        return CalendarDays;
      case "recipes":
        return UtensilsCrossed;
      case "reports":
        return BarChart3;
      case "profile":
        return User;
    }
  })();

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors rounded-xl",
        active
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground"
      )}
      aria-label={screen.label}
      aria-current={active ? "page" : undefined}
    >
      <Icon
        className={cn(
          "transition-transform duration-200",
          active ? "size-5 scale-110" : "size-5"
        )}
      />
      <span className="leading-none">{screen.label}</span>
    </button>
  );
}

interface BottomNavProps {
  active: Screen["id"];
  onChange: (id: Screen["id"]) => void;
}

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav
      className="sticky bottom-0 z-30 mt-auto border-t border-border/70 glass-overlay"
      aria-label="Нижняя навигация"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="mx-auto flex max-w-screen-sm items-stretch px-2">
        {SCREENS.map((s) => (
          <NavItem
            key={s.id}
            screen={s}
            active={active === s.id}
            onClick={() => onChange(s.id)}
          />
        ))}
      </div>
    </nav>
  );
}

export function BrandLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="grid size-9 place-items-center rounded-2xl bg-primary text-primary-foreground">
        <Flower className="size-5" />
      </div>
      <div className="leading-tight">
        <div className="text-sm font-extrabold tracking-tight">Цветочки</div>
        <div className="text-[10px] text-muted-foreground">
          мягкий дневник питания
        </div>
      </div>
    </div>
  );
}

export { buttonVariants };
