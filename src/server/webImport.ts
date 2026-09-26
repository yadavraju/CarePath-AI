import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { parse, type HTMLElement } from "node-html-parser";

/**
 * Import a clinic's own public web content (articles, PDFs, video pages) into
 * its knowledge base.
 *
 * Safety: HTTPS only, public hosts only (no localhost / private ranges, checked
 * after DNS resolution), 10s timeout, 3 MB cap, manual redirect handling so a
 * redirect can't bounce the request into a private network.
 */

const MAX_BYTES = 3 * 1024 * 1024;

function isPrivateIp(ip: string) {
  if (ip.includes(":")) {
    const v = ip.toLowerCase();
    return v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("::ffff:127.") || v === "::";
  }
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

async function assertPublicHttps(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("That isn’t a valid link.");
  }
  if (url.protocol !== "https:") throw new Error("Only https:// links can be imported.");
  if (url.username || url.password) throw new Error("Links with credentials aren’t allowed.");
  const host = url.hostname;
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("That host isn’t public.");
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new Error("That host isn’t public.");
  return url;
}

export async function safeFetch(raw: string): Promise<{ url: URL; contentType: string; body: Buffer }> {
  let url = await assertPublicHttps(raw);
  for (let hop = 0; hop < 4; hop++) {
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
      headers: { "user-agent": "AamaContentImport/1.0 (+clinic-approved knowledge base)", accept: "text/html,application/pdf;q=0.9,*/*;q=0.5" },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = await assertPublicHttps(new URL(res.headers.get("location")!, url).toString());
      continue;
    }
    if (!res.ok) throw new Error(`The page returned ${res.status}.`);
    const length = Number(res.headers.get("content-length") ?? 0);
    if (length > MAX_BYTES) throw new Error("That page is too large to import.");
    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) throw new Error("That page is too large to import.");
      chunks.push(value);
    }
    return { url, contentType: res.headers.get("content-type") ?? "", body: Buffer.concat(chunks) };
  }
  throw new Error("Too many redirects.");
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/** The main content of an article page, as "## Heading" sections the chunker understands. */
export function extractArticle(html: string) {
  const root = parse(html, { blockTextElements: { script: false, style: false, noscript: false } });
  root.querySelectorAll("script,style,noscript,nav,header,footer,aside,form,iframe,svg,button,[role=navigation],.menu,.nav,.breadcrumb,.breadcrumbs,.share,.social,.newsletter,.cookie").forEach((n) => n.remove());
  const title = clean(root.querySelector("h1")?.text ?? root.querySelector("title")?.text ?? "Imported page").replace(/\s*[|–-]\s*[^|–-]+$/, "");
  const candidates = ["article", "main", "[role=main]", ".entry-content", ".post-content", ".content", "body"];
  let container: HTMLElement | null = null;
  for (const sel of candidates) {
    const el = root.querySelector(sel);
    if (el && clean(el.text).length > 300) {
      container = el;
      break;
    }
  }
  container ??= root;

  const lines: string[] = [];
  for (const el of container.querySelectorAll("h1,h2,h3,h4,p,li,blockquote")) {
    const text = clean(el.text);
    if (!text || text.length < 2) continue;
    const tag = el.tagName.toLowerCase();
    if (tag === "h1") continue;
    if (/^h[2-4]$/.test(tag)) lines.push(`\n## ${text}`);
    else if (tag === "li") lines.push(`- ${text}`);
    else lines.push(text);
  }
  // Drop exact duplicates (nested elements), keep order.
  const seen = new Set<string>();
  const body = lines.filter((l) => (seen.has(l) ? false : (seen.add(l), true))).join("\n").trim();
  return { title, text: body.startsWith("##") ? body : `## ${title}\n${body}` };
}

export type Discovered = { url: string; title: string; type: "article" | "video" | "pdf" };

/** Same-site links on an index page that look like articles, videos or PDFs. */
export function discoverLinks(html: string, base: URL): Discovered[] {
  const root = parse(html);
  const found = new Map<string, Discovered>();
  for (const a of root.querySelectorAll("a[href]")) {
    let href: URL;
    try {
      href = new URL(a.getAttribute("href")!, base);
    } catch {
      continue;
    }
    if (href.protocol !== "https:" || href.hostname !== base.hostname) continue;
    href.hash = "";
    const path = href.pathname.toLowerCase();
    const type: Discovered["type"] | null = path.endsWith(".pdf")
      ? "pdf"
      : /\/(videos?|watch)\//.test(path)
        ? "video"
        : /\/(article|articles|blog|resources|fundamentals|faq|faqs|guides?|patient-education|learn)\/[^/]+/.test(path)
          ? "article"
          : null;
    if (!type || href.toString() === base.toString()) continue;
    const title = clean(a.getAttribute("title") ?? a.text) || path.split("/").filter(Boolean).pop()!.replace(/[-_]/g, " ");
    const key = href.toString();
    const prev = found.get(key);
    if (!prev || (prev.title.length < 6 && title.length > prev.title.length)) found.set(key, { url: key, title: title.slice(0, 140), type });
  }
  return [...found.values()].slice(0, 60);
}

/** A video page's embeddable URL, if it carries a YouTube/Vimeo player. */
export function findVideoEmbed(html: string, base: URL) {
  const root = parse(html);
  for (const el of root.querySelectorAll("iframe[src],a[href]")) {
    const src = el.getAttribute("src") ?? el.getAttribute("href") ?? "";
    const yt = src.match(/(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([\w-]{6,})/);
    if (yt) return `https://www.youtube.com/watch?v=${yt[1]}`;
    const vm = src.match(/player\.vimeo\.com\/video\/(\d+)|vimeo\.com\/(\d+)/);
    if (vm) return `https://vimeo.com/${vm[1] ?? vm[2]}`;
  }
  return base.toString();
}
