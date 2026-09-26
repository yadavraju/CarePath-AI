"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Check, Copy, Mail, MailCheck, UserPlus } from "lucide-react";
import { addPatient } from "@/app/clinic/actions";
import { INPUT } from "@/components/ui";
import { LANGUAGES } from "@/lib/brand";

const LABEL = "font-display text-[12.5px] font-semibold text-ink-soft";

function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(value).then(() => (setDone(true), setTimeout(() => setDone(false), 1500)))}
      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-raised px-3.5 font-display text-[13px] font-semibold text-ink ring-1 ring-line hover:ring-ink/25"
    >
      {done ? <Check className="h-4 w-4 text-teal" /> : <Copy className="h-4 w-4" />} {done ? "Copied" : label}
    </button>
  );
}

export function AddPatientForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState(addPatient, undefined);

  if (state && "code" in state) {
    const mailto = `mailto:${encodeURIComponent(state.email)}?subject=${encodeURIComponent(state.subject)}&body=${encodeURIComponent(state.text)}`;
    return (
      <div className="space-y-5">
        <div className="rounded-2xl bg-teal-soft p-5 text-teal-deep ring-1 ring-teal/20">
          <p className="flex items-center gap-2 font-display text-[15px] font-semibold">
            {state.emailStatus === "sent" ? <MailCheck className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            {state.alias} is added
            {state.emailStatus === "sent" && <> — invite emailed to {state.email}</>}
          </p>
          {state.emailStatus === "not_configured" && (
            <p className="mt-1 text-[13.5px]">Automatic email isn’t set up yet (RESEND_API_KEY). Send the invite from your own inbox below.</p>
          )}
          {state.emailStatus === "failed" && <p className="mt-1 text-[13.5px] text-alert">The invite email couldn’t be sent. Send it from your own inbox below.</p>}
        </div>

        <div>
          <p className={LABEL}>Enrollment code</p>
          <p className="mt-1 font-display text-[32px] font-bold tracking-[0.18em] text-ink">{state.code}</p>
          <p className="mt-1 break-all text-[13px] text-ink-faint">{state.joinUrl}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {state.emailStatus !== "sent" && (
            <a href={mailto} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-navy px-4 font-display text-[13px] font-semibold text-white hover:bg-navy/90">
              <Mail className="h-4 w-4" /> Email invite
            </a>
          )}
          <CopyButton value={state.code} label="Copy code" />
          <CopyButton value={state.text} label="Copy invite text" />
        </div>

        <div className="flex flex-wrap gap-3 border-t border-line pt-5">
          <Link
            href={`/clinic/protocols/import?patient=${state.patientId}`}
            className="inline-flex h-10 items-center rounded-full bg-ink px-5 font-display text-[14px] font-semibold text-white"
          >
            Import their protocol schedule
          </Link>
          <Link href={`/clinic/patients/${state.patientId}`} className="inline-flex h-10 items-center rounded-full px-4 font-display text-[14px] font-semibold text-ink ring-1 ring-line">
            Open patient card
          </Link>
          <button type="button" onClick={() => location.reload()} className="inline-flex h-10 items-center rounded-full px-4 font-display text-[14px] font-semibold text-ink-soft">
            Add another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1">
          <span className={LABEL}>Patient alias</span>
          <input name="alias" placeholder="e.g. Sara K." className={INPUT} required />
        </label>
        <label className="grid gap-1">
          <span className={LABEL}>Email for the invite (not stored)</span>
          <input name="email" type="email" placeholder="patient@example.com" className={INPUT} />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_160px_170px]">
        <label className="grid gap-1">
          <span className={LABEL}>Protocol</span>
          <input name="protocolName" defaultValue="Antagonist stimulation" className={INPUT} required />
        </label>
        <label className="grid gap-1">
          <span className={LABEL}>Language</span>
          <select name="language" defaultValue="en" className={INPUT}>
            {Object.entries(LANGUAGES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className={LABEL}>Cycle Day 1</span>
          <input name="startDate" type="date" defaultValue={today} className={INPUT} required />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending} className="inline-flex h-11 items-center gap-2 rounded-full bg-navy px-5 font-display text-[15px] font-semibold text-white hover:bg-navy/90 disabled:opacity-60">
          <UserPlus className="h-4 w-4" /> {pending ? "Adding…" : "Add patient & send invite"}
        </button>
        {state && "error" in state && <p className="text-[13.5px] text-alert" role="alert">{state.error}</p>}
      </div>
    </form>
  );
}
