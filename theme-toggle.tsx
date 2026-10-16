"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="rounded-full">
        <Sun className="size-5" />
      </Button>
    );
  }

  // cycle: light -> dark -> system -> light
  const next = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full text-muted-foreground hover:text-foreground"
      onClick={next}
      title={
        theme === "light"
          ? "Светлая тема"
          : theme === "dark"
            ? "Тёмная тема"
            : "Системная тема"
      }
    >
      {theme === "light" ? (
        <Sun className="size-5" />
      ) : theme === "dark" ? (
        <Moon className="size-5" />
      ) : (
        <Monitor className="size-5" />
      )}
    </Button>
  );
}
