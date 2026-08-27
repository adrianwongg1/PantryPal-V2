"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { ComponentType } from "react";
import { Logo } from "@/components/ui/Logo";
import { Sheet } from "@/components/ui/Sheet";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import {
  GenerateIcon,
  LogOutIcon,
  PantryIcon,
  PreferencesIcon,
  RecipesIcon,
  WeekIcon,
} from "@/components/ui/icons";

type NavItem = { href: string; label: string; Icon: ComponentType<{ size?: number }> };

// The turn-7 sidebar (1a/2a's 4-item nav is the earlier, superseded state —
// 7a/7c/7d all show this 5-item version once "This week" exists) is taken
// as canonical. /generate, /week, /pantry, /preferences are ComingSoon
// stubs until their own phases land; linking to them now rather than
// hiding them means the nav is the real, final shape from day one.
const NAV_ITEMS: NavItem[] = [
  { href: "/generate", label: "Generate", Icon: GenerateIcon },
  { href: "/recipes", label: "My recipes", Icon: RecipesIcon },
  { href: "/week", label: "This week", Icon: WeekIcon },
  { href: "/pantry", label: "Pantry", Icon: PantryIcon },
  { href: "/preferences", label: "Preferences", Icon: PreferencesIcon },
];

// The design canvas's own mobile bottom bar only fits 4 tabs, one short of
// the 5-item desktop nav, and disagrees with itself across artboards
// (2b/5b/6b) about what the 4th one even is. Taken as: the 3 items with a
// real page reachable within this phase's build order, plus "You" as a
// single account/overflow sheet — not its own destination page — which is
// where "This week" and "Preferences" both live on mobile, alongside
// theme and sign-out.
const MOBILE_TABS: NavItem[] = [
  { href: "/generate", label: "Generate", Icon: GenerateIcon },
  { href: "/recipes", label: "Recipes", Icon: RecipesIcon },
  { href: "/pantry", label: "Pantry", Icon: PantryIcon },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  active,
  showLabel,
}: {
  item: NavItem;
  active: boolean;
  showLabel: boolean;
}) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      title={showLabel ? undefined : item.label}
      className={`flex items-center gap-2.5 rounded-full px-3 py-2.5 text-sm no-underline ${
        active ? "bg-bg text-accent-700" : "text-ink"
      } ${showLabel ? "" : "justify-center"}`}
    >
      <item.Icon />
      {showLabel ? item.label : <span className="sr-only">{item.label}</span>}
    </Link>
  );
}

function AccountSheetContent({ email }: { email: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <span className="h-7 w-7 flex-none rounded-full bg-accent-2-300" />
        <span className="truncate text-sm text-[color:var(--color-muted)]">{email}</span>
        <ThemeToggle className="btn btn-icon ml-auto" />
      </div>
      <nav className="flex flex-col gap-1">
        <Link href="/week" className="flex items-center gap-2.5 rounded-full px-3 py-2.5 text-sm no-underline text-ink">
          <WeekIcon /> This week
        </Link>
        <Link
          href="/preferences"
          className="flex items-center gap-2.5 rounded-full px-3 py-2.5 text-sm no-underline text-ink"
        >
          <PreferencesIcon /> Preferences
        </Link>
        <Link
          href="/preferences/settings"
          className="flex items-center gap-2.5 rounded-full px-3 py-2.5 text-sm no-underline text-ink"
        >
          <PreferencesIcon /> Settings
        </Link>
      </nav>
      <form action="/auth/signout" method="post">
        <button type="submit" className="btn btn-ghost btn-block justify-start">
          <LogOutIcon /> Log out
        </button>
      </form>
    </div>
  );
}

export function AppShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [accountOpen, setAccountOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-bg text-ink md:flex-row">
      {/* Mobile-only brand bar — the sidebar (which carries the logo on
          md+) is hidden entirely below md. */}
      <header className="flex items-center gap-2 border-b border-[color:var(--color-divider)] bg-surface px-4 py-3 md:hidden">
        <Logo size={22} />
        <span className="font-heading text-base">PantryPal</span>
      </header>

      {/* Desktop sidebar: full width, icon + label. Tablet: icon rail
          only, same nav, no labels. Both hidden below md (mobile uses the
          bottom tab bar instead). */}
      <aside className="hidden flex-none flex-col gap-7 bg-surface p-3.5 md:flex md:w-[72px] md:items-center lg:w-[214px] lg:items-stretch">
        <Link
          href="/recipes"
          className="flex items-center gap-2.5 px-2 no-underline lg:px-2"
        >
          <Logo />
          <span className="hidden font-heading text-[19px] lg:inline">PantryPal</span>
        </Link>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <div key={item.href} className="lg:hidden">
              <NavLink item={item} active={isActive(pathname, item.href)} showLabel={false} />
            </div>
          ))}
          {NAV_ITEMS.map((item) => (
            <div key={item.href} className="hidden lg:block">
              <NavLink item={item} active={isActive(pathname, item.href)} showLabel={true} />
            </div>
          ))}
        </nav>

        {/* Tablet: icon rail, no room for an email. Desktop: full footer. */}
        <div className="mt-auto flex flex-col items-center gap-3 lg:hidden">
          <ThemeToggle className="btn btn-icon" />
          <form action="/auth/signout" method="post">
            <button type="submit" title="Log out" className="btn btn-ghost btn-icon">
              <LogOutIcon />
            </button>
          </form>
        </div>
        <div className="mt-auto hidden flex-col gap-2 lg:flex">
          <div className="flex items-center gap-2.5 px-1.5 text-xs text-[color:var(--color-muted)]">
            <span className="h-6 w-6 flex-none rounded-full bg-accent-2-300" />
            <span className="truncate">{email}</span>
            <ThemeToggle className="btn btn-icon ml-auto" />
          </div>
          <form action="/auth/signout" method="post">
            <button type="submit" className="btn btn-ghost btn-block justify-start">
              <LogOutIcon /> Log out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex flex-1 flex-col px-6 py-10 pb-24 md:pb-10">{children}</main>

      {/* Mobile bottom tab bar. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t border-[color:var(--color-divider)] bg-surface py-2 md:hidden"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        {MOBILE_TABS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-1 px-3 py-1 text-[10px] no-underline ${
                active ? "text-accent-700" : "text-[color:var(--color-muted)]"
              }`}
            >
              <item.Icon size={20} />
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setAccountOpen(true)}
          className="flex flex-col items-center gap-1 px-3 py-1 text-[10px] text-[color:var(--color-muted)]"
        >
          <span className="h-5 w-5 rounded-full bg-accent-2-300" />
          You
        </button>
      </nav>

      <Sheet open={accountOpen} onClose={() => setAccountOpen(false)} title="Your account">
        <AccountSheetContent email={email} />
      </Sheet>
    </div>
  );
}
