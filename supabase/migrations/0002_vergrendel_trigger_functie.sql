-- blokkeer_privilege_wijziging is alleen bedoeld als trigger op profielen,
-- niet als los aanroepbare RPC. Standaard krijgt PUBLIC execute-rechten op
-- nieuwe functions in het public-schema, waardoor Supabase hem als
-- /rest/v1/rpc/blokkeer_privilege_wijziging blootlegde (advisor-waarschuwing).
-- Een trigger vuurt via de rechten van de tabel-eigenaar, niet via een
-- EXECUTE-grant van de aanroeper, dus dit intrekken breekt de trigger niet.
revoke execute on function public.blokkeer_privilege_wijziging() from public, anon, authenticated;
