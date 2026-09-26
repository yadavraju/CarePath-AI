"use client";

import { useTransition } from "react";
import { AlarmClockPlus, Check } from "lucide-react";
import { confirmItem, snoozeItem } from "@/app/patient/actions";
import { BTN_SM } from "@/components/ui";

type ConfirmProps = { itemId: string | string[]; label?: string; late?: boolean; onDark?: boolean };

export function ConfirmButton({ itemId, label = "Done", late = false, onDark = false }: ConfirmProps) {
  const [pending, start] = useTransition();
  const ids = Array.isArray(itemId) ? itemId : [itemId];
  const tone = late
    ? "bg-caution text-white hover:bg-caution/90"
    : onDark
      ? "bg-white text-navy hover:bg-white/90"
      : "bg-ink text-white hover:bg-ink/90";
  return (
    <button
      onClick={() =>
        start(async () => {
          for (const id of ids) await confirmItem(id);
        })
      }
      disabled={pending}
      className={`${BTN_SM} ${tone}`}
    >
      <Check className="h-3.5 w-3.5" /> {pending ? "Saving…" : label}
    </button>
  );
}

export function SnoozeButton({ itemId }: { itemId: string | string[] }) {
  const [pending, start] = useTransition();
  const ids = Array.isArray(itemId) ? itemId : [itemId];
  return (
    <button
      onClick={() =>
        start(async () => {
          for (const id of ids) await snoozeItem(id);
        })
      } disabled={pending} className={`${BTN_SM} bg-white/15 text-white ring-1 ring-white/30 hover:bg-white/25`}>
      <AlarmClockPlus className="h-3.5 w-3.5" /> {pending ? "…" : "15 min"}
    </button>
  );
}
