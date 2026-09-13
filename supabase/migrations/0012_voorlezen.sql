-- ═══════════════════════════════════════════════════════════════════════════
-- Voorleesrecht per leerling
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Sommige kinderen (dyslexie, NT2, lage technische leesvaardigheid) mogen bij
-- begrijpend lezen de tekst voorgelezen krijgen. Dat is een besluit van de
-- leerkracht, niet iets wat het kind zelf aanzet — vandaar een kolom op het
-- profiel en niet een localStorage-instelling.
--
-- Het voorlezen zelf gebeurt in de browser (speechSynthesis, zie
-- public/begrijpend-lezen/*.html); deze kolom zegt alleen of de knop er staat.

alter table public.profielen
  add column voorlezen boolean not null default false;

comment on column public.profielen.voorlezen is
  'Leerling mag teksten laten voorlezen (aangezet door de leerkracht).';

-- Laag 2 naast RLS: de leerling zelf heeft geen update-policy op profielen
-- (zie 0001_init.sql), dus alleen personeel van de eigen school komt hierlangs.
grant update (voorlezen) on public.profielen to authenticated;
