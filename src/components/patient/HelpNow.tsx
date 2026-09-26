"use client";

import { useEffect, useState } from "react";
import { Phone, Siren, X } from "lucide-react";

export function HelpNow({ urgentLine, urgentLineLabel, emergencyInstruction }: { urgentLine: string; urgentLineLabel: string; emergencyInstruction: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-alert px-3.5 font-display text-[13px] font-semibold text-white shadow-sm transition hover:bg-alert/90"
      >
        <Phone className="h-3.5 w-3.5" /> Help now
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-3 sm:items-center" role="dialog" aria-modal aria-label="Help now" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md animate-rise rounded-3xl bg-raised p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <p className="flex items-center gap-2 font-display text-[18px] font-semibold text-ink">
                <Siren className="h-5 w-5 text-alert" /> Get help now
              </p>
              <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-full p-1 text-ink-faint hover:bg-sunken">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-3 rounded-2xl bg-alert-soft p-4 text-[14.5px] leading-relaxed text-ink">{emergencyInstruction}</p>
            <div className="mt-4 grid gap-2">
              <a href="tel:911" className="flex h-12 items-center justify-center gap-2 rounded-full bg-alert font-display text-[15px] font-semibold text-white">
                <Phone className="h-4 w-4" /> Call 911
              </a>
              <a href={`tel:${urgentLine.replace(/[^\d+]/g, "")}`} className="flex h-12 items-center justify-center gap-2 rounded-full bg-ink font-display text-[15px] font-semibold text-white">
                <Phone className="h-4 w-4" /> {urgentLineLabel} · {urgentLine}
              </a>
            </div>
            <p className="mt-4 text-center font-display text-[12px] text-ink-faint">Aama is not for emergencies and can’t see you. When in doubt, call.</p>
          </div>
        </div>
      )}
    </>
  );
}
