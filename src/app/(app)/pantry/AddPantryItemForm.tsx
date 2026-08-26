"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PANTRY_CATEGORIES, PANTRY_CATEGORY_LABELS, type PantryCategory } from "@/lib/pantry/categories";
import { addPantryItemAction } from "./actions";

export function AddPantryItemForm() {
  const [text, setText] = useState("");
  const [category, setCategory] = useState<PantryCategory | "">("");
  const [expiresOn, setExpiresOn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    if (!text.trim() || pending) return;
    const formData = new FormData();
    formData.set("text", text);
    formData.set("category", category);
    formData.set("expiresOn", expiresOn);

    startTransition(async () => {
      const result = await addPantryItemAction(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setText("");
      setExpiresOn("");
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-[30px] bg-surface p-5">
      <div className="flex flex-wrap gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder={'Add anything — "2 limes", "half a bag of rice"'}
          className="min-w-[220px] flex-1"
        />
        <Input
          type="date"
          value={expiresOn}
          onChange={(e) => setExpiresOn(e.target.value)}
          className="w-[160px]"
          aria-label="Expires on (optional)"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as PantryCategory | "")}
          className="input w-[160px]"
          aria-label="Where it lives (optional)"
        >
          <option value="">Where it lives…</option>
          {PANTRY_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {PANTRY_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <Button type="button" onClick={handleAdd} disabled={pending || text.trim().length === 0}>
          {pending ? "Adding…" : "Add"}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-snack-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}
