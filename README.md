# Aama — AI companions for specialist clinics

An AI-native patient-journey platform for specialist clinics — like EngagedMD, with an AI companion for patients and an AI copilot for clinicians. The weeks between visits are where journeys break; the margin for error there is
small. Each patient gets a clinic-approved AI companion built from the clinic's own protocols; staff get an AI copilot and
an exception queue. **First agent live: the IVF medication co-pilot for fertility clinics.** Other specialties on the
landing page are roadmap and marked "Next". **Not an AI doctor** — a protocol companion, reminder system and escalation
layer the clinic controls.

### What's in the app

| Clinic (`/clinic`) | Patient (`/patient`) |
|---|---|
| **Copilot** — chat with Claude over read-only tools (queue, patient summaries, today's doses, care-plan gaps, clinic guides) | **Today** — reminders, schedule changes, what the care team assigned, today's doses, and the companion chat docked at the bottom |
| **Queue** — ranked exceptions (red → missed → questions), auto-refreshing | **My care** — assigned videos, guides, tasks and consent forms |
| **Patient card** — alerts with actions, **personal care plan** (assign from library, personal notes, due dates, ✨ AI-suggested next steps), schedule versions, cited conversation, audit trail | **Consent signing** — full text, ✨ plain-language explanation from the form only (any language), typed-name e-signature with SHA-256 record |
| **Care library** — videos, guides, consents, tasks (assignments snapshot the version) | **Full plan** — the clinic-issued schedule by day |
| **Protocols & guides**, **Controls** (AI pause, red-flag rules, contact path, demo reset) | Help now, language picker, voice input, read-aloud |

> Hackathon prototype. The clinic, patients and documents are fictional and synthetic. No real health information.

## The loop

```
Clinic protocol  →  Patient plan  →  AI support  →  Human escalation
(staff-approved)    (deterministic)  (cited, bounded)  (priority queue)
```

| AI job | Where | Guardrail |
|---|---|---|
| 1 · Protocol parser | `src/lib/ai/protocol.ts` | Staff review every row before activation; missing values become warnings, never guesses |
| 2 · Retrieval with citations | `src/server/retrieve.ts`, `src/lib/ai/answer.ts` | Clinic-scoped, approved docs only; answer withheld without valid evidence ids + score threshold |
| 3 · Safety triage | `src/lib/safety/rules.ts`, `src/server/ask.ts` | Clinic red-flag rules run **before** any model and can't be overridden |
| 4 · Multilingual explanation | `src/lib/ai/translate.ts`, `src/lib/translate/lock.ts` | Med names, doses, times, phone numbers locked and verified; otherwise the English original is shown |
| 5 · Adherence nudges | `src/lib/nudge.ts` | Picks wording only; time and dose come verbatim from the schedule |

Hard stops enforced in code (`src/server/ask.ts`): no diagnosis · no AI-generated dose/timing change (deterministic
refusal + cited missed-dose guide) · no reassurance on an urgent match · no answer when content is missing or
conflicting · "on track" never inferred from silence (closed windows become **missed** alerts).

Every AI job has a deterministic offline path, so every demo beat works with no API key, a bad key, or a model timeout.

## Stack

Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind v4 · Drizzle ORM · Neon Postgres (full-text search with
`ts_rank_cd`) · Clerk · Claude (`claude-opus-5`, structured outputs, server-side refusal fallback) · Vitest.

## Run it

```bash
npm install
cp .env.example .env.local        # DATABASE_URL, Clerk keys, optional ANTHROPIC_API_KEY
npm run db:push                   # create tables
npm run db:seed                   # fictional clinic, 18 active cycles
npm run dev
```

Clerk keys: `clerk auth login && clerk init --app app_3JsZGgtYJ1YkNF9l5DmQsTiz5Dw` (writes them to `.env.local`).

Checks: `npm test` (safety rules, schedule engine, parser, retrieval query, translation locks, nudges) ·
`npm run typecheck` · `npm run lint` · `npm run build`.

## Three-minute demo

Setup: sign up (in dev, any `name+clerk_test@example.com` email with code `424242`), then on `/onboarding` join the
clinic **and** connect patient code **`MAYA-7`**. Open `/patient` and `/clinic` in two tabs. Reset between rehearsals
from **Controls → Reset demo data**.

| Time | Beat | Do this |
|---|---|---|
| 0:00 | Lived pain | Your true moment. “So I built the companion we wished we had.” |
| 0:30 | Today view | Patient tab: Day 7, tonight’s doses with clinic source, “Tomorrow’s schedule changed → I’ve reviewed this”. Demo clock **7:05 PM** → reminder → **I’ve taken it**. |
| 1:10 | Refusal, then a fluent answer | Ask *“Can I take my Menopur late tonight?”* → refuses, cites Missed-Dose Guide p.3, on-call button. Then *“How should I store my Gonal-F pen?”* → cited answer. |
| 1:45 | Safety moment | Ask *“I have severe stomach pain and I’m short of breath”* → clinic emergency guidance, no AI in the path. |
| 2:20 | Clinic view | Clinic tab (auto-refreshes): red item on top → open → message, matched rule, source, schedule → **Contacted patient**. |
| 2:45 | Business close | “Patients pay for confidence. Clinics pay for a calmer, safer workflow. Each side brings the other.” |

Optional beats: **Clinic → Copilot** "Which consents are still unsigned?"; on Maya's card **✨ Suggest next steps** → Assign;
Maya **My care** → consent → *Explain in plain language* → sign; switch the patient to **Español** and ask again (staff see both languages); demo clock **8:45 PM** →
missed confirmation appears in the queue; **Protocols → Import a protocol** → Draft schedule → activate v3.

## Project map

```
src/app/            landing, onboarding, /patient (Today, plan), /clinic (queue, patient card, protocols, controls)
src/server/         ask pipeline, retrieval, reminders sweep, seed, demo clock, auth context
src/lib/            pure logic: safety rules, schedule engine, time, parser, chunking, translation locks, nudges, AI calls
src/demo/content.ts sample clinic documents + protocol (clearly marked as sample)
```

## Before a real pilot

Clinical content and escalation rules approved by a licensed fertility clinician; BAA and HIPAA safeguards (encryption,
role-based access, retention limits); regulatory review of claims — do not promise “not a medical device”.
