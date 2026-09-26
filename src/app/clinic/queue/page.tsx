import Link from "next/link";
import { and, desc, eq, ne } from "drizzle-orm";
import { ChevronRight, Info } from "lucide-react";
import { DemoClock } from "@/components/DemoClock";
import { Chip, Dot, EYEBROW } from "@/components/ui";
import { db } from "@/db";
import { alerts, auditEvents, cycles, patients, type Alert } from "@/db/schema";
import { LANGUAGES, CLINIC_TZ } from "@/lib/brand";
import { daysBetween, localDate } from "@/lib/time";
import { timeAgo } from "@/lib/utils";
import { clinicNow, requireStaff } from "@/server/context";
import { sweepMissed } from "@/server/reminders";
import { setClinicDemoClock } from "../actions";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<Alert["kind"], string> = {
  urgent_symptom: "Urgent symptom",
  missed_confirmation: "Missed confirmation",
  unsupported_question: "Unsupported question",
  timing_question: "Timing question",
  needs_review: "Needs review",
};

/** Red first, then missed confirmations, then questions; oldest waiting first within a band. */
function rank(a: Alert) {
  if (a.severity === "red") return 0;
  if (a.kind === "missed_confirmation") return 1;
  return 2;
}

export default async function Queue() {
  const { clinic } = await requireStaff();
  await sweepMissed(clinic);
  const now = clinicNow(clinic);
  const today = localDate(now, CLINIC_TZ);

  const active = await db
    .select({ patient: patients, cycle: cycles })
    .from(cycles)
    .innerJoin(patients, eq(cycles.patientId, patients.id))
    .where(and(eq(cycles.clinicId, clinic.id), eq(cycles.status, "active")));
  const unresolved = await db
    .select()
    .from(alerts)
    .where(and(eq(alerts.clinicId, clinic.id), ne(alerts.status, "resolved")))
    .orderBy(alerts.createdAt);
  const recentAudit = await db
    .select()
    .from(auditEvents)
    .where(eq(auditEvents.clinicId, clinic.id))
    .orderBy(desc(auditEvents.createdAt))
    .limit(300);

  const lastAction = new Map<string, (typeof recentAudit)[number]>();
  for (const e of recentAudit) if (e.patientId && !lastAction.has(e.patientId)) lastAction.set(e.patientId, e);

  const byPatient = new Map<string, Alert[]>();
  for (const a of unresolved) byPatient.set(a.patientId, [...(byPatient.get(a.patientId) ?? []), a]);

  const queue = active
    .filter(({ patient }) => byPatient.has(patient.id))
    .map(({ patient, cycle }) => {
      const list = [...byPatient.get(patient.id)!].sort((x, y) => rank(x) - rank(y) || x.createdAt.getTime() - y.createdAt.getTime());
      return { patient, cycle, top: list[0], rest: list.length - 1, openCount: list.filter((a) => a.status === "open").length };
    })
    .sort((x, y) => rank(x.top) - rank(y.top) || x.top.createdAt.getTime() - y.top.createdAt.getTime());
  const onTrack = active.filter(({ patient }) => !byPatient.has(patient.id));
  const redCount = queue.filter((q) => q.top.severity === "red").length;

  const updated = now.toLocaleTimeString("en-US", { timeZone: CLINIC_TZ, hour: "numeric", minute: "2-digit" });

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={EYEBROW}>Morning view</p>
          <h1 className="mt-1 font-display text-[26px] font-bold tracking-[-0.02em] text-ink">
            Active cycles · {active.length}
          </h1>
          <p className="mt-1 text-[14px] text-ink-soft">
            {queue.length === 0 ? "No open exceptions." : `${queue.length} need attention${redCount ? ` · ${redCount} urgent` : ""}.`} Updated {updated}.
          </p>
        </div>
        {clinic.isDemo && <DemoClock nowLabel={updated} offset={clinic.demoOffsetMinutes} onSet={setClinicDemoClock} />}
      </div>

      <section className="overflow-hidden rounded-3xl bg-raised ring-1 ring-line" aria-label="Exception queue">
        {queue.map(({ patient, cycle, top, rest, openCount }) => {
          const tone = top.severity === "red" ? "red" : "amber";
          return (
            <Link
              key={patient.id}
              href={`/clinic/patients/${patient.id}`}
              className={`flex items-center gap-4 border-b border-line px-5 py-4 transition last:border-0 hover:bg-canvas/70 ${top.severity === "red" && top.status === "open" ? "bg-alert-soft/40" : ""}`}
            >
              <Dot tone={tone} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-display text-[15px] font-semibold text-ink">
                  {patient.alias}
                  <span className="font-normal text-ink-faint">Day {daysBetween(cycle.startDate, today) + 1} · {LANGUAGES[patient.language]}</span>
                </p>
                <p className="mt-0.5 truncate text-[14px] text-ink-soft">{top.reason}</p>
                <p className="mt-1 flex flex-wrap gap-1.5">
                  <Chip tone={tone}>{KIND_LABEL[top.kind]}</Chip>
                  {top.status !== "open" && <Chip tone="neutral">{top.status === "contacted" ? "Patient contacted" : "Acknowledged"}</Chip>}
                  {rest > 0 && <Chip tone="neutral">+{rest} more</Chip>}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {top.severity === "red" && top.status === "open" ? (
                  <Chip tone="red">Review now</Chip>
                ) : (
                  <span className="font-display text-[13px] text-ink-soft">{openCount ? timeAgo(top.createdAt) : "In progress"}</span>
                )}
                <ChevronRight className="h-4 w-4 text-ink-faint" />
              </div>
            </Link>
          );
        })}
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4 hover:bg-canvas/70">
            <Dot tone="teal" />
            <div className="flex-1">
              <p className="font-display text-[15px] font-semibold text-ink">{onTrack.length} patients</p>
              <p className="text-[14px] text-ink-soft">No open exception</p>
            </div>
            <Chip tone="teal">On track</Chip>
            <ChevronRight className="h-4 w-4 text-ink-faint transition group-open:rotate-90" />
          </summary>
          <ul className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
            {onTrack.map(({ patient, cycle }) => {
              const last = lastAction.get(patient.id);
              return (
                <li key={patient.id} className="bg-raised">
                  <Link href={`/clinic/patients/${patient.id}`} className="block px-5 py-3 hover:bg-canvas/70">
                    <p className="font-display text-[14px] font-semibold text-ink">
                      {patient.alias} <span className="font-normal text-ink-faint">· Day {daysBetween(cycle.startDate, today) + 1}</span>
                    </p>
                    <p className="truncate text-[12.5px] text-ink-soft">{last ? `${last.summary} · ${timeAgo(last.createdAt, now)}` : "No app activity yet"}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </details>
      </section>

      <p className="flex items-start gap-2 font-display text-[12.5px] leading-relaxed text-ink-faint">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        “On track” means no open app signal — not that the patient is clinically well. Silence is never read as reassurance:
        closed confirmation windows surface here as missed.
      </p>
    </div>
  );
}
