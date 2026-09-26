"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { INPUT } from "@/components/ui";
import { redeemEnrollmentCode } from "./actions";

export function CodeForm() {
  const [state, action, pending] = useActionState(redeemEnrollmentCode, undefined);
  return (
    <form action={action} className="mt-5">
      <div className="flex gap-2">
        <input name="code" placeholder="Enrollment or invite code" autoComplete="off" className={`${INPUT} uppercase`} aria-label="Enrollment code" required />
        <button
          disabled={pending}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-teal px-5 font-display text-[15px] font-semibold text-white transition hover:bg-teal-deep disabled:opacity-60"
        >
          {pending ? "Linking…" : "Connect"} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      {state?.error && <p className="mt-2 text-[13.5px] text-alert" role="alert">{state.error}</p>}
    </form>
  );
}
