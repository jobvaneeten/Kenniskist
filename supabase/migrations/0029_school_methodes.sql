-- Welke lesmethodes een school gebruikt (zie src/lib/methodes.js).
-- Zonder methode toont Kenniskist de neutrale versie: rekenen alleen doelen,
-- spelling de regels in plaats van de dieren van Taal actief.
-- Lezen mag iedereen van de eigen school (policy scholen_lezen), wijzigen
-- alleen de beheerder (policy scholen_admin).
alter table scholen add column if not exists methodes text[] not null default '{}';

update scholen set methodes = array['pluspunt', 'taal-actief'] where code = 'linde';
