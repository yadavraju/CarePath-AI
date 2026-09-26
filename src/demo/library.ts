/**
 * SAMPLE care library for the fictional demo clinic. Consent text is
 * illustrative only — real consents come from the clinic and its counsel.
 * Videos have no URL: the app shows a clearly marked sample player until the
 * clinic uploads its own.
 */
import type { CareKind, DocumentKind } from "@/db/schema";

const NOTE = "SAMPLE — fictional clinic, for a product demo. Not a real consent form.";

export type LibrarySeed = {
  key: string;
  kind: CareKind;
  title: string;
  summary: string;
  minutes?: number;
  body?: string;
  guideKind?: DocumentKind;
  tags: string[];
};

export const LIBRARY: LibrarySeed[] = [
  {
    key: "video-injection",
    kind: "video",
    title: "Your first subcutaneous injection",
    summary: "Step-by-step: preparing the site, using a pen, and disposing of the needle.",
    minutes: 4,
    tags: ["stimulation", "injection", "day-1"],
  },
  {
    key: "video-menopur",
    kind: "video",
    title: "Mixing Menopur, step by step",
    summary: "Reconstituting the powder with the diluent and drawing up the right amount.",
    minutes: 2,
    tags: ["menopur", "mixing", "stimulation"],
  },
  {
    key: "video-cetrotide",
    kind: "video",
    title: "Starting Cetrotide",
    summary: "Why it’s added around Day 6, and how the morning injection works.",
    minutes: 3,
    tags: ["cetrotide", "day-6"],
  },
  {
    key: "video-trigger",
    kind: "video",
    title: "Your trigger shot: timing matters",
    summary: "How the clinic sets the exact time, and what to do the night of.",
    minutes: 3,
    tags: ["trigger", "day-10"],
  },
  {
    key: "video-retrieval",
    kind: "video",
    title: "What to expect on retrieval day",
    summary: "Arrival, anaesthesia, recovery, and who should drive you home.",
    minutes: 5,
    tags: ["retrieval"],
  },
  {
    key: "doc-meds",
    kind: "document",
    title: "Stimulation Medication Guide",
    summary: "Storage, mixing and injection-site care for your stimulation medications.",
    guideKind: "medication_guide",
    minutes: 6,
    tags: ["stimulation", "storage"],
  },
  {
    key: "doc-missed",
    kind: "document",
    title: "Medication Timing & Missed-Dose Guide",
    summary: "Your confirmation window, and what to do if you’re late or miss a dose.",
    guideKind: "missed_dose",
    minutes: 3,
    tags: ["timing", "missed-dose"],
  },
  {
    key: "doc-symptoms",
    kind: "document",
    title: "When to Call Us — Symptom Guide",
    summary: "Which symptoms are expected, which need a same-day call, and which are an emergency.",
    guideKind: "symptom_guide",
    minutes: 3,
    tags: ["symptoms", "ohss", "safety"],
  },
  {
    key: "consent-ivf",
    kind: "consent",
    title: "Consent for IVF Treatment",
    summary: "Ovarian stimulation, monitoring, egg retrieval and embryology — risks, alternatives and your choices.",
    minutes: 8,
    tags: ["consent", "pre-cycle"],
    body: `${NOTE}

1. Purpose. I am asking Harbor Fertility Center (sample) to provide in vitro fertilization (IVF) treatment, which includes ovarian stimulation with injectable medications, monitoring with blood tests and ultrasounds, egg retrieval under sedation, and fertilization and culture of embryos in the laboratory.

2. Medications. I understand I will self-administer injectable medications on a schedule set by my care team, and that only my care team may change a dose or a time.

3. Risks. I understand the risks explained to me by my physician, including ovarian hyperstimulation syndrome (OHSS), bleeding or infection after retrieval, reactions to anaesthesia, multiple pregnancy, and the possibility that the cycle is cancelled or that no embryos result.

4. Alternatives. I understand the alternatives to IVF that were discussed with me, including no treatment.

5. Questions. I have had the opportunity to ask questions and have them answered. I may withdraw this consent at any time before a procedure by telling my care team.`,
  },
  {
    key: "consent-meds",
    kind: "consent",
    title: "Medication Self-Administration Agreement",
    summary: "Your responsibilities for storing, preparing and timing your injections — and when to call.",
    minutes: 3,
    tags: ["consent", "stimulation"],
    body: `${NOTE}

1. I will store, prepare and inject my medications as shown in my clinic’s guides and training videos.

2. I will take each dose at the time on my clinic-issued schedule and confirm it in the app. If I cannot take a dose within my confirmation window, I will call the on-call nurse line rather than guessing.

3. I will not double a dose, skip a dose, or change a dose unless my care team tells me to.

4. I will call 911 or go to an emergency department for severe abdominal pain, trouble breathing, chest pain, fainting or heavy bleeding, and then call the clinic.`,
  },
  {
    key: "consent-ai",
    kind: "consent",
    title: "Digital Companion & AI Assistance Consent",
    summary: "How the Aama companion uses your clinic’s guides, what it will never do, and how your data is handled.",
    minutes: 2,
    tags: ["consent", "ai", "privacy"],
    body: `${NOTE}

1. What it is. The Aama companion answers questions using only documents my clinic has approved, and shows me the source. It sends reminders and passes my messages to my care team when needed.

2. What it will never do. It will not diagnose me, prescribe, or change my medication dose or timing. It is not an emergency service.

3. My care team sees my messages. Questions it cannot answer, missed check-ins and possible urgent symptoms are sent to my nurse with my schedule and message.

4. My data. My information is used only to provide my care and is never sold. I can ask my clinic to correct or delete my messages.`,
  },
  {
    key: "task-pharmacy",
    kind: "task",
    title: "Pick up your medications",
    summary: "Collect your stimulation medications and check them against your schedule.",
    tags: ["pre-cycle"],
    body: "Check each box and pen against your schedule. Keep Gonal-F pens in the refrigerator until first use.",
  },
  {
    key: "task-sharps",
    kind: "task",
    title: "Set up a sharps container",
    summary: "Have a sharps container ready before your first injection.",
    tags: ["injection", "day-1"],
    body: "Use the container your pharmacy provided. Never recap needles or put them in household trash.",
  },
  {
    key: "task-ride",
    kind: "task",
    title: "Arrange a driver for retrieval day",
    summary: "You’ll have sedation and can’t drive yourself home.",
    tags: ["retrieval"],
    body: "Confirm an adult who can drive you home and stay nearby for the rest of the day.",
  },
];
