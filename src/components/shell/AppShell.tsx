"use client";

/**
 * The app shell: rail, top bar, workspace — ported from the Vidmoro dashboard.
 *
 *   phone      overlay drawer
 *   desktop    260px rail
 *   collapsed  60px icon rail, remembered per browser
 *
 * The shell is h-[100dvh] and <main> owns the only scroll, so a docked chat
 * composer stays on screen on mobile browsers. Navigation is set in the
 * display face at semibold; the current row is marked by the chip behind it.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { UserButton } from "@clerk/nextjs";
import {
  BookOpen,
  CalendarDays,
  FileText,
  LayoutList,
  Menu,
  MessageSquareText,
  PanelLeft,
  Settings,
  Sparkles,
  Sun,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { LogoMark } from "@/components/ui";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  copilot: Sparkles,
  queue: LayoutList,
  patients: Users,
  protocols: FileText,
  controls: Settings,
  today: Sun,
  plan: CalendarDays,
  chat: MessageSquareText,
  guides: BookOpen,
};

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; exact?: boolean; badge?: number };

const KEY = "aama:rail";
const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener("aama:rail", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("aama:rail", cb);
  };
};
function readCollapsed() {
  try {
    return window.localStorage.getItem(KEY) === "collapsed";
  } catch {
    return false;
  }
}

type Props = {
  homeHref: string;
  workspaceLabel: string;
  nav: NavItem[];
  rail?: React.ReactNode;
  railFooter?: React.ReactNode;
  topRight?: React.ReactNode;
  overlay?: React.ReactNode;
  children: React.ReactNode;
};

export function AppShell({ homeHref, workspaceLabel, nav, rail, railFooter, topRight, overlay, children }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);

  const toggle = useCallback(() => {
    try {
      window.localStorage.setItem(KEY, readCollapsed() ? "expanded" : "collapsed");
    } catch {
      // Storage unavailable: nothing to remember, nothing to toggle.
    }
    window.dispatchEvent(new Event("aama:rail"));
  }, []);

  // A drawer that survives navigation covers the page the user just asked for.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const active = (item: NavItem) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`));

  return (
    <div className="flex h-[100dvh] bg-canvas">
      {open && <div className="fixed inset-0 z-40 bg-ink/20 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[268px] flex-col bg-canvas transition-transform duration-200 ease-out",
          "lg:relative lg:z-auto lg:translate-x-0 lg:transition-[width]",
          open ? "translate-x-0" : "-translate-x-full",
          collapsed ? "lg:w-[60px]" : "lg:w-[260px]",
        )}
      >
        <div className={cn("flex h-14 shrink-0 items-center gap-1", collapsed ? "px-2" : "px-3")}>
          <Link href={homeHref} className={cn("flex min-w-0 flex-1 items-center gap-2", collapsed && "justify-center")}>
            <LogoMark className={cn("shrink-0", collapsed ? "h-[22px] w-[22px]" : "h-6 w-6")} />
            {!collapsed && (
              <span className="min-w-0">
                <span className="block truncate font-display text-[15px] font-bold leading-tight tracking-tight text-ink">Aama</span>
                <span className="block truncate font-display text-[11px] leading-tight text-ink-faint">{workspaceLabel}</span>
              </span>
            )}
          </Link>
          {!collapsed && (
            <button onClick={toggle} aria-label="Collapse sidebar" className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-sunken hover:text-ink lg:flex">
              <PanelLeft className="h-[17px] w-[17px]" />
            </button>
          )}
          <button onClick={() => setOpen(false)} aria-label="Close navigation" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-faint active:bg-sunken lg:hidden">
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2">
          {collapsed && (
            <button onClick={toggle} aria-label="Expand sidebar" className="mb-1 hidden h-9 w-full items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-sunken hover:text-ink lg:flex">
              <PanelLeft className="h-[17px] w-[17px]" />
            </button>
          )}
          <nav className="space-y-px" aria-label="Workspace">
            {nav.map((item) => {
              const Icon = ICONS[item.icon] ?? Sparkles;
              const on = active(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-9 items-center gap-2.5 rounded-lg font-display text-[13.5px] font-semibold transition-colors",
                    collapsed ? "justify-center px-0" : "px-2.5",
                    on ? "bg-sunken text-ink" : "text-ink-soft hover:bg-sunken/60 hover:text-ink",
                  )}
                >
                  <Icon className={cn("h-[17px] w-[17px] shrink-0", on ? "text-ink" : "text-ink-faint")} />
                  {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                  {!!item.badge &&
                    (collapsed ? (
                      <span className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-alert" />
                    ) : (
                      <span className="rounded-full bg-alert px-1.5 text-[11px] font-bold text-white">{item.badge}</span>
                    ))}
                </Link>
              );
            })}
          </nav>
          {!collapsed && rail}
        </div>

        {!collapsed && railFooter && <div className="shrink-0 border-t border-line px-3 py-3">{railFooter}</div>}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 bg-canvas px-2 lg:px-4">
          <button onClick={() => setOpen(true)} aria-label="Open navigation" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-soft active:bg-sunken lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <div className="flex shrink-0 items-center gap-2">
            {topRight}
            <div className="ml-1 flex h-9 items-center">
              <UserButton />
            </div>
          </div>
        </header>
        {/* The workspace sits on a raised sheet, like the Vidmoro studio. */}
        <main className="min-h-0 flex-1 overflow-y-auto rounded-tl-2xl bg-paper ring-1 ring-line lg:mr-2 lg:mb-2 lg:rounded-2xl">{children}</main>
      </div>
      {overlay}
    </div>
  );
}

/** A collapsible titled group in the rail (e.g. "Needs you", "Today"). */
export function RailSection({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="mb-1 flex items-center justify-between px-2.5">
        <span className="text-[12px] text-ink-faint">{title}</span>
        {action}
      </div>
      <div className="space-y-px">{children}</div>
    </div>
  );
}
