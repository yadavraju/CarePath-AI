import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { clinics, cycles, patients, staff } from "@/db/schema";

export { clinicNow } from "./clock";

/** Who is signed in, and which roles they hold. Cached per request. */
export const getViewer = cache(async () => {
  const { userId } = await auth();
  if (!userId) return null;
  const [staffRow] = await db
    .select({ staff, clinic: clinics })
    .from(staff)
    .innerJoin(clinics, eq(staff.clinicId, clinics.id))
    .where(eq(staff.clerkUserId, userId))
    .limit(1);
  const [patientRow] = await db
    .select({ patient: patients, clinic: clinics })
    .from(patients)
    .innerJoin(clinics, eq(patients.clinicId, clinics.id))
    .where(eq(patients.clerkUserId, userId))
    .limit(1);
  return { userId, staff: staffRow ?? null, patient: patientRow ?? null };
});

export async function requireStaff() {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");
  if (!viewer.staff) redirect("/onboarding");
  return { userId: viewer.userId, staff: viewer.staff.staff, clinic: viewer.staff.clinic };
}

export async function requirePatient() {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");
  if (!viewer.patient) redirect("/onboarding");
  const { patient, clinic } = viewer.patient;
  const [cycle] = await db
    .select()
    .from(cycles)
    .where(and(eq(cycles.patientId, patient.id), eq(cycles.status, "active")))
    .orderBy(desc(cycles.createdAt))
    .limit(1);
  if (!cycle) redirect("/onboarding?reason=no-cycle");
  return { userId: viewer.userId, patient, clinic, cycle };
}

/** Same checks, but for server actions: throw instead of redirecting. */
export async function staffForAction() {
  const viewer = await getViewer();
  if (!viewer?.staff) throw new Error("Not authorised");
  return { staff: viewer.staff.staff, clinic: viewer.staff.clinic };
}

export async function patientForAction() {
  const viewer = await getViewer();
  if (!viewer?.patient) throw new Error("Not authorised");
  const { patient, clinic } = viewer.patient;
  const [cycle] = await db
    .select()
    .from(cycles)
    .where(and(eq(cycles.patientId, patient.id), eq(cycles.status, "active")))
    .orderBy(desc(cycles.createdAt))
    .limit(1);
  if (!cycle) throw new Error("No active cycle");
  return { patient, clinic, cycle };
}
