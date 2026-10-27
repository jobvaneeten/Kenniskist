-- ───────────────────────────────────────────────────────────────────────────
-- Eigen oefeningen: vragenlijsten die de leerkracht zelf maakt
-- ───────────────────────────────────────────────────────────────────────────
--
-- De leerkracht plakt of laadt een vragenlijst in (portaal, tab "Eigen
-- oefeningen") en kiest onder welke groep en welk vak hij staat. De
-- leerlingen van die klas zien hem dan bij Speel Game → groep → vak, tussen
-- de gewone oefeningen. Geen weektaak: het is vrij oefenen.
--
-- vragen: [{ vraag, antwoord, fout: [..] }], zie src/lib/eigenVragen.js.
-- Met foute keuzes is een vraag meerkeuze, zonder is hij open.
--
-- spel_na: na zoveel goede antwoorden een spelletje (null = zoals de klas is
-- ingesteld, 0 = geen spelletjes). geld: briefgeld dat de leerling één keer
-- krijgt als hij alle vragen van deze oefening heeft gemaakt.

create table public.eigen_oefeningen (
  id              uuid primary key default gen_random_uuid(),
  school_id       uuid not null default hulp.mijn_school() references scholen(id) on delete cascade,
  klas_id         uuid not null references klassen(id) on delete cascade,
  groep           smallint not null check (groep between 1 and 8),
  vak             text not null check (vak in ('taal', 'spelling', 'rekenen', 'begrijpend', 'topo')),
  onderwerp       text not null check (char_length(btrim(onderwerp)) between 1 and 60),
  vragen          jsonb not null default '[]'::jsonb
                  check (jsonb_typeof(vragen) = 'array' and jsonb_array_length(vragen) <= 200
                         and pg_column_size(vragen) < 200000),
  schudden        boolean not null default true,
  spel_na         smallint check (spel_na is null or spel_na between 0 and 50),
  geld            smallint not null default 0 check (geld between 0 and 1000),
  aangemaakt_door uuid default auth.uid() references profielen(id) on delete set null,
  aangemaakt_op   timestamptz not null default now()
);

create index eigen_oefeningen_klas_idx on public.eigen_oefeningen (klas_id, groep, vak);

alter table public.eigen_oefeningen enable row level security;

-- Lezen: de leerlingen van de klas en het personeel dat bij de klas mag,
-- precies zoals weektaken (zie 0013).
create policy eigen_oefeningen_lezen on public.eigen_oefeningen for select to authenticated
  using (school_id = (select hulp.mijn_school()) and hulp.mag_klas(klas_id));

create policy eigen_oefeningen_beheren on public.eigen_oefeningen for all to authenticated
  using      ((select hulp.is_personeel()) and school_id = (select hulp.mijn_school()) and hulp.mag_klas(klas_id))
  with check ((select hulp.is_personeel()) and school_id = (select hulp.mijn_school()) and hulp.mag_klas(klas_id));

grant select, insert, update, delete on public.eigen_oefeningen to authenticated;
