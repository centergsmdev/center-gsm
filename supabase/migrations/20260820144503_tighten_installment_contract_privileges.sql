begin;

revoke all on public.installment_contract_templates from service_role;
revoke all on public.installment_application_contracts from service_role;

grant select, insert, update on public.installment_contract_templates
  to service_role;
grant select, insert on public.installment_application_contracts
  to service_role;

commit;
