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
//
// ANTHROPIC_API_KEY is optional for the same reason SUPABASE_SECRET_KEY is
// excluded entirely: it's the Groq-unavailable fallback tier
// (lib/ai/generate.ts), not something every environment needs configured
// to boot. Making it required here meant the app refused to start at all
// wherever it wasn't set — including this project's own local dev, until
// this fix (.env.local has GROQ_API_KEY but never had an Anthropic one).
// lib/ai/generate.ts checks for its presence and skips the fallback tier
// (rather than erroring) when it's absent.
const serverSchema = z.object({
  GROQ_API_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  // llama-3.3-70b-versatile (the model this app originally shipped with)
  // was removed from Groq's catalog at some point before 2026-08-26 —
  // confirmed directly against Groq's own /v1/models endpoint, which
  // returns a 404 model_not_found for it and doesn't list any llama-3.3
  // model at all anymore. openai/gpt-oss-120b is Groq's current
  // flagship-tier general-purpose model and was verified (a real call,
  // not assumed) to produce valid structured output against this app's
  // own schema before being made the default.
  GROQ_TEXT_MODEL: z.string().default("openai/gpt-oss-120b"),
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
