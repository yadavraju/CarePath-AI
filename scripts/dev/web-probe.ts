import { chunkDocument } from "@/lib/retrieval/chunk";
import { discoverLinks, extractArticle, findVideoEmbed, safeFetch } from "@/server/webImport";

(async () => {
  const idx = await safeFetch("https://rscbayarea.com/resources/");
  const found = discoverLinks(idx.body.toString("utf8"), idx.url);
  console.log(`Discovered ${found.length}:`, found.filter((f) => f.type === "article").length, "articles,", found.filter((f) => f.type === "video").length, "videos,", found.filter((f) => f.type === "pdf").length, "pdfs");
  for (const f of found.slice(0, 6)) console.log(" ", f.type, "|", f.title, "|", f.url);
  const art = await safeFetch("https://rscbayarea.com/article/tips-on-freezing-your-eggs/");
  const { title, text } = extractArticle(art.body.toString("utf8"));
  const { chunks } = chunkDocument(text);
  console.log(`\nArticle: ${title} — ${text.length} chars, ${chunks.length} chunks`);
  for (const c of chunks.slice(0, 4)) console.log(`  ## ${c.heading} :: ${c.content.slice(0, 110)}…`);
  const vid = found.find((f) => f.type === "video");
  if (vid) {
    const v = await safeFetch(vid.url);
    console.log("\nVideo:", vid.title, "→", findVideoEmbed(v.body.toString("utf8"), v.url));
  }
  for (const bad of ["http://rscbayarea.com", "https://localhost/x", "https://169.254.169.254/latest"]) {
    try { await safeFetch(bad); console.log("NOT BLOCKED", bad); } catch (e) { console.log("blocked:", bad, "→", (e as Error).message); }
  }
})();
