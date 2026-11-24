-- ───────────────────────────────────────────────────────────────────────────
-- "Werk aan je doelen" met een echte klok
-- ───────────────────────────────────────────────────────────────────────────
--
-- Tot nu toe telde alleen de oefentijd tussen opgeslagen antwoorden
-- (resultaten.ms). Leerkrachten willen dat de tijd loopt zodra het kind op
-- "Werk aan je doelen" klikt, ook als het daarna zelf iets kiest omdat alle
-- doelen behaald zijn. Weektaak.jsx stuurt daarom elke ~15 seconden de
-- verstreken tijd (zonder beloningsspelletjes) naar doelwerk_tik().
--
-- Veiligheid: per aanroep telt hooguit de tijd sinds de vorige aanroep (plus
-- een paar seconden speling) en nooit meer dan 30 seconden, dus een kind kan de
-- klok niet vooruitzetten door het seintje vaker of met een groter getal te
-- sturen.
--
-- som_ms in de view is het maximum van de oude meting en de klok, zodat
-- voortgang van vóór deze wijziging blijft staan en niets dubbel telt.

alter table public.toewijzingen
  add column if not exists doelwerk_ms bigint not null default 0,
  add column if not exists doelwerk_tik_op timestamptz;

create or replace function public.doelwerk_tik(p_opdracht uuid, p_ms integer)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vorige timestamptz;
  v_max    bigint;
  v_erbij  bigint;
  v_start  bigint;
  v_totaal bigint;
begin
  if p_ms is null or p_ms <= 0 then return null; end if;
  select t.doelwerk_tik_op into v_vorige
    from public.toewijzingen t
    join public.opdrachten o on o.id = t.opdracht_id
   where t.opdracht_id = p_opdracht
     and t.leerling_id = auth.uid()
     and o.tool_id = 'doelen-werken'
   for update of t;
  if not found then return null; end if;
  -- eerste tik: begin bij wat er al gemeten was, dan telt niets dubbel of te weinig
  if v_vorige is null then
    select v.som_ms into v_start from public.doelwerk_voortgang v
     where v.opdracht_id = p_opdracht and v.leerling_id = auth.uid();
    update public.toewijzingen set doelwerk_ms = greatest(doelwerk_ms, coalesce(v_start, 0))
     where opdracht_id = p_opdracht and leerling_id = auth.uid();
  end if;
  v_max := case when v_vorige is null then 30000
                else least(30000, (extract(epoch from (now() - v_vorige)) * 1000)::bigint + 3000) end;
  v_erbij := greatest(0, least(p_ms::bigint, v_max));
  update public.toewijzingen
     set doelwerk_ms = doelwerk_ms + v_erbij,
         doelwerk_tik_op = now()
   where opdracht_id = p_opdracht and leerling_id = auth.uid()
  returning doelwerk_ms into v_totaal;
  return v_totaal;
end $$;

revoke all on function public.doelwerk_tik(uuid, integer) from public;
grant execute on function public.doelwerk_tik(uuid, integer) to authenticated;

create or replace view public.doelwerk_voortgang with (security_invoker = true) as
select t.opdracht_id,
       t.leerling_id,
       o.weektaak_id,
       case when o.config->>'minuten' ~ '^\d+$' then (o.config->>'minuten')::int else 15 end as minuten,
       greatest(t.doelwerk_ms, coalesce((
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
       ), 0))::bigint as som_ms,
       (t.afgerond_op is not null) as afgerond
  from public.toewijzingen t
  join public.opdrachten o on o.id = t.opdracht_id
  join public.weektaken w on w.id = o.weektaak_id
 where o.tool_id = 'doelen-werken';

grant select on public.doelwerk_voortgang to authenticated;
