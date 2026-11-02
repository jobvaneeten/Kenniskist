-- ───────────────────────────────────────────────────────────────────────────
-- "Werk aan je doelen": een weektaak-opdracht die in minuten telt
-- ───────────────────────────────────────────────────────────────────────────
--
-- Een opdracht met tool_id 'doelen-werken' (config.minuten, leeg = 15) heeft
-- geen aantal. De leerling werkt aan zijn eigen doelen; de tijd die telt is
-- de echte oefentijd (resultaten.ms, zie 0009, zonder beloningsspelletjes):
--   * alles wat hij binnen de looptijd van de weektaak aan een doel oefent
--     (een opdracht met config.persoonlijk = 'doel'), en
--   * wat hij zelf kiest als al zijn doelen behaald zijn; die resultaten
--     hangen aan de doelwerk-opdracht zelf.
-- De looptijd rekent in Nederlandse tijd, net als de rest (zie 0007).

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
                 or (r.aangemaakt_op >= (w.start_op::timestamp at time zone 'Europe/Amsterdam')
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
