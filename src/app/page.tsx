import Link from "next/link";
import { ArrowRight, BookOpenCheck, ClipboardList, Lock, MessageCircleQuestion, PauseCircle, ShieldCheck, Siren, SlidersHorizontal } from "lucide-react";
import { PLATFORM, SPECIALTIES } from "@/components/marketing/content";
import { DashboardMock, MiniQueueMock, PhoneMock } from "@/components/marketing/mocks";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { BTN, BTN_GHOST, CARD, Chip, EYEBROW, SHELL, Wordmark } from "@/components/ui";
import { cn } from "@/lib/utils";

/*
 * Positioning: a platform for cash-pay specialist clinics, where patients pay
 * out of pocket and the margin for error between visits is small. Fertility is
 * the first live agent; every other specialty is labelled "next".
 *
 * Section order follows the proven specialty-care pattern (hero → value →
 * platform modules → overview → specialties → proof → closing CTA). No
 * invented logos, stats or testimonials: the only numbers are public CDC
 * figures and pricing hypotheses marked as such.
 */

export default function Landing() {
  return (
    <div className="min-h-screen bg-paper grain">
      <SiteHeader />
      <main className="relative z-10">
        <Hero />
        <SpecialtyStrip />
        <ValueProps />
        <WhySpecialist />
        <Platform />
        <HowItWorks />
        <Specialties />
        <FertilitySpotlight />
        <Safety />
        <PilotMeasures />
        <Pricing />
        <ClosingCTA />
      </main>
      <Footer />
    </div>
  );
}

function SectionHead({ eyebrow, title, body, center }: { eyebrow: string; title: React.ReactNode; body?: string; center?: boolean }) {
  return (
    <div className={cn("max-w-2xl", center && "mx-auto text-center")}>
      <p className={EYEBROW}>{eyebrow}</p>
      <h2 className="display-2 mt-3 text-balance text-ink">{title}</h2>
      {body && <p className="subtitle mt-4 text-ink-soft">{body}</p>}
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-[560px] bg-gradient-to-b from-sky-soft via-sky-soft/50 to-transparent" />
      <div className={`${SHELL} grid items-center gap-12 pt-14 pb-20 lg:grid-cols-[1.25fr_0.75fr] lg:pt-20`}>
        <div className="animate-rise">
          <p className="inline-flex items-center gap-2 rounded-full bg-raised/80 px-3 py-1 font-display text-[12.5px] font-semibold text-teal-deep ring-1 ring-teal/20">
            <ShieldCheck className="h-3.5 w-3.5" /> AI-native patient journeys for specialist clinics
          </p>
          <h1 className="display-1 mt-6 text-ink [font-size:clamp(2.3rem,4.3vw,3.5rem)]">
            <span className="block">Patients know what’s next.</span>
            <span className="block text-teal">Nurses know who needs them.</span>
          </h1>
          <p className="subtitle mt-5 max-w-xl text-ink-soft">
            Your patients get an AI companion built from your own protocols — today’s plan, cited answers, videos and consents.
            Your clinicians get an AI copilot and a queue of only the patients who need a human. One patient journey, both
            sides of it.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/demo" className={BTN}>
              Try the live demo <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/demo?as=patient" className={BTN_GHOST}>
              See the patient app
            </Link>
          </div>
          <p className="mt-6 flex flex-wrap items-center gap-2 font-display text-[13px] text-ink-soft">
            <Chip tone="teal">Live</Chip> First agent: IVF medication co-pilot · no sign-up needed — mock clinic, synthetic patients
          </p>
        </div>
        <div className="relative animate-rise [animation-delay:120ms]">
          <PhoneMock />
          <div className="absolute -left-10 bottom-10 hidden lg:block">
            <MiniQueueMock />
          </div>
          <p className="mt-4 text-center font-display text-[12px] text-ink-faint lg:hidden">Patient app · clinician queue shown in the demo</p>
        </div>
      </div>
    </section>
  );
}

function SpecialtyStrip() {
  return (
    <section className="border-y border-line bg-mist">
      <div className={`${SHELL} flex flex-wrap items-center justify-center gap-x-7 gap-y-3 py-5`}>
        <span className={EYEBROW}>Built for</span>
        {SPECIALTIES.map((s) => (
          <span key={s.id} className="inline-flex items-center gap-2 font-display text-[13.5px] font-medium text-ink-soft">
            <s.icon className={cn("h-4 w-4", s.status === "live" ? "text-teal" : "text-ink-faint")} /> {s.title}
          </span>
        ))}
      </div>
    </section>
  );
}

function ValueProps() {
  const props = [
    {
      title: "Fewer costly errors between visits",
      body: "Patients see exactly what to do today, from your clinic-issued schedule. Timing questions go to your team — the AI never changes a dose or a time.",
    },
    {
      title: "Less repetition for your care team",
      body: "Routine questions are answered from your approved material with a visible source. Nurses spend their time on the exceptions, not the same five questions.",
    },
    {
      title: "More patients complete the care they paid for",
      body: "Confident patients stay on protocol and show up prepared. Missed check-ins surface the same day instead of at the next visit.",
    },
  ];
  return (
    <section className="py-24">
      <div className={SHELL}>
        <SectionHead eyebrow="Why Aama" title="More confidence for patients. Less risk for your practice." />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {props.map((p, i) => (
            <div key={p.title} className={`${CARD} p-6`}>
              <span className="font-serif text-[28px] text-teal">0{i + 1}</span>
              <h3 className="mt-3 font-display text-[17px] font-semibold text-ink">{p.title}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhySpecialist() {
  const points = [
    ["Every error is expensive", "A mistimed dose, a skipped prep step or a missed red flag can cancel a procedure the patient already paid for — and the review, refund or lost referral lands on the practice."],
    ["The plan changes after every visit", "Specialist protocols are adjusted as results come in. Patients carry a moving plan home and have to get it exactly right."],
    ["Questions don’t keep office hours", "The hardest moments happen at 1 AM, between visits. Patients shouldn’t have to choose between guessing and searching the internet."],
  ];
  return (
    <section className="bg-navy py-24 text-white">
      <div className={`${SHELL} grid gap-12 lg:grid-cols-[0.9fr_1.1fr]`}>
        <div>
          <p className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">The problem</p>
          <h2 className="display-2 mt-3 text-balance">In cash-pay specialist care, the margin for error is small.</h2>
          <p className="subtitle mt-4 text-white/75">
            Patient-journey tools turned the paper binder into videos and checklists. The weeks between visits still run on
            PDFs, phone tag and hope.
          </p>
        </div>
        <div className="space-y-3">
          {points.map(([t, b]) => (
            <div key={t} className="rounded-2xl bg-white/[0.06] p-5 ring-1 ring-white/10">
              <h3 className="font-display text-[16px] font-semibold">{t}</h3>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-white/75">{b}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Platform() {
  return (
    <section id="platform" className="scroll-mt-20 bg-canvas py-24">
      <div className={SHELL}>
        <SectionHead
          eyebrow="The platform"
          title="Everything between visits, on one platform"
          body="Learn, sign, do — and ask. Your protocol becomes each patient’s journey: education and consents chosen for them, a daily plan, a companion that answers from your documents, and exceptions that reach your team with context."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLATFORM.map((f) => (
            <div key={f.id} className={`${CARD} p-6 transition-all duration-200 hover:-translate-y-0.5 hover:ring-ink/20`}>
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-soft text-teal-deep">
                  <f.icon className="h-5 w-5" />
                </span>
                {f.ai && <Chip tone="navy">AI</Chip>}
              </div>
              <h3 className="mt-4 font-display text-[17px] font-semibold text-ink">{f.title}</h3>
              <p className="mt-1 font-display text-[13.5px] font-medium text-teal-deep">{f.blurb}</p>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    ["Your clinic sets the truth", "Upload your protocols and guides. Coordinators approve each document and every patient schedule. Only staff change a dose or a time."],
    ["The patient gets a daily companion", "Today’s tasks in plain language, reminders that adapt to what each patient responds to, and one-tap confirmation."],
    ["AI handles bounded questions", "Answers come only from your approved documents, with the page and version shown. Unsupported questions are withheld and routed."],
    ["Exceptions reach your team", "Urgent symptoms, missed check-ins and unanswered questions land in a ranked queue with the schedule and the message attached."],
  ];
  return (
    <section id="how" className="scroll-mt-20 py-24">
      <div className={SHELL}>
        <SectionHead eyebrow="How it works" title="Clear paths, safer care — from protocol to patient and back" />
        <ol className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map(([t, b], i) => (
            <li key={t} className={`${CARD} relative p-6`}>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal font-display text-[14px] font-bold text-white">{i + 1}</span>
              <h3 className="mt-4 font-display text-[16px] font-semibold text-ink">{t}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{b}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8 rounded-2xl bg-navy p-6 text-white md:flex md:items-center md:justify-between md:gap-8">
          <p className="font-display text-[16px] font-semibold">AI can explain and route. It cannot prescribe.</p>
          <p className="mt-2 text-[14px] leading-relaxed text-white/75 md:mt-0 md:max-w-2xl">
            The model can’t edit a schedule, suppress an urgent rule, search the open web for clinical advice, or answer
            without evidence. The schedule engine is deterministic.
          </p>
        </div>
      </div>
    </section>
  );
}

function Specialties() {
  return (
    <section id="specialties" className="scroll-mt-20 bg-canvas py-24">
      <div className={SHELL}>
        <SectionHead
          eyebrow="Specialties"
          title="One platform. An agent for each service line."
          body="Each specialty agent ships with its own protocol templates, red-flag rules and question library — all approved by your clinicians before a patient sees them. We start where the stakes are highest."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {SPECIALTIES.map((s) => {
            const live = s.status === "live";
            return (
              <div key={s.id} className={cn("flex flex-col rounded-2xl p-6 ring-1", live ? "bg-raised ring-teal/40 shadow-[0_20px_50px_-30px_rgba(27,127,121,0.5)] lg:row-span-2" : "bg-raised/70 ring-line")}>
                <div className="flex items-center justify-between">
                  <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", live ? "bg-teal text-white" : "bg-sunken text-ink-soft")}>
                    <s.icon className="h-5 w-5" />
                  </span>
                  <Chip tone={live ? "teal" : "neutral"}>{live ? "Live" : "Next"}</Chip>
                </div>
                <h3 className="mt-4 font-display text-[17px] font-semibold text-ink">{s.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink">{s.stakes}</p>
                <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">
                  <span className="font-display font-semibold text-ink-soft">Handles: </span>
                  {s.handles}
                </p>
                {live && (
                  <>
                    <ul className="mt-5 space-y-2 border-t border-line pt-5 text-[13.5px] text-ink">
                      {["Cited answers from your medication guides", "Deterministic stimulation schedules", "Missed-dose routing to the on-call line", "OHSS red-flag escalation", "Spanish, Hindi and Nepali explanations"].map((x) => (
                        <li key={x} className="flex gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" /> {x}
                        </li>
                      ))}
                    </ul>
                    <Link href="/demo" className="mt-auto inline-flex items-center gap-1.5 pt-6 font-display text-[14px] font-semibold text-teal-deep hover:underline">
                      Try the fertility agent <ArrowRight className="h-4 w-4" />
                    </Link>
                  </>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-4 font-display text-[12.5px] text-ink-faint">
          “Next” agents are on the roadmap and not yet available. Each launches only after clinician review of its content and
          escalation rules.
        </p>
      </div>
    </section>
  );
}

function FertilitySpotlight() {
  const stats = [
    ["435,426", "ART cycles reported in the U.S. in 2022"],
    ["251,542", "patients carrying a medication plan home"],
    ["457", "reporting clinics answering the 1 AM questions"],
  ];
  return (
    <section className="py-24">
      <div className={`${SHELL} grid items-center gap-12 lg:grid-cols-2`}>
        <div>
          <SectionHead
            eyebrow="Live now · Fertility"
            title="The IVF medication co-pilot"
            body="Fertility is the hardest place to start: daily injections, protocols that change after every monitoring visit, and patients under enormous pressure. Clinics see exceptions, not noise."
          />
          <div className="mt-8 grid grid-cols-3 gap-3">
            {stats.map(([n, l]) => (
              <div key={n} className="rounded-2xl bg-canvas p-4">
                <p className="font-serif text-[28px] leading-none text-teal">{n}</p>
                <p className="mt-2 text-[12.5px] leading-snug text-ink-soft">{l}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 font-display text-[12px] text-ink-faint">Source: U.S. CDC, ART Surveillance, 2022 data.</p>
        </div>
        <DashboardMock />
      </div>
    </section>
  );
}

function Safety() {
  const clinic = [
    [BookOpenCheck, "Approved documents only"],
    [ClipboardList, "Versioned schedules"],
    [SlidersHorizontal, "Editable escalation rules"],
    [PauseCircle, "One-click AI pause"],
  ] as const;
  const stops = [
    "No diagnosis.",
    "No dose or timing change generated by AI.",
    "No reassurance when a message matches an urgent rule.",
    "No answer if supporting clinic content is missing or conflicting.",
    "No “green” status inferred from silence.",
  ];
  return (
    <section id="safety" className="scroll-mt-20 bg-canvas py-24">
      <div className={SHELL}>
        <SectionHead eyebrow="Safety architecture" title="Safety is a product feature, not a disclaimer" />
        <div className="mt-12 grid gap-4 lg:grid-cols-2">
          <div className={`${CARD} p-6`}>
            <p className="font-display text-[16px] font-semibold text-ink">Clinic controls</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {clinic.map(([Icon, label]) => (
                <li key={label} className="flex items-center gap-3 rounded-xl bg-teal-soft/60 px-3 py-3 font-display text-[14px] font-medium text-ink">
                  <Icon className="h-4 w-4 text-teal-deep" /> {label}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-alert-soft/60 p-6 ring-1 ring-alert/15">
            <p className="flex items-center gap-2 font-display text-[16px] font-semibold text-ink">
              <Lock className="h-4 w-4 text-alert" /> Hard stops, in every specialty
            </p>
            <ul className="mt-4 space-y-2.5">
              {stops.map((s) => (
                <li key={s} className="flex gap-2.5 text-[14.5px] text-ink">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-alert" /> {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function PilotMeasures() {
  const cols = [
    { label: "Patient", Icon: MessageCircleQuestion, items: ["Daily task confirmations", "Questions answered with valid sources", "Confidence before and after treatment", "Language preference and comprehension"] },
    { label: "Clinic", Icon: Siren, items: ["Routine contacts avoided", "Median time to review an escalation", "False-positive and missed-triage review", "Nurse-reported interruption burden"] },
  ];
  return (
    <section className="py-24">
      <div className={SHELL}>
        <SectionHead
          eyebrow="Proof, not promises"
          title="What a four-week pilot measures"
          body="We don’t claim clinical outcomes. We measure whether the workflow helps — one specialist clinic, one approved protocol, 20 consenting patients."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {cols.map(({ label, Icon, items }) => (
            <div key={label} className={`${CARD} p-6`}>
              <p className="flex items-center gap-2 font-display text-[16px] font-semibold text-ink">
                <Icon className="h-4 w-4 text-teal" /> {label}
              </p>
              <ul className="mt-4 space-y-2.5">
                {items.map((m) => (
                  <li key={m} className="flex gap-2.5 text-[14.5px] text-ink-soft">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" /> {m}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 bg-canvas py-24">
      <div className={SHELL}>
        <SectionHead
          eyebrow="Pricing"
          title="Free for patients. Simple for clinics."
          body="Free for every patient your clinic enrolls. Clinics pay per clinician seat. We never sell patient data."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-navy p-7 text-white">
            <p className="font-display text-[15px] font-semibold text-white/70">Clinic · per clinician seat</p>
            <p className="mt-2 font-serif text-[44px] leading-none">
              $199<span className="font-display text-[16px] text-white/70"> / seat / month</span>
            </p>
            <p className="mt-4 text-[14.5px] leading-relaxed text-white/80">
              Clinical copilot, exception queue, personalised care plans, care library with e-signature, Protocol Studio, web
              import, audit history and analytics. Every nurse, coordinator and clinician who works the queue is a seat.
            </p>
          </div>
          <div className={`${CARD} p-7`}>
            <p className="font-display text-[15px] font-semibold text-ink-soft">Patients</p>
            <p className="mt-2 font-serif text-[44px] leading-none text-ink">
              $0<span className="font-display text-[16px] text-ink-soft"> · always</span>
            </p>
            <p className="mt-4 text-[14.5px] leading-relaxed text-ink-soft">
              Every enrolled patient gets the full companion: daily plan, cited answers, videos, e-signature, multilingual
              support and Help now. No app store, no card — just the enrollment code from their clinic.
            </p>
          </div>
        </div>
        <p className="mt-4 font-display text-[12.5px] text-ink-faint">Pricing is a starting hypothesis to validate in pilots.</p>
      </div>
    </section>
  );
}

function ClosingCTA() {
  return (
    <section className="py-24">
      <div className={SHELL}>
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-sky-soft to-teal-soft p-10 text-center ring-1 ring-line sm:p-16">
          <h2 className="display-2 mx-auto max-w-2xl text-balance text-ink">
            We’re not replacing your specialists. We’re giving every patient a calm companion that knows when to bring them in.
          </h2>
          <p className="subtitle mx-auto mt-5 max-w-xl text-ink-soft">
            Starting with fertility: we’re looking for one specialist clinic to run a four-week, safety-reviewed pilot with 20
            patients.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/demo" className={BTN}>
              See the fertility agent <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/sign-up" className={BTN_GHOST}>
              Request a pilot
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="relative z-10 border-t border-ink/[0.06] bg-blush font-display text-ink-soft">
      <div className={`${SHELL} grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4`}>
        <div>
          <Wordmark />
          <p className="mt-4 max-w-xs text-[14px] leading-relaxed">
            Clinic-approved AI companions for cash-pay specialist care — built from your protocols, grounded in your documents.
          </p>
        </div>
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Platform</p>
          <ul className="mt-3 space-y-2 text-[14px]">
            {PLATFORM.map((p) => (
              <li key={p.id}>
                <a href="#platform" className="hover:text-ink">{p.title}</a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Specialties</p>
          <ul className="mt-3 space-y-2 text-[14px]">
            {SPECIALTIES.map((s) => (
              <li key={s.id}>
                <a href="#specialties" className="hover:text-ink">
                  {s.title} {s.status === "live" && <span className="ml-1 rounded-full bg-teal px-1.5 text-[10.5px] font-bold text-white">Live</span>}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Company</p>
          <ul className="mt-3 space-y-2 text-[14px]">
            <li><a href="#how" className="hover:text-ink">How it works</a></li>
            <li><a href="#safety" className="hover:text-ink">Safety</a></li>
            <li><a href="#pricing" className="hover:text-ink">Pricing</a></li>
            <li><Link href="/demo" className="hover:text-ink">Open the demo</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink/[0.06]">
        <p className={`${SHELL} py-6 text-[12.5px] leading-relaxed text-ink-faint`}>
          Hackathon prototype. The clinic, patients and documents in this demo are fictional and synthetic. Aama does not provide
          medical advice and is not a substitute for your care team. In an emergency, call 911.
        </p>
      </div>
    </footer>
  );
}
