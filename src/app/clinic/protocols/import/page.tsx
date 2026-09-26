import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { ProtocolImporter } from "@/components/clinic/ProtocolImporter";
import { EYEBROW } from "@/components/ui";
import { db } from "@/db";
import { cycles, patients } from "@/db/schema";
import { requireStaff } from "@/server/context";

export const dynamic = "force-dynamic";

export default async function ImportProtocol({ searchParams }: PageProps<"/clinic/protocols/import">) {
  const { clinic } = await requireStaff();
  const { patient: preselect } = await searchParams;
  const rows = await db
    .select({ id: patients.id, alias: patients.alias, isDemoLead: patients.isDemoLead })
    .from(patients)
    .innerJoin(cycles, eq(cycles.patientId, patients.id))
    .where(and(eq(patients.clinicId, clinic.id), eq(cycles.status, "active")))
    .orderBy(patients.alias);
  const lead = rows.find((r) => r.isDemoLead);
  // A realistic "after monitoring" update covering Day 8 onward: Gonal-F
  // reduced, stimulation extended one day, one extra monitoring visit.
  const sample = `ANTAGONIST STIMULATION — PLAN UPDATE FROM DAY 8 (sample, fictional)
Clinic: Harbor Fertility Center (sample)
Reason: Day 5 monitoring results. Reference: Stimulation Medication Guide v3

Day 8-11 | 19:30 | Gonal-F | 150 IU | Subcutaneous injection in the lower abdomen with your pen. Same time each evening. | p.1
Day 8-11 | 19:30 | Menopur | 75 IU | Mix right before injecting; do not store mixed medication. | p.3
Day 8-11 | 08:00 | Cetrotide | 0.25 mg | Morning injection to prevent early ovulation. Continue until told to stop. | p.3
Day 8 | 07:30 | Monitoring visit | - | Blood test and ultrasound. | p.1
Day 10 | 07:30 | Monitoring visit | - | Blood test and ultrasound. | p.1
Day 11 | 07:30 | Monitoring visit | - | Blood test and ultrasound; trigger timing decided after this visit. | p.1`;

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-8 lg:px-8">
      <Link href="/clinic/protocols" className="inline-flex items-center gap-1 font-display text-[13px] font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Protocols & guides
      </Link>
      <div>
        <p className={EYEBROW}>AI job 1 · Protocol parser</p>
        <h1 className="mt-1 font-display text-[26px] font-bold tracking-[-0.02em] text-ink">Import a protocol</h1>
        <p className="mt-1 max-w-2xl text-[14px] text-ink-soft">
          Paste a protocol. AI drafts the schedule table — it never invents a missing dose or time, it flags it. You review
          every row, then activate it as the patient’s next schedule version.
        </p>
      </div>
      <ProtocolImporter
        patients={rows.map(({ id, alias }) => ({ id, alias }))}
        defaultPatientId={typeof preselect === "string" ? preselect : lead?.id}
        sample={sample}
      />
    </div>
  );
}
