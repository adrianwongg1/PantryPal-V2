// Generates recipe.share_slug values. Nothing currently generates one, so
// the share_slug_required_when_shared check constraint
// (supabase/migrations/20260813000300_recipes.sql) makes sharing
// impossible today — this is what Phase 6's visibility Server Action calls
// the first time a recipe's visibility moves off 'private'.
//
// Must match the DB check exactly: ^[a-z0-9-]{8,120}$.
const SLUG_LENGTH = 20;

// 20 lowercase hex characters (~80 bits of entropy) from the platform's
// crypto.randomUUID() — global in both the Node and Edge runtimes (Node 19+,
// every evergreen browser), so this needs no import and works the same if a
// route using it ever moves to the Edge runtime. Meant to be unguessable,
// not memorable — this is a secret unlisted-link token, not a slug for SEO.
export function generateShareSlug(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, SLUG_LENGTH);
}

const SHARE_SLUG_PATTERN = /^[a-z0-9-]{8,120}$/;

export function isValidShareSlug(slug: string): boolean {
  return SHARE_SLUG_PATTERN.test(slug);
}
