import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import type { DocumentKind } from "@/db/schema";
import { buildTsQuery } from "@/lib/retrieval/query";

export type Retrieved = {
  id: string;
  documentId: string;
  title: string;
  version: number;
  kind: DocumentKind;
  page: number;
  heading: string;
  content: string;
  score: number;
};

/**
 * Clinic-scoped full-text retrieval over APPROVED documents only. Never
 * searches another clinic's content, never searches drafts or retired versions.
 */
export async function retrieve(
  clinicId: string,
  question: string,
  opts: { limit?: number; kind?: DocumentKind } = {},
): Promise<Retrieved[]> {
  const q = buildTsQuery(question);
  if (!q) return [];
  const limit = opts.limit ?? 4;
  const result = await db.execute(sql`
    select c.id, c.document_id as "documentId", d.title, d.version, d.kind, c.page, c.heading, c.content,
           ts_rank_cd(c.tsv, to_tsquery('english', ${q}), 32)::float as score
    from knowledge_chunks c
    join documents d on d.id = c.document_id
    where c.clinic_id = ${clinicId}
      and d.status = 'approved'
      and c.tsv @@ to_tsquery('english', ${q})
      ${opts.kind ? sql`and d.kind = ${opts.kind}` : sql``}
    order by score desc
    limit ${limit}
  `);
  return (result.rows as Retrieved[]).map((r) => ({ ...r, score: Number(r.score) }));
}
