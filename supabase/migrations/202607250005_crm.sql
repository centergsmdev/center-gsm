create table if not exists public.customer_profiles (
  id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null default '', email text not null default '', phone text,
  status text not null default 'active' check(status in ('active','inactive','blocked')),
  segment text not null default 'new' check(segment in ('new','active','vip','inactive','blocked')),
  lifetime_value numeric(14,2) not null default 0 check(lifetime_value>=0), order_count integer not null default 0 check(order_count>=0),
  last_order_at timestamptz,last_login_at timestamptz,marketing_opt_in boolean not null default false,
  created_at timestamptz not null default timezone('utc',now()),updated_at timestamptz not null default timezone('utc',now())
);
create table if not exists public.customer_notes (
  id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customer_profiles(id) on delete cascade,
  admin_id uuid not null references auth.users(id) on delete restrict,note text not null check(length(trim(note)) between 1 and 4000),
  is_private boolean not null default true,created_at timestamptz not null default timezone('utc',now()),updated_at timestamptz not null default timezone('utc',now())
);
create table if not exists public.customer_tags (
  id uuid primary key default gen_random_uuid(),name text not null unique,color text not null default '#52525b' check(color ~ '^#[0-9A-Fa-f]{6}$'),
  description text,created_at timestamptz not null default timezone('utc',now())
);
create table if not exists public.customer_tag_relations (
  customer_id uuid not null references public.customer_profiles(id) on delete cascade,tag_id uuid not null references public.customer_tags(id) on delete cascade,
  created_at timestamptz not null default timezone('utc',now()),primary key(customer_id,tag_id)
);
create table if not exists public.customer_activity (
  id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customer_profiles(id) on delete cascade,
  activity_type text not null,description text not null,metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc',now())
);
create index if not exists customer_profiles_segment_status_idx on public.customer_profiles(segment,status);
create index if not exists customer_profiles_ltv_idx on public.customer_profiles(lifetime_value desc);
create index if not exists customer_profiles_order_count_idx on public.customer_profiles(order_count desc);
create index if not exists customer_profiles_search_idx on public.customer_profiles using gin(to_tsvector('simple',full_name||' '||email||' '||coalesce(phone,'')));
create index if not exists customer_notes_customer_idx on public.customer_notes(customer_id,created_at desc);
create index if not exists customer_activity_customer_idx on public.customer_activity(customer_id,created_at desc);
create index if not exists customer_tag_relations_tag_idx on public.customer_tag_relations(tag_id,customer_id);

alter table public.customer_profiles enable row level security;alter table public.customer_notes enable row level security;
alter table public.customer_tags enable row level security;alter table public.customer_tag_relations enable row level security;alter table public.customer_activity enable row level security;
revoke all on public.customer_profiles,public.customer_notes,public.customer_tags,public.customer_tag_relations,public.customer_activity from anon,authenticated;
grant select on public.customer_profiles,public.customer_notes,public.customer_tags,public.customer_tag_relations,public.customer_activity to authenticated;
create policy "Admins or owners read customer profiles" on public.customer_profiles for select to authenticated using(public.is_admin() or user_id=auth.uid());
create policy "Admins read customer notes" on public.customer_notes for select to authenticated using(public.is_admin());
create policy "Admins read customer tags" on public.customer_tags for select to authenticated using(public.is_admin());
create policy "Admins read customer tag relations" on public.customer_tag_relations for select to authenticated using(public.is_admin());
create policy "Admins read customer activity" on public.customer_activity for select to authenticated using(public.is_admin());

create or replace function public.crm_segment(p_status text,p_lifetime numeric,p_orders integer,p_last_order timestamptz)
returns text language sql stable set search_path='' as $$select case when p_status='blocked' then 'blocked' when p_lifetime>=50000 or p_orders>=8 then 'vip' when p_orders=0 and p_last_order is null then 'new' when p_last_order is null or p_last_order<timezone('utc',now())-interval '180 days' then 'inactive' else 'active' end$$;
create or replace function public.crm_refresh_customer(p_user_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_customer uuid;v_ltv numeric;v_count integer;v_last timestamptz;
begin
  select coalesce(sum(grand_total) filter(where status='delivered'),0),count(*) filter(where status<>'cancelled'),max(created_at)
  into v_ltv,v_count,v_last from public.orders where user_id=p_user_id;
  update public.customer_profiles set lifetime_value=v_ltv,order_count=v_count,last_order_at=v_last,
    segment=public.crm_segment(status,v_ltv,v_count,v_last),updated_at=timezone('utc',now()) where user_id=p_user_id returning id into v_customer;
  return v_customer;
end$$;
create or replace function public.crm_sync_profile() returns trigger language plpgsql security definer set search_path='' as $$
declare v_email text;v_customer uuid;
begin select email into v_email from auth.users where id=new.id;
  insert into public.customer_profiles(user_id,full_name,email,phone)
  values(new.id,trim(concat_ws(' ',new.first_name,new.last_name)),coalesce(v_email,''),new.phone)
  on conflict(user_id) do update set full_name=excluded.full_name,email=excluded.email,phone=excluded.phone,updated_at=timezone('utc',now()) returning id into v_customer;
  if not exists(select 1 from public.customer_activity where customer_id=v_customer and activity_type='user_registered') then insert into public.customer_activity(customer_id,activity_type,description) values(v_customer,'user_registered','Müşteri kayıt oldu');end if;return new;
end$$;
drop trigger if exists crm_profiles_sync on public.profiles;create trigger crm_profiles_sync after insert or update on public.profiles for each row execute function public.crm_sync_profile();
insert into public.customer_profiles(user_id,full_name,email,phone)
select p.id,trim(concat_ws(' ',p.first_name,p.last_name)),coalesce(u.email,''),p.phone from public.profiles p join auth.users u on u.id=p.id on conflict(user_id) do nothing;

create or replace function public.crm_order_activity() returns trigger language plpgsql security definer set search_path='' as $$
declare v_customer uuid;v_type text;begin if new.user_id is null then return new;end if;v_customer:=public.crm_refresh_customer(new.user_id);
v_type:=case when tg_op='INSERT' then 'order_created' when new.status='cancelled' and old.status is distinct from new.status then 'order_cancelled' when new.payment_status='paid' and old.payment_status is distinct from new.payment_status then 'payment_received' when new.status='shipped' and old.status is distinct from new.status then 'shipment_shipped' else null end;
if v_type is not null then insert into public.customer_activity(customer_id,activity_type,description,metadata) values(v_customer,v_type,'Sipariş hareketi: '||new.order_number,jsonb_build_object('order_id',new.id,'order_number',new.order_number));end if;return new;end$$;
drop trigger if exists crm_orders_activity on public.orders;create trigger crm_orders_activity after insert or update of status,payment_status on public.orders for each row execute function public.crm_order_activity();

create or replace function public.admin_update_customer(p_customer_id uuid,p_status text,p_segment text,p_marketing_opt_in boolean)
returns boolean language plpgsql security definer set search_path='' as $$begin if not public.is_admin() then raise exception 'admin_required' using errcode='42501';end if;
update public.customer_profiles set status=p_status,segment=case when p_status='blocked' then 'blocked' else p_segment end,marketing_opt_in=p_marketing_opt_in,updated_at=timezone('utc',now()) where id=p_customer_id;
insert into public.customer_activity(customer_id,activity_type,description,metadata) values(p_customer_id,'profile_updated','Müşteri profili yönetici tarafından güncellendi',jsonb_build_object('admin_id',auth.uid()));
if to_regclass('public.notification_events') is not null then insert into public.notification_events(event_type,entity_type,entity_id,payload,status,processed_at) values('customer_updated','customer',p_customer_id::text,jsonb_build_object('customer_id',p_customer_id),'processed',timezone('utc',now()));end if;return true;end$$;
create or replace function public.admin_add_customer_note(p_customer_id uuid,p_note text,p_is_private boolean)
returns uuid language plpgsql security definer set search_path='' as $$declare v_id uuid;begin if not public.is_admin() then raise exception 'admin_required' using errcode='42501';end if;insert into public.customer_notes(customer_id,admin_id,note,is_private) values(p_customer_id,auth.uid(),trim(p_note),p_is_private) returning id into v_id;insert into public.customer_activity(customer_id,activity_type,description,metadata) values(p_customer_id,'note_added','Yönetici notu eklendi',jsonb_build_object('note_id',v_id));return v_id;end$$;
create or replace function public.admin_add_customer_tag(p_customer_id uuid,p_tag_name text,p_color text,p_description text)
returns uuid language plpgsql security definer set search_path='' as $$declare v_tag uuid;begin if not public.is_admin() then raise exception 'admin_required' using errcode='42501';end if;insert into public.customer_tags(name,color,description) values(trim(p_tag_name),p_color,nullif(trim(p_description),'')) on conflict(name) do update set color=excluded.color returning id into v_tag;insert into public.customer_tag_relations(customer_id,tag_id) values(p_customer_id,v_tag) on conflict do nothing;insert into public.customer_activity(customer_id,activity_type,description,metadata) values(p_customer_id,'tag_added','Müşteri etiketi eklendi',jsonb_build_object('tag_id',v_tag,'tag',p_tag_name));return v_tag;end$$;
create or replace function public.admin_remove_customer_tag(p_customer_id uuid,p_tag_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$begin if not public.is_admin() then raise exception 'admin_required' using errcode='42501';end if;delete from public.customer_tag_relations where customer_id=p_customer_id and tag_id=p_tag_id;insert into public.customer_activity(customer_id,activity_type,description,metadata) values(p_customer_id,'tag_removed','Müşteri etiketi kaldırıldı',jsonb_build_object('tag_id',p_tag_id));return true;end$$;
create or replace function public.admin_log_customer_activity(p_customer_id uuid,p_activity_type text,p_description text,p_metadata jsonb)
returns uuid language plpgsql security definer set search_path='' as $$declare v_id uuid;begin if not public.is_admin() then raise exception 'admin_required' using errcode='42501';end if;insert into public.customer_activity(customer_id,activity_type,description,metadata) values(p_customer_id,p_activity_type,p_description,coalesce(p_metadata,'{}')) returning id into v_id;return v_id;end$$;
create or replace function public.record_customer_login() returns boolean language plpgsql security definer set search_path='' as $$declare v_customer uuid;begin if auth.uid() is null then raise exception 'authentication_required' using errcode='42501';end if;update public.customer_profiles set last_login_at=timezone('utc',now()),updated_at=timezone('utc',now()) where user_id=auth.uid() returning id into v_customer;if v_customer is not null then insert into public.customer_activity(customer_id,activity_type,description) values(v_customer,'user_login','Müşteri giriş yaptı');end if;return true;end$$;
revoke all on function public.admin_update_customer(uuid,text,text,boolean),public.admin_add_customer_note(uuid,text,boolean),public.admin_add_customer_tag(uuid,text,text,text),public.admin_remove_customer_tag(uuid,uuid),public.admin_log_customer_activity(uuid,text,text,jsonb) from public,anon;
grant execute on function public.admin_update_customer(uuid,text,text,boolean),public.admin_add_customer_note(uuid,text,boolean),public.admin_add_customer_tag(uuid,text,text,text),public.admin_remove_customer_tag(uuid,uuid),public.admin_log_customer_activity(uuid,text,text,jsonb) to authenticated;
revoke all on function public.record_customer_login() from public,anon;grant execute on function public.record_customer_login() to authenticated;

drop trigger if exists audit_customer_profiles_changes on public.customer_profiles;create trigger audit_customer_profiles_changes after insert or update or delete on public.customer_profiles for each row execute function public.audit_row_change('user','user');
drop trigger if exists audit_customer_notes_changes on public.customer_notes;create trigger audit_customer_notes_changes after insert or update or delete on public.customer_notes for each row execute function public.audit_row_change('user','user');
drop trigger if exists audit_customer_tags_changes on public.customer_tags;create trigger audit_customer_tags_changes after insert or update or delete on public.customer_tags for each row execute function public.audit_row_change('user','user');
drop trigger if exists audit_customer_tag_relations_changes on public.customer_tag_relations;create trigger audit_customer_tag_relations_changes after insert or update or delete on public.customer_tag_relations for each row execute function public.audit_row_change('user','user');
