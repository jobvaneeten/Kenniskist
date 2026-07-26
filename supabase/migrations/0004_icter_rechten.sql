-- icter = schoolgebonden beheerder, tussen leerkracht en admin in:
--   admin   → maakt scholen aan + de icter-account van een school
--   icter   → maakt leerkrachten en klassen aan (binnen de eigen school)
--   leerkracht → maakt leerlingen aan (binnen de eigen school/klas)
-- Alle account-aanmaak loopt via de Worker (service role) uit fase 3; de
-- rolcheck daar moet deze hiërarchie volgen. Hier alleen het RLS-effect.

-- is_personeel breidt uit met icter: icter erft alles wat een leerkracht mag
-- (resultaten lezen, profielen binnen de school lezen/klas_id bijwerken).
create or replace function hulp.is_personeel()
  returns boolean
  language sql stable security definer set search_path = public, pg_temp
as $$ select exists (
        select 1 from public.profielen
        where id = auth.uid() and rol in ('leerkracht', 'icter', 'admin')
      ) $$;

-- Nieuw: alleen icter/admin mogen klassen aanmaken/bewerken — een leerkracht
-- verplaatst leerlingen nog wel tussen bestaande klassen (via
-- profielen_personeel_bewerken, die op is_personeel() blijft staan), maar
-- maakt geen klassen meer aan.
create or replace function hulp.is_schoolbeheerder()
  returns boolean
  language sql stable security definer set search_path = public, pg_temp
as $$ select exists (
        select 1 from public.profielen
        where id = auth.uid() and rol in ('icter', 'admin')
      ) $$;

grant execute on function hulp.is_schoolbeheerder() to authenticated;

alter policy klassen_beheren on klassen
  using      ((select hulp.is_schoolbeheerder()) and school_id = (select hulp.mijn_school()))
  with check ((select hulp.is_schoolbeheerder()) and school_id = (select hulp.mijn_school()));
