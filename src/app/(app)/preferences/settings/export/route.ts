import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";

// Settings' "Download my data" — every row this account owns, as one
// JSON file. A GET behind the (app) layout's own auth check, not a
// Server Action, since the point is a normal browser download
// (Content-Disposition), which Server Actions can't hand back directly.
export async function GET() {
  const { supabase, user } = await requireUser();

  const [profile, preferences, recipes, pantryItems] = await Promise.all([
    supabase.from("profiles").select("username, display_name, created_at").eq("id", user.id).single(),
    supabase.from("user_preferences").select("*").eq("user_id", user.id).single(),
    supabase.from("recipes").select("*").eq("user_id", user.id),
    supabase.from("pantry_items").select("*").eq("user_id", user.id),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    email: user.email,
    profile: profile.data,
    preferences: preferences.data,
    recipes: recipes.data ?? [],
    pantry_items: pantryItems.data ?? [],
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="pantrypal-export-${user.id}.json"`,
    },
  });
}
