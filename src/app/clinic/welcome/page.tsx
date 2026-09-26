import Link from "next/link";
import { eq } from "drizzle-orm";
import { ArrowRight, CheckCircle2, FileText, Users } from "lucide-react";
import { importSamplePatients } from "@/app/onboarding/actions";
import { PendingSubmit } from "@/components/clinic/Buttons";
import { UploadForm } from "@/components/clinic/DocumentForms";
import { CARD, EYEBROW } from "@/components/ui";
import { db } from "@/db";
import { patients } from "@/db/schema";
import { requireStaff } from "@/server/context";
import { demoEnabled } from "@/server/demoAccess";

export const dynamic = "force-dynamic";

/** Step 2 of clinic sign-up: add the protocol document, or skip for now. */
export default async function Welcome() {
  const { clinic, staff } = await requireStaff();
  const [anyPatient] = await db.select({ id: patients.id }).from(patients).where(eq(patients.clinicId, clinic.id)).limit(1);
  const offerSample = demoEnabled() && !clinic.isDemo && !anyPatient;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 lg:px-8">
      <div>
        <p className={EYEBROW}>Step 2 of 2 · Set up {clinic.name}</p>
        <h1 className="mt-1 font-display text-[26px] font-bold tracking-[-0.02em] text-ink">Welcome, {staff.name}. Add your protocol</h1>
        <p className="mt-1 max-w-2xl text-[14px] text-ink-soft">
          Upload the protocol document your patients follow. Aama splits it into passages and screens it for unsafe
          instructions. It stays a draft, so patients get no answers from it until you approve it.
        </p>
      </div>

      <ul className="flex flex-wrap gap-x-5 gap-y-1.5 font-display text-[13px] text-ink-soft">
        <li className="flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-teal" /> Clinic created
        </li>
        <li className="flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-teal" /> Red-flag rules added
        </li>
        <li className="flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-ink-faint" /> Protocol document
        </li>
      </ul>

      <section className={`${CARD} p-6`}>
        <h2 className="font-display text-[16px] font-semibold text-ink">Protocol document</h2>
        <p className="mt-1 text-[13.5px] text-ink-soft">Attach a PDF or .txt, or paste the text.</p>
        <UploadForm defaultKind="protocol" next="/clinic/protocols?uploaded=1" submitLabel="Process document" />
      </section>

      {offerSample && (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-sky-soft p-6 ring-1 ring-sky">
          <div className="max-w-md">
            <h2 className="flex items-center gap-2 font-display text-[16px] font-semibold text-ink">
              <Users className="h-4 w-4 text-ink-faint" /> Import sample patients?
            </h2>
            <p className="mt-1 text-[13.5px] text-ink-soft">
              For the hackathon demo: 18 fictional patients with alerts and chats, plus approved guides and a care library.
            </p>
          </div>
          <form action={importSamplePatients}>
            <PendingSubmit
              pendingLabel="Importing…"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-navy px-5 font-display text-[14px] font-semibold text-white hover:bg-navy/90 disabled:opacity-60"
            >
              Import sample data <ArrowRight className="h-4 w-4" />
            </PendingSubmit>
          </form>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-ink-faint">You can add protocols and guides any time from Protocols & guides.</p>
        <Link
          href="/clinic/protocols"
          className="inline-flex h-10 items-center gap-2 rounded-full px-4 font-display text-[14px] font-semibold text-ink ring-1 ring-line hover:ring-ink/25"
        >
          Skip for now <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
