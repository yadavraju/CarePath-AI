import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AddPatientForm } from "@/components/clinic/AddPatientForm";
import { CARD, EYEBROW } from "@/components/ui";
import { CLINIC_TZ } from "@/lib/brand";
import { localDate } from "@/lib/time";
import { clinicNow, requireStaff } from "@/server/context";

export const dynamic = "force-dynamic";

export default async function NewPatient() {
  const { clinic } = await requireStaff();
  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-8 lg:px-8">
      <Link href="/clinic/patients" className="inline-flex items-center gap-1 font-display text-[13px] font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Patients
      </Link>
      <div>
        <p className={EYEBROW}>New patient</p>
        <h1 className="mt-1 font-display text-[26px] font-bold tracking-[-0.02em] text-ink">Add a patient</h1>
        <p className="mt-1 max-w-2xl text-[14px] text-ink-soft">
          Aama creates a one-time enrollment code and emails the patient an invite. They create an account, enter the code, and
          see the schedule you import for them.
        </p>
      </div>
      <section className={`${CARD} p-6`}>
        <AddPatientForm today={localDate(clinicNow(clinic), CLINIC_TZ)} />
      </section>
    </div>
  );
}
