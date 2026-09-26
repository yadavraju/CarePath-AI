import "server-only";
import { db } from "@/db";
import { documents, knowledgeChunks, type DocumentKind, type DocumentStatus } from "@/db/schema";
import { chunkDocument } from "@/lib/retrieval/chunk";
import { scanForInjection } from "@/lib/safety/rules";

/** Stores a document version and its retrievable chunks. Drafts are never retrieved. */
export async function ingestDocument(input: {
  clinicId: string;
  title: string;
  kind: DocumentKind;
  version: number;
  text: string;
  status?: DocumentStatus;
  approvedByStaffId?: string | null;
  sourceUrl?: string | null;
}) {
  const { chunks, pageCount } = chunkDocument(input.text);
  const approved = input.status === "approved";
  const [doc] = await db
    .insert(documents)
    .values({
      clinicId: input.clinicId,
      title: input.title,
      kind: input.kind,
      version: input.version,
      status: input.status ?? "draft",
      sourceText: input.text,
      sourceUrl: input.sourceUrl ?? null,
      pageCount,
      injectionFlags: scanForInjection(input.text),
      approvedByStaffId: approved ? (input.approvedByStaffId ?? null) : null,
      approvedAt: approved ? new Date() : null,
    })
    .returning();
  if (chunks.length) {
    await db.insert(knowledgeChunks).values(
      chunks.map((c) => ({ clinicId: input.clinicId, documentId: doc.id, page: c.page, heading: c.heading, content: c.content })),
    );
  }
  return { doc, chunkCount: chunks.length };
}
