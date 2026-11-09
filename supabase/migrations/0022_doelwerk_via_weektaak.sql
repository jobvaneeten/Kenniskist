-- ───────────────────────────────────────────────────────────────────────────
-- "Werk aan je doelen" telt alleen oefentijd die via de weektaak loopt
-- ───────────────────────────────────────────────────────────────────────────
--
-- Tot nu toe telde alles wat een leerling binnen de looptijd van de weektaak
-- aan een doel oefende, ook als hij het doel los opende via "Speciaal voor
-- mij". Nu telt een doel-resultaat alleen als de leerling het doel vanuit de
-- opdracht "Werk aan je doelen" heeft geopend: Weektaak.jsx zet dan via in
-- kk_actieve_opdracht en kenniskist-login.js slaat die op in via_opdracht_id.
--
-- Wat vóór 9 november 2026 17:50 (de deploy) al geoefend was, telt nog op de oude manier, zodat
-- leerlingen die deze week al bezig waren hun minuten niet kwijtraken.

alter table public.resultaten
  add column if not exists via_opdracht_id uuid references public.opdrachten(id) on delete set null;

create index if not exists resultaten_via_idx
  on public.resultaten (via_opdracht_id, leerling_id) where via_opdracht_id is not null;

-- Ook via_opdracht_id moet een opdracht zijn die aan de leerling zelf is
-- toegewezen (anders kan hij tijd bij een ander laten meetellen).
alter policy resultaten_eigen_invoegen on public.resultaten
  with check (
    leerling_id = (select auth.uid())
    and school_id = (select hulp.mijn_school())
    and (
      opdracht_id is null
      or exists (
        select 1 from public.toewijzingen t
        where t.opdracht_id = resultaten.opdracht_id
          and t.leerling_id = (select auth.uid())
      )
    )
    and (
      via_opdracht_id is null
      or exists (
        select 1 from public.toewijzingen t
        where t.opdracht_id = resultaten.via_opdracht_id
          and t.leerling_id = (select auth.uid())
      )
    )
  );

create or replace view public.doelwerk_voortgang with (security_invoker = true) as
select t.opdracht_id,
       t.leerling_id,
       o.weektaak_id,
       case when o.config->>'minuten' ~ '^\d+$' then (o.config->>'minuten')::int else 15 end as minuten,
       coalesce((
         select sum(r.ms)
           from public.resultaten r
          where r.leerling_id = t.leerling_id
            and r.ms is not null
            and (r.opdracht_id = t.opdracht_id
                 or r.via_opdracht_id = t.opdracht_id
                 -- oude manier, alleen voor wat vóór de deploy (9 november 2026 17:50) geoefend is
                 or (r.aangemaakt_op < ('2026-11-09 17:50'::timestamp at time zone 'Europe/Amsterdam')
                     and r.aangemaakt_op >= (w.start_op::timestamp at time zone 'Europe/Amsterdam')
                     and r.aangemaakt_op < ((w.eind_op + 1)::timestamp at time zone 'Europe/Amsterdam')
                     and exists (select 1 from public.opdrachten d
                                  where d.id = r.opdracht_id and d.config->>'persoonlijk' = 'doel')))
       ), 0)::bigint as som_ms,
       (t.afgerond_op is not null) as afgerond
  from public.toewijzingen t
  join public.opdrachten o on o.id = t.opdracht_id
  join public.weektaken w on w.id = o.weektaak_id
 where o.tool_id = 'doelen-werken';

grant select on public.doelwerk_voortgang to authenticated;
