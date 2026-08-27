import { z } from "zod";

// Safe to import from Client or Server Components. NEXT_PUBLIC_* values are
// inlined at build time either way, so there is nothing secret to protect
// here — the point of validating them is purely "fail the build with a
// clear message instead of failing a user's request at runtime."
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  // 3200, not Next's default 3000 — see package.json's dev/start scripts.
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3200"),
});

const parsed = publicSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

if (!parsed.success) {
  throw new Error(
    `Invalid public environment variables:\n${z.prettifyError(parsed.error)}`,
  );
}

export const publicEnv = parsed.data;
