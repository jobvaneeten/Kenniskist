-- ═══════════════════════════════════════════════════════════════════════════
-- Kenniskist — basisschema voor accounts, resultaten en game-voortgang
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Uitgangspunten:
--   • Multi-tenant vanaf dag 1: alles hangt onder een school_id.
--   • AVG-minimaal: van leerlingen alleen voornaam + eerste letter achternaam,
--     gebruikersnaam en klas. Geen e-mail, geen geboortedatum, geen volledige
--     achternaam.
--   • Leerlingen registreren zichzelf nooit. Publieke signup staat uit; accounts
--     worden aangemaakt door een leerkracht via de Worker met de service key.
--   • Harde scheiding: `resultaten` is voor de leerkracht, `game_voortgang` is
--     privé voor de leerling.
--
-- Draaien: plak dit bestand in de Supabase SQL-editor en voer het uit.
-- Het is idempotent genoeg om op een leeg project te draaien, niet om
-- half-af opnieuw te draaien.

create extension if not exists pgcrypto;

-- ───────────────────────────────────────────────────────────────────────────
-- Rollen
-- ───────────────────────────────────────────────────────────────────────────
do $$ begin
  create type rol_type as enum ('leerling', 'leerkracht', 'admin');
exception when duplicate_object then null;
end $$;


-- ───────────────────────────────────────────────────────────────────────────
-- Scholen en klassen
-- ───────────────────────────────────────────────────────────────────────────

create table scholen (
  id            uuid primary key default gen_random_uuid(),
  naam          text not null,
  -- `code` gaat in het inlog-e-mailadres: <code>.<gebruikersnaam>@leerling.kenniskist.nl
  -- Daarmee kan school 2 straks óók een "jandeb" hebben. Alleen kleine letters
  -- en cijfers, want het moet door een e-mailvalidator komen.
  code          text not null unique check (code ~ '^[a-z0-9]{2,20}$'),
  aangemaakt_op timestamptz not null default now()
);

create table klassen (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references scholen(id) on delete cascade,
  naam          text not null,
  schooljaar    text,
  aangemaakt_op timestamptz not null default now(),
  unique (school_id, naam, schooljaar)
);

create index klassen_school_idx on klassen (school_id);


-- ───────────────────────────────────────────────────────────────────────────
-- Profielen — één rij per auth-gebruiker
-- ───────────────────────────────────────────────────────────────────────────

create table profielen (
  id                uuid primary key references auth.users(id) on delete cascade,
  school_id         uuid not null references scholen(id),
  klas_id           uuid references klassen(id) on delete set null,  -- leerkrachten: null
  rol               rol_type not null default 'leerling',
  voornaam          text not null,
  achternaam_letter text check (char_length(achternaam_letter) = 1),
  -- "Sanne V" — afgeleid, zodat er nooit een losse volledige naam kan insluipen
  weergavenaam      text generated always as (
                      voornaam || case
                        when achternaam_letter is null then ''
                        else ' ' || upper(achternaam_letter)
                      end
                    ) stored,
  gebruikersnaam    text check (gebruikersnaam ~ '^[a-z0-9]{3,30}$'),  -- leerkrachten: null
  aangemaakt_op     timestamptz not null default now(),

  -- Uniek binnen de school, niet globaal: zie de opmerking bij scholen.code
  unique (school_id, gebruikersnaam)
);

create index profielen_school_klas_idx on profielen (school_id, klas_id);


-- ───────────────────────────────────────────────────────────────────────────
-- Hulpfuncties voor RLS
-- ───────────────────────────────────────────────────────────────────────────
--
-- Waarom een aparte functie en niet een subquery in de policy zelf: een policy
-- op `profielen` die `profielen` bevraagt loopt vast met 42P17 (infinite
-- recursion). Deze functies zijn SECURITY DEFINER, draaien dus als eigenaar, en
-- op de eigenaar wordt RLS niet toegepast — de recursie is daarmee doorbroken.
--
-- Twee dingen die stil misgaan als je ze vergeet:
--   • Zet NOOIT `alter table profielen force row level security`. FORCE past RLS
--     óók op de eigenaar toe en dan komt de recursie terug binnen deze functies.
--   • Schema `hulp` staat bewust niet in de exposed schemas van PostgREST, dus
--     deze functies zijn niet over de API aan te roepen.

create schema if not exists hulp;
grant usage on schema hulp to authenticated;

create or replace function hulp.mijn_school()
  returns uuid
  language sql stable security definer set search_path = public, pg_temp
as $$ select school_id from public.profielen where id = auth.uid() $$;

create or replace function hulp.mijn_rol()
  returns rol_type
  language sql stable security definer set search_path = public, pg_temp
as $$ select rol from public.profielen where id = auth.uid() $$;

create or replace function hulp.is_personeel()
  returns boolean
  language sql stable security definer set search_path = public, pg_temp
as $$ select exists (
        select 1 from public.profielen
        where id = auth.uid() and rol in ('leerkracht', 'admin')
      ) $$;

create or replace function hulp.is_admin()
  returns boolean
  language sql stable security definer set search_path = public, pg_temp
as $$ select exists (
        select 1 from public.profielen
        where id = auth.uid() and rol = 'admin'
      ) $$;

grant execute on function
  hulp.mijn_school(), hulp.mijn_rol(), hulp.is_personeel(), hulp.is_admin()
  to authenticated;


-- ───────────────────────────────────────────────────────────────────────────
-- Resultaten — van de leertools, zichtbaar voor de leerkracht
-- ───────────────────────────────────────────────────────────────────────────
--
-- school_id heeft een DEFAULT zodat de client hem niet meestuurt. Stuurt een
-- client hem tóch mee, dan vangt de WITH CHECK op de insert-policy dat af.
-- De service role heeft geen profiel, dus mijn_school() geeft daar NULL en de
-- NOT NULL dwingt de Worker om hem expliciet te zetten. Die asymmetrie is opzet.

create table resultaten (
  id            bigint generated always as identity primary key,
  leerling_id   uuid not null references profielen(id) on delete cascade,
  school_id     uuid not null default hulp.mijn_school() references scholen(id),
  tool_id       text not null,
  score         numeric not null check (score >= 0),
  max_score     numeric not null check (max_score > 0),
  details_json  jsonb,
  aangemaakt_op timestamptz not null default now()
);

create index resultaten_klasoverzicht_idx
  on resultaten (school_id, leerling_id, tool_id, aangemaakt_op desc);


-- ───────────────────────────────────────────────────────────────────────────
-- Game-voortgang — privé voor de leerling, NOOIT zichtbaar voor de leerkracht
-- ───────────────────────────────────────────────────────────────────────────
--
-- `data` bevat altijd een JSON-string: de ruwe localStorage-waarde, ongewijzigd.
-- Dus "0" en niet 0, "true" en niet true. Wél echt parsen maakt de types op de
-- terugweg ononderscheidbaar en dan leest het spaarpotje NaN.

create table game_voortgang (
  id            bigint generated always as identity primary key,
  leerling_id   uuid not null references profielen(id) on delete cascade,
  school_id     uuid not null default hulp.mijn_school() references scholen(id),
  sleutel       text not null,
  data          jsonb not null,
  bijgewerkt_op timestamptz not null default now(),
  unique (leerling_id, sleutel)
);

create or replace function public.zet_bijgewerkt_op()
  returns trigger language plpgsql set search_path = public, pg_temp
as $$ begin new.bijgewerkt_op = now(); return new; end $$;

create trigger game_voortgang_bijgewerkt
  before update on game_voortgang
  for each row execute function public.zet_bijgewerkt_op();


-- ───────────────────────────────────────────────────────────────────────────
-- Opdrachten en toewijzingen — nog leeg, staan klaar voor later
-- ───────────────────────────────────────────────────────────────────────────

create table opdrachten (
  id              uuid primary key default gen_random_uuid(),
  school_id       uuid not null default hulp.mijn_school() references scholen(id) on delete cascade,
  klas_id         uuid references klassen(id) on delete cascade,
  tool_id         text not null,
  titel           text,
  aangemaakt_door uuid references profielen(id) on delete set null,
  aangemaakt_op   timestamptz not null default now()
);

create table toewijzingen (
  id            uuid primary key default gen_random_uuid(),
  opdracht_id   uuid not null references opdrachten(id) on delete cascade,
  leerling_id   uuid not null references profielen(id) on delete cascade,
  school_id     uuid not null default hulp.mijn_school() references scholen(id),
  status        text not null default 'open',
  aangemaakt_op timestamptz not null default now(),
  unique (opdracht_id, leerling_id)
);


-- ───────────────────────────────────────────────────────────────────────────
-- Niemand wijzigt zijn eigen rol of school
-- ───────────────────────────────────────────────────────────────────────────
--
-- Laag 1 (deze trigger) is het echte slot: het is het enige punt dat óók een
-- toekomstige SECURITY DEFINER-RPC afdekt. Laag 2 (de kolomrechten verderop)
-- ligt er goedkoop bovenop.

create or replace function public.blokkeer_privilege_wijziging()
  returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  -- de Worker draait als service_role en moet dit wél mogen
  if coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') = 'service_role' then
    return new;
  end if;
  if new.rol is distinct from old.rol then
    raise exception 'Rol kan niet gewijzigd worden' using errcode = '42501';
  end if;
  if new.school_id is distinct from old.school_id then
    raise exception 'School kan niet gewijzigd worden' using errcode = '42501';
  end if;
  if new.id is distinct from old.id then
    raise exception 'Id kan niet gewijzigd worden' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger profielen_blokkeer_privileges
  before update on profielen
  for each row execute function public.blokkeer_privilege_wijziging();


-- ───────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ───────────────────────────────────────────────────────────────────────────
--
-- Let op de vorm `(select hulp.mijn_school())`: door hem in een scalaire
-- subquery te wikkelen voert Postgres hem één keer per statement uit als
-- InitPlan, in plaats van één keer per rij.

alter table scholen        enable row level security;
alter table klassen        enable row level security;
alter table profielen      enable row level security;
alter table resultaten     enable row level security;
alter table game_voortgang enable row level security;
alter table opdrachten     enable row level security;
alter table toewijzingen   enable row level security;

-- ── scholen ────────────────────────────────────────────────────────────────
create policy scholen_lezen on scholen for select to authenticated
  using (id = (select hulp.mijn_school()));
create policy scholen_admin on scholen for all to authenticated
  using ((select hulp.is_admin())) with check ((select hulp.is_admin()));

-- ── klassen ────────────────────────────────────────────────────────────────
create policy klassen_lezen on klassen for select to authenticated
  using (school_id = (select hulp.mijn_school()));
create policy klassen_beheren on klassen for all to authenticated
  using      ((select hulp.is_personeel()) and school_id = (select hulp.mijn_school()))
  with check ((select hulp.is_personeel()) and school_id = (select hulp.mijn_school()));
create policy klassen_admin on klassen for all to authenticated
  using ((select hulp.is_admin())) with check ((select hulp.is_admin()));

-- ── profielen ──────────────────────────────────────────────────────────────
create policy profielen_eigen_lezen on profielen for select to authenticated
  using (id = (select auth.uid()));
create policy profielen_school_lezen on profielen for select to authenticated
  using ((select hulp.is_personeel()) and school_id = (select hulp.mijn_school()));
-- BEWUST geen self-update-policy: een leerling leest alleen het eigen profiel.
-- Zonder deze policy heeft een leerling-sessie nul matchende update-policies op
-- profielen, dus wordt elke update-poging genegeerd — ook al staat klas_id in
-- de kolomrechten hieronder (die gelden voor de authenticated-rol als geheel,
-- RLS is hier het echte slot). Zonder dit zou een leerling zichzelf naar elke
-- klas kunnen zetten, ook van een andere school.
-- leerkracht mag klas_id zetten binnen de eigen school (jaarovergang);
-- rol en school_id blokkeert de trigger hierboven
create policy profielen_personeel_bewerken on profielen for update to authenticated
  using      ((select hulp.is_personeel()) and school_id = (select hulp.mijn_school()))
  with check ((select hulp.is_personeel()) and school_id = (select hulp.mijn_school()));
create policy profielen_admin on profielen for all to authenticated
  using ((select hulp.is_admin())) with check ((select hulp.is_admin()));
-- BEWUST geen insert-policy voor authenticated: accounts komen alleen via de
-- Worker met de service key.

-- ── resultaten ─────────────────────────────────────────────────────────────
create policy resultaten_eigen_invoegen on resultaten for insert to authenticated
  with check (leerling_id = (select auth.uid())
              and school_id = (select hulp.mijn_school()));
create policy resultaten_eigen_lezen on resultaten for select to authenticated
  using (leerling_id = (select auth.uid()));
create policy resultaten_personeel_lezen on resultaten for select to authenticated
  using ((select hulp.is_personeel()) and school_id = (select hulp.mijn_school()));
create policy resultaten_admin on resultaten for all to authenticated
  using ((select hulp.is_admin())) with check ((select hulp.is_admin()));
-- BEWUST geen update/delete voor leerlingen: resultaten zijn onveranderlijk.

-- ── game_voortgang ─────────────────────────────────────────────────────────
-- Uitsluitend de leerling zelf. Hier komt geen leerkracht-policy. Nooit.
-- RLS weigert standaard, dus een leerkracht die deze tabel bevraagt krijgt
-- nul rijen terug — geen foutmelding, geen data.
create policy voortgang_eigen on game_voortgang for all to authenticated
  using      (leerling_id = (select auth.uid()))
  with check (leerling_id = (select auth.uid())
              and school_id = (select hulp.mijn_school()));
create policy voortgang_admin on game_voortgang for all to authenticated
  using ((select hulp.is_admin())) with check ((select hulp.is_admin()));

-- ── opdrachten / toewijzingen (nog ongebruikt) ─────────────────────────────
create policy opdrachten_lezen on opdrachten for select to authenticated
  using (school_id = (select hulp.mijn_school()));
create policy opdrachten_beheren on opdrachten for all to authenticated
  using      ((select hulp.is_personeel()) and school_id = (select hulp.mijn_school()))
  with check ((select hulp.is_personeel()) and school_id = (select hulp.mijn_school()));

create policy toewijzingen_eigen_lezen on toewijzingen for select to authenticated
  using (leerling_id = (select auth.uid()));
create policy toewijzingen_personeel on toewijzingen for all to authenticated
  using      ((select hulp.is_personeel()) and school_id = (select hulp.mijn_school()))
  with check ((select hulp.is_personeel()) and school_id = (select hulp.mijn_school()));


-- ───────────────────────────────────────────────────────────────────────────
-- Rechten
-- ───────────────────────────────────────────────────────────────────────────

-- Uitgelogde bezoekers hebben hier niets te zoeken
revoke all on scholen, klassen, profielen, resultaten,
              game_voortgang, opdrachten, toewijzingen from anon;

grant select                         on scholen, klassen              to authenticated;
grant insert, update, delete         on klassen                       to authenticated;
grant select                         on profielen                     to authenticated;
grant select, insert                 on resultaten                    to authenticated;
grant select, insert, update, delete on game_voortgang                to authenticated;
grant select, insert, update, delete on opdrachten, toewijzingen      to authenticated;

-- Laag 2 op profielen: alleen deze drie kolommen zijn überhaupt te updaten
grant update (voornaam, achternaam_letter, klas_id) on profielen to authenticated;


-- ───────────────────────────────────────────────────────────────────────────
-- View voor het klasoverzicht: laatste resultaat per leerling per tool
-- ───────────────────────────────────────────────────────────────────────────
--
-- security_invoker = true is VERPLICHT. Zonder dat draait de view als eigenaar
-- en lekt hij dwars door alle policies hierboven heen — zonder foutmelding.

create view laatste_resultaten with (security_invoker = true) as
  select distinct on (leerling_id, tool_id)
         id, leerling_id, school_id, tool_id, score, max_score, aangemaakt_op
  from resultaten
  order by leerling_id, tool_id, aangemaakt_op desc;

grant select on laatste_resultaten to authenticated;
