import "server-only";
import { z } from "zod";

// Importing "server-only" makes this module a hard build error if anything
// in the Client Component graph ever imports it — the mechanism that keeps
// GROQ_API_KEY and ANTHROPIC_API_KEY out of the browser bundle, not just
// convention.
//
// Deliberately does NOT include SUPABASE_SECRET_KEY. That key grants
// service_role (RLS-bypassing) access and is only needed by one-off admin
// scripts (e.g. a future Mongo migration script), never by the running app
// — every normal request authenticates as the signed-in user via
// lib/supabase/server.ts, not as service_role. If it lived in this shared,
// eagerly-validated schema, the entire app would refuse to boot in any
// environment that doesn't have that secret configured, for a capability
// nothing here actually uses. See lib/supabase/admin.ts for where it
// belongs once an admin script needs it.
const serverSchema = z.object({
  GROQ_API_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  GROQ_TEXT_MODEL: z.string().default("llama-3.3-70b-versatile"),
  GROQ_TRANSCRIPTION_MODEL: z.string().default("whisper-large-v3-turbo"),
  ANTHROPIC_TEXT_MODEL: z.string().default("claude-haiku-4-5"),
});

const parsed = serverSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    `Invalid server environment variables:\n${z.prettifyError(parsed.error)}`,
  );
}

export const serverEnv = parsed.data;
