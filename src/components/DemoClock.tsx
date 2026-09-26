"use client";

import { useTransition } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const PRESETS = [
  { id: "real", label: "Real time" },
  { id: "reminder", label: "7:05 PM" },
  { id: "missed", label: "8:45 PM" },
] as const;

type Preset = (typeof PRESETS)[number]["id"];

/** Stage-demo control: jump the sample clinic's clock to a reminder or a missed window. */
export function DemoClock({ nowLabel, offset, onSet }: { nowLabel: string; offset: number; onSet: (p: Preset) => Promise<void> }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-full bg-raised/80 p-1 pl-3 ring-1 ring-line">
      <span className="flex items-center gap-1.5 font-display text-[12px] font-semibold text-ink-soft">
        <Clock className="h-3.5 w-3.5" /> Demo clock · {nowLabel}
      </span>
      {PRESETS.map((p) => {
        const active = p.id === "real" ? offset === 0 : false;
        return (
          <button
            key={p.id}
            disabled={pending}
            onClick={() => start(() => onSet(p.id))}
            className={cn(
              "rounded-full px-2.5 py-1 font-display text-[12px] font-semibold transition disabled:opacity-50",
              active ? "bg-ink text-white" : "text-ink hover:bg-sunken",
            )}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
