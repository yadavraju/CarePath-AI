import "server-only";
import { and, eq, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import { alerts, auditEvents, cycles, scheduleItems, type Clinic } from "@/db/schema";
import { CLINIC_TZ } from "@/lib/brand";
import { selectNudgeStyle, type NudgeHistory } from "@/lib/nudge";
import { dueAt, isOverdue, liveState } from "@/lib/schedule";
import { localDate } from "@/lib/time";
import { formatClock } from "@/lib/utils";
import { clinicNow } from "./clock";

/**
 * Closes confirmation windows that passed in silence: the item becomes
 * "missed" and the nurse gets an amber "not confirmed" item. Silence is never
 * read as "fine" — it is surfaced.
 *
 * Idempotent and cheap, so it runs on every dashboard and patient page load
 * instead of needing a cron for the demo.
 */
export async function sweepMissed(clinic: Clinic) {
  const now = clinicNow(clinic);
  const today = localDate(now, CLINIC_TZ);
  const candidates = await db
    .select({ item: scheduleItems, patientId: cycles.patientId })
    .from(scheduleItems)
    .innerJoin(cycles, eq(scheduleItems.cycleId, cycles.id))
    .where(
      and(
        eq(scheduleItems.clinicId, clinic.id),
        eq(scheduleItems.status, "pending"),
        lte(scheduleItems.date, today),
        eq(cycles.status, "active"),
      ),
    );

  const overdue = candidates.filter((c) => isOverdue(c.item, now, CLINIC_TZ));
  if (overdue.length === 0) return 0;

  await db
    .update(scheduleItems)
    .set({ status: "missed" })
    .where(and(inArray(scheduleItems.id, overdue.map((o) => o.item.id)), eq(scheduleItems.status, "pending")));

  const meds = overdue.filter((o) => o.item.kind === "medication");
  if (meds.length) {
    await db.insert(alerts).values(
      meds.map((o) => ({
        clinicId: clinic.id,
        patientId: o.patientId,
        cycleId: o.item.cycleId,
        severity: "amber" as const,
        kind: "missed_confirmation" as const,
        reason: `Medication not confirmed — ${o.item.title}${o.item.dose ? ` ${o.item.dose}` : ""} due ${formatClock(o.item.time)}`,
        scheduleItemId: o.item.id,
      })),
    );
    await db.insert(auditEvents).values(
      meds.map((o) => ({
        clinicId: clinic.id,
        patientId: o.patientId,
        actorType: "system" as const,
        actorId: "reminder-sweep",
        action: "schedule.missed",
        summary: `Confirmation window closed without check-in: ${o.item.title} ${formatClock(o.item.time)}`,
        data: { scheduleItemId: o.item.id },
      })),
    );
  }
  return overdue.length;
}

/**
 * Fires reminders for items that just entered their "due" window, choosing the
 * wording with the nudge selector. Returns the active reminder, if any.
 */
export async function fireReminders(clinic: Clinic, cycleId: string, patientId: string) {
  const now = clinicNow(clinic);
  const items = await db.select().from(scheduleItems).where(eq(scheduleItems.cycleId, cycleId));
  const history: NudgeHistory = items
    .filter((i) => i.reminderStyle && i.remindedAt && (i.status === "confirmed" || i.status === "missed"))
    .map((i) => ({
      style: i.reminderStyle!,
      minutesToConfirm: i.confirmedAt ? Math.max(0, (i.confirmedAt.getTime() - dueAt(i, CLINIC_TZ).getTime()) / 60000) : null,
    }));

  const due = items.filter((i) => i.kind === "medication" && liveState(i, now, CLINIC_TZ) === "due");
  const fresh = due.filter((i) => !i.remindedAt);
  if (fresh.length) {
    const { style, reason } = selectNudgeStyle(history);
    await db
      .update(scheduleItems)
      .set({ remindedAt: now, reminderStyle: style })
      .where(inArray(scheduleItems.id, fresh.map((i) => i.id)));
    await db.insert(auditEvents).values({
      clinicId: clinic.id,
      patientId,
      actorType: "ai",
      actorId: "nudge-selector",
      action: "reminder.sent",
      summary: `Reminder sent for ${fresh.map((i) => i.title).join(" + ")} · wording "${style}"`,
      data: { reason, items: fresh.map((i) => i.id) },
    });
    for (const f of fresh) Object.assign(f, { remindedAt: now, reminderStyle: style });
  }
  return due;
}
