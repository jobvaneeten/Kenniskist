-- Controledictee (0026): rechten strak zetten. Supabase geeft nieuwe tabellen
-- standaard alle rechten aan anon en authenticated; de grants in 0026 waren
-- daardoor geen beperking. Nu: sjablonen alleen lezen, antwoorden alleen
-- lezen/wissen en de correcties aanpassen (wat het kind schreef blijft zoals
-- het is). bewaar_dictee meldt false als er niets is opgeslagen (al ingeleverd).

revoke all on public.dictee_sjablonen, public.controledictees, public.dictee_antwoorden from anon, authenticated;
grant select on public.dictee_sjablonen to authenticated;
grant select, insert, update, delete on public.controledictees to authenticated;
grant select, delete on public.dictee_antwoorden to authenticated;
grant update (correcties) on public.dictee_antwoorden to authenticated;

create or replace function public.bewaar_dictee(p_dictee uuid, p_antwoorden jsonb, p_inleveren boolean)
  returns boolean
  language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  d controledictees;
  n integer;
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
  get diagnostics n = row_count;
  return n > 0;
end $$;
