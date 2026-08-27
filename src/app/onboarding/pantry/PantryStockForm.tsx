"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { parsePantryEntry, type ParsedPantryEntry } from "@/lib/pantry/parse";
import { finishPantryStep, skipPantryStep, type PantryStepActionState } from "./actions";

const initialState: PantryStepActionState = { error: null };

type StockedItem = ParsedPantryEntry & { key: string };

function describe(item: ParsedPantryEntry): string | null {
  if (item.quantity === null && item.unit === null) return null;
  const qty = item.quantity !== null ? trimNumber(item.quantity) : "";
  return [qty, item.unit].filter(Boolean).join(" ");
}

function trimNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export function PantryStockForm() {
  const [state, formAction, pending] = useActionState(finishPantryStep, initialState);
  const [items, setItems] = useState<StockedItem[]>([]);
  const [draft, setDraft] = useState("");

  function addDraft() {
    const value = draft.trim();
    if (!value) return;
    const parsed = parsePantryEntry(value);
    if (items.some((item) => item.name.toLowerCase() === parsed.name.toLowerCase())) {
      setDraft("");
      return;
    }
    setItems([...items, { ...parsed, key: `${Date.now()}-${parsed.name}` }]);
    setDraft("");
  }

  return (
    <form action={formAction} className="flex w-full max-w-lg flex-col gap-6">
      <div>
        <div className="mb-2 text-[10.5px] uppercase tracking-[0.1em] text-accent-700">
          Step 2 of 2
        </div>
        <h1 className="mb-2 text-[29px]">Stock the pantry</h1>
        <p className="text-sm text-[color:var(--color-muted)]">
          Add a few things — parses quantity and unit for you. Everything else can wait
          until you actually need it.
        </p>
      </div>

      <input type="hidden" name="items" value={JSON.stringify(items)} />

      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addDraft();
            }
          }}
          placeholder={'Add anything — "2 limes", "half a bag of rice"'}
          className="flex-1"
        />
        <Button type="button" variant="secondary" onClick={addDraft}>
          Add
        </Button>
      </div>

      {items.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => (
            <li
              key={item.key}
              className="flex items-center gap-3 rounded-full bg-surface px-4 py-2.5 text-sm"
            >
              <span className="flex-1">{item.name}</span>
              {describe(item) ? (
                <span className="tag tag-neutral">{describe(item)}</span>
              ) : null}
              <button
                type="button"
                onClick={() => setItems(items.filter((i) => i.key !== item.key))}
                aria-label={`Remove ${item.name}`}
                className="text-[color:var(--color-muted)]"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {state.error ? (
        <p role="alert" className="text-sm text-accent-700">
          {state.error}
        </p>
      ) : null}

      <div className="flex gap-2.5">
        <Button
          type="submit"
          formAction={skipPantryStep}
          variant="secondary"
          className="flex-1"
        >
          Skip
        </Button>
        <Button type="submit" disabled={pending} className="flex-[2]">
          {pending
            ? "Saving…"
            : items.length > 0
              ? `Add ${items.length} and finish`
              : "Finish"}
        </Button>
      </div>
    </form>
  );
}
