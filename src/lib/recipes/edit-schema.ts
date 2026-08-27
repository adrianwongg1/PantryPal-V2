import { z } from "zod";
import { recipeContentSchema } from "@/lib/ai/schema";

// recipeContentSchema (lib/ai/schema.ts) is deliberately the content
// contract only — it validates model output and a DB row's content
// columns, neither of which ever carries visibility. The edit form is the
// one place visibility is actually set, so it gets its own schema that
// extends the content contract rather than growing recipeContentSchema
// itself to cover a field two of its three boundaries never see.
export const visibilitySchema = z.enum(["private", "unlisted", "public"]);
export type Visibility = z.infer<typeof visibilitySchema>;

export const editRecipeSchema = recipeContentSchema.extend({
  visibility: visibilitySchema,
});
export type EditRecipeValues = z.infer<typeof editRecipeSchema>;
