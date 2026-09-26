"use server";

import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auditEvents, clinics, patients, staff } from "@/db/schema";
import { DEMO_CLINIC } from "@/demo/content";
import { demoEnabled, linkDemoRoles } from "@/server/demoAccess";
import { seedDemoClinic } from "@/server/seed";

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
  }
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
  redirect("/patient");
}
