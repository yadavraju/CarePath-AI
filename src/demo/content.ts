/**
 * SAMPLE CLINIC CONTENT — fictional clinic, synthetic patients.
 *
 * Written to demonstrate the workflow, not to instruct anyone. Every document
 * says so on page 1, and a real deployment replaces all of it with material
 * approved by the clinic's licensed fertility clinicians.
 *
 * Format: pages separated by "--- Page N ---", sections by "## Heading".
 */
import type { DocumentKind } from "@/db/schema";

export const DEMO_CLINIC = {
  name: "Harbor Fertility Center (sample)",
  slug: "harbor-sample",
  urgentLine: "(555) 010-4477",
  urgentLineLabel: "On-call nurse line · 24/7",
  emergencyInstruction:
    "If you have severe abdominal pain, trouble breathing, chest pain, fainting or heavy bleeding, call 911 or go to the nearest emergency department now. Then call our on-call nurse line.",
};

const SAMPLE_NOTE = "SAMPLE CONTENT — fictional clinic for a product demo. Not medical advice.";

export const DEMO_DOCUMENTS: { title: string; kind: DocumentKind; version: number; text: string }[] = [
  {
    title: "Stimulation Medication Guide",
    kind: "medication_guide",
    version: 3,
    text: `--- Page 1 ---
## About this guide
${SAMPLE_NOTE} This guide explains the stimulation medications on your calendar. Your personal doses and times are always the ones on your clinic-issued schedule. If this guide and your schedule ever seem to disagree, call the on-call nurse line before your next dose.

## Gonal-F (follitropin alfa)
Gonal-F helps several follicles grow at the same time. It is given as a subcutaneous injection with a pre-filled pen, usually in the lower abdomen at least two inches from the belly button. Take it in the evening at the time shown on your schedule, at about the same time every day.

--- Page 2 ---
## Storing your medications
Before first use, keep Gonal-F pens in the refrigerator. After first use, a pen may be kept in the refrigerator or at room temperature below 77°F for up to 28 days. Do not freeze. Menopur vials and diluent can be kept in the refrigerator or at room temperature. Keep all medications away from direct sunlight and out of a hot car.

## Travelling with medications
Carry medications in an insulated bag with a cold pack, but do not let pens touch the ice directly. Bring your schedule and extra needles. Keep medications in your carry-on bag when flying.

--- Page 3 ---
## Mixing Menopur
Mix Menopur right before you inject it. Do not mix it ahead of time and do not store mixed medication. Wash your hands, clean the vial tops with an alcohol swab, draw up the diluent, add it slowly to the powder, and swirl gently — do not shake. Your clinic's two-minute mixing video in the app shows every step.

## Cetrotide (cetrorelix)
Cetrotide stops you from ovulating too early. Start it only on the day your clinic tells you — usually around Day 6 — and take it in the morning at the time on your schedule. Keep taking it every morning until your clinic tells you to stop.

--- Page 4 ---
## Injection sites
Rotate injection sites. Mild redness, stinging, itching or a small bruise at the injection site is common and usually fades within a day or two. A cold pack for a few minutes before or after the injection can help. Tell your nurse at your next visit if a site stays red, hot or swollen.`,
  },
  {
    title: "Medication Timing & Missed-Dose Guide",
    kind: "missed_dose",
    version: 2,
    text: `--- Page 1 ---
## Why timing matters
${SAMPLE_NOTE} Stimulation medications work best when they are taken at about the same time each day. Your clinic sets a time for every dose and a confirmation window around it. Please tap Done in the app after each dose so your care team knows your plan is on track.

--- Page 2 ---
## Your confirmation window
Each dose on your schedule has a window set by your clinic — for evening stimulation medications it is one hour after the scheduled time. Taking a dose within that window is on schedule. If you know you will be away at dose time, contact your clinic ahead of time; only your care team can change a scheduled time.

--- Page 3 ---
## If you are late or miss a dose
Do not take a double dose and do not take two doses close together to catch up. The app cannot change your dose or your timing. If you cannot take a medication within your window, or you are unsure whether a dose was taken, call the on-call nurse line for time-sensitive medication questions. The nurse will tell you exactly what to do for your protocol.

## If a dose was spilled or the pen jammed
Do not try to estimate a partial dose. Call the on-call nurse line and keep the pen or vial so the nurse can help you work out what happened.`,
  },
  {
    title: "When to Call Us — Symptom Guide",
    kind: "symptom_guide",
    version: 1,
    text: `--- Page 1 ---
## Common, expected effects
${SAMPLE_NOTE} During stimulation many people notice mild bloating, breast tenderness, tiredness, mood changes or mild injection-site bruising. These are common. Mention them at your next monitoring visit.

--- Page 2 ---
## Call the on-call nurse line the same day
Call the same day if you have bloating that is getting worse, nausea, mild to moderate abdominal discomfort that does not settle, or a headache that does not go away. Your nurse may want to see you sooner than your next visit.

--- Page 3 ---
## Call 911 or go to the emergency department now
Call 911 or go to the nearest emergency department now, then call the on-call line, if you have severe abdominal pain, shortness of breath or trouble breathing, chest pain, fainting, heavy vaginal bleeding, you cannot keep fluids down, you are urinating very little, or you gain more than 2 pounds in a day. These can be signs of ovarian hyperstimulation syndrome (OHSS) or another serious problem.`,
  },
  {
    title: "Your Cycle — Frequently Asked Questions",
    kind: "faq",
    version: 1,
    text: `--- Page 1 ---
## Monitoring appointments
${SAMPLE_NOTE} Monitoring visits include a blood test and an ultrasound and usually take about 30 minutes. Arrive at the time on your schedule. You do not need to fast. After each visit the nurse will call or message you with any changes to your medication plan for the next days.

## Exercise during stimulation
Light activity such as walking is fine. As your ovaries grow, avoid running, jumping, high-impact exercise and twisting movements until your clinic tells you it is safe.

--- Page 2 ---
## Alcohol and smoking
Please avoid alcohol and do not smoke or vape during your treatment cycle.

## When will I know about the trigger shot?
Your clinic decides the trigger shot time after a monitoring visit, based on your follicle sizes. The nurse will give you an exact time, which will appear in the app. The timing of the trigger shot is precise — take it at exactly the time your clinic gives you.`,
  },
];

/**
 * The protocol the coordinator "uploads" in the demo. Line format the offline
 * parser understands:  Day A[-B] | HH:MM | Name | Dose | Instruction | p.N
 */
export const DEMO_PROTOCOL_TEXT = `ANTAGONIST STIMULATION PROTOCOL — SAMPLE (fictional)
Clinic: Harbor Fertility Center (sample)
Reference: Stimulation Medication Guide v3

Day 1-10 | 19:30 | Gonal-F | 225 IU | Subcutaneous injection in the lower abdomen with your pen. Same time each evening. | p.1
Day 1-10 | 19:30 | Menopur | 75 IU | Mix right before injecting; do not store mixed medication. | p.3
Day 6-10 | 08:00 | Cetrotide | 0.25 mg | Morning injection to prevent early ovulation. Continue until told to stop. | p.3
Day 5 | 07:30 | Monitoring visit | - | Blood test and ultrasound. No fasting needed. | p.1
Day 8 | 07:30 | Monitoring visit | - | Blood test and ultrasound. Nurse will call with any plan changes. | p.1
Day 10 | 07:30 | Monitoring visit | - | Blood test and ultrasound; trigger timing decided after this visit. | p.1`;

export const DEMO_PATIENT_CODE = "MAYA-7";

/** Questions preloaded on the patient screen, in demo order. */
export const DEMO_QUESTIONS = [
  "Can I take my Menopur late tonight?",
  "How should I store my Gonal-F pen?",
  "Is it okay to drink coffee during stimulation?",
  "I have severe stomach pain and I'm short of breath",
];

export const OTHER_PATIENTS: { alias: string; language: "en" | "es" | "hi" | "ne"; day: number }[] = [
  { alias: "Priya S.", language: "en", day: 9 },
  { alias: "Ana G.", language: "es", day: 4 },
  { alias: "Jordan K.", language: "en", day: 2 },
  { alias: "Lena M.", language: "en", day: 6 },
  { alias: "Sofia R.", language: "es", day: 8 },
  { alias: "Aisha B.", language: "en", day: 3 },
  { alias: "Mei L.", language: "en", day: 10 },
  { alias: "Grace O.", language: "en", day: 5 },
  { alias: "Nisha T.", language: "ne", day: 7 },
  { alias: "Hannah W.", language: "en", day: 1 },
  { alias: "Camila D.", language: "es", day: 6 },
  { alias: "Riya P.", language: "hi", day: 8 },
  { alias: "Emma J.", language: "en", day: 4 },
  { alias: "Zoe F.", language: "en", day: 9 },
  { alias: "Fatima A.", language: "en", day: 2 },
  { alias: "Olivia C.", language: "en", day: 5 },
  { alias: "Isabel V.", language: "es", day: 3 },
];
