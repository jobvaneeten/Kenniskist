-- ───────────────────────────────────────────────────────────────────────────
-- Doelen: geen vast aantal opgaven, maar 80% goed van de laatste 20
-- ───────────────────────────────────────────────────────────────────────────
--
-- Een doel ("Speciaal voor mij", config.persoonlijk = 'doel') heeft geen
-- aantal meer. De leerling oefent net zo lang tot de laatste 20 opgaven voor
-- minstens 80% goed zijn; dan is het doel behaald en blijft het behaald, ook
-- als hij daarna weer een paar fout doet.
--
-- De meeste oefeningen schrijven één rij per opgave (score 0/1, max 1), maar
-- de dictees schrijven één rij per dictee (bv. 8 van 12 woorden). Daarom
-- wordt elke rij eerst uitgevouwen tot losse opgaven (de goede eerst), zodat
-- "de laatste 20" altijd over 20 opgaven gaat.

-- Bestaande doelen: aantal eraf, anders zou de herkansing-trigger (0010) er
-- nog op reageren.
update public.opdrachten set aantal = null
 where config->>'persoonlijk' = 'doel' and aantal is not null;
update public.toewijzingen t set aantal_override = null
  from public.opdrachten o
 where o.id = t.opdracht_id and o.config->>'persoonlijk' = 'doel' and t.aantal_override is not null;

create or replace view public.doel_voortgang with (security_invoker = true) as
with opgaven as (
  select r.opdracht_id, r.leerling_id,
         (i <= r.score) as goed,
         row_number() over (partition by r.opdracht_id, r.leerling_id
                            order by r.aangemaakt_op, r.id, i) as nr,
         row_number() over (partition by r.opdracht_id, r.leerling_id
                            order by r.aangemaakt_op desc, r.id desc, i desc) as terug
    from public.resultaten r
    join public.opdrachten o on o.id = r.opdracht_id
    join public.toewijzingen t on t.opdracht_id = r.opdracht_id and t.leerling_id = r.leerling_id
   cross join lateral generate_series(1, greatest(ceil(r.max_score)::int, 0)) as i
   where o.config->>'persoonlijk' = 'doel'
     and r.aangemaakt_op >= coalesce(t.herkansing_vanaf, '-infinity'::timestamptz)
),
venster as (
  select *, sum(goed::int) over (partition by opdracht_id, leerling_id order by nr
                                 rows between 19 preceding and current row) as goed_20
    from opgaven
)
select opdracht_id, leerling_id,
       count(*)::int                                   as gemaakt,
       count(*) filter (where terug <= 20 and goed)::int as laatste_goed,
       count(*) filter (where terug <= 20)::int          as laatste_aantal,
       coalesce(bool_or(nr >= 20 and goed_20 >= 16), false) as gehaald
  from venster
 group by opdracht_id, leerling_id;

grant select on public.doel_voortgang to authenticated;
