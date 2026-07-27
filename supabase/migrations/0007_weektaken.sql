-- ═══════════════════════════════════════════════════════════════════════════
-- Weektaken — een leerkracht zet een lijst opdrachten klaar voor een periode
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Bouwt voort op de tabellen die sinds 0001 klaarstonden maar ongebruikt
-- waren: opdrachten en toewijzingen. Nieuw is alleen `weektaken` (één rij
-- per weektaak, altijd aan één klas) en de kolommen die opdrachten/
-- toewijzingen/resultaten aan elkaar en aan weektaken knopen.
--
-- Voltooiing wordt NIET bijgehouden in toewijzingen.status. `resultaten` is
-- onveranderlijk en al de bron van waarheid; afleiden via de view onderaan
-- scheelt een schrijfpad en de bijbehorende RLS-complexiteit. De status-
-- kolom blijft daarom ongebruikt liggen (niet verwijderd: kost een
-- migratierisico zonder winst).

-- ───────────────────────────────────────────────────────────────────────────
-- weektaken
-- ───────────────────────────────────────────────────────────────────────────

create table weektaken (
  id              uuid primary key default gen_random_uuid(),
  school_id       uuid not null default hulp.mijn_school() references scholen(id) on delete cascade,
  klas_id         uuid not null references klassen(id) on delete cascade,
  titel           text not null,
  -- Vrije periode, geen weeknummer. eind_op is INCLUSIEF: een weektaak die op
  -- 2026-08-01 eindigt mag die hele dag nog gemaakt worden. De client filtert
  -- op een lokaal berekende datum (Europe/Amsterdam), niet op current_date —
  -- Supabase draait in UTC en anders verloopt een weektaak om 02:00 's nachts.
  start_op        date not null default current_date,
  eind_op         date not null,
  aangemaakt_door uuid references profielen(id) on delete set null,
  aangemaakt_op   timestamptz not null default now(),
  constraint weektaken_periode_geldig check (eind_op >= start_op)
);

create index weektaken_klas_idx on weektaken (klas_id, start_op desc);


-- ───────────────────────────────────────────────────────────────────────────
-- opdrachten uitbreiden
-- ───────────────────────────────────────────────────────────────────────────

alter table opdrachten
  add column weektaak_id uuid references weektaken(id) on delete cascade,
  add column aantal      integer,
  add column config      jsonb not null default '{}'::jsonb,
  add column volgorde    integer not null default 0;

-- null = geen limiet (vrij oefenen); anders minstens 1
alter table opdrachten add constraint opdrachten_aantal_geldig
  check (aantal is null or aantal > 0);

create index opdrachten_weektaak_idx on opdrachten (weektaak_id, volgorde);


-- ───────────────────────────────────────────────────────────────────────────
-- toewijzingen: differentiatie per leerling
-- ───────────────────────────────────────────────────────────────────────────
--
-- null = neem het aantal van de opdracht over. Een leerling die de opdracht
-- helemaal niet hoeft te doen krijgt géén rij (afwezigheid = niet toegewezen).

alter table toewijzingen
  add column aantal_override integer;

alter table toewijzingen add constraint toewijzingen_aantal_geldig
  check (aantal_override is null or aantal_override > 0);

create index toewijzingen_leerling_idx on toewijzingen (leerling_id);


-- ───────────────────────────────────────────────────────────────────────────
-- resultaten koppelen aan een opdracht
-- ───────────────────────────────────────────────────────────────────────────
--
-- ON DELETE SET NULL, bewust geen CASCADE: een weektaak weggooien mag nooit
-- gemaakte resultaten wissen. De rij (score, max_score, details_json) blijft
-- volledig intact, alleen de koppeling verdwijnt.

alter table resultaten
  add column opdracht_id uuid references opdrachten(id) on delete set null;

-- Partieel: verreweg de meeste resultaten komen uit vrij oefenen.
create index resultaten_opdracht_idx
  on resultaten (opdracht_id, leerling_id)
  where opdracht_id is not null;


-- ───────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ───────────────────────────────────────────────────────────────────────────

alter table weektaken enable row level security;

-- Leerling moet zijn eigen weektaak kunnen lezen (titel + periode), anders kan
-- de leerlingkant niets tonen. School-breed, exact zoals opdrachten_lezen:
-- er staat geen persoonsgegeven in en één patroon is minder verrassend dan twee.
create policy weektaken_lezen on weektaken for select to authenticated
  using (school_id = (select hulp.mijn_school()));
create policy weektaken_beheren on weektaken for all to authenticated
  using      ((select hulp.is_personeel()) and school_id = (select hulp.mijn_school()))
  with check ((select hulp.is_personeel()) and school_id = (select hulp.mijn_school()));

-- Een leerling mag een resultaat alleen aan een opdracht hangen die ook echt
-- aan hém is toegewezen. Zonder dit kan hij zijn score laten meetellen voor een
-- willekeurige opdracht binnen de school. De EXISTS draait onder zijn eigen RLS
-- (toewijzingen_eigen_lezen) en is een index-lookup op de unique key.
alter policy resultaten_eigen_invoegen on resultaten
  with check (
    leerling_id = (select auth.uid())
    and school_id = (select hulp.mijn_school())
    and (
      opdracht_id is null
      or exists (
        select 1 from toewijzingen t
        where t.opdracht_id = resultaten.opdracht_id
          and t.leerling_id = (select auth.uid())
      )
    )
  );


-- ───────────────────────────────────────────────────────────────────────────
-- Rechten
-- ───────────────────────────────────────────────────────────────────────────

revoke all on weektaken from anon;
grant select, insert, update, delete on weektaken to authenticated;
-- resultaten/opdrachten/toewijzingen hebben al tabel-brede grants; nieuwe
-- kolommen vallen daar automatisch onder.


-- ───────────────────────────────────────────────────────────────────────────
-- View: voortgang per leerling per opdracht
-- ───────────────────────────────────────────────────────────────────────────
--
-- security_invoker = true is VERPLICHT (zie 0001_init.sql, laatste_resultaten).
-- Met invoker-semantiek bedient deze ene view beide kanten: een leerling ziet
-- alleen zijn eigen rijen (toewijzingen_eigen_lezen + resultaten_eigen_lezen),
-- personeel ziet de hele school.
--
-- som_max = hoeveel er gemaakt is, som_score = hoeveel daarvan goed was. Voor
-- tools waar één opgave één punt is (registry: eenheid 'opgaven') is som_max
-- letterlijk het aantal gemaakte opgaven, óók als het kind in meerdere
-- sessies werkt. Voor punt-scorende tools (dictee, begrijpend lezen) gebruikt
-- de client `pogingen`.
create view weektaak_voortgang with (security_invoker = true) as
  select
    t.opdracht_id,
    t.leerling_id,
    o.weektaak_id,
    o.school_id,
    o.tool_id,
    coalesce(t.aantal_override, o.aantal) as doel_aantal,
    count(r.id)                            as pogingen,
    coalesce(sum(r.score), 0)              as som_score,
    coalesce(sum(r.max_score), 0)          as som_max,
    max(r.aangemaakt_op)                   as laatst_op
  from toewijzingen t
  join opdrachten o on o.id = t.opdracht_id
  left join resultaten r
         on r.opdracht_id = t.opdracht_id
        and r.leerling_id = t.leerling_id
  group by t.opdracht_id, t.leerling_id, o.weektaak_id, o.school_id,
           o.tool_id, t.aantal_override, o.aantal;

grant select on weektaak_voortgang to authenticated;
