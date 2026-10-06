-- Rechten opschonen n.a.v. de Supabase security advisor.
--
-- 1. keepalive() hoeft geen SECURITY DEFINER te zijn. Elke /rpc-aanroep laat
--    PostgREST een echte query in Postgres draaien (het probleem uit 0008 was
--    een ping op /rest/v1/ zelf), dus een SECURITY INVOKER-functie die een
--    systeemcatalogus telt houdt het project net zo goed wakker — zonder dat
--    anon via deze functie iets met rechten van de eigenaar kan doen.
create or replace function public.keepalive()
returns text
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  aantal bigint;
begin
  select count(*) into aantal from pg_catalog.pg_namespace;
  return 'ok';
end;
$$;

revoke execute on function public.keepalive() from public;
grant execute on function public.keepalive() to anon, authenticated;

-- 2. rls_auto_enable() is de functie achter de event trigger ensure_rls (zet
--    RLS automatisch aan op nieuwe tabellen). Die vuurt bij DDL en heeft geen
--    EXECUTE-recht van de aanroeper nodig; via de API aanroepbaar zijn is zinloos.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- 3. klas_leerkrachten had (standaard) rechten voor anon. RLS blokkeerde dat
--    al, maar niet-ingelogde bezoekers horen hier niets te mogen.
revoke all on table public.klas_leerkrachten from anon;
