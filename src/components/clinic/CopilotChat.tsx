"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUp, Loader2, Sparkles, Wrench } from "lucide-react";
import { askCopilot } from "@/app/clinic/actions";
import { RichText } from "@/components/RichText";
import { Dot } from "@/components/ui";
import { cn } from "@/lib/utils";

type Turn = { role: "user" | "assistant"; text: string; tools?: string[]; model?: string; fallback?: string; patients?: { alias: string; id: string }[] };
type Need = { patientId: string; alias: string; reason: string; severity: "red" | "amber"; age: string };

const TOOL_LABEL: Record<string, string> = { exceptions: "Needs attention", adherence: "Today’s doses", guides: "Clinic guides", patients: "Patient list", care: "Care plans" };

export function CopilotChat({ greeting, subtitle, starters, needs }: { greeting: string; subtitle: string; starters: string[]; needs: Need[] }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [value, setValue] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length, pending]);

  const send = (text: string) => {
    const q = text.trim();
    if (!q || pending) return;
    setError(null);
    setValue("");
    const next: Turn[] = [...turns, { role: "user", text: q }];
    setTurns(next);
    start(async () => {
      try {
        const reply = await askCopilot(next.map(({ role, text }) => ({ role, text })));
        setTurns((t) => [...t, { role: "assistant", ...reply }]);
      } catch {
        setError("The copilot couldn’t answer just now. Try again.");
      }
    });
  };

  const composer = (
    <div className="rounded-2xl bg-raised p-2 ring-1 ring-line shadow-[0_8px_30px_-18px_rgba(51,48,42,0.35)] transition-shadow focus-within:ring-ink/30">
      <textarea
        ref={inputRef}
        rows={2}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send(value);
          }
        }}
        placeholder="Ask about your patients, today’s doses, or what a guide says…"
        className="max-h-40 min-h-[52px] w-full resize-none bg-transparent px-2 py-1.5 text-[15px] leading-relaxed text-ink outline-none placeholder:text-ink-faint"
        aria-label="Ask the clinical copilot"
      />
      <div className="flex items-center justify-between gap-2 px-1 pt-1">
        <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-faint">
          <Sparkles className="h-3.5 w-3.5" /> Read-only · answers from your clinic’s data
        </span>
        <button onClick={() => send(value)} disabled={!value.trim() || pending} aria-label="Send" className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-white transition-opacity hover:opacity-90 disabled:opacity-25">
          <ArrowUp className="h-[18px] w-[18px]" />
        </button>
      </div>
    </div>
  );

  if (turns.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 lg:px-8 lg:py-16">
        <header className="mb-6 text-center">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-teal-soft px-3 py-1 font-display text-[12px] font-semibold text-teal-deep">
            <Sparkles className="h-3.5 w-3.5" /> Clinical copilot
          </p>
          <h1 className="mt-4 font-display text-[26px] font-bold tracking-tight text-ink lg:text-[32px]">{greeting}</h1>
          <p className="mt-2 text-[15px] text-ink-soft">{subtitle}</p>
        </header>
        {composer}
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {starters.map((s) => (
            <button key={s} onClick={() => send(s)} className="rounded-full border border-line px-3 py-1.5 text-[12.5px] text-ink-soft transition-colors hover:border-ink/30 hover:text-ink">
              {s}
            </button>
          ))}
        </div>
        {needs.length > 0 && (
          <section className="mt-10" aria-label="Needs attention now">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-[14px] font-semibold text-ink">Needs attention now</h2>
              <Link href="/clinic/attention" className="inline-flex items-center gap-1 font-display text-[12.5px] font-semibold text-ink-soft hover:text-ink">
                See all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-3">
              {needs.map((n) => (
                <Link
                  key={n.patientId}
                  href={`/clinic/patients/${n.patientId}`}
                  className={cn(
                    "group rounded-xl p-3.5 ring-1 transition-all hover:-translate-y-0.5",
                    n.severity === "red" ? "bg-alert-soft/60 ring-alert/25 hover:ring-alert/50" : "bg-raised ring-line hover:ring-ink/25",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Dot tone={n.severity} className="h-2 w-2" />
                    <span className="font-display text-[14px] font-semibold text-ink">{n.alias}</span>
                    <span className="ml-auto text-[11.5px] text-ink-faint">{n.age}</span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-ink-soft">{n.reason}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8 lg:px-8">
        {turns.map((t, i) =>
          t.role === "user" ? (
            <p key={i} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-[14.5px] text-white">
              {t.text}
            </p>
          ) : (
            <div key={i} className="flex gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-navy text-white">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <RichText text={t.text} patients={t.patients} />
                <p className="mt-2 flex flex-wrap items-center gap-1.5 font-display text-[11.5px] text-ink-faint">
                  {t.tools?.length ? <Wrench className="h-3 w-3" /> : null}
                  {t.tools?.map((tool) => (
                    <span key={tool} className="rounded-md bg-sunken px-1.5 py-0.5">
                      {tool.startsWith("patient:") ? `Patient · ${tool.slice(8)}` : (TOOL_LABEL[tool] ?? tool)}
                    </span>
                  ))}
                  <span>· {t.model === "rules" ? `offline rules${t.fallback ? ` (${t.fallback})` : ""}` : t.model}</span>
                </p>
              </div>
            </div>
          ),
        )}
        {pending && (
          <p className="flex items-center gap-2 text-[13.5px] text-ink-soft">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking who needs attention and your records…
          </p>
        )}
        {error && <p className="text-[13px] text-alert">{error}</p>}
        <div ref={endRef} />
      </div>
      <div className="sticky bottom-0 bg-gradient-to-t from-paper via-paper to-paper/0 px-4 pb-4 pt-6 lg:px-8">
        <div className="mx-auto max-w-3xl">{composer}</div>
      </div>
    </div>
  );
}
