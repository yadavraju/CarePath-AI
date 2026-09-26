import Link from "next/link";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { BellRing, CalendarClock, ChevronRight, RefreshCw, Sparkles } from "lucide-react";
import { CareKindIcon, isDone } from "@/components/CareKind";
import { DemoClock } from "@/components/DemoClock";
import { ConfirmButton, SnoozeButton } from "@/components/patient/ItemActions";
import { AskPanel } from "@/components/patient/AskPanel";
import { AcknowledgeButton } from "@/components/patient/AcknowledgeButton";
import { Chip, Dot, EYEBROW, SourceTag } from "@/components/ui";
import { db } from "@/db";
import { careItems, documents, messages, scheduleItems, type ScheduleItem } from "@/db/schema";
import { DEMO_QUESTIONS } from "@/demo/content";
import { CLINIC_TZ } from "@/lib/brand";
import { nudgeText } from "@/lib/nudge";
import { liveState, type LiveState } from "@/lib/schedule";
import { addDays, daysBetween, localDate, shortDate, weekdayLabel } from "@/lib/time";
import { formatClock } from "@/lib/utils";
import { clinicNow, requirePatient } from "@/server/context";
import { fireReminders, sweepMissed } from "@/server/reminders";
import { setPatientDemoClock } from "./actions";

export const dynamic = "force-dynamic";

const STATE_CHIP: Record<LiveState, { tone: "teal" | "red" | "amber" | "neutral"; label: string }> = {
  done: { tone: "teal", label: "Done" },
  due: { tone: "amber", label: "Due now" },
  snoozed: { tone: "neutral", label: "Snoozed" },
  upcoming: { tone: "teal", label: "Upcoming" },
  later: { tone: "neutral", label: "Later" },
  missed: { tone: "red", label: "Not confirmed" },
};

/** Doses due at the same moment get one reminder and one confirmation. */
function groupByTime(items: ScheduleItem[]) {
  const groups = new Map<string, ScheduleItem[]>();
  for (const i of items) groups.set(i.time, [...(groups.get(i.time) ?? []), i]);
  return [...groups.values()];
}

function greeting(hour: number) {
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export default async function Today() {
  const { patient, clinic, cycle } = await requirePatient();
  await sweepMissed(clinic);
  const due = await fireReminders(clinic, cycle.id, patient.id);

  const now = clinicNow(clinic);
  const today = localDate(now, CLINIC_TZ);
  const tomorrow = addDays(today, 1);
  const cycleDay = daysBetween(cycle.startDate, today) + 1;
  const hour = Number(now.toLocaleString("en-US", { timeZone: CLINIC_TZ, hour: "numeric", hourCycle: "h23" }));

  const items = await db
    .select()
    .from(scheduleItems)
    .where(and(eq(scheduleItems.cycleId, cycle.id), inArray(scheduleItems.date, [today, tomorrow])))
    .orderBy(asc(scheduleItems.date), asc(scheduleItems.time));
  const live = items.filter((i) => i.status !== "superseded");
  const todays = live.filter((i) => i.date === today);
  const tomorrows = live.filter((i) => i.date === tomorrow);
  const supersededTomorrow = items.filter((i) => i.date === tomorrow && i.status === "superseded");

  const docIds = [...new Set(live.map((i) => i.sourceDocumentId).filter(Boolean))] as string[];
  const docs = docIds.length ? await db.select().from(documents).where(inArray(documents.id, docIds)) : [];
  const docById = new Map(docs.map((d) => [d.id, d]));

  const history = (
    await db.select().from(messages).where(eq(messages.cycleId, cycle.id)).orderBy(desc(messages.createdAt)).limit(20)
  ).reverse();

  const care = await db.select().from(careItems).where(eq(careItems.patientId, patient.id)).orderBy(asc(careItems.dueDate));
  // Consents first — they block treatment — then anything due soonest.
  const pendingCare = care
    .filter((c) => !isDone(c.status, c.kind))
    .sort((a, b) => (a.kind === "consent" ? 0 : 1) - (b.kind === "consent" ? 0 : 1) || (a.dueDate ?? "9").localeCompare(b.dueDate ?? "9"));

  const changePending = cycle.scheduleChangedAt && !cycle.changeAcknowledgedAt;
  const remaining = todays.filter((i) => i.status === "pending").length;
  const nowLabel = now.toLocaleTimeString("en-US", { timeZone: CLINIC_TZ, hour: "numeric", minute: "2-digit" });

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 pt-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={EYEBROW}>
            {weekdayLabel(today)} · Day {cycleDay} · {cycle.protocolName}
          </p>
          <h1 className="mt-1 font-display text-[26px] font-bold tracking-[-0.02em] text-ink">
            {greeting(hour)}, {patient.alias.split(" ")[0]}
          </h1>
          <p className="mt-1 text-[14.5px] text-ink-soft">
            {remaining === 0 ? "You’re all done for today." : `${remaining} thing${remaining === 1 ? "" : "s"} left today.`}
          </p>
        </div>
        {clinic.isDemo && <DemoClock nowLabel={nowLabel} offset={clinic.demoOffsetMinutes} onSet={setPatientDemoClock} />}
      </div>

      {groupByTime(due).map((group) => {
        const ids = group.map((i) => i.id);
        const meds = group.map((i) => (i.dose ? `${i.title} ${i.dose}` : i.title)).join(" + ");
        return (
          <div key={ids.join()} className="animate-rise rounded-3xl bg-navy p-5 text-white shadow-lg">
            <p className="flex items-center gap-2 font-display text-[12px] font-semibold uppercase tracking-[0.12em] text-white/70">
              <BellRing className="h-4 w-4" /> Reminder
            </p>
            <p className="mt-2 font-display text-[18px] font-semibold leading-snug">
              {nudgeText(group[0].reminderStyle ?? "plain", { title: meds, dose: null, timeLabel: formatClock(group[0].time) })}
            </p>
            <div className="mt-4 flex gap-2">
              <ConfirmButton itemId={ids} label={group.length > 1 ? "I’ve taken both" : "I’ve taken it"} onDark />
              <SnoozeButton itemId={ids} />
            </div>
          </div>
        );
      })}

      {changePending && (
        <div className="rounded-3xl bg-caution-soft/70 p-5 ring-1 ring-caution/25">
          <p className="flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
            <RefreshCw className="h-4 w-4 text-caution" /> Your care team changed your schedule
          </p>
          <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink">{cycle.scheduleChangeNote}</p>
          {supersededTomorrow.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {tomorrows
                .filter((i) => i.changedInVersion)
                .map((i) => {
                  const old = supersededTomorrow.find((s) => s.title === i.title);
                  return (
                    <li key={i.id} className="rounded-xl bg-raised/80 px-3 py-2 text-[14px] text-ink">
                      Tomorrow {formatClock(i.time)} · <strong>{i.title} {i.dose}</strong>
                      {old?.dose && <span className="ml-1.5 text-ink-faint line-through">{old.dose}</span>}
                    </li>
                  );
                })}
            </ul>
          )}
          <div className="mt-3 flex items-center gap-3">
            <AcknowledgeButton />
            <span className="font-display text-[12px] text-ink-soft">Schedule v{cycle.scheduleVersion} · issued by your clinic</span>
          </div>
        </div>
      )}

      {pendingCare.length > 0 && (
        <section className="rounded-3xl bg-raised p-2 ring-1 ring-line" aria-label="From your care team">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
              <Sparkles className="h-4 w-4 text-teal" /> From your care team
            </h2>
            <Link href="/patient/care" className="inline-flex items-center gap-1 font-display text-[12.5px] font-semibold text-ink-soft hover:text-ink">
              All {pendingCare.length} <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <ul>
            {pendingCare.slice(0, 3).map((c) => (
              <li key={c.id}>
                <Link href={`/patient/care/${c.id}`} className="flex items-center gap-3 rounded-2xl px-4 py-3 transition hover:bg-canvas/60">
                  <CareKindIcon kind={c.kind} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-[14.5px] font-semibold text-ink">{c.title}</p>
                    <p className="truncate text-[13px] text-ink-soft">{c.personalNote ?? c.summary}</p>
                  </div>
                  {c.kind === "consent" ? <Chip tone="amber">Sign</Chip> : c.dueDate ? <Chip tone="neutral">Due {shortDate(c.dueDate)}</Chip> : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-3xl bg-raised p-2 ring-1 ring-line" aria-label="Today's plan">
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <h2 className="font-display text-[15px] font-semibold text-ink">Today · {shortDate(today)}</h2>
          <Link href="/patient/plan" className="inline-flex items-center gap-1 font-display text-[12.5px] font-semibold text-ink-soft hover:text-ink">
            Full plan <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {todays.length === 0 && <p className="px-4 py-6 text-[14px] text-ink-soft">Nothing scheduled today.</p>}
        <ul>
          {todays.map((item) => (
            <TodayRow key={item.id} item={item} state={liveState(item, now, CLINIC_TZ)} doc={item.sourceDocumentId ? docById.get(item.sourceDocumentId) : undefined} />
          ))}
        </ul>
      </section>

      {tomorrows.length > 0 && (
        <section className="rounded-3xl bg-raised/60 px-5 py-4 ring-1 ring-line">
          <h2 className="flex items-center gap-2 font-display text-[14px] font-semibold text-ink-soft">
            <CalendarClock className="h-4 w-4" /> Tomorrow · Day {cycleDay + 1}
          </h2>
          <ul className="mt-2 space-y-1">
            {tomorrows.map((i) => (
              <li key={i.id} className="flex items-center gap-2 text-[14px] text-ink">
                <span className="w-[72px] shrink-0 font-display font-semibold text-ink-soft">{formatClock(i.time)}</span>
                {i.title} {i.dose}
                {i.changedInVersion && <Chip tone="amber">Changed</Chip>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <AskPanel
        initial={history}
        suggestions={DEMO_QUESTIONS}
        language={patient.language}
        urgentLine={clinic.urgentLine}
        urgentLineLabel={clinic.urgentLineLabel}
      />
    </div>
  );
}

function TodayRow({ item, state, doc }: { item: ScheduleItem; state: LiveState; doc?: { title: string; version: number } }) {
  const chip = STATE_CHIP[state];
  const dot = state === "done" ? "teal" : state === "missed" ? "red" : state === "due" ? "amber" : "neutral";
  return (
    <li className="flex items-start gap-3 rounded-2xl px-4 py-3.5 transition hover:bg-canvas/60">
      <Dot tone={dot} className="mt-1.5" />
      <div className="min-w-0 flex-1">
        <p className="font-display text-[15px] font-semibold text-ink">
          {formatClock(item.time)} · {item.title}
          {item.dose && <span className="text-ink-soft"> {item.dose}</span>}
        </p>
        <p className="mt-0.5 text-[13.5px] leading-relaxed text-ink-soft">{item.instruction}</p>
        {doc && item.sourcePage && (
          <p className="mt-1.5">
            <SourceTag title={doc.title} page={item.sourcePage} version={doc.version} />
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <Chip tone={chip.tone}>{chip.label}</Chip>
        {item.kind === "medication" && (state === "due" || state === "upcoming" || state === "snoozed") && <ConfirmButton itemId={item.id} />}
        {item.kind === "medication" && state === "missed" && <ConfirmButton itemId={item.id} label="I took it" late />}
      </div>
    </li>
  );
}
