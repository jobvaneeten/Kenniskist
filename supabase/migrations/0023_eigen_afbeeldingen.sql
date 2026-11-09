-- ───────────────────────────────────────────────────────────────────────────
-- Afbeeldingen bij eigen oefeningen
-- ───────────────────────────────────────────────────────────────────────────
--
-- Een vraag in eigen_oefeningen.vragen kan een afbeelding hebben:
-- { vraag, antwoord, fout, afbeelding: '<school_id>/<uuid>.jpg' }.
-- De bestanden staan in een privé-bucket, per school een map. Het portaal
-- verkleint een plaatje eerst (max. 1000 px, jpg), dus ze zijn klein.
-- Lezen mag iedereen van dezelfde school (leerlingen en personeel), via een
-- tijdelijke link (createSignedUrls). Uploaden en weghalen alleen personeel,
-- en alleen in de map van de eigen school.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('eigen-afbeeldingen', 'eigen-afbeeldingen', false, 2097152, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy eigen_afbeeldingen_lezen on storage.objects for select to authenticated
  using (bucket_id = 'eigen-afbeeldingen' and (storage.foldername(name))[1] = (select hulp.mijn_school())::text);

create policy eigen_afbeeldingen_uploaden on storage.objects for insert to authenticated
  with check (bucket_id = 'eigen-afbeeldingen' and (select hulp.is_personeel())
              and (storage.foldername(name))[1] = (select hulp.mijn_school())::text);

create policy eigen_afbeeldingen_weghalen on storage.objects for delete to authenticated
  using (bucket_id = 'eigen-afbeeldingen' and (select hulp.is_personeel())
         and (storage.foldername(name))[1] = (select hulp.mijn_school())::text);
