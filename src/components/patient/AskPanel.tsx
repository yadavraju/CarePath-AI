"use client";

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { BookOpen, Loader2, Mic, MicOff, Phone, Send, ShieldAlert, Siren, UserRound, Volume2 } from "lucide-react";
import { ask } from "@/app/patient/actions";
import { SourceTag } from "@/components/ui";
import type { Citation, Language, Message } from "@/db/schema";
import { cn } from "@/lib/utils";

type Props = {
  initial: Message[];
  suggestions: string[];
  language: Language;
  urgentLine: string;
  urgentLineLabel: string;
};

const SPEECH_LANG: Record<Language, string> = { en: "en-US", es: "es-ES", hi: "hi-IN", ne: "ne-NP" };

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onend: () => void;
  onerror: () => void;
  start: () => void;
  stop: () => void;
};

function speechCtor() {
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}
const noopSubscribe = () => () => {};

function useSpeech(lang: Language, onText: (t: string) => void) {
  const [listening, setListening] = useState(false);
  // Browser capability, read without a hydration mismatch (false on the server).
  const supported = useSyncExternalStore(noopSubscribe, () => Boolean(speechCtor()), () => false);
  const rec = useRef<SpeechRec | null>(null);
  useEffect(() => {
    const Ctor = speechCtor();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = SPEECH_LANG[lang];
    r.interimResults = false;
    r.onresult = (e) => onText(Array.from(e.results).map((x) => x[0].transcript).join(" "));
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
  }, [lang, onText]);
  return {
    supported,
    listening,
    toggle: () => {
      if (!rec.current) return;
      if (listening) rec.current.stop();
      else {
        rec.current.start();
        setListening(true);
      }
    },
  };
}

function speak(text: string, lang: Language) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = SPEECH_LANG[lang];
  window.speechSynthesis.speak(u);
}

export function AskPanel({ initial, suggestions, language, urgentLine, urgentLineLabel }: Props) {
  const [messages, setMessages] = useState<Message[]>(initial);
  const [seen, setSeen] = useState(initial);
  const seq = useRef(0);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const speech = useSpeech(language, setText);

  // Server data wins whenever it re-renders (e.g. after revalidation).
  if (initial !== seen) {
    setSeen(initial);
    setMessages(initial);
  }
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length, pending]);

  function submit(q: string) {
    const question = q.trim();
    if (!question || pending) return;
    setError(null);
    setText("");
    const optimistic = { id: `tmp-${++seq.current}`, role: "patient", content: question, createdAt: new Date() } as Message;
    setMessages((m) => [...m, optimistic]);
    start(async () => {
      const res = await ask(question);
      if ("error" in res) {
        setError(res.error ?? "Something went wrong.");
        setMessages((m) => m.filter((x) => x.id !== optimistic.id));
        return;
      }
      setMessages((m) => [...m.filter((x) => x.id !== optimistic.id), res.question, res.reply]);
    });
  }

  const tel = `tel:${urgentLine.replace(/[^\d+]/g, "")}`;

  return (
    <section className="pt-4" aria-label="Ask the clinic companion">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[17px] font-semibold text-ink">Ask the clinic companion</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
            I answer only from your clinic’s approved guides and show the source. I can’t change doses or timing, and I’m not
            for emergencies.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3" aria-live="polite">
        {messages.length === 0 && <p className="py-4 text-center text-[13.5px] text-ink-faint">Try one of the questions below.</p>}
        {messages.map((m) =>
          m.role === "patient" ? (
            <p key={m.id} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-[14.5px] text-white">
              {m.content}
            </p>
          ) : (
            <Reply key={m.id} m={m} tel={tel} urgentLine={urgentLine} urgentLineLabel={urgentLineLabel} language={language} />
          ),
        )}
        {pending && (
          <p className="flex w-fit items-center gap-2 rounded-2xl rounded-bl-md bg-canvas px-4 py-3 text-[13.5px] text-ink-soft">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking your clinic’s guides…
          </p>
        )}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 -mx-4 mt-4 bg-gradient-to-t from-paper via-paper to-paper/0 px-4 pb-4 pt-6 lg:-mx-8 lg:px-8">
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => submit(s)}
            disabled={pending}
            className="rounded-full border border-line bg-paper px-3 py-1.5 text-left text-[12.5px] text-ink-soft transition-colors hover:border-ink/30 hover:text-ink disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(text);
        }}
        className="mt-3 flex items-center gap-2 rounded-2xl bg-raised p-2 pl-4 ring-1 ring-line shadow-[0_8px_30px_-18px_rgba(51,48,42,0.35)] focus-within:ring-ink/30"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={speech.listening ? "Listening…" : "Ask about your plan…"}
          className="min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink-faint focus:outline-none"
          maxLength={600}
          aria-label="Your question"
        />
        {speech.supported && (
          <button
            type="button"
            onClick={speech.toggle}
            aria-label={speech.listening ? "Stop voice input" : "Ask by voice"}
            className={cn("flex h-9 w-9 items-center justify-center rounded-full transition", speech.listening ? "bg-alert text-white" : "text-ink-soft hover:bg-sunken")}
          >
            {speech.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
        )}
        <button disabled={pending || !text.trim()} aria-label="Send" className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-white transition disabled:opacity-25">
          <Send className="h-4 w-4" />
        </button>
      </form>
      {error && <p className="mt-2 text-[13px] text-alert" role="alert">{error}</p>}
      </div>
    </section>
  );
}

function Reply({ m, tel, urgentLine, urgentLineLabel, language }: { m: Message; tel: string; urgentLine: string; urgentLineLabel: string; language: Language }) {
  const [showOriginal, setShowOriginal] = useState(false);
  const [openCite, setOpenCite] = useState<string | null>(null);
  const body = showOriginal && m.contentEnglish ? m.contentEnglish : m.content;

  if (m.outcome === "urgent") {
    return (
      <div className="animate-rise rounded-2xl bg-alert-soft p-4 ring-1 ring-alert/25">
        <p className="flex items-center gap-2 font-display text-[14px] font-bold text-alert">
          <Siren className="h-4 w-4" /> This may need urgent care
        </p>
        <p className="mt-2 text-[14.5px] leading-relaxed text-ink">{body}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <a href="tel:911" className="flex h-11 items-center justify-center gap-2 rounded-full bg-alert font-display text-[14px] font-semibold text-white">
            <Phone className="h-4 w-4" /> Call 911
          </a>
          <a href={tel} className="flex h-11 items-center justify-center gap-2 rounded-full bg-ink font-display text-[14px] font-semibold text-white">
            <Phone className="h-4 w-4" /> {urgentLine}
          </a>
        </div>
        <Citations citations={m.citations} open={openCite} setOpen={setOpenCite} />
        <Original m={m} showOriginal={showOriginal} setShowOriginal={setShowOriginal} />
      </div>
    );
  }

  const tone =
    m.outcome === "timing_question"
      ? "bg-caution-soft/70 ring-caution/20"
      : m.outcome === "withheld" || m.outcome === "ai_paused"
        ? "bg-sunken ring-line"
        : "bg-canvas ring-line";

  return (
    <div className={cn("max-w-[92%] animate-rise rounded-2xl rounded-bl-md p-4 ring-1", tone)}>
      {m.outcome === "timing_question" && (
        <p className="mb-1.5 flex items-center gap-1.5 font-display text-[12.5px] font-bold text-caution">
          <ShieldAlert className="h-3.5 w-3.5" /> Only your care team can change timing
        </p>
      )}
      {(m.outcome === "withheld" || m.outcome === "ai_paused") && (
        <p className="mb-1.5 flex items-center gap-1.5 font-display text-[12.5px] font-bold text-ink-soft">
          <UserRound className="h-3.5 w-3.5" /> Sent to your care team
        </p>
      )}
      <p className="text-[14.5px] leading-relaxed text-ink">{body}</p>
      {m.outcome === "timing_question" && (
        <a href={tel} className="mt-3 inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 font-display text-[13.5px] font-semibold text-white">
          <Phone className="h-4 w-4" /> {urgentLineLabel.split("·")[0].trim()} · {urgentLine}
        </a>
      )}
      <Citations citations={m.citations} open={openCite} setOpen={setOpenCite} />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {m.meta?.fallback && m.outcome === "answered" && (
          <span className="font-display text-[11.5px] text-ink-faint">Quoted directly from your clinic’s guide</span>
        )}
        <button onClick={() => speak(body, showOriginal ? "en" : language)} className="inline-flex items-center gap-1 font-display text-[12px] font-semibold text-ink-soft hover:text-ink">
          <Volume2 className="h-3.5 w-3.5" /> Read aloud
        </button>
        <Original m={m} showOriginal={showOriginal} setShowOriginal={setShowOriginal} />
      </div>
    </div>
  );
}

function Original({ m, showOriginal, setShowOriginal }: { m: Message; showOriginal: boolean; setShowOriginal: (v: boolean) => void }) {
  if (!m.contentEnglish) return null;
  return (
    <button onClick={() => setShowOriginal(!showOriginal)} className="font-display text-[12px] font-semibold text-teal-deep hover:underline">
      {showOriginal ? "Show my language" : "Show clinic’s original (English)"}
    </button>
  );
}

function Citations({ citations, open, setOpen }: { citations: Citation[]; open: string | null; setOpen: (v: string | null) => void }) {
  if (!citations?.length) return null;
  return (
    <div className="mt-3 space-y-2">
      {citations.map((c) => (
        <div key={c.chunkId}>
          <button onClick={() => setOpen(open === c.chunkId ? null : c.chunkId)} className="inline-flex items-center gap-1.5 text-left" aria-expanded={open === c.chunkId}>
            <BookOpen className="h-3.5 w-3.5 text-teal-deep" />
            <SourceTag title={c.documentTitle} page={c.page} version={c.version} />
          </button>
          {open === c.chunkId && (
            <blockquote className="mt-2 border-l-2 border-teal/40 pl-3 text-[13px] leading-relaxed text-ink-soft">{c.excerpt}</blockquote>
          )}
        </div>
      ))}
    </div>
  );
}
