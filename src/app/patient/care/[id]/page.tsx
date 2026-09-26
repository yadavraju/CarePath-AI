import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ArrowLeft, PlayCircle, ShieldCheck } from "lucide-react";
import { CareKindIcon, KIND_LABEL } from "@/components/CareKind";
import { CompleteButton, ConsentSigner } from "@/components/patient/CareActions";
import { EYEBROW } from "@/components/ui";
import { db } from "@/db";
import { careItems, documents } from "@/db/schema";
import { chunkDocument } from "@/lib/retrieval/chunk";
import { requirePatient } from "@/server/context";

export const dynamic = "force-dynamic";

/** YouTube / Vimeo links become embeds; a direct file plays in <video>. */
function embedUrl(url: string | null) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/);
  if (yt) return { type: "iframe" as const, src: `https://www.youtube-nocookie.com/embed/${yt[1]}` };
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return { type: "iframe" as const, src: `https://player.vimeo.com/video/${vimeo[1]}` };
  if (/\.(mp4|webm)(\?|$)/i.test(url)) return { type: "video" as const, src: url };
  return null;
}

export default async function CareItemPage({ params }: PageProps<"/patient/care/[id]">) {
  const { id } = await params;
  const { patient } = await requirePatient();
  const [item] = await db.select().from(careItems).where(and(eq(careItems.id, id), eq(careItems.patientId, patient.id)));
  if (!item) notFound();

  // Opening an item counts as viewing it — the care team sees "Opened".
  if (item.status === "assigned") {
    await db.update(careItems).set({ status: "viewed", viewedAt: new Date() }).where(eq(careItems.id, item.id));
  }

  const [guide] = item.documentId ? await db.select().from(documents).where(eq(documents.id, item.documentId)) : [];
  const embed = embedUrl(item.url);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 lg:px-8">
      <Link href="/patient/care" className="inline-flex items-center gap-1 font-display text-[13px] font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> My care
      </Link>
      <div className="mt-4 flex items-start gap-3">
        <CareKindIcon kind={item.kind} className="h-11 w-11" />
        <div>
          <p className={EYEBROW}>
            {KIND_LABEL[item.kind]}
            {item.minutes ? ` · ${item.minutes} min` : ""}
            {item.libraryVersion ? ` · v${item.libraryVersion}` : ""}
          </p>
          <h1 className="mt-0.5 font-display text-[24px] font-bold tracking-[-0.02em] text-ink">{item.title}</h1>
          <p className="mt-1 text-[14.5px] text-ink-soft">{item.summary}</p>
        </div>
      </div>

      {item.personalNote && (
        <div className="mt-5 rounded-2xl bg-teal-soft/60 p-4 text-[14.5px] leading-relaxed text-ink ring-1 ring-teal/15">
          <p className="font-display text-[12px] font-semibold uppercase tracking-[0.12em] text-teal-deep">A note from your care team</p>
          <p className="mt-1">{item.personalNote}</p>
        </div>
      )}

      {item.kind === "video" && (
        <div className="mt-6">
          {embed?.type === "iframe" ? (
            <iframe src={embed.src} title={item.title} className="aspect-video w-full rounded-2xl ring-1 ring-line" allow="encrypted-media; picture-in-picture" allowFullScreen />
          ) : embed?.type === "video" ? (
            <video src={embed.src} controls className="aspect-video w-full rounded-2xl bg-ink ring-1 ring-line" />
          ) : (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl bg-navy text-white">
              <PlayCircle className="h-14 w-14 text-white/80" />
              <p className="font-display text-[15px] font-semibold">{item.title}</p>
              <p className="max-w-sm text-center text-[12.5px] text-white/60">Sample player — the clinic uploads its own approved video here.</p>
            </div>
          )}
          <div className="mt-4">
            <CompleteButton id={item.id} done={item.status === "completed"} label="I’ve watched this" />
          </div>
        </div>
      )}

      {item.kind === "document" && (
        <div className="mt-6">
          {guide ? (
            <article className="space-y-5 rounded-2xl bg-raised p-6 ring-1 ring-line">
              <p className="font-display text-[12.5px] text-ink-faint">
                {guide.title} · v{guide.version} · approved by your clinic
              </p>
              {chunkDocument(guide.sourceText).chunks.map((c, i) => (
                <section key={i}>
                  {c.heading && (
                    <h2 className="font-display text-[16px] font-semibold text-ink">
                      {c.heading} <span className="text-[12px] font-normal text-ink-faint">p.{c.page}</span>
                    </h2>
                  )}
                  <p className="mt-1 text-[14.5px] leading-relaxed text-ink">{c.content}</p>
                </section>
              ))}
            </article>
          ) : item.url ? (
            <a href={item.url} target="_blank" rel="noreferrer" className="font-display text-[14px] font-semibold text-teal-deep underline">
              Open the document
            </a>
          ) : null}
          <div className="mt-4">
            <CompleteButton id={item.id} done={item.status === "completed"} label="I’ve read this" />
          </div>
        </div>
      )}

      {item.kind === "task" && (
        <div className="mt-6 rounded-2xl bg-raised p-6 ring-1 ring-line">
          <p className="text-[15px] leading-relaxed text-ink">{item.body}</p>
          <div className="mt-4">
            <CompleteButton id={item.id} done={item.status === "completed"} label="Mark as done" />
          </div>
        </div>
      )}

      {item.kind === "consent" && (
        <div className="mt-6 space-y-4">
          <article className="max-h-[420px] overflow-y-auto rounded-2xl bg-raised p-6 ring-1 ring-line">
            {(item.body ?? "").split(/\n\s*\n/).map((para, i) => (
              <p key={i} className={`text-[14.5px] leading-relaxed text-ink ${i ? "mt-3" : "font-display text-[12.5px] text-ink-faint"}`}>
                {para}
              </p>
            ))}
          </article>
          {item.status === "signed" ? (
            <div className="rounded-2xl bg-teal-soft/60 p-5 ring-1 ring-teal/20">
              <p className="flex items-center gap-2 font-display text-[15px] font-semibold text-teal-deep">
                <ShieldCheck className="h-5 w-5" /> Signed
              </p>
              <p className="mt-1 text-[14px] text-ink">
                Signed as “{item.signedName}” on{" "}
                {item.signedAt?.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}. Version {item.libraryVersion ?? 1}.
              </p>
              <p className="mt-1 break-all font-mono text-[11px] text-ink-faint">Record {item.signatureHash}</p>
            </div>
          ) : (
            <ConsentSigner id={item.id} suggestedName={patient.alias.replace(".", "")} />
          )}
        </div>
      )}
    </div>
  );
}
