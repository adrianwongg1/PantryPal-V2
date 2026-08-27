"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Logo } from "@/components/ui/Logo";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { signup, type AuthActionState } from "./actions";

const initialState: AuthActionState = { error: null };

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, initialState);

  // 3b's third card ("Check your email") — reached once signUp() succeeds
  // but returns no session (email confirmation required).
  if (state.message) {
    return (
      <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
        <div className="grid h-24 w-24 place-items-center rounded-full bg-lunch-100">
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="var(--color-lunch-800)" strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2.5" y="5" width="19" height="14" rx="3" />
            <path d="M3.5 7l8.5 6 8.5-6" />
          </svg>
        </div>
        <h1 className="text-2xl">Check your email</h1>
        <p className="text-sm text-[color:var(--color-muted)]">{state.message}</p>
        <Link href="/login" className="text-sm text-accent-700 underline">
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <Logo size={27} title="PantryPal" />
        <h1 className="text-2xl">Make an account</h1>
        <p className="text-sm text-[color:var(--color-muted)]">
          Two fields. Then you can cook.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" required autoComplete="email" placeholder="you@kitchen.com" />
        </Field>
        <Field label="Password — six characters or more" htmlFor="password">
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
          />
        </Field>

        {state.error ? (
          <p role="alert" className="text-sm text-accent-700">
            {state.error}
          </p>
        ) : null}

        <Button type="submit" disabled={pending} block>
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="text-center text-xs text-[color:var(--color-muted)]">
        Your recipes stay private unless you share a link.
      </p>
      <p className="text-center text-sm text-[color:var(--color-muted)]">
        Already have an account?{" "}
        <Link href="/login" className="text-accent-700 underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
