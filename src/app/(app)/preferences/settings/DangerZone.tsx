"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { deleteAccountAction, type DeleteAccountState } from "./actions";

const initialState: DeleteAccountState = { error: null };

export function DangerZone() {
  const [confirmText, setConfirmText] = useState("");
  const [state, formAction, pending] = useActionState(deleteAccountAction, initialState);

  return (
    <div className="flex flex-col gap-3 rounded-[30px] border border-snack-300 bg-snack-100 p-5">
      <div className="card-title text-snack-800">Delete account</div>
      <p className="text-sm text-snack-800">
        Deletes your account, every recipe, and everything in your pantry. This can&rsquo;t be
        undone.
      </p>
      <form action={formAction} className="flex flex-wrap items-center gap-2.5">
        <label className="flex flex-1 flex-col gap-1 text-xs text-snack-800">
          Type DELETE to confirm
          <input
            name="confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="input min-w-[160px] max-w-[200px]"
            autoComplete="off"
          />
        </label>
        <Button type="submit" disabled={pending || confirmText !== "DELETE"}>
          {pending ? "Deleting…" : "Delete my account"}
        </Button>
      </form>
      {state.error ? (
        <p role="alert" className="text-sm text-snack-800">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
