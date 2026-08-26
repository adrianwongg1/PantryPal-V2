"use client";

import { useActionState } from "react";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { updateAccountAction, type AccountActionState } from "./actions";

const initialState: AccountActionState = { error: null, message: null };

export function AccountForm({ currentEmail }: { currentEmail: string }) {
  const [state, formAction, pending] = useActionState(updateAccountAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Email" htmlFor="account-email">
        <Input id="account-email" name="email" type="email" placeholder={currentEmail} />
      </Field>
      <Field label="New password" htmlFor="account-password">
        <Input
          id="account-password"
          name="password"
          type="password"
          placeholder="Leave blank to keep your current password"
        />
      </Field>

      {state.error ? (
        <p role="alert" className="text-sm text-snack-800">
          {state.error}
        </p>
      ) : null}
      {state.message ? <p className="text-sm text-lunch-800">{state.message}</p> : null}

      <Button type="submit" disabled={pending} variant="secondary" className="self-start">
        {pending ? "Saving…" : "Update account"}
      </Button>
    </form>
  );
}
