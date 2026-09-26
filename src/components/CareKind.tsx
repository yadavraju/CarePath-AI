import { CheckSquare, FileSignature, FileText, PlayCircle } from "lucide-react";
import type { CareKind, CareStatus } from "@/db/schema";
import { cn } from "@/lib/utils";

const ICON = { video: PlayCircle, document: FileText, consent: FileSignature, task: CheckSquare } as const;
const TINT: Record<CareKind, string> = {
  video: "bg-sky text-navy",
  document: "bg-teal-soft text-teal-deep",
  consent: "bg-caution-soft text-caution",
  task: "bg-sunken text-ink-soft",
};
export const KIND_LABEL: Record<CareKind, string> = { video: "Video", document: "Guide", consent: "Consent", task: "Task" };

export function CareKindIcon({ kind, className }: { kind: CareKind; className?: string }) {
  const Icon = ICON[kind];
  return (
    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", TINT[kind], className)}>
      <Icon className="h-[18px] w-[18px]" />
    </span>
  );
}

export function isDone(status: CareStatus, kind: CareKind) {
  return kind === "consent" ? status === "signed" : status === "completed" || (kind === "document" && status === "viewed");
}

export const STATUS_LABEL: Record<CareStatus, string> = { assigned: "To do", viewed: "Opened", completed: "Done", signed: "Signed" };
