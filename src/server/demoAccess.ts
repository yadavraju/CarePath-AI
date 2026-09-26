import "server-only";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { auditEvents, clinics, patients, staff } from "@/db/schema";
import { DEMO_CLINIC } from "@/demo/content";
import { seedDemoClinic } from "./seed";

export const DEMO_EXTERNAL_ID = "aama-demo-judge";

export function demoEnabled() {
  return process.env.DEMO_MODE !== "off";
}

/**
 * Gives a login BOTH demo roles on the sample clinic: coordinator, and the
 * demo patient (Maya, MAYA-7). Only ever touches the demo clinic.
 */
export async function linkDemoRoles(userId: string, name = "Demo Judge") {
  let [clinic] = await db.select().from(clinics).where(eq(clinics.slug, DEMO_CLINIC.slug));
  clinic ??= await seedDemoClinic();

  const [existing] = await db.select().from(staff).where(and(eq(staff.clinicId, clinic.id), eq(staff.clerkUserId, userId)));
  if (!existing) await db.insert(staff).values({ clinicId: clinic.id, clerkUserId: userId, name, role: "coordinator" });

  // One patient record per login; the demo patient follows whoever opens the demo.
  await db.update(patients).set({ clerkUserId: null }).where(and(eq(patients.clerkUserId, userId), ne(patients.isDemoLead, true)));
  await db
    .update(patients)
    .set({ clerkUserId: userId })
    .where(and(eq(patients.clinicId, clinic.id), eq(patients.isDemoLead, true)));

  await db.insert(auditEvents).values({
    clinicId: clinic.id,
    actorType: "system",
    actorId: userId,
    action: "demo.opened",
    summary: `${name} opened the live demo (coordinator + patient Maya R.)`,
  });
  return clinic;
}
