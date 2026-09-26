import type { Clinic } from "@/db/schema";

/** "Now" for a clinic — real time plus the demo clock offset. */
export function clinicNow(clinic: Pick<Clinic, "demoOffsetMinutes">) {
  return new Date(Date.now() + clinic.demoOffsetMinutes * 60000);
}
