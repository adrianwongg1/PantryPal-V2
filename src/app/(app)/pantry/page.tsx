import { requireUser } from "@/lib/supabase/server";
import {
  PANTRY_CATEGORIES,
  PANTRY_CATEGORY_LABELS,
  UNCATEGORIZED_LABEL,
  isUseSoon,
  type PantryCategory,
} from "@/lib/pantry/categories";
import { AddPantryItemForm } from "./AddPantryItemForm";
import { deletePantryItemAction } from "./actions";

type PantryRow = {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  expires_on: string | null;
};

function formatQuantity(item: PantryRow): string | null {
  if (item.quantity === null) return item.unit;
  const qty = Number.isInteger(item.quantity) ? item.quantity : item.quantity.toFixed(2);
  return [qty, item.unit].filter(Boolean).join(" ");
}

export default async function PantryPage() {
  const { supabase, user } = await requireUser();

  const { data: items, error } = await supabase
    .from("pantry_items")
    .select("id, name, quantity, unit, category, expires_on")
    .eq("user_id", user.id)
    .eq("status", "have")
    .order("name");

  if (error) throw error;

  const groups = new Map<string, PantryRow[]>();
  for (const category of PANTRY_CATEGORIES) groups.set(category, []);
  groups.set(UNCATEGORIZED_LABEL, []);

  for (const item of items) {
    const key =
      item.category && (PANTRY_CATEGORIES as readonly string[]).includes(item.category)
        ? (item.category as PantryCategory)
        : UNCATEGORIZED_LABEL;
    groups.get(key)!.push(item);
  }

  const orderedGroups: [string, PantryRow[]][] = [
    ...PANTRY_CATEGORIES.map((c) => [PANTRY_CATEGORY_LABELS[c], groups.get(c)!] as [string, PantryRow[]]),
    [UNCATEGORIZED_LABEL, groups.get(UNCATEGORIZED_LABEL)!] as [string, PantryRow[]],
  ].filter(([, rows]) => rows.length > 0);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <h1 className="text-2xl">Your pantry</h1>

      <AddPantryItemForm />

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 border border-dashed border-[color:var(--color-divider)] py-24 text-center">
          <p className="text-base">Nothing in your pantry yet.</p>
          <p className="text-sm text-[color:var(--color-muted)]">
            Add what you&rsquo;ve got above — PantryPal uses it to tell you how close a recipe
            is to ready.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {orderedGroups.map(([label, rows]) => (
            <div key={label}>
              <h2 className="mb-2.5 text-sm text-[color:var(--color-muted)]">{label}</h2>
              <ul className="flex flex-col gap-1.5">
                {rows.map((item) => {
                  const soon = isUseSoon(item.expires_on);
                  return (
                    <li
                      key={item.id}
                      className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-sm ${
                        soon ? "bg-snack-100 text-snack-800" : "bg-surface"
                      }`}
                    >
                      <span className="flex-1">{item.name}</span>
                      {formatQuantity(item) ? (
                        <span className="tag tag-neutral">{formatQuantity(item)}</span>
                      ) : null}
                      {soon ? (
                        <span className="tag" style={{ background: "transparent", color: "inherit" }}>
                          use soon
                        </span>
                      ) : null}
                      <form action={deletePantryItemAction.bind(null, item.id)}>
                        <button
                          type="submit"
                          aria-label={`Remove ${item.name}`}
                          className="text-[color:var(--color-muted)]"
                        >
                          ×
                        </button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
