import { describe, it, expect, beforeEach, vi } from "vitest";

// env.ts validates process.env AT IMPORT TIME (that's the whole point — fail
// the build, not a user's request), so these tests reset the module registry
// and re-import fresh for every case rather than importing publicEnv once at
// the top of the file.
//
// Every case explicitly stubs the variable it cares about, even to
// `undefined`, rather than relying on it being ambiently absent — CI's
// workflow env block sets placeholder values for the whole job (so `pnpm
// build` succeeds without real secrets), and this suite must not silently
// pass or fail depending on that.
describe("publicEnv", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("parses successfully and applies the default site URL when omitted", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", undefined);

    const { publicEnv } = await import("./env");

    expect(publicEnv.NEXT_PUBLIC_SUPABASE_URL).toBe(
      "https://example.supabase.co",
    );
    expect(publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBe(
      "sb_publishable_test",
    );
    expect(publicEnv.NEXT_PUBLIC_SITE_URL).toBe("http://localhost:3000");
  });

  it("respects an explicit NEXT_PUBLIC_SITE_URL instead of the default", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://pantrypal.app");

    const { publicEnv } = await import("./env");

    expect(publicEnv.NEXT_PUBLIC_SITE_URL).toBe("https://pantrypal.app");
  });

  it("throws at import time when the Supabase URL is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", undefined);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");

    await expect(import("./env")).rejects.toThrow(
      /Invalid public environment variables/,
    );
  });

  it("throws at import time when the Supabase URL is not a valid URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "not-a-url");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");

    await expect(import("./env")).rejects.toThrow(
      /Invalid public environment variables/,
    );
  });

  it("throws at import time when the publishable key is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", undefined);

    await expect(import("./env")).rejects.toThrow(
      /Invalid public environment variables/,
    );
  });
});
