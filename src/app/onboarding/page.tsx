import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { ArrowRight, HeartPulse, Stethoscope } from "lucide-react";
import { CARD, EYEBROW, Wordmark } from "@/components/ui";
import { DEMO_PATIENT_CODE } from "@/demo/content";
import { getViewer } from "@/server/context";
import { joinDemoClinicAsStaff } from "./actions";
import { CodeForm } from "./CodeForm";

export default async function Onboarding() {
  const viewer = await getViewer();
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-soft to-canvas">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-5 py-5">
        <Wordmark />
        <UserButton />
      </header>
      <main className="mx-auto max-w-4xl px-5 pb-20 pt-6">
        <p className={EYEBROW}>Welcome</p>
        <h1 className="display-2 mt-2 text-ink">How are you using Aama?</h1>
        <p className="subtitle mt-3 max-w-xl text-ink-soft">
          For the demo you can be both — open the clinic view in one tab and the patient view in another.
        </p>
        <p className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-2xl bg-navy px-4 py-2.5 font-display text-[14px] text-white">
          Judging? Enter invite code <code className="rounded-md bg-white/15 px-2 py-0.5 text-[15px] font-bold tracking-[0.2em]">0000</code> below —
          you’ll get the clinic dashboard and patient Maya on mock data.
        </p>

        {(viewer?.staff || viewer?.patient) && (
          <div className="mt-8 flex flex-wrap gap-3">
            {viewer.staff && (
              <Link href="/clinic" className="inline-flex items-center gap-2 rounded-full bg-navy px-5 py-2.5 font-display text-[14px] font-semibold text-white">
                Clinic dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            {viewer.patient && (
              <Link href="/patient" className="inline-flex items-center gap-2 rounded-full bg-teal px-5 py-2.5 font-display text-[14px] font-semibold text-white">
                Patient app · {viewer.patient.patient.alias} <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        )}

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <section className={`${CARD} p-7`}>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-soft text-teal-deep">
              <HeartPulse className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-display text-[18px] font-semibold text-ink">I’m a patient — or have an invite code</h2>
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">
              Enter the enrollment code from your clinic to connect your current protocol.
            </p>
            <CodeForm />
            <p className="mt-3 font-display text-[12.5px] text-ink-faint">
              Demo codes: <code className="rounded bg-sunken px-1.5 py-0.5 font-semibold text-ink">0000</code> (clinic + patient) ·{" "}
              <code className="rounded bg-sunken px-1.5 py-0.5 font-semibold text-ink">{DEMO_PATIENT_CODE}</code> (patient Maya R., Day 7)
            </p>
          </section>

          <section className={`${CARD} p-7`}>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-white">
              <Stethoscope className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-display text-[18px] font-semibold text-ink">I’m on a clinic team</h2>
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">
              Join the sample clinic as a coordinator to see who needs attention, patient cards and controls.
            </p>
            <form action={joinDemoClinicAsStaff} className="mt-5">
              <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-navy font-display text-[15px] font-semibold text-white transition hover:bg-navy/90">
                Join Harbor Fertility (sample) <ArrowRight className="h-4 w-4" />
              </button>
            </form>
            <p className="mt-3 font-display text-[12.5px] text-ink-faint">In production, staff are invited by their clinic admin.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
