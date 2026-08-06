drop policy if exists "Public can read published content pages"
on public.content_pages;

create policy "Public can read published content pages"
on public.content_pages for select to anon, authenticated
using (is_published);

create policy "Admins can read all content pages"
on public.content_pages for select to authenticated
using ((select public.current_user_is_admin()));

notify pgrst, 'reload schema';
