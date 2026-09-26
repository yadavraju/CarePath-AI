"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auditEvents, clinics, patients, staff, urgentRules, type StaffRole } from "@/db/schema";
import { DEMO_CLINIC } from "@/demo/content";
import { DEFAULT_URGENT_RULES } from "@/lib/safety/rules";
import { staffForAction } from "@/server/context";
import { demoEnabled, linkDemoRoles } from "@/server/demoAccess";
import { seedDemoClinic, seedSampleContent } from "@/server/seed";

async function demoClinic() {
  const [clinic] = await db.select().from(clinics).where(eq(clinics.slug, DEMO_CLINIC.slug));
  return clinic ?? (await seedDemoClinic());
}

export async function joinDemoClinicAsStaff() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const user = await currentUser();
  const clinic = await demoClinic();
  const [existing] = await db
    .select()
    .from(staff)
    .where(and(eq(staff.clinicId, clinic.id), eq(staff.clerkUserId, userId)));
  if (!existing) {
    const name = user?.firstName ? `${user.firstName}${user.lastName ? ` ${user.lastName[0]}.` : ""}` : "Care coordinator";
    await db.insert(staff).values({ clinicId: clinic.id, clerkUserId: userId, name, role: "coordinator" });
    await db.insert(auditEvents).values({
      clinicId: clinic.id,
      actorType: "staff",
      actorId: userId,
      action: "staff.joined",
      summary: `${name} joined as coordinator (demo)`,
    });
  } else {
    // Newest membership is the active workspace (see getViewer).
    await db.update(staff).set({ createdAt: new Date() }).where(eq(staff.id, existing.id));
  }
  redirect("/clinic");
}

const ClinicSchema = z.object({
  clinicName: z.string().trim().min(2).max(80),
  yourName: z.string().trim().min(2).max(60),
  role: z.enum(["clinician", "nurse", "coordinator"]),
  urgentLine: z.string().trim().min(5).max(40),
  emergencyInstruction: z.string().trim().min(20).max(600),
  sample: z.enum(["on", "off"]).optional(),
});

export type CreateClinicState = { error?: string } | undefined;

/**
 * Self-serve clinic sign-up: creates the clinic, makes this login its first
 * staff member, and copies in the default red-flag rules. The protocol step
 * comes next (/clinic/welcome) and can be skipped. In demo mode the clinic can
 * instead start with the sample patients and guides.
 */
export async function createClinic(_prev: CreateClinicState, formData: FormData): Promise<CreateClinicState> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const parsed = ClinicSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    const messages: Record<string, string> = {
      clinicName: "Enter your clinic's name.",
      yourName: "Enter your name as patients and colleagues will see it.",
      role: "Choose your role.",
      urgentLine: "Enter the phone number patients call when something is urgent.",
      emergencyInstruction: "Write the emergency instruction patients see on a red flag (at least 20 characters).",
    };
    return { error: messages[String(field)] ?? "Check the form and try again." };
  }
  const { clinicName, yourName, role, urgentLine, emergencyInstruction } = parsed.data;
  const withSample = parsed.data.sample === "on" && demoEnabled();

  const base = clinicName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "clinic";
  const slug = `${base}-${crypto.randomUUID().slice(0, 6)}`;

  const [clinic] = await db.insert(clinics).values({ name: clinicName, slug, urgentLine, emergencyInstruction }).returning();
  await db.insert(urgentRules).values(DEFAULT_URGENT_RULES.map((r) => ({ clinicId: clinic.id, label: r.label, phrases: r.phrases })));
  const [member] = await db
    .insert(staff)
    .values({ clinicId: clinic.id, clerkUserId: userId, name: yourName, role: role as StaffRole })
    .returning();
  await db.insert(auditEvents).values({
    clinicId: clinic.id,
    actorType: "staff",
    actorId: member.id,
    action: "clinic.created",
    summary: `${yourName} created ${clinicName} as ${role}`,
  });
  if (withSample) {
    await loadSample(clinic.id);
    redirect("/clinic");
  }
  redirect("/clinic/welcome");
}

async function loadSample(clinicId: string) {
  const leadCode = await seedSampleContent(clinicId, { codeSuffix: `-${crypto.randomUUID().slice(0, 4).toUpperCase()}` });
  await db.insert(auditEvents).values({
    clinicId,
    actorType: "system",
    actorId: "seed",
    action: "demo.seeded",
    summary: `Loaded sample patients and guides (lead patient code ${leadCode})`,
  });
}

/** From the protocol step: an empty clinic changes its mind and imports the sample patients. */
export async function importSamplePatients() {
  const { clinic } = await staffForAction();
  if (!demoEnabled() || clinic.isDemo) throw new Error("Sample import is only available in demo mode");
  const [existing] = await db.select({ id: patients.id }).from(patients).where(eq(patients.clinicId, clinic.id)).limit(1);
  if (!existing) await loadSample(clinic.id);
  redirect("/clinic");
}

const CodeSchema = z.object({ code: z.string().trim().min(4).max(32) });

export async function redeemEnrollmentCode(_prev: { error?: string } | undefined, formData: FormData) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const parsed = CodeSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) return { error: "Enter the enrollment code your clinic gave you." };
  const code = parsed.data.code.toUpperCase();

  // Universal demo invite: both roles on the sample clinic, no other typing.
  if (code === "0000" && demoEnabled()) {
    const user = await currentUser();
    await linkDemoRoles(userId, user?.firstName ? `${user.firstName} (demo)` : "Demo judge");
    redirect("/clinic");
  }

  const [row] = await db
    .select({ patient: patients, clinic: clinics })
    .from(patients)
    .innerJoin(clinics, eq(patients.clinicId, clinics.id))
    .where(eq(patients.enrollmentCode, code));
  if (!row) return { error: "That code didn't match an active cycle. Check with your clinic." };

  // An enrollment code links one login. Only the demo clinic lets a code move
  // between logins, so rehearsals can use a fresh account.
  if (row.patient.clerkUserId && row.patient.clerkUserId !== userId && !row.clinic.isDemo) {
    return { error: "This code is already linked to another account. Ask your clinic for a new one." };
  }

  // One patient record per login.
  await db.update(patients).set({ clerkUserId: null }).where(eq(patients.clerkUserId, userId));
  await db.update(patients).set({ clerkUserId: userId }).where(eq(patients.id, row.patient.id));
  await db.insert(auditEvents).values({
    clinicId: row.clinic.id,
    patientId: row.patient.id,
    actorType: "patient",
    actorId: userId,
    action: "patient.enrolled",
    summary: `${row.patient.alias} connected the app with an enrollment code`,
  });
  (await cookies()).delete("aama_code");
  redirect("/patient");
}
