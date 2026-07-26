-- Nieuwe rol tussen leerkracht en admin: "icter", de schoolgebonden beheerder.
-- Los toegevoegd (eigen migratie) omdat een net toegevoegde enum-waarde in
-- sommige Postgres-versies pas in een volgende transactie bruikbaar is.
alter type rol_type add value 'icter';
