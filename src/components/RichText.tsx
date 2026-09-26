import Link from "next/link";
import { Fragment } from "react";

/**
 * Renders the tiny markdown subset the copilot is told to use: "- " bullets and
 * **bold**. Bold patient names become links to their card. Nothing else is
 * interpreted — no HTML ever reaches the page.
 */
export function RichText({ text, patients = [] }: { text: string; patients?: { alias: string; id: string }[] }) {
  const lines = text.split("\n");
  const blocks: { type: "p" | "ul"; lines: string[] }[] = [];
  for (const line of lines) {
    const bullet = /^\s*[-*•]\s+/.test(line);
    const content = line.replace(/^\s*[-*•]\s+/, "");
    const last = blocks[blocks.length - 1];
    if (!line.trim()) {
      blocks.push({ type: "p", lines: [] });
      continue;
    }
    if (bullet) {
      if (last?.type === "ul") last.lines.push(content);
      else blocks.push({ type: "ul", lines: [content] });
    } else if (last?.type === "p" && last.lines.length) last.lines.push(content);
    else blocks.push({ type: "p", lines: [content] });
  }

  const inline = (s: string, key: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
      const m = part.match(/^\*\*(.+)\*\*$/);
      if (!m) return <Fragment key={`${key}-${i}`}>{part}</Fragment>;
      const p = patients.find((x) => x.alias === m[1] || x.alias.split(" ")[0] === m[1]);
      return p ? (
        <Link key={`${key}-${i}`} href={`/clinic/patients/${p.id}`} className="font-semibold text-teal-deep underline decoration-teal/30 underline-offset-2 hover:decoration-teal">
          {m[1]}
        </Link>
      ) : (
        <strong key={`${key}-${i}`} className="font-semibold text-ink">
          {m[1]}
        </strong>
      );
    });

  return (
    <div className="space-y-2.5 text-[14.5px] leading-relaxed text-ink">
      {blocks
        .filter((b) => b.lines.length)
        .map((b, i) =>
          b.type === "ul" ? (
            <ul key={i} className="space-y-1.5">
              {b.lines.map((l, j) => (
                <li key={j} className="flex gap-2.5">
                  <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-ink-faint" />
                  <span>{inline(l, `${i}-${j}`)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p key={i}>{inline(b.lines.join(" "), `${i}`)}</p>
          ),
        )}
    </div>
  );
}
