"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auditEvents, careItems, cycles, patients, scheduleItems, type Language } from "@/db/schema";
import { CLINIC_TZ } from "@/lib/brand";
import { dueAt } from "@/lib/schedule";
import { askQuestion } from "@/server/ask";
import { explainConsent } from "@/server/care";
import { signatureHash } from "@/server/signature";
import { clinicNow, patientForAction } from "@/server/context";
import { setDemoClock, type ClockPreset } from "@/server/demo";

/** Tiny per-process limiter: enough to stop a stuck client from hammering the model. */
const recent = new Map<string, number[]>();
function allow(key: string, max = 12, windowMs = 60_000) {
  const now = Date.now();
  const hits = (recent.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) return false;
  hits.push(now);
  recent.set(key, hits);
  return true;
}

async function ownItem(itemId: string) {
  const ctx = await patientForAction();
  const [item] = await db
    .select()
    .from(scheduleItems)
    .where(and(eq(scheduleItems.id, itemId), eq(scheduleItems.cycleId, ctx.cycle.id)));
  if (!item) throw new Error("Not found");
  return { ...ctx, item };
}

export async function confirmItem(itemId: string) {
  const { clinic, patient, item } = await ownItem(itemId);
  if (item.status === "confirmed" || item.status === "superseded") return;
  const now = clinicNow(clinic);
  await db.update(scheduleItems).set({ status: "confirmed", confirmedAt: now }).where(eq(scheduleItems.id, item.id));
  const late = Math.round((now.getTime() - dueAt(item, CLINIC_TZ).getTime()) / 60000);
  await db.insert(auditEvents).values({
    clinicId: clinic.id,
    patientId: patient.id,
    actorType: "patient",
    actorId: patient.id,
    action: "schedule.confirmed",
    summary: `Confirmed ${item.title}${item.dose ? ` ${item.dose}` : ""}${item.status === "missed" ? " after the window closed" : ""}`,
    data: { scheduleItemId: item.id, minutesFromDue: late, reminderStyle: item.reminderStyle },
  });
  revalidatePath("/patient");
}

export async function snoozeItem(itemId: string) {
  const { clinic, patient, item } = await ownItem(itemId);
  if (item.status !== "pending") return;
  const until = new Date(clinicNow(clinic).getTime() + 15 * 60000);
  await db.update(scheduleItems).set({ snoozedUntil: until }).where(eq(scheduleItems.id, item.id));
  await db.insert(auditEvents).values({
    clinicId: clinic.id,
    patientId: patient.id,
    actorType: "patient",
    actorId: patient.id,
    action: "schedule.snoozed",
    summary: `Snoozed reminder for ${item.title} by 15 min`,
    data: { scheduleItemId: item.id },
  });
  revalidatePath("/patient");
}

export async function acknowledgeChange() {
  const { clinic, patient, cycle } = await patientForAction();
  await db.update(cycles).set({ changeAcknowledgedAt: new Date() }).where(eq(cycles.id, cycle.id));
  await db.insert(auditEvents).values({
    clinicId: clinic.id,
    patientId: patient.id,
    actorType: "patient",
    actorId: patient.id,
    action: "schedule.change_reviewed",
    summary: `Reviewed schedule version ${cycle.scheduleVersion}`,
  });
  revalidatePath("/patient");
}

const QuestionSchema = z.string().trim().min(2).max(600);

export async function ask(question: string) {
  const ctx = await patientForAction();
  const parsed = QuestionSchema.safeParse(question);
  if (!parsed.success) return { error: "Please type a question (up to 600 characters)." };
  if (!allow(ctx.patient.id)) return { error: "You’re sending messages quickly — please wait a moment." };
  const result = await askQuestion(ctx, parsed.data);
  revalidatePath("/patient");
  return result;
}

const LanguageSchema = z.enum(["en", "es", "hi", "ne"]);

export async function setLanguage(language: Language) {
  const { patient } = await patientForAction();
  const lang = LanguageSchema.parse(language);
  await db.update(patients).set({ language: lang }).where(eq(patients.id, patient.id));
  revalidatePath("/patient");
}

export async function setPatientDemoClock(preset: ClockPreset) {
  const { clinic, patient } = await patientForAction();
  await setDemoClock(clinic, preset, patient.id);
  revalidatePath("/patient");
}

/* ------------------------------------------------------------- Care plan -- */

async function ownCare(careItemId: string) {
  const ctx = await patientForAction();
  const [item] = await db.select().from(careItems).where(and(eq(careItems.id, careItemId), eq(careItems.patientId, ctx.patient.id)));
  if (!item) throw new Error("Not found");
  return { ...ctx, item };
}

export async function markCareViewed(careItemId: string) {
  const { item } = await ownCare(careItemId);
  if (item.status !== "assigned") return;
  await db.update(careItems).set({ status: "viewed", viewedAt: new Date() }).where(eq(careItems.id, item.id));
  revalidatePath("/patient", "layout");
}

export async function completeCareItem(careItemId: string) {
  const { clinic, patient, item } = await ownCare(careItemId);
  if (item.kind === "consent") throw new Error("Consents are signed, not completed.");
  if (item.status === "completed") return;
  await db.update(careItems).set({ status: "completed", completedAt: new Date(), viewedAt: item.viewedAt ?? new Date() }).where(eq(careItems.id, item.id));
  await db.insert(auditEvents).values({
    clinicId: clinic.id,
    patientId: patient.id,
    actorType: "patient",
    actorId: patient.id,
    action: "care.completed",
    summary: `${patient.alias} completed “${item.title}”`,
  });
  revalidatePath("/patient", "layout");
  revalidatePath("/clinic", "layout");
}

const SignSchema = z.object({ name: z.string().trim().min(2).max(80), agree: z.literal(true) });

export async function signConsent(careItemId: string, name: string, agree: boolean) {
  const { clinic, patient, item } = await ownCare(careItemId);
  if (item.kind !== "consent") throw new Error("Only consent forms can be signed.");
  if (item.status === "signed") return { ok: true as const };
  const parsed = SignSchema.safeParse({ name, agree });
  if (!parsed.success) return { error: "Type your full name and tick the box to sign." };
  const at = new Date();
  const hash = signatureHash({ title: item.title, body: item.body, name: parsed.data.name, at, patientId: patient.id });
  await db
    .update(careItems)
    .set({ status: "signed", signedName: parsed.data.name, signedAt: at, signatureHash: hash, viewedAt: item.viewedAt ?? at })
    .where(eq(careItems.id, item.id));
  await db.insert(auditEvents).values({
    clinicId: clinic.id,
    patientId: patient.id,
    actorType: "patient",
    actorId: patient.id,
    action: "care.signed",
    summary: `${patient.alias} signed “${item.title}” v${item.libraryVersion ?? 1} as “${parsed.data.name}”`,
    data: { signatureHash: hash, careItemId: item.id },
  });
  revalidatePath("/patient", "layout");
  revalidatePath("/clinic", "layout");
  return { ok: true as const };
}

export async function explainConsentAction(careItemId: string) {
  const { patient, item } = await ownCare(careItemId);
  if (item.kind !== "consent") throw new Error("Not a consent");
  return explainConsent(item, patient.language);
}
