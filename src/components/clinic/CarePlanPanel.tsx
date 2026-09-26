"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Loader2, Plus, ShieldCheck, Sparkles, Trash2, X } from "lucide-react";
import { assignCareItem, removeCareItem, suggestCareAction } from "@/app/clinic/actions";
import { CareKindIcon, KIND_LABEL, STATUS_LABEL, isDone } from "@/components/CareKind";
import { BTN_SM, Chip, INPUT } from "@/components/ui";
import type { CareKind, CareStatus } from "@/db/schema";
import { cn } from "@/lib/utils";

export type PanelItem = {
  id: string;
  kind: CareKind;
  title: string;
  summary: string;
  status: CareStatus;
  personalNote: string | null;
  dueDate: string | null;
  signedName: string | null;
  signedAt: string | null;
  signatureHash: string | null;
  libraryVersion: number | null;
  aiSuggested: boolean;
  assignedBy: string | null;
  libraryItemId: string | null;
};
export type LibraryOption = { id: string; kind: CareKind; title: string; summary: string };
type Suggestion = { libraryItemId: string; title: string; kind: string; reason: string; dueInDays: number };

function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function CarePlanPanel({ patientId, alias, items, library }: { patientId: string; alias: string; items: PanelItem[]; library: LibraryOption[] }) {
  const [pending, start] = useTransition();
  const [assigning, setAssigning] = useState(false);
  const [pick, setPick] = useState("");
  const [note, setNote] = useState("");
  const [due, setDue] = useState("");
  const [suggest, setSuggest] = useState<{ list: Suggestion[]; engine: string } | null>(null);
  const [suggesting, startSuggest] = useTransition();

  const done = items.filter((i) => isDone(i.status, i.kind));
  const todo = items.filter((i) => !isDone(i.status, i.kind));
  const pct = items.length ? Math.round((done.length / items.length) * 100) : 0;
  const onPlan = useMemo(() => new Set(items.map((i) => i.libraryItemId)), [items]);
  const available = library.filter((l) => !onPlan.has(l.id));
  const pendingConsents = todo.filter((i) => i.kind === "consent").length;

  const assign = (libraryItemId: string, opts: { note?: string; dueDate?: string; aiSuggested?: boolean }) =>
    start(async () => {
      await assignCareItem({ patientId, libraryItemId, note: opts.note || undefined, dueDate: opts.dueDate || undefined, aiSuggested: opts.aiSuggested });
      setSuggest((s) => (s ? { ...s, list: s.list.filter((x) => x.libraryItemId !== libraryItemId) } : s));
    });

  return (
    <section className="rounded-2xl bg-raised p-5 ring-1 ring-line" aria-label="Care plan">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[16px] font-semibold text-ink">Personal care plan</h2>
          <p className="mt-0.5 text-[13px] text-ink-soft">
            {done.length} of {items.length} complete{pendingConsents ? ` · ${pendingConsents} consent${pendingConsents > 1 ? "s" : ""} awaiting signature` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() =>
              startSuggest(async () => {
                const r = await suggestCareAction(patientId);
                setSuggest({ list: r.suggestions, engine: r.engine });
              })
            }
            disabled={suggesting}
            className={`${BTN_SM} bg-navy text-white hover:bg-navy/90`}
          >
            {suggesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Suggest next steps
          </button>
          <button onClick={() => setAssigning((v) => !v)} className={`${BTN_SM} bg-raised text-ink ring-1 ring-line hover:bg-canvas`}>
            <Plus className="h-3.5 w-3.5" /> Assign
          </button>
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sunken">
        <div className="h-full rounded-full bg-teal transition-all" style={{ width: `${pct}%` }} />
      </div>

      {suggest && (
        <div className="mt-4 rounded-xl bg-sky-soft p-4 ring-1 ring-sky">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 font-display text-[13px] font-semibold text-navy">
              <Sparkles className="h-3.5 w-3.5" /> Suggested for {alias.split(" ")[0]} · {suggest.engine === "rules" ? "rules" : "AI"} · you decide
            </p>
            <button onClick={() => setSuggest(null)} aria-label="Dismiss suggestions" className="rounded p-1 text-ink-faint hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          </div>
          {suggest.list.length === 0 && <p className="mt-2 text-[13px] text-ink-soft">Nothing to add — the plan already covers what’s coming up.</p>}
          <ul className="mt-2 space-y-2">
            {suggest.list.map((s) => (
              <li key={s.libraryItemId} className="flex items-start gap-3 rounded-lg bg-raised p-3">
                <CareKindIcon kind={s.kind as CareKind} className="h-8 w-8" />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[13.5px] font-semibold text-ink">{s.title}</p>
                  <p className="text-[12.5px] text-ink-soft">{s.reason}</p>
                </div>
                <button disabled={pending} onClick={() => assign(s.libraryItemId, { dueDate: addDays(s.dueInDays), aiSuggested: true })} className={`${BTN_SM} bg-teal text-white hover:bg-teal-deep`}>
                  <Check className="h-3.5 w-3.5" /> Assign
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {assigning && (
        <div className="mt-4 grid gap-2 rounded-xl bg-canvas p-4 md:grid-cols-[1.3fr_1fr_150px_auto] md:items-end">
          <label className="grid gap-1">
            <span className="font-display text-[12px] font-semibold text-ink-soft">From the care library</span>
            <select value={pick} onChange={(e) => setPick(e.target.value)} className={INPUT}>
              <option value="">Choose…</option>
              {(["consent", "video", "document", "task"] as CareKind[]).map((k) => (
                <optgroup key={k} label={KIND_LABEL[k]}>
                  {available
                    .filter((l) => l.kind === k)
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.title}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="font-display text-[12px] font-semibold text-ink-soft">Personal note (optional)</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={`A line for ${alias.split(" ")[0]}…`} className={INPUT} />
          </label>
          <label className="grid gap-1">
            <span className="font-display text-[12px] font-semibold text-ink-soft">Due</span>
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={INPUT} />
          </label>
          <button
            disabled={!pick || pending}
            onClick={() => {
              assign(pick, { note, dueDate: due });
              setPick("");
              setNote("");
              setDue("");
              setAssigning(false);
            }}
            className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 font-display text-[14px] font-semibold text-white disabled:opacity-40"
          >
            Assign
          </button>
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {[
          ["To do", todo],
          ["Done", done],
        ].map(([label, list]) => (
          <div key={label as string}>
            <p className="mb-2 font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
              {label as string} · {(list as PanelItem[]).length}
            </p>
            <ul className="space-y-2">
              {(list as PanelItem[]).map((i) => (
                <li key={i.id} className={cn("rounded-xl p-3 ring-1", isDone(i.status, i.kind) ? "bg-canvas/60 ring-line" : "bg-raised ring-line")}>
                  <div className="flex items-start gap-3">
                    <CareKindIcon kind={i.kind} />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1.5 font-display text-[13.5px] font-semibold text-ink">
                        {i.title}
                        {i.aiSuggested && <Chip tone="navy">AI-suggested</Chip>}
                      </p>
                      <p className="mt-0.5 flex flex-wrap gap-x-2 text-[12px] text-ink-faint">
                        <span>{KIND_LABEL[i.kind]}{i.libraryVersion ? ` v${i.libraryVersion}` : ""}</span>
                        {i.assignedBy && <span>· by {i.assignedBy.replace(" (sample)", "")}</span>}
                        {i.dueDate && !isDone(i.status, i.kind) && <span>· due {i.dueDate.slice(5)}</span>}
                      </p>
                      {i.personalNote && <p className="mt-1.5 rounded-lg bg-canvas px-2.5 py-1.5 text-[12.5px] italic text-ink-soft">“{i.personalNote}”</p>}
                      {i.status === "signed" && i.signedAt && (
                        <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-teal-deep">
                          <ShieldCheck className="h-3.5 w-3.5" /> Signed “{i.signedName}” · {new Date(i.signedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} ·{" "}
                          <code className="text-[11px] text-ink-faint">{i.signatureHash?.slice(0, 12)}…</code>
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <Chip tone={isDone(i.status, i.kind) ? "teal" : i.kind === "consent" ? "amber" : "neutral"}>{STATUS_LABEL[i.status]}</Chip>
                      {i.status !== "signed" && (
                        <button disabled={pending} onClick={() => start(() => removeCareItem(i.id))} aria-label={`Remove ${i.title}`} className="rounded p-1 text-ink-faint hover:text-alert">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
