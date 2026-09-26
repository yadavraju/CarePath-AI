"use client";

/**
 * Header menus. Open on hover, click and focus; close on Escape and outside
 * click, with a short delay so the diagonal trip into the panel doesn't
 * dismiss it (pattern from the Vidmoro site nav).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_LINKS, PLATFORM, SPECIALTIES } from "./content";

export const NAV_PILL =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border-2 border-white bg-gradient-to-b from-white to-white/25 px-3.5 font-display text-[14px] font-medium text-ink " +
  "shadow-[0_2px_4px_rgba(51,48,42,0.05)] transition-all duration-300 hover:to-white/60 hover:shadow-[0_4px_10px_-2px_rgba(51,48,42,0.10)]";

const MENUS = [
  {
    id: "platform",
    label: "Platform",
    items: PLATFORM.map((p) => ({ href: `/#platform`, icon: p.icon, title: p.title, blurb: p.blurb, badge: p.ai ? "AI" : null })),
  },
  {
    id: "specialties",
    label: "Specialties",
    items: SPECIALTIES.map((s) => ({ href: `/#specialties`, icon: s.icon, title: s.title, blurb: s.stakes, badge: s.status === "live" ? "Live" : "Next" })),
  },
];

export function SiteNav() {
  const [open, setOpen] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ref = useRef<HTMLElement>(null);
  const hold = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const scheduleClose = useCallback(() => {
    hold();
    timer.current = setTimeout(() => setOpen(null), 120);
  }, [hold]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <nav ref={ref} aria-label="Main" className="hidden items-center gap-2 md:flex" onMouseLeave={scheduleClose}>
      {MENUS.map((menu) => {
        const isOpen = open === menu.id;
        return (
          <div
            key={menu.id}
            className="relative"
            onMouseEnter={() => {
              hold();
              setOpen(menu.id);
            }}
          >
            <button type="button" aria-expanded={isOpen} aria-haspopup="true" onClick={() => setOpen(isOpen ? null : menu.id)} className={cn(NAV_PILL, isOpen && "to-white")}>
              {menu.label}
              <ChevronDown className={cn("h-3.5 w-3.5 text-ink-faint transition-transform", isOpen && "rotate-180")} />
            </button>
            {isOpen && (
              <div onMouseEnter={hold} className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2">
                <div className="grid w-[40rem] grid-cols-2 gap-1 rounded-2xl bg-raised p-2 shadow-[0_16px_40px_-16px_rgba(51,48,42,0.25)] ring-1 ring-line">
                  {menu.items.map((item) => (
                    <a key={item.title} href={item.href} onClick={() => setOpen(null)} className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-canvas">
                      <item.icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-teal" />
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 font-display text-[14px] font-semibold text-ink">
                          {item.title}
                          {item.badge && (
                            <span
                              className={cn(
                                "rounded-full px-1.5 py-px text-[10.5px] font-bold",
                                item.badge === "Live" ? "bg-teal text-white" : item.badge === "AI" ? "bg-navy text-white" : "bg-sunken text-ink-soft",
                              )}
                            >
                              {item.badge}
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block font-display text-[12.5px] leading-snug text-ink-soft">{item.blurb}</span>
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
      {NAV_LINKS.map((l) => (
        <a key={l.href} href={l.href} onMouseEnter={scheduleClose} className={NAV_PILL}>
          {l.label}
        </a>
      ))}
    </nav>
  );
}
