import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GenerateRecipeInput } from "./prompt";

vi.mock("server-only", () => ({}));

// A fake standing in for the real NoOutputGeneratedError -- generate.ts
// imports the real one from "ai" and calls its static isInstance(), so the
// mock below must be the exact class generate.ts's own `error instanceof`
// checks (via isInstance) will see, not a lookalike.
class FakeNoOutputGeneratedError extends Error {
  static isInstance(error: unknown): error is FakeNoOutputGeneratedError {
    return error instanceof FakeNoOutputGeneratedError;
  }
}

const generateTextMock = vi.fn();

vi.mock("ai", () => ({
  generateText: (...args: unknown[]) => generateTextMock(...args),
  Output: { object: (spec: unknown) => ({ __outputSpec: spec }) },
  NoOutputGeneratedError: FakeNoOutputGeneratedError,
}));

const groqModelMock = vi.fn((modelId: string) => ({ provider: "groq", modelId }));
const anthropicModelMock = vi.fn((modelId: string) => ({ provider: "anthropic", modelId }));

vi.mock("@ai-sdk/groq", () => ({
  createGroq: () => groqModelMock,
}));

vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: () => anthropicModelMock,
}));

const VALID_INPUT: GenerateRecipeInput = {
  freeText: "chicken, rice, lime",
  servings: 2,
  maxMinutes: 30,
  difficulty: "easy",
  mealType: "dinner",
  preferences: {
    diets: [],
    allergies: [],
    dislikedIngredients: [],
    preferredCuisines: [],
    spiceLevel: 1,
  },
  pantryItems: [],
};

const FAKE_RECIPE = {
  title: "Charred Lime Chicken Rice",
  meal_type: "dinner",
  difficulty: "easy",
  prep_minutes: 8,
  cook_minutes: 14,
  servings: 2,
  ingredients: [{ name: "Chicken", pantry_key: "chicken", optional: false }],
  steps: [{ text: "Cook it." }],
  tags: [],
  diet_tags: [],
};

async function importGenerateWithEnv(env: {
  GROQ_API_KEY: string;
  ANTHROPIC_API_KEY?: string;
}) {
  vi.doMock("@/lib/env.server", () => ({
    serverEnv: {
      ...env,
      GROQ_TEXT_MODEL: "openai/gpt-oss-120b",
      ANTHROPIC_TEXT_MODEL: "claude-haiku-4-5",
      GROQ_TRANSCRIPTION_MODEL: "whisper-large-v3-turbo",
    },
  }));
  return import("./generate");
}

beforeEach(() => {
  vi.resetModules();
  generateTextMock.mockReset();
  groqModelMock.mockClear();
  anthropicModelMock.mockClear();
});

afterEach(() => {
  vi.doUnmock("@/lib/env.server");
});

describe("generateRecipe — Anthropic configured", () => {
  it("returns the Groq result on a first-try success, without retrying or touching Anthropic", async () => {
    generateTextMock.mockResolvedValueOnce({ output: FAKE_RECIPE });
    const { generateRecipe } = await importGenerateWithEnv({
      GROQ_API_KEY: "gsk_test",
      ANTHROPIC_API_KEY: "sk-ant-test",
    });

    const result = await generateRecipe(VALID_INPUT);

    expect(result).toEqual({ ok: true, recipe: FAKE_RECIPE, provider: "groq" });
    expect(generateTextMock).toHaveBeenCalledTimes(1);
    expect(anthropicModelMock).not.toHaveBeenCalled();
  });

  it("retries Groq once on a validation failure, and succeeds on the retry", async () => {
    generateTextMock
      .mockRejectedValueOnce(new FakeNoOutputGeneratedError("bad json"))
      .mockResolvedValueOnce({ output: FAKE_RECIPE });
    const { generateRecipe } = await importGenerateWithEnv({
      GROQ_API_KEY: "gsk_test",
      ANTHROPIC_API_KEY: "sk-ant-test",
    });

    const result = await generateRecipe(VALID_INPUT);

    expect(result).toEqual({ ok: true, recipe: FAKE_RECIPE, provider: "groq" });
    expect(generateTextMock).toHaveBeenCalledTimes(2);
    expect(anthropicModelMock).not.toHaveBeenCalled();
  });

  it("falls back to Anthropic after Groq fails validation twice", async () => {
    generateTextMock
      .mockRejectedValueOnce(new FakeNoOutputGeneratedError("bad json"))
      .mockRejectedValueOnce(new FakeNoOutputGeneratedError("bad json again"))
      .mockResolvedValueOnce({ output: FAKE_RECIPE });
    const { generateRecipe } = await importGenerateWithEnv({
      GROQ_API_KEY: "gsk_test",
      ANTHROPIC_API_KEY: "sk-ant-test",
    });

    const result = await generateRecipe(VALID_INPUT);

    expect(result).toEqual({ ok: true, recipe: FAKE_RECIPE, provider: "anthropic" });
    expect(generateTextMock).toHaveBeenCalledTimes(3);
    expect(anthropicModelMock).toHaveBeenCalledWith("claude-haiku-4-5");
  });

  it("does not retry Groq on a non-validation (transport) error — goes straight to Anthropic", async () => {
    generateTextMock
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValueOnce({ output: FAKE_RECIPE });
    const { generateRecipe } = await importGenerateWithEnv({
      GROQ_API_KEY: "gsk_test",
      ANTHROPIC_API_KEY: "sk-ant-test",
    });

    const result = await generateRecipe(VALID_INPUT);

    expect(result).toEqual({ ok: true, recipe: FAKE_RECIPE, provider: "anthropic" });
    // Only 2 calls total: one Groq attempt (no retry), one Anthropic attempt.
    expect(generateTextMock).toHaveBeenCalledTimes(2);
    expect(groqModelMock).toHaveBeenCalledTimes(1);
  });

  it("reports a failure when both Groq (after its retry) and Anthropic fail", async () => {
    generateTextMock
      .mockRejectedValueOnce(new FakeNoOutputGeneratedError("bad"))
      .mockRejectedValueOnce(new FakeNoOutputGeneratedError("still bad"))
      .mockRejectedValueOnce(new FakeNoOutputGeneratedError("anthropic also bad"));
    const { generateRecipe } = await importGenerateWithEnv({
      GROQ_API_KEY: "gsk_test",
      ANTHROPIC_API_KEY: "sk-ant-test",
    });

    const result = await generateRecipe(VALID_INPUT);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/nonsense/);
    }
  });
});

describe("generateRecipe — Anthropic not configured", () => {
  it("reports hasAnthropicFallback as false", async () => {
    const { hasAnthropicFallback } = await importGenerateWithEnv({
      GROQ_API_KEY: "gsk_test",
    });
    expect(hasAnthropicFallback).toBe(false);
  });

  it("fails after Groq's retry is exhausted, without ever calling Anthropic", async () => {
    generateTextMock
      .mockRejectedValueOnce(new FakeNoOutputGeneratedError("bad"))
      .mockRejectedValueOnce(new FakeNoOutputGeneratedError("still bad"));
    const { generateRecipe } = await importGenerateWithEnv({
      GROQ_API_KEY: "gsk_test",
    });

    const result = await generateRecipe(VALID_INPUT);

    expect(result.ok).toBe(false);
    expect(generateTextMock).toHaveBeenCalledTimes(2);
    expect(anthropicModelMock).not.toHaveBeenCalled();
  });
});

describe("generateWithProvider — the explicit 'Try a different model' path", () => {
  it("makes exactly one attempt against the requested provider, no retry", async () => {
    generateTextMock.mockRejectedValueOnce(new FakeNoOutputGeneratedError("bad"));
    const { generateWithProvider } = await importGenerateWithEnv({
      GROQ_API_KEY: "gsk_test",
      ANTHROPIC_API_KEY: "sk-ant-test",
    });

    const result = await generateWithProvider(VALID_INPUT, "groq");

    expect(result.ok).toBe(false);
    expect(generateTextMock).toHaveBeenCalledTimes(1);
  });

  it("returns a clear error when asked for Anthropic but it isn't configured", async () => {
    const { generateWithProvider } = await importGenerateWithEnv({
      GROQ_API_KEY: "gsk_test",
    });

    const result = await generateWithProvider(VALID_INPUT, "anthropic");

    expect(result).toEqual({
      ok: false,
      error: "The fallback model isn't configured on this deployment.",
    });
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("succeeds against the explicitly requested provider", async () => {
    generateTextMock.mockResolvedValueOnce({ output: FAKE_RECIPE });
    const { generateWithProvider } = await importGenerateWithEnv({
      GROQ_API_KEY: "gsk_test",
      ANTHROPIC_API_KEY: "sk-ant-test",
    });

    const result = await generateWithProvider(VALID_INPUT, "anthropic");

    expect(result).toEqual({ ok: true, recipe: FAKE_RECIPE, provider: "anthropic" });
  });
});

describe("sanitizeRecipe", () => {
  it("strips a redundant '(optional)' suffix the model wrote into an ingredient name", async () => {
    const { sanitizeRecipe } = await importGenerateWithEnv({ GROQ_API_KEY: "gsk_test" });
    const result = sanitizeRecipe({
      ...FAKE_RECIPE,
      ingredients: [
        { name: "Soy sauce (optional)", pantry_key: "soy sauce", optional: true },
        { name: "Lime wedges for garnish (Optional)", pantry_key: "lime", optional: true },
      ],
    } as never);
    expect(result.ingredients.map((i) => i.name)).toEqual([
      "Soy sauce",
      "Lime wedges for garnish",
    ]);
  });

  it("leaves a name with no such suffix unchanged", async () => {
    const { sanitizeRecipe } = await importGenerateWithEnv({ GROQ_API_KEY: "gsk_test" });
    const result = sanitizeRecipe({
      ...FAKE_RECIPE,
      ingredients: [{ name: "Chicken breast", pantry_key: "chicken", optional: false }],
    } as never);
    expect(result.ingredients[0].name).toBe("Chicken breast");
  });

  it("does not strip 'optional' when it's genuinely part of the name, not a trailing marker", async () => {
    const { sanitizeRecipe } = await importGenerateWithEnv({ GROQ_API_KEY: "gsk_test" });
    const result = sanitizeRecipe({
      ...FAKE_RECIPE,
      ingredients: [{ name: "Optional Foods brand stock cube", pantry_key: "stock cube", optional: false }],
    } as never);
    expect(result.ingredients[0].name).toBe("Optional Foods brand stock cube");
  });
});
