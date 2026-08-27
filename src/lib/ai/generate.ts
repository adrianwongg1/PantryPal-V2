import "server-only";
import { generateText, Output, NoOutputGeneratedError } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { createAnthropic } from "@ai-sdk/anthropic";
import { serverEnv } from "@/lib/env.server";
import { recipeContentSchema, type RecipeContent } from "./schema";
import { buildRecipePrompt, buildRewritePrompt, type GenerateRecipeInput } from "./prompt";

export type ModelProvider = "groq" | "anthropic";

export type GenerateRecipeResult =
  | { ok: true; recipe: RecipeContent; provider: ModelProvider }
  | { ok: false; error: string };

const groqProvider = createGroq({ apiKey: serverEnv.GROQ_API_KEY });

// Only constructed when configured — createAnthropic itself doesn't
// validate the key, so this stays a plain conditional rather than a
// try/catch. hasAnthropicFallback lets callers (the Server Action, the
// page) know whether "try a different model" is even offerable.
const anthropicProvider = serverEnv.ANTHROPIC_API_KEY
  ? createAnthropic({ apiKey: serverEnv.ANTHROPIC_API_KEY })
  : null;

export const hasAnthropicFallback = anthropicProvider !== null;

// Test-only escape hatch — deliberately a raw process.env read, not a field
// on serverEnv. serverEnv (env.server.ts) is the app's real, documented
// configuration contract; this flag isn't part of that contract and never
// should be, since it exists purely so e2e specs get a fast, deterministic
// recipe instead of a live model call. playwright.config.ts's webServer.env
// sets it only for the server process Playwright itself spawns — `pnpm dev`
// and a normal `pnpm start` never set it, so using the actual app always
// calls the real Groq/Anthropic APIs, exactly as the user asked: mock in
// test cases, real when using the app.
const MOCK_AI_RESPONSES = process.env.MOCK_AI_RESPONSES === "1";

// Deliberately includes a redundant "(optional)" baked into a name, and an
// ingredient/step shape close to what generateText would actually return
// (quantity+unit, a timer_minutes step) — this is the one path that
// exercises sanitizeRecipe() and the full save round-trip in e2e without
// spending a real API call on every test run. Still routed through
// sanitizeRecipe() below, same as a real response, so the mock proves that
// wiring rather than assuming it.
function buildMockRecipe(input: GenerateRecipeInput): RecipeContent {
  return {
    title: "Mock Seared Chicken Rice Bowl",
    summary: "A deterministic stand-in recipe used by e2e tests — never a real model call.",
    meal_type: input.mealType,
    cuisine: "Test kitchen",
    difficulty: input.difficulty,
    prep_minutes: 10,
    cook_minutes: 15,
    servings: input.servings,
    ingredients: [
      { name: "Chicken thighs", pantry_key: "chicken thighs", quantity: 2, unit: "pieces", optional: false },
      { name: "Rice", pantry_key: "rice", quantity: 1, unit: "cup", optional: false },
      { name: "Lime wedges (optional)", pantry_key: "lime", optional: true },
    ],
    steps: [
      { text: "Cook the rice.", timer_minutes: 15 },
      { text: "Sear the chicken thighs.", timer_minutes: 8 },
      { text: "Combine and serve." },
    ],
    tags: ["mock"],
    diet_tags: [],
  };
}

// Shared by callModel and callModelForRewrite below — both just differ in
// how the {system, prompt} pair gets built, not in how it's sent to the
// model or how the result gets validated/sanitized.
async function runModel(
  provider: ModelProvider,
  system: string,
  prompt: string,
): Promise<RecipeContent> {
  const model =
    provider === "groq"
      ? groqProvider(serverEnv.GROQ_TEXT_MODEL)
      : anthropicProvider!(serverEnv.ANTHROPIC_TEXT_MODEL);

  const result = await generateText({
    model,
    system,
    prompt,
    output: Output.object({ schema: recipeContentSchema }),
    // Groq's strict JSON Schema mode (the OpenAI-lineage convention its
    // gpt-oss models inherit) requires every property to be listed in
    // `required`, including ones the schema marks optional or defaulted —
    // recipeContentSchema uses idiomatic Zod .optional()/.default() almost
    // throughout, and satisfying that convention would mean reworking most
    // of the schema to nullable-with-post-parse-fallback fields, for a
    // Groq-specific quirk Anthropic's own structured-output path doesn't
    // share. Confirmed directly (a real call against this exact schema
    // failed with a strict-mode `required` error, not assumed from docs).
    // Disabling strict mode trades away Groq's grammar-constrained
    // decoding for this call; the existing validation-failure retry (see
    // generateRecipe) is the safety net for the resulting small increase
    // in malformed-output risk.
    providerOptions:
      provider === "groq" ? { groq: { strictJsonSchema: false } } : undefined,
  });

  return sanitizeRecipe(result.output);
}

async function callModel(
  provider: ModelProvider,
  input: GenerateRecipeInput,
): Promise<RecipeContent> {
  if (MOCK_AI_RESPONSES) {
    return sanitizeRecipe(buildMockRecipe(input));
  }
  const { system, prompt } = buildRecipePrompt(input);
  return runModel(provider, system, prompt);
}

// Deterministic stand-in for rewriteRecipe's e2e/test runs — same reasoning
// as buildMockRecipe, just returning a visibly-modified copy of the input
// recipe rather than a canned one, so a test can confirm the pipeline
// actually replaced the form's content and didn't just no-op.
function buildMockRewriteRecipe(current: RecipeContent, instruction: string): RecipeContent {
  return { ...current, title: `${current.title} (rewritten: ${instruction})` };
}

async function callModelForRewrite(
  provider: ModelProvider,
  current: RecipeContent,
  instruction: string,
): Promise<RecipeContent> {
  if (MOCK_AI_RESPONSES) {
    return sanitizeRecipe(buildMockRewriteRecipe(current, instruction));
  }
  const { system, prompt } = buildRewritePrompt(current, instruction);
  return runModel(provider, system, prompt);
}

// Models reliably follow the prompt's instruction to set `optional: true`
// on optional ingredients, but not as reliably the accompanying "don't
// also write (optional) into the name" part — a real, observed pattern (a
// live Groq call produced "Soy sauce (optional)" as the name, doubled up
// with the UI's own "(optional)" suffix into "Soy sauce (optional)
// (optional)"). Prompt-only fixes aren't guaranteed, and this text would
// otherwise persist into the saved recipe, not just a one-time display
// glitch — so it's stripped here, once, right after parsing, before the
// name is used anywhere.
const REDUNDANT_OPTIONAL_SUFFIX = /\s*[([]?\s*optional\s*[)\]]?\s*$/i;

export function sanitizeRecipe(recipe: RecipeContent): RecipeContent {
  return {
    ...recipe,
    ingredients: recipe.ingredients.map((ingredient) => ({
      ...ingredient,
      name: ingredient.name.replace(REDUNDANT_OPTIONAL_SUFFIX, "").trim(),
    })),
  };
}

// Groq -> one retry against Groq, but only for a validation-type failure
// (a schema-invalid or malformed response is often just a one-off model
// hiccup — retrying the same call again can help; retrying an auth/network
// failure the same way can't, so that skips straight to the fallback) ->
// Anthropic, if configured, as the true fallback for the whole chain
// regardless of *why* Groq ultimately failed. Shared by generateRecipe and
// rewriteRecipe below — both want exactly this chain, differing only in
// which model-calling function `attempt` wraps.
async function withFallback(
  attempt: (provider: ModelProvider) => Promise<RecipeContent>,
): Promise<GenerateRecipeResult> {
  let lastError: unknown;

  try {
    const recipe = await attempt("groq");
    return { ok: true, recipe, provider: "groq" };
  } catch (error) {
    lastError = error;
    if (isRetryableGenerationError(error)) {
      try {
        const recipe = await attempt("groq");
        return { ok: true, recipe, provider: "groq" };
      } catch (retryError) {
        lastError = retryError;
      }
    }
  }

  if (anthropicProvider) {
    try {
      const recipe = await attempt("anthropic");
      return { ok: true, recipe, provider: "anthropic" };
    } catch (error) {
      lastError = error;
    }
  }

  return { ok: false, error: describeError(lastError) };
}

// This is the *default* ("Make me something") path — see
// generateWithProvider below for "Try a different model", the canvas's own
// distinct, single-attempt control.
export async function generateRecipe(
  input: GenerateRecipeInput,
): Promise<GenerateRecipeResult> {
  return withFallback((provider) => callModel(provider, input));
}

// Backs the edit form's "Ask for a rewrite" chips (Phase 6) — same
// Groq-then-Anthropic fallback chain as generateRecipe, just calling the
// model with the current recipe + a change instruction instead of a fresh
// pantry description.
export async function rewriteRecipe(
  current: RecipeContent,
  instruction: string,
): Promise<GenerateRecipeResult> {
  return withFallback((provider) => callModelForRewrite(provider, current, instruction));
}

// The canvas's "Try a different model" button (2a) — an explicit,
// user-initiated switch, not part of the automatic fallback chain above.
// No retry of its own: if the user asked for a specific model, one attempt
// against it is what they asked for.
export async function generateWithProvider(
  input: GenerateRecipeInput,
  provider: ModelProvider,
): Promise<GenerateRecipeResult> {
  if (provider === "anthropic" && !anthropicProvider) {
    return { ok: false, error: "The fallback model isn't configured on this deployment." };
  }
  try {
    const recipe = await callModel(provider, input);
    return { ok: true, recipe, provider };
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }
}

function isRetryableGenerationError(error: unknown): boolean {
  // NoOutputGeneratedError: the model responded, but its output didn't
  // parse as JSON or didn't satisfy recipeContentSchema — exactly the
  // "came out as nonsense" case worth one retry. Anything else (auth,
  // network, a provider outage) retrying the same way won't help; move
  // straight to reporting it.
  return NoOutputGeneratedError.isInstance(error);
}

function describeError(error: unknown): string {
  if (NoOutputGeneratedError.isInstance(error)) {
    return "That one came out as nonsense. Nothing was saved.";
  }
  return "Couldn't reach the recipe generator. Try again in a moment.";
}
