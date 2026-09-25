-- ═══════════════════════════════════════════════════════════════════════════
-- Leestimer: stand van een half gelezen leesbeurt
-- ═══════════════════════════════════════════════════════════════════════════
--
-- De leestimer (src/games/LeesTimer.jsx) bewaarde zijn stand alleen in
-- localStorage. Op gedeelde school-iPads ging dat mis: een ander apparaat,
-- een gewiste Safari of meer dan een dag ertussen en de gelezen minuten waren
-- weg. Nu staat de stand ook hier, per leerling per opdracht.
--
-- Zelfde vorm als de lokale stand (lib/leestimerOpslag.js): gebankt = al
-- vastgezette seconden, start_op = sinds wanneer de timer loopt (null = stil).
-- De rij wordt verwijderd zodra de leesbeurt als resultaat is opgeslagen.

create table public.leesstanden (
  leerling_id   uuid not null references public.profielen(id) on delete cascade,
  opdracht_id   uuid not null references public.opdrachten(id) on delete cascade,
  gebankt       integer not null default 0 check (gebankt >= 0),
  start_op      timestamptz,
  bijgewerkt_op timestamptz not null default now(),
  primary key (leerling_id, opdracht_id)
);

alter table public.leesstanden enable row level security;

-- Alleen je eigen stand, en alleen voor een opdracht die aan jou is
-- toegewezen (zelfde check als resultaten_eigen_invoegen in 0007).
create policy leesstanden_eigen on public.leesstanden for all to authenticated
  using (leerling_id = (select auth.uid()))
  with check (
    leerling_id = (select auth.uid())
    and exists (
      select 1 from public.toewijzingen t
      where t.opdracht_id = leesstanden.opdracht_id
        and t.leerling_id = (select auth.uid())
    )
  );

revoke all on public.leesstanden from anon;
grant select, insert, update, delete on public.leesstanden to authenticated;
