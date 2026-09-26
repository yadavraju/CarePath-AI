import Link from "next/link";
import { count, desc, eq } from "drizzle-orm";
import { ScanText, ShieldAlert } from "lucide-react";
import { DocStatusButtons, UploadForm } from "@/components/clinic/DocumentForms";
import { WebImport } from "@/components/clinic/WebImport";
import { CARD, Chip, EYEBROW } from "@/components/ui";
import { db } from "@/db";
import { documents, knowledgeChunks, type DocumentKind } from "@/db/schema";
import { timeAgo } from "@/lib/utils";
import { requireStaff } from "@/server/context";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<DocumentKind, string> = {
  protocol: "Protocol",
  medication_guide: "Medication guide",
  missed_dose: "Missed-dose guide",
  symptom_guide: "Symptom guide",
  faq: "FAQ",
};

export default async function Protocols({ searchParams }: PageProps<"/clinic/protocols">) {
  const { clinic } = await requireStaff();
  const { uploaded } = await searchParams;
  const docs = await db.select().from(documents).where(eq(documents.clinicId, clinic.id)).orderBy(desc(documents.createdAt));
  const counts = await db
    .select({ documentId: knowledgeChunks.documentId, n: count() })
    .from(knowledgeChunks)
    .where(eq(knowledgeChunks.clinicId, clinic.id))
    .groupBy(knowledgeChunks.documentId);
  const chunkCount = new Map(counts.map((c) => [c.documentId, c.n]));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={EYEBROW}>The clinic sets the truth</p>
          <h1 className="mt-1 font-display text-[26px] font-bold tracking-[-0.02em] text-ink">Protocols & guides</h1>
          <p className="mt-1 max-w-2xl text-[14px] text-ink-soft">
            Only approved versions are searchable by the patient companion. Approving a new version retires the old one, so two
            versions never answer at once.
          </p>
        </div>
        <Link href="/clinic/protocols/import" className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 font-display text-[13.5px] font-semibold text-white">
          <ScanText className="h-4 w-4" /> Import a protocol
        </Link>
      </div>

      {uploaded === "1" && (
        <div className="rounded-2xl bg-teal-soft px-5 py-4 text-[14px] text-teal-deep ring-1 ring-teal/20">
          <p className="font-display font-semibold">Your protocol is processed and saved as a draft.</p>
          <p className="mt-0.5">Check it below, then press Approve so the patient companion can answer from it.</p>
        </div>
      )}

      {docs.length === 0 && (
        <div className={`${CARD} p-6 text-center`}>
          <p className="font-display text-[15px] font-semibold text-ink">No documents yet</p>
          <p className="mt-1 text-[13.5px] text-ink-soft">Add your protocol below, or import it from your website.</p>
        </div>
      )}

      <section className={`${CARD} overflow-hidden ${docs.length === 0 ? "hidden" : ""}`}>
        <table className="w-full text-left text-[14px]">
          <thead className="bg-canvas font-display text-[12px] uppercase tracking-[0.08em] text-ink-faint">
            <tr>
              <th className="px-5 py-3 font-semibold">Document</th>
              <th className="hidden px-3 py-3 font-semibold md:table-cell">Type</th>
              <th className="px-3 py-3 font-semibold">Version</th>
              <th className="hidden px-3 py-3 font-semibold sm:table-cell">Passages</th>
              <th className="px-3 py-3 font-semibold">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {docs.map((d) => (
              <tr key={d.id} className="align-top">
                <td className="px-5 py-3.5">
                  <p className="font-display font-semibold text-ink">{d.title}</p>
                  <p className="text-[12.5px] text-ink-faint">
                    {d.pageCount} page{d.pageCount === 1 ? "" : "s"} · added {timeAgo(d.createdAt)} ago
                    {d.sourceUrl && (
                      <>
                        {" · "}
                        <a href={d.sourceUrl} target="_blank" rel="noreferrer" className="text-teal-deep underline">
                          {new URL(d.sourceUrl).hostname}
                        </a>
                      </>
                    )}
                  </p>
                  {d.injectionFlags.length > 0 && (
                    <div className="mt-2 rounded-lg bg-alert-soft px-2.5 py-2 text-[12.5px] text-alert">
                      <p className="flex items-center gap-1.5 font-display font-semibold">
                        <ShieldAlert className="h-3.5 w-3.5" /> Review before approving
                      </p>
                      <ul className="mt-1 list-disc pl-5">
                        {d.injectionFlags.map((f) => (
                          <li key={f}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </td>
                <td className="hidden px-3 py-3.5 text-ink-soft md:table-cell">{KIND_LABEL[d.kind]}</td>
                <td className="px-3 py-3.5 font-display font-semibold text-ink">v{d.version}</td>
                <td className="hidden px-3 py-3.5 text-ink-soft sm:table-cell">{chunkCount.get(d.id) ?? 0}</td>
                <td className="px-3 py-3.5">
                  <Chip tone={d.status === "approved" ? "teal" : d.status === "draft" ? "amber" : "neutral"}>{d.status}</Chip>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <DocStatusButtons id={d.id} status={d.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={`${CARD} p-6`}>
        <h2 className="font-display text-[16px] font-semibold text-ink">Import from your website</h2>
        <p className="mt-1 max-w-3xl text-[13.5px] text-ink-soft">
          Paste your patient-resources page or a single article. Aama finds your articles, PDFs and videos, imports articles as
          drafts with a link back to the source, and adds videos to the care library. Nothing is answerable until you approve it.
          Import only content your clinic owns or has permission to use.
        </p>
        <WebImport />
      </section>

      <section className={`${CARD} p-6`}>
        <h2 className="font-display text-[16px] font-semibold text-ink">Add a document</h2>
        <p className="mt-1 text-[13.5px] text-ink-soft">
          New uploads start as drafts. Text is screened for instructions aimed at the AI (prompt injection) and is always passed
          to the model as data, never as instructions.
        </p>
        <UploadForm />
      </section>
    </div>
  );
}
