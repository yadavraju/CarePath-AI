/**
 * Splits a clinic document into retrievable chunks, one per "## " section,
 * remembering the page each came from so every citation can name it.
 * Plain uploads without markers fall back to paragraph chunks.
 */
export type Chunk = { page: number; heading: string; content: string };

const MAX = 1200;

function splitLong(text: string): string[] {
  if (text.length <= MAX) return [text];
  const out: string[] = [];
  let cur = "";
  for (const para of text.split(/\n{2,}|(?<=\.)\s+(?=[A-Z])/)) {
    if ((cur + " " + para).length > MAX && cur) {
      out.push(cur.trim());
      cur = para;
    } else cur = cur ? `${cur} ${para}` : para;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

export function chunkDocument(text: string): { chunks: Chunk[]; pageCount: number } {
  const pageParts = text.split(/^---\s*Page\s+(\d+)\s*---\s*$/im);
  const pages: { page: number; body: string }[] = [];
  if (pageParts.length === 1) {
    pages.push({ page: 1, body: text });
  } else {
    if (pageParts[0].trim()) pages.push({ page: 1, body: pageParts[0] });
    for (let i = 1; i < pageParts.length; i += 2) pages.push({ page: Number(pageParts[i]), body: pageParts[i + 1] ?? "" });
  }

  const chunks: Chunk[] = [];
  for (const { page, body } of pages) {
    const sections = body.split(/^##\s+/m).map((s) => s.trim()).filter(Boolean);
    for (const section of sections) {
      const hasHeading = body.includes(`## ${section.split("\n")[0]}`);
      const [first, ...rest] = section.split("\n");
      const heading = hasHeading ? first.trim() : "";
      const content = (hasHeading ? rest.join("\n") : section).replace(/\s+/g, " ").trim();
      if (!content) continue;
      for (const piece of splitLong(content)) chunks.push({ page, heading, content: piece });
    }
  }
  return { chunks, pageCount: Math.max(1, ...pages.map((p) => p.page)) };
}
