-- Een leerkracht ziet vanaf nu alleen de klas(sen) waaraan hij gekoppeld is.
-- De icter (en de admin) blijft de hele school zien — die scheidslijn liep tot
-- nu toe alleen via hulp.is_schoolbeheerder() voor het beheren van klassen;
-- lezen was voor álle personeel schoolbreed.
--
-- De koppeling stond in profielen.klas_id ("wie draait deze klas"), maar dat is
-- er één per leerkracht. Duo-banen en vakleerkrachten hebben er meer, dus komt
-- er een koppeltabel. profielen.klas_id blijft wat het altijd was: de klas van
-- een léérling. Voor personeel is die kolom vanaf nu niet meer leidend.

create table klas_leerkrachten (
  klas_id       uuid not null references klassen(id) on delete cascade,
  leerkracht_id uuid not null references profielen(id) on delete cascade,
  school_id     uuid not null default hulp.mijn_school() references scholen(id) on delete cascade,
  aangemaakt_op timestamptz not null default now(),
  primary key (klas_id, leerkracht_id)
);

create index klas_leerkrachten_leerkracht_idx on klas_leerkrachten (leerkracht_id);

-- Bestaande koppelingen overnemen, anders staat iedereen na deze migratie voor
-- een leeg portaal.
insert into klas_leerkrachten (klas_id, leerkracht_id, school_id)
select p.klas_id, p.id, p.school_id
  from profielen p
 where p.rol in ('leerkracht', 'icter') and p.klas_id is not null
on conflict do nothing;


-- ───────────────────────────────────────────────────────────────────────────
-- Hulpfuncties
-- ───────────────────────────────────────────────────────────────────────────
-- Allemaal security definer: ze kijken in profielen en klas_leerkrachten
-- terwijl ze zelf ín een policy op die tabellen gebruikt worden. Zonder definer
-- zou RLS binnen de policy opnieuw afgaan (oneindige recursie).

-- De klas van de ingelogde gebruiker als léérling. Voor personeel null —
-- die koppeling loopt via klas_leerkrachten.
create or replace function hulp.mijn_klas()
  returns uuid
  language sql stable security definer set search_path = public, pg_temp
as $$ select klas_id from public.profielen where id = auth.uid() and rol = 'leerling' $$;

-- Mag ik bij deze klas? Schoolbeheerder overal, personeel bij zijn eigen
-- klassen, een leerling bij de klas waar hij in zit.
create or replace function hulp.mag_klas(klas uuid)
  returns boolean
  language sql stable security definer set search_path = public, pg_temp
as $$ select klas is not null and (
        (select hulp.is_schoolbeheerder())
        or klas = (select hulp.mijn_klas())
        or exists (
             select 1 from public.klas_leerkrachten
              where leerkracht_id = auth.uid() and klas_id = klas)
      ) $$;

-- Mag ik bij deze leerling? Alleen personeel; de leerling moet in een klas
-- zitten waar ik bij mag.
create or replace function hulp.mag_leerling(leerling uuid)
  returns boolean
  language sql stable security definer set search_path = public, pg_temp
as $$ select (select hulp.is_personeel()) and exists (
        select 1 from public.profielen p
         where p.id = leerling
           and p.school_id = (select hulp.mijn_school())
           and (select hulp.mag_klas(p.klas_id))
      ) $$;

-- Collega op dezelfde klas. Nodig omdat het portaal bij elke klas laat zien
-- wie hem draait: die namen staan in profielen, en zonder dit zou een
-- leerkracht zijn eigen duo-partner niet mogen lezen.
create or replace function hulp.deelt_klas_met(persoon uuid)
  returns boolean
  language sql stable security definer set search_path = public, pg_temp
as $$ select exists (
        select 1
          from public.klas_leerkrachten mijn
          join public.klas_leerkrachten hun on hun.klas_id = mijn.klas_id
         where mijn.leerkracht_id = auth.uid() and hun.leerkracht_id = persoon
      ) $$;

grant execute on function
  hulp.mijn_klas(), hulp.mag_klas(uuid), hulp.mag_leerling(uuid), hulp.deelt_klas_met(uuid)
  to authenticated;


-- ───────────────────────────────────────────────────────────────────────────
-- RLS op de koppeltabel zelf
-- ───────────────────────────────────────────────────────────────────────────
alter table klas_leerkrachten enable row level security;

-- Lezen: binnen de eigen school. Er staat niets gevoeligers in dan "deze
-- leerkracht hoort bij deze klas", en het portaal moet die lijst kunnen tonen.
create policy klas_leerkrachten_lezen on klas_leerkrachten for select to authenticated
  using (school_id = (select hulp.mijn_school()));

-- Koppelen en loskoppelen is werk van de icter, net als klassen beheren.
create policy klas_leerkrachten_beheren on klas_leerkrachten for all to authenticated
  using      ((select hulp.is_schoolbeheerder()) and school_id = (select hulp.mijn_school()))
  with check ((select hulp.is_schoolbeheerder()) and school_id = (select hulp.mijn_school()));

create policy klas_leerkrachten_admin on klas_leerkrachten for all to authenticated
  using ((select hulp.is_admin())) with check ((select hulp.is_admin()));


-- ───────────────────────────────────────────────────────────────────────────
-- Bestaande policies aanscherpen
-- ───────────────────────────────────────────────────────────────────────────

-- klassen: niet meer elke klas van de school, maar de klas(sen) waar je bij mag.
alter policy klassen_lezen on klassen
  using (school_id = (select hulp.mijn_school()) and hulp.mag_klas(id));

-- profielen: leerlingen uit je eigen klas(sen), plus collega's op diezelfde
-- klas. Het eigen profiel blijft via profielen_eigen_lezen zichtbaar.
alter policy profielen_school_lezen on profielen
  using (
    (select hulp.is_personeel())
    and school_id = (select hulp.mijn_school())
    and ((select hulp.is_schoolbeheerder()) or hulp.mag_klas(klas_id) or hulp.deelt_klas_met(id))
  );

-- Bewerken (klas_id zetten bij de jaarovergang, voorlezen aanzetten): zowel de
-- oude als de nieuwe rij moet in een klas zitten waar je bij mag. Een leerkracht
-- kan een leerling dus niet naar een andere klas schuiven — dat is icter-werk.
alter policy profielen_personeel_bewerken on profielen
  using      ((select hulp.is_personeel()) and school_id = (select hulp.mijn_school()) and hulp.mag_klas(klas_id))
  with check ((select hulp.is_personeel()) and school_id = (select hulp.mijn_school()) and hulp.mag_klas(klas_id));

-- resultaten: alleen van leerlingen uit je eigen klas(sen).
alter policy resultaten_personeel_lezen on resultaten
  using ((select hulp.is_personeel()) and school_id = (select hulp.mijn_school())
         and hulp.mag_leerling(leerling_id));

-- opdrachten hangen aan een klas (weektaakOpslaan.js vult klas_id altijd).
alter policy opdrachten_lezen on opdrachten
  using (school_id = (select hulp.mijn_school()) and hulp.mag_klas(klas_id));
alter policy opdrachten_beheren on opdrachten
  using      ((select hulp.is_personeel()) and school_id = (select hulp.mijn_school()) and hulp.mag_klas(klas_id))
  with check ((select hulp.is_personeel()) and school_id = (select hulp.mijn_school()) and hulp.mag_klas(klas_id));

-- toewijzingen: per leerling.
alter policy toewijzingen_personeel on toewijzingen
  using      ((select hulp.is_personeel()) and school_id = (select hulp.mijn_school())
              and hulp.mag_leerling(leerling_id))
  with check ((select hulp.is_personeel()) and school_id = (select hulp.mijn_school())
              and hulp.mag_leerling(leerling_id));

-- weektaken: de leerling leest die van zijn eigen klas, personeel die van de
-- klassen waar het bij mag.
alter policy weektaken_lezen on weektaken
  using (school_id = (select hulp.mijn_school()) and hulp.mag_klas(klas_id));
alter policy weektaken_beheren on weektaken
  using      ((select hulp.is_personeel()) and school_id = (select hulp.mijn_school()) and hulp.mag_klas(klas_id))
  with check ((select hulp.is_personeel()) and school_id = (select hulp.mijn_school()) and hulp.mag_klas(klas_id));
