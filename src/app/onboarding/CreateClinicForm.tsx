"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { INPUT } from "@/components/ui";
import { createClinic } from "./actions";

const LABEL = "font-display text-[12.5px] font-semibold text-ink-soft";

export function CreateClinicForm({ defaultName, allowSample }: { defaultName?: string; allowSample?: boolean }) {
  const [state, action, pending] = useActionState(createClinic, undefined);
  return (
    <form action={action} className="mt-5 grid gap-3">
      <label className="grid gap-1">
        <span className={LABEL}>Clinic name</span>
        <input name="clinicName" placeholder="e.g. Lakeside Fertility" className={INPUT} required />
      </label>
      <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
        <label className="grid gap-1">
          <span className={LABEL}>Your name</span>
          <input name="yourName" defaultValue={defaultName} placeholder="Dr. A. Patel" className={INPUT} required />
        </label>
        <label className="grid gap-1">
          <span className={LABEL}>Role</span>
          <select name="role" defaultValue="clinician" className={INPUT}>
            <option value="clinician">Clinician</option>
            <option value="nurse">Nurse</option>
            <option value="coordinator">Coordinator</option>
          </select>
        </label>
      </div>
      <label className="grid gap-1">
        <span className={LABEL}>Urgent line patients call</span>
        <input name="urgentLine" type="tel" placeholder="(555) 010-2000" className={INPUT} required />
      </label>
      <label className="grid gap-1">
        <span className={LABEL}>Emergency instruction (shown verbatim on a red flag)</span>
        <textarea
          name="emergencyInstruction"
          rows={3}
          required
          defaultValue="If you have severe abdominal pain, trouble breathing, chest pain, fainting or heavy bleeding, call 911 or go to the nearest emergency department now. Then call our urgent line."
          className={`${INPUT} h-auto py-2.5 text-[14px]`}
        />
      </label>
      {allowSample && (
        <fieldset className="grid gap-2">
          <legend className={`${LABEL} mb-1`}>Do you want to import sample patients?</legend>
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-raised px-3.5 py-3 text-[13.5px] text-ink ring-1 ring-line has-[:checked]:ring-2 has-[:checked]:ring-teal">
            <input type="radio" name="sample" value="off" defaultChecked className="mt-0.5 h-4 w-4 accent-teal" />
            <span>
              <span className="font-display font-semibold">No, start with an empty clinic</span>
              <span className="block text-ink-soft">Next you’ll add your protocol document, or skip it for now.</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-raised px-3.5 py-3 text-[13.5px] text-ink ring-1 ring-line has-[:checked]:ring-2 has-[:checked]:ring-teal">
            <input type="radio" name="sample" value="on" className="mt-0.5 h-4 w-4 accent-teal" />
            <span>
              <span className="font-display font-semibold">Yes, import sample patients (hackathon demo)</span>
              <span className="block text-ink-soft">18 fictional patients with alerts and chats, plus approved guides and a care library.</span>
            </span>
          </label>
        </fieldset>
      )}
      <button
        disabled={pending}
        className="mt-1 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-navy font-display text-[15px] font-semibold text-white transition hover:bg-navy/90 disabled:opacity-60"
      >
        {pending ? "Creating your clinic…" : "Create clinic & continue"} <ArrowRight className="h-4 w-4" />
      </button>
      {state?.error && <p className="text-[13.5px] text-alert" role="alert">{state.error}</p>}
    </form>
  );
}
