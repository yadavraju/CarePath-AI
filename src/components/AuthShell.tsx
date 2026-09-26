import { Wordmark } from "@/components/ui";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gradient-to-b from-sky-soft to-canvas px-4 py-12">
      <Wordmark />
      {children}
      <a href="/demo" className="rounded-full bg-navy px-5 py-2.5 font-display text-[14px] font-semibold text-white shadow-sm hover:bg-navy/90">
        Judging? Open the live demo — no sign-up →
      </a>
      <p className="max-w-sm text-center font-display text-[12.5px] text-ink-faint">
        Demo environment · fictional clinic · synthetic patients. Don’t enter real health information.
      </p>
    </div>
  );
}
