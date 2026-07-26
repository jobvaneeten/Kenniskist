-- Login verschuift van school-niveau naar klas-niveau:
-- <klascode>.<gebruikersnaam>@leerling.kenniskist.nl i.p.v.
-- <schoolcode>.<gebruikersnaam>@... — bv. "linde7" of "vliertuin7b".
-- Reden: één schoolcode voor de hele school was te grofmazig zodra een
-- school meerdere klassen kreeg. Bijkomend effect: gebruikersnaam hoeft nu
-- alleen nog uniek te zijn binnen de klas, niet meer binnen de hele school.

alter table klassen add column code text;
update klassen set code = 'linde7' where naam = 'Groep 7'; -- backfill bestaande testdata
alter table klassen alter column code set not null;
alter table klassen add constraint klassen_code_format check (code ~ '^[a-z0-9]{2,20}$');
alter table klassen add constraint klassen_code_key unique (code);

-- Leerlingen moeten voortaan een klas hebben (nodig voor de inlog-email).
alter table profielen add constraint profielen_leerling_heeft_klas
  check (rol <> 'leerling' or klas_id is not null);

alter table profielen drop constraint profielen_school_id_gebruikersnaam_key;
alter table profielen add constraint profielen_klas_id_gebruikersnaam_key unique (klas_id, gebruikersnaam);
