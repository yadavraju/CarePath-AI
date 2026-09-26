import { asc, count, eq } from "drizzle-orm";
import { CareKindIcon, KIND_LABEL } from "@/components/CareKind";
import { LibraryForm } from "@/components/clinic/LibraryForm";
import { EYEBROW } from "@/components/ui";
import { db } from "@/db";
import { careItems, libraryItems, type CareKind } from "@/db/schema";
import { requireStaff } from "@/server/context";

export const dynamic = "force-dynamic";

const ORDER: CareKind[] = ["consent", "video", "document", "task"];

export default async function Library() {
  const { clinic } = await requireStaff();
  const items = await db.select().from(libraryItems).where(eq(libraryItems.clinicId, clinic.id)).orderBy(asc(libraryItems.title));
  const usage = await db
    .select({ id: careItems.libraryItemId, n: count() })
    .from(careItems)
    .where(eq(careItems.clinicId, clinic.id))
    .groupBy(careItems.libraryItemId);
  const used = new Map(usage.map((u) => [u.id, u.n]));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 lg:px-8">
      <div>
        <p className={EYEBROW}>Learn · Sign · Do</p>
        <h1 className="mt-1 font-display text-[26px] font-bold tracking-[-0.02em] text-ink">Care library</h1>
        <p className="mt-1 max-w-2xl text-[14px] text-ink-soft">
          Videos, guides, consent forms and tasks your team assigns to each patient. Assignments take a snapshot, so a signed
          consent always records the exact version the patient read.
        </p>
      </div>

      {ORDER.map((kind) => {
        const list = items.filter((i) => i.kind === kind);
        if (!list.length) return null;
        return (
          <section key={kind}>
            <h2 className="mb-2 font-display text-[14px] font-semibold text-ink">
              {KIND_LABEL[kind]}s · {list.length}
            </h2>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((i) => (
                <div key={i.id} className="rounded-xl bg-raised p-4 ring-1 ring-line">
                  <div className="flex items-start gap-3">
                    <CareKindIcon kind={i.kind} />
                    <div className="min-w-0">
                      <p className="font-display text-[14px] font-semibold text-ink">{i.title}</p>
                      <p className="mt-0.5 text-[12.5px] leading-snug text-ink-soft">{i.summary}</p>
                    </div>
                  </div>
                  <p className="mt-3 flex flex-wrap gap-x-2 text-[11.5px] text-ink-faint">
                    <span>v{i.version}</span>
                    {i.minutes ? <span>· {i.minutes} min</span> : null}
                    <span>· assigned to {used.get(i.id) ?? 0} patients</span>
                  </p>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      <section className="rounded-2xl bg-raised p-6 ring-1 ring-line">
        <h2 className="font-display text-[16px] font-semibold text-ink">Add to the library</h2>
        <LibraryForm />
      </section>
    </div>
  );
}
