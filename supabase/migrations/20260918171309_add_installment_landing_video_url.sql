alter table public.site_settings
  add column if not exists installment_landing_video_url text;

comment on column public.site_settings.installment_landing_video_url is
  'Public video URL shown on the installment landing page.';
