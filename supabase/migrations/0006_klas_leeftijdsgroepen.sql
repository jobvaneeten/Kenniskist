-- ICT'er kan per klas aangeven welke leeftijdsgroepen (4 t/m 8) eraan
-- gekoppeld zijn, bv. een combinatiegroep 6/7/8 met naam "Groep 7".
-- Leeg (default) betekent: geen beperking — bestaande klassen blijven dus
-- ongewijzigd werken zonder backfill.
alter table klassen add column groepen integer[] not null default '{}';
alter table klassen add constraint klassen_groepen_geldig check (groepen <@ array[4,5,6,7,8]);
