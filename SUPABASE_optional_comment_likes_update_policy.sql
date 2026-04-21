-- Optional: run this once in Supabase if you want comment likes to persist globally for all users.
-- The site now saves likes locally immediately and tries to sync to the server.
create policy if not exists "video_comments_update_public"
on public.video_comments
for update
to public
using (true)
with check (true);

NOTIFY pgrst, 'reload schema';
