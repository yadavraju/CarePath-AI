"use client";

import { useActionState, useState } from "react";
import { createLibraryItem } from "@/app/clinic/actions";
import { INPUT } from "@/components/ui";

export function LibraryForm() {
  const [state, action, pending] = useActionState(createLibraryItem, undefined);
  const [kind, setKind] = useState("video");
  return (
    <form action={action} className="mt-4 grid gap-3">
      <div className="grid gap-3 sm:grid-cols-[180px_1fr_110px]">
        <select name="kind" value={kind} onChange={(e) => setKind(e.target.value)} className={INPUT}>
          <option value="video">Video</option>
          <option value="document">Guide / document</option>
          <option value="consent">Consent form</option>
          <option value="task">Task</option>
        </select>
        <input name="title" placeholder="Title" className={INPUT} required />
        <input name="minutes" type="number" min={0} placeholder="Min" className={INPUT} />
      </div>
      <input name="summary" placeholder="One-line summary patients will see" className={INPUT} required />
      {(kind === "video" || kind === "document") && <input name="url" placeholder="Link (YouTube, Vimeo, MP4 or PDF) — optional" className={INPUT} />}
      {(kind === "consent" || kind === "task") && (
        <textarea
          name="body"
          rows={6}
          placeholder={kind === "consent" ? "Full consent text — patients sign exactly this version." : "Instructions for the patient"}
          className={`${INPUT} h-auto py-3`}
        />
      )}
      <div className="flex items-center gap-3">
        <button disabled={pending} className="inline-flex h-10 items-center rounded-full bg-ink px-5 font-display text-[14px] font-semibold text-white disabled:opacity-50">
          {pending ? "Adding…" : "Add to library"}
        </button>
        {state?.ok && <span className="text-[13px] text-teal-deep">Added.</span>}
        {state?.error && <span className="text-[13px] text-alert">{state.error}</span>}
      </div>
    </form>
  );
}
