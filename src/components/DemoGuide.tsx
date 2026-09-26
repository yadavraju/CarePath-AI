"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Check, Compass, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = { id: string; who: "Patient" | "Clinic"; title: string; hint: string; href: string };

const KEY = "aama:guide-done";
const read = () => {
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
};
const subscribe = (cb: () => void) => {
  window.addEventListener("aama:guide", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("aama:guide", cb);
    window.removeEventListener("storage", cb);
  };
};

/**
 * A judge's checklist through one complete patient → clinic story on the
 * mock data. Progress is remembered in this browser only.
 */
export function DemoGuide({ mayaId }: { mayaId: string }) {
  const [open, setOpen] = useState(false);
  const doneRaw = useSyncExternalStore(subscribe, read, () => "");
  const done = new Set(doneRaw.split(",").filter(Boolean));
  const mark = (id: string) => {
    done.add(id);
    try {
      window.localStorage.setItem(KEY, [...done].join(","));
    } catch {}
    window.dispatchEvent(new Event("aama:guide"));
  };

  const steps: Step[] = [
    { id: "today", who: "Patient", title: "See today’s plan", hint: "Day 7 doses with their clinic source, and a schedule change to review.", href: "/patient" },
    { id: "refuse", who: "Patient", title: "Ask “Can I take my Menopur late tonight?”", hint: "The AI refuses to change timing, cites the guide, offers the on-call line.", href: "/patient" },
    { id: "answer", who: "Patient", title: "Ask “How should I store my Gonal-F pen?”", hint: "A cited answer from the clinic’s own document.", href: "/patient" },
    { id: "urgent", who: "Patient", title: "Tap “I have severe stomach pain…”", hint: "Red-flag rule → emergency guidance and a red nurse alert. No AI in the path.", href: "/patient" },
    { id: "sign", who: "Patient", title: "Sign a consent in My care", hint: "Explain it in plain language, then e-sign with your typed name.", href: "/patient/care" },
    { id: "copilot", who: "Clinic", title: "Ask the copilot “Who needs me first?”", hint: "Claude reads the live queue with read-only tools.", href: "/clinic" },
    { id: "card", who: "Clinic", title: "Open Maya’s card", hint: "Mark the red alert Contacted; try ✨ Suggest next steps on the care plan.", href: `/clinic/patients/${mayaId}` },
    { id: "protocol", who: "Clinic", title: "Import a protocol", hint: "Claude drafts the schedule table; you confirm before it goes live.", href: "/clinic/protocols/import" },
  ];
  const count = steps.filter((s) => done.has(s.id)).length;

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {open && (
        <div className="w-[min(92vw,360px)] animate-rise rounded-2xl bg-raised p-4 shadow-[0_24px_60px_-20px_rgba(23,58,79,0.45)] ring-1 ring-line">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-display text-[15px] font-semibold text-ink">Demo guide</p>
              <p className="text-[12.5px] text-ink-soft">
                One patient → clinic story on mock data · {count}/{steps.length}
              </p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close demo guide" className="rounded-lg p-1 text-ink-faint hover:bg-sunken hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          </div>
          <ol className="mt-3 max-h-[60vh] space-y-1.5 overflow-y-auto">
            {steps.map((s, i) => {
              const ok = done.has(s.id);
              return (
                <li key={s.id}>
                  <Link href={s.href} onClick={() => mark(s.id)} className={cn("flex gap-2.5 rounded-xl p-2.5 transition hover:bg-canvas", ok && "opacity-60")}>
                    <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-display text-[11.5px] font-bold", ok ? "bg-teal text-white" : "bg-sunken text-ink-soft")}>
                      {ok ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-display text-[13px] font-semibold text-ink">
                        <span className={cn("mr-1.5 rounded px-1 text-[10.5px]", s.who === "Patient" ? "bg-teal-soft text-teal-deep" : "bg-navy/10 text-navy")}>{s.who}</span>
                        {s.title}
                      </span>
                      <span className="mt-0.5 block text-[12px] leading-snug text-ink-soft">{s.hint}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 border-t border-line pt-3 text-[11.5px] leading-relaxed text-ink-faint">
            Tip: the demo clock (Today page) jumps to 7:05 PM for a live reminder. Reset everything in{" "}
            <Link href="/clinic/settings" className="text-teal-deep underline">
              Controls
            </Link>
            .
          </p>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-11 items-center gap-2 rounded-full bg-navy pl-4 pr-5 font-display text-[14px] font-semibold text-white shadow-lg transition hover:bg-navy/90"
      >
        <Compass className="h-4 w-4" /> Demo guide · {count}/{steps.length}
      </button>
    </div>
  );
}
