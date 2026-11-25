-- Eigen oefeningen verbergen voor leerlingen
--
-- De leerkracht kan een eigen oefening klaarzetten zonder dat de leerlingen
-- hem al zien (of een oude wegzetten zonder hem te verwijderen). Personeel
-- ziet alles; in de Vloerquiz blijven verborgen oefeningen te gebruiken.

alter table public.eigen_oefeningen add column zichtbaar boolean not null default true;

alter policy eigen_oefeningen_lezen on public.eigen_oefeningen
  using (school_id = (select hulp.mijn_school()) and hulp.mag_klas(klas_id)
         and (zichtbaar or (select hulp.is_personeel())));
