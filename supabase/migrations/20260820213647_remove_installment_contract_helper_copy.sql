begin;

do $$
declare
  v_active public.installment_contract_templates%rowtype;
  v_new_template_id uuid;
  v_removed_paragraph constant text := '<p>Bu ödeme planı, sözleşme ve imza ile aynı başvuru kaydına değiştirilemez snapshot olarak bağlanır.</p>';
begin
  if exists (
    select 1
    from public.installment_contract_templates
    where version = 'v3-copy-cleanup-2026-08-21'
  ) then
    return;
  end if;

  select * into v_active
  from public.installment_contract_templates
  where is_active
  for update;

  if not found then
    raise exception 'active_contract_required';
  end if;

  if position(v_removed_paragraph in v_active.content_html) = 0 then
    raise exception 'contract_helper_copy_not_found';
  end if;

  insert into public.installment_contract_templates (
    title,
    version,
    content_html,
    is_active
  ) values (
    v_active.title,
    'v3-copy-cleanup-2026-08-21',
    replace(v_active.content_html, v_removed_paragraph, ''),
    false
  )
  returning id into v_new_template_id;

  update public.installment_contract_templates
  set is_active = false
  where is_active;

  update public.installment_contract_templates
  set is_active = true
  where id = v_new_template_id;
end;
$$;

commit;
