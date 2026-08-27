import { describe, expect, it, vi } from "vitest";
import { checkGenerationRateLimit, recordGenerationEvent } from "./rate-limit";

vi.mock("server-only", () => ({}));

// A minimal stand-in for the slice of the Supabase client rate-limit.ts
// actually calls: .from(table).select(..., {count}).eq(...).gte(...) for
// the read, .from(table).insert(...) for the write. Each method returns
// `this` except the two that matter, matching the real client's chainable
// shape closely enough to exercise the real query-building code path.
function fakeSupabase({
  count,
  selectError,
}: {
  count?: number;
  selectError?: { message: string };
}) {
  const insert = vi.fn().mockResolvedValue({ error: null });
  const gte = vi.fn().mockResolvedValue({ count: count ?? 0, error: selectError ?? null });
  const eq = vi.fn(() => ({ gte }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select, insert }));
  return { client: { from } as never, insert, gte, eq, select, from };
}

describe("checkGenerationRateLimit", () => {
  it("is not limited when the user is well under the window's cap", async () => {
    const { client } = fakeSupabase({ count: 2 });
    const result = await checkGenerationRateLimit(client, "user-1");
    expect(result).toEqual({ limited: false });
  });

  it("is limited once the user has hit the cap within the window", async () => {
    const { client } = fakeSupabase({ count: 10 });
    const result = await checkGenerationRateLimit(client, "user-1");
    expect(result).toEqual({ limited: true, retryAfterMinutes: 10 });
  });

  it("is limited (not just borderline) well past the cap too", async () => {
    const { client } = fakeSupabase({ count: 50 });
    const result = await checkGenerationRateLimit(client, "user-1");
    expect(result.limited).toBe(true);
  });

  it("scopes the count query to the requesting user", async () => {
    const { client, eq } = fakeSupabase({ count: 0 });
    await checkGenerationRateLimit(client, "user-42");
    expect(eq).toHaveBeenCalledWith("user_id", "user-42");
  });

  it("fails open when the count query itself errors, rather than blocking generation", async () => {
    const { client } = fakeSupabase({ selectError: { message: "connection reset" } });
    const result = await checkGenerationRateLimit(client, "user-1");
    expect(result).toEqual({ limited: false });
  });
});

describe("recordGenerationEvent", () => {
  it("inserts one row with the user, provider, and outcome", async () => {
    const { client, insert } = fakeSupabase({});
    await recordGenerationEvent(client, "user-1", "groq", true);
    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      provider: "groq",
      succeeded: true,
    });
  });

  it("does not throw if the insert itself fails (best-effort logging)", async () => {
    const client = {
      from: () => ({ insert: vi.fn().mockResolvedValue({ error: { message: "boom" } }) }),
    } as never;
    await expect(recordGenerationEvent(client, "user-1", "anthropic", false)).resolves.toBeUndefined();
  });
});
