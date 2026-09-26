import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditEvents, clinics, type Clinic } from "@/db/schema";
import { CLINIC_TZ } from "@/lib/brand";
import { localDate, zonedInstant } from "@/lib/time";

export const CLOCK_PRESETS = {
  real: { label: "Real time", at: null },
  reminder: { label: "7:05 PM · reminder", at: "19:05" },
  missed: { label: "8:45 PM · window closed", at: "20:45" },
} as const;
export type ClockPreset = keyof typeof CLOCK_PRESETS;

/** Jump the demo clinic's clock to a preset time today. Demo clinics only. */
export async function setDemoClock(clinic: Clinic, preset: ClockPreset, actorId: string) {
  if (!clinic.isDemo) throw new Error("Demo clock is only available for the demo clinic");
  const target = CLOCK_PRESETS[preset].at;
  let offset = 0;
  if (target) {
    const today = localDate(new Date(), CLINIC_TZ);
    offset = Math.round((zonedInstant(today, target, CLINIC_TZ).getTime() - Date.now()) / 60000);
  }
  await db.update(clinics).set({ demoOffsetMinutes: offset }).where(eq(clinics.id, clinic.id));
  await db.insert(auditEvents).values({
    clinicId: clinic.id,
    actorType: "system",
    actorId,
    action: "demo.clock",
    summary: `Demo clock set to ${CLOCK_PRESETS[preset].label}`,
  });
}
