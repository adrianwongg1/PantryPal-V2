"use client";

import { useState } from "react";

type TagInputProps = {
  /** Hidden field name a parent <form> reads on submit — value is the
   * current list, JSON-encoded (a plain repeated-input approach doesn't
   * work here since items are added/removed client-side, not native
   * checkboxes). */
  name: string;
  defaultValue?: string[];
  placeholder?: string;
  maxItems?: number;
};

// "Type an allergen and press enter" (1e/6c/7d's allergy field, reused
// as-is by onboarding's "How you eat" step) — free text on purpose, per
// the design's own note: "If it isn't on anyone's list, you can still
// type it." Chips match the canvas's exact treatment (filled accent-700,
// not the outline ChipToggle uses — allergies are typed commitments, not
// toggled choices from a fixed list).
export function TagInput({ name, defaultValue = [], placeholder, maxItems = 20 }: TagInputProps) {
  const [items, setItems] = useState<string[]>(defaultValue);
  const [draft, setDraft] = useState("");

  function commit() {
    const value = draft.trim();
    setDraft("");
    if (!value || items.includes(value) || items.length >= maxItems) return;
    setItems([...items, value]);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[28px] border border-[color:var(--color-divider)] bg-surface p-2.5">
      <input type="hidden" name={name} value={JSON.stringify(items)} />
      {items.map((item) => (
        <span key={item} className="tag bg-accent-700 text-accent-contrast">
          {item}
          <button
            type="button"
            onClick={() => setItems(items.filter((i) => i !== item))}
            className="ml-1.5"
            aria-label={`Remove ${item}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        onBlur={commit}
        placeholder={items.length === 0 ? placeholder : undefined}
        className="min-w-[140px] flex-1 border-0 bg-transparent px-2 py-1 text-sm outline-none"
      />
    </div>
  );
}
