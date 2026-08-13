-- Storage: recipe images. Public read is a deliberate tradeoff — signed
-- URLs expire, and a crawler that caches an expired URL breaks an Open
-- Graph preview permanently. A recipe photo isn't sensitive, and OG cards
-- themselves are generated from text (opengraph-image.tsx), so preview
-- rendering doesn't depend on this bucket at all.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recipe-images', 'recipe-images', true,
  5242880,  -- 5 MB
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

-- Path convention: {user_id}/{recipe_id}.webp — writes are restricted to
-- the caller's own folder by matching the first path segment against their
-- uid, so one user can never write into another's folder.
create policy "recipe-images: anyone can view" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'recipe-images');

create policy "recipe-images: owner can upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'recipe-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "recipe-images: owner can update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'recipe-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "recipe-images: owner can delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'recipe-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
