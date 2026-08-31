-- ═══════════════════════════════════════════════════════════════════════════
-- Weektaak-opdracht opnieuw laten maken
-- ═══════════════════════════════════════════════════════════════════════════
--
-- `resultaten` blijft onveranderlijk (zie 0007): een herkansing gooit dus
-- niets weg, maar zet een streep in het zand. Alles van vóór die streep telt
-- niet meer mee voor het doel, waardoor de teller van de leerling op 0 staat
-- en hij de opdracht opnieuw moet maken. De oude antwoorden blijven wél
-- gewoon in de foutenlijst en de resultatengeschiedenis staan.
--
-- Twee manieren waarop de streep gezet wordt:
--   1. De leerkracht drukt op "opnieuw laten maken" (update vanuit het portaal).
--   2. Automatisch: wie de opdracht afmaakt met minder dan 50% goed, krijgt
--      hem meteen opnieuw (trigger onderaan).

alter table public.toewijzingen
  add column if not exists herkansing_vanaf timestamptz,
  add column if not exists herkansingen     integer not null default 0;

comment on column public.toewijzingen.herkansing_vanaf is
  'Resultaten van vóór dit moment tellen niet meer mee voor het doel. NULL = eerste poging.';
comment on column public.toewijzingen.herkansingen is
  'Hoe vaak de opdracht opnieuw is gezet. Pogingnummer = herkansingen + 1.';


-- ───────────────────────────────────────────────────────────────────────────
-- View: tel alleen de huidige poging
-- ───────────────────────────────────────────────────────────────────────────
--
-- security_invoker stond er in 0007 op maar is in 0009 per ongeluk gesneuveld:
-- `create or replace view` zonder WITH-clausule zet de opties terug op de
-- standaard. Zonder invoker-semantiek draait de view met de rechten van de
-- eigenaar en ziet iedere ingelogde leerling de voortgang van de hele school.
-- Vandaar de expliciete ALTER VIEW eronder — die overleeft een replace niet,
-- dus hij hoort bij elke toekomstige wijziging van deze view opnieuw mee.
--
-- herkansingen staat achteraan: create or replace view staat alleen nieuwe
-- kolommen aan het eind toe.
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
    t.herkansingen
   FROM toewijzingen t
     JOIN opdrachten o ON o.id = t.opdracht_id
     LEFT JOIN resultaten r
            ON r.opdracht_id = t.opdracht_id
           AND r.leerling_id = t.leerling_id
           AND r.aangemaakt_op >= COALESCE(t.herkansing_vanaf, '-infinity'::timestamptz)
  GROUP BY t.opdracht_id, t.leerling_id, o.weektaak_id, o.school_id, o.tool_id,
           t.aantal_override, o.aantal, t.herkansingen;

alter view public.weektaak_voortgang set (security_invoker = true);


-- ───────────────────────────────────────────────────────────────────────────
-- Automatisch opnieuw bij minder dan 50% goed
-- ───────────────────────────────────────────────────────────────────────────
--
-- Draait na elke resultaatregel, maar doet alleen iets op het moment dat de
-- opdracht net af is. SECURITY DEFINER omdat de leerling zelf niet in
-- toewijzingen mag schrijven (alleen personeel, zie 0001) — de functie kijkt
-- daarom uitsluitend naar de rij die bij dít resultaat hoort.
--
-- Opdrachten zonder doel (aantal is null, vrij oefenen) worden overgeslagen:
-- daar is "af" niet gedefinieerd.
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

  -- gemaakt > 0 volgt uit gemaakt >= doel (doel is altijd > 0), dus geen
  -- deling door nul.
  --
  -- De streep moet strikt ná de regel liggen die hem veroorzaakt: now() is de
  -- transactietijd en dus exact gelijk aan new.aangemaakt_op, waardoor die
  -- laatste opgave (en met haar de hele mislukte poging, als ze in één
  -- transactie zaten) na de reset gewoon weer zou meetellen.
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

-- Alleen de trigger mag deze functie draaien. Zonder deze revoke staat een
-- SECURITY DEFINER-functie als /rest/v1/rpc/... open voor iedereen; buiten
-- triggercontext klapt hij weliswaar om op `new`, maar een definer-functie
-- hoort niet in de publieke API te hangen. CREATE TRIGGER controleert het
-- EXECUTE-recht bij het aanmaken, niet bij elke insert — de trigger blijft dus
-- gewoon werken.
revoke execute on function public.markeer_herkansing_bij_onvoldoende() from public, anon, authenticated;

drop trigger if exists resultaten_herkansing on public.resultaten;
create trigger resultaten_herkansing
  after insert on public.resultaten
  for each row execute function public.markeer_herkansing_bij_onvoldoende();
