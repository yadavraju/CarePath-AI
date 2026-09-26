"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUp, Check, Loader2, Sparkles, Wrench, X, Zap } from "lucide-react";
import { askCopilot, runCopilotAction } from "@/app/clinic/actions";
import type { CopilotActionResult, CopilotProposal } from "@/lib/copilotActions";
import { RichText } from "@/components/RichText";
import { Dot } from "@/components/ui";
import { cn } from "@/lib/utils";

type Turn = {
  role: "user" | "assistant";
  text: string;
  tools?: string[];
  model?: string;
  fallback?: string;
  patients?: { alias: string; id: string }[];
  proposals?: CopilotProposal[];
};
type Need = { patientId: string; alias: string; reason: string; severity: "red" | "amber"; age: string };

const TOOL_LABEL: Record<string, string> = {
  exceptions: "Needs attention",
  adherence: "Today’s doses",
  guides: "Clinic guides",
  patients: "Patient list",
  care: "Care plans",
  library: "Care library",
  "act:alert": "Staged alert update",
  "act:resolve": "Staged resolve",
  "act:message": "Staged message",
  "act:assign": "Staged assignment",
  "act:add": "Staged new patient",
  "act:pause": "Staged AI setting",
};

type CardState = { status: "idle" | "running" | "dismissed" } | { status: "done"; result: CopilotActionResult };

/** Staged actions: nothing happens until staff press Confirm. */
function ActionCards({ proposals }: { proposals: CopilotProposal[] }) {
  const [state, setState] = useState<Record<string, CardState>>({});
  const get = (id: string): CardState => state[id] ?? { status: "idle" };
  const run = async (p: CopilotProposal) => {
    setState((s) => ({ ...s, [p.id]: { status: "running" } }));
    const result = await runCopilotAction(p.action).catch((): CopilotActionResult => ({ ok: false, error: "Couldn’t reach the server." }));
    setState((s) => ({ ...s, [p.id]: { status: "done", result } }));
  };
  const idle = proposals.filter((p) => get(p.id).status === "idle");

  return (
    <div className="mt-3 space-y-2">
      {proposals.map((p) => {
        const st = get(p.id);
        if (st.status === "dismissed") return null;
        const done = st.status === "done" ? st.result : null;
        return (
          <div
            key={p.id}
            className={cn(
              "flex flex-wrap items-center gap-3 rounded-xl px-3.5 py-3 ring-1",
              done?.ok ? "bg-teal-soft/60 ring-teal/25" : done ? "bg-alert-soft/60 ring-alert/25" : "bg-raised ring-line",
            )}
          >
            <Zap className={cn("h-4 w-4 shrink-0", done?.ok ? "text-teal" : "text-ink-faint")} />
            <div className="min-w-0 flex-1">
              <p className="font-display text-[13.5px] font-semibold text-ink">{p.label}</p>
              {p.detail && <p className="mt-0.5 text-[12.5px] leading-snug text-ink-soft">{p.detail}</p>}
              {done && (
                <p className={cn("mt-1 font-display text-[12.5px] font-semibold", done.ok ? "text-teal-deep" : "text-alert")}>
                  {done.ok ? (
                    <>
                      ✓ {done.note}
                      {done.href && (
                        <Link href={done.href} className="ml-2 underline">
                          Open
                        </Link>
                      )}
                    </>
                  ) : (
                    done.error
                  )}
                </p>
              )}
            </div>
            {!done && (
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  onClick={() => run(p)}
                  disabled={st.status === "running"}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-ink px-3 font-display text-[12.5px] font-semibold text-white disabled:opacity-50"
                >
                  {st.status === "running" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Confirm
                </button>
                <button
                  onClick={() => setState((s) => ({ ...s, [p.id]: { status: "dismissed" } }))}
                  disabled={st.status === "running"}
                  aria-label="Dismiss"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint hover:bg-sunken hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        );
      })}
      {idle.length > 1 && (
        <button
          onClick={async () => {
            for (const p of idle) await run(p);
          }}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 font-display text-[12.5px] font-semibold text-ink-soft ring-1 ring-line hover:text-ink"
        >
          <Check className="h-3.5 w-3.5" /> Confirm all {idle.length}
        </button>
      )}
    </div>
  );
}

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
        setError("The copilot couldn’t respond just now. Try again.");
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
        placeholder="Ask or tell me what to do — “resolve Priya’s alert”, “message Ana the nurse will call”…"
        className="max-h-40 min-h-[52px] w-full resize-none bg-transparent px-2 py-1.5 text-[15px] leading-relaxed text-ink outline-none placeholder:text-ink-faint"
        aria-label="Tell the clinical copilot what to do"
      />
      <div className="flex items-center justify-end gap-2 px-1 pt-1">
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
            <Sparkles className="h-3.5 w-3.5" /> Clinical agent
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
                {t.text && <RichText text={t.text} patients={t.patients} />}
                {t.proposals?.length ? <ActionCards proposals={t.proposals} /> : null}
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
            <Loader2 className="h-4 w-4 animate-spin" /> Working on it…
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
