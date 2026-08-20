-- Hoe lang een leerling over een oefening deed. Tot nu toe lag alleen het
-- tijdstip van elke antwoordregel vast (aangemaakt_op); daaruit is de duur
-- niet af te leiden voor tools die maar één regel per sessie schrijven
-- (dictee, Engels, tafels). Vandaar een eigen kolom, gevuld door
-- public/kenniskist-login.js op het moment van opslaan.
--
-- `ms` hoort bij déze regel, niet bij de hele sessie: bij tools die per opgave
-- opslaan is het de tijd sinds de vorige opgave, bij tools die één keer
-- opslaan de tijd sinds het openen. Optellen geeft dus de totale tijd.
-- Gekapt op 30 minuten per regel, zodat een kind dat het tabblad open laat
-- staan het gemiddelde niet onbruikbaar maakt.
alter table public.resultaten
  add column if not exists ms integer;

alter table public.resultaten
  drop constraint if exists resultaten_ms_check;
alter table public.resultaten
  add constraint resultaten_ms_check check (ms is null or (ms >= 0 and ms <= 1800000));

-- som_ms achteraan toegevoegd: create or replace view staat alleen nieuwe
-- kolommen aan het eind toe, en bestaande lezers (haalMijnWeektaak,
-- WeektaakVoortgang) noemen hun kolommen expliciet.
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
    COALESCE(sum(r.ms), 0::bigint) AS som_ms
   FROM toewijzingen t
     JOIN opdrachten o ON o.id = t.opdracht_id
     LEFT JOIN resultaten r ON r.opdracht_id = t.opdracht_id AND r.leerling_id = t.leerling_id
  GROUP BY t.opdracht_id, t.leerling_id, o.weektaak_id, o.school_id, o.tool_id, t.aantal_override, o.aantal;
