"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, FileText, Globe, Loader2, PlayCircle, XCircle } from "lucide-react";
import { importWebItems, scanWebPage } from "@/app/clinic/actions";
import { INPUT } from "@/components/ui";
import { cn } from "@/lib/utils";

type Candidate = { url: string; title: string; type: "article" | "video" | "pdf" };
type Result = { url: string; title: string; ok: boolean; detail: string };

export function WebImport() {
  const [url, setUrl] = useState("");
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Result[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, startScan] = useTransition();
  const [importing, startImport] = useTransition();

  const toggle = (u: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(u)) n.delete(u);
      else if (n.size < 15) n.add(u);
      return n;
    });

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          setResults(null);
          startScan(async () => {
            const r = await scanWebPage(url);
            if ("error" in r) {
              setError(r.error ?? "Couldn’t read that page.");
              setCandidates(null);
            } else {
              setCandidates(r.candidates);
              setPicked(new Set(r.candidates.slice(0, 1).map((c) => c.url)));
            }
          });
        }}
        className="mt-4 flex flex-col gap-2 sm:flex-row"
      >
        <div className="relative flex-1">
          <Globe className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yourclinic.com/resources/" className={`${INPUT} pl-10`} inputMode="url" required />
        </div>
        <button disabled={scanning} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-navy px-5 font-display text-[14px] font-semibold text-white disabled:opacity-60">
          {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />} {scanning ? "Reading page…" : "Scan page"}
        </button>
      </form>
      {error && <p className="mt-2 text-[13px] text-alert">{error}</p>}

      {candidates && (
        <div className="mt-4 rounded-xl bg-canvas p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <p className="font-display text-[13px] font-semibold text-ink">
              Found {candidates.length} · {picked.size} selected <span className="font-normal text-ink-faint">(up to 15 per import)</span>
            </p>
            <button
              disabled={!picked.size || importing}
              onClick={() =>
                startImport(async () => {
                  const r = await importWebItems(candidates.filter((c) => picked.has(c.url)));
                  setResults(r);
                  setPicked(new Set());
                })
              }
              className="inline-flex h-9 items-center gap-2 rounded-full bg-ink px-4 font-display text-[13px] font-semibold text-white disabled:opacity-40"
            >
              {importing && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {importing ? "Importing…" : "Import selected as drafts"}
            </button>
          </div>
          <ul className="mt-2 max-h-72 space-y-px overflow-y-auto">
            {candidates.map((c) => (
              <li key={c.url}>
                <label className={cn("flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-raised", picked.has(c.url) && "bg-raised")}>
                  <input type="checkbox" checked={picked.has(c.url)} onChange={() => toggle(c.url)} className="h-4 w-4 accent-teal" />
                  {c.type === "video" ? <PlayCircle className="h-4 w-4 shrink-0 text-navy" /> : <FileText className="h-4 w-4 shrink-0 text-teal-deep" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] text-ink">{c.title}</span>
                    <span className="block truncate text-[11.5px] text-ink-faint">{c.url}</span>
                  </span>
                  <span className="shrink-0 rounded-md bg-sunken px-1.5 py-0.5 font-display text-[11px] text-ink-soft">{c.type === "video" ? "→ care library" : c.type}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      {results && (
        <ul className="mt-3 space-y-1.5">
          {results.map((r) => (
            <li key={r.url} className="flex items-start gap-2 text-[13px]">
              {r.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-alert" />}
              <span>
                <span className="font-semibold text-ink">{r.title}</span> <span className="text-ink-soft">— {r.detail}</span>
              </span>
            </li>
          ))}
          <li className="pt-1 font-display text-[12.5px] text-ink-faint">Review each draft in the table above, then Approve it to make it answerable.</li>
        </ul>
      )}
    </div>
  );
}
