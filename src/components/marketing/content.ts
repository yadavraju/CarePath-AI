/**
 * Landing-page content as data, so the nav menus, the platform grid and the
 * specialty grid can't drift from each other.
 *
 * Status is honest: only the fertility agent is live. Everything marked
 * "next" is roadmap, and the page says so.
 */
import {
  Activity,
  Bone,
  FileSearch,
  HeartPulse,
  LayoutList,
  type LucideIcon,
  MessageCircleQuestion,
  Ruler,
  ScanText,
  ShieldCheck,
  Siren,
  Sparkles,
  Stethoscope,
} from "lucide-react";

export type Status = "live" | "next";

export const PLATFORM: { id: string; icon: LucideIcon; title: string; blurb: string; body: string; ai?: boolean }[] = [
  {
    id: "companion",
    icon: MessageCircleQuestion,
    title: "Companion",
    blurb: "Cited answers from your approved guides, 24/7",
    body: "Patients ask by text or voice, in their language. Every answer quotes your document, page and version — or is withheld and routed to your team.",
    ai: true,
  },
  {
    id: "studio",
    icon: ScanText,
    title: "Protocol Studio",
    blurb: "Turn protocols into schedules, with staff sign-off",
    body: "Upload a protocol and AI drafts the patient schedule. It flags anything missing instead of guessing, and nothing goes live until a coordinator confirms it.",
    ai: true,
  },
  {
    id: "plan",
    icon: LayoutList,
    title: "Daily Plan",
    blurb: "Exactly what to do today, with one-tap check-off",
    body: "Deterministic, versioned schedules. Reminders adapt their wording to each patient — never the time or the dose.",
  },
  {
    id: "queue",
    icon: Siren,
    title: "Exception Queue",
    blurb: "Nurses see who needs them — not everyone",
    body: "Urgent symptoms, missed confirmations and unanswered questions arrive ranked, with the schedule, the message and the source attached.",
  },
  {
    id: "safety",
    icon: ShieldCheck,
    title: "Safety Controls",
    blurb: "Your red-flag rules run before any AI",
    body: "Editable escalation rules, approved-documents-only retrieval and a one-click pause for AI answers. Clinical authority stays with you.",
  },
  {
    id: "audit",
    icon: FileSearch,
    title: "Audit & Review",
    blurb: "Every answer, source and action on the record",
    body: "Full audit trail with model and prompt versions. Nurses mark answers helpful, incomplete or unsafe, feeding content revision — not autonomous learning.",
  },
];

export const SPECIALTIES: { id: string; icon: LucideIcon; title: string; status: Status; stakes: string; handles: string }[] = [
  {
    id: "fertility",
    icon: HeartPulse,
    title: "Fertility & egg freezing",
    status: "live",
    stakes: "A mistimed injection can cost a cycle patients paid for out of pocket.",
    handles: "Stimulation schedules, mixing and storage questions, missed-dose routing, OHSS red flags, dose changes after monitoring.",
  },
  {
    id: "weight",
    icon: Activity,
    title: "Medical weight loss",
    status: "next",
    stakes: "Titration schedules change monthly and side-effect questions arrive at night.",
    handles: "Dose-escalation calendars, injection guidance, side-effect triage, refill and check-in adherence.",
  },
  {
    id: "bariatric",
    icon: Ruler,
    title: "Bariatric surgery",
    status: "next",
    stakes: "Pre-op diets and post-op stages decide whether surgery goes ahead safely.",
    handles: "Pre-op liquid diets, post-op diet stages, supplement schedules, dehydration and complication red flags.",
  },
  {
    id: "plastics",
    icon: Sparkles,
    title: "Plastic & cosmetic surgery",
    status: "next",
    stakes: "Patients pay up front and judge the practice by recovery week.",
    handles: "Pre-op medication holds, drain and garment care, recovery milestones, infection and bleeding red flags.",
  },
  {
    id: "ortho",
    icon: Bone,
    title: "Orthopedic & sports surgery",
    status: "next",
    stakes: "Rehab adherence in the first weeks shapes the outcome of an elective procedure.",
    handles: "Pre-op instructions, anticoagulant schedules, rehab milestones, DVT and wound red flags.",
  },
  {
    id: "mens",
    icon: Stethoscope,
    title: "Men’s health & urology",
    status: "next",
    stakes: "Private, cash-pay care where patients hesitate to call with questions.",
    handles: "Procedure prep and recovery, medication protocols, follow-up testing, discreet question routing.",
  },
];

export const NAV_LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
];
