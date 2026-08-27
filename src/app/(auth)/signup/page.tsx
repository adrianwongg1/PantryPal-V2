"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup, type AuthActionState } from "./actions";

const initialState: AuthActionState = { error: null };

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, initialState);

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <span className="text-[11px] font-heading uppercase tracking-[0.1em] text-accent-700">
          PantryPal
        </span>
        <h1 className="text-2xl">Create an account</h1>
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
            minLength={6}
            autoComplete="new-password"
            className="border border-[color:var(--color-divider)] bg-surface px-3 py-2 text-ink"
          />
        </label>

        {state.error ? (
          <p role="alert" className="text-sm text-accent-700">
            {state.error}
          </p>
        ) : null}

        {state.message ? (
          <p role="status" className="text-sm text-ink">
            {state.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="font-heading text-sm bg-accent text-ink px-5 py-2.5 disabled:opacity-45"
        >
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="text-center text-sm text-[color:var(--color-muted)]">
        Already have an account?{" "}
        <Link href="/login" className="text-accent-700 underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
