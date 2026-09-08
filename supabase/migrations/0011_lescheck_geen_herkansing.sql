-- ═══════════════════════════════════════════════════════════════════════════
-- Een lescheck meet, hij oefent niet
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Een lescheck is één som aan het eind van een les (opdracht met `lescheck` in
-- config, zie src/lib/lescheck.js). De trigger uit 0010 zet een opdracht
-- automatisch opnieuw bij minder dan 50% goed — bij één som betekent één fout
-- dus meteen 0% en "opnieuw maken". Precies verkeerd: de leerkracht wil weten
-- wie het snapte, niet dat het kind blijft proberen tot het goed is. Bovendien
-- zou het live-bord dan weer op "nog niet gemaakt" springen.
--
-- Verder identiek aan 0010; alleen de vroege uitstap hieronder is nieuw.

create or replace function public.markeer_herkansing_bij_onvoldoende()
  returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  doel    integer;
  gemaakt numeric;
  goed    numeric;
begin
  if new.opdracht_id is null then
    return new;
  end if;

  if exists (
    select 1 from opdrachten o
     where o.id = new.opdracht_id
       and o.config ? 'lescheck'
  ) then
    return new;
  end if;

  select coalesce(t.aantal_override, o.aantal)
    into doel
    from toewijzingen t
    join opdrachten o on o.id = t.opdracht_id
   where t.opdracht_id = new.opdracht_id
     and t.leerling_id = new.leerling_id;

  if doel is null then
    return new;
  end if;

  select coalesce(sum(r.max_score), 0), coalesce(sum(r.score), 0)
    into gemaakt, goed
    from resultaten r
    join toewijzingen t
      on t.opdracht_id = r.opdracht_id
     and t.leerling_id = r.leerling_id
   where r.opdracht_id = new.opdracht_id
     and r.leerling_id = new.leerling_id
     and r.aangemaakt_op >= coalesce(t.herkansing_vanaf, '-infinity'::timestamptz);

  if gemaakt >= doel and (goed / gemaakt) < 0.5 then
    update toewijzingen
       set herkansing_vanaf = greatest(clock_timestamp(),
                                       new.aangemaakt_op + interval '1 microsecond'),
           herkansingen     = herkansingen + 1
     where opdracht_id = new.opdracht_id
       and leerling_id = new.leerling_id;
  end if;

  return new;
end;
$$;

-- Zie 0010: een SECURITY DEFINER-functie hoort niet als /rest/v1/rpc/... open
-- te staan. create or replace zet de rechten terug op de standaard, dus de
-- revoke hoort bij elke wijziging van deze functie opnieuw mee.
revoke execute on function public.markeer_herkansing_bij_onvoldoende() from public, anon, authenticated;
