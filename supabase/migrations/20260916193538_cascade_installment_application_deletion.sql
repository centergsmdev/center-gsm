begin;

alter table public.installment_application_blocks
  drop constraint installment_application_blocks_source_application_id_fkey;

alter table public.installment_application_blocks
  add constraint installment_application_blocks_source_application_id_fkey
  foreign key (source_application_id)
  references public.installment_applications(id)
  on update cascade
  on delete cascade;

comment on constraint installment_application_blocks_source_application_id_fkey
  on public.installment_application_blocks is
  'Deleting an installment application also removes the block created by that application.';

commit;
