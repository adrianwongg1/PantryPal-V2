import { describe, it, expect, beforeEach, vi } from "vitest";

// "server-only" throws unconditionally outside Next's bundler (it relies on
// webpack/Turbopack aliasing to tell client bundles from server ones — see
// the comment in env.server.ts). Vitest runs under plain Vite, so it must be
// stubbed to a no-op for this file to be testable at all; this is the
// standard pattern for testing modules that import it.
vi.mock("server-only", () => ({}));

describe("serverEnv", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("parses successfully and applies model defaults when omitted", async () => {
    vi.stubEnv("GROQ_API_KEY", "gsk_test");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
    vi.stubEnv("GROQ_TEXT_MODEL", undefined);
    vi.stubEnv("GROQ_TRANSCRIPTION_MODEL", undefined);
    vi.stubEnv("ANTHROPIC_TEXT_MODEL", undefined);

    const { serverEnv } = await import("./env.server");

    expect(serverEnv.GROQ_API_KEY).toBe("gsk_test");
    expect(serverEnv.ANTHROPIC_API_KEY).toBe("sk-ant-test");
    expect(serverEnv.GROQ_TEXT_MODEL).toBe("openai/gpt-oss-120b");
    expect(serverEnv.GROQ_TRANSCRIPTION_MODEL).toBe("whisper-large-v3-turbo");
    expect(serverEnv.ANTHROPIC_TEXT_MODEL).toBe("claude-haiku-4-5");
  });

  it("does NOT require SUPABASE_SECRET_KEY — that belongs to admin scripts only", async () => {
    vi.stubEnv("GROQ_API_KEY", "gsk_test");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
    vi.stubEnv("SUPABASE_SECRET_KEY", undefined);

    await expect(import("./env.server")).resolves.toBeDefined();
  });

  it("throws at import time when GROQ_API_KEY is missing", async () => {
    vi.stubEnv("GROQ_API_KEY", undefined);
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");

    await expect(import("./env.server")).rejects.toThrow(
      /Invalid server environment variables/,
    );
  });

  it("does NOT require ANTHROPIC_API_KEY — it's the Groq-unavailable fallback tier, not a boot requirement", async () => {
    vi.stubEnv("GROQ_API_KEY", "gsk_test");
    vi.stubEnv("ANTHROPIC_API_KEY", undefined);

    const { serverEnv } = await import("./env.server");

    expect(serverEnv.ANTHROPIC_API_KEY).toBeUndefined();
  });
});
