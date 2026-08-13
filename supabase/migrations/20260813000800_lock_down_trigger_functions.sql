-- handle_new_user and set_updated_at are trigger functions only — they are
-- meant to fire via `after insert on auth.users` / `before update on ...`,
-- never to be called directly. Trigger firing is governed by table-level
-- trigger permissions, not function EXECUTE grants, so revoking EXECUTE
-- here does not break either trigger; it only removes the unintended
-- /rest/v1/rpc/handle_new_user and /rest/v1/rpc/set_updated_at surfaces
-- (flagged by `get_advisors`: anon/authenticated_security_definer_function_executable).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
