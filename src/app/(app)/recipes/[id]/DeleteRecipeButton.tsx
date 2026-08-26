"use client";

import { useState, useTransition } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { deleteRecipeAction } from "./actions";

export function DeleteRecipeButton({ recipeId }: { recipeId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Delete
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Delete this recipe?"
        actions={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              onClick={() => startTransition(() => deleteRecipeAction(recipeId))}
              disabled={pending}
            >
              {pending ? "Deleting…" : "Delete"}
            </Button>
          </>
        }
      >
        This can&rsquo;t be undone.
      </Sheet>
    </>
  );
}
