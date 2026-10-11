-- ═══════════════════════════════════════════════════════════════════════════
-- Spelletje na … goede antwoorden, per klas
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Elke oefening geeft na een vast aantal goede antwoorden een spelletje
-- (meestal 5 of 10, zie SpelBeloning). De leerkracht kan dat voor zijn eigen
-- klas anders zetten: vaker, minder vaak of helemaal niet.
--   null = zoals de oefening het zelf doet (standaard)
--   0    = geen spelletjes
--   1-50 = na zoveel goede antwoorden

alter table public.klassen
  add column spel_na smallint check (spel_na is null or spel_na between 0 and 50);

comment on column public.klassen.spel_na is
  'Spelletje na zoveel goede antwoorden (null = standaard per oefening, 0 = geen spelletjes).';

-- Klassen beheren mag alleen de icter (klassen_beheren), maar deze ene
-- instelling hoort bij de leerkracht van de klas. Daarom een functie die
-- precies dat ene veld zet, met dezelfde regels als het zien van de klas.
create or replace function public.zet_spel_na(p_klas uuid, p_aantal smallint)
  returns void language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  -- coalesce: hulp.mag_klas geeft NULL (niet false) voor een klas die niet van
  -- jou is, en "if not NULL" zou dan gewoon doorlopen.
  if not coalesce(hulp.is_personeel(), false) then
    raise exception 'geen rechten';
  end if;
  if not coalesce(hulp.mag_klas(p_klas), false) then
    raise exception 'geen rechten voor deze klas';
  end if;
  if p_aantal is not null and (p_aantal < 0 or p_aantal > 50) then
    raise exception 'ongeldig aantal';
  end if;
  update klassen set spel_na = p_aantal
   where id = p_klas and school_id = hulp.mijn_school();
end $$;

revoke execute on function public.zet_spel_na(uuid, smallint) from public, anon;
grant execute on function public.zet_spel_na(uuid, smallint) to authenticated;
