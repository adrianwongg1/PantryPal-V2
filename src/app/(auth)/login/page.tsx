"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, type AuthActionState } from "./actions";

const initialState: AuthActionState = { error: null };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <span className="text-[11px] font-heading font-extrabold uppercase tracking-[0.1em] text-accent">
          PantryPal
        </span>
        <h1 className="text-2xl">Log in</h1>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="border border-[color:var(--color-divider)] bg-surface px-3 py-2 text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="border border-[color:var(--color-divider)] bg-surface px-3 py-2 text-ink"
          />
        </label>

        {state.error ? (
          <p role="alert" className="text-sm text-accent">
            {state.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="font-heading font-extrabold text-sm bg-accent text-bg px-5 py-2.5 disabled:opacity-45"
        >
          {pending ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="text-center text-sm text-[color:var(--color-muted)]">
        New here?{" "}
        <Link href="/signup" className="text-accent underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
