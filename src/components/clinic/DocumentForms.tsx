"use client";

import { useActionState, useTransition } from "react";
import { Upload } from "lucide-react";
import { setDocumentStatus, uploadDocument } from "@/app/clinic/actions";
import { BTN_SM, INPUT } from "@/components/ui";
import type { DocumentStatus } from "@/db/schema";

export function DocStatusButtons({ id, status }: { id: string; status: DocumentStatus }) {
  const [pending, start] = useTransition();
  if (status === "approved")
    return (
      <button disabled={pending} onClick={() => start(() => setDocumentStatus(id, "retired"))} className={`${BTN_SM} bg-raised text-ink-soft ring-1 ring-line hover:text-ink`}>
        Retire
      </button>
    );
  return (
    <button disabled={pending} onClick={() => start(() => setDocumentStatus(id, "approved"))} className={`${BTN_SM} bg-teal text-white hover:bg-teal-deep`}>
      {pending ? "Approving…" : "Approve"}
    </button>
  );
}

export function UploadForm({ defaultKind = "medication_guide", next, submitLabel = "Upload as draft" }: { defaultKind?: string; next?: string; submitLabel?: string }) {
  const [state, action, pending] = useActionState(uploadDocument, undefined);
  return (
    <form action={action} className="mt-4 grid gap-3">
      {next && <input type="hidden" name="next" value={next} />}
      <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
        <input name="title" placeholder="Title, e.g. Stimulation Medication Guide" className={INPUT} required />
        <select name="kind" className={INPUT} defaultValue={defaultKind}>
          <option value="medication_guide">Medication guide</option>
          <option value="missed_dose">Missed-dose guide</option>
          <option value="symptom_guide">Symptom guide</option>
          <option value="faq">FAQ</option>
          <option value="protocol">Protocol</option>
        </select>
      </div>
      <textarea
        name="text"
        rows={6}
        placeholder={"Paste text. Optional structure:\n--- Page 1 ---\n## Section heading\nSection text…"}
        className={`${INPUT} h-auto py-3 font-mono text-[13px]`}
      />
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-canvas px-4 py-2 font-display text-[13px] font-semibold text-ink ring-1 ring-line">
          <Upload className="h-4 w-4" /> Or attach a PDF / .txt
          <input type="file" name="file" accept="application/pdf,text/plain" className="sr-only" />
        </label>
        <button disabled={pending} className="inline-flex h-10 items-center rounded-full bg-ink px-5 font-display text-[14px] font-semibold text-white disabled:opacity-50">
          {pending ? "Processing…" : submitLabel}
        </button>
        {state?.error && <p className="text-[13px] text-alert">{state.error}</p>}
      </div>
    </form>
  );
}
