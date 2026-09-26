import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { CareKindIcon, KIND_LABEL, STATUS_LABEL, isDone } from "@/components/CareKind";
import { Chip, EYEBROW } from "@/components/ui";
import { db } from "@/db";
import { careItems } from "@/db/schema";
import { shortDate } from "@/lib/time";
import { requirePatient } from "@/server/context";

export const dynamic = "force-dynamic";

export default async function MyCare() {
  const { patient } = await requirePatient();
  const items = await db.select().from(careItems).where(eq(careItems.patientId, patient.id)).orderBy(asc(careItems.createdAt));
  const todo = items
    .filter((i) => !isDone(i.status, i.kind))
    .sort((a, b) => (a.kind === "consent" ? 0 : 1) - (b.kind === "consent" ? 0 : 1) || (a.dueDate ?? "9").localeCompare(b.dueDate ?? "9"));
  const done = items.filter((i) => isDone(i.status, i.kind));
  const pct = items.length ? Math.round((done.length / items.length) * 100) : 0;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 lg:px-8">
      <p className={EYEBROW}>Chosen for you by your care team</p>
      <h1 className="mt-1 font-display text-[26px] font-bold tracking-[-0.02em] text-ink">My care</h1>
      <p className="mt-1 text-[14px] text-ink-soft">
        {done.length} of {items.length} done. Videos, guides and forms for where you are in your cycle.
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sunken">
        <div className="h-full rounded-full bg-teal" style={{ width: `${pct}%` }} />
      </div>

      {[
        ["To do", todo],
        ["Done", done],
      ].map(([label, list]) => (
        <section key={label as string} className="mt-6">
          <h2 className="mb-2 font-display text-[14px] font-semibold text-ink">
            {label as string} · {(list as typeof items).length}
          </h2>
          <div className="overflow-hidden rounded-2xl bg-raised ring-1 ring-line">
            {(list as typeof items).length === 0 && <p className="px-5 py-4 text-[14px] text-ink-soft">Nothing here yet.</p>}
            {(list as typeof items).map((i) => (
              <Link key={i.id} href={`/patient/care/${i.id}`} className="flex items-center gap-3 border-b border-line px-4 py-3.5 transition last:border-0 hover:bg-canvas/60">
                <CareKindIcon kind={i.kind} />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[14.5px] font-semibold text-ink">{i.title}</p>
                  <p className="truncate text-[13px] text-ink-soft">
                    {KIND_LABEL[i.kind]}
                    {i.minutes ? ` · ${i.minutes} min` : ""} · {i.personalNote ?? i.summary}
                  </p>
                </div>
                {i.status === "signed" ? (
                  <Chip tone="teal">
                    <ShieldCheck className="h-3 w-3" /> Signed
                  </Chip>
                ) : isDone(i.status, i.kind) ? (
                  <Chip tone="teal">{STATUS_LABEL[i.status]}</Chip>
                ) : i.kind === "consent" ? (
                  <Chip tone="amber">Needs signature</Chip>
                ) : i.dueDate ? (
                  <Chip tone="neutral">Due {shortDate(i.dueDate)}</Chip>
                ) : null}
                <ChevronRight className="h-4 w-4 text-ink-faint" />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
