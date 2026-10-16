"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface RingProps {
  value: number; // текущее
  max: number; // цель
  size?: number;
  stroke?: number;
  color?: string; // hex
  trackColor?: string;
  className?: string;
  children?: React.ReactNode;
}

export function ProgressRing({
  value,
  max,
  size = 160,
  stroke = 14,
  color,
  trackColor,
  className,
  children,
}: RingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = max > 0 ? Math.min(1, value / max) : 0;
  const offset = circumference - ratio * circumference;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor ?? "currentColor"}
          strokeWidth={stroke}
          className="text-muted/60"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color ?? "var(--primary)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.7s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}

interface MiniBarProps {
  value: number;
  max: number;
  color?: string;
  label?: string;
  unit?: string;
  compact?: boolean;
}

export function MiniBar({
  value,
  max,
  color,
  label,
  unit,
  compact,
}: MiniBarProps) {
  const ratio = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className={cn("flex flex-col gap-1", compact ? "min-w-0" : "")}>
      <div className="flex items-baseline justify-between text-xs text-muted-foreground">
        <span className="truncate">{label}</span>
        <span className="font-feature-num font-semibold text-foreground tabular-nums">
          {Math.round(value)}
          {unit ? <span className="text-muted-foreground">/{max}{unit}</span> : null}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${ratio * 100}%`,
            background: color ?? "var(--primary)",
          }}
        />
      </div>
    </div>
  );
}
