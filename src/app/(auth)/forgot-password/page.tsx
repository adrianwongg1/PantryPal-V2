"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Logo } from "@/components/ui/Logo";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { requestPasswordReset, type ForgotPasswordActionState } from "./actions";

const initialState: ForgotPasswordActionState = { status: "idle" };

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  // Same "check your email" swap as signup/page.tsx's post-signUp card —
  // shown for every submission, not just ones for a real account, since
  // that's the whole point of the generic copy (see actions.ts).
  if (state.status === "sent") {
    return (
      <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
        <div className="grid h-24 w-24 place-items-center rounded-full bg-lunch-100">
          <svg
            width="42"
            height="42"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-lunch-800)"
            strokeWidth={2.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="2.5" y="5" width="19" height="14" rx="3" />
            <path d="M3.5 7l8.5 6 8.5-6" />
          </svg>
        </div>
        <h1 className="text-2xl">Check your email</h1>
        <p className="text-sm text-[color:var(--color-muted)]">
          If there&rsquo;s an account for that email, you&rsquo;ll receive an email with a link
          to reset your password.
        </p>
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
        <h1 className="text-2xl">Reset your password</h1>
        <p className="text-sm text-[color:var(--color-muted)]">
          Enter your email and we&rsquo;ll send you a link to reset it.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@kitchen.com"
          />
        </Field>

        {state.status === "error" ? (
          <p role="alert" className="text-sm text-accent-700">
            {state.error}
          </p>
        ) : null}

        <Button type="submit" disabled={pending} block>
          {pending ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="text-center text-sm text-[color:var(--color-muted)]">
        <Link href="/login" className="text-accent-700 underline">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
