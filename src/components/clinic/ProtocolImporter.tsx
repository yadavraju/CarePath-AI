"use client";

import { useState, useTransition } from "react";
import { Bot, Plus, ScanText, Trash2, TriangleAlert, Wand2 } from "lucide-react";
import { activateSchedule, parseProtocolAction } from "@/app/clinic/actions";
import { CARD, Chip, INPUT } from "@/components/ui";
import type { ParsedItem } from "@/lib/protocol/parse";
import { cn } from "@/lib/utils";

type Props = { patients: { id: string; alias: string }[]; defaultPatientId?: string; sample: string };

const CELL = "w-full rounded-lg bg-canvas px-2 py-1.5 text-[13px] text-ink ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-teal/40";

export function ProtocolImporter({ patients, defaultPatientId, sample }: Props) {
  const [text, setText] = useState(sample);
  const [items, setItems] = useState<ParsedItem[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [engine, setEngine] = useState<{ name: string; note?: string } | null>(null);
  const [patientId, setPatientId] = useState(defaultPatientId ?? patients[0]?.id ?? "");
  const [note, setNote] = useState("Updated after your latest monitoring visit — please review the changes.");
  const [error, setError] = useState<string | null>(null);
  const [parsing, startParse] = useTransition();
  const [activating, startActivate] = useTransition();

  const parse = () =>
    startParse(async () => {
      setError(null);
      const res = await parseProtocolAction(text);
      if ("error" in res) return setError(res.error ?? "Couldn't parse.");
      setItems(res.result.items);
      setWarnings(res.result.warnings);
      setEngine({ name: res.engine === "claude" ? "AI" : "rules parser", note: res.note });
    });

  const update = (i: number, patch: Partial<ParsedItem>) => setItems((rows) => rows!.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const activate = () =>
    startActivate(async () => {
      setError(null);
      if (!items?.length) return;
      const bad = items.find((r) => !/^\d{2}:\d{2}$/.test(r.time) || r.dayEnd < r.dayStart || !r.title.trim());
      if (bad) return setError("Every row needs a title, a HH:MM time and a valid day range.");
      const res = await activateSchedule({ patientId, note, items });
      if (res?.error) setError(res.error);
    });

  return (
    <div className="space-y-5">
      <section className={`${CARD} p-5`}>
        <label className="font-display text-[14px] font-semibold text-ink" htmlFor="protocol">
          Protocol document
        </label>
        <textarea id="protocol" value={text} onChange={(e) => setText(e.target.value)} rows={9} className={`${INPUT} mt-2 h-auto py-3 font-mono text-[12.5px]`} />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button onClick={parse} disabled={parsing} className="inline-flex h-10 items-center gap-2 rounded-full bg-navy px-5 font-display text-[14px] font-semibold text-white disabled:opacity-60">
            {parsing ? <Wand2 className="h-4 w-4 animate-pulse" /> : <ScanText className="h-4 w-4" />} {parsing ? "Reading protocol…" : "Draft schedule"}
          </button>
          <span className="font-display text-[12.5px] text-ink-faint">Nothing goes live until you activate it below.</span>
        </div>
      </section>

      {items && (
        <section className={`${CARD} p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-[16px] font-semibold text-ink">Review the drafted schedule</h2>
            {engine && (
              <Chip tone="navy">
                <Bot className="h-3 w-3" /> Drafted by {engine.name}
              </Chip>
            )}
          </div>
          {engine?.note && <p className="mt-1 text-[12.5px] text-ink-faint">{engine.note}</p>}
          {warnings.length > 0 && (
            <ul className="mt-3 space-y-1 rounded-xl bg-caution-soft/70 p-3 text-[13px] text-ink">
              {warnings.map((w) => (
                <li key={w} className="flex gap-2">
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-caution" /> {w}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="font-display text-[11.5px] uppercase tracking-[0.08em] text-ink-faint">
                <tr>
                  <th className="pb-2">Days</th>
                  <th className="pb-2">Time</th>
                  <th className="pb-2">Medication / visit</th>
                  <th className="pb-2">Dose</th>
                  <th className="pb-2">Clinic instruction</th>
                  <th className="pb-2">Page</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((r, i) => (
                  <tr key={i} className="align-top">
                    <td className="py-1 pr-2">
                      <div className="flex items-center gap-1">
                        <input type="number" min={1} value={r.dayStart} onChange={(e) => update(i, { dayStart: Number(e.target.value) })} className={cn(CELL, "w-14")} aria-label="First day" />
                        <span className="text-ink-faint">–</span>
                        <input type="number" min={1} value={r.dayEnd} onChange={(e) => update(i, { dayEnd: Number(e.target.value) })} className={cn(CELL, "w-14")} aria-label="Last day" />
                      </div>
                    </td>
                    <td className="py-1 pr-2">
                      <input value={r.time} onChange={(e) => update(i, { time: e.target.value })} className={cn(CELL, "w-20")} aria-label="Time" />
                    </td>
                    <td className="py-1 pr-2">
                      <input value={r.title} onChange={(e) => update(i, { title: e.target.value })} className={CELL} aria-label="Title" />
                    </td>
                    <td className="py-1 pr-2">
                      <input value={r.dose ?? ""} onChange={(e) => update(i, { dose: e.target.value || null })} className={cn(CELL, "w-24")} aria-label="Dose" />
                    </td>
                    <td className="py-1 pr-2">
                      <input value={r.instruction} onChange={(e) => update(i, { instruction: e.target.value })} className={CELL} aria-label="Instruction" />
                    </td>
                    <td className="py-1 pr-2">
                      <input type="number" value={r.sourcePage ?? ""} onChange={(e) => update(i, { sourcePage: e.target.value ? Number(e.target.value) : null })} className={cn(CELL, "w-14")} aria-label="Page" />
                    </td>
                    <td className="py-1">
                      <button onClick={() => setItems(items.filter((_, j) => j !== i))} aria-label="Remove row" className="rounded-lg p-1.5 text-ink-faint hover:bg-sunken hover:text-alert">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={() => setItems([...items, { dayStart: 1, dayEnd: 1, time: "19:30", kind: "medication", title: "", dose: null, instruction: "", sourcePage: null }])}
            className="mt-2 inline-flex items-center gap-1.5 font-display text-[13px] font-semibold text-ink-soft hover:text-ink"
          >
            <Plus className="h-4 w-4" /> Add row
          </button>

          <div className="mt-6 grid gap-3 border-t border-line pt-5 md:grid-cols-[240px_1fr_auto] md:items-end">
            <label className="grid gap-1">
              <span className="font-display text-[12.5px] font-semibold text-ink-soft">Patient</span>
              <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className={INPUT}>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.alias}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="font-display text-[12.5px] font-semibold text-ink-soft">Note shown to the patient</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} className={INPUT} />
            </label>
            <button onClick={activate} disabled={activating || !items.length} className="inline-flex h-11 items-center justify-center rounded-full bg-teal px-6 font-display text-[15px] font-semibold text-white disabled:opacity-50">
              {activating ? "Activating…" : "Confirm & activate"}
            </button>
          </div>
          <p className="mt-2 font-display text-[12px] text-ink-faint">
            Future pending doses are replaced by this version; past doses and confirmations are kept as history.
          </p>
        </section>
      )}
      {error && <p className="text-[13.5px] text-alert" role="alert">{error}</p>}
    </div>
  );
}
