-- ───────────────────────────────────────────────────────────────────────────
-- Controledictee (toetsdictee van Taal actief)
-- ───────────────────────────────────────────────────────────────────────────
--
-- De leerkracht dicteert hardop; de leerlingen typen de woorden in genummerde
-- vakjes (src/ControleDictee.jsx). Daarna analyseert het portaal per woord
-- waar de fout zit en bij welke spellingcategorie die hoort
-- (src/lib/dicteeAnalyse.js, tab Dictee in het portaal).
--
-- dictee_sjablonen: de dictees uit de methode, met per woord de categorieën
--   en de plek in het woord: [{ w, zin?, c: [{ id, van, tot, x? }] }].
--   van/tot zijn tekenposities in w; van = tot is een naad (bv. tussen de
--   delen van een samenstelling), x zijn dan de tekens die daar fout
--   tussen komen (spatie, koppelteken, een verborgen j/w).
--   klas_ids: voor welke klassen het dictee klaarstaat (null = alle klassen).
--   Alleen personeel van die klassen leest ze. Ze worden beheerd met SQL
--   (niet vanuit de site).
-- controledictees: een afname in een klas, met een kopie van de woorden.
--   Leerlingen lezen deze tabel niet: anders zouden de goede antwoorden in
--   hun browser staan. Ze krijgen alleen het aantal vakjes (mijn_controledictee).
-- dictee_antwoorden: wat een leerling intypte. Alleen de tekst, geen tijden.
--   correcties: de leerkracht rekent een woord zelf goed of fout ({"3": true}).
--
-- AVG: een afname met alle antwoorden verdwijnt na bewaren_tot (standaard een
-- jaar). ruim_dictees_op() doet dat; het portaal roept hem aan bij het openen
-- van de tab, en wat verlopen is, is daarvoor al onzichtbaar. wis_resultaten
-- (gemaakt werk wissen) wist ook de dictee-antwoorden.

create table public.dictee_sjablonen (
  id            text primary key check (id ~ '^[a-z0-9-]{1,40}$'),
  groep         smallint not null check (groep between 3 and 8),
  titel         text not null check (char_length(btrim(titel)) between 1 and 80),
  woorden       jsonb not null check (jsonb_typeof(woorden) = 'array' and jsonb_array_length(woorden) between 1 and 60),
  klas_ids      uuid[],
  volgorde      smallint not null default 0,
  aangemaakt_op timestamptz not null default now()
);

alter table public.dictee_sjablonen enable row level security;
create policy dictee_sjablonen_lezen on public.dictee_sjablonen for select to authenticated
  using ((select hulp.is_personeel())
         and (klas_ids is null or exists (select 1 from unnest(klas_ids) as k(id) where hulp.mag_klas(k.id))));
grant select on public.dictee_sjablonen to authenticated;

create table public.controledictees (
  id              uuid primary key default gen_random_uuid(),
  school_id       uuid not null default hulp.mijn_school() references scholen(id) on delete cascade,
  klas_id         uuid not null references klassen(id) on delete cascade,
  sjabloon_id     text references public.dictee_sjablonen(id) on delete set null,
  titel           text not null check (char_length(btrim(titel)) between 1 and 80),
  woorden         jsonb not null
                  check (jsonb_typeof(woorden) = 'array' and jsonb_array_length(woorden) between 1 and 60
                         and pg_column_size(woorden) < 100000),
  open            boolean not null default false,
  aangemaakt_door uuid default auth.uid() references profielen(id) on delete set null,
  aangemaakt_op   timestamptz not null default now(),
  bewaren_tot     date not null default (current_date + 365)
);

create index controledictees_klas_idx on public.controledictees (klas_id, aangemaakt_op desc);

alter table public.controledictees enable row level security;
create policy controledictees_beheren on public.controledictees for all to authenticated
  using      ((select hulp.is_personeel()) and school_id = (select hulp.mijn_school())
              and hulp.mag_klas(klas_id) and bewaren_tot >= current_date)
  with check ((select hulp.is_personeel()) and school_id = (select hulp.mijn_school()) and hulp.mag_klas(klas_id)
              and (sjabloon_id is null or exists (
                    select 1 from public.dictee_sjablonen s
                     where s.id = sjabloon_id and (s.klas_ids is null or klas_id = any(s.klas_ids)))));
grant select, insert, update, delete on public.controledictees to authenticated;

create table public.dictee_antwoorden (
  dictee_id     uuid not null references public.controledictees(id) on delete cascade,
  leerling_id   uuid not null references profielen(id) on delete cascade,
  school_id     uuid not null references scholen(id) on delete cascade,
  antwoorden    jsonb not null default '[]'::jsonb
                check (jsonb_typeof(antwoorden) = 'array' and jsonb_array_length(antwoorden) <= 60
                       and pg_column_size(antwoorden) < 20000),
  correcties    jsonb not null default '{}'::jsonb check (jsonb_typeof(correcties) = 'object'),
  ingeleverd_op timestamptz,
  bijgewerkt_op timestamptz not null default now(),
  primary key (dictee_id, leerling_id)
);

create index dictee_antwoorden_leerling_idx on public.dictee_antwoorden (leerling_id);

alter table public.dictee_antwoorden enable row level security;
-- Alleen personeel, en alleen bij leerlingen waar het bij mag. Leerlingen
-- schrijven via bewaar_dictee().
create policy dictee_antwoorden_personeel on public.dictee_antwoorden for all to authenticated
  using      ((select hulp.is_personeel()) and school_id = (select hulp.mijn_school()) and hulp.mag_leerling(leerling_id))
  with check ((select hulp.is_personeel()) and school_id = (select hulp.mijn_school()) and hulp.mag_leerling(leerling_id));
grant select, delete on public.dictee_antwoorden to authenticated;
grant update (correcties) on public.dictee_antwoorden to authenticated;

-- Leerling: het open dictee van mijn klas. Geen woorden, alleen hoeveel
-- vakjes en welke bij een zin horen (vakken: [null, null, 1, 1, ...]).
create or replace function public.mijn_controledictee()
  returns table (id uuid, titel text, vakken jsonb, antwoorden jsonb, ingeleverd boolean)
  language sql stable security definer set search_path = public, pg_temp
as $$
  select d.id, d.titel,
         (select jsonb_agg(w->'zin' order by i) from jsonb_array_elements(d.woorden) with ordinality as t(w, i)),
         coalesce(a.antwoorden, '[]'::jsonb),
         a.ingeleverd_op is not null
    from controledictees d
    left join dictee_antwoorden a on a.dictee_id = d.id and a.leerling_id = auth.uid()
   where d.open and d.klas_id = (select hulp.mijn_klas()) and d.bewaren_tot >= current_date
   order by d.aangemaakt_op desc
   limit 1
$$;

-- Leerling: tussendoor bewaren en inleveren. Na inleveren ligt het vast.
create or replace function public.bewaar_dictee(p_dictee uuid, p_antwoorden jsonb, p_inleveren boolean)
  returns boolean
  language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  d controledictees;
begin
  select * into d from controledictees
   where controledictees.id = p_dictee and open and klas_id = (select hulp.mijn_klas());
  if not found then
    return false;
  end if;
  if jsonb_typeof(p_antwoorden) <> 'array'
     or jsonb_array_length(p_antwoorden) > jsonb_array_length(d.woorden)
     or exists (select 1 from jsonb_array_elements(p_antwoorden) e
                 where jsonb_typeof(e) <> 'string' or char_length(e #>> '{}') > 60) then
    raise exception 'ongeldige antwoorden';
  end if;
  insert into dictee_antwoorden as a (dictee_id, leerling_id, school_id, antwoorden, ingeleverd_op)
  values (p_dictee, auth.uid(), d.school_id, p_antwoorden, case when p_inleveren then now() end)
  on conflict (dictee_id, leerling_id) do update
     set antwoorden = excluded.antwoorden,
         ingeleverd_op = excluded.ingeleverd_op,
         bijgewerkt_op = now()
   where a.ingeleverd_op is null;
  return true;
end $$;

-- Verlopen afnames (met hun antwoorden) van mijn school opruimen.
create or replace function public.ruim_dictees_op()
  returns integer
  language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  aantal integer;
begin
  if not hulp.is_personeel() then
    return 0;
  end if;
  delete from controledictees where school_id = hulp.mijn_school() and bewaren_tot < current_date;
  get diagnostics aantal = row_count;
  return aantal;
end $$;

revoke execute on function public.mijn_controledictee() from public, anon;
revoke execute on function public.bewaar_dictee(uuid, jsonb, boolean) from public, anon;
revoke execute on function public.ruim_dictees_op() from public, anon;
grant execute on function public.mijn_controledictee() to authenticated;
grant execute on function public.bewaar_dictee(uuid, jsonb, boolean) to authenticated;
grant execute on function public.ruim_dictees_op() to authenticated;

-- Gemaakt werk wissen: nu ook de dictee-antwoorden (verder gelijk aan 0017).
create or replace function public.wis_resultaten(p_leerlingen uuid[])
  returns integer language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  aantal integer;
begin
  if not hulp.is_personeel() then
    raise exception 'geen rechten';
  end if;
  if exists (
    select 1 from unnest(p_leerlingen) as l(id)
     where not exists (select 1 from profielen p where p.id = l.id and p.school_id = hulp.mijn_school())
        or not hulp.mag_leerling(l.id)
  ) then
    raise exception 'geen rechten voor deze leerling';
  end if;

  -- Eerst vastleggen wat af of behaald is.
  update toewijzingen t set afgerond_op = now()
    from weektaak_voortgang v
    join opdrachten o on o.id = v.opdracht_id
   where t.opdracht_id = v.opdracht_id and t.leerling_id = v.leerling_id
     and t.leerling_id = any(p_leerlingen) and t.afgerond_op is null
     and o.config->>'persoonlijk' is distinct from 'doel'
     and v.doel_aantal is not null and v.som_max >= v.doel_aantal;

  update toewijzingen t set afgerond_op = now()
    from doel_voortgang d
   where t.opdracht_id = d.opdracht_id and t.leerling_id = d.leerling_id
     and t.leerling_id = any(p_leerlingen) and t.afgerond_op is null and d.gehaald;

  delete from dictee_antwoorden where leerling_id = any(p_leerlingen);

  delete from resultaten where leerling_id = any(p_leerlingen);
  get diagnostics aantal = row_count;
  return aantal;
end $$;
