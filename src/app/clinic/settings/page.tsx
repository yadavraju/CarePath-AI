import { asc, eq } from "drizzle-orm";
import { FlaskConical, PhoneCall, PauseCircle, Siren } from "lucide-react";
import { AddRuleForm, AiPauseToggle, ContactForm, ResetDemoButton, RuleToggle } from "@/components/clinic/ControlsForms";
import { CARD, EYEBROW } from "@/components/ui";
import { db } from "@/db";
import { urgentRules } from "@/db/schema";
import { DEMO_PATIENT_CODE } from "@/demo/content";
import { requireStaff } from "@/server/context";

export const dynamic = "force-dynamic";

export default async function Controls() {
  const { clinic } = await requireStaff();
  const rules = await db.select().from(urgentRules).where(eq(urgentRules.clinicId, clinic.id)).orderBy(asc(urgentRules.createdAt));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 lg:px-8">
      <div>
        <p className={EYEBROW}>Clinic controls</p>
        <h1 className="mt-1 font-display text-[26px] font-bold tracking-[-0.02em] text-ink">Controls</h1>
        <p className="mt-1 text-[14px] text-ink-soft">Every change here is written to the audit log.</p>
      </div>

      <section className={`${CARD} flex flex-wrap items-center justify-between gap-4 p-6`}>
        <div className="max-w-xl">
          <h2 className="flex items-center gap-2 font-display text-[16px] font-semibold text-ink">
            <PauseCircle className="h-4 w-4 text-ink-faint" /> AI answers are {clinic.aiPaused ? "paused" : "on"}
          </h2>
          <p className="mt-1 text-[14px] text-ink-soft">
            Pausing routes every patient question straight to your queue. Red-flag rules, reminders and the schedule keep
            working — they don’t depend on AI.
          </p>
        </div>
        <AiPauseToggle paused={clinic.aiPaused} />
      </section>

      <section className={`${CARD} p-6`}>
        <h2 className="flex items-center gap-2 font-display text-[16px] font-semibold text-ink">
          <PhoneCall className="h-4 w-4 text-ink-faint" /> Urgent contact path
        </h2>
        <ContactForm clinic={clinic} />
      </section>

      <section className={`${CARD} p-6`}>
        <h2 className="flex items-center gap-2 font-display text-[16px] font-semibold text-ink">
          <Siren className="h-4 w-4 text-alert" /> Red-flag rules
        </h2>
        <p className="mt-1 max-w-2xl text-[14px] text-ink-soft">
          Checked before any AI runs. A match shows your emergency instruction verbatim and creates a red alert — no model can
          override it. Sample list; your clinicians approve the real one.
        </p>
        <ul className="mt-4 divide-y divide-line">
          {rules.map((r) => (
            <li key={r.id} className="flex items-start gap-4 py-3">
              <RuleToggle id={r.id} enabled={r.enabled} />
              <div className="min-w-0">
                <p className="font-display text-[14px] font-semibold text-ink">{r.label}</p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-faint">{r.phrases.split("|").join(" · ")}</p>
              </div>
            </li>
          ))}
        </ul>
        <AddRuleForm />
      </section>

      {clinic.isDemo && (
        <section className="rounded-2xl bg-sky-soft p-6 ring-1 ring-sky">
          <h2 className="flex items-center gap-2 font-display text-[16px] font-semibold text-ink">
            <FlaskConical className="h-4 w-4 text-ink-faint" /> Demo tools
          </h2>
          <p className="mt-1 max-w-2xl text-[14px] text-ink-soft">
            Rebuild the sample clinic between rehearsals — messages, alerts and schedules return to the starting state. Your
            logins stay linked. Patient enrollment code: <code className="rounded bg-raised px-1.5 font-semibold text-ink">{DEMO_PATIENT_CODE}</code>
          </p>
          <div className="mt-4">
            <ResetDemoButton />
          </div>
        </section>
      )}
    </div>
  );
}
