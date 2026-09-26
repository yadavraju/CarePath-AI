import Link from "next/link";
import { and, eq, ne } from "drizzle-orm";
import { ChevronRight } from "lucide-react";
import { Chip, Dot, EYEBROW } from "@/components/ui";
import { db } from "@/db";
import { alerts, cycles, patients } from "@/db/schema";
import { CLINIC_TZ, LANGUAGES } from "@/lib/brand";
import { daysBetween, localDate } from "@/lib/time";
import { clinicNow, requireStaff } from "@/server/context";

export const dynamic = "force-dynamic";

export default async function Patients() {
  const { clinic } = await requireStaff();
  const today = localDate(clinicNow(clinic), CLINIC_TZ);
  const rows = await db
    .select({ patient: patients, cycle: cycles })
    .from(cycles)
    .innerJoin(patients, eq(cycles.patientId, patients.id))
    .where(and(eq(cycles.clinicId, clinic.id), eq(cycles.status, "active")))
    .orderBy(patients.alias);
  const open = await db.select().from(alerts).where(and(eq(alerts.clinicId, clinic.id), ne(alerts.status, "resolved")));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-8">
      <p className={EYEBROW}>Active cycles</p>
      <h1 className="mt-1 font-display text-[26px] font-bold tracking-[-0.02em] text-ink">Patients · {rows.length}</h1>
      <p className="mt-1 text-[14px] text-ink-soft">Synthetic records in a fictional clinic.</p>
      <div className="mt-6 overflow-hidden rounded-2xl bg-raised ring-1 ring-line">
        {rows.map(({ patient, cycle }) => {
          const mine = open.filter((a) => a.patientId === patient.id);
          const red = mine.some((a) => a.severity === "red");
          return (
            <Link key={patient.id} href={`/clinic/patients/${patient.id}`} className="flex items-center gap-4 border-b border-line px-5 py-3.5 transition last:border-0 hover:bg-canvas/70">
              <Dot tone={red ? "red" : mine.length ? "amber" : "teal"} className="h-2 w-2" />
              <div className="min-w-0 flex-1">
                <p className="font-display text-[14.5px] font-semibold text-ink">{patient.alias}</p>
                <p className="text-[13px] text-ink-soft">
                  Day {daysBetween(cycle.startDate, today) + 1} · {cycle.protocolName} · {LANGUAGES[patient.language]}
                </p>
              </div>
              {mine.length ? <Chip tone={red ? "red" : "amber"}>{mine.length} open</Chip> : <Chip tone="teal">On track</Chip>}
              <ChevronRight className="h-4 w-4 text-ink-faint" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
