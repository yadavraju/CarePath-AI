import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { ArrowLeft, Bot, Cpu, FileClock, History, MessageSquare, Siren, UserRound } from "lucide-react";
import { AlertActions, ReviewButtons } from "@/components/clinic/Buttons";
import { CarePlanPanel } from "@/components/clinic/CarePlanPanel";
import { CARD, Chip, Dot, EYEBROW, SourceTag } from "@/components/ui";
import { db } from "@/db";
import { alerts, answerReviews, auditEvents, careItems, cycles, libraryItems, messages, patients, scheduleItems, staff, type Message } from "@/db/schema";
import { CLINIC_TZ, LANGUAGES } from "@/lib/brand";
import { liveState } from "@/lib/schedule";
import { addDays, daysBetween, localDate, shortDate } from "@/lib/time";
import { formatClock, timeAgo } from "@/lib/utils";
import { clinicNow, requireStaff } from "@/server/context";

export const dynamic = "force-dynamic";

const TRIAGE_TONE = { routine: "teal", needs_review: "amber", urgent: "red" } as const;
const OUTCOME_LABEL: Record<NonNullable<Message["outcome"]>, string> = {
  answered: "Answered with citation",
  withheld: "Withheld — routed to staff",
  urgent: "Urgent guidance shown",
  timing_question: "Timing change refused — routed to on-call",
  ai_paused: "AI paused — routed to staff",
};

export default async function PatientCard({ params }: PageProps<"/clinic/patients/[id]">) {
  const { id } = await params;
  const { clinic } = await requireStaff();
  const [patient] = await db.select().from(patients).where(and(eq(patients.id, id), eq(patients.clinicId, clinic.id)));
  if (!patient) notFound();
  const [cycle] = await db.select().from(cycles).where(and(eq(cycles.patientId, patient.id), eq(cycles.status, "active"))).orderBy(desc(cycles.createdAt));
  if (!cycle) notFound();

  const now = clinicNow(clinic);
  const today = localDate(now, CLINIC_TZ);
  const day = daysBetween(cycle.startDate, today) + 1;

  const [openAlerts, schedule, convo, audit] = await Promise.all([
    db.select().from(alerts).where(and(eq(alerts.patientId, patient.id), ne(alerts.status, "resolved"))).orderBy(asc(alerts.createdAt)),
    db
      .select()
      .from(scheduleItems)
      .where(and(eq(scheduleItems.cycleId, cycle.id), inArray(scheduleItems.date, [addDays(today, -1), today, addDays(today, 1)])))
      .orderBy(asc(scheduleItems.date), asc(scheduleItems.time)),
    db.select().from(messages).where(eq(messages.cycleId, cycle.id)).orderBy(asc(messages.createdAt)),
    db.select().from(auditEvents).where(eq(auditEvents.patientId, patient.id)).orderBy(desc(auditEvents.createdAt)).limit(40),
  ]);
  const [plan, library, team] = await Promise.all([
    db.select().from(careItems).where(eq(careItems.patientId, patient.id)).orderBy(asc(careItems.createdAt)),
    db.select().from(libraryItems).where(eq(libraryItems.clinicId, clinic.id)).orderBy(asc(libraryItems.title)),
    db.select().from(staff).where(eq(staff.clinicId, clinic.id)),
  ]);
  const staffName = new Map(team.map((t) => [t.id, t.name]));
  const reviews = convo.length
    ? await db.select().from(answerReviews).where(inArray(answerReviews.messageId, convo.map((m) => m.id)))
    : [];
  const reviewByMsg = new Map(reviews.map((r) => [r.messageId, r.rating]));
  const byId = new Map(convo.map((m) => [m.id, m]));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 lg:px-8">
      <Link href="/clinic/attention" className="inline-flex items-center gap-1 font-display text-[13px] font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Needs attention
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={EYEBROW}>Patient card · synthetic record</p>
          <h1 className="mt-1 font-display text-[26px] font-bold tracking-[-0.02em] text-ink">{patient.alias}</h1>
          <p className="mt-1 text-[14px] text-ink-soft">
            Day {day} · {cycle.protocolName} · schedule v{cycle.scheduleVersion} · prefers {LANGUAGES[patient.language]} · code{" "}
            <code className="rounded bg-sunken px-1 text-ink">{patient.enrollmentCode}</code>
          </p>
        </div>
        <Link href={`/clinic/protocols/import?patient=${patient.id}`} className="inline-flex h-10 items-center rounded-full bg-ink px-4 font-display text-[13.5px] font-semibold text-white">
          Change schedule
        </Link>
      </div>

      {openAlerts.length > 0 && (
        <section className="space-y-3" aria-label="Open items">
          {[...openAlerts].sort((x, y) => (x.severity === y.severity ? 0 : x.severity === "red" ? -1 : 1)).map((a) => {
            const msg = a.messageId ? byId.get(a.messageId) : undefined;
            const reply = msg ? convo.find((m) => m.replyToId === msg.id) : undefined;
            return (
              <div key={a.id} className={`rounded-2xl p-5 ring-1 ${a.severity === "red" ? "bg-alert-soft/60 ring-alert/25" : "bg-caution-soft/50 ring-caution/20"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
                      {a.severity === "red" ? <Siren className="h-4 w-4 text-alert" /> : <Dot tone="amber" />} {a.reason}
                    </p>
                    <p className="mt-1 font-display text-[12.5px] text-ink-soft">
                      {timeAgo(a.createdAt)} ago · {a.status === "open" ? "Open" : a.status === "contacted" ? "Patient contacted" : "Acknowledged"}
                    </p>
                  </div>
                  <AlertActions alertId={a.id} status={a.status} />
                </div>
                {msg && (
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <div className="rounded-xl bg-raised/80 p-3">
                      <p className={EYEBROW}>Patient wrote</p>
                      <p className="mt-1 text-[14px] text-ink">“{msg.content}”</p>
                    </div>
                    {reply && (
                      <div className="rounded-xl bg-raised/80 p-3">
                        <p className={EYEBROW}>Why flagged</p>
                        <p className="mt-1 text-[14px] text-ink">{reply.meta.matchedRule ?? reply.meta.reasonForStaff ?? reply.meta.fallbackReason ?? "—"}</p>
                        {reply.citations[0] && (
                          <p className="mt-2">
                            <SourceTag title={reply.citations[0].documentTitle} page={reply.citations[0].page} version={reply.citations[0].version} />
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      <CarePlanPanel
        patientId={patient.id}
        alias={patient.alias}
        library={library.map((l) => ({ id: l.id, kind: l.kind, title: l.title, summary: l.summary }))}
        items={plan.map((c) => ({
          id: c.id,
          kind: c.kind,
          title: c.title,
          summary: c.summary,
          status: c.status,
          personalNote: c.personalNote,
          dueDate: c.dueDate,
          signedName: c.signedName,
          signedAt: c.signedAt?.toISOString() ?? null,
          signatureHash: c.signatureHash,
          libraryVersion: c.libraryVersion,
          aiSuggested: c.aiSuggested,
          assignedBy: c.assignedByStaffId ? (staffName.get(c.assignedByStaffId) ?? null) : null,
          libraryItemId: c.libraryItemId,
        }))}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <section className={`${CARD} p-5`} aria-label="Schedule">
          <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
            <FileClock className="h-4 w-4 text-ink-faint" /> Clinic-issued schedule
          </h2>
          {cycle.scheduleChangedAt && (
            <p className="mt-2 rounded-xl bg-canvas px-3 py-2 text-[13px] text-ink-soft">
              v{cycle.scheduleVersion}: {cycle.scheduleChangeNote}{" "}
              <strong className="text-ink">{cycle.changeAcknowledgedAt ? "Reviewed by patient" : "Not yet reviewed by patient"}</strong>
            </p>
          )}
          {[addDays(today, -1), today, addDays(today, 1)].map((d) => (
            <div key={d} className="mt-4">
              <p className={EYEBROW}>
                {d === today ? "Today" : d < today ? "Yesterday" : "Tomorrow"} · {shortDate(d)}
              </p>
              <ul className="mt-1.5 space-y-1">
                {schedule
                  .filter((i) => i.date === d)
                  .map((i) => {
                    const s = liveState(i, now, CLINIC_TZ);
                    return (
                      <li key={i.id} className={`flex flex-wrap items-center gap-2 text-[13.5px] ${i.status === "superseded" ? "text-ink-faint line-through" : "text-ink"}`}>
                        <span className="w-[68px] shrink-0 font-display font-semibold text-ink-soft">{formatClock(i.time)}</span>
                        <span className="flex-1">
                          {i.title} {i.dose} <span className="text-ink-faint">v{i.scheduleVersion}</span>
                        </span>
                        {i.status !== "superseded" && s === "done" && (
                          <Chip tone="teal">Confirmed {i.confirmedAt ? formatClock(i.confirmedAt.toLocaleTimeString("en-GB", { timeZone: CLINIC_TZ, hour: "2-digit", minute: "2-digit" })) : ""}</Chip>
                        )}
                        {i.status !== "superseded" && s === "missed" && <Chip tone="red">Not confirmed</Chip>}
                        {i.status !== "superseded" && (s === "due" || s === "snoozed") && <Chip tone="amber">{s === "due" ? "Due" : "Snoozed"}</Chip>}
                        {i.reminderStyle && i.remindedAt && <Chip tone="neutral">nudge: {i.reminderStyle}</Chip>}
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </section>

        <section className={`${CARD} p-5`} aria-label="Conversation">
          <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
            <MessageSquare className="h-4 w-4 text-ink-faint" /> Messages & cited AI answers
          </h2>
          {convo.length === 0 && <p className="mt-3 text-[14px] text-ink-soft">No messages yet.</p>}
          <div className="mt-3 space-y-3">
            {convo.map((m) =>
              m.role === "patient" ? (
                <div key={m.id} className="flex gap-2">
                  <UserRound className="mt-1 h-4 w-4 shrink-0 text-ink-faint" />
                  <div>
                    <p className="text-[14px] text-ink">{m.content}</p>
                    <p className="mt-0.5 flex items-center gap-2 font-display text-[11.5px] text-ink-faint">
                      {timeAgo(m.createdAt)} ago {m.triage && <Chip tone={TRIAGE_TONE[m.triage]}>{m.triage.replace("_", " ")}</Chip>}
                    </p>
                  </div>
                </div>
              ) : (
                <div key={m.id} className="ml-6 rounded-xl bg-canvas p-3">
                  <p className="flex flex-wrap items-center gap-2 font-display text-[12px] font-semibold text-ink-soft">
                    {m.role === "staff" ? (
                      <>
                        <UserRound className="h-3.5 w-3.5" /> Care team · {m.meta?.staffName ?? "Staff"} · {timeAgo(m.createdAt)} ago
                      </>
                    ) : (
                      <>
                        <Bot className="h-3.5 w-3.5" /> {m.outcome ? OUTCOME_LABEL[m.outcome] : "Assistant"}
                      </>
                    )}
                  </p>
                  {m.contentEnglish ? (
                    <div className="mt-1.5 grid gap-2 md:grid-cols-2">
                      <div>
                        <p className={EYEBROW}>Approved English</p>
                        <p className="mt-0.5 text-[13.5px] text-ink">{m.contentEnglish}</p>
                      </div>
                      <div>
                        <p className={EYEBROW}>Shown to patient · {LANGUAGES[m.language]}</p>
                        <p className="mt-0.5 text-[13.5px] text-ink">{m.content}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1.5 text-[13.5px] text-ink">{m.content}</p>
                  )}
                  {m.citations.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.citations.map((c) => (
                        <SourceTag key={c.chunkId} title={c.documentTitle} page={c.page} version={c.version} />
                      ))}
                    </div>
                  )}
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-display text-[11.5px] text-ink-faint">
                    <span className="inline-flex items-center gap-1">
                      <Cpu className="h-3 w-3" /> {m.meta.model ?? "deterministic"} · {m.meta.promptVersion ?? "rules-v1"}
                    </span>
                    {m.meta.latencyMs != null && <span>{(m.meta.latencyMs / 1000).toFixed(1)}s</span>}
                    {m.meta.retrievalScore != null && <span>evidence {m.meta.retrievalScore.toFixed(2)}</span>}
                    {m.meta.fallback && <span>offline fallback</span>}
                    {m.meta.translationLocked?.length ? <span>{m.meta.translationLocked.length} terms locked in translation</span> : null}
                  </p>
                  {(m.meta.reasonForStaff || m.meta.fallbackReason) && (
                    <p className="mt-1 text-[12.5px] text-ink-soft">
                      {m.meta.reasonForStaff}
                      {m.meta.fallbackReason && ` (${m.meta.fallbackReason})`}
                    </p>
                  )}
                  {(m.outcome === "answered" || m.outcome === "withheld") && (
                    <div className="mt-2">
                      <ReviewButtons messageId={m.id} current={reviewByMsg.get(m.id)} />
                    </div>
                  )}
                </div>
              ),
            )}
          </div>
        </section>
      </div>

      <section className={`${CARD} p-5`} aria-label="Audit trail">
        <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
          <History className="h-4 w-4 text-ink-faint" /> Audit trail
        </h2>
        <ol className="mt-3 divide-y divide-line">
          {audit.map((e) => (
            <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2 text-[13px]">
              <span className="w-16 shrink-0 font-display text-ink-faint">{timeAgo(e.createdAt)}</span>
              <Chip tone={e.actorType === "ai" ? "navy" : e.actorType === "staff" ? "teal" : "neutral"}>{e.actorType}</Chip>
              <span className="flex-1 text-ink">{e.summary}</span>
              <code className="text-[11px] text-ink-faint">{e.action}</code>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
