-- ───────────────────────────────────────────────────────────────────────────
-- Doelen herhalen: weet je het na 2 en 6 weken nog?
-- ───────────────────────────────────────────────────────────────────────────
--
-- Een behaald doel komt twee keer terug als korte herhaling van 5 opgaven:
--   ronde 1: 14 dagen nadat het doel behaald is
--   ronde 2: 28 dagen na een geslaagde ronde 1 (dus rond week 6)
-- Minstens 80% goed: het doel blijft behaald (na ronde 2 zit het vast).
-- Minder: het doel gaat weer open (herkansing_vanaf = nu), de leerling oefent
-- opnieuw tot 80% van de laatste 20, en daarna begint het herhalen opnieuw.
--
-- De opgaven van een herhaling zijn gewone resultaten bij de doel-opdracht.
-- Een herhaling is een rij hieronder met het startmoment; de stand rekent
-- vanaf dat moment de eerste 5 opgaven. Starten en afronden gaat alleen via
-- de twee functies onderaan, zodat een leerling zelf niets kan wegschrijven.

create table public.doel_herhalingen (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null default hulp.mijn_school() references public.scholen(id) on delete cascade,
  opdracht_id  uuid not null references public.opdrachten(id) on delete cascade,
  leerling_id  uuid not null references public.profielen(id) on delete cascade,
  ronde        smallint not null check (ronde in (1, 2)),
  gestart_op   timestamptz not null default now(),
  afgerond_op  timestamptz,
  goed         numeric,
  aantal       numeric,
  geslaagd     boolean
);

create index doel_herhalingen_idx on public.doel_herhalingen (opdracht_id, leerling_id, gestart_op desc);

alter table public.doel_herhalingen enable row level security;

create policy doel_herhalingen_eigen_lezen on public.doel_herhalingen for select to authenticated
  using (leerling_id = (select auth.uid()));
create policy doel_herhalingen_personeel_lezen on public.doel_herhalingen for select to authenticated
  using ((select hulp.is_personeel()) and school_id = (select hulp.mijn_school())
         and hulp.mag_leerling(leerling_id));

revoke all on public.doel_herhalingen from anon;
grant select on public.doel_herhalingen to authenticated;

-- Per doel-toewijzing: wanneer de volgende herhaling is, of hij vastzit, en
-- wanneer een herhaling voor het laatst mislukte (dan staat het doel weer open).
create or replace view public.doel_herhaling with (security_invoker = true) as
select v.opdracht_id, v.leerling_id, v.gehaald, v.gehaald_op,
       coalesce(h.ok, 0)::int as rondes_ok,
       case when not v.gehaald or v.gehaald_op is null then null
            when coalesce(h.ok, 0) = 0 then v.gehaald_op + interval '14 days'
            when h.ok = 1 then h.laatste_ok + interval '28 days'
            else null end as volgende_op,
       (v.gehaald and coalesce(h.ok, 0) >= 2) as vast,
       m.mislukt_op
  from public.doel_voortgang v
  left join lateral (
    select count(*) filter (where x.geslaagd) as ok,
           max(x.afgerond_op) filter (where x.geslaagd) as laatste_ok
      from public.doel_herhalingen x
     where x.opdracht_id = v.opdracht_id and x.leerling_id = v.leerling_id
       and x.afgerond_op > v.gehaald_op
  ) h on true
  left join lateral (
    select max(x.afgerond_op) as mislukt_op
      from public.doel_herhalingen x
     where x.opdracht_id = v.opdracht_id and x.leerling_id = v.leerling_id
       and x.geslaagd = false
  ) m on true;

grant select on public.doel_herhaling to authenticated;

-- Start een herhaling (alleen als hij aan de beurt is). Een herhaling die in
-- de afgelopen 3 uur gestart en niet afgemaakt is, begint opnieuw te tellen.
create or replace function public.herhaling_start(p_opdracht uuid)
  returns uuid language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_stand record;
  v_id uuid;
begin
  if v_uid is null then raise exception 'niet ingelogd'; end if;
  if not exists (select 1 from toewijzingen t where t.opdracht_id = p_opdracht and t.leerling_id = v_uid
                   and t.status <> 'vrijgesteld') then
    raise exception 'geen doel van jou';
  end if;
  select * into v_stand from doel_herhaling where opdracht_id = p_opdracht and leerling_id = v_uid;
  if v_stand.volgende_op is null or v_stand.volgende_op > now() then
    raise exception 'nog geen herhaling';
  end if;

  select id into v_id from doel_herhalingen
   where opdracht_id = p_opdracht and leerling_id = v_uid and afgerond_op is null
     and gestart_op > now() - interval '3 hours'
   order by gestart_op desc limit 1;
  if v_id is not null then
    update doel_herhalingen set gestart_op = now() where id = v_id;
    return v_id;
  end if;

  insert into doel_herhalingen (school_id, opdracht_id, leerling_id, ronde)
  select p.school_id, p_opdracht, v_uid, v_stand.rondes_ok + 1
    from profielen p where p.id = v_uid
  returning id into v_id;
  return v_id;
end $$;

-- Stand van een lopende herhaling: de eerste 5 opgaven sinds de start. Bij 5
-- wordt hij afgerond; minder dan 80% goed zet het doel weer open.
create or replace function public.herhaling_stand(p_id uuid)
  returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  h doel_herhalingen%rowtype;
  v_goed numeric;
  v_aantal numeric;
  v_geslaagd boolean;
begin
  select * into h from doel_herhalingen where id = p_id and leerling_id = v_uid;
  if not found then raise exception 'geen herhaling van jou'; end if;
  if h.afgerond_op is not null then
    return jsonb_build_object('klaar', true, 'goed', h.goed, 'aantal', h.aantal, 'geslaagd', h.geslaagd, 'ronde', h.ronde);
  end if;

  -- rijen tot er 5 opgaven zijn (een dictee-rij telt voor meer opgaven)
  select coalesce(sum(score), 0), coalesce(sum(max_score), 0) into v_goed, v_aantal
    from (
      select r.score, r.max_score,
             coalesce(sum(r.max_score) over (order by r.aangemaakt_op, r.id
                                             rows between unbounded preceding and 1 preceding), 0) as voor
        from resultaten r
       where r.opdracht_id = h.opdracht_id and r.leerling_id = v_uid
         and r.aangemaakt_op >= h.gestart_op and r.max_score > 0
    ) x
   where x.voor < 5;

  if v_aantal < 5 then
    return jsonb_build_object('klaar', false, 'goed', v_goed, 'aantal', v_aantal, 'ronde', h.ronde);
  end if;

  v_geslaagd := v_goed >= 0.8 * v_aantal;
  update doel_herhalingen set afgerond_op = now(), goed = v_goed, aantal = v_aantal, geslaagd = v_geslaagd
   where id = p_id;
  if not v_geslaagd then
    -- weggezakt: het doel gaat weer open en telt opnieuw vanaf nu
    update toewijzingen set herkansing_vanaf = now(), afgerond_op = null
     where opdracht_id = h.opdracht_id and leerling_id = v_uid;
  end if;
  return jsonb_build_object('klaar', true, 'goed', v_goed, 'aantal', v_aantal, 'geslaagd', v_geslaagd, 'ronde', h.ronde);
end $$;

revoke execute on function public.herhaling_start(uuid) from public, anon;
revoke execute on function public.herhaling_stand(uuid) from public, anon;
grant execute on function public.herhaling_start(uuid) to authenticated;
grant execute on function public.herhaling_stand(uuid) to authenticated;
