import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { Wordmark } from "@/components/ui";
import { NAV_PILL, SiteNav } from "./SiteNav";

const NAV_PILL_SOLID =
  "inline-flex h-9 items-center justify-center rounded-lg border-2 border-ink bg-ink px-4 font-display text-[14px] font-semibold text-white " +
  "shadow-[0_2px_4px_rgba(51,48,42,0.10)] transition-all duration-300 hover:bg-ink/90";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 bg-paper/80 backdrop-blur-md">
      <div className="mx-auto grid h-[4.25rem] w-full max-w-[76rem] grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 sm:px-8">
        <Wordmark />
        <SiteNav />
        <div className="col-start-3 flex items-center justify-end gap-2">
          <Show when="signed-out">
            <Link href="/sign-in" className={`${NAV_PILL} hidden sm:inline-flex`}>
              Log in
            </Link>
            <Link href="/demo" className={NAV_PILL_SOLID}>
              Try the demo
            </Link>
          </Show>
          <Show when="signed-in">
            <Link href="/app" className={NAV_PILL_SOLID}>
              Open app
            </Link>
          </Show>
        </div>
      </div>
    </header>
  );
}
