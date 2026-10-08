-- ───────────────────────────────────────────────────────────────────────────
-- Gemaakt werk wissen (per leerling of per klas), maar behaald blijft behaald
-- ───────────────────────────────────────────────────────────────────────────
--
-- De leerkracht kan het gemaakte werk van een leerling (of de hele klas)
-- wissen: de resultaten-rijen verdwijnen. Weektaken, taken, doelen en wie
-- wat moet maken blijven gewoon staan.
--
-- Wat op dat moment al af of behaald was, blijft dat: dat wordt vóór het
-- wissen vastgelegd in toewijzingen.afgerond_op. De views lezen die mee.

alter table public.toewijzingen add column if not exists afgerond_op timestamptz;

-- weektaak_voortgang: kolom `afgerond` erbij (achteraan, zodat create or
-- replace mag).
create or replace view public.weektaak_voortgang as
 SELECT t.opdracht_id,
    t.leerling_id,
    o.weektaak_id,
    o.school_id,
    o.tool_id,
    COALESCE(t.aantal_override, o.aantal) AS doel_aantal,
    count(r.id) AS pogingen,
    COALESCE(sum(r.score), 0::numeric) AS som_score,
    COALESCE(sum(r.max_score), 0::numeric) AS som_max,
    max(r.aangemaakt_op) AS laatst_op,
    COALESCE(sum(r.ms), 0::bigint) AS som_ms,
    t.herkansingen,
    (t.afgerond_op is not null) AS afgerond
   FROM toewijzingen t
     JOIN opdrachten o ON o.id = t.opdracht_id
     LEFT JOIN resultaten r
            ON r.opdracht_id = t.opdracht_id
           AND r.leerling_id = t.leerling_id
           AND r.aangemaakt_op >= COALESCE(t.herkansing_vanaf, '-infinity'::timestamptz)
  GROUP BY t.opdracht_id, t.leerling_id, o.weektaak_id, o.school_id, o.tool_id,
           t.aantal_override, o.aantal, t.herkansingen, t.afgerond_op;

alter view public.weektaak_voortgang set (security_invoker = true);

-- doel_voortgang: nu vanuit de toewijzingen, zodat een doel zonder (of met
-- gewiste) opgaven ook een rij heeft, met gehaald = ooit gehaald óf vastgelegd.
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
),
stand as (
  select opdracht_id, leerling_id,
         count(*)::int                                     as gemaakt,
         count(*) filter (where terug <= 20 and goed)::int as laatste_goed,
         count(*) filter (where terug <= 20)::int          as laatste_aantal,
         bool_or(nr >= 20 and goed_20 >= 16)               as gehaald
    from venster
   group by opdracht_id, leerling_id
)
select t.opdracht_id, t.leerling_id,
       coalesce(s.gemaakt, 0)        as gemaakt,
       coalesce(s.laatste_goed, 0)   as laatste_goed,
       coalesce(s.laatste_aantal, 0) as laatste_aantal,
       (coalesce(s.gehaald, false) or t.afgerond_op is not null) as gehaald
  from public.toewijzingen t
  join public.opdrachten o on o.id = t.opdracht_id
  left join stand s on s.opdracht_id = t.opdracht_id and s.leerling_id = t.leerling_id
 where o.config->>'persoonlijk' = 'doel';

grant select on public.doel_voortgang to authenticated;

-- Wissen. SECURITY DEFINER omdat niemand resultaten mag verwijderen (zie
-- 0001); de functie controleert zelf dat de aanroeper personeel is en bij
-- elke leerling mag (zelfde regels als het lezen van resultaten).
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

  delete from resultaten where leerling_id = any(p_leerlingen);
  get diagnostics aantal = row_count;
  return aantal;
end $$;

revoke execute on function public.wis_resultaten(uuid[]) from public, anon;
grant execute on function public.wis_resultaten(uuid[]) to authenticated;
