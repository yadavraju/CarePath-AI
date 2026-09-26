"use client";

import { useActionState, useTransition } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { addUrgentRule, resetDemo, setAiPaused, toggleUrgentRule, updateContact } from "@/app/clinic/actions";
import { INPUT } from "@/components/ui";
import type { Clinic } from "@/db/schema";
import { cn } from "@/lib/utils";

export function AiPauseToggle({ paused }: { paused: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(() => setAiPaused(!paused))}
      disabled={pending}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-full px-5 font-display text-[14.5px] font-semibold text-white transition disabled:opacity-60",
        paused ? "bg-teal hover:bg-teal-deep" : "bg-caution hover:bg-caution/90",
      )}
    >
      {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
      {pending ? "Saving…" : paused ? "Resume AI answers" : "Pause AI answers"}
    </button>
  );
}

export function ContactForm({ clinic }: { clinic: Pick<Clinic, "urgentLine" | "urgentLineLabel" | "emergencyInstruction"> }) {
  const [state, action, pending] = useActionState(updateContact, undefined);
  return (
    <form action={action} className="mt-4 grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1">
          <span className="font-display text-[12.5px] font-semibold text-ink-soft">Urgent line</span>
          <input name="urgentLine" defaultValue={clinic.urgentLine} className={INPUT} />
        </label>
        <label className="grid gap-1">
          <span className="font-display text-[12.5px] font-semibold text-ink-soft">Label</span>
          <input name="urgentLineLabel" defaultValue={clinic.urgentLineLabel} className={INPUT} />
        </label>
      </div>
      <label className="grid gap-1">
        <span className="font-display text-[12.5px] font-semibold text-ink-soft">Emergency instruction (shown verbatim on urgent matches)</span>
        <textarea name="emergencyInstruction" defaultValue={clinic.emergencyInstruction} rows={3} className={`${INPUT} h-auto py-2.5`} />
      </label>
      <div className="flex items-center gap-3">
        <button disabled={pending} className="inline-flex h-10 items-center rounded-full bg-ink px-5 font-display text-[14px] font-semibold text-white disabled:opacity-50">
          {pending ? "Saving…" : "Save contact path"}
        </button>
        {state?.ok && <span className="text-[13px] text-teal-deep">Saved.</span>}
        {state?.error && <span className="text-[13px] text-alert">{state.error}</span>}
      </div>
    </form>
  );
}

export function RuleToggle({ id, enabled }: { id: string; enabled: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      role="switch"
      aria-checked={enabled}
      aria-label={enabled ? "Disable rule" : "Enable rule"}
      disabled={pending}
      onClick={() => start(() => toggleUrgentRule(id, !enabled))}
      className={cn("relative h-6 w-11 shrink-0 rounded-full transition", enabled ? "bg-alert" : "bg-line")}
    >
      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", enabled ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

export function AddRuleForm() {
  const [state, action, pending] = useActionState(addUrgentRule, undefined);
  return (
    <form action={action} className="mt-4 grid gap-2 sm:grid-cols-[200px_1fr_auto]">
      <input name="label" placeholder="Label, e.g. High fever" className={INPUT} required />
      <input name="phrases" placeholder="Phrases separated by | e.g. fever of 101|high fever" className={INPUT} required />
      <button disabled={pending} className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 font-display text-[14px] font-semibold text-white disabled:opacity-50">
        Add rule
      </button>
      {state?.error && <p className="text-[13px] text-alert sm:col-span-3">{state.error}</p>}
    </form>
  );
}

export function ResetDemoButton() {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(() => resetDemo())}
      disabled={pending}
      className="inline-flex h-10 items-center gap-2 rounded-full bg-raised px-4 font-display text-[14px] font-semibold text-ink ring-1 ring-line hover:bg-canvas disabled:opacity-60"
    >
      <RotateCcw className={cn("h-4 w-4", pending && "animate-spin")} /> {pending ? "Resetting…" : "Reset demo data"}
    </button>
  );
}
