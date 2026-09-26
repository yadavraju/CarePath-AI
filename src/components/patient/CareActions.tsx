"use client";

import { useState, useTransition } from "react";
import { Check, FileSignature, Loader2, Sparkles } from "lucide-react";
import { completeCareItem, explainConsentAction, signConsent } from "@/app/patient/actions";
import { INPUT } from "@/components/ui";

export function CompleteButton({ id, done, label }: { id: string; done: boolean; label: string }) {
  const [pending, start] = useTransition();
  if (done)
    return (
      <span className="inline-flex h-10 items-center gap-2 rounded-full bg-teal-soft px-4 font-display text-[14px] font-semibold text-teal-deep">
        <Check className="h-4 w-4" /> Done
      </span>
    );
  return (
    <button onClick={() => start(() => completeCareItem(id))} disabled={pending} className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-5 font-display text-[14px] font-semibold text-white disabled:opacity-50">
      <Check className="h-4 w-4" /> {pending ? "Saving…" : label}
    </button>
  );
}

export function ConsentSigner({ id, suggestedName }: { id: string; suggestedName: string }) {
  const [explain, setExplain] = useState<{ summary: string; keyPoints: string[]; engine: string } | null>(null);
  const [explaining, startExplain] = useTransition();
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signing, startSign] = useTransition();

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-sky-soft p-5 ring-1 ring-sky">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 font-display text-[14px] font-semibold text-navy">
            <Sparkles className="h-4 w-4" /> Not sure what this means?
          </p>
          {!explain && (
            <button
              onClick={() => startExplain(async () => setExplain(await explainConsentAction(id)))}
              disabled={explaining}
              className="inline-flex h-9 items-center gap-2 rounded-full bg-navy px-4 font-display text-[13px] font-semibold text-white disabled:opacity-60"
            >
              {explaining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Explain in plain language
            </button>
          )}
        </div>
        {explain && (
          <div className="mt-3 space-y-2 text-[14.5px] leading-relaxed text-ink">
            <p>{explain.summary}</p>
            <ul className="space-y-1.5">
              {explain.keyPoints.map((k) => (
                <li key={k} className="flex gap-2.5">
                  <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-navy" /> {k}
                </li>
              ))}
            </ul>
            <p className="font-display text-[12px] text-ink-faint">
              Explained from this form only{explain.engine !== "rules" ? " by AI" : ""}. The signed form above is what counts — ask your care team anything before you sign.
            </p>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          startSign(async () => {
            const r = await signConsent(id, name, agree);
            if (r && "error" in r) setError(r.error ?? "Couldn’t sign.");
          });
        }}
        className="rounded-2xl bg-raised p-5 ring-1 ring-line"
      >
        <p className="flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
          <FileSignature className="h-4 w-4 text-caution" /> Sign this form
        </p>
        <label className="mt-3 grid gap-1">
          <span className="font-display text-[12.5px] font-semibold text-ink-soft">Type your full name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={suggestedName} className={`${INPUT} font-serif text-[20px]`} autoComplete="name" />
        </label>
        <label className="mt-3 flex items-start gap-2.5 text-[14px] text-ink">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 h-4 w-4 accent-teal" />
          I have read this form, had the chance to ask questions, and agree to it. I understand typing my name is my electronic signature.
        </label>
        <div className="mt-4 flex items-center gap-3">
          <button disabled={signing || name.trim().length < 2 || !agree} className="inline-flex h-11 items-center gap-2 rounded-full bg-teal px-6 font-display text-[15px] font-semibold text-white disabled:opacity-40">
            {signing ? "Signing…" : "Sign"}
          </button>
          {error && <span className="text-[13px] text-alert">{error}</span>}
        </div>
      </form>
    </div>
  );
}
