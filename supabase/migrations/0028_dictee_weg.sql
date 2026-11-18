-- Controledictee: bijhouden hoe vaak een leerling het dictee verliet (ander
-- tabblad of andere app), zodat de leerkracht ziet wie mogelijk iets opzocht.
-- bewaar_dictee krijgt er een parameter bij (met standaardwaarde, dus een
-- tabblad met de oude site blijft werken).

alter table public.dictee_antwoorden add column if not exists weg integer not null default 0;

drop function if exists public.bewaar_dictee(uuid, jsonb, boolean);

create function public.bewaar_dictee(p_dictee uuid, p_antwoorden jsonb, p_inleveren boolean, p_weg integer default 0)
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
  insert into dictee_antwoorden as a (dictee_id, leerling_id, school_id, antwoorden, ingeleverd_op, weg)
  values (p_dictee, auth.uid(), d.school_id, p_antwoorden, case when p_inleveren then now() end,
          least(greatest(coalesce(p_weg, 0), 0), 999))
  on conflict (dictee_id, leerling_id) do update
     set antwoorden = excluded.antwoorden,
         ingeleverd_op = excluded.ingeleverd_op,
         weg = greatest(a.weg, excluded.weg),
         bijgewerkt_op = now()
   where a.ingeleverd_op is null;
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

revoke execute on function public.bewaar_dictee(uuid, jsonb, boolean, integer) from public, anon;
grant execute on function public.bewaar_dictee(uuid, jsonb, boolean, integer) to authenticated;
