-- Vangnet voor game_voortgang (munten, briefgeld, kleding). Op 20 nov 2026
-- raakte een leerling alles kwijt en was er geen back-up (Free-abonnement).
--
-- 1. game_voortgang_historie: de vorige waarde bij elke verwijdering, en bij
--    een wijziging van de belangrijke sleutels (hooguit eens per 10 minuten,
--    en altijd als de nieuwe waarde veel korter is, bv. kleding die leeg wordt).
--    30 dagen bewaard. Alleen voor beheer (RLS aan, geen policies).
-- 2. Leerlingen kunnen munten, briefgeld en kleding niet meer van de server
--    wissen (de app doet dat nooit; alleen de bug deed het). Een leerling
--    verwijderen via de leerkracht (service role, cascade) werkt gewoon.

create table if not exists public.game_voortgang_historie (
  id bigint generated always as identity primary key,
  leerling_id uuid not null,
  school_id uuid,
  sleutel text not null,
  data jsonb,
  was_bijgewerkt_op timestamptz,
  actie text not null check (actie in ('wijziging', 'verwijderd')),
  vastgelegd_op timestamptz not null default now()
);
create index if not exists game_voortgang_historie_zoek
  on public.game_voortgang_historie (leerling_id, sleutel, vastgelegd_op desc);
alter table public.game_voortgang_historie enable row level security;

create or replace function public.bewaar_voortgang_historie()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    insert into game_voortgang_historie (leerling_id, school_id, sleutel, data, was_bijgewerkt_op, actie)
    values (old.leerling_id, old.school_id, old.sleutel, old.data, old.bijgewerkt_op, 'verwijderd');
  elsif new.data is distinct from old.data
    and old.sleutel in ('kk_curuntie', 'kk_briefgeld', 'kk_unlocked', 'kk_wearing', 'kk_shirt', 'kk_emotes')
    and (length(new.data::text) * 2 < length(old.data::text)
         or not exists (select 1 from game_voortgang_historie h
                        where h.leerling_id = old.leerling_id and h.sleutel = old.sleutel
                          and h.vastgelegd_op > now() - interval '10 minutes')) then
    insert into game_voortgang_historie (leerling_id, school_id, sleutel, data, was_bijgewerkt_op, actie)
    values (old.leerling_id, old.school_id, old.sleutel, old.data, old.bijgewerkt_op, 'wijziging');
  else
    return null;
  end if;
  delete from game_voortgang_historie
   where leerling_id = old.leerling_id and vastgelegd_op < now() - interval '30 days';
  return null;
end $$;

drop trigger if exists game_voortgang_historie on public.game_voortgang;
create trigger game_voortgang_historie
  after update or delete on public.game_voortgang
  for each row execute function public.bewaar_voortgang_historie();

create or replace function public.bescherm_voortgang()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.sleutel in ('kk_curuntie', 'kk_briefgeld', 'kk_unlocked')
     and coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') = 'authenticated'
     and pg_trigger_depth() = 1 then
    return null;   -- stil overslaan: de app gaat gewoon door
  end if;
  return old;
end $$;

drop trigger if exists game_voortgang_bescherm on public.game_voortgang;
create trigger game_voortgang_bescherm
  before delete on public.game_voortgang
  for each row execute function public.bescherm_voortgang();
