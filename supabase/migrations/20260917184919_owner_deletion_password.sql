begin;

create table public.admin_deletion_security (
  id boolean primary key default true check (id),
  password_hash text not null check (char_length(password_hash) between 60 and 240),
  failed_attempts smallint not null default 0 check (failed_attempts between 0 and 5),
  locked_until timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_admin_deletion_security_updated_at
before update on public.admin_deletion_security
for each row execute function public.set_updated_at();

alter table public.admin_deletion_security enable row level security;

revoke all on table public.admin_deletion_security from public, anon, authenticated;
grant select, insert, update on table public.admin_deletion_security to service_role;

comment on table public.admin_deletion_security is
  'Server-only owner password hash and brute-force lock for destructive admin operations.';

commit;
