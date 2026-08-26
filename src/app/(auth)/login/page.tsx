"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { MealTag } from "@/components/ui/Tag";
import { login, sendMagicLink, type AuthActionState, type MagicLinkActionState } from "./actions";

const initialLoginState: AuthActionState = { error: null };
const initialMagicState: MagicLinkActionState = { status: "idle" };

// Desktop: 3a's warm-left-panel split. Mobile: 3c's single column (the
// panel is simply hidden, not re-laid-out, below lg). No "Keep me signed
// in" (no clean expression through @supabase/ssr's cookie-based session —
// it would be decorative) and no "Forgot password?" link: the canvas draws
// one, but no reset-password flow exists to send it to, and building one
// is real, unplanned scope beyond this phase — magic link already covers
// "I can't get in another way" for now.
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginState, loginAction, loginPending] = useActionState(login, initialLoginState);
  const [magicState, magicAction, magicPending] = useActionState(
    sendMagicLink,
    initialMagicState,
  );

  return (
    <div className="flex w-full max-w-4xl overflow-hidden rounded-[28px] bg-bg lg:shadow-lg">
      <div className="hidden w-[380px] flex-none flex-col gap-6 bg-surface p-10 lg:flex">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <Logo size={32} />
          <span className="font-heading text-xl text-ink">PantryPal</span>
        </Link>
        <h2 className="text-[30px] leading-[1.15]">Cook what you already have.</h2>
        <p className="text-[14.5px] text-[color:var(--color-muted)]">
          Tell it what&rsquo;s in the fridge, get something you&rsquo;d actually eat. Your
          pantry and preferences follow you everywhere.
        </p>
        <div className="mt-auto flex flex-wrap gap-1.5">
          <MealTag mealType="breakfast">Breakfast</MealTag>
          <MealTag mealType="lunch">Lunch</MealTag>
          <MealTag mealType="dinner">Dinner</MealTag>
          <MealTag mealType="snack">Snack</MealTag>
          <MealTag mealType="dessert">Dessert</MealTag>
        </div>
      </div>

      <div className="flex w-full flex-1 flex-col justify-center gap-6 p-8 lg:p-14">
        <Link href="/" className="flex items-center gap-2 self-center no-underline lg:hidden">
          <Logo size={40} />
        </Link>

        <div className="flex flex-col gap-1 text-center lg:text-left">
          <h1 className="text-3xl">Welcome back</h1>
          <p className="text-sm text-[color:var(--color-muted)]">
            Your pantry is where you left it.
          </p>
        </div>

        <form action={loginAction} className="flex flex-col gap-4">
          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Password" htmlFor="password">
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                className="pr-16"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-accent-700"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </Field>

          {loginState.error ? (
            <p role="alert" className="text-sm text-accent-700">
              {loginState.error}
            </p>
          ) : null}

          <Button type="submit" disabled={loginPending} block>
            {loginPending ? "Logging in…" : "Log in"}
          </Button>
        </form>

        <div className="flex items-center gap-3 text-xs text-[color:var(--color-muted)]">
          <span className="h-px flex-1 bg-[color:var(--color-divider)]" />
          or
          <span className="h-px flex-1 bg-[color:var(--color-divider)]" />
        </div>

        <form action={magicAction} className="flex flex-col gap-2">
          <input type="hidden" name="email" value={email} />
          <Button type="submit" variant="secondary" block disabled={magicPending || !email}>
            {magicPending ? "Sending…" : "Email me a magic link instead"}
          </Button>
          {magicState.status === "sent" ? (
            <p role="status" className="text-center text-xs text-lunch-800">
              If there&rsquo;s an account for that email, a sign-in link is on its way.
            </p>
          ) : null}
          {magicState.status === "error" ? (
            <p role="alert" className="text-center text-xs text-accent-700">
              {magicState.error}
            </p>
          ) : null}
        </form>

        <p className="text-center text-sm text-[color:var(--color-muted)]">
          New here?{" "}
          <Link href="/signup" className="text-accent-700 underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
