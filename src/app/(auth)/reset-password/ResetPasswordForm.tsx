"use client";

import { useActionState, useState } from "react";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { resetPassword, type ResetPasswordActionState } from "./actions";

const initialState: ResetPasswordActionState = { error: null };

export function ResetPasswordForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction, pending] = useActionState(resetPassword, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="New password — six characters or more" htmlFor="password">
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={6}
            autoComplete="new-password"
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

      {state.error ? (
        <p role="alert" className="text-sm text-accent-700">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} block>
        {pending ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}
