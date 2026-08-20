begin;

create or replace function public.valid_installment_payment_schedule(
  p_schedule jsonb,
  p_count integer,
  p_total_minor bigint
)
returns boolean
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  v_count integer;
  v_distinct integer;
  v_min integer;
  v_max integer;
  v_total numeric;
  v_mismatch_count integer;
  v_base_amount bigint;
  v_last_amount bigint;
begin
  if jsonb_typeof(p_schedule) <> 'array'
    or p_count < 1
    or p_total_minor < 0
    or jsonb_array_length(p_schedule) <> p_count then
    return false;
  end if;

  v_base_amount := p_total_minor / p_count;
  v_last_amount := p_total_minor - (v_base_amount * (p_count - 1));

  select
    count(*),
    count(distinct (item ->> 'installment')::integer),
    min((item ->> 'installment')::integer),
    max((item ->> 'installment')::integer),
    sum((item ->> 'amount_minor')::numeric),
    count(*) filter (
      where (item ->> 'amount_minor')::bigint <> case
        when (item ->> 'installment')::integer = p_count then v_last_amount
        else v_base_amount
      end
    )
  into v_count, v_distinct, v_min, v_max, v_total, v_mismatch_count
  from jsonb_array_elements(p_schedule) as item
  where jsonb_typeof(item) = 'object'
    and (item ->> 'installment') ~ '^[0-9]+$'
    and (item ->> 'amount_minor') ~ '^[0-9]+$';

  return v_count = p_count
    and v_distinct = p_count
    and v_min = 1
    and v_max = p_count
    and v_total = p_total_minor
    and v_mismatch_count = 0;
exception when others then
  return false;
end;
$$;

revoke all on function public.valid_installment_payment_schedule(jsonb,integer,bigint)
  from public, anon, authenticated;
grant execute on function public.valid_installment_payment_schedule(jsonb,integer,bigint)
  to service_role;

notify pgrst, 'reload schema';

commit;
