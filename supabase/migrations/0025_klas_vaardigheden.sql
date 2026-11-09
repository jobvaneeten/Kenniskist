-- ───────────────────────────────────────────────────────────────────────────
-- Groepsoverzicht: per leerling per vaardigheid hoeveel er goed ging
-- ───────────────────────────────────────────────────────────────────────────
--
-- Voor het tabblad Groepsoverzicht in het portaal (GroepsOverzicht.jsx): welke
-- leerlingen hebben verlengde instructie nodig bij welk doel. Een vaardigheid
-- is een oefening (tool_id) plus de categorie van de opgave (details_json →
-- opgaven[].cat, bv. "komma", "tafel-7" of het rekendoel). Oefeningen zonder
-- categorie tellen als één vaardigheid.
--
-- Al het oefenwerk telt mee, ook vrij oefenen: het gaat om wat het kind kan.
-- security definer met één controle vooraf (personeel én deze klas mag je
-- zien, net als zet_spel_na in 0019): via RLS per rij duurde het bijna een minuut.

create or replace function public.klas_vaardigheden(p_klas uuid, p_vanaf timestamptz)
  returns table (leerling_id uuid, tool_id text, cat text, cat_label text, goed numeric, totaal numeric)
  language plpgsql stable security definer set search_path = public, pg_temp
as $$
begin
  if not coalesce(hulp.is_personeel(), false) or not coalesce(hulp.mag_klas(p_klas), false) then
    raise exception 'geen rechten voor deze klas';
  end if;
  return query
  with r as (
    select r.leerling_id, r.tool_id, r.score, r.max_score,
           case when jsonb_typeof(r.details_json->'opgaven') = 'array' then r.details_json->'opgaven' else '[]'::jsonb end as opgaven
      from resultaten r
      join profielen p on p.id = r.leerling_id and p.klas_id = p_klas and p.school_id = hulp.mijn_school()
     where r.aangemaakt_op >= p_vanaf
  ),
  los as (
    -- per opgave, als de opgaven een goed/fout hebben
    select r.leerling_id, r.tool_id, nullif(o->>'cat', '') as cat, o->>'catLabel' as cat_label,
           case when (o->>'goed')::boolean then 1 else 0 end::numeric as goed, 1::numeric as totaal
      from r cross join lateral jsonb_array_elements(r.opgaven) o
     where o ? 'goed' and jsonb_typeof(o->'goed') = 'boolean'
    union all
    -- anders de hele rij (bv. een dictee: 9 van de 12 woorden)
    select r.leerling_id, r.tool_id, null, null, r.score, r.max_score
      from r
     where r.max_score > 0
       and not exists (select 1 from jsonb_array_elements(r.opgaven) o
                        where o ? 'goed' and jsonb_typeof(o->'goed') = 'boolean')
  )
  select los.leerling_id, los.tool_id, los.cat, max(los.cat_label), sum(los.goed), sum(los.totaal)
    from los
   group by los.leerling_id, los.tool_id, los.cat;
end $$;

revoke execute on function public.klas_vaardigheden(uuid, timestamptz) from public, anon;
grant execute on function public.klas_vaardigheden(uuid, timestamptz) to authenticated;
