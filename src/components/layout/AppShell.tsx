import Link from "next/link";

export function AppShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-bg text-ink">
      <header className="flex items-center justify-between border-b border-[color:var(--color-divider)] px-6 py-4">
        <Link
          href="/recipes"
          className="text-[11px] font-heading uppercase tracking-[0.1em] text-accent-700"
        >
          PantryPal
        </Link>

        <div className="flex items-center gap-4 text-sm">
          <span className="text-[color:var(--color-muted)]">{email}</span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-[11px] font-heading uppercase tracking-wide text-accent-700"
            >
              Log out
            </button>
          </form>
        </div>
      </header>

      <main className="flex flex-1 flex-col px-6 py-10">{children}</main>
    </div>
  );
}
