begin;

create or replace function public.fill_installment_down_payment_timing_label()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_label text;
begin
  if new.down_payment_timing is not null
    and new.down_payment_timing_label is null then
    select option ->> 'label'
    into v_label
    from public.payment_plan_configurations as config
    cross join lateral jsonb_array_elements(
      config.down_payment_timing_options
    ) as option
    where config.is_active
      and option ->> 'id' = new.down_payment_timing
    limit 1;

    new.down_payment_timing_label := coalesce(
      v_label,
      case new.down_payment_timing
        when 'immediate' then 'Hemen ödeyebilirim'
        when 'today_12_15' then 'Bugün 12.00–15.00 arasında'
        when 'today_15_18' then 'Bugün 15.00–18.00 arasında'
        else 'Peşinat ödeme zamanı seçildi'
      end
    );
  end if;
  return new;
end;
$$;

revoke all on function public.fill_installment_down_payment_timing_label()
  from public, anon, authenticated, service_role;

create trigger fill_installment_down_payment_timing_label
before insert on public.installment_applications
for each row
execute function public.fill_installment_down_payment_timing_label();

notify pgrst, 'reload schema';

commit;
