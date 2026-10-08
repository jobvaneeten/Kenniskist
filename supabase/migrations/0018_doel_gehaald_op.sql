-- ───────────────────────────────────────────────────────────────────────────
-- Doelen: wanneer behaald (voor "Mijn week" aan de leerlingkant)
-- ───────────────────────────────────────────────────────────────────────────
--
-- gehaald_op = het moment van de opgave waarmee de laatste 20 voor het eerst
-- op 80% kwamen. Was het werk gewist (0017), dan het moment van wissen.
-- Kolom achteraan, zodat create or replace mag.

create or replace view public.doel_voortgang with (security_invoker = true) as
with opgaven as (
  select r.opdracht_id, r.leerling_id, r.aangemaakt_op,
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
),
stand as (
  select opdracht_id, leerling_id,
         count(*)::int                                     as gemaakt,
         count(*) filter (where terug <= 20 and goed)::int as laatste_goed,
         count(*) filter (where terug <= 20)::int          as laatste_aantal,
         bool_or(nr >= 20 and goed_20 >= 16)               as gehaald,
         min(aangemaakt_op) filter (where nr >= 20 and goed_20 >= 16) as gehaald_op
    from venster
   group by opdracht_id, leerling_id
)
select t.opdracht_id, t.leerling_id,
       coalesce(s.gemaakt, 0)        as gemaakt,
       coalesce(s.laatste_goed, 0)   as laatste_goed,
       coalesce(s.laatste_aantal, 0) as laatste_aantal,
       (coalesce(s.gehaald, false) or t.afgerond_op is not null) as gehaald,
       coalesce(s.gehaald_op, t.afgerond_op) as gehaald_op
  from public.toewijzingen t
  join public.opdrachten o on o.id = t.opdracht_id
  left join stand s on s.opdracht_id = t.opdracht_id and s.leerling_id = t.leerling_id
 where o.config->>'persoonlijk' = 'doel';
