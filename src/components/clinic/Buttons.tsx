"use client";

import { useState, useTransition } from "react";
import { Check, PhoneOutgoing, ThumbsUp, TriangleAlert, CircleDashed, CheckCheck } from "lucide-react";
import { reviewAnswer, updateAlert } from "@/app/clinic/actions";
import { BTN_SM } from "@/components/ui";
import type { AlertStatus, ReviewRating } from "@/db/schema";
import { cn } from "@/lib/utils";

export function AlertActions({ alertId, status }: { alertId: string; status: AlertStatus }) {
  const [pending, start] = useTransition();
  const act = (s: Exclude<AlertStatus, "open">) => start(() => updateAlert(alertId, s));
  return (
    <div className="flex flex-wrap gap-2">
      {status === "open" && (
        <button disabled={pending} onClick={() => act("acknowledged")} className={`${BTN_SM} bg-raised text-ink ring-1 ring-line hover:bg-canvas`}>
          <Check className="h-3.5 w-3.5" /> Acknowledge
        </button>
      )}
      {status !== "contacted" && (
        <button disabled={pending} onClick={() => act("contacted")} className={`${BTN_SM} bg-navy text-white hover:bg-navy/90`}>
          <PhoneOutgoing className="h-3.5 w-3.5" /> Contacted patient
        </button>
      )}
      <button disabled={pending} onClick={() => act("resolved")} className={`${BTN_SM} bg-teal text-white hover:bg-teal-deep`}>
        <CheckCheck className="h-3.5 w-3.5" /> Resolve
      </button>
    </div>
  );
}

const RATINGS: { id: ReviewRating; label: string; icon: typeof ThumbsUp; on: string }[] = [
  { id: "helpful", label: "Helpful", icon: ThumbsUp, on: "bg-teal text-white" },
  { id: "incomplete", label: "Incomplete", icon: CircleDashed, on: "bg-caution text-white" },
  { id: "unsafe", label: "Unsafe", icon: TriangleAlert, on: "bg-alert text-white" },
];

export function ReviewButtons({ messageId, current }: { messageId: string; current?: ReviewRating }) {
  const [value, setValue] = useState(current);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="font-display text-[11.5px] font-semibold text-ink-faint">Review:</span>
      {RATINGS.map((r) => (
        <button
          key={r.id}
          disabled={pending}
          onClick={() => {
            setValue(r.id);
            start(() => reviewAnswer(messageId, r.id));
          }}
          className={cn(BTN_SM, "h-7 px-2.5 text-[12px]", value === r.id ? r.on : "bg-raised text-ink-soft ring-1 ring-line hover:text-ink")}
        >
          <r.icon className="h-3 w-3" /> {r.label}
        </button>
      ))}
    </div>
  );
}
