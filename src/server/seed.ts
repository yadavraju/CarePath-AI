import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  alerts,
  auditEvents,
  clinics,
  cycles,
  messages,
  patients,
  scheduleItems,
  staff,
  urgentRules,
  type NudgeStyle,
  type StaffRole,
} from "@/db/schema";
import { DEMO_CLINIC, DEMO_DOCUMENTS, DEMO_PATIENT_CODE, DEMO_PROTOCOL_TEXT, OTHER_PATIENTS } from "@/demo/content";
import { CLINIC_TZ } from "@/lib/brand";
import { expandItems, parseProtocolText } from "@/lib/protocol/parse";
import { DEFAULT_URGENT_RULES } from "@/lib/safety/rules";
import { dueAt, windowEnd } from "@/lib/schedule";
import { addDays, localDate } from "@/lib/time";
import { formatClock } from "@/lib/utils";
import { ingestDocument } from "./documents";
import { seedLibraryAndCare } from "./seedCare";

const STYLES: NudgeStyle[] = ["plain", "why", "checklist"];

function hhmm(d: Date) {
  const s = d.toLocaleTimeString("en-GB", { timeZone: CLINIC_TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return s;
}

/**
 * Deletes and rebuilds the demo clinic. Anyone already linked (staff logins,
 * the demo patient's login) is re-linked, so a presenter can reset between
 * rehearsals without signing up again.
 */
export async function seedDemoClinic() {
  const [existing] = await db.select().from(clinics).where(eq(clinics.slug, DEMO_CLINIC.slug));
  let keepStaff: { clerkUserId: string; name: string; role: StaffRole; createdAt: Date }[] = [];
  let keepPatientUser: string | null = null;
  if (existing) {
    keepStaff = (await db.select().from(staff).where(eq(staff.clinicId, existing.id)))
      .filter((s) => s.clerkUserId)
      // createdAt is kept: it decides which clinic is a login's active workspace.
      .map((s) => ({ clerkUserId: s.clerkUserId!, name: s.name, role: s.role, createdAt: s.createdAt }));
    const [lead] = await db
      .select()
      .from(patients)
      .where(and(eq(patients.clinicId, existing.id), eq(patients.isDemoLead, true)));
    keepPatientUser = lead?.clerkUserId ?? null;
    await db.delete(clinics).where(eq(clinics.id, existing.id));
  }

  const [clinic] = await db.insert(clinics).values({ ...DEMO_CLINIC, isDemo: true }).returning();

  await db.insert(urgentRules).values(DEFAULT_URGENT_RULES.map((r) => ({ clinicId: clinic.id, label: r.label, phrases: r.phrases })));

  if (keepStaff.length) await db.insert(staff).values(keepStaff.map((s) => ({ ...s, clinicId: clinic.id })));

  await seedSampleContent(clinic.id, { leadUser: keepPatientUser });

  await db.insert(auditEvents).values({
    clinicId: clinic.id,
    actorType: "system",
    actorId: "seed",
    action: "demo.seeded",
    summary: "Demo clinic seeded with synthetic patients and sample documents",
  });

  return clinic;
}

/**
 * The sample content: care team, approved guides, Maya plus seventeen other
 * synthetic cycles, open signals, care library. Used by the demo clinic and,
 * in demo mode, by a new clinic that asks for mock data. Enrollment codes are
 * globally unique, so any clinic other than the demo passes a `codeSuffix`.
 * Returns the lead patient's enrollment code.
 */
export async function seedSampleContent(clinicId: string, { leadUser = null, codeSuffix = "" }: { leadUser?: string | null; codeSuffix?: string } = {}) {
  const clinic = { id: clinicId };
  const now = new Date();
  const today = localDate(now, CLINIC_TZ);
  const leadCode = `${DEMO_PATIENT_CODE}${codeSuffix}`;

  const [nurse] = await db
    .insert(staff)
    .values({ clinicId: clinic.id, name: "Nurse Dana (sample)", role: "nurse" })
    .returning();

  const docIds: Record<string, string> = {};
  for (const d of DEMO_DOCUMENTS) {
    const { doc } = await ingestDocument({
      clinicId: clinic.id,
      title: d.title,
      kind: d.kind,
      version: d.version,
      text: d.text,
      status: "approved",
      approvedByStaffId: nurse.id,
    });
    docIds[d.kind] = doc.id;
  }

  // ---- The demo patient: Day 7 today, with a clinic-issued change for tomorrow.
  const mayaStart = addDays(today, -6);
  const [maya] = await db
    .insert(patients)
    .values({ clinicId: clinic.id, alias: "Maya R.", language: "en", enrollmentCode: leadCode, clerkUserId: leadUser, isDemoLead: true })
    .returning();
  const [mayaCycle] = await db
    .insert(cycles)
    .values({
      clinicId: clinic.id,
      patientId: maya.id,
      protocolName: "Antagonist stimulation (sample)",
      startDate: mayaStart,
      scheduleVersion: 2,
      scheduleChangedAt: new Date(now.getTime() - 95 * 60000),
      scheduleChangeNote: "Nurse Dana updated your plan after your Day 5 results: Gonal-F from tomorrow (Day 8) is 150 IU, down from 225 IU.",
    })
    .returning();

  const rows = expandItems(parseProtocolText(DEMO_PROTOCOL_TEXT).items, mayaStart);
  let styleIdx = 0;
  const mayaItems = rows.flatMap((r): (typeof scheduleItems.$inferInsert)[] => {
    const base = {
      clinicId: clinic.id,
      cycleId: mayaCycle.id,
      ...r,
      sourceDocumentId: r.kind === "appointment" ? docIds.faq : docIds.medication_guide,
      createdByStaffId: nurse.id,
    };
    const end = windowEnd(r, CLINIC_TZ);
    const due = dueAt(r, CLINIC_TZ);
    const past = end.getTime() < now.getTime();
    const style = STYLES[styleIdx++ % 3];
    const done = past
      ? {
          status: "confirmed" as const,
          confirmedAt: new Date(due.getTime() + ((styleIdx * 7) % 40) * 60000),
          remindedAt: new Date(due.getTime() - 30 * 60000),
          reminderStyle: r.kind === "medication" ? style : null,
        }
      : {};
    // Version 2: Gonal-F from Day 8 drops to 150 IU. The v1 rows stay as history.
    if (r.title === "Gonal-F" && r.cycleDay >= 8) {
      return [
        { ...base, scheduleVersion: 1, status: "superseded" },
        { ...base, dose: "150 IU", scheduleVersion: 2, changedInVersion: true, ...done },
      ];
    }
    return [{ ...base, ...done }];
  });
  await db.insert(scheduleItems).values(mayaItems);

  // ---- Seventeen more active cycles, most with no open signal.
  for (const [i, p] of OTHER_PATIENTS.entries()) {
    const start = addDays(today, -(p.day - 1));
    const [pat] = await db
      .insert(patients)
      .values({ clinicId: clinic.id, alias: p.alias, language: p.language, enrollmentCode: `${p.alias.split(" ")[0].toUpperCase()}-${p.day}${i}${codeSuffix}` })
      .returning();
    const [cyc] = await db
      .insert(cycles)
      .values({ clinicId: clinic.id, patientId: pat.id, protocolName: "Antagonist stimulation (sample)", startDate: start })
      .returning();
    const items = expandItems(parseProtocolText(DEMO_PROTOCOL_TEXT).items, start)
      .filter((r) => r.date === today || r.date === addDays(today, -1))
      .map((r) => {
        const past = windowEnd(r, CLINIC_TZ).getTime() < now.getTime();
        const due = dueAt(r, CLINIC_TZ);
        return {
          clinicId: clinic.id,
          cycleId: cyc.id,
          ...r,
          sourceDocumentId: docIds.medication_guide,
          createdByStaffId: nurse.id,
          ...(past ? { status: "confirmed" as const, confirmedAt: new Date(due.getTime() + (i % 5) * 6 * 60000) } : {}),
        };
      });
    if (items.length) await db.insert(scheduleItems).values(items);

    // Patient B — a medication not confirmed 42 minutes ago.
    if (p.alias === "Priya S.") {
      const due = new Date(now.getTime() - 102 * 60000);
      const [item] = await db
        .insert(scheduleItems)
        .values({
          clinicId: clinic.id,
          cycleId: cyc.id,
          kind: "medication",
          cycleDay: p.day,
          date: localDate(due, CLINIC_TZ),
          time: hhmm(due),
          title: "Cetrotide",
          dose: "0.25 mg",
          instruction: "Morning injection to prevent early ovulation.",
          sourceDocumentId: docIds.medication_guide,
          sourcePage: 3,
          status: "missed",
          remindedAt: new Date(due.getTime() - 30 * 60000),
          reminderStyle: "plain",
        })
        .returning();
      await db.insert(alerts).values({
        clinicId: clinic.id,
        patientId: pat.id,
        cycleId: cyc.id,
        severity: "amber",
        kind: "missed_confirmation",
        reason: `Medication not confirmed — Cetrotide 0.25 mg due ${formatClock(hhmm(due))}`,
        scheduleItemId: item.id,
        createdAt: new Date(now.getTime() - 42 * 60000),
      });
    }

    // Patient C — a question the protocol does not cover, in Spanish.
    if (p.alias === "Ana G.") {
      const asked = new Date(now.getTime() - 12 * 60000);
      const [q] = await db
        .insert(messages)
        .values({
          clinicId: clinic.id,
          cycleId: cyc.id,
          patientId: pat.id,
          role: "patient",
          content: "¿Puedo tomar té de hierbas durante la estimulación?",
          language: "es",
          triage: "needs_review",
          createdAt: asked,
        })
        .returning();
      await db.insert(messages).values({
        clinicId: clinic.id,
        cycleId: cyc.id,
        patientId: pat.id,
        role: "assistant",
        content:
          "Necesito que tu equipo de atención responda esto. No lo encontré en las guías aprobadas por tu clínica, así que no voy a adivinar. Envié tu pregunta a tu enfermera.",
        contentEnglish:
          "I need your care team to answer this. I couldn't find it in your clinic's approved guides, so I won't guess. I've sent your question to your nurse.",
        language: "es",
        triage: "needs_review",
        outcome: "withheld",
        meta: { fallbackReason: "Not supported by approved clinic content", reasonForStaff: "Asks whether herbal tea is okay during stimulation; not covered by clinic guides." },
        replyToId: q.id,
        createdAt: asked,
      });
      await db.insert(alerts).values({
        clinicId: clinic.id,
        patientId: pat.id,
        cycleId: cyc.id,
        severity: "amber",
        kind: "unsupported_question",
        reason: "Question not supported by protocol — herbal tea during stimulation",
        messageId: q.id,
        createdAt: asked,
      });
    }
  }

  await seedLibraryAndCare(clinic.id);
  return leadCode;
}
