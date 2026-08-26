create or replace function public.platform_customers_overview()
returns table(
  id uuid, salon_id uuid, salon_name text, name text, phone text, email text,
  visits integer, total_spent numeric, wallet_balance numeric, loyalty_points numeric,
  created_at timestamptz, salons_count integer, invoices_count integer, last_visit timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.salon_id, s.name as salon_name, c.name, c.phone, c.email,
         c.visits, c.total_spent, c.wallet_balance, c.loyalty_points, c.created_at,
         (select count(distinct c2.salon_id)::int from public.customers c2 where c2.phone = c.phone),
         (select count(*)::int from public.invoices i where i.customer_id = c.id),
         (select max(i.created_at) from public.invoices i where i.customer_id = c.id)
  from public.customers c
  join public.salons s on s.id = c.salon_id
  where public.is_platform_owner(auth.uid())
  order by c.created_at desc
  limit 2000
$$;

revoke all on function public.platform_customers_overview() from public;
grant execute on function public.platform_customers_overview() to authenticated;

create or replace function public.platform_storage_overview()
returns table(salon_id uuid, salon_name text, rows_total bigint, est_bytes bigint, tables jsonb)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  t text;
  tbls text[] := array['bookings','booking_services','invoices','invoice_items','invoice_payments',
    'customers','staff','services','branches','inventory_items','stock_movements','attendance',
    'expenses','journal_entries','journal_lines','wallet_transactions','loyalty_transactions',
    'notification_events','audit_log','support_messages'];
  per_row numeric;
  cnt bigint;
  rec record;
  acc jsonb;
  total_rows bigint;
  total_bytes numeric;
begin
  if not public.is_platform_owner(auth.uid()) then
    raise exception 'not authorized';
  end if;

  for rec in select s.id, s.name from public.salons s order by s.name loop
    acc := '{}'::jsonb;
    total_rows := 0;
    total_bytes := 0;
    foreach t in array tbls loop
      execute format('select count(*) from public.%I where salon_id = $1', t)
        into cnt using rec.id;
      if cnt > 0 then
        select case when greatest(c.reltuples, 1) > 0
                 then pg_total_relation_size(c.oid) / greatest(c.reltuples, 1)
                 else 0 end
          into per_row
          from pg_class c where c.oid = format('public.%I', t)::regclass;
        total_rows := total_rows + cnt;
        total_bytes := total_bytes + (coalesce(per_row, 0) * cnt);
        acc := acc || jsonb_build_object(t, cnt);
      end if;
    end loop;
    salon_id := rec.id;
    salon_name := rec.name;
    rows_total := total_rows;
    est_bytes := total_bytes::bigint;
    tables := acc;
    return next;
  end loop;
end;
$$;

revoke all on function public.platform_storage_overview() from public;
grant execute on function public.platform_storage_overview() to authenticated;

create or replace function public.platform_table_sizes()
returns table(table_name text, row_estimate bigint, total_bytes bigint)
language sql
stable
security definer
set search_path = public
as $$
  select c.relname::text, greatest(c.reltuples, 0)::bigint, pg_total_relation_size(c.oid)
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
    and public.is_platform_owner(auth.uid())
  order by pg_total_relation_size(c.oid) desc
$$;

revoke all on function public.platform_table_sizes() from public;
grant execute on function public.platform_table_sizes() to authenticated;