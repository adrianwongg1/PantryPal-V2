import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

export const alt = "A recipe shared from PantryPal";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const MEAL_COLORS: Record<string, { bg: string; fg: string }> = {
  breakfast: { bg: "#fdeecb", fg: "#8a5a12" },
  lunch: { bg: "#e3ecd6", fg: "#4c5f34" },
  dinner: { bg: "#f3ddd2", fg: "#8c491a" },
  snack: { bg: "#f5ead8", fg: "#8c491a" },
  dessert: { bg: "#f0dbe8", fg: "#8a2f5e" },
};

// Rendered through Satori (next/og), same constraint as icon.tsx: no
// stylesheet cascade, so colors are literal hex here (the light-mode
// meal-tint values from globals.css), not var(...) references.
export default async function Image(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_shared_recipe", { p_slug: slug });
  const recipe = data?.[0];

  const title = recipe?.title ?? "Recipe not found";
  const meta = recipe
    ? `${recipe.total_minutes} min · Serves ${recipe.servings}`
    : "";
  const colors = MEAL_COLORS[recipe?.meal_type ?? "dinner"];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: colors.bg,
          color: colors.fg,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 4, textTransform: "uppercase", display: "flex" }}>
          PantryPal
        </div>
        <div style={{ fontSize: 64, marginTop: 24, display: "flex", maxWidth: 1000 }}>{title}</div>
        {meta ? (
          <div style={{ fontSize: 28, marginTop: 32, opacity: 0.8, display: "flex" }}>{meta}</div>
        ) : null}
      </div>
    ),
    { ...size },
  );
}
