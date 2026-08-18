-- Piepklein functietje puur voor de keep-alive uit GitHub Actions
-- (.github/workflows/supabase-keepalive.yml).
--
-- Waarom dit nodig is: een ping op /rest/v1/ wordt door PostgREST zelf
-- afgehandeld en raakt Postgres niet aan. Daardoor liep het project in
-- augustus 2026 alsnog in de auto-pause terwijl de workflow groen stond.
-- Deze functie doet gegarandeerd een echte tabelquery.
--
-- STABLE zodat PostgREST hem via GET aanbiedt (scheelt een POST-body in de
-- workflow). SECURITY DEFINER met lege search_path zodat de anon-rol hem mag
-- draaien zonder rechten op `klassen` te krijgen; het aantal wordt bewust
-- weggegooid, de functie geeft alleen 'ok' terug en lekt dus niets.
create or replace function public.keepalive()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  aantal bigint;
begin
  select count(*) into aantal from public.klassen;
  return 'ok';
end;
$$;

revoke execute on function public.keepalive() from public;
grant execute on function public.keepalive() to anon, authenticated;
