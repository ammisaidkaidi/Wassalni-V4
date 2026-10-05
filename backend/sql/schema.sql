


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "app";


ALTER SCHEMA "app" OWNER TO "postgres";




ALTER SCHEMA "public" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."payment_method" AS ENUM (
    'cash',
    'cib',
    'edahabia',
    'bank_transfer',
    'card',
    'wallet'
);


ALTER TYPE "public"."payment_method" OWNER TO "postgres";


CREATE TYPE "public"."payment_status" AS ENUM (
    'pending',
    'paid',
    'failed',
    'refunded',
    'partially_refunded',
    'expired'
);


ALTER TYPE "public"."payment_status" OWNER TO "postgres";


CREATE TYPE "public"."reservation_status" AS ENUM (
    'pending',
    'confirmed',
    'completed',
    'cancelled',
    'no_show'
);


ALTER TYPE "public"."reservation_status" OWNER TO "postgres";


CREATE TYPE "public"."trip_status" AS ENUM (
    'scheduled',
    'in_progress',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."trip_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_favorite_driver"("p_customer" "uuid", "p_driver" "uuid", "p_notify" boolean DEFAULT true) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
declare v_id uuid;
begin
  insert into favorite_driver (customer_id, driver_id, notify)
  values (p_customer, p_driver, p_notify)
  on conflict (customer_id, driver_id) do update set notify = excluded.notify
  returning id into v_id;
  return v_id;
end;
$$;


ALTER FUNCTION "public"."add_favorite_driver"("p_customer" "uuid", "p_driver" "uuid", "p_notify" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_favorite_route"("p_customer" "uuid", "p_origin" "uuid", "p_destination" "uuid", "p_notify" boolean DEFAULT true) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
declare v_id uuid;
begin
  insert into favorite_route (customer_id, origin_wpoint_id, destination_wpoint_id, notify)
  values (p_customer, p_origin, p_destination, p_notify)
  on conflict (customer_id, origin_wpoint_id, destination_wpoint_id) do update set notify = excluded.notify
  returning id into v_id;
  return v_id;
end;
$$;


ALTER FUNCTION "public"."add_favorite_route"("p_customer" "uuid", "p_origin" "uuid", "p_destination" "uuid", "p_notify" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_recurring_exception"("p_template" "uuid", "p_date" "date", "p_notes" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare v_trip_id uuid;
begin
  if not exists (select 1 from recurring_trip_template where id = p_template) then
    raise exception 'Unknown recurring trip template id' using errcode = 'DZ811';
  end if;

  insert into recurring_trip_exception (template_id, exception_date, notes)
  values (p_template, p_date, p_notes)
  on conflict (template_id, exception_date) do update set notes = excluded.notes;

  select id into v_trip_id from trip
  where recurring_template_id = p_template and recurring_date = p_date and status = 'scheduled';
  if v_trip_id is not null then
    call sp_cancel_trip(v_trip_id);
  end if;
end;
$$;


ALTER FUNCTION "public"."add_recurring_exception"("p_template" "uuid", "p_date" "date", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_trip_stop"("p_trip" "uuid", "p_wpoint" "uuid", "p_eta" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_trip_traj uuid;
  v_status    trip_status;
  v_wp_traj   uuid;
begin
  select trajectory_id, status into v_trip_traj, v_status from trip where id = p_trip;
  if v_trip_traj is null then
    raise exception 'Trip % not found', p_trip using errcode = 'DZ301';
  end if;
  if v_status <> 'scheduled' then
    raise exception 'Trip % not scheduled; stops frozen', p_trip using errcode = 'DZ302';
  end if;

  select trajectory_id into v_wp_traj from wpoint where id = p_wpoint;
  if v_wp_traj is null then
    raise exception 'WPoint % not found', p_wpoint using errcode = 'DZ205';
  end if;
  if v_wp_traj <> v_trip_traj then
    raise exception 'Invalid stop %', p_wpoint using errcode = 'DZ601';
  end if;

  insert into trip_stop (trip_id, trajectory_id, wpoint_id, eta)
  values (p_trip, v_trip_traj, p_wpoint, p_eta)
  on conflict (trip_id, wpoint_id) do update
    set eta = coalesce(excluded.eta, trip_stop.eta);
end;
$$;


ALTER FUNCTION "public"."add_trip_stop"("p_trip" "uuid", "p_wpoint" "uuid", "p_eta" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_wpoint"("p_trajectory" "uuid", "p_wilaya" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_wilaya_id smallint := resolve_wilaya(p_wilaya);
  v_wpoint    uuid;
  v_next_pos  integer;
begin
  if v_wilaya_id is null then
    raise exception 'Invalid Wilaya: %', p_wilaya using errcode = 'DZ201';
  end if;

  perform 1 from trajectory where id = p_trajectory for update;
  if not found then
    raise exception 'Trajectory % not found', p_trajectory using errcode = 'DZ102';
  end if;

  select id into v_wpoint
  from wpoint
  where trajectory_id = p_trajectory and wilaya_id = v_wilaya_id;

  if v_wpoint is not null then
    return v_wpoint; -- merge
  end if;

  select coalesce(max(position), 0) + 1 into v_next_pos
  from wpoint where trajectory_id = p_trajectory;

  insert into wpoint (trajectory_id, wilaya_id, position)
  values (p_trajectory, v_wilaya_id, v_next_pos)
  returning id into v_wpoint;

  return v_wpoint;
end;
$$;


ALTER FUNCTION "public"."add_wpoint"("p_trajectory" "uuid", "p_wilaya" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_analytics_summary"("p_from" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_to" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_from timestamptz := coalesce(p_from, '-infinity'::timestamptz);
  v_to   timestamptz := coalesce(p_to, 'infinity'::timestamptz);
  v_revenue numeric; v_refunds numeric; v_bookings integer; v_cancellations integer; v_no_shows integer;
  v_occupancy numeric;
begin
  select coalesce(sum(amount), 0) into v_revenue from payment
  where status in ('paid','partially_refunded','refunded') and created_at between v_from and v_to;

  select coalesce(sum(refunded_amount), 0) into v_refunds from payment
  where refunded_amount > 0 and updated_at between v_from and v_to;

  select count(*) into v_bookings from reservation where created_at between v_from and v_to;
  select count(*) into v_cancellations from reservation where status = 'cancelled' and updated_at between v_from and v_to;
  select count(*) into v_no_shows from reservation where status = 'no_show' and updated_at between v_from and v_to;

  select avg(100.0 * nb_active_reservations_seats / nullif(capacity, 0)) into v_occupancy
  from (
    select t.id, t.capacity,
      coalesce((select sum(r.seats) from reservation r where r.trip_id = t.id and r.status in ('confirmed','completed')), 0) as nb_active_reservations_seats
    from trip t where t.departure_at between v_from and v_to
  ) occ;

  return jsonb_build_object(
    'revenue', v_revenue, 'refunds_total', v_refunds, 'bookings', v_bookings,
    'cancellations', v_cancellations, 'no_shows', v_no_shows,
    'occupancy_pct', round(coalesce(v_occupancy, 0), 1)
  );
end;
$$;


ALTER FUNCTION "public"."admin_analytics_summary"("p_from" timestamp with time zone, "p_to" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_demand_dropoff_communes"("p_limit" integer DEFAULT 10) RETURNS TABLE("commune" "text", "wilaya" "text", "requests_count" bigint)
    LANGUAGE "sql" STABLE
    AS $$
  select c.nom_fr, w.nom_fr, count(*)::bigint
  from reservation r
  join commune c on c.id = r.dropoff_commune_id
  join wilaya w on w.id = c.wilaya_id
  group by c.nom_fr, w.nom_fr
  order by count(*) desc
  limit p_limit;
$$;


ALTER FUNCTION "public"."admin_demand_dropoff_communes"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_demand_pickup_communes"("p_limit" integer DEFAULT 10) RETURNS TABLE("commune" "text", "wilaya" "text", "requests_count" bigint)
    LANGUAGE "sql" STABLE
    AS $$
  select c.nom_fr, w.nom_fr, count(*)::bigint
  from reservation r
  join commune c on c.id = r.pickup_commune_id
  join wilaya w on w.id = c.wilaya_id
  group by c.nom_fr, w.nom_fr
  order by count(*) desc
  limit p_limit;
$$;


ALTER FUNCTION "public"."admin_demand_pickup_communes"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_driver_performance"("p_limit" integer DEFAULT 50) RETURNS TABLE("driver_id" "uuid", "full_name" "text", "trips_count" bigint, "completed_trips" bigint, "avg_rating" numeric, "revenue" numeric, "no_show_count" integer)
    LANGUAGE "sql" STABLE
    AS $$
  select d.id, d.full_name,
    count(distinct t.id)::bigint,
    count(distinct t.id) filter (where t.status = 'completed')::bigint,
    round(avg(rt.stars), 2),
    coalesce(sum(r.total_price) filter (where r.status in ('completed','confirmed')), 0),
    d.no_show_count
  from driver d
  left join trip t on t.driver_id = d.id
  left join reservation r on r.trip_id = t.id
  left join rating rt on rt.reservation_id = r.id and rt.direction = 'customer_to_driver'
  group by d.id, d.full_name, d.no_show_count
  order by count(distinct t.id) desc
  limit p_limit;
$$;


ALTER FUNCTION "public"."admin_driver_performance"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_failed_searches"("p_limit" integer DEFAULT 20) RETURNS TABLE("from_wilaya" "text", "to_wilaya" "text", "date_from" "date", "date_to" "date", "searched_count" bigint, "last_searched_at" timestamp with time zone)
    LANGUAGE "sql" STABLE
    AS $$
  select wf.nom_fr, wt.nom_fr, sl.date_from, sl.date_to, count(*)::bigint, max(sl.created_at)
  from search_log sl
  join wilaya wf on wf.id = sl.from_wilaya_id
  join wilaya wt on wt.id = sl.to_wilaya_id
  where sl.results_count = 0
  group by wf.nom_fr, wt.nom_fr, sl.date_from, sl.date_to
  order by count(*) desc
  limit p_limit;
$$;


ALTER FUNCTION "public"."admin_failed_searches"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_reschedule_trip"("p_trip" "uuid", "p_new_departure" timestamp with time zone, "p_new_arrival_eta" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_reason" "text" DEFAULT NULL::"text", "p_admin" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_old trip%rowtype;
  v_res record;
begin
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'A reason is required' using errcode = 'DZ001';
  end if;

  select * into v_old from trip where id = p_trip for update;
  if not found then
    raise exception 'Trip not found' using errcode = 'DZ301';
  end if;

  perform set_config('wassalni.admin_reschedule', 'on', true);
  update trip set departure_at = p_new_departure, arrival_eta = coalesce(p_new_arrival_eta, arrival_eta)
  where id = p_trip;

  perform log_admin_action(p_admin, 'reschedule_trip', 'trip', p_trip::text,
    jsonb_build_object('departure_at', v_old.departure_at),
    jsonb_build_object('departure_at', p_new_departure),
    p_reason);

  for v_res in
    select r.id, r.customer_id, r.code from reservation r
    where r.trip_id = p_trip and r.status in ('pending','confirmed')
  loop
    perform notify_customer(v_res.customer_id, 'schedule_change',
      'Horaire modifié', 'Le départ de votre réservation ' || v_res.code ||
      ' a été déplacé au ' || to_char(p_new_departure, 'DD/MM/YYYY HH24:MI') || '. Motif : ' || p_reason,
      jsonb_build_object('reservation_id', v_res.id, 'trip_id', p_trip, 'new_departure_at', p_new_departure));
  end loop;
end;
$$;


ALTER FUNCTION "public"."admin_reschedule_trip"("p_trip" "uuid", "p_new_departure" timestamp with time zone, "p_new_arrival_eta" timestamp with time zone, "p_reason" "text", "p_admin" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_top_wilaya_pairs"("p_limit" integer DEFAULT 10) RETURNS TABLE("from_wilaya" "text", "to_wilaya" "text", "reservations_count" bigint, "revenue" numeric)
    LANGUAGE "sql" STABLE
    AS $$
  select wf.nom_fr, wt.nom_fr, count(*)::bigint, coalesce(sum(r.total_price), 0)
  from reservation r
  join wpoint pf on pf.id = r.pickup_wpoint_id
  join wpoint pt on pt.id = r.dropoff_wpoint_id
  join wilaya wf on wf.id = pf.wilaya_id
  join wilaya wt on wt.id = pt.wilaya_id
  where r.status <> 'cancelled'
  group by wf.nom_fr, wt.nom_fr
  order by count(*) desc
  limit p_limit;
$$;


ALTER FUNCTION "public"."admin_top_wilaya_pairs"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_top_wpoint_pairs"("p_limit" integer DEFAULT 10) RETURNS TABLE("from_wpoint" "text", "to_wpoint" "text", "reservations_count" bigint)
    LANGUAGE "sql" STABLE
    AS $$
  select tjf.name || ' — ' || wf.nom_fr, tjt.name || ' — ' || wt.nom_fr, count(*)::bigint
  from reservation r
  join wpoint pf on pf.id = r.pickup_wpoint_id
  join wpoint pt on pt.id = r.dropoff_wpoint_id
  join wilaya wf on wf.id = pf.wilaya_id
  join wilaya wt on wt.id = pt.wilaya_id
  join trajectory tjf on tjf.id = pf.trajectory_id
  join trajectory tjt on tjt.id = pt.trajectory_id
  where r.status <> 'cancelled'
  group by tjf.name, wf.nom_fr, tjt.name, wt.nom_fr
  order by count(*) desc
  limit p_limit;
$$;


ALTER FUNCTION "public"."admin_top_wpoint_pairs"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_trajectory_demand"("p_limit" integer DEFAULT 10) RETURNS TABLE("trajectory_id" "uuid", "trajectory_name" "text", "reservations_count" bigint, "revenue" numeric)
    LANGUAGE "sql" STABLE
    AS $$
  select tj.id, tj.name, count(r.id)::bigint, coalesce(sum(r.total_price), 0)
  from trajectory tj
  join trip t on t.trajectory_id = tj.id
  left join reservation r on r.trip_id = t.id and r.status <> 'cancelled'
  group by tj.id, tj.name
  order by count(r.id) desc
  limit p_limit;
$$;


ALTER FUNCTION "public"."admin_trajectory_demand"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."amount_paid"("p_reservation" "uuid") RETURNS numeric
    LANGUAGE "sql" STABLE
    AS $$
  select coalesce(sum(amount - refunded_amount), 0)
  from payment
  where reservation_id = p_reservation
    and status in ('paid','partially_refunded');
$$;


ALTER FUNCTION "public"."amount_paid"("p_reservation" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_refund"("p_payment" "uuid", "p_amount" numeric, "p_initiated_by" "text", "p_admin" "uuid" DEFAULT NULL::"uuid", "p_policy_pct" numeric DEFAULT NULL::numeric) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_pay      payment%rowtype;
  v_remaining numeric;
  v_existing refund%rowtype;
  v_id       uuid;
  v_gw_ref   text;
  v_amt      numeric;
begin
  select * into v_pay from payment where id = p_payment for update;
  if not found then
    raise exception 'Payment not found' using errcode = 'DZ501';
  end if;
  if v_pay.status not in ('paid','partially_refunded') then
    raise exception 'Invalid payment transition' using errcode = 'DZ502';
  end if;

  v_remaining := v_pay.amount - v_pay.refunded_amount;
  v_amt := coalesce(p_amount, v_remaining);
  if v_amt <= 0 or v_amt > v_remaining then
    raise exception 'Invalid refund amount' using errcode = 'DZ505';
  end if;

  select * into v_existing from refund
    where payment_id = p_payment and status in ('pending','processing')
    order by created_at desc limit 1 for update;

  if found then
    v_id := v_existing.id;
    if v_pay.gateway is not null or p_initiated_by = 'admin' then
      v_gw_ref := case when v_pay.gateway is not null then 'RFD-' || substr(encode(gen_random_bytes(10), 'hex'), 1, 20) else null end;
      update refund set status = 'succeeded', amount = v_amt,
             gateway_refund_id = coalesce(gateway_refund_id, v_gw_ref),
             admin_id = coalesce(p_admin, admin_id), processed_at = now()
       where id = v_id;
      perform refund_payment(p_payment, v_amt);
      perform record_payout_refund_clawback(v_pay.reservation_id, p_payment, v_amt);
    end if;
    -- system re-firing on an already-pending cash refund: idempotent no-op.
    return v_id;
  end if;

  insert into refund (payment_id, reservation_id, amount, policy_pct, status, initiated_by, admin_id, gateway)
  values (p_payment, v_pay.reservation_id, v_amt, p_policy_pct, 'pending', p_initiated_by, p_admin, v_pay.gateway)
  returning id into v_id;

  if v_pay.gateway is not null or p_initiated_by = 'admin' then
    v_gw_ref := case when v_pay.gateway is not null then 'RFD-' || substr(encode(gen_random_bytes(10), 'hex'), 1, 20) else null end;
    update refund set status = 'succeeded', gateway_refund_id = v_gw_ref, processed_at = now() where id = v_id;
    perform refund_payment(p_payment, v_amt);
    perform record_payout_refund_clawback(v_pay.reservation_id, p_payment, v_amt);
  end if;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."apply_refund"("p_payment" "uuid", "p_amount" numeric, "p_initiated_by" "text", "p_admin" "uuid", "p_policy_pct" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."attribute_referral"("p_new_customer" "uuid", "p_code" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare v_referrer uuid; v_already uuid;
begin
  select id into v_referrer from customer where referral_code = upper(btrim(p_code));
  if v_referrer is null then
    raise exception 'Unknown referral code' using errcode = 'DZ771';
  end if;
  if v_referrer = p_new_customer then
    raise exception 'You cannot refer yourself' using errcode = 'DZ772';
  end if;
  select referred_by_customer_id into v_already from customer where id = p_new_customer;
  if v_already is not null then
    raise exception 'This account already has a referrer on file' using errcode = 'DZ773';
  end if;
  update customer set referred_by_customer_id = v_referrer where id = p_new_customer;
end;
$$;


ALTER FUNCTION "public"."attribute_referral"("p_new_customer" "uuid", "p_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_recurring_template"("p_template" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
declare v_trip record; v_count integer := 0;
begin
  if not exists (select 1 from recurring_trip_template where id = p_template) then
    raise exception 'Unknown recurring trip template id' using errcode = 'DZ811';
  end if;

  update recurring_trip_template set active = false, updated_at = now() where id = p_template;

  for v_trip in
    select id from trip where recurring_template_id = p_template and status = 'scheduled' and departure_at > now()
  loop
    call sp_cancel_trip(v_trip.id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;


ALTER FUNCTION "public"."cancel_recurring_template"("p_template" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_reservation"("p_reservation" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_res reservation%rowtype;
  v_old_status reservation_status;
  v_pct numeric;
  v_pay record;
  v_remaining numeric;
  v_amt numeric;
begin
  select status into v_old_status from reservation where id = p_reservation for update;

  update reservation set status = 'cancelled'
  where id = p_reservation and status in ('pending','confirmed')
  returning * into v_res;

  if v_res.id is null then
    if exists (select 1 from reservation where id = p_reservation) then
      raise exception 'Invalid reservation transition' using errcode = 'DZ402';
    else
      raise exception 'Reservation not found' using errcode = 'DZ401';
    end if;
  end if;

  v_pct := cancellation_refund_pct(v_res.trip_id, now());
  if v_pct > 0 then
    for v_pay in
      select id, amount, refunded_amount from payment
      where reservation_id = p_reservation and status in ('paid','partially_refunded')
      for update
    loop
      v_remaining := v_pay.amount - v_pay.refunded_amount;
      v_amt := round(v_remaining * v_pct / 100.0, 2);
      if v_amt > 0 then
        perform apply_refund(v_pay.id, v_amt, 'system', null, v_pct);
      end if;
    end loop;
  end if;

  if v_old_status = 'pending' then
    perform notify_customer(v_res.customer_id, 'reservation_rejected',
      'Réservation refusée', 'Votre demande de réservation ' || v_res.code || ' a été refusée.',
      jsonb_build_object('reservation_id', v_res.id, 'trip_id', v_res.trip_id));
  else
    perform notify_customer(v_res.customer_id, 'reservation_cancelled',
      'Réservation annulée', 'Votre réservation ' || v_res.code || ' a été annulée.',
      jsonb_build_object('reservation_id', v_res.id, 'trip_id', v_res.trip_id));
  end if;

  -- Task 10.2 — cancelling a confirmed/pending seat may free capacity that
  -- a waiting customer on the SAME trip can now be promoted into. Reuses
  -- the one promotion function (concurrency-safe, advisory-locked) rather
  -- than duplicating the "find next waiter, try to reserve them" logic
  -- anywhere else it's needed (this function, trg_trip_capacity_guard, and
  -- the Task 13.1 scheduler tick all call this same promote_waitlist()).
  perform promote_waitlist(v_res.trip_id);
end;
$$;


ALTER FUNCTION "public"."cancel_reservation"("p_reservation" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_waitlist_entry"("p_entry" "uuid", "p_customer" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  update waitlist_entry
  set status = 'cancelled', cancelled_at = now()
  where id = p_entry and customer_id = p_customer and status = 'waiting';
  if not found then
    if exists (select 1 from waitlist_entry where id = p_entry) then
      raise exception 'Illegal waitlist entry status transition' using errcode = 'DZ803';
    else
      raise exception 'Unknown waitlist entry id' using errcode = 'DZ801';
    end if;
  end if;
end;
$$;


ALTER FUNCTION "public"."cancel_waitlist_entry"("p_entry" "uuid", "p_customer" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancellation_refund_pct"("p_trip" "uuid", "p_at" timestamp with time zone DEFAULT "now"()) RETURNS numeric
    LANGUAGE "plpgsql" STABLE
    AS $$
declare
  v_departure timestamptz;
  v_hours     numeric;
  v_full_h    numeric;
  v_partial_h numeric;
  v_partial_p numeric;
begin
  select departure_at into v_departure from trip where id = p_trip;
  if v_departure is null then
    return 0;
  end if;
  v_hours := extract(epoch from (v_departure - p_at)) / 3600.0;

  select coalesce((select value from app_setting where key = 'refund_policy_full_hours')::numeric, 24) into v_full_h;
  select coalesce((select value from app_setting where key = 'refund_policy_partial_hours')::numeric, 2) into v_partial_h;
  select coalesce((select value from app_setting where key = 'refund_policy_partial_pct')::numeric, 50) into v_partial_p;

  if v_hours >= v_full_h then return 100;
  elsif v_hours >= v_partial_h then return v_partial_p;
  else return 0;
  end if;
end;
$$;


ALTER FUNCTION "public"."cancellation_refund_pct"("p_trip" "uuid", "p_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_trip"("p_trip" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  update trip set status = 'completed' where id = p_trip and status = 'in_progress';
  if not found then
    if exists (select 1 from trip where id = p_trip) then
      raise exception 'Invalid trip transition' using errcode = 'DZ304';
    else
      raise exception 'Trip not found' using errcode = 'DZ301';
    end if;
  end if;
end;
$$;


ALTER FUNCTION "public"."complete_trip"("p_trip" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."compute_promo_discount"("p_code" "text", "p_basis_amount" numeric, "p_customer" "uuid") RETURNS TABLE("promo_id" "uuid", "discount_amount" numeric)
    LANGUAGE "plpgsql"
    AS $$
declare
  v_promo         promo_code%rowtype;
  v_uses_total    int;
  v_uses_customer int;
  v_amt           numeric;
begin
  select * into v_promo from promo_code where code = upper(btrim(p_code)) for update;
  if not found then
    raise exception 'Unknown promo code' using errcode = 'DZ751';
  end if;
  if not v_promo.active then
    raise exception 'Promo code is not active' using errcode = 'DZ752';
  end if;
  if (v_promo.starts_at is not null and now() < v_promo.starts_at)
     or (v_promo.expires_at is not null and now() > v_promo.expires_at) then
    raise exception 'Promo code is not within its valid date range' using errcode = 'DZ753';
  end if;
  if p_basis_amount < v_promo.min_amount then
    raise exception 'Reservation amount is below the promo code minimum' using errcode = 'DZ754';
  end if;
  if v_promo.max_uses_total is not null then
    select count(*) into v_uses_total from promo_redemption where promo_code_id = v_promo.id;
    if v_uses_total >= v_promo.max_uses_total then
      raise exception 'Promo code total usage limit reached' using errcode = 'DZ755';
    end if;
  end if;
  select count(*) into v_uses_customer from promo_redemption
    where promo_code_id = v_promo.id and customer_id = p_customer;
  if v_uses_customer >= v_promo.max_uses_per_customer then
    raise exception 'You have already used this promo code the maximum number of times' using errcode = 'DZ756';
  end if;

  if v_promo.discount_type = 'percentage' then
    v_amt := round(p_basis_amount * v_promo.discount_value / 100.0, 2);
  else
    v_amt := v_promo.discount_value;
  end if;
  v_amt := least(v_amt, p_basis_amount);

  return query select v_promo.id, v_amt;
end;
$$;


ALTER FUNCTION "public"."compute_promo_discount"("p_code" "text", "p_basis_amount" numeric, "p_customer" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."confirm_reservation"("p_reservation" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare v_res reservation%rowtype;
begin
  update reservation set status = 'confirmed'
  where id = p_reservation and status = 'pending'
  returning * into v_res;
  if not found then
    if exists (select 1 from reservation where id = p_reservation) then
      raise exception 'Invalid reservation transition' using errcode = 'DZ402';
    else
      raise exception 'Reservation not found' using errcode = 'DZ401';
    end if;
  end if;

  perform notify_customer(v_res.customer_id, 'reservation_approved',
    'Réservation confirmée', 'Votre réservation ' || v_res.code || ' a été confirmée par le chauffeur.',
    jsonb_build_object('reservation_id', v_res.id, 'trip_id', v_res.trip_id));
end;
$$;


ALTER FUNCTION "public"."confirm_reservation"("p_reservation" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_customer"("p_full_name" "text", "p_phone" "text", "p_email" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $_$
declare
  v_name  text := btrim(coalesce(p_full_name, ''));
  v_phone text := regexp_replace(btrim(coalesce(p_phone, '')), '[\s\-\.\(\)]', '', 'g');
  v_id    uuid;
begin
  if v_name = '' or v_phone = '' then
    raise exception 'full_name and phone are required' using errcode = 'DZ001';
  end if;
  if v_phone !~ '^\+?[0-9]{8,15}$' then
    raise exception 'Invalid phone number' using errcode = 'DZ001';
  end if;

  insert into customer (full_name, phone, email)
  values (v_name, v_phone, nullif(btrim(coalesce(p_email, '')), ''))
  on conflict (phone) do update
    set full_name = excluded.full_name,
        email     = coalesce(excluded.email, customer.email)
  returning id into v_id;

  return v_id;
end;
$_$;


ALTER FUNCTION "public"."create_customer"("p_full_name" "text", "p_phone" "text", "p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_payment_intent"("p_reservation" "uuid", "p_amount" numeric, "p_method" "public"."payment_method", "p_gateway" "text", "p_gateway_transaction_id" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
declare v_id uuid;
begin
  v_id := record_payment(p_reservation, p_amount, p_method, p_gateway_transaction_id);
  -- Task 7.3 — 15-minute hold: only a gateway-tagged intent ever expires
  -- (cash/manual payments have no "complete within N minutes" concept).
  update payment
     set gateway = p_gateway, gateway_transaction_id = p_gateway_transaction_id,
         expires_at = now() + interval '15 minutes', updated_at = now()
   where id = v_id;
  return v_id;
end;
$$;


ALTER FUNCTION "public"."create_payment_intent"("p_reservation" "uuid", "p_amount" numeric, "p_method" "public"."payment_method", "p_gateway" "text", "p_gateway_transaction_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_payout_batch"("p_driver" "uuid", "p_period_start" timestamp with time zone, "p_period_end" timestamp with time zone) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_total numeric;
  v_batch uuid;
begin
  select coalesce(sum(net_amount), 0) into v_total
    from payout_ledger
   where driver_id = p_driver and payout_batch_id is null
     and created_at >= p_period_start and created_at < p_period_end;

  if not exists (
    select 1 from payout_ledger
     where driver_id = p_driver and payout_batch_id is null
       and created_at >= p_period_start and created_at < p_period_end
  ) then
    raise exception 'No unbatched payout ledger entries in that period for this driver' using errcode = 'DZ783';
  end if;

  insert into payout_batch (driver_id, period_start, period_end, total_amount)
  values (p_driver, p_period_start, p_period_end, v_total)
  returning id into v_batch;

  update payout_ledger set payout_batch_id = v_batch
   where driver_id = p_driver and payout_batch_id is null
     and created_at >= p_period_start and created_at < p_period_end;

  return v_batch;
end;
$$;


ALTER FUNCTION "public"."create_payout_batch"("p_driver" "uuid", "p_period_start" timestamp with time zone, "p_period_end" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_share_token"("p_reservation" "uuid", "p_token_hash" "text", "p_ttl_hours" numeric DEFAULT 24) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
declare v_id uuid;
begin
  if not exists (select 1 from reservation where id = p_reservation) then
    raise exception 'Reservation not found' using errcode = 'DZ401';
  end if;
  insert into trip_share_token (reservation_id, token_hash, expires_at)
  values (p_reservation, p_token_hash, now() + make_interval(hours => p_ttl_hours::int))
  returning id into v_id;
  return v_id;
end;
$$;


ALTER FUNCTION "public"."create_share_token"("p_reservation" "uuid", "p_token_hash" "text", "p_ttl_hours" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_trajectory"("p_name" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_id   uuid;
begin
  if v_name = '' then
    raise exception 'Trajectory name cannot be empty: "%"', p_name using errcode = 'DZ101';
  end if;

  insert into trajectory (name) values (v_name)
  on conflict (name) do update set updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."create_trajectory"("p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_trip"("p_trajectory" "uuid", "p_departure_at" timestamp with time zone, "p_capacity" integer, "p_seat_price" numeric, "p_arrival_eta" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_driver_id" "uuid" DEFAULT NULL::"uuid", "p_vehicle_id" "uuid" DEFAULT NULL::"uuid", "p_notes" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
declare v_id uuid;
begin
  if p_departure_at is null then
    raise exception 'departure_at is required' using errcode = 'DZ001';
  end if;
  if p_arrival_eta is not null and p_arrival_eta < p_departure_at then
    raise exception 'arrival_eta must be >= departure_at' using errcode = 'DZ001';
  end if;
  if p_capacity is null or p_capacity <= 0 or p_capacity > 32767 then
    raise exception 'capacity must be between 1 and 32767' using errcode = 'DZ001';
  end if;
  if p_seat_price is null or p_seat_price < 0 then
    raise exception 'seat_price must be >= 0' using errcode = 'DZ001';
  end if;
  if not exists (select 1 from trajectory where id = p_trajectory) then
    raise exception 'Trajectory % not found', p_trajectory using errcode = 'DZ102';
  end if;
  if p_driver_id is not null and not exists (select 1 from driver where id = p_driver_id) then
    raise exception 'Driver % not found', p_driver_id using errcode = 'DZ001';
  end if;
  if p_vehicle_id is not null and not exists (select 1 from vehicle where id = p_vehicle_id) then
    raise exception 'Vehicle % not found', p_vehicle_id using errcode = 'DZ001';
  end if;

  insert into trip (code, trajectory_id, departure_at, arrival_eta, capacity, seat_price, currency,
                    driver_id, vehicle_id, notes)
  values (
    'TRP-' || to_char(now(), 'YYYYMM') || '-' || lpad(nextval('seq_business_code')::text, 6, '0'),
    p_trajectory, p_departure_at, p_arrival_eta, p_capacity, p_seat_price, 'DZD',
    p_driver_id, p_vehicle_id, p_notes
  )
  returning id into v_id;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."create_trip"("p_trajectory" "uuid", "p_departure_at" timestamp with time zone, "p_capacity" integer, "p_seat_price" numeric, "p_arrival_eta" timestamp with time zone, "p_driver_id" "uuid", "p_vehicle_id" "uuid", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."driver_earnings_summary"("p_driver" "uuid") RETURNS TABLE("gross_revenue" numeric, "commission" numeric, "refunds" numeric, "net_earnings" numeric, "pending_payout" numeric, "paid_out" numeric)
    LANGUAGE "sql" STABLE
    AS $$
  select
    coalesce(sum(gross_amount) filter (where entry_type = 'earning'), 0) as gross_revenue,
    coalesce(sum(commission_amount) filter (where entry_type = 'earning'), 0) as commission,
    coalesce(-sum(gross_amount) filter (where entry_type = 'refund_adjustment'), 0) as refunds,
    coalesce(sum(net_amount), 0) as net_earnings,
    coalesce(sum(net_amount) filter (where payout_batch_id is null
      or payout_batch_id in (select id from payout_batch where status <> 'paid')), 0) as pending_payout,
    coalesce(sum(net_amount) filter (where payout_batch_id in (select id from payout_batch where status = 'paid')), 0) as paid_out
  from payout_ledger
  where driver_id = p_driver;
$$;


ALTER FUNCTION "public"."driver_earnings_summary"("p_driver" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."expire_stale_payment_intents"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
declare
  v_rec   record;
  v_count integer := 0;
  v_res   reservation%rowtype;
begin
  for v_rec in
    select id, reservation_id from payment
    where status = 'pending' and expires_at is not null and expires_at < now()
    for update skip locked
  loop
    update payment set status = 'expired', updated_at = now() where id = v_rec.id;
    v_count := v_count + 1;

    select * into v_res from reservation where id = v_rec.reservation_id;

    -- Task 13.2 — "notify customer if appropriate": only the pending
    -- reservation this specific checkout attempt would have paid for is
    -- actually impacted (cancel_reservation() below already no-ops, via
    -- the exists() guard, if something else already confirmed/paid it).
    if v_res.id is not null and v_res.status = 'pending' then
      perform notify_customer(v_res.customer_id, 'payment_expired',
        'Délai de paiement expiré', 'Le délai pour régler votre réservation ' || v_res.code ||
        ' a expiré ; la réservation a été annulée.',
        jsonb_build_object('reservation_id', v_res.id, 'payment_id', v_rec.id));
      perform cancel_reservation(v_rec.reservation_id);
    end if;
  end loop;
  return v_count;
end;
$$;


ALTER FUNCTION "public"."expire_stale_payment_intents"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fail_refund"("p_refund" "uuid", "p_admin" "uuid", "p_reason" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare v_status text;
begin
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'Failure reason required' using errcode = 'DZ743';
  end if;
  select status into v_status from refund where id = p_refund for update;
  if v_status is null then
    raise exception 'Refund not found' using errcode = 'DZ741';
  end if;
  if v_status not in ('pending','processing') then
    raise exception 'Refund is not pending/processing' using errcode = 'DZ742';
  end if;
  update refund set status = 'failed', failure_reason = btrim(p_reason), admin_id = p_admin, processed_at = now()
   where id = p_refund;
end;
$$;


ALTER FUNCTION "public"."fail_refund"("p_refund" "uuid", "p_admin" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."gateway_apply_payment_event"("p_payment" "uuid", "p_gateway" "text", "p_gateway_event_id" "text", "p_event_type" "text", "p_signature_valid" boolean, "p_raw_payload" "jsonb") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_pay    payment%rowtype;
  v_found  boolean;
  v_result text;
  v_note   text;
begin
  -- Looked up unconditionally (even for an invalid signature) only so the
  -- audit row below can still record a real payment_id when one exists;
  -- a bad signature never otherwise influences this lookup's result.
  select * into v_pay from payment where id = p_payment for update;
  v_found := found;

  if not p_signature_valid then
    v_result := 'rejected';
    v_note := 'Invalid webhook signature';
  elsif not v_found then
    v_result := 'rejected';
    v_note := 'Unknown payment';
  elsif v_pay.status <> 'pending' then
    v_result := 'duplicate';
    v_note := 'Payment already resolved (status=' || v_pay.status || '); webhook ignored';
  elsif p_event_type = 'payment.succeeded' then
    update payment set status = 'paid', paid_at = now(), updated_at = now() where id = p_payment;
    v_result := 'processed';
    v_note := 'Payment marked paid';

    -- "Reservation state update": an online gateway payment that fully
    -- covers the reservation auto-confirms it (money is already captured
    -- by the gateway) — manual/cash payments recorded by admin do NOT do
    -- this; they still go through the driver/admin approval workflow
    -- (Task 5.1) untouched. Reuses confirm_reservation() as-is, so the
    -- same capacity-revalidation guard (trg_reservation_capacity_guard)
    -- still applies; if capacity is gone by now the auto-confirm is
    -- simply skipped (payment stays paid, reservation stays pending) and
    -- that is recorded in the audit note for an admin to follow up on.
    if amount_paid(v_pay.reservation_id) >= (select total_price from reservation where id = v_pay.reservation_id)
       and (select status from reservation where id = v_pay.reservation_id) = 'pending' then
      begin
        perform confirm_reservation(v_pay.reservation_id);
        v_note := v_note || '; reservation auto-confirmed (fully paid online)';
      exception when others then
        v_note := v_note || '; could NOT auto-confirm reservation (' || sqlerrm || ') — needs manual admin review';
      end;
    end if;
  elsif p_event_type = 'payment.failed' then
    update payment
       set status = 'failed', failure_reason = p_raw_payload ->> 'reason', updated_at = now()
     where id = p_payment;
    v_result := 'processed';
    v_note := 'Payment marked failed';
  else
    v_result := 'rejected';
    v_note := 'Unknown event type';
  end if;

  begin
    -- A payment_id that doesn't actually exist (p_found = false) is logged
    -- as null — the column allows it (on delete set null) — rather than
    -- attempting an impossible foreign key reference, which would otherwise
    -- turn a well-formed "unknown payment" rejection into an uncaught
    -- foreign_key_violation instead of the clean 'rejected' result above.
    insert into payment_gateway_event (payment_id, gateway, gateway_event_id, event_type, signature_valid, raw_payload, processing_result, processing_note)
    values (case when v_found then p_payment else null end, p_gateway, p_gateway_event_id, p_event_type, p_signature_valid, p_raw_payload, v_result, v_note);
  exception when unique_violation then
    return 'duplicate';
  end;

  return v_result;
end;
$$;


ALTER FUNCTION "public"."gateway_apply_payment_event"("p_payment" "uuid", "p_gateway" "text", "p_gateway_event_id" "text", "p_event_type" "text", "p_signature_valid" boolean, "p_raw_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_recurring_trips"("p_template" "uuid", "p_through" "date" DEFAULT NULL::"date") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
declare
  v_tpl   recurring_trip_template%rowtype;
  v_from  date;
  v_to    date;
  v_d     date;
  v_dep   timestamptz;
  v_trip  uuid;
  v_count integer := 0;
begin
  select * into v_tpl from recurring_trip_template where id = p_template for update;
  if not found then
    raise exception 'Unknown recurring trip template id' using errcode = 'DZ811';
  end if;
  if not v_tpl.active then
    return 0;
  end if;

  v_to := coalesce(p_through, current_date + v_tpl.horizon_days);
  if v_tpl.ends_on is not null then
    v_to := least(v_to, v_tpl.ends_on);
  end if;
  v_from := greatest(coalesce(v_tpl.last_generated_through + 1, v_tpl.starts_on), v_tpl.starts_on);

  if v_from > v_to then
    return 0;
  end if;

  v_d := v_from;
  while v_d <= v_to loop
    if extract(dow from v_d)::smallint = any(v_tpl.weekdays)
       and not exists (select 1 from recurring_trip_exception where template_id = p_template and exception_date = v_d)
       and not exists (select 1 from trip where recurring_template_id = p_template and recurring_date = v_d)
    then
      v_dep := v_d + v_tpl.departure_time;
      if v_dep > now() then
        v_trip := create_trip(v_tpl.trajectory_id, v_dep, v_tpl.capacity, v_tpl.seat_price, null, v_tpl.driver_id, v_tpl.vehicle_id,
                              'Généré depuis le modèle récurrent');
        update trip set recurring_template_id = p_template, recurring_date = v_d where id = v_trip;
        perform populate_trip_stops(v_trip);
        if v_tpl.driver_id is not null then
          begin
            call sp_populate_trip_prices_from_defaults(v_trip, false);
            call sp_publish_trip(v_trip);
          exception when others then
            null; -- no default prices configured yet / vehicle not eligible: leave unpublished, admin finishes manually
          end;
        end if;
        v_count := v_count + 1;
      end if;
    end if;
    v_d := v_d + 1;
  end loop;

  update recurring_trip_template set last_generated_through = v_to where id = p_template;
  return v_count;
end;
$$;


ALTER FUNCTION "public"."generate_recurring_trips"("p_template" "uuid", "p_through" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_communes"("p_wilaya" "text") RETURNS TABLE("commune_id" integer, "nom_fr" "text", "nom_ar" "text", "code_postal" character)
    LANGUAGE "sql" STABLE
    AS $$
  select c.id, c.nom_fr, c.nom_ar, c.code_postal
  from commune c
  where c.wilaya_id = resolve_wilaya(p_wilaya)
  order by c.nom_fr;
$$;


ALTER FUNCTION "public"."get_communes"("p_wilaya" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_dairas"("p_wilaya" "text") RETURNS TABLE("daira_id" smallint, "nom_fr" "text", "nom_ar" "text", "nom_en" "text")
    LANGUAGE "sql" STABLE
    AS $$
  select d.id, d.nom_fr, d.nom_ar, d.nom_en
  from daira d
  where d.wilaya_id = resolve_wilaya(p_wilaya)
  order by d.nom_fr;
$$;


ALTER FUNCTION "public"."get_dairas"("p_wilaya" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_or_create_conversation"("p_reservation" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
declare v_id uuid;
begin
  if not exists (select 1 from reservation where id = p_reservation) then
    raise exception 'Reservation not found' using errcode = 'DZ401';
  end if;
  insert into conversation (reservation_id) values (p_reservation)
  on conflict (reservation_id) do nothing;
  select id into v_id from conversation where reservation_id = p_reservation;
  return v_id;
end;
$$;


ALTER FUNCTION "public"."get_or_create_conversation"("p_reservation" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_shared_trip_info"("p_token_hash" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_tok trip_share_token%rowtype;
  v_res reservation%rowtype;
  v_trip trip%rowtype;
  v_loc  driver_last_location%rowtype;
begin
  select * into v_tok from trip_share_token where token_hash = p_token_hash;
  if not found then
    raise exception 'Unknown or invalid share link' using errcode = 'DZ862';
  end if;
  if v_tok.revoked_at is not null then
    raise exception 'This share link has been revoked' using errcode = 'DZ864';
  end if;
  if v_tok.expires_at < now() then
    raise exception 'This share link has expired' using errcode = 'DZ863';
  end if;

  select * into v_res from reservation where id = v_tok.reservation_id;
  select * into v_trip from trip where id = v_res.trip_id;
  select * into v_loc from driver_last_location where driver_id = v_trip.driver_id;

  return jsonb_build_object(
    'trip_status', v_trip.status,
    'departure_at', v_trip.departure_at,
    'arrival_eta', v_trip.arrival_eta,
    'reservation_status', v_res.status,
    'seats', v_res.seats,
    'driver_location', case when v_trip.status = 'in_progress' and v_loc.driver_id is not null
      then jsonb_build_object('lat', v_loc.gps_lat, 'lon', v_loc.gps_lon, 'recorded_at', v_loc.recorded_at)
      else null end
  );
end;
$$;


ALTER FUNCTION "public"."get_shared_trip_info"("p_token_hash" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_trajectory_id"("p_name" "text") RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $$
  select id from trajectory where name = btrim(p_name);
$$;


ALTER FUNCTION "public"."get_trajectory_id"("p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."join_waitlist"("p_trip" "uuid", "p_customer" "uuid", "p_seats" integer, "p_pickup_wpoint" "uuid" DEFAULT NULL::"uuid", "p_dropoff_wpoint" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_trip trip%rowtype;
  v_pos  integer;
  v_id   uuid;
begin
  if p_seats is null or p_seats < 1 or p_seats > 30 then
    raise exception 'Seats must be between 1 and 30' using errcode = 'DZ001';
  end if;
  if not exists (select 1 from customer where id = p_customer) then
    raise exception 'Customer not found' using errcode = 'DZ404';
  end if;

  select * into v_trip from trip where id = p_trip for update;
  if not found then
    raise exception 'Trip not found' using errcode = 'DZ301';
  end if;
  if v_trip.published_at is null or v_trip.status <> 'scheduled' or v_trip.departure_at <= now() then
    raise exception 'Can only join the waitlist of a scheduled, published trip' using errcode = 'DZ804';
  end if;

  if exists (select 1 from waitlist_entry where trip_id = p_trip and customer_id = p_customer and status = 'waiting') then
    raise exception 'Customer already has an active waitlist entry for this trip' using errcode = 'DZ802';
  end if;

  select coalesce(max(position), 0) + 1 into v_pos from waitlist_entry where trip_id = p_trip;

  insert into waitlist_entry (trip_id, customer_id, seats, pickup_wpoint_id, dropoff_wpoint_id, position)
  values (p_trip, p_customer, p_seats, p_pickup_wpoint, p_dropoff_wpoint, v_pos)
  returning id into v_id;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."join_waitlist"("p_trip" "uuid", "p_customer" "uuid", "p_seats" integer, "p_pickup_wpoint" "uuid", "p_dropoff_wpoint" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."kyc_approve"("p_doc" "uuid", "p_admin" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare v_status text;
begin
  select status into v_status from kyc_document where id = p_doc for update;
  if v_status is null then
    raise exception 'KYC document not found' using errcode = 'DZ701';
  end if;
  if v_status <> 'pending' then
    raise exception 'KYC document already reviewed' using errcode = 'DZ702';
  end if;
  update kyc_document
     set status = 'approved', reviewed_by = p_admin, reviewed_at = now(),
         rejection_reason = null, updated_at = now()
   where id = p_doc;
end;
$$;


ALTER FUNCTION "public"."kyc_approve"("p_doc" "uuid", "p_admin" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."kyc_reject"("p_doc" "uuid", "p_admin" "uuid", "p_reason" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare v_status text;
begin
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'Rejection reason required' using errcode = 'DZ703';
  end if;
  select status into v_status from kyc_document where id = p_doc for update;
  if v_status is null then
    raise exception 'KYC document not found' using errcode = 'DZ701';
  end if;
  if v_status <> 'pending' then
    raise exception 'KYC document already reviewed' using errcode = 'DZ702';
  end if;
  update kyc_document
     set status = 'rejected', reviewed_by = p_admin, reviewed_at = now(),
         rejection_reason = btrim(p_reason), updated_at = now()
   where id = p_doc;
end;
$$;


ALTER FUNCTION "public"."kyc_reject"("p_doc" "uuid", "p_admin" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_fraud_signals"() RETURNS TABLE("signal_type" "text", "severity" "text", "subject_type" "text", "subject_id" "uuid", "subject_label" "text", "detail" "text", "detected_at" timestamp with time zone)
    LANGUAGE "sql" STABLE
    AS $$
  -- Duplicate NIN: same NIN used by more than one customer, or shared
  -- between a customer and a driver (driver.nin is already DB-unique, so
  -- same-table driver duplicates cannot exist; customer.nin has no such
  -- constraint, so cross-checking it is the actual gap worth watching).
  select 'duplicate_nin'::text, 'high'::text, 'customer'::text, c.id, c.full_name,
         'NIN partagé avec ' ||
           ((select count(*) from customer c2 where c2.nin = c.nin and c2.id <> c.id)
            + (select count(*) from driver d2 where d2.nin = c.nin))::text ||
           ' autre(s) compte(s)',
         now()
  from customer c
  where c.nin is not null and (
    exists (select 1 from customer c2 where c2.nin = c.nin and c2.id <> c.id)
    or exists (select 1 from driver d2 where d2.nin = c.nin)
  )

  union all
  -- Duplicate phone across roles: each table already enforces its own
  -- uniqueness, so the only way to see a duplicate is the same number
  -- registered as both a customer and a driver.
  select 'duplicate_phone', 'medium', 'customer', c.id, c.full_name,
         'Numéro de téléphone également enregistré comme chauffeur', now()
  from customer c
  join driver d on d.phone = c.phone

  union all
  -- Rapid cancel/rebook: a customer cancels a reservation then creates a
  -- new one on the SAME trip within 10 minutes (seat-squatting pattern).
  select 'rapid_cancel_rebook', 'medium', 'customer', r2.customer_id, cu.full_name,
         'Réservation ' || r1.code || ' annulée puis ' || r2.code || ' recréée sur le même trajet en moins de 10 minutes',
         r2.created_at
  from reservation r1
  join reservation r2 on r2.customer_id = r1.customer_id and r2.trip_id = r1.trip_id and r2.id <> r1.id
  join customer cu    on cu.id = r2.customer_id
  where r1.status = 'cancelled'
    and r2.created_at > r1.updated_at
    and r2.created_at <= r1.updated_at + interval '10 minutes'

  union all
  -- Repeated no-shows: reuses the Task 5.3 strike/flag mechanism directly —
  -- not recomputed here, just surfaced in the unified feed.
  select 'repeated_no_show', 'high', 'customer', c.id, c.full_name,
         c.no_show_count || ' absence(s) enregistrée(s)', c.flagged_at
  from customer c where c.flagged_at is not null
  union all
  select 'repeated_no_show', 'high', 'driver', d.id, d.full_name,
         d.no_show_count || ' absence(s) enregistrée(s)', d.flagged_at
  from driver d where d.flagged_at is not null

  union all
  -- Suspicious payment behaviour: >= 3 failed online-gateway payments for
  -- the same customer within the last hour (card-testing pattern). Manual
  -- cash/bank-transfer entries (gateway is null) never produce 'failed'
  -- status through admin tooling, so this only ever fires for genuine
  -- gateway attempts.
  select 'suspicious_payment', 'high', 'customer', r.customer_id, cu.full_name,
         count(*)::text || ' paiement(s) en ligne échoué(s) en moins d''une heure',
         max(p.updated_at)
  from payment p
  join reservation r on r.id = p.reservation_id
  join customer cu   on cu.id = r.customer_id
  where p.status = 'failed' and p.gateway is not null
    and p.updated_at > now() - interval '1 hour'
  group by r.customer_id, cu.full_name
  having count(*) >= 3

  union all
  -- Suspicious account creation: a burst of >= 5 new customer accounts
  -- within a 10-minute window of each other. Coarse-grained on purpose —
  -- this schema stores no IP/device fingerprint to correlate on, so
  -- timestamp velocity is the only signal available; a real implementation
  -- would combine this with request-level telemetry.
  select 'account_burst', 'low', 'customer', w.id, w.full_name,
         w.nearby_count || ' comptes clients créés à moins de 10 minutes d''intervalle', w.created_at
  from (
    select c.id, c.full_name, c.created_at,
           (select count(*) from customer c2
             where c2.created_at between c.created_at - interval '10 minutes' and c.created_at + interval '10 minutes'
           ) as nearby_count
    from customer c
  ) w
  where w.nearby_count >= 5

  union all
  -- Task 14.3 — Referral-farming: a referrer who has collected an unusually
  -- high number of referral payouts is worth a manual look (multi-accounting
  -- + "real" first trips is the only way to currently farm this program,
  -- since rewards already require the referred customer's genuine first
  -- completed trip — see trg_referral_reward_on_first_completed_trip above
  -- — so this heuristic exists purely to catch volume, not to re-validate
  -- eligibility, which is already enforced where the reward is granted).
  select 'excessive_referral_rewards', 'medium', 'customer', rr.referrer_id, cu.full_name,
         count(*)::text || ' récompenses de parrainage perçues, dont ' ||
           count(*) filter (where rr.created_at > now() - interval '24 hours')::text ||
           ' au cours des dernières 24h',
         max(rr.created_at)
  from referral_reward rr
  join customer cu on cu.id = rr.referrer_id
  group by rr.referrer_id, cu.full_name
  having count(*) >= 10
      or count(*) filter (where rr.created_at > now() - interval '24 hours') >= 5;
$$;


ALTER FUNCTION "public"."list_fraud_signals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_admin_action"("p_admin" "uuid", "p_action" "text", "p_target_type" "text", "p_target_id" "text", "p_before" "jsonb" DEFAULT NULL::"jsonb", "p_after" "jsonb" DEFAULT NULL::"jsonb", "p_reason" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
declare v_id uuid;
begin
  insert into admin_audit_log (admin_user_id, action, target_type, target_id, before_data, after_data, reason)
  values (p_admin, p_action, p_target_type, p_target_id, p_before, p_after, p_reason)
  returning id into v_id;
  return v_id;
end;
$$;


ALTER FUNCTION "public"."log_admin_action"("p_admin" "uuid", "p_action" "text", "p_target_type" "text", "p_target_id" "text", "p_before" "jsonb", "p_after" "jsonb", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_search"("p_from_wilaya" integer, "p_to_wilaya" integer, "p_from_commune" integer, "p_to_commune" integer, "p_date_from" "date", "p_date_to" "date", "p_results_count" integer) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  insert into search_log (from_wilaya_id, to_wilaya_id, from_commune_id, to_commune_id, date_from, date_to, results_count)
  values (p_from_wilaya, p_to_wilaya, p_from_commune, p_to_commune, p_date_from, p_date_to, p_results_count);
end;
$$;


ALTER FUNCTION "public"."log_search"("p_from_wilaya" integer, "p_to_wilaya" integer, "p_from_commune" integer, "p_to_commune" integer, "p_date_from" "date", "p_date_to" "date", "p_results_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_all_notifications_read"("p_user" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
declare v_n integer;
begin
  update notification set read_at = now() where recipient_user_id = p_user and read_at is null;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;


ALTER FUNCTION "public"."mark_all_notifications_read"("p_user" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_conversation_read"("p_conversation" "uuid", "p_reader_role" "text") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
declare v_n integer;
begin
  update message set read_at = now()
  where conversation_id = p_conversation and read_at is null and sender_role <> p_reader_role;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;


ALTER FUNCTION "public"."mark_conversation_read"("p_conversation" "uuid", "p_reader_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_notification_read"("p_notification" "uuid", "p_user" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  update notification set read_at = coalesce(read_at, now())
  where id = p_notification and recipient_user_id = p_user;
end;
$$;


ALTER FUNCTION "public"."mark_notification_read"("p_notification" "uuid", "p_user" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_payout_batch_paid"("p_batch" "uuid", "p_reference" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare v_status text;
begin
  select status into v_status from payout_batch where id = p_batch for update;
  if v_status is null then
    raise exception 'Payout batch not found' using errcode = 'DZ781';
  end if;
  if v_status = 'paid' then
    raise exception 'Payout batch has already been marked as paid' using errcode = 'DZ782';
  end if;
  update payout_batch set status = 'paid', reference = p_reference, paid_at = now() where id = p_batch;
end;
$$;


ALTER FUNCTION "public"."mark_payout_batch_paid"("p_batch" "uuid", "p_reference" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."moderate_rating"("p_rating" "uuid", "p_admin" "uuid", "p_hide" boolean, "p_reason" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  if p_hide and (p_reason is null or btrim(p_reason) = '') then
    raise exception 'A moderation reason is required to hide a rating' using errcode = 'DZ001';
  end if;
  update rating
     set hidden_at         = case when p_hide then now() else null end,
         moderation_reason = case when p_hide then btrim(p_reason) else null end,
         moderated_by      = p_admin
   where id = p_rating;
  if not found then
    raise exception 'Rating not found' using errcode = 'DZ001';
  end if;
end;
$$;


ALTER FUNCTION "public"."moderate_rating"("p_rating" "uuid", "p_admin" "uuid", "p_hide" boolean, "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_admins"("p_type" "text", "p_title" "text", "p_body" "text", "p_data" "jsonb" DEFAULT '{}'::"jsonb", "p_admin_role" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  insert into notification (recipient_user_id, type, title, body, data)
  select u.id, p_type, p_title, p_body, p_data
  from app_user u
  where u.role = 'admin'
    and (p_admin_role is null or u.admin_role = p_admin_role or u.admin_role = 'super_admin');
end;
$$;


ALTER FUNCTION "public"."notify_admins"("p_type" "text", "p_title" "text", "p_body" "text", "p_data" "jsonb", "p_admin_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_customer"("p_customer" "uuid", "p_type" "text", "p_title" "text", "p_body" "text", "p_data" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  if p_customer is null then return; end if;
  insert into notification (recipient_user_id, type, title, body, data)
  select u.id, p_type, p_title, p_body, p_data from app_user u where u.customer_id = p_customer;
end;
$$;


ALTER FUNCTION "public"."notify_customer"("p_customer" "uuid", "p_type" "text", "p_title" "text", "p_body" "text", "p_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_driver"("p_driver" "uuid", "p_type" "text", "p_title" "text", "p_body" "text", "p_data" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  if p_driver is null then return; end if;
  insert into notification (recipient_user_id, type, title, body, data)
  select u.id, p_type, p_title, p_body, p_data from app_user u where u.driver_id = p_driver;
end;
$$;


ALTER FUNCTION "public"."notify_driver"("p_driver" "uuid", "p_type" "text", "p_title" "text", "p_body" "text", "p_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_favorites_of_publish"("p_trip" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare v_traj uuid; v_driver uuid;
begin
  select trajectory_id, driver_id into v_traj, v_driver from trip where id = p_trip;

  perform notify_customer(fr.customer_id, 'favorite_route_trip',
    'Nouveau voyage sur votre trajet favori',
    'Un nouveau voyage est disponible sur votre trajet favori.',
    jsonb_build_object('trip_id', p_trip))
  from favorite_route fr
  where fr.notify
    and exists (select 1 from trip_stop ts where ts.trip_id = p_trip and ts.wpoint_id = fr.origin_wpoint_id)
    and exists (select 1 from trip_stop ts where ts.trip_id = p_trip and ts.wpoint_id = fr.destination_wpoint_id);

  if v_driver is not null then
    perform notify_customer(fd.customer_id, 'favorite_driver_trip',
      'Votre chauffeur favori publie un nouveau voyage',
      'Un nouveau voyage est disponible avec un chauffeur que vous suivez.',
      jsonb_build_object('trip_id', p_trip, 'driver_id', v_driver))
    from favorite_driver fd
    where fd.notify and fd.driver_id = v_driver;
  end if;
end;
$$;


ALTER FUNCTION "public"."notify_favorites_of_publish"("p_trip" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pay_reservation_with_wallet"("p_reservation" "uuid", "p_amount" numeric DEFAULT NULL::numeric) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_res     reservation%rowtype;
  v_amt     numeric;
  v_payment uuid;
begin
  select * into v_res from reservation where id = p_reservation for update;
  if not found then
    raise exception 'Reservation not found' using errcode = 'DZ401';
  end if;
  if v_res.status = 'cancelled' then
    raise exception 'Cancelled reservation is not payable' using errcode = 'DZ403';
  end if;

  v_amt := coalesce(p_amount, greatest(v_res.total_price - amount_paid(p_reservation), 0));
  if v_amt <= 0 then
    raise exception 'Payment amount must be > 0' using errcode = 'DZ001';
  end if;

  v_payment := record_payment(p_reservation, v_amt, 'wallet', null);
  perform wallet_debit(v_res.customer_id, v_amt, 'booking_debit', p_reservation, v_payment,
                        'Paiement réservation ' || v_res.code);
  perform settle_payment(v_payment);

  if amount_paid(p_reservation) >= v_res.total_price and v_res.status = 'pending' then
    begin
      perform confirm_reservation(p_reservation);
    exception when others then
      null; -- capacity gone meanwhile — payment still recorded, same as the gateway path; admin follow-up
    end;
  end if;

  return v_payment;
end;
$$;


ALTER FUNCTION "public"."pay_reservation_with_wallet"("p_reservation" "uuid", "p_amount" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."populate_trip_stops"("p_trip" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
declare v_traj uuid; v_n integer;
begin
  select trajectory_id into v_traj from trip where id = p_trip;
  if v_traj is null then
    raise exception 'Trip % not found', p_trip using errcode = 'DZ301';
  end if;

  insert into trip_stop (trip_id, trajectory_id, wpoint_id)
  select p_trip, v_traj, w.id
  from wpoint w
  where w.trajectory_id = v_traj
  on conflict (trip_id, wpoint_id) do nothing;

  get diagnostics v_n = row_count;
  return v_n;
end;
$$;


ALTER FUNCTION "public"."populate_trip_stops"("p_trip" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."promote_waitlist"("p_trip" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
declare
  v_entry  waitlist_entry%rowtype;
  v_free   integer;
  v_res_id uuid;
  v_pickup uuid;
  v_dropoff uuid;
  v_count  integer := 0;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_trip::text, 1));

  for v_entry in
    select * from waitlist_entry
    where trip_id = p_trip and status = 'waiting'
    order by position asc
  loop
    v_pickup  := v_entry.pickup_wpoint_id;
    v_dropoff := v_entry.dropoff_wpoint_id;
    v_free := seats_available(p_trip, v_pickup, v_dropoff);
    if v_free is not null and v_entry.seats <= v_free then
      begin
        v_res_id := reserve(p_trip, v_entry.customer_id, v_entry.seats, v_pickup, v_dropoff,
                            'Promu depuis la liste d''attente');
        perform confirm_reservation(v_res_id);
        update waitlist_entry
        set status = 'promoted', promoted_at = now(), reservation_id = v_res_id
        where id = v_entry.id;
        perform notify_customer(v_entry.customer_id, 'waitlist_promoted',
          'Place disponible !', 'Une place s''est libérée et votre réservation a été confirmée automatiquement.',
          jsonb_build_object('reservation_id', v_res_id, 'trip_id', p_trip));
        v_count := v_count + 1;
      exception when others then
        -- A race (e.g. the freed seat vanished again) must not abort the
        -- whole sweep — leave this entry waiting and move on.
        null;
      end;
    end if;
  end loop;

  return v_count;
end;
$$;


ALTER FUNCTION "public"."promote_waitlist"("p_trip" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_driver_no_show"("p_trip" "uuid", "p_notes" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_status trip_status;
  v_driver uuid;
begin
  select status, driver_id into v_status, v_driver from trip where id = p_trip for update;
  if v_status is null then
    raise exception 'Trip not found' using errcode = 'DZ301';
  end if;
  if v_status <> 'scheduled' then
    raise exception 'Driver no-show can only be recorded on a trip that has not started' using errcode = 'DZ309';
  end if;
  if v_driver is null then
    raise exception 'Trip has no assigned driver' using errcode = 'DZ309';
  end if;

  insert into no_show_event (trip_id, driver_id, kind, notes)
  values (p_trip, v_driver, 'driver', p_notes);

  update trip set status = 'cancelled' where id = p_trip;

  update reservation set status = 'cancelled'
  where trip_id = p_trip and status in ('pending','confirmed');
end;
$$;


ALTER FUNCTION "public"."record_driver_no_show"("p_trip" "uuid", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_payment"("p_reservation" "uuid", "p_amount" numeric, "p_method" "public"."payment_method", "p_reference" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_res       reservation%rowtype;
  v_id        uuid;
  v_committed numeric;
begin
  select * into v_res from reservation where id = p_reservation for update;
  if not found then
    raise exception 'Reservation not found' using errcode = 'DZ401';
  end if;

  if v_res.status = 'cancelled' then
    raise exception 'Cancelled reservation is not payable' using errcode = 'DZ403';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be > 0' using errcode = 'DZ001';
  end if;

  select amount_paid(p_reservation)
       + coalesce((select sum(amount) from payment
                   where reservation_id = p_reservation and status = 'pending'), 0)
  into v_committed;

  if v_committed + p_amount > v_res.total_price then
    raise exception 'Payment exceeds reservation total' using errcode = 'DZ503';
  end if;

  insert into payment (code, reservation_id, amount, currency, method, status, reference)
  values ('PAY-' || to_char(now(), 'YYYYMM') || '-' || lpad(nextval('seq_business_code')::text, 6, '0'),
          p_reservation, p_amount, v_res.currency, p_method, 'pending', p_reference)
  returning id into v_id;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."record_payment"("p_reservation" "uuid", "p_amount" numeric, "p_method" "public"."payment_method", "p_reference" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_payout_refund_clawback"("p_reservation" "uuid", "p_payment" "uuid", "p_refund_amount" numeric) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_driver uuid;
  v_trip   uuid;
  v_pct    numeric;
begin
  select driver_id, trip_id, commission_pct into v_driver, v_trip, v_pct
    from payout_ledger where reservation_id = p_reservation and entry_type = 'earning'
    order by created_at desc limit 1;
  if v_driver is null then
    return; -- no prior earning recorded for this reservation — nothing to claw back
  end if;

  insert into payout_ledger (driver_id, trip_id, reservation_id, payment_id, entry_type,
                              gross_amount, commission_pct, commission_amount, net_amount)
  values (v_driver, v_trip, p_reservation, p_payment, 'refund_adjustment',
          -p_refund_amount, v_pct, -round(p_refund_amount * v_pct / 100.0, 2),
          -round(p_refund_amount * (1 - v_pct / 100.0), 2));
end;
$$;


ALTER FUNCTION "public"."record_payout_refund_clawback"("p_reservation" "uuid", "p_payment" "uuid", "p_refund_amount" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."redeem_promo_code"("p_customer" "uuid", "p_code" "text", "p_basis_amount" numeric, "p_reservation" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_promo_id   uuid;
  v_discount   numeric;
  v_redemption uuid;
begin
  select promo_id, discount_amount into v_promo_id, v_discount
    from compute_promo_discount(p_code, p_basis_amount, p_customer);

  insert into promo_redemption (promo_code_id, customer_id, reservation_id, discount_amount)
  values (v_promo_id, p_customer, p_reservation, v_discount)
  returning id into v_redemption;

  perform wallet_credit(p_customer, 'promo_credit', v_discount, p_reservation, v_redemption,
                         'Code promo ' || upper(btrim(p_code)));

  return v_redemption;
end;
$$;


ALTER FUNCTION "public"."redeem_promo_code"("p_customer" "uuid", "p_code" "text", "p_basis_amount" numeric, "p_reservation" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refund_payment"("p_payment" "uuid", "p_amount" numeric DEFAULT NULL::numeric) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_pay       payment%rowtype;
  v_remaining numeric;
  v_amt       numeric;
begin
  select * into v_pay from payment where id = p_payment for update;
  if not found then
    raise exception 'Payment not found' using errcode = 'DZ501';
  end if;

  if v_pay.status not in ('paid','partially_refunded') then
    raise exception 'Invalid payment transition' using errcode = 'DZ502';
  end if;

  v_remaining := v_pay.amount - v_pay.refunded_amount;
  v_amt := coalesce(p_amount, v_remaining);

  if v_amt <= 0 or v_amt > v_remaining then
    raise exception 'Invalid refund amount' using errcode = 'DZ505';
  end if;

  update payment
  set refunded_amount = v_pay.refunded_amount + v_amt,
      status = case when v_pay.refunded_amount + v_amt >= v_pay.amount
                    then 'refunded'::payment_status
                    else 'partially_refunded'::payment_status end
  where id = p_payment;
end;
$$;


ALTER FUNCTION "public"."refund_payment"("p_payment" "uuid", "p_amount" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_favorite_driver"("p_id" "uuid", "p_customer" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  delete from favorite_driver where id = p_id and customer_id = p_customer;
  if not found then
    raise exception 'Unknown favorite id' using errcode = 'DZ821';
  end if;
end;
$$;


ALTER FUNCTION "public"."remove_favorite_driver"("p_id" "uuid", "p_customer" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_favorite_route"("p_id" "uuid", "p_customer" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  delete from favorite_route where id = p_id and customer_id = p_customer;
  if not found then
    raise exception 'Unknown favorite id' using errcode = 'DZ821';
  end if;
end;
$$;


ALTER FUNCTION "public"."remove_favorite_route"("p_id" "uuid", "p_customer" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reserve"("p_trip" "uuid", "p_customer" "uuid", "p_seats" integer, "p_pickup_wpoint" "uuid" DEFAULT NULL::"uuid", "p_dropoff_wpoint" "uuid" DEFAULT NULL::"uuid", "p_notes" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_trip      trip%rowtype;
  v_total     numeric(12,2);
  v_unit      numeric(12,2);
  v_free      integer;
  v_id        uuid;
  v_pick_pos  integer;
  v_drop_pos  integer;
  v_has_stops boolean;
begin
  if p_seats is null or p_seats < 1 or p_seats > 30 then
    raise exception 'Seats must be between 1 and 30' using errcode = 'DZ001';
  end if;

  if not exists (select 1 from customer where id = p_customer) then
    raise exception 'Customer not found' using errcode = 'DZ404';
  end if;

  select * into v_trip from trip where id = p_trip for update;
  if not found then
    raise exception 'Trip not found' using errcode = 'DZ301';
  end if;

  if v_trip.published_at is null then
    raise exception 'Trip is not published' using errcode = 'DZ302';
  end if;

  if v_trip.status <> 'scheduled' or v_trip.departure_at <= now() then
    raise exception 'Trip is not bookable' using errcode = 'DZ302';
  end if;

  v_free := seats_available(p_trip, p_pickup_wpoint, p_dropoff_wpoint);
  if v_free is null or p_seats > v_free then
    raise exception 'Insufficient seats' using errcode = 'DZ303';
  end if;

  v_has_stops := exists (select 1 from trip_stop where trip_id = p_trip);

  if p_pickup_wpoint is not null then
    select position into v_pick_pos
    from wpoint
    where id = p_pickup_wpoint and trajectory_id = v_trip.trajectory_id;

    if v_pick_pos is null
       or (v_has_stops and not exists (select 1 from trip_stop
                                       where trip_id = p_trip and wpoint_id = p_pickup_wpoint)) then
      raise exception 'Invalid pickup stop' using errcode = 'DZ601';
    end if;
  end if;

  if p_dropoff_wpoint is not null then
    select position into v_drop_pos
    from wpoint
    where id = p_dropoff_wpoint and trajectory_id = v_trip.trajectory_id;

    if v_drop_pos is null
       or (v_has_stops and not exists (select 1 from trip_stop
                                       where trip_id = p_trip and wpoint_id = p_dropoff_wpoint)) then
      raise exception 'Invalid dropoff stop' using errcode = 'DZ601';
    end if;
  end if;

  if v_pick_pos is not null and v_drop_pos is not null and v_pick_pos >= v_drop_pos then
    raise exception 'Invalid route order' using errcode = 'DZ603';
  end if;

  if p_pickup_wpoint is not null and p_dropoff_wpoint is not null then
    select tp.price into v_unit
    from trip_price tp
    where tp.trip_id = p_trip
      and tp.from_wpoint_id = p_pickup_wpoint
      and tp.to_wpoint_id   = p_dropoff_wpoint;

    if v_unit is null then
      raise exception 'Trip price not defined' using errcode = 'DZ308';
    end if;

    v_total := p_seats * v_unit;
  else
    v_total := p_seats * v_trip.seat_price; -- fallback
  end if;

  insert into reservation (code, trip_id, trajectory_id, customer_id, seats,
                           pickup_wpoint_id, dropoff_wpoint_id, total_price, currency, notes)
  values ('RES-' || to_char(now(), 'YYYYMM') || '-' || lpad(nextval('seq_business_code')::text, 6, '0'),
          p_trip, v_trip.trajectory_id, p_customer, p_seats,
          p_pickup_wpoint, p_dropoff_wpoint, v_total, v_trip.currency, p_notes)
  returning id into v_id;

  perform notify_customer(p_customer, 'booking_request',
    'Demande de réservation envoyée', 'Votre demande de réservation ' ||
    (select code from reservation where id = v_id) || ' est en attente de confirmation.',
    jsonb_build_object('reservation_id', v_id, 'trip_id', p_trip));

  return v_id;
end;
$$;


ALTER FUNCTION "public"."reserve"("p_trip" "uuid", "p_customer" "uuid", "p_seats" integer, "p_pickup_wpoint" "uuid", "p_dropoff_wpoint" "uuid", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_commune"("p_wilaya_id" integer, "p_name" "text") RETURNS integer
    LANGUAGE "sql" STABLE
    AS $$
  select c.id
  from commune c
  where c.wilaya_id = p_wilaya_id
    and btrim(p_name) <> ''
    and (   lower(c.nom_fr) = lower(btrim(p_name))
         or lower(c.nom_ar) = lower(btrim(p_name))
         or lower(c.nom_en) = lower(btrim(p_name)))
  order by (c.nom_fr = btrim(p_name)) desc, c.id
  limit 1;
$$;


ALTER FUNCTION "public"."resolve_commune"("p_wilaya_id" integer, "p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_daira"("p_wilaya_id" integer, "p_name" "text") RETURNS smallint
    LANGUAGE "sql" STABLE
    AS $$
  select d.id
  from daira d
  where d.wilaya_id = p_wilaya_id
    and btrim(p_name) <> ''
    and (   lower(d.nom_fr) = lower(btrim(p_name))
         or lower(d.nom_ar) = lower(btrim(p_name))
         or lower(d.nom_en) = lower(btrim(p_name)))
  order by (d.nom_fr = btrim(p_name)) desc, d.id
  limit 1;
$$;


ALTER FUNCTION "public"."resolve_daira"("p_wilaya_id" integer, "p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_sos_event"("p_event" "uuid", "p_admin" "uuid", "p_notes" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare v_before jsonb;
begin
  select to_jsonb(s) into v_before from sos_event s where s.id = p_event;
  update sos_event set status = 'resolved', resolved_at = now(), resolved_by = p_admin, notes = coalesce(p_notes, notes)
  where id = p_event;
  if not found then
    raise exception 'Unknown SOS event id' using errcode = 'DZ871';
  end if;
  perform log_admin_action(p_admin, 'resolve_sos', 'sos_event', p_event::text, v_before,
    jsonb_build_object('status', 'resolved'), p_notes);
end;
$$;


ALTER FUNCTION "public"."resolve_sos_event"("p_event" "uuid", "p_admin" "uuid", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_wilaya"("p_name" "text") RETURNS smallint
    LANGUAGE "sql" STABLE
    AS $_$
  select w.id
  from wilaya w
  where btrim(p_name) <> ''
    and (   lower(w.nom_fr) = lower(btrim(p_name))
         or lower(w.nom_ar) = lower(btrim(p_name))
         or lower(w.nom_en) = lower(btrim(p_name))
         or (btrim(p_name) ~ '^[0-9]{1,2}$' and w.code = lpad(btrim(p_name), 2, '0')))
  order by (w.nom_fr = btrim(p_name)) desc, w.id
  limit 1;
$_$;


ALTER FUNCTION "public"."resolve_wilaya"("p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."retry_refund"("p_refund" "uuid", "p_admin" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_ref refund%rowtype;
begin
  select * into v_ref from refund where id = p_refund for update;
  if v_ref.id is null then
    raise exception 'Refund not found' using errcode = 'DZ741';
  end if;
  if v_ref.status <> 'failed' then
    raise exception 'Only a failed refund can be retried' using errcode = 'DZ744';
  end if;
  return apply_refund(v_ref.payment_id, v_ref.amount, 'admin', coalesce(p_admin, v_ref.admin_id), v_ref.policy_pct);
end;
$$;


ALTER FUNCTION "public"."retry_refund"("p_refund" "uuid", "p_admin" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reveal_contact"("p_reservation" "uuid", "p_requester_role" "text", "p_requester_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_res reservation%rowtype;
  v_driver_id uuid;
  v_phone text;
begin
  select * into v_res from reservation where id = p_reservation;
  if not found then
    raise exception 'Reservation not found' using errcode = 'DZ401';
  end if;
  select driver_id into v_driver_id from trip where id = v_res.trip_id;

  if p_requester_role = 'customer' and p_requester_id = v_res.customer_id then
    select phone into v_phone from driver where id = v_driver_id;
  elsif p_requester_role = 'driver' and p_requester_id = v_driver_id then
    select phone into v_phone from customer where id = v_res.customer_id;
  else
    raise exception 'Only the driver/customer of this reservation may request contact' using errcode = 'DZ861';
  end if;

  if v_phone is null then
    raise exception 'Only the driver/customer of this reservation may request contact' using errcode = 'DZ861';
  end if;

  insert into contact_reveal_log (reservation_id, requester_role, requester_id, revealed_phone)
  values (p_reservation, p_requester_role, p_requester_id, v_phone);

  return v_phone;
end;
$$;


ALTER FUNCTION "public"."reveal_contact"("p_reservation" "uuid", "p_requester_role" "text", "p_requester_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revoke_share_token"("p_token_id" "uuid", "p_reservation" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  update trip_share_token set revoked_at = now()
  where id = p_token_id and reservation_id = p_reservation and revoked_at is null;
  if not found then
    raise exception 'Unknown or invalid share link' using errcode = 'DZ862';
  end if;
end;
$$;


ALTER FUNCTION "public"."revoke_share_token"("p_token_id" "uuid", "p_reservation" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."run_trip_lifecycle_tick"() RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_grace_min       integer;
  v_close_min       integer;
  v_reminder_min    integer;
  v_reminder24_min  integer;
  v_trip            record;
  v_started         integer := 0;
  v_noshow          integer := 0;
  v_cancelled       integer := 0;
  v_closed          integer := 0;
  v_reminded        integer := 0;
  v_reminded24      integer := 0;
begin
  select coalesce((select value from app_setting where key = 'trip_scheduler_grace_minutes')::int, 30) into v_grace_min;
  select coalesce((select value from app_setting where key = 'trip_scheduler_autoclose_grace_minutes')::int, 120) into v_close_min;
  select coalesce((select value from app_setting where key = 'trip_reminder_lead_minutes')::int, 60) into v_reminder_min;
  select coalesce((select value from app_setting where key = 'trip_reminder_24h_lead_minutes')::int, 1440) into v_reminder24_min;

  -- scheduled, past departure, still within grace -> auto-start
  for v_trip in
    select id from trip
    where status = 'scheduled' and published_at is not null
      and departure_at <= now() and departure_at > now() - make_interval(mins => v_grace_min)
    for update skip locked
  loop
    perform start_trip(v_trip.id);
    v_started := v_started + 1;
  end loop;

  -- scheduled, past grace window
  for v_trip in
    select id, driver_id from trip
    where status = 'scheduled' and published_at is not null
      and departure_at <= now() - make_interval(mins => v_grace_min)
    for update skip locked
  loop
    if v_trip.driver_id is not null then
      perform record_driver_no_show(v_trip.id, 'Automatique : départ manqué au-delà du délai de grâce');
      v_noshow := v_noshow + 1;
    else
      call sp_cancel_trip(v_trip.id);
      v_cancelled := v_cancelled + 1;
    end if;
  end loop;

  -- in_progress long past its ETA (or, lacking one, past departure + 2x
  -- the auto-close grace) and nobody manually closed it -> auto-close
  for v_trip in
    select id from trip
    where status = 'in_progress'
      and coalesce(arrival_eta, departure_at + make_interval(mins => v_close_min))
          <= now() - make_interval(mins => v_close_min)
    for update skip locked
  loop
    call sp_close_trip(v_trip.id);
    v_closed := v_closed + 1;
  end loop;

  -- Task 11.1/13.4 — T-24h reminder (one-shot per trip via reminder_24h_sent_at)
  for v_trip in
    select id from trip
    where status = 'scheduled' and published_at is not null and reminder_24h_sent_at is null
      and departure_at <= now() + make_interval(mins => v_reminder24_min) and departure_at > now()
    for update skip locked
  loop
    perform notify_customer(r.customer_id, 'trip_reminder', 'Départ demain',
      'Votre voyage ' || r.code || ' part dans environ 24 heures.',
      jsonb_build_object('reservation_id', r.id, 'trip_id', v_trip.id, 'lead', '24h'))
    from reservation r where r.trip_id = v_trip.id and r.status in ('pending','confirmed');

    update trip set reminder_24h_sent_at = now() where id = v_trip.id;
    v_reminded24 := v_reminded24 + 1;
  end loop;

  -- Task 11.1/13.4 — T-1h reminder (one-shot per trip via reminder_sent_at)
  for v_trip in
    select id from trip
    where status = 'scheduled' and published_at is not null and reminder_sent_at is null
      and departure_at <= now() + make_interval(mins => v_reminder_min) and departure_at > now()
    for update skip locked
  loop
    perform notify_customer(r.customer_id, 'trip_reminder', 'Départ dans moins d''une heure',
      'Votre voyage ' || r.code || ' part bientôt, soyez prêt !',
      jsonb_build_object('reservation_id', r.id, 'trip_id', v_trip.id, 'lead', '1h'))
    from reservation r where r.trip_id = v_trip.id and r.status in ('pending','confirmed');

    update trip set reminder_sent_at = now() where id = v_trip.id;
    v_reminded := v_reminded + 1;
  end loop;

  return jsonb_build_object(
    'started', v_started, 'driver_no_show', v_noshow, 'cancelled_no_driver', v_cancelled,
    'auto_closed', v_closed, 'reminded', v_reminded, 'reminded_24h', v_reminded24
  );
end;
$$;


ALTER FUNCTION "public"."run_trip_lifecycle_tick"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."seats_available"("p_trip" "uuid", "p_from_wpoint" "uuid" DEFAULT NULL::"uuid", "p_to_wpoint" "uuid" DEFAULT NULL::"uuid") RETURNS integer
    LANGUAGE "plpgsql" STABLE
    AS $$
declare
  v_capacity   smallint;
  v_trajectory uuid;
  v_min_pos    integer;
  v_max_pos    integer;
  v_pos_from   integer;
  v_pos_to     integer;
  v_result     integer;
begin
  select capacity, trajectory_id into v_capacity, v_trajectory from trip where id = p_trip;
  if v_capacity is null then
    return null;
  end if;

  select min(position), max(position) into v_min_pos, v_max_pos
  from wpoint where trajectory_id = v_trajectory;

  if p_from_wpoint is not null or p_to_wpoint is not null then
    v_pos_from := coalesce((select position from wpoint where id = p_from_wpoint and trajectory_id = v_trajectory), v_min_pos);
    v_pos_to   := coalesce((select position from wpoint where id = p_to_wpoint   and trajectory_id = v_trajectory), v_max_pos);

    select v_capacity - coalesce(sum(r.seats), 0)::int into v_result
      from reservation r
      left join wpoint wf on wf.id = r.pickup_wpoint_id
      left join wpoint wt on wt.id = r.dropoff_wpoint_id
     where r.trip_id = p_trip
       and r.status in ('pending','confirmed')
       and coalesce(wf.position, v_min_pos) < v_pos_to
       and coalesce(wt.position,   v_max_pos) > v_pos_from;

    return v_result;
  end if;

  -- No segment given: report the worst-case bottleneck across every
  -- elementary adjacent-stop segment of the route.
  return (
    with stops as (
      select position, lead(position) over (order by position) as next_position
      from wpoint where trajectory_id = v_trajectory
    ),
    segments as (
      select position, next_position from stops where next_position is not null
    ),
    occ as (
      select s.position, s.next_position,
             coalesce((
               select sum(r.seats) from reservation r
               where r.trip_id = p_trip
                 and r.status in ('pending','confirmed')
                 and coalesce((select position from wpoint where id = r.pickup_wpoint_id),  v_min_pos) < s.next_position
                 and coalesce((select position from wpoint where id = r.dropoff_wpoint_id), v_max_pos) > s.position
             ), 0)::int as held
        from segments s
    )
    select coalesce(min(v_capacity - held), v_capacity) from occ
  );
end;
$$;


ALTER FUNCTION "public"."seats_available"("p_trip" "uuid", "p_from_wpoint" "uuid", "p_to_wpoint" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."select_commune"("p_wpoint" "uuid", "p_commune" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_wilaya_id  smallint;
  v_commune_id integer;
begin
  select wilaya_id into v_wilaya_id from wpoint where id = p_wpoint;
  if v_wilaya_id is null then
    raise exception 'WPoint % not found', p_wpoint using errcode = 'DZ205';
  end if;

  v_commune_id := resolve_commune(v_wilaya_id, p_commune);
  if v_commune_id is null then
    raise exception 'Invalid Commune %', p_commune using errcode = 'DZ203';
  end if;

  insert into wpoint_commune (wpoint_id, wilaya_id, commune_id)
  values (p_wpoint, v_wilaya_id, v_commune_id)
  on conflict (wpoint_id, commune_id) do nothing;
end;
$$;


ALTER FUNCTION "public"."select_commune"("p_wpoint" "uuid", "p_commune" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."select_daira"("p_wpoint" "uuid", "p_daira" "text") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
declare
  v_wilaya_id smallint;
  v_daira_id  smallint;
  v_added     integer;
begin
  select wilaya_id into v_wilaya_id from wpoint where id = p_wpoint;
  if v_wilaya_id is null then
    raise exception 'WPoint % not found', p_wpoint using errcode = 'DZ205';
  end if;

  v_daira_id := resolve_daira(v_wilaya_id, p_daira);
  if v_daira_id is null then
    raise exception 'Invalid Daira %', p_daira using errcode = 'DZ202';
  end if;

  insert into wpoint_commune (wpoint_id, wilaya_id, commune_id)
  select p_wpoint, v_wilaya_id, c.id
  from commune c
  where c.daira_id = v_daira_id
  on conflict (wpoint_id, commune_id) do nothing;

  get diagnostics v_added = row_count;
  return v_added;
end;
$$;


ALTER FUNCTION "public"."select_daira"("p_wpoint" "uuid", "p_daira" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_message"("p_conversation" "uuid", "p_sender_role" "text", "p_sender_id" "uuid", "p_body" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_conv       conversation%rowtype;
  v_res        reservation%rowtype;
  v_driver_id  uuid;
  v_recent     integer;
  v_limit      integer;
  v_id         uuid;
  v_body       text := btrim(coalesce(p_body, ''));
begin
  select * into v_conv from conversation where id = p_conversation;
  if not found then
    raise exception 'Unknown conversation id' using errcode = 'DZ851';
  end if;
  select * into v_res from reservation where id = v_conv.reservation_id;
  select driver_id into v_driver_id from trip where id = v_res.trip_id;

  if p_sender_role = 'customer' and p_sender_id <> v_res.customer_id then
    raise exception 'You are not a participant in this conversation' using errcode = 'DZ852';
  elsif p_sender_role = 'driver' and (v_driver_id is null or p_sender_id <> v_driver_id) then
    raise exception 'You are not a participant in this conversation' using errcode = 'DZ852';
  elsif p_sender_role not in ('customer','driver') then
    raise exception 'You are not a participant in this conversation' using errcode = 'DZ852';
  end if;

  if v_body = '' or char_length(v_body) > 2000 then
    raise exception 'Message body cannot be empty' using errcode = 'DZ853';
  end if;

  select coalesce((select value from app_setting where key = 'message_rate_limit_per_5min')::int, 20) into v_limit;
  select count(*) into v_recent from message
  where conversation_id = p_conversation and sender_role = p_sender_role and sender_id = p_sender_id
    and created_at > now() - interval '5 minutes';
  if v_recent >= v_limit then
    raise exception 'Too many messages sent in a short period — please slow down' using errcode = 'DZ854';
  end if;

  insert into message (conversation_id, sender_role, sender_id, body)
  values (p_conversation, p_sender_role, p_sender_id, v_body)
  returning id into v_id;

  if p_sender_role = 'customer' then
    perform notify_driver(v_driver_id, 'new_message', 'Nouveau message', v_body, jsonb_build_object('conversation_id', p_conversation));
  else
    perform notify_customer(v_res.customer_id, 'new_message', 'Nouveau message', v_body, jsonb_build_object('conversation_id', p_conversation));
  end if;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."send_message"("p_conversation" "uuid", "p_sender_role" "text", "p_sender_id" "uuid", "p_body" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_reservation_communes"("p_reservation" "uuid", "p_pickup_commune" integer DEFAULT NULL::integer, "p_dropoff_commune" integer DEFAULT NULL::integer) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_pickup_wpoint   uuid;
  v_dropoff_wpoint  uuid;
  v_wpoint_wilaya   smallint;
  v_commune_wilaya  smallint;
begin
  select pickup_wpoint_id, dropoff_wpoint_id into v_pickup_wpoint, v_dropoff_wpoint
  from reservation where id = p_reservation for update;
  if not found then
    raise exception 'Reservation % not found', p_reservation using errcode = 'DZ401';
  end if;

  if p_pickup_commune is not null then
    if v_pickup_wpoint is null then
      raise exception 'Reservation has no pickup WPoint to validate a commune against' using errcode = 'DZ601';
    end if;
    select wilaya_id into v_wpoint_wilaya from wpoint where id = v_pickup_wpoint;
    select wilaya_id into v_commune_wilaya from commune where id = p_pickup_commune;
    if v_commune_wilaya is null or v_commune_wilaya <> v_wpoint_wilaya then
      raise exception 'Pickup commune does not belong to the pickup wilaya' using errcode = 'DZ203';
    end if;
    if exists (select 1 from wpoint_commune where wpoint_id = v_pickup_wpoint)
       and not exists (select 1 from wpoint_commune where wpoint_id = v_pickup_wpoint and commune_id = p_pickup_commune)
    then
      raise exception 'Pickup commune is not served by this stop' using errcode = 'DZ604';
    end if;
  end if;

  if p_dropoff_commune is not null then
    if v_dropoff_wpoint is null then
      raise exception 'Reservation has no dropoff WPoint to validate a commune against' using errcode = 'DZ601';
    end if;
    select wilaya_id into v_wpoint_wilaya from wpoint where id = v_dropoff_wpoint;
    select wilaya_id into v_commune_wilaya from commune where id = p_dropoff_commune;
    if v_commune_wilaya is null or v_commune_wilaya <> v_wpoint_wilaya then
      raise exception 'Dropoff commune does not belong to the dropoff wilaya' using errcode = 'DZ203';
    end if;
    if exists (select 1 from wpoint_commune where wpoint_id = v_dropoff_wpoint)
       and not exists (select 1 from wpoint_commune where wpoint_id = v_dropoff_wpoint and commune_id = p_dropoff_commune)
    then
      raise exception 'Dropoff commune is not served by this stop' using errcode = 'DZ604';
    end if;
  end if;

  update reservation
  set pickup_commune_id  = coalesce(p_pickup_commune,  pickup_commune_id),
      dropoff_commune_id = coalesce(p_dropoff_commune, dropoff_commune_id)
  where id = p_reservation;
end;
$$;


ALTER FUNCTION "public"."set_reservation_communes"("p_reservation" "uuid", "p_pickup_commune" integer, "p_dropoff_commune" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_reservation_passengers"("p_reservation" "uuid", "p_passengers" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_res        reservation%rowtype;
  v_count      integer;
  v_named_sum  numeric;
  v_null_count integer;
  v_p          jsonb;
begin
  select * into v_res from reservation where id = p_reservation for update;
  if not found then
    raise exception 'Reservation not found' using errcode = 'DZ401';
  end if;

  v_count := jsonb_array_length(p_passengers);
  if v_count <> v_res.seats then
    raise exception 'Number of named passengers must match the reserved seat count' using errcode = 'DZ831';
  end if;

  for v_p in select * from jsonb_array_elements(p_passengers)
  loop
    if coalesce(btrim(v_p ->> 'full_name'), '') = '' then
      raise exception 'Each passenger needs a name' using errcode = 'DZ832';
    end if;
  end loop;

  select count(*) filter (where (elem ->> 'fare_share') is null), sum((elem ->> 'fare_share')::numeric)
  into v_null_count, v_named_sum
  from jsonb_array_elements(p_passengers) elem;

  if v_null_count = 0 and v_named_sum is distinct from v_res.total_price then
    raise exception 'Number of named passengers must match the reserved seat count' using errcode = 'DZ831';
  end if;
  if v_null_count > 0 and v_null_count < v_count then
    raise exception 'Number of named passengers must match the reserved seat count' using errcode = 'DZ831';
  end if;

  delete from reservation_passenger where reservation_id = p_reservation;

  insert into reservation_passenger (reservation_id, full_name, phone, fare_share)
  select p_reservation, elem ->> 'full_name', nullif(elem ->> 'phone', ''), (elem ->> 'fare_share')::numeric
  from jsonb_array_elements(p_passengers) elem;
end;
$$;


ALTER FUNCTION "public"."set_reservation_passengers"("p_reservation" "uuid", "p_passengers" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_reservation_requirements"("p_reservation" "uuid", "p_needs_wheelchair" boolean DEFAULT false, "p_has_pet" boolean DEFAULT false, "p_luggage_count" integer DEFAULT 0, "p_special_requirements" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare v_vehicle_id uuid; v_vehicle vehicle%rowtype;
begin
  select v.vehicle_id into v_vehicle_id
  from reservation r join trip v on v.id = r.trip_id
  where r.id = p_reservation;
  if v_vehicle_id is null and not exists (select 1 from reservation where id = p_reservation) then
    raise exception 'Reservation not found' using errcode = 'DZ401';
  end if;

  if v_vehicle_id is not null then
    select * into v_vehicle from vehicle where id = v_vehicle_id;
    if p_needs_wheelchair and not v_vehicle.wheelchair_accessible then
      raise exception 'Trip/vehicle cannot accommodate the requested service requirement' using errcode = 'DZ841';
    end if;
    if p_has_pet and not v_vehicle.pets_allowed then
      raise exception 'Trip/vehicle cannot accommodate the requested service requirement' using errcode = 'DZ841';
    end if;
  end if;

  update reservation
  set needs_wheelchair     = p_needs_wheelchair,
      has_pet              = p_has_pet,
      luggage_count        = coalesce(p_luggage_count, 0),
      special_requirements = p_special_requirements
  where id = p_reservation;
end;
$$;


ALTER FUNCTION "public"."set_reservation_requirements"("p_reservation" "uuid", "p_needs_wheelchair" boolean, "p_has_pet" boolean, "p_luggage_count" integer, "p_special_requirements" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."settle_payment"("p_payment" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_res_id uuid;
  v_status reservation_status;
  v_res    reservation%rowtype;
  v_pay    payment%rowtype;
begin
  select reservation_id into v_res_id from payment where id = p_payment;
  if v_res_id is null then
    raise exception 'Payment not found' using errcode = 'DZ501';
  end if;

  select * into v_res from reservation where id = v_res_id for update;
  if v_res.status = 'cancelled' then
    raise exception 'Cancelled reservation is not payable' using errcode = 'DZ403';
  end if;

  update payment set status = 'paid' where id = p_payment and status = 'pending' returning * into v_pay;
  if not found then
    raise exception 'Invalid payment transition' using errcode = 'DZ502';
  end if;

  -- Task 11.1 — "payment confirmation" notification (any method: wallet,
  -- gateway webhook, cash, admin manual settlement — all funnel here).
  perform notify_customer(v_res.customer_id, 'payment_confirmed',
    'Paiement confirmé', 'Votre paiement de ' || v_pay.amount || ' ' || v_pay.currency ||
    ' pour la réservation ' || v_res.code || ' a été confirmé.',
    jsonb_build_object('reservation_id', v_res.id, 'payment_id', p_payment));
end;
$$;


ALTER FUNCTION "public"."settle_payment"("p_payment" "uuid") OWNER TO "postgres";


CREATE PROCEDURE "public"."sp_cancel_trip"(IN "p_trip" "uuid")
    LANGUAGE "plpgsql"
    AS $$
declare v_status trip_status;
begin
  select status into v_status from trip where id = p_trip for update;
  if v_status is null then
    raise exception 'Trip not found' using errcode = 'DZ301';
  end if;
  if v_status in ('completed','cancelled') then
    raise exception 'Invalid trip transition' using errcode = 'DZ304';
  end if;

  update trip set status = 'cancelled' where id = p_trip;
end;
$$;


ALTER PROCEDURE "public"."sp_cancel_trip"(IN "p_trip" "uuid") OWNER TO "postgres";


CREATE PROCEDURE "public"."sp_close_trip"(IN "p_trip" "uuid")
    LANGUAGE "plpgsql"
    AS $$
declare v_status trip_status;
begin
  select status into v_status from trip where id = p_trip for update;
  if v_status is null then
    raise exception 'Trip not found' using errcode = 'DZ301';
  end if;
  if v_status <> 'in_progress' then
    raise exception 'Invalid trip transition' using errcode = 'DZ304';
  end if;

  with resolved as (
    update reservation r
    set status = case when amount_paid(r.id) >= r.total_price
                      then 'completed'::reservation_status
                      else 'no_show'::reservation_status end
    where r.trip_id = p_trip and r.status = 'confirmed'
    returning r.id, r.customer_id, r.status, r.code
  )
  insert into no_show_event (trip_id, reservation_id, customer_id, kind)
  select p_trip, id, customer_id, 'customer' from resolved where status = 'no_show';

  -- Task 11.1 — "trip completion" notification.
  perform notify_customer(r.customer_id, 'trip_completed', 'Voyage terminé',
    'Votre voyage ' || r.code || ' est terminé. Merci d''avoir voyagé avec nous !',
    jsonb_build_object('reservation_id', r.id, 'trip_id', p_trip))
  from reservation r where r.trip_id = p_trip and r.status = 'completed';

  update reservation set status = 'cancelled'
  where trip_id = p_trip and status = 'pending';

  update trip set status = 'completed' where id = p_trip;
end;
$$;


ALTER PROCEDURE "public"."sp_close_trip"(IN "p_trip" "uuid") OWNER TO "postgres";


CREATE PROCEDURE "public"."sp_import_algeria_data"(IN "p_data" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
declare
  v_w         jsonb;
  v_d         jsonb;
  v_c         jsonb;
  v_wilaya_id smallint;
  v_daira_id  smallint;
  n_w integer := 0;
  n_d integer := 0;
  n_c integer := 0;
begin
 begin -- Task 12.5 — inner block so a failure can still be logged below
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'Invalid payload' using errcode = 'DZ001';
  end if;

  insert into pays (id, code_iso, nom_ar, nom_fr, nom_en)
  values (1,
          coalesce(p_data #>> '{pays,code_iso}', 'DZ'),
          coalesce(p_data #>> '{pays,nom_ar}',   'الجزائر'),
          coalesce(p_data #>> '{pays,nom_fr}',   'Algérie'),
          coalesce(p_data #>> '{pays,nom_en}',   'Algeria'))
  on conflict (id) do update
    set code_iso = excluded.code_iso,
        nom_ar = excluded.nom_ar, nom_fr = excluded.nom_fr, nom_en = excluded.nom_en;

  for v_w in select el from jsonb_array_elements(coalesce(p_data -> 'wilayas', '[]'::jsonb)) el
  loop
    insert into wilaya (id, code, nom_ar, nom_fr, nom_en)
    values ((v_w ->> 'wilaya_num')::smallint,
            v_w ->> 'code',
            coalesce(v_w ->> 'nom_ar', v_w ->> 'nom_fr'),
            v_w ->> 'nom_fr',
            coalesce(v_w ->> 'nom_en', v_w ->> 'nom_fr'))
    on conflict (id) do update
      set code   = excluded.code,
          nom_ar = excluded.nom_ar,
          nom_fr = excluded.nom_fr,
          nom_en = excluded.nom_en
    returning id into v_wilaya_id;
    n_w := n_w + 1;

    for v_d in select el from jsonb_array_elements(coalesce(v_w -> 'dairas', '[]'::jsonb)) el
    loop
      insert into daira (wilaya_id, nom_ar, nom_fr, nom_en)
      values (v_wilaya_id,
              coalesce(v_d ->> 'nom_ar', v_d ->> 'nom_fr'),
              v_d ->> 'nom_fr',
              coalesce(v_d ->> 'nom_en', v_d ->> 'nom_fr'))
      on conflict (wilaya_id, nom_fr) do update
        set nom_ar = excluded.nom_ar,
            nom_en = excluded.nom_en
      returning id into v_daira_id;
      n_d := n_d + 1;

      for v_c in select el from jsonb_array_elements(coalesce(v_d -> 'communes', '[]'::jsonb)) el
      loop
        insert into commune (daira_id, wilaya_id, nom_ar, nom_fr, nom_en, code_postal)
        values (v_daira_id, v_wilaya_id,
                coalesce(v_c ->> 'nom_ar', v_c ->> 'nom_fr'),
                v_c ->> 'nom_fr',
                coalesce(v_c ->> 'nom_en', v_c ->> 'nom_fr'),
                nullif(v_c ->> 'code_postal', ''))
        on conflict (wilaya_id, nom_fr) do update
          set nom_ar      = excluded.nom_ar,
              nom_en      = excluded.nom_en,
              code_postal = coalesce(excluded.code_postal, commune.code_postal);
        n_c := n_c + 1;
      end loop;
    end loop;
  end loop;

  insert into import_log (nb_wilayas, nb_dairas, nb_communes, payload_bytes, success)
  values (n_w, n_d, n_c, octet_length(p_data::text), true);
 exception when others then
  insert into import_log (nb_wilayas, nb_dairas, nb_communes, payload_bytes, success, error_details)
  values (n_w, n_d, n_c, octet_length(coalesce(p_data::text, '')), false, sqlerrm);
  raise;
 end;
end;
$$;


ALTER PROCEDURE "public"."sp_import_algeria_data"(IN "p_data" "jsonb") OWNER TO "postgres";


CREATE PROCEDURE "public"."sp_populate_trip_prices_from_defaults"(IN "p_trip" "uuid", IN "p_overwrite" boolean DEFAULT false)
    LANGUAGE "plpgsql"
    AS $$
declare v_traj uuid;
begin
  select trajectory_id into v_traj from trip where id = p_trip;
  if v_traj is null then
    raise exception 'Trip % not found', p_trip using errcode = 'DZ301';
  end if;

  insert into trip_price (trip_id, from_wpoint_id, to_wpoint_id, currency, price, min_price, max_price)
  select p_trip, dp.from_wpoint_id, dp.to_wpoint_id, dp.currency, dp.price, dp.min_price, dp.max_price
  from default_trip_price dp
  where dp.trajectory_id = v_traj
    and exists (select 1 from trip_stop ts where ts.trip_id = p_trip and ts.wpoint_id = dp.from_wpoint_id)
    and exists (select 1 from trip_stop ts where ts.trip_id = p_trip and ts.wpoint_id = dp.to_wpoint_id)
  on conflict (trip_id, from_wpoint_id, to_wpoint_id) do update
    set price = excluded.price,
        min_price = excluded.min_price,
        max_price = excluded.max_price,
        updated_at = now()
  where p_overwrite;
end;
$$;


ALTER PROCEDURE "public"."sp_populate_trip_prices_from_defaults"(IN "p_trip" "uuid", IN "p_overwrite" boolean) OWNER TO "postgres";


CREATE PROCEDURE "public"."sp_publish_trip"(IN "p_trip" "uuid")
    LANGUAGE "plpgsql"
    AS $$
declare v trip%rowtype;
begin
  select * into v from trip where id = p_trip for update;
  if not found then
    raise exception 'Trip % not found', p_trip using errcode = 'DZ301';
  end if;

  if v.driver_id is null then
    raise exception 'Trip must have driver_id before publishing' using errcode = 'DZ001';
  end if;

  if v.vehicle_id is not null and not vehicle_is_eligible(v.vehicle_id) then
    raise exception 'Vehicle is not eligible for publishing (no approved, unexpired inspection on file, or marked out of service)' using errcode = 'DZ714';
  end if;

  update trip
  set published_at = coalesce(published_at, now())
  where id = p_trip;

  if v.published_at is null then
    perform notify_favorites_of_publish(p_trip);
  end if;
end;
$$;


ALTER PROCEDURE "public"."sp_publish_trip"(IN "p_trip" "uuid") OWNER TO "postgres";


CREATE PROCEDURE "public"."sp_set_default_trip_price"(IN "p_trajectory" "uuid", IN "p_from_wpoint" "uuid", IN "p_to_wpoint" "uuid", IN "p_price" numeric, IN "p_min_price" numeric DEFAULT NULL::numeric, IN "p_max_price" numeric DEFAULT NULL::numeric, IN "p_currency" "text" DEFAULT 'DZD'::"text", IN "p_notes" "text" DEFAULT NULL::"text")
    LANGUAGE "plpgsql"
    AS $$
declare
  v_from_pos int;
  v_to_pos   int;
begin
  if p_price is null or p_price < 0 then
    raise exception 'price must be >= 0' using errcode = 'DZ001';
  end if;
  if p_from_wpoint is null or p_to_wpoint is null or p_from_wpoint = p_to_wpoint then
    raise exception 'from/to wpoint required and must be distinct' using errcode = 'DZ001';
  end if;
  if p_currency is null or p_currency <> 'DZD' then
    raise exception 'Only DZD is supported' using errcode = 'DZ001';
  end if;

  perform 1 from trajectory where id = p_trajectory for update;
  if not found then
    raise exception 'Trajectory % not found', p_trajectory using errcode = 'DZ102';
  end if;

  select position into v_from_pos
  from wpoint where id = p_from_wpoint and trajectory_id = p_trajectory;

  select position into v_to_pos
  from wpoint where id = p_to_wpoint and trajectory_id = p_trajectory;

  if v_from_pos is null or v_to_pos is null then
    raise exception 'Invalid stop(s) for trajectory %', p_trajectory using errcode = 'DZ601';
  end if;

  if v_from_pos >= v_to_pos then
    raise exception 'Invalid route order' using errcode = 'DZ603';
  end if;

  insert into default_trip_price (
    trajectory_id, from_wpoint_id, to_wpoint_id, currency, price, min_price, max_price, notes
  )
  values (
    p_trajectory, p_from_wpoint, p_to_wpoint, p_currency, p_price, p_min_price, p_max_price, p_notes
  )
  on conflict (trajectory_id, from_wpoint_id, to_wpoint_id) do update
    set currency   = excluded.currency,
        price      = excluded.price,
        min_price  = excluded.min_price,
        max_price  = excluded.max_price,
        notes      = excluded.notes,
        updated_at = now();
end;
$$;


ALTER PROCEDURE "public"."sp_set_default_trip_price"(IN "p_trajectory" "uuid", IN "p_from_wpoint" "uuid", IN "p_to_wpoint" "uuid", IN "p_price" numeric, IN "p_min_price" numeric, IN "p_max_price" numeric, IN "p_currency" "text", IN "p_notes" "text") OWNER TO "postgres";


CREATE PROCEDURE "public"."sp_set_trip_price"(IN "p_trip" "uuid", IN "p_from_wpoint" "uuid", IN "p_to_wpoint" "uuid", IN "p_price" numeric, IN "p_min_price" numeric DEFAULT NULL::numeric, IN "p_max_price" numeric DEFAULT NULL::numeric, IN "p_currency" "text" DEFAULT NULL::"text", IN "p_notes" "text" DEFAULT NULL::"text")
    LANGUAGE "plpgsql"
    AS $$
declare
  v trip%rowtype;
  v_from_pos int;
  v_to_pos   int;
  v_cur      text;
begin
  if p_price is null or p_price < 0 then
    raise exception 'price must be >= 0' using errcode = 'DZ001';
  end if;
  if p_from_wpoint is null or p_to_wpoint is null or p_from_wpoint = p_to_wpoint then
    raise exception 'from/to wpoint required and must be distinct' using errcode = 'DZ001';
  end if;

  select * into v from trip where id = p_trip for update;
  if not found then
    raise exception 'Trip % not found', p_trip using errcode = 'DZ301';
  end if;

  if v.published_at is not null and trip_has_active_reservations(p_trip) then
    raise exception 'Trip prices locked' using errcode = 'DZ307';
  end if;

  v_cur := coalesce(p_currency, v.currency);
  if v_cur <> v.currency then
    raise exception 'Currency mismatch' using errcode = 'DZ504';
  end if;

  if not exists (select 1 from trip_stop where trip_id = p_trip and wpoint_id = p_from_wpoint)
     or not exists (select 1 from trip_stop where trip_id = p_trip and wpoint_id = p_to_wpoint) then
    raise exception 'Invalid stop(s) for trip' using errcode = 'DZ601';
  end if;

  select position into v_from_pos from wpoint where id = p_from_wpoint and trajectory_id = v.trajectory_id;
  select position into v_to_pos   from wpoint where id = p_to_wpoint   and trajectory_id = v.trajectory_id;

  if v_from_pos is null or v_to_pos is null or v_from_pos >= v_to_pos then
    raise exception 'Invalid route order' using errcode = 'DZ603';
  end if;

  insert into trip_price (
    trip_id, from_wpoint_id, to_wpoint_id, currency, price, min_price, max_price, notes
  )
  values (
    p_trip, p_from_wpoint, p_to_wpoint, v_cur, p_price, p_min_price, p_max_price, p_notes
  )
  on conflict (trip_id, from_wpoint_id, to_wpoint_id) do update
    set currency   = excluded.currency,
        price      = excluded.price,
        min_price  = excluded.min_price,
        max_price  = excluded.max_price,
        notes      = excluded.notes,
        updated_at = now();
end;
$$;


ALTER PROCEDURE "public"."sp_set_trip_price"(IN "p_trip" "uuid", IN "p_from_wpoint" "uuid", IN "p_to_wpoint" "uuid", IN "p_price" numeric, IN "p_min_price" numeric, IN "p_max_price" numeric, IN "p_currency" "text", IN "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."start_trip"("p_trip" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  update trip set status = 'in_progress' where id = p_trip and status = 'scheduled';
  if not found then
    if exists (select 1 from trip where id = p_trip) then
      raise exception 'Invalid trip transition' using errcode = 'DZ304';
    else
      raise exception 'Trip not found' using errcode = 'DZ301';
    end if;
  end if;
end;
$$;


ALTER FUNCTION "public"."start_trip"("p_trip" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_rating"("p_reservation" "uuid", "p_direction" "text", "p_stars" integer, "p_review" "text" DEFAULT NULL::"text", "p_rater_customer" "uuid" DEFAULT NULL::"uuid", "p_rater_driver" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_res  reservation%rowtype;
  v_trip trip%rowtype;
  v_id   uuid;
begin
  if p_stars is null or p_stars < 1 or p_stars > 5 then
    raise exception 'Rating must be between 1 and 5 stars' using errcode = 'DZ001';
  end if;

  select * into v_res from reservation where id = p_reservation for update;
  if not found then
    raise exception 'Reservation not found' using errcode = 'DZ401';
  end if;
  if v_res.status <> 'completed' then
    raise exception 'Only a completed reservation can be rated' using errcode = 'DZ721';
  end if;

  select * into v_trip from trip where id = v_res.trip_id;

  if p_direction = 'customer_to_driver' then
    if v_trip.driver_id is null then
      raise exception 'Trip has no assigned driver to rate' using errcode = 'DZ721';
    end if;
    if p_rater_customer is distinct from v_res.customer_id then
      raise exception 'Rater does not match this reservation' using errcode = 'DZ723';
    end if;
    if exists (select 1 from rating where reservation_id = p_reservation and direction = 'customer_to_driver') then
      raise exception 'This relationship has already been rated' using errcode = 'DZ722';
    end if;
    insert into rating (reservation_id, direction, rater_customer_id, ratee_driver_id, stars, review)
    values (p_reservation, 'customer_to_driver', p_rater_customer, v_trip.driver_id, p_stars, nullif(btrim(coalesce(p_review, '')), ''))
    returning id into v_id;

  elsif p_direction = 'driver_to_customer' then
    if p_rater_driver is distinct from v_trip.driver_id then
      raise exception 'Rater does not match this reservation' using errcode = 'DZ723';
    end if;
    if exists (select 1 from rating where reservation_id = p_reservation and direction = 'driver_to_customer') then
      raise exception 'This relationship has already been rated' using errcode = 'DZ722';
    end if;
    insert into rating (reservation_id, direction, rater_driver_id, ratee_customer_id, stars, review)
    values (p_reservation, 'driver_to_customer', p_rater_driver, v_res.customer_id, p_stars, nullif(btrim(coalesce(p_review, '')), ''))
    returning id into v_id;

  else
    raise exception 'Invalid rating direction' using errcode = 'DZ001';
  end if;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."submit_rating"("p_reservation" "uuid", "p_direction" "text", "p_stars" integer, "p_review" "text", "p_rater_customer" "uuid", "p_rater_driver" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."suggest_trip_price"("p_trip" "uuid", "p_from_wpoint" "uuid", "p_to_wpoint" "uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
declare
  v_trip      trip%rowtype;
  v_base      numeric;
  v_min       numeric;
  v_max       numeric;
  v_mult      numeric := 1.0;
  v_traj_mult numeric;
  v_dow       int;
  v_hour      int;
  v_peak      numeric;
  v_offpeak   numeric;
  v_early_days numeric;
  v_early_mult numeric;
  v_booked    int;
  v_occ_pct   numeric;
  v_high_occ  numeric;
  v_high_mult numeric;
  v_low_occ   numeric;
  v_low_mult  numeric;
  v_price     numeric;
begin
  select * into v_trip from trip where id = p_trip;
  if not found then
    raise exception 'Trip not found' using errcode = 'DZ301';
  end if;

  -- Base price: an explicit trip-level override if set, else the
  -- trajectory's default template, else the trip's flat fallback —
  -- exactly the same fallback chain amount_paid()/checkout already rely on.
  select price, min_price, max_price into v_base, v_min, v_max
    from trip_price where trip_id = p_trip and from_wpoint_id = p_from_wpoint and to_wpoint_id = p_to_wpoint;
  if not found then
    select price, min_price, max_price into v_base, v_min, v_max
      from default_trip_price
      where trajectory_id = v_trip.trajectory_id and from_wpoint_id = p_from_wpoint and to_wpoint_id = p_to_wpoint;
  end if;
  if v_base is null then
    v_base := v_trip.seat_price;
  end if;

  select price_multiplier into v_traj_mult from trajectory where id = v_trip.trajectory_id;
  v_mult := v_mult * coalesce(v_traj_mult, 1.0);

  v_dow  := extract(dow  from v_trip.departure_at)::int; -- 0=Sunday..6=Saturday
  v_hour := extract(hour from v_trip.departure_at)::int;
  select coalesce((select value from app_setting where key = 'pricing_peak_multiplier')::numeric, 1.15) into v_peak;
  select coalesce((select value from app_setting where key = 'pricing_offpeak_multiplier')::numeric, 0.9) into v_offpeak;
  -- Peak: weekday rush hours, or a Thu/Fri evening departure (pre-weekend travel).
  if v_hour between 7 and 9 or v_hour between 16 and 19 or (v_dow in (4,5) and v_hour >= 17) then
    v_mult := v_mult * v_peak;
  elsif v_hour < 6 or v_hour >= 22 then
    v_mult := v_mult * v_offpeak;
  end if;

  select coalesce((select value from app_setting where key = 'pricing_early_booking_days')::numeric, 7) into v_early_days;
  select coalesce((select value from app_setting where key = 'pricing_early_booking_multiplier')::numeric, 0.92) into v_early_mult;
  if v_trip.departure_at - now() >= (v_early_days || ' days')::interval then
    v_mult := v_mult * v_early_mult;
  end if;

  select coalesce(sum(seats), 0) into v_booked
    from reservation where trip_id = p_trip and status in ('pending','confirmed');
  v_occ_pct := case when v_trip.capacity > 0 then 100.0 * v_booked / v_trip.capacity else 0 end;

  select coalesce((select value from app_setting where key = 'pricing_high_demand_occupancy_pct')::numeric, 70) into v_high_occ;
  select coalesce((select value from app_setting where key = 'pricing_high_demand_multiplier')::numeric, 1.2) into v_high_mult;
  select coalesce((select value from app_setting where key = 'pricing_low_demand_occupancy_pct')::numeric, 20) into v_low_occ;
  select coalesce((select value from app_setting where key = 'pricing_low_demand_multiplier')::numeric, 0.9) into v_low_mult;

  if v_occ_pct >= v_high_occ then
    v_mult := v_mult * v_high_mult;
  elsif v_occ_pct <= v_low_occ then
    v_mult := v_mult * v_low_mult;
  end if;

  v_price := round(v_base * v_mult, 2);
  if v_min is not null and v_price < v_min then v_price := v_min; end if;
  if v_max is not null and v_price > v_max then v_price := v_max; end if;

  return v_price;
end;
$$;


ALTER FUNCTION "public"."suggest_trip_price"("p_trip" "uuid", "p_from_wpoint" "uuid", "p_to_wpoint" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trajectory_to_record"("p_name" "text") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  select trajectory_to_record(get_trajectory_id(p_name));
$$;


ALTER FUNCTION "public"."trajectory_to_record"("p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trajectory_to_record"("p_trajectory" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  select jsonb_build_object(
    'name', t.name,
    'wpoints', coalesce((
      select jsonb_agg(wpoint_to_record(w.id) order by w.position)
      from wpoint w
      where w.trajectory_id = t.id
    ), '[]'::jsonb)
  )
  from trajectory t
  where t.id = p_trajectory;
$$;


ALTER FUNCTION "public"."trajectory_to_record"("p_trajectory" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_customer_referral_code"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.referral_code is null then
    new.referral_code := 'REF-' || lpad(nextval('seq_business_code')::text, 6, '0');
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."trg_customer_referral_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_no_show_event_apply"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_threshold int;
  v_count     int;
begin
  select coalesce((select value from app_setting where key = 'no_show_strike_threshold')::int, 3)
    into v_threshold;

  if new.kind = 'customer' then
    update customer set no_show_count = no_show_count + 1
    where id = new.customer_id
    returning no_show_count into v_count;
    if v_count >= v_threshold then
      update customer set flagged_at = coalesce(flagged_at, now()) where id = new.customer_id;
    end if;
  else
    update driver set no_show_count = no_show_count + 1
    where id = new.driver_id
    returning no_show_count into v_count;
    if v_count >= v_threshold then
      update driver set flagged_at = coalesce(flagged_at, now()) where id = new.driver_id;
    end if;
  end if;

  return null;
end;
$$;


ALTER FUNCTION "public"."trg_no_show_event_apply"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_payment_guard"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_cur   text;
  v_total numeric(12,2);
  v_paid  numeric(12,2);
begin
  select currency, total_price into v_cur, v_total
  from reservation where id = new.reservation_id for update;
  if v_cur is null then
    raise exception 'Reservation not found' using errcode = 'DZ401';
  end if;

  if new.currency <> v_cur then
    raise exception 'Currency mismatch' using errcode = 'DZ504';
  end if;

  if new.status = 'paid' then
    select coalesce(sum(amount - refunded_amount), 0) into v_paid
    from payment
    where reservation_id = new.reservation_id
      and status in ('paid','partially_refunded')
      and id <> new.id;

    if v_paid + new.amount > v_total then
      raise exception 'Payment exceeds total' using errcode = 'DZ503';
    end if;

    if new.paid_at is null then new.paid_at := now(); end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."trg_payment_guard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_rating_apply"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_driver   uuid := coalesce(new.ratee_driver_id, old.ratee_driver_id);
  v_customer uuid := coalesce(new.ratee_customer_id, old.ratee_customer_id);
begin
  if v_driver is not null then
    update driver d set
      rating_count = sub.cnt,
      rating_avg   = sub.avg_stars
    from (
      select count(*) as cnt, round(avg(stars)::numeric, 2) as avg_stars
      from rating where ratee_driver_id = v_driver and hidden_at is null
    ) sub
    where d.id = v_driver;
  end if;

  if v_customer is not null then
    update customer c set
      rating_count = sub.cnt,
      rating_avg   = sub.avg_stars
    from (
      select count(*) as cnt, round(avg(stars)::numeric, 2) as avg_stars
      from rating where ratee_customer_id = v_customer and hidden_at is null
    ) sub
    where c.id = v_customer;
  end if;

  return null;
end;
$$;


ALTER FUNCTION "public"."trg_rating_apply"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_recurring_template_guard"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if exists (select 1 from unnest(new.weekdays) d where d not between 0 and 6) then
    raise exception 'Recurrence rule must select at least one weekday' using errcode = 'DZ812';
  end if;
  new.updated_at := now();
  return new;
end;
$$;


ALTER FUNCTION "public"."trg_recurring_template_guard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_referral_reward_on_first_completed_trip"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_referrer        uuid;
  v_prior_completed int;
  v_amount          numeric;
begin
  select referred_by_customer_id into v_referrer from customer where id = new.customer_id;
  if v_referrer is null then
    return null;
  end if;

  select count(*) into v_prior_completed
    from reservation where customer_id = new.customer_id and status = 'completed' and id <> new.id;
  if v_prior_completed > 0 then
    return null; -- not their first completed trip
  end if;

  if exists (select 1 from referral_reward where referrer_id = v_referrer and referred_id = new.customer_id) then
    return null; -- already rewarded (defensive; the unique constraint also guarantees this)
  end if;

  select coalesce((select value from app_setting where key = 'referral_reward_amount')::numeric, 200) into v_amount;

  insert into referral_reward (referrer_id, referred_id, trigger_reservation_id, reward_amount, status)
  values (v_referrer, new.customer_id, new.id, v_amount, 'paid');

  perform wallet_credit(v_referrer, 'referral_credit', v_amount, new.id, null,
                         'Parrainage — premier trajet terminé par le filleul');

  return null;
end;
$$;


ALTER FUNCTION "public"."trg_referral_reward_on_first_completed_trip"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_reservation_cancel_cascade"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    update payment set status = 'failed'
    where reservation_id = new.id and status = 'pending';
  end if;
  return null;
end;
$$;


ALTER FUNCTION "public"."trg_reservation_cancel_cascade"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_reservation_capacity_guard"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_capacity   smallint;
  v_trajectory uuid;
  v_min_pos    integer;
  v_max_pos    integer;
  v_pos_from   integer;
  v_pos_to     integer;
  v_held       integer;
begin
  if new.status not in ('pending','confirmed') then
    return null;
  end if;

  select capacity, trajectory_id into v_capacity, v_trajectory from trip where id = new.trip_id for update;

  select min(position), max(position) into v_min_pos, v_max_pos
  from wpoint where trajectory_id = v_trajectory;

  v_pos_from := coalesce((select position from wpoint where id = new.pickup_wpoint_id),  v_min_pos);
  v_pos_to   := coalesce((select position from wpoint where id = new.dropoff_wpoint_id), v_max_pos);

  select coalesce(sum(r.seats), 0)::int into v_held
    from reservation r
    left join wpoint wf on wf.id = r.pickup_wpoint_id
    left join wpoint wt on wt.id = r.dropoff_wpoint_id
   where r.trip_id = new.trip_id
     and r.status in ('pending','confirmed')
     and r.id <> new.id
     and coalesce(wf.position, v_min_pos) < v_pos_to
     and coalesce(wt.position,   v_max_pos) > v_pos_from;

  if v_held + new.seats > v_capacity then
    raise exception 'Insufficient seats' using errcode = 'DZ303';
  end if;

  return null;
end;
$$;


ALTER FUNCTION "public"."trg_reservation_capacity_guard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_reservation_completed_earning"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_driver uuid;
  v_gross  numeric;
  v_pct    numeric;
  v_commission numeric;
begin
  select driver_id into v_driver from trip where id = new.trip_id;
  if v_driver is null then
    return null; -- no assigned driver on this trip — nothing to pay out
  end if;

  v_gross := amount_paid(new.id);
  if v_gross <= 0 then
    return null;
  end if;

  select coalesce((select value from app_setting where key = 'platform_commission_pct')::numeric, 15) into v_pct;
  v_commission := round(v_gross * v_pct / 100.0, 2);

  insert into payout_ledger (driver_id, trip_id, reservation_id, entry_type, gross_amount, commission_pct, commission_amount, net_amount)
  values (v_driver, new.trip_id, new.id, 'earning', v_gross, v_pct, v_commission, v_gross - v_commission);

  return null;
end;
$$;


ALTER FUNCTION "public"."trg_reservation_completed_earning"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;


ALTER FUNCTION "public"."trg_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_trajectory_guard"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.name := btrim(coalesce(new.name, ''));
  if new.name = '' then
    raise exception 'Trajectory name cannot be empty' using errcode = 'DZ101';
  end if;
  if tg_op = 'UPDATE' and new.name <> old.name then
    raise exception 'Trajectory name (identity) is immutable' using errcode = 'DZ103';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."trg_trajectory_guard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_trip_cancel_cascade"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_pay record;
  v_remaining numeric;
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    update reservation
    set status = 'cancelled'
    where trip_id = new.id and status in ('pending','confirmed');

    -- Task 7.4 — the whole TRIP was pulled by the platform (admin
    -- cancellation, driver no-show via record_driver_no_show, …), not by
    -- individual customer choice, so every reservation swept up by this
    -- cascade gets a full 100% refund of whatever remains paid, regardless
    -- of how close to departure this happens — cancellation_refund_pct()'s
    -- time-based policy deliberately does not apply on this path.
    for v_pay in
      select p.id as payment_id, p.amount, p.refunded_amount, r.id as reservation_id
      from reservation r
      join payment p on p.reservation_id = r.id and p.status in ('paid','partially_refunded')
      where r.trip_id = new.id and r.status = 'cancelled'
    loop
      v_remaining := v_pay.amount - v_pay.refunded_amount;
      if v_remaining > 0 then
        perform apply_refund(v_pay.payment_id, v_remaining, 'system', null, 100);
      end if;
    end loop;

    -- Task 11.1 — "cancellation" notification: every customer swept up by
    -- the whole-trip cancellation gets notified (customer-initiated single
    -- reservation cancellations are notified from cancel_reservation()
    -- itself instead).
    perform notify_customer(r.customer_id, 'trip_cancelled',
      'Voyage annulé', 'Votre réservation ' || r.code || ' a été annulée car le voyage a été annulé.',
      jsonb_build_object('reservation_id', r.id, 'trip_id', new.id))
    from reservation r where r.trip_id = new.id and r.status = 'cancelled';
  end if;
  return null;
end;
$$;


ALTER FUNCTION "public"."trg_trip_cancel_cascade"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_trip_capacity_guard"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare v_held integer;
begin
  select coalesce(sum(seats), 0)::int into v_held
  from reservation
  where trip_id = new.id and status in ('pending','confirmed');

  if new.capacity < v_held then
    raise exception 'Capacity too low' using errcode = 'DZ305';
  end if;

  -- Task 10.2 — an admin raising a trip's capacity can free room for
  -- waitlisted customers; promote_waitlist() is a no-op if nobody is
  -- waiting or there still isn't enough room for anyone queued.
  if new.capacity > old.capacity then
    perform promote_waitlist(new.id);
  end if;

  return null;
end;
$$;


ALTER FUNCTION "public"."trg_trip_capacity_guard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_trip_edit_lock"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare v_override boolean := coalesce(current_setting('wassalni.admin_reschedule', true), '') = 'on';
begin
  if old.published_at is not null and new.published_at is distinct from old.published_at then
    raise exception 'published_at immutable' using errcode = 'DZ306';
  end if;

  if old.published_at is not null and trip_has_active_reservations(old.id) then
    if not v_override and (
         new.departure_at  is distinct from old.departure_at
      or new.trajectory_id is distinct from old.trajectory_id
      or new.seat_price    is distinct from old.seat_price
      or new.currency      is distinct from old.currency
      or new.driver_id     is distinct from old.driver_id
      or new.vehicle_id    is distinct from old.vehicle_id
    ) then
      raise exception 'Trip locked' using errcode = 'DZ306';
    end if;

    if new.capacity < old.capacity then
      raise exception 'Trip locked (capacity decrease)' using errcode = 'DZ306';
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."trg_trip_edit_lock"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_trip_price_lock"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare v_trip uuid := coalesce(new.trip_id, old.trip_id);
begin
  if (select published_at is not null from trip where id = v_trip)
     and trip_has_active_reservations(v_trip) then
    raise exception 'Prices locked' using errcode = 'DZ307';
  end if;
  return coalesce(new, old);
end;
$$;


ALTER FUNCTION "public"."trg_trip_price_lock"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_trip_status_guard"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.status = old.status then return new; end if;
  if old.status = 'scheduled'   and new.status in ('in_progress','cancelled') then return new; end if;
  if old.status = 'in_progress' and new.status in ('completed','cancelled')   then return new; end if;
  raise exception 'Invalid trip transition' using errcode = 'DZ304';
end;
$$;


ALTER FUNCTION "public"."trg_trip_status_guard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_trip_stop_lock"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare v_trip uuid := coalesce(new.trip_id, old.trip_id);
begin
  if (select published_at is not null from trip where id = v_trip)
     and trip_has_active_reservations(v_trip) then
    raise exception 'Stops locked' using errcode = 'DZ307';
  end if;
  return coalesce(new, old);
end;
$$;


ALTER FUNCTION "public"."trg_trip_stop_lock"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_trip_vehicle_capacity_guard"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare v_seats smallint;
begin
  if new.vehicle_id is null then
    return new;
  end if;

  select seats into v_seats from vehicle where id = new.vehicle_id;
  if v_seats is null then
    raise exception 'Vehicle not found' using errcode = 'DZ001';
  end if;

  if new.capacity > v_seats then
    raise exception 'Trip capacity exceeds vehicle seats' using errcode = 'DZ001';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."trg_trip_vehicle_capacity_guard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_wpoint_guard"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.wilaya_id <> old.wilaya_id or new.trajectory_id <> old.trajectory_id then
    raise exception 'WPoint wilaya/trajectory (identity) is immutable' using errcode = 'DZ206';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."trg_wpoint_guard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_sos"("p_reservation" "uuid", "p_role" "text", "p_id" "uuid", "p_lat" numeric DEFAULT NULL::numeric, "p_lon" numeric DEFAULT NULL::numeric, "p_notes" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_res  reservation%rowtype;
  v_trip_id uuid;
  v_recent integer;
  v_limit  integer;
  v_id     uuid;
begin
  select coalesce((select value from app_setting where key = 'sos_rate_limit_per_hour')::int, 3) into v_limit;
  select count(*) into v_recent from sos_event
  where triggered_by_role = p_role and triggered_by_id = p_id and created_at > now() - interval '1 hour';
  if v_recent >= v_limit then
    raise exception 'Too many SOS triggers in a short period — please wait or call emergency services directly' using errcode = 'DZ872';
  end if;

  if p_reservation is not null then
    select * into v_res from reservation where id = p_reservation;
    v_trip_id := v_res.trip_id;
  end if;

  insert into sos_event (reservation_id, trip_id, triggered_by_role, triggered_by_id, gps_lat, gps_lon, notes)
  values (p_reservation, v_trip_id, p_role, p_id, p_lat, p_lon, p_notes)
  returning id into v_id;

  perform notify_admins('sos_triggered', '🆘 Alerte SOS', 'Une alerte SOS a été déclenchée.',
    jsonb_build_object('sos_event_id', v_id, 'reservation_id', p_reservation, 'trip_id', v_trip_id,
                       'lat', p_lat, 'lon', p_lon));

  return v_id;
end;
$$;


ALTER FUNCTION "public"."trigger_sos"("p_reservation" "uuid", "p_role" "text", "p_id" "uuid", "p_lat" numeric, "p_lon" numeric, "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trip_has_active_reservations"("p_trip" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1 from reservation
    where trip_id = p_trip and status in ('pending','confirmed')
  );
$$;


ALTER FUNCTION "public"."trip_has_active_reservations"("p_trip" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trust_badge"("p_rating_avg" numeric, "p_rating_count" integer, "p_flagged_at" timestamp with time zone) RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select p_rating_avg is not null and p_rating_avg >= 4.5 and p_rating_count >= 5 and p_flagged_at is null;
$$;


ALTER FUNCTION "public"."trust_badge"("p_rating_avg" numeric, "p_rating_count" integer, "p_flagged_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vehicle_inspection_approve"("p_inspection" "uuid", "p_admin" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare v_status text;
begin
  select approval_state into v_status from vehicle_inspection where id = p_inspection for update;
  if v_status is null then
    raise exception 'Vehicle inspection record not found' using errcode = 'DZ711';
  end if;
  if v_status <> 'pending' then
    raise exception 'Vehicle inspection record has already been reviewed' using errcode = 'DZ712';
  end if;
  update vehicle_inspection
     set approval_state = 'approved', reviewed_by = p_admin, reviewed_at = now(),
         rejection_reason = null, updated_at = now()
   where id = p_inspection;
end;
$$;


ALTER FUNCTION "public"."vehicle_inspection_approve"("p_inspection" "uuid", "p_admin" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vehicle_inspection_reject"("p_inspection" "uuid", "p_admin" "uuid", "p_reason" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare v_status text;
begin
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'Rejection reason required' using errcode = 'DZ713';
  end if;
  select approval_state into v_status from vehicle_inspection where id = p_inspection for update;
  if v_status is null then
    raise exception 'Vehicle inspection record not found' using errcode = 'DZ711';
  end if;
  if v_status <> 'pending' then
    raise exception 'Vehicle inspection record has already been reviewed' using errcode = 'DZ712';
  end if;
  update vehicle_inspection
     set approval_state = 'rejected', reviewed_by = p_admin, reviewed_at = now(),
         rejection_reason = btrim(p_reason), updated_at = now()
   where id = p_inspection;
end;
$$;


ALTER FUNCTION "public"."vehicle_inspection_reject"("p_inspection" "uuid", "p_admin" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vehicle_is_eligible"("p_vehicle" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select coalesce(
    (select expiry_date >= current_date and maintenance_status <> 'out_of_service'
       from vehicle_inspection
      where vehicle_id = p_vehicle and approval_state = 'approved'
      order by inspection_date desc, created_at desc
      limit 1),
    false);
$$;


ALTER FUNCTION "public"."vehicle_is_eligible"("p_vehicle" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."waitlist_position"("p_entry" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE
    AS $$
  select count(*)::int + 1
  from waitlist_entry w2
  join waitlist_entry w1 on w1.id = p_entry
  where w2.trip_id = w1.trip_id and w2.status = 'waiting' and w2.position < w1.position;
$$;


ALTER FUNCTION "public"."waitlist_position"("p_entry" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wallet_balance"("p_customer" "uuid") RETURNS numeric
    LANGUAGE "sql" STABLE
    AS $$
  select coalesce(sum(amount), 0) from wallet_entry where customer_id = p_customer;
$$;


ALTER FUNCTION "public"."wallet_balance"("p_customer" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wallet_credit"("p_customer" "uuid", "p_entry_type" "text", "p_amount" numeric, "p_reservation" "uuid" DEFAULT NULL::"uuid", "p_reference" "uuid" DEFAULT NULL::"uuid", "p_description" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
declare v_id uuid;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Wallet credit/debit amount must be positive' using errcode = 'DZ761';
  end if;
  if p_entry_type not in ('refund_credit','promo_credit','referral_credit','admin_adjustment') then
    raise exception 'Invalid wallet credit entry type' using errcode = 'DZ001';
  end if;

  insert into wallet_entry (customer_id, entry_type, amount, reservation_id, reference_id, description)
  values (p_customer, p_entry_type, p_amount, p_reservation, p_reference, p_description)
  returning id into v_id;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."wallet_credit"("p_customer" "uuid", "p_entry_type" "text", "p_amount" numeric, "p_reservation" "uuid", "p_reference" "uuid", "p_description" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wallet_debit"("p_customer" "uuid", "p_amount" numeric, "p_entry_type" "text" DEFAULT 'booking_debit'::"text", "p_reservation" "uuid" DEFAULT NULL::"uuid", "p_reference" "uuid" DEFAULT NULL::"uuid", "p_description" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
declare v_id uuid; v_balance numeric;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Wallet credit/debit amount must be positive' using errcode = 'DZ761';
  end if;
  if p_entry_type not in ('booking_debit','admin_adjustment') then
    raise exception 'Invalid wallet debit entry type' using errcode = 'DZ001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_customer::text, 0));

  select wallet_balance(p_customer) into v_balance;
  if v_balance < p_amount then
    raise exception 'Insufficient wallet balance' using errcode = 'DZ762';
  end if;

  insert into wallet_entry (customer_id, entry_type, amount, reservation_id, reference_id, description)
  values (p_customer, p_entry_type, -p_amount, p_reservation, p_reference, p_description)
  returning id into v_id;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."wallet_debit"("p_customer" "uuid", "p_amount" numeric, "p_entry_type" "text", "p_reservation" "uuid", "p_reference" "uuid", "p_description" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wpoint_to_record"("p_wpoint" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  select jsonb_build_object(
    'wilaya',   wy.nom_fr,
    'communes', coalesce((
      select jsonb_agg(c.nom_fr order by wc.sort_key)
      from wpoint_commune wc
      join commune c on c.id = wc.commune_id
      where wc.wpoint_id = p_wpoint
    ), '[]'::jsonb)
  )
  from wpoint w
  join wilaya wy on wy.id = w.wilaya_id
  where w.id = p_wpoint;
$$;


ALTER FUNCTION "public"."wpoint_to_record"("p_wpoint" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_user_id" "uuid",
    "action" "text" NOT NULL,
    "target_type" "text" NOT NULL,
    "target_id" "text",
    "before_data" "jsonb",
    "after_data" "jsonb",
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admin_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_session" (
    "token_hash" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_agent" "text",
    "ip" "text"
);


ALTER TABLE "public"."app_session" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_setting" (
    "key" "text" NOT NULL,
    "value" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."app_setting" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_user" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "password_hash" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "phone" "text",
    "role" "text" DEFAULT 'customer'::"text" NOT NULL,
    "customer_id" "uuid",
    "email_verified" boolean DEFAULT false NOT NULL,
    "failed_attempts" integer DEFAULT 0 NOT NULL,
    "locked_until" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "driver_id" "uuid",
    "admin_role" "text",
    CONSTRAINT "app_user_admin_role_check" CHECK ((("admin_role" IS NULL) OR ("admin_role" = ANY (ARRAY['super_admin'::"text", 'admin'::"text", 'support'::"text", 'finance'::"text", 'operations'::"text"])))),
    CONSTRAINT "app_user_email_check" CHECK (("email" ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'::"text")),
    CONSTRAINT "app_user_full_name_check" CHECK (("btrim"("full_name") <> ''::"text")),
    CONSTRAINT "app_user_role_check" CHECK (("role" = ANY (ARRAY['customer'::"text", 'admin'::"text", 'driver'::"text"])))
);


ALTER TABLE "public"."app_user" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_user_otp" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "purpose" "text" NOT NULL,
    "salt" "text" NOT NULL,
    "code_hash" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "consumed_at" timestamp with time zone,
    "attempts" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "channel" "text" DEFAULT 'email'::"text" NOT NULL,
    CONSTRAINT "app_user_otp_channel_check" CHECK (("channel" = ANY (ARRAY['email'::"text", 'sms'::"text"]))),
    CONSTRAINT "app_user_otp_purpose_check" CHECK (("purpose" = 'login_2fa'::"text"))
);


ALTER TABLE "public"."app_user_otp" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."commune" (
    "id" integer NOT NULL,
    "daira_id" smallint NOT NULL,
    "wilaya_id" smallint NOT NULL,
    "nom_ar" "text" NOT NULL,
    "nom_fr" "text" NOT NULL,
    "nom_en" "text" NOT NULL,
    "code_postal" character(5),
    CONSTRAINT "commune_code_postal_check" CHECK ((("code_postal" IS NULL) OR ("code_postal" ~ '^[0-9]{5}$'::"text")))
);


ALTER TABLE "public"."commune" OWNER TO "postgres";


ALTER TABLE "public"."commune" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."commune_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."contact_reveal_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reservation_id" "uuid" NOT NULL,
    "requester_role" "text" NOT NULL,
    "requester_id" "uuid" NOT NULL,
    "revealed_phone" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "contact_reveal_log_requester_role_check" CHECK (("requester_role" = ANY (ARRAY['customer'::"text", 'driver'::"text"])))
);


ALTER TABLE "public"."contact_reveal_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversation" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reservation_id" "uuid" NOT NULL,
    "blocked_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."conversation" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "full_name" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "email" "text",
    "nin" "text",
    "nif" "text",
    "si" "text",
    "address" "text",
    "home_wilaya_id" smallint,
    "home_commune_id" integer,
    "gps_lat" numeric(9,6),
    "gps_lon" numeric(9,6),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "no_show_count" integer DEFAULT 0 NOT NULL,
    "flagged_at" timestamp with time zone,
    "rating_avg" numeric(3,2),
    "rating_count" integer DEFAULT 0 NOT NULL,
    "referral_code" "text",
    "referred_by_customer_id" "uuid",
    CONSTRAINT "customer_email_check" CHECK ((("email" IS NULL) OR ("email" ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'::"text"))),
    CONSTRAINT "customer_full_name_check" CHECK (("btrim"("full_name") <> ''::"text")),
    CONSTRAINT "customer_gps_chk" CHECK (((("gps_lat" IS NULL) AND ("gps_lon" IS NULL)) OR ((("gps_lat" >= ('-90'::integer)::numeric) AND ("gps_lat" <= (90)::numeric)) AND (("gps_lon" >= ('-180'::integer)::numeric) AND ("gps_lon" <= (180)::numeric))))),
    CONSTRAINT "customer_nif_check" CHECK ((("nif" IS NULL) OR ("nif" ~ '^[0-9]{20}$'::"text"))),
    CONSTRAINT "customer_nif_chk" CHECK ((("nif" IS NULL) OR ("nif" ~ '^[0-9]{20}$'::"text"))),
    CONSTRAINT "customer_nin_check" CHECK ((("nin" IS NULL) OR ("nin" ~ '^[0-9]{18}$'::"text"))),
    CONSTRAINT "customer_nin_chk" CHECK ((("nin" IS NULL) OR ("nin" ~ '^[0-9]{18}$'::"text"))),
    CONSTRAINT "customer_phone_check" CHECK (("phone" ~ '^\+?[0-9]{8,15}$'::"text"))
);


ALTER TABLE "public"."customer" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daira" (
    "id" smallint NOT NULL,
    "wilaya_id" smallint NOT NULL,
    "nom_ar" "text" NOT NULL,
    "nom_fr" "text" NOT NULL,
    "nom_en" "text" NOT NULL
);


ALTER TABLE "public"."daira" OWNER TO "postgres";


ALTER TABLE "public"."daira" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."daira_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."default_trip_price" (
    "trajectory_id" "uuid" NOT NULL,
    "from_wpoint_id" "uuid" NOT NULL,
    "to_wpoint_id" "uuid" NOT NULL,
    "currency" "text" DEFAULT 'DZD'::"text" NOT NULL,
    "price" numeric(12,2) NOT NULL,
    "min_price" numeric(12,2),
    "max_price" numeric(12,2),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "default_trip_price_bounds" CHECK (((("min_price" IS NULL) OR ("min_price" <= "price")) AND (("max_price" IS NULL) OR ("price" <= "max_price")) AND (("min_price" IS NULL) OR ("max_price" IS NULL) OR ("min_price" <= "max_price")))),
    CONSTRAINT "default_trip_price_currency_check" CHECK (("currency" = 'DZD'::"text")),
    CONSTRAINT "default_trip_price_distinct" CHECK (("from_wpoint_id" <> "to_wpoint_id")),
    CONSTRAINT "default_trip_price_max_price_check" CHECK ((("max_price" IS NULL) OR ("max_price" >= (0)::numeric))),
    CONSTRAINT "default_trip_price_min_price_check" CHECK ((("min_price" IS NULL) OR ("min_price" >= (0)::numeric))),
    CONSTRAINT "default_trip_price_price_check" CHECK (("price" >= (0)::numeric))
);


ALTER TABLE "public"."default_trip_price" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."driver" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "full_name" "text" NOT NULL,
    "nin" "text" NOT NULL,
    "nif" "text",
    "si" "text",
    "phone" "text" NOT NULL,
    "email" "text",
    "address" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "vehicle_id" "uuid",
    "no_show_count" integer DEFAULT 0 NOT NULL,
    "flagged_at" timestamp with time zone,
    "rating_avg" numeric(3,2),
    "rating_count" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "driver_email_check" CHECK ((("email" IS NULL) OR ("email" ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'::"text"))),
    CONSTRAINT "driver_full_name_check" CHECK (("btrim"("full_name") <> ''::"text")),
    CONSTRAINT "driver_nif_check" CHECK ((("nif" IS NULL) OR ("nif" ~ '^[0-9]{20}$'::"text"))),
    CONSTRAINT "driver_nin_check" CHECK (("nin" ~ '^[0-9]{18}$'::"text")),
    CONSTRAINT "driver_phone_check" CHECK (("phone" ~ '^\+?[0-9]{8,15}$'::"text"))
);


ALTER TABLE "public"."driver" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."driver_last_location" (
    "driver_id" "uuid" NOT NULL,
    "gps_lat" numeric(9,6) NOT NULL,
    "gps_lon" numeric(9,6) NOT NULL,
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "driver_last_location_gps_lat_check" CHECK ((("gps_lat" >= ('-90'::integer)::numeric) AND ("gps_lat" <= (90)::numeric))),
    CONSTRAINT "driver_last_location_gps_lon_check" CHECK ((("gps_lon" >= ('-180'::integer)::numeric) AND ("gps_lon" <= (180)::numeric)))
);


ALTER TABLE "public"."driver_last_location" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."emergency_contact" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "relationship" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "emergency_contact_full_name_check" CHECK (("btrim"("full_name") <> ''::"text")),
    CONSTRAINT "emergency_contact_phone_check" CHECK (("phone" ~ '^\+?[0-9]{8,15}$'::"text"))
);


ALTER TABLE "public"."emergency_contact" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."favorite_driver" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "driver_id" "uuid" NOT NULL,
    "notify" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."favorite_driver" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."favorite_route" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "origin_wpoint_id" "uuid" NOT NULL,
    "destination_wpoint_id" "uuid" NOT NULL,
    "notify" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."favorite_route" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."import_log" (
    "id" bigint NOT NULL,
    "ran_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nb_wilayas" integer NOT NULL,
    "nb_dairas" integer NOT NULL,
    "nb_communes" integer NOT NULL,
    "payload_bytes" integer NOT NULL,
    "success" boolean DEFAULT true NOT NULL,
    "error_details" "text"
);


ALTER TABLE "public"."import_log" OWNER TO "postgres";


ALTER TABLE "public"."import_log" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."import_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."kyc_document" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "driver_id" "uuid" NOT NULL,
    "doc_type" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "mime_type" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "rejection_reason" "text",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "kyc_document_doc_type_check" CHECK (("doc_type" = ANY (ARRAY['identity'::"text", 'license'::"text", 'vehicle_registration'::"text", 'insurance'::"text"]))),
    CONSTRAINT "kyc_document_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."kyc_document" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_role" "text" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "body" "text" NOT NULL,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "message_body_check" CHECK (("btrim"("body") <> ''::"text")),
    CONSTRAINT "message_sender_role_check" CHECK (("sender_role" = ANY (ARRAY['customer'::"text", 'driver'::"text"])))
);


ALTER TABLE "public"."message" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."no_show_event" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid",
    "reservation_id" "uuid",
    "customer_id" "uuid",
    "driver_id" "uuid",
    "kind" "text" NOT NULL,
    "notes" "text",
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "no_show_event_check" CHECK (((("kind" = 'customer'::"text") AND ("customer_id" IS NOT NULL) AND ("driver_id" IS NULL)) OR (("kind" = 'driver'::"text") AND ("driver_id" IS NOT NULL) AND ("customer_id" IS NULL)))),
    CONSTRAINT "no_show_event_kind_check" CHECK (("kind" = ANY (ARRAY['customer'::"text", 'driver'::"text"])))
);


ALTER TABLE "public"."no_show_event" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipient_user_id" "uuid",
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "pushed_at" timestamp with time zone,
    "sms_sent_at" timestamp with time zone
);


ALTER TABLE "public"."notification" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "reservation_id" "uuid" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "refunded_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "currency" "text" DEFAULT 'DZD'::"text" NOT NULL,
    "method" "public"."payment_method" NOT NULL,
    "status" "public"."payment_status" DEFAULT 'pending'::"public"."payment_status" NOT NULL,
    "reference" "text",
    "paid_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "gateway" "text",
    "gateway_transaction_id" "text",
    "failure_reason" "text",
    "expires_at" timestamp with time zone,
    CONSTRAINT "payment_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "payment_currency_check" CHECK (("currency" = 'DZD'::"text")),
    CONSTRAINT "payment_refund_consistency" CHECK (((("status" = 'refunded'::"public"."payment_status") AND ("refunded_amount" = "amount")) OR (("status" = 'partially_refunded'::"public"."payment_status") AND ("refunded_amount" > (0)::numeric) AND ("refunded_amount" < "amount")) OR (("status" = ANY (ARRAY['pending'::"public"."payment_status", 'paid'::"public"."payment_status", 'failed'::"public"."payment_status", 'expired'::"public"."payment_status"])) AND ("refunded_amount" = (0)::numeric)))),
    CONSTRAINT "payment_refunded_amount_check" CHECK (("refunded_amount" >= (0)::numeric))
);


ALTER TABLE "public"."payment" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_gateway_event" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payment_id" "uuid",
    "gateway" "text" NOT NULL,
    "gateway_event_id" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "signature_valid" boolean NOT NULL,
    "raw_payload" "jsonb" NOT NULL,
    "processing_result" "text" NOT NULL,
    "processing_note" "text",
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "payment_gateway_event_event_type_check" CHECK (("event_type" = ANY (ARRAY['payment.succeeded'::"text", 'payment.failed'::"text"]))),
    CONSTRAINT "payment_gateway_event_processing_result_check" CHECK (("processing_result" = ANY (ARRAY['processed'::"text", 'duplicate'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."payment_gateway_event" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payout_batch" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "driver_id" "uuid" NOT NULL,
    "period_start" timestamp with time zone NOT NULL,
    "period_end" timestamp with time zone NOT NULL,
    "total_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "reference" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "paid_at" timestamp with time zone,
    CONSTRAINT "payout_batch_check" CHECK (("period_end" > "period_start")),
    CONSTRAINT "payout_batch_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."payout_batch" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payout_ledger" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "driver_id" "uuid" NOT NULL,
    "trip_id" "uuid",
    "reservation_id" "uuid",
    "payment_id" "uuid",
    "entry_type" "text" NOT NULL,
    "gross_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "commission_pct" numeric(5,2) DEFAULT 0 NOT NULL,
    "commission_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "net_amount" numeric(12,2) NOT NULL,
    "payout_batch_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "payout_ledger_entry_type_check" CHECK (("entry_type" = ANY (ARRAY['earning'::"text", 'refund_adjustment'::"text"])))
);


ALTER TABLE "public"."payout_ledger" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pays" (
    "id" smallint NOT NULL,
    "code_iso" character(2) NOT NULL,
    "nom_ar" "text" NOT NULL,
    "nom_fr" "text" NOT NULL,
    "nom_en" "text" NOT NULL
);


ALTER TABLE "public"."pays" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."promo_code" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "discount_type" "text" NOT NULL,
    "discount_value" numeric(12,2) NOT NULL,
    "min_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "max_uses_total" integer,
    "max_uses_per_customer" integer DEFAULT 1 NOT NULL,
    "starts_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "promo_code_code_check" CHECK (("btrim"("code") <> ''::"text")),
    CONSTRAINT "promo_code_date_range" CHECK ((("starts_at" IS NULL) OR ("expires_at" IS NULL) OR ("starts_at" < "expires_at"))),
    CONSTRAINT "promo_code_discount_type_check" CHECK (("discount_type" = ANY (ARRAY['percentage'::"text", 'fixed'::"text"]))),
    CONSTRAINT "promo_code_discount_value_check" CHECK (("discount_value" > (0)::numeric)),
    CONSTRAINT "promo_code_max_uses_per_customer_check" CHECK (("max_uses_per_customer" > 0)),
    CONSTRAINT "promo_code_max_uses_total_check" CHECK ((("max_uses_total" IS NULL) OR ("max_uses_total" > 0))),
    CONSTRAINT "promo_code_min_amount_check" CHECK (("min_amount" >= (0)::numeric)),
    CONSTRAINT "promo_code_percentage_range" CHECK ((("discount_type" <> 'percentage'::"text") OR ("discount_value" <= (100)::numeric)))
);


ALTER TABLE "public"."promo_code" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."promo_redemption" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "promo_code_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "reservation_id" "uuid",
    "discount_amount" numeric(12,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "promo_redemption_discount_amount_check" CHECK (("discount_amount" > (0)::numeric))
);


ALTER TABLE "public"."promo_redemption" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_subscription" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "endpoint" "text" NOT NULL,
    "p256dh" "text" NOT NULL,
    "auth" "text" NOT NULL,
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."push_subscription" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rating" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reservation_id" "uuid" NOT NULL,
    "direction" "text" NOT NULL,
    "rater_customer_id" "uuid",
    "rater_driver_id" "uuid",
    "ratee_customer_id" "uuid",
    "ratee_driver_id" "uuid",
    "stars" smallint NOT NULL,
    "review" "text",
    "hidden_at" timestamp with time zone,
    "moderation_reason" "text",
    "moderated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "rating_direction_check" CHECK (("direction" = ANY (ARRAY['customer_to_driver'::"text", 'driver_to_customer'::"text"]))),
    CONSTRAINT "rating_direction_shape" CHECK (((("direction" = 'customer_to_driver'::"text") AND ("rater_customer_id" IS NOT NULL) AND ("rater_driver_id" IS NULL) AND ("ratee_driver_id" IS NOT NULL) AND ("ratee_customer_id" IS NULL)) OR (("direction" = 'driver_to_customer'::"text") AND ("rater_driver_id" IS NOT NULL) AND ("rater_customer_id" IS NULL) AND ("ratee_customer_id" IS NOT NULL) AND ("ratee_driver_id" IS NULL)))),
    CONSTRAINT "rating_stars_check" CHECK ((("stars" >= 1) AND ("stars" <= 5)))
);


ALTER TABLE "public"."rating" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recurring_trip_exception" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "exception_date" "date" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."recurring_trip_exception" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recurring_trip_template" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trajectory_id" "uuid" NOT NULL,
    "driver_id" "uuid",
    "vehicle_id" "uuid",
    "weekdays" smallint[] NOT NULL,
    "departure_time" time without time zone NOT NULL,
    "capacity" smallint NOT NULL,
    "seat_price" numeric(12,2) NOT NULL,
    "starts_on" "date" NOT NULL,
    "ends_on" "date",
    "horizon_days" integer DEFAULT 14 NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_generated_through" "date",
    CONSTRAINT "recurring_date_range" CHECK ((("ends_on" IS NULL) OR ("starts_on" <= "ends_on"))),
    CONSTRAINT "recurring_trip_template_capacity_check" CHECK (("capacity" > 0)),
    CONSTRAINT "recurring_trip_template_horizon_days_check" CHECK ((("horizon_days" >= 1) AND ("horizon_days" <= 90))),
    CONSTRAINT "recurring_trip_template_seat_price_check" CHECK (("seat_price" >= (0)::numeric)),
    CONSTRAINT "recurring_weekdays_nonempty" CHECK (("cardinality"("weekdays") > 0))
);


ALTER TABLE "public"."recurring_trip_template" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."referral_reward" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "referrer_id" "uuid" NOT NULL,
    "referred_id" "uuid" NOT NULL,
    "trigger_reservation_id" "uuid",
    "reward_amount" numeric(12,2) NOT NULL,
    "status" "text" DEFAULT 'paid'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "referral_reward_reward_amount_check" CHECK (("reward_amount" > (0)::numeric)),
    CONSTRAINT "referral_reward_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'paid'::"text"])))
);


ALTER TABLE "public"."referral_reward" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."refund" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payment_id" "uuid" NOT NULL,
    "reservation_id" "uuid" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "policy_pct" numeric(5,2),
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "initiated_by" "text" NOT NULL,
    "admin_id" "uuid",
    "gateway" "text",
    "gateway_refund_id" "text",
    "failure_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processed_at" timestamp with time zone,
    CONSTRAINT "refund_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "refund_initiated_by_check" CHECK (("initiated_by" = ANY (ARRAY['system'::"text", 'admin'::"text"]))),
    CONSTRAINT "refund_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'succeeded'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."refund" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reservation" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "trajectory_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "seats" smallint NOT NULL,
    "pickup_wpoint_id" "uuid",
    "dropoff_wpoint_id" "uuid",
    "status" "public"."reservation_status" DEFAULT 'pending'::"public"."reservation_status" NOT NULL,
    "total_price" numeric(12,2) NOT NULL,
    "currency" "text" DEFAULT 'DZD'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "pickup_lat" numeric(9,6),
    "pickup_lon" numeric(9,6),
    "dropoff_lat" numeric(9,6),
    "dropoff_lon" numeric(9,6),
    "pickup_commune_id" integer,
    "dropoff_commune_id" integer,
    "needs_wheelchair" boolean DEFAULT false NOT NULL,
    "has_pet" boolean DEFAULT false NOT NULL,
    "luggage_count" smallint DEFAULT 0 NOT NULL,
    "special_requirements" "text",
    CONSTRAINT "reservation_currency_check" CHECK (("currency" = 'DZD'::"text")),
    CONSTRAINT "reservation_distinct_endpoints" CHECK ((("pickup_wpoint_id" IS NULL) OR ("dropoff_wpoint_id" IS NULL) OR ("pickup_wpoint_id" <> "dropoff_wpoint_id"))),
    CONSTRAINT "reservation_dropoff_lat_check" CHECK ((("dropoff_lat" IS NULL) OR (("dropoff_lat" >= ('-90'::integer)::numeric) AND ("dropoff_lat" <= (90)::numeric)))),
    CONSTRAINT "reservation_dropoff_lon_check" CHECK ((("dropoff_lon" IS NULL) OR (("dropoff_lon" >= ('-180'::integer)::numeric) AND ("dropoff_lon" <= (180)::numeric)))),
    CONSTRAINT "reservation_luggage_count_check" CHECK (("luggage_count" >= 0)),
    CONSTRAINT "reservation_pickup_lat_check" CHECK ((("pickup_lat" IS NULL) OR (("pickup_lat" >= ('-90'::integer)::numeric) AND ("pickup_lat" <= (90)::numeric)))),
    CONSTRAINT "reservation_pickup_lon_check" CHECK ((("pickup_lon" IS NULL) OR (("pickup_lon" >= ('-180'::integer)::numeric) AND ("pickup_lon" <= (180)::numeric)))),
    CONSTRAINT "reservation_seats_check" CHECK ((("seats" >= 1) AND ("seats" <= 30))),
    CONSTRAINT "reservation_total_price_check" CHECK (("total_price" >= (0)::numeric))
);


ALTER TABLE "public"."reservation" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reservation_passenger" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reservation_id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "phone" "text",
    "fare_share" numeric(12,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "reservation_passenger_fare_share_check" CHECK ((("fare_share" IS NULL) OR ("fare_share" >= (0)::numeric))),
    CONSTRAINT "reservation_passenger_full_name_check" CHECK (("btrim"("full_name") <> ''::"text"))
);


ALTER TABLE "public"."reservation_passenger" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."search_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "from_wilaya_id" smallint,
    "to_wilaya_id" smallint,
    "from_commune_id" integer,
    "to_commune_id" integer,
    "date_from" "date",
    "date_to" "date",
    "results_count" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."search_log" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."seq_business_code"
    START WITH 100001
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."seq_business_code" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sms_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "phone" "text" NOT NULL,
    "purpose" "text" NOT NULL,
    "notification_id" "uuid",
    "message" "text" NOT NULL,
    "status" "text" NOT NULL,
    "provider_message_id" "text",
    "error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "sms_log_purpose_check" CHECK (("purpose" = ANY (ARRAY['notification'::"text", 'otp'::"text"]))),
    CONSTRAINT "sms_log_status_check" CHECK (("status" = ANY (ARRAY['sent'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."sms_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sos_event" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reservation_id" "uuid",
    "trip_id" "uuid",
    "triggered_by_role" "text" NOT NULL,
    "triggered_by_id" "uuid" NOT NULL,
    "gps_lat" numeric(9,6),
    "gps_lon" numeric(9,6),
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "notes" "text",
    "resolved_at" timestamp with time zone,
    "resolved_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "sos_event_gps_lat_check" CHECK ((("gps_lat" IS NULL) OR (("gps_lat" >= ('-90'::integer)::numeric) AND ("gps_lat" <= (90)::numeric)))),
    CONSTRAINT "sos_event_gps_lon_check" CHECK ((("gps_lon" IS NULL) OR (("gps_lon" >= ('-180'::integer)::numeric) AND ("gps_lon" <= (180)::numeric)))),
    CONSTRAINT "sos_event_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'acknowledged'::"text", 'resolved'::"text"]))),
    CONSTRAINT "sos_event_triggered_by_role_check" CHECK (("triggered_by_role" = ANY (ARRAY['customer'::"text", 'driver'::"text"])))
);


ALTER TABLE "public"."sos_event" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trajectory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "price_multiplier" numeric(4,2) DEFAULT 1.0 NOT NULL,
    CONSTRAINT "trajectory_name_check" CHECK (("btrim"("name") <> ''::"text")),
    CONSTRAINT "trajectory_price_multiplier_check" CHECK (("price_multiplier" > (0)::numeric))
);


ALTER TABLE "public"."trajectory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "trajectory_id" "uuid" NOT NULL,
    "status" "public"."trip_status" DEFAULT 'scheduled'::"public"."trip_status" NOT NULL,
    "published_at" timestamp with time zone,
    "departure_at" timestamp with time zone NOT NULL,
    "arrival_eta" timestamp with time zone,
    "capacity" smallint NOT NULL,
    "seat_price" numeric(12,2) NOT NULL,
    "currency" "text" DEFAULT 'DZD'::"text" NOT NULL,
    "driver_id" "uuid",
    "vehicle_id" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reminder_sent_at" timestamp with time zone,
    "recurring_template_id" "uuid",
    "recurring_date" "date",
    "reminder_24h_sent_at" timestamp with time zone,
    CONSTRAINT "trip_capacity_check" CHECK (("capacity" > 0)),
    CONSTRAINT "trip_currency_check" CHECK (("currency" = 'DZD'::"text")),
    CONSTRAINT "trip_eta_after_departure" CHECK ((("arrival_eta" IS NULL) OR ("arrival_eta" >= "departure_at"))),
    CONSTRAINT "trip_seat_price_check" CHECK (("seat_price" >= (0)::numeric))
);


ALTER TABLE "public"."trip" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_price" (
    "trip_id" "uuid" NOT NULL,
    "from_wpoint_id" "uuid" NOT NULL,
    "to_wpoint_id" "uuid" NOT NULL,
    "currency" "text" DEFAULT 'DZD'::"text" NOT NULL,
    "price" numeric(12,2) NOT NULL,
    "min_price" numeric(12,2),
    "max_price" numeric(12,2),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "trip_price_bounds" CHECK (((("min_price" IS NULL) OR ("min_price" <= "price")) AND (("max_price" IS NULL) OR ("price" <= "max_price")) AND (("min_price" IS NULL) OR ("max_price" IS NULL) OR ("min_price" <= "max_price")))),
    CONSTRAINT "trip_price_currency_check" CHECK (("currency" = 'DZD'::"text")),
    CONSTRAINT "trip_price_distinct" CHECK (("from_wpoint_id" <> "to_wpoint_id")),
    CONSTRAINT "trip_price_max_price_check" CHECK ((("max_price" IS NULL) OR ("max_price" >= (0)::numeric))),
    CONSTRAINT "trip_price_min_price_check" CHECK ((("min_price" IS NULL) OR ("min_price" >= (0)::numeric))),
    CONSTRAINT "trip_price_price_check" CHECK (("price" >= (0)::numeric))
);


ALTER TABLE "public"."trip_price" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_share_token" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reservation_id" "uuid" NOT NULL,
    "token_hash" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "revoked_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."trip_share_token" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_stop" (
    "trip_id" "uuid" NOT NULL,
    "trajectory_id" "uuid" NOT NULL,
    "wpoint_id" "uuid" NOT NULL,
    "eta" timestamp with time zone
);


ALTER TABLE "public"."trip_stop" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wilaya" (
    "id" smallint NOT NULL,
    "pays_id" smallint DEFAULT 1 NOT NULL,
    "code" character(2) NOT NULL,
    "nom_ar" "text" NOT NULL,
    "nom_fr" "text" NOT NULL,
    "nom_en" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "wilaya_code_check" CHECK (("code" ~ '^[0-9]{2}$'::"text")),
    CONSTRAINT "wilaya_id_check" CHECK ((("id" >= 1) AND ("id" <= 99))),
    CONSTRAINT "wilaya_nom_fr_check" CHECK (("btrim"("nom_fr") <> ''::"text"))
);


ALTER TABLE "public"."wilaya" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_administrative_registry" WITH ("security_invoker"='true') AS
 SELECT "w"."code" AS "wilaya_code",
    "w"."id" AS "wilaya_id",
    "w"."nom_fr" AS "wilaya_fr",
    "w"."nom_ar" AS "wilaya_ar",
    "w"."nom_en" AS "wilaya_en",
    "d"."id" AS "daira_id",
    "d"."nom_fr" AS "daira_fr",
    "d"."nom_ar" AS "daira_ar",
    "c"."id" AS "commune_id",
    "c"."nom_fr" AS "commune_fr",
    "c"."nom_ar" AS "commune_ar",
    "c"."nom_en" AS "commune_en",
    "c"."code_postal"
   FROM (("public"."wilaya" "w"
     JOIN "public"."daira" "d" ON (("d"."wilaya_id" = "w"."id")))
     JOIN "public"."commune" "c" ON (("c"."daira_id" = "d"."id")));


ALTER VIEW "public"."v_administrative_registry" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_domain_errors" WITH ("security_invoker"='true') AS
 SELECT "sqlstate",
    "code_name",
    "ts_equivalent",
    "description"
   FROM ( VALUES ('DZ001'::"text",'DOMAIN_ERROR'::"text",'DomainError'::"text",'Generic domain rule violation'::"text"), ('DZ101'::"text",'INVALID_TRAJECTORY_NAME'::"text",'InvalidTrajectoryNameError'::"text",'Trajectory name is empty/blank'::"text"), ('DZ102'::"text",'TRAJECTORY_NOT_FOUND'::"text",'DomainError'::"text",'Unknown trajectory id'::"text"), ('DZ103'::"text",'TRAJECTORY_NAME_IMMUTABLE'::"text",'DomainError'::"text",'Trajectory identity (name) cannot change'::"text"), ('DZ201'::"text",'INVALID_WILAYA'::"text",'InvalidWilayaError'::"text",'Unknown wilaya name/code'::"text"), ('DZ202'::"text",'INVALID_DAIRA'::"text",'InvalidDairaError'::"text",'Daira does not belong to the wilaya'::"text"), ('DZ203'::"text",'INVALID_COMMUNE'::"text",'InvalidCommuneError'::"text",'Commune does not belong to the wilaya'::"text"), ('DZ204'::"text",'INVALID_WPOINT_MERGE'::"text",'InvalidWPointMergeError'::"text",'Cannot merge WPoints of different wilayas'::"text"), ('DZ205'::"text",'WPOINT_NOT_FOUND'::"text",'DomainError'::"text",'Unknown WPoint id'::"text"), ('DZ206'::"text",'WPOINT_IDENTITY_IMMUTABLE'::"text",'DomainError'::"text",'WPoint wilaya/trajectory cannot change'::"text"), ('DZ301'::"text",'TRIP_NOT_FOUND'::"text",'DomainError'::"text",'Unknown trip id'::"text"), ('DZ302'::"text",'TRIP_NOT_BOOKABLE'::"text",'DomainError'::"text",'Trip is not scheduled / not published / already departed'::"text"), ('DZ303'::"text",'INSUFFICIENT_SEATS'::"text",'DomainError'::"text",'Not enough free seats on the trip'::"text"), ('DZ304'::"text",'INVALID_TRIP_TRANSITION'::"text",'DomainError'::"text",'Illegal trip status transition'::"text"), ('DZ305'::"text",'CAPACITY_TOO_LOW'::"text",'DomainError'::"text",'New capacity below already-held seats'::"text"), ('DZ306'::"text",'TRIP_LOCKED'::"text",'DomainError'::"text",'Trip is published and has active reservations; core fields locked'::"text"), ('DZ307'::"text",'STOPS_LOCKED'::"text",'DomainError'::"text",'Trip stops/prices locked because reservations exist'::"text"), ('DZ308'::"text",'TRIP_PRICE_NOT_DEFINED'::"text",'DomainError'::"text",'No price defined for the selected FROM/TO stops'::"text"), ('DZ401'::"text",'RESERVATION_NOT_FOUND'::"text",'DomainError'::"text",'Unknown reservation id'::"text"), ('DZ402'::"text",'INVALID_RESERVATION_TRANSITION'::"text",'DomainError'::"text",'Illegal reservation status transition / immutable field'::"text"), ('DZ403'::"text",'RESERVATION_NOT_PAYABLE'::"text",'DomainError'::"text",'Cancelled reservations cannot be paid'::"text"), ('DZ404'::"text",'CUSTOMER_NOT_FOUND'::"text",'DomainError'::"text",'Unknown customer id'::"text"), ('DZ501'::"text",'PAYMENT_NOT_FOUND'::"text",'DomainError'::"text",'Unknown payment id'::"text"), ('DZ502'::"text",'INVALID_PAYMENT_TRANSITION'::"text",'DomainError'::"text",'Illegal payment status transition / immutable field'::"text"), ('DZ503'::"text",'PAYMENT_EXCEEDS_TOTAL'::"text",'DomainError'::"text",'Paid amount would exceed reservation total'::"text"), ('DZ504'::"text",'CURRENCY_MISMATCH'::"text",'DomainError'::"text",'Currency mismatch'::"text"), ('DZ505'::"text",'INVALID_REFUND_AMOUNT'::"text",'DomainError'::"text",'Refund amount <= 0 or above refundable balance'::"text"), ('DZ601'::"text",'INVALID_STOP'::"text",'DomainError'::"text",'WPoint is not a valid stop/endpoint of the trip'::"text"), ('DZ602'::"text",'WPOINT_IN_USE'::"text",'DomainError'::"text",'WPoint is referenced by reservations'::"text"), ('DZ603'::"text",'INVALID_ROUTE_ORDER'::"text",'DomainError'::"text",'Pickup must come before dropoff on the trajectory'::"text"), ('DZ604'::"text",'COMMUNE_NOT_SERVED'::"text",'DomainError'::"text",'Commune is not among the ones configured for this stop'::"text"), ('DZ605'::"text",'INVALID_COORDINATES'::"text",'DomainError'::"text",'GPS coordinates fall outside Algeria'::"text"), ('DZ309'::"text",'DRIVER_NO_SHOW_INVALID_STATE'::"text",'DomainError'::"text",'Driver no-show can only be recorded on a trip that has not started'::"text"), ('DZ701'::"text",'KYC_DOCUMENT_NOT_FOUND'::"text",'DomainError'::"text",'Unknown KYC document id'::"text"), ('DZ702'::"text",'KYC_ALREADY_REVIEWED'::"text",'DomainError'::"text",'KYC document has already been approved or rejected'::"text"), ('DZ703'::"text",'KYC_REJECTION_REASON_REQUIRED'::"text",'DomainError'::"text",'A rejection reason is required'::"text"), ('DZ711'::"text",'VEHICLE_INSPECTION_NOT_FOUND'::"text",'DomainError'::"text",'Unknown vehicle inspection record id'::"text"), ('DZ712'::"text",'VEHICLE_INSPECTION_REVIEWED'::"text",'DomainError'::"text",'Vehicle inspection record has already been approved or rejected'::"text"), ('DZ713'::"text",'VEHICLE_INSPECTION_REASON_REQUIRED'::"text",'DomainError'::"text",'A rejection reason is required'::"text"), ('DZ714'::"text",'VEHICLE_NOT_ELIGIBLE'::"text",'DomainError'::"text",'Vehicle has no approved, unexpired inspection on file (or is marked out of service); trip cannot be published'::"text"), ('DZ721'::"text",'RATING_NOT_ELIGIBLE'::"text",'DomainError'::"text",'Only a completed reservation can be rated'::"text"), ('DZ722'::"text",'RATING_ALREADY_SUBMITTED'::"text",'DomainError'::"text",'This relationship has already been rated'::"text"), ('DZ723'::"text",'RATING_RATER_MISMATCH'::"text",'DomainError'::"text",'Rater does not match this reservation'::"text"), ('DZ731'::"text",'PAYMENT_INTENT_NOT_FOUND'::"text",'DomainError'::"text",'Unknown payment gateway transaction'::"text"), ('DZ732'::"text",'PAYMENT_WEBHOOK_SIGNATURE_INVALID'::"text",'DomainError'::"text",'Webhook signature verification failed'::"text"), ('DZ733'::"text",'PAYMENT_INTENT_NOT_PENDING'::"text",'DomainError'::"text",'Payment intent has already been resolved (not pending)'::"text"), ('DZ741'::"text",'REFUND_NOT_FOUND'::"text",'DomainError'::"text",'Unknown refund id'::"text"), ('DZ742'::"text",'REFUND_NOT_PENDING'::"text",'DomainError'::"text",'Refund is not in a pending/processing state'::"text"), ('DZ743'::"text",'REFUND_FAILURE_REASON_REQUIRED'::"text",'DomainError'::"text",'A failure reason is required to mark a refund as failed'::"text"), ('DZ744'::"text",'REFUND_NOT_FAILED'::"text",'DomainError'::"text",'Only a failed refund can be retried'::"text"), ('DZ751'::"text",'PROMO_CODE_NOT_FOUND'::"text",'DomainError'::"text",'Unknown promo code'::"text"), ('DZ752'::"text",'PROMO_CODE_INACTIVE'::"text",'DomainError'::"text",'Promo code is not active'::"text"), ('DZ753'::"text",'PROMO_CODE_NOT_VALID_NOW'::"text",'DomainError'::"text",'Promo code is not within its valid date range'::"text"), ('DZ754'::"text",'PROMO_CODE_MIN_AMOUNT'::"text",'DomainError'::"text",'Reservation amount is below the promo code minimum'::"text"), ('DZ755'::"text",'PROMO_CODE_EXHAUSTED'::"text",'DomainError'::"text",'Promo code total usage limit reached'::"text"), ('DZ756'::"text",'PROMO_CODE_ALREADY_USED'::"text",'DomainError'::"text",'You have already used this promo code the maximum number of times'::"text"), ('DZ761'::"text",'WALLET_INVALID_AMOUNT'::"text",'DomainError'::"text",'Wallet credit/debit amount must be positive'::"text"), ('DZ762'::"text",'WALLET_INSUFFICIENT_BALANCE'::"text",'DomainError'::"text",'Insufficient wallet balance'::"text"), ('DZ771'::"text",'REFERRAL_CODE_NOT_FOUND'::"text",'DomainError'::"text",'Unknown referral code'::"text"), ('DZ772'::"text",'REFERRAL_SELF'::"text",'DomainError'::"text",'You cannot refer yourself'::"text"), ('DZ773'::"text",'REFERRAL_ALREADY_ATTRIBUTED'::"text",'DomainError'::"text",'This account already has a referrer on file'::"text"), ('DZ781'::"text",'PAYOUT_BATCH_NOT_FOUND'::"text",'DomainError'::"text",'Unknown payout batch id'::"text"), ('DZ782'::"text",'PAYOUT_BATCH_ALREADY_PAID'::"text",'DomainError'::"text",'Payout batch has already been marked as paid'::"text"), ('DZ783'::"text",'PAYOUT_BATCH_EMPTY'::"text",'DomainError'::"text",'No unbatched payout ledger entries in that period for this driver'::"text"), ('DZ801'::"text",'WAITLIST_NOT_FOUND'::"text",'DomainError'::"text",'Unknown waitlist entry id'::"text"), ('DZ802'::"text",'WAITLIST_ALREADY_ACTIVE'::"text",'DomainError'::"text",'Customer already has an active waitlist entry for this trip'::"text"), ('DZ803'::"text",'WAITLIST_INVALID_TRANSITION'::"text",'DomainError'::"text",'Illegal waitlist entry status transition'::"text"), ('DZ804'::"text",'WAITLIST_TRIP_NOT_SCHEDULED'::"text",'DomainError'::"text",'Can only join the waitlist of a scheduled, published trip'::"text"), ('DZ811'::"text",'RECURRING_TEMPLATE_NOT_FOUND'::"text",'DomainError'::"text",'Unknown recurring trip template id'::"text"), ('DZ812'::"text",'RECURRING_TEMPLATE_INVALID_RULE'::"text",'DomainError'::"text",'Recurrence rule must select at least one weekday'::"text"), ('DZ813'::"text",'RECURRING_EXCEPTION_INVALID'::"text",'DomainError'::"text",'Exception date is outside the template''s generation window'::"text"), ('DZ821'::"text",'FAVORITE_NOT_FOUND'::"text",'DomainError'::"text",'Unknown favorite id'::"text"), ('DZ831'::"text",'PASSENGER_LIST_MISMATCH'::"text",'DomainError'::"text",'Number of named passengers must match the reserved seat count'::"text"), ('DZ832'::"text",'PASSENGER_NAME_REQUIRED'::"text",'DomainError'::"text",'Each passenger needs a name'::"text"), ('DZ841'::"text",'SERVICE_REQUIREMENT_UNSUPPORTED'::"text",'DomainError'::"text",'Trip/vehicle cannot accommodate the requested service requirement'::"text"), ('DZ851'::"text",'CONVERSATION_NOT_FOUND'::"text",'DomainError'::"text",'Unknown conversation id'::"text"), ('DZ852'::"text",'MESSAGE_FORBIDDEN'::"text",'DomainError'::"text",'You are not a participant in this conversation'::"text"), ('DZ853'::"text",'MESSAGE_EMPTY'::"text",'DomainError'::"text",'Message body cannot be empty'::"text"), ('DZ854'::"text",'MESSAGE_RATE_LIMITED'::"text",'DomainError'::"text",'Too many messages sent in a short period — please slow down'::"text"), ('DZ861'::"text",'CONTACT_REVEAL_FORBIDDEN'::"text",'DomainError'::"text",'Only the driver/customer of this reservation may request contact'::"text"), ('DZ862'::"text",'SHARE_TOKEN_NOT_FOUND'::"text",'DomainError'::"text",'Unknown or invalid share link'::"text"), ('DZ863'::"text",'SHARE_TOKEN_EXPIRED'::"text",'DomainError'::"text",'This share link has expired'::"text"), ('DZ864'::"text",'SHARE_TOKEN_REVOKED'::"text",'DomainError'::"text",'This share link has been revoked'::"text"), ('DZ871'::"text",'SOS_NOT_FOUND'::"text",'DomainError'::"text",'Unknown SOS event id'::"text"), ('DZ872'::"text",'SOS_RATE_LIMITED'::"text",'DomainError'::"text",'Too many SOS triggers in a short period — please wait or call emergency services directly'::"text"), ('DZ881'::"text",'PERMISSION_DENIED'::"text",'DomainError'::"text",'Your admin role does not grant this permission'::"text"), ('DZ882'::"text",'ADMIN_ROLE_NOT_FOUND'::"text",'DomainError'::"text",'Unknown admin role'::"text"), ('DZ891'::"text",'IMPORT_RUN_NOT_FOUND'::"text",'DomainError'::"text",'Unknown registry import run id'::"text")) "t"("sqlstate", "code_name", "ts_equivalent", "description");


ALTER VIEW "public"."v_domain_errors" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_payment" WITH ("security_invoker"='true') AS
 SELECT "p"."id",
    "p"."code",
    "p"."amount",
    "p"."refunded_amount",
    "p"."currency",
    "p"."method",
    "p"."status",
    "p"."reference",
    "p"."paid_at",
    "p"."created_at",
    "r"."code" AS "reservation_code",
    "r"."status" AS "reservation_status",
    "cs"."full_name" AS "customer_name",
    "tr"."code" AS "trip_code",
    "p"."gateway",
    "p"."gateway_transaction_id",
    "p"."failure_reason",
    "p"."expires_at"
   FROM ((("public"."payment" "p"
     JOIN "public"."reservation" "r" ON (("r"."id" = "p"."reservation_id")))
     JOIN "public"."customer" "cs" ON (("cs"."id" = "r"."customer_id")))
     JOIN "public"."trip" "tr" ON (("tr"."id" = "r"."trip_id")));


ALTER VIEW "public"."v_payment" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_refund_due" WITH ("security_invoker"='true') AS
 SELECT "rf"."id" AS "refund_id",
    "rf"."payment_id",
    "rf"."reservation_id",
    "rf"."amount" AS "refund_due",
    "rf"."status",
    "rf"."policy_pct",
    "rf"."initiated_by",
    "rf"."created_at",
    "r"."code" AS "reservation_code",
    "cs"."full_name" AS "customer_name",
    "cs"."phone" AS "customer_phone"
   FROM (("public"."refund" "rf"
     JOIN "public"."reservation" "r" ON (("r"."id" = "rf"."reservation_id")))
     JOIN "public"."customer" "cs" ON (("cs"."id" = "r"."customer_id")))
  WHERE ("rf"."status" = 'pending'::"text");


ALTER VIEW "public"."v_refund_due" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_reservation" WITH ("security_invoker"='true') AS
 SELECT "r"."id",
    "r"."code",
    "r"."status",
    "r"."seats",
    "r"."total_price",
    "r"."currency",
    "r"."notes",
    "r"."created_at",
    "tr"."code" AS "trip_code",
    "tr"."departure_at",
    "tj"."name" AS "trajectory_name",
    "cs"."full_name" AS "customer_name",
    "cs"."phone" AS "customer_phone",
    "public"."amount_paid"("r"."id") AS "amount_paid",
        CASE
            WHEN ("r"."status" = 'cancelled'::"public"."reservation_status") THEN (0)::numeric
            ELSE GREATEST(("r"."total_price" - "public"."amount_paid"("r"."id")), (0)::numeric)
        END AS "balance_due"
   FROM ((("public"."reservation" "r"
     JOIN "public"."trip" "tr" ON (("tr"."id" = "r"."trip_id")))
     JOIN "public"."trajectory" "tj" ON (("tj"."id" = "r"."trajectory_id")))
     JOIN "public"."customer" "cs" ON (("cs"."id" = "r"."customer_id")));


ALTER VIEW "public"."v_reservation" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vehicle" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "matricule" "text" NOT NULL,
    "seats" smallint NOT NULL,
    "nif_owner" "text",
    "make" "text",
    "model" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "wheelchair_accessible" boolean DEFAULT false NOT NULL,
    "pets_allowed" boolean DEFAULT true NOT NULL,
    "luggage_capacity" smallint,
    CONSTRAINT "vehicle_luggage_capacity_check" CHECK ((("luggage_capacity" IS NULL) OR ("luggage_capacity" >= 0))),
    CONSTRAINT "vehicle_matricule_check" CHECK (("btrim"("matricule") <> ''::"text")),
    CONSTRAINT "vehicle_nif_owner_check" CHECK ((("nif_owner" IS NULL) OR ("nif_owner" ~ '^[0-9]{20}$'::"text"))),
    CONSTRAINT "vehicle_seats_check" CHECK ((("seats" >= 1) AND ("seats" <= 32767)))
);


ALTER TABLE "public"."vehicle" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_trip" WITH ("security_invoker"='true') AS
 SELECT "tr"."id",
    "tr"."code",
    "tr"."status",
    "tr"."published_at",
    "tr"."departure_at",
    "tr"."arrival_eta",
    "tr"."capacity",
    "tr"."seat_price",
    "tr"."currency",
    "tr"."driver_id",
    "d"."full_name" AS "driver_name",
    "tr"."vehicle_id",
    "v"."matricule" AS "vehicle_matricule",
    "tj"."id" AS "trajectory_id",
    "tj"."name" AS "trajectory_name",
    "public"."seats_available"("tr"."id") AS "seats_available",
    ( SELECT "count"(*) AS "count"
           FROM "public"."reservation" "r"
          WHERE (("r"."trip_id" = "tr"."id") AND ("r"."status" = ANY (ARRAY['pending'::"public"."reservation_status", 'confirmed'::"public"."reservation_status"])))) AS "nb_active_reservations"
   FROM ((("public"."trip" "tr"
     JOIN "public"."trajectory" "tj" ON (("tj"."id" = "tr"."trajectory_id")))
     LEFT JOIN "public"."driver" "d" ON (("d"."id" = "tr"."driver_id")))
     LEFT JOIN "public"."vehicle" "v" ON (("v"."id" = "tr"."vehicle_id")));


ALTER VIEW "public"."v_trip" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_wilaya_overview" WITH ("security_invoker"='true') AS
 SELECT "w"."id",
    "w"."code",
    "w"."nom_fr",
    "w"."nom_ar",
    "w"."nom_en",
    "count"(DISTINCT "d"."id") AS "nb_dairas",
    "count"(DISTINCT "c"."id") AS "nb_communes",
    "count"(DISTINCT "c"."code_postal") AS "nb_codes_postaux"
   FROM (("public"."wilaya" "w"
     LEFT JOIN "public"."daira" "d" ON (("d"."wilaya_id" = "w"."id")))
     LEFT JOIN "public"."commune" "c" ON (("c"."daira_id" = "d"."id")))
  GROUP BY "w"."id", "w"."code", "w"."nom_fr", "w"."nom_ar", "w"."nom_en";


ALTER VIEW "public"."v_wilaya_overview" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vehicle_inspection" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vehicle_id" "uuid" NOT NULL,
    "submitted_by_driver" "uuid",
    "inspection_date" "date" NOT NULL,
    "expiry_date" "date" NOT NULL,
    "maintenance_status" "text" DEFAULT 'ok'::"text" NOT NULL,
    "file_path" "text",
    "file_name" "text",
    "mime_type" "text",
    "notes" "text",
    "approval_state" "text" DEFAULT 'pending'::"text" NOT NULL,
    "rejection_reason" "text",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "vehicle_inspection_approval_state_check" CHECK (("approval_state" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "vehicle_inspection_check" CHECK (("expiry_date" > "inspection_date")),
    CONSTRAINT "vehicle_inspection_maintenance_status_check" CHECK (("maintenance_status" = ANY (ARRAY['ok'::"text", 'needs_service'::"text", 'out_of_service'::"text"])))
);


ALTER TABLE "public"."vehicle_inspection" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vehicle_last_location" (
    "vehicle_id" "uuid" NOT NULL,
    "gps_lat" numeric(9,6) NOT NULL,
    "gps_lon" numeric(9,6) NOT NULL,
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "vehicle_last_location_gps_lat_check" CHECK ((("gps_lat" >= ('-90'::integer)::numeric) AND ("gps_lat" <= (90)::numeric))),
    CONSTRAINT "vehicle_last_location_gps_lon_check" CHECK ((("gps_lon" >= ('-180'::integer)::numeric) AND ("gps_lon" <= (180)::numeric)))
);


ALTER TABLE "public"."vehicle_last_location" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."waitlist_entry" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "seats" smallint NOT NULL,
    "pickup_wpoint_id" "uuid",
    "dropoff_wpoint_id" "uuid",
    "position" integer NOT NULL,
    "status" "text" DEFAULT 'waiting'::"text" NOT NULL,
    "reservation_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "promoted_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    CONSTRAINT "waitlist_entry_seats_check" CHECK ((("seats" >= 1) AND ("seats" <= 30))),
    CONSTRAINT "waitlist_entry_status_check" CHECK (("status" = ANY (ARRAY['waiting'::"text", 'promoted'::"text", 'cancelled'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."waitlist_entry" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wallet_entry" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "entry_type" "text" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "reservation_id" "uuid",
    "reference_id" "uuid",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "wallet_entry_amount_check" CHECK (("amount" <> (0)::numeric)),
    CONSTRAINT "wallet_entry_entry_type_check" CHECK (("entry_type" = ANY (ARRAY['refund_credit'::"text", 'promo_credit'::"text", 'referral_credit'::"text", 'booking_debit'::"text", 'admin_adjustment'::"text"])))
);


ALTER TABLE "public"."wallet_entry" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wpoint" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trajectory_id" "uuid" NOT NULL,
    "wilaya_id" smallint NOT NULL,
    "position" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "wpoint_position_check" CHECK (("position" > 0))
);


ALTER TABLE "public"."wpoint" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wpoint_commune" (
    "wpoint_id" "uuid" NOT NULL,
    "wilaya_id" smallint NOT NULL,
    "commune_id" integer NOT NULL,
    "sort_key" bigint NOT NULL,
    "added_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."wpoint_commune" OWNER TO "postgres";


ALTER TABLE "public"."wpoint_commune" ALTER COLUMN "sort_key" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."wpoint_commune_sort_key_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."admin_audit_log"
    ADD CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_session"
    ADD CONSTRAINT "app_session_pkey" PRIMARY KEY ("token_hash");



ALTER TABLE ONLY "public"."app_setting"
    ADD CONSTRAINT "app_setting_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."app_user"
    ADD CONSTRAINT "app_user_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."app_user_otp"
    ADD CONSTRAINT "app_user_otp_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_user"
    ADD CONSTRAINT "app_user_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."commune"
    ADD CONSTRAINT "commune_id_wilaya_id_key" UNIQUE ("id", "wilaya_id");



ALTER TABLE ONLY "public"."commune"
    ADD CONSTRAINT "commune_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."commune"
    ADD CONSTRAINT "commune_wilaya_id_nom_fr_key" UNIQUE ("wilaya_id", "nom_fr");



ALTER TABLE ONLY "public"."contact_reveal_log"
    ADD CONSTRAINT "contact_reveal_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversation"
    ADD CONSTRAINT "conversation_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversation"
    ADD CONSTRAINT "conversation_reservation_id_key" UNIQUE ("reservation_id");



ALTER TABLE ONLY "public"."customer"
    ADD CONSTRAINT "customer_phone_key" UNIQUE ("phone");



ALTER TABLE ONLY "public"."customer"
    ADD CONSTRAINT "customer_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer"
    ADD CONSTRAINT "customer_referral_code_key" UNIQUE ("referral_code");



ALTER TABLE ONLY "public"."daira"
    ADD CONSTRAINT "daira_id_wilaya_id_key" UNIQUE ("id", "wilaya_id");



ALTER TABLE ONLY "public"."daira"
    ADD CONSTRAINT "daira_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daira"
    ADD CONSTRAINT "daira_wilaya_id_nom_fr_key" UNIQUE ("wilaya_id", "nom_fr");



ALTER TABLE ONLY "public"."default_trip_price"
    ADD CONSTRAINT "default_trip_price_pkey" PRIMARY KEY ("trajectory_id", "from_wpoint_id", "to_wpoint_id");



ALTER TABLE ONLY "public"."driver_last_location"
    ADD CONSTRAINT "driver_last_location_pkey" PRIMARY KEY ("driver_id");



ALTER TABLE ONLY "public"."driver"
    ADD CONSTRAINT "driver_nin_key" UNIQUE ("nin");



ALTER TABLE ONLY "public"."driver"
    ADD CONSTRAINT "driver_phone_key" UNIQUE ("phone");



ALTER TABLE ONLY "public"."driver"
    ADD CONSTRAINT "driver_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."emergency_contact"
    ADD CONSTRAINT "emergency_contact_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."favorite_driver"
    ADD CONSTRAINT "favorite_driver_customer_id_driver_id_key" UNIQUE ("customer_id", "driver_id");



ALTER TABLE ONLY "public"."favorite_driver"
    ADD CONSTRAINT "favorite_driver_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."favorite_route"
    ADD CONSTRAINT "favorite_route_customer_id_origin_wpoint_id_destination_wpo_key" UNIQUE ("customer_id", "origin_wpoint_id", "destination_wpoint_id");



ALTER TABLE ONLY "public"."favorite_route"
    ADD CONSTRAINT "favorite_route_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."import_log"
    ADD CONSTRAINT "import_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kyc_document"
    ADD CONSTRAINT "kyc_document_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message"
    ADD CONSTRAINT "message_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."no_show_event"
    ADD CONSTRAINT "no_show_event_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification"
    ADD CONSTRAINT "notification_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment"
    ADD CONSTRAINT "payment_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."payment_gateway_event"
    ADD CONSTRAINT "payment_gateway_event_gateway_gateway_event_id_key" UNIQUE ("gateway", "gateway_event_id");



ALTER TABLE ONLY "public"."payment_gateway_event"
    ADD CONSTRAINT "payment_gateway_event_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment"
    ADD CONSTRAINT "payment_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payout_batch"
    ADD CONSTRAINT "payout_batch_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payout_ledger"
    ADD CONSTRAINT "payout_ledger_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pays"
    ADD CONSTRAINT "pays_code_iso_key" UNIQUE ("code_iso");



ALTER TABLE ONLY "public"."pays"
    ADD CONSTRAINT "pays_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."promo_code"
    ADD CONSTRAINT "promo_code_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."promo_code"
    ADD CONSTRAINT "promo_code_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."promo_redemption"
    ADD CONSTRAINT "promo_redemption_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_subscription"
    ADD CONSTRAINT "push_subscription_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_subscription"
    ADD CONSTRAINT "push_subscription_user_id_endpoint_key" UNIQUE ("user_id", "endpoint");



ALTER TABLE ONLY "public"."rating"
    ADD CONSTRAINT "rating_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rating"
    ADD CONSTRAINT "rating_reservation_id_direction_key" UNIQUE ("reservation_id", "direction");



ALTER TABLE ONLY "public"."recurring_trip_exception"
    ADD CONSTRAINT "recurring_trip_exception_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recurring_trip_exception"
    ADD CONSTRAINT "recurring_trip_exception_template_id_exception_date_key" UNIQUE ("template_id", "exception_date");



ALTER TABLE ONLY "public"."recurring_trip_template"
    ADD CONSTRAINT "recurring_trip_template_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."referral_reward"
    ADD CONSTRAINT "referral_reward_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."referral_reward"
    ADD CONSTRAINT "referral_reward_referrer_id_referred_id_key" UNIQUE ("referrer_id", "referred_id");



ALTER TABLE ONLY "public"."refund"
    ADD CONSTRAINT "refund_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reservation"
    ADD CONSTRAINT "reservation_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."reservation_passenger"
    ADD CONSTRAINT "reservation_passenger_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reservation"
    ADD CONSTRAINT "reservation_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."search_log"
    ADD CONSTRAINT "search_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sms_log"
    ADD CONSTRAINT "sms_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sos_event"
    ADD CONSTRAINT "sos_event_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trajectory"
    ADD CONSTRAINT "trajectory_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."trajectory"
    ADD CONSTRAINT "trajectory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip"
    ADD CONSTRAINT "trip_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."trip"
    ADD CONSTRAINT "trip_id_trajectory_id_key" UNIQUE ("id", "trajectory_id");



ALTER TABLE ONLY "public"."trip"
    ADD CONSTRAINT "trip_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_price"
    ADD CONSTRAINT "trip_price_pkey" PRIMARY KEY ("trip_id", "from_wpoint_id", "to_wpoint_id");



ALTER TABLE ONLY "public"."trip_share_token"
    ADD CONSTRAINT "trip_share_token_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_share_token"
    ADD CONSTRAINT "trip_share_token_token_hash_key" UNIQUE ("token_hash");



ALTER TABLE ONLY "public"."trip_stop"
    ADD CONSTRAINT "trip_stop_pkey" PRIMARY KEY ("trip_id", "wpoint_id");



ALTER TABLE ONLY "public"."vehicle_inspection"
    ADD CONSTRAINT "vehicle_inspection_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vehicle_last_location"
    ADD CONSTRAINT "vehicle_last_location_pkey" PRIMARY KEY ("vehicle_id");



ALTER TABLE ONLY "public"."vehicle"
    ADD CONSTRAINT "vehicle_matricule_key" UNIQUE ("matricule");



ALTER TABLE ONLY "public"."vehicle"
    ADD CONSTRAINT "vehicle_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."waitlist_entry"
    ADD CONSTRAINT "waitlist_entry_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wallet_entry"
    ADD CONSTRAINT "wallet_entry_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wilaya"
    ADD CONSTRAINT "wilaya_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."wilaya"
    ADD CONSTRAINT "wilaya_nom_fr_key" UNIQUE ("nom_fr");



ALTER TABLE ONLY "public"."wilaya"
    ADD CONSTRAINT "wilaya_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wpoint_commune"
    ADD CONSTRAINT "wpoint_commune_pkey" PRIMARY KEY ("wpoint_id", "commune_id");



ALTER TABLE ONLY "public"."wpoint"
    ADD CONSTRAINT "wpoint_id_trajectory_id_key" UNIQUE ("id", "trajectory_id");



ALTER TABLE ONLY "public"."wpoint"
    ADD CONSTRAINT "wpoint_id_wilaya_id_key" UNIQUE ("id", "wilaya_id");



ALTER TABLE ONLY "public"."wpoint"
    ADD CONSTRAINT "wpoint_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wpoint"
    ADD CONSTRAINT "wpoint_traj_position_uk" UNIQUE ("trajectory_id", "position") DEFERRABLE;



ALTER TABLE ONLY "public"."wpoint"
    ADD CONSTRAINT "wpoint_trajectory_id_wilaya_id_key" UNIQUE ("trajectory_id", "wilaya_id");



CREATE INDEX "idx_admin_audit_log_actor" ON "public"."admin_audit_log" USING "btree" ("admin_user_id");



CREATE INDEX "idx_admin_audit_log_created" ON "public"."admin_audit_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_admin_audit_log_target" ON "public"."admin_audit_log" USING "btree" ("target_type", "target_id");



CREATE INDEX "idx_app_session_user" ON "public"."app_session" USING "btree" ("user_id");



CREATE INDEX "idx_app_user_otp_user" ON "public"."app_user_otp" USING "btree" ("user_id");



CREATE INDEX "idx_commune_daira" ON "public"."commune" USING "btree" ("daira_id");



CREATE INDEX "idx_commune_postal" ON "public"."commune" USING "btree" ("code_postal");



CREATE INDEX "idx_commune_wilaya" ON "public"."commune" USING "btree" ("wilaya_id");



CREATE INDEX "idx_daira_wilaya" ON "public"."daira" USING "btree" ("wilaya_id");



CREATE INDEX "idx_default_trip_price_traj" ON "public"."default_trip_price" USING "btree" ("trajectory_id");



CREATE INDEX "idx_emergency_contact_customer" ON "public"."emergency_contact" USING "btree" ("customer_id");



CREATE INDEX "idx_kyc_document_driver" ON "public"."kyc_document" USING "btree" ("driver_id", "doc_type", "submitted_at" DESC);



CREATE INDEX "idx_message_conversation" ON "public"."message" USING "btree" ("conversation_id", "created_at");



CREATE INDEX "idx_no_show_event_customer" ON "public"."no_show_event" USING "btree" ("customer_id");



CREATE INDEX "idx_no_show_event_driver" ON "public"."no_show_event" USING "btree" ("driver_id");



CREATE INDEX "idx_notification_recipient" ON "public"."notification" USING "btree" ("recipient_user_id", "created_at" DESC);



CREATE INDEX "idx_notification_unpushed" ON "public"."notification" USING "btree" ("created_at") WHERE ("pushed_at" IS NULL);



CREATE INDEX "idx_notification_unread" ON "public"."notification" USING "btree" ("recipient_user_id") WHERE ("read_at" IS NULL);



CREATE INDEX "idx_notification_unsmsed" ON "public"."notification" USING "btree" ("created_at") WHERE ("sms_sent_at" IS NULL);



CREATE INDEX "idx_payment_gateway_event_payment" ON "public"."payment_gateway_event" USING "btree" ("payment_id", "received_at" DESC);



CREATE INDEX "idx_payment_reservation" ON "public"."payment" USING "btree" ("reservation_id", "status");



CREATE INDEX "idx_payment_status" ON "public"."payment" USING "btree" ("status");



CREATE INDEX "idx_payout_batch_driver" ON "public"."payout_batch" USING "btree" ("driver_id", "created_at" DESC);



CREATE INDEX "idx_payout_ledger_batch" ON "public"."payout_ledger" USING "btree" ("payout_batch_id");



CREATE INDEX "idx_payout_ledger_driver" ON "public"."payout_ledger" USING "btree" ("driver_id", "created_at" DESC);



CREATE INDEX "idx_payout_ledger_reservation" ON "public"."payout_ledger" USING "btree" ("reservation_id");



CREATE INDEX "idx_promo_redemption_code" ON "public"."promo_redemption" USING "btree" ("promo_code_id");



CREATE INDEX "idx_promo_redemption_customer" ON "public"."promo_redemption" USING "btree" ("customer_id");



CREATE INDEX "idx_push_subscription_user" ON "public"."push_subscription" USING "btree" ("user_id");



CREATE INDEX "idx_rating_ratee_customer" ON "public"."rating" USING "btree" ("ratee_customer_id") WHERE ("ratee_customer_id" IS NOT NULL);



CREATE INDEX "idx_rating_ratee_driver" ON "public"."rating" USING "btree" ("ratee_driver_id") WHERE ("ratee_driver_id" IS NOT NULL);



CREATE INDEX "idx_refund_payment" ON "public"."refund" USING "btree" ("payment_id", "created_at" DESC);



CREATE INDEX "idx_refund_status" ON "public"."refund" USING "btree" ("status");



CREATE INDEX "idx_reservation_active" ON "public"."reservation" USING "btree" ("trip_id") WHERE ("status" = ANY (ARRAY['pending'::"public"."reservation_status", 'confirmed'::"public"."reservation_status"]));



CREATE INDEX "idx_reservation_customer" ON "public"."reservation" USING "btree" ("customer_id");



CREATE INDEX "idx_reservation_passenger_res" ON "public"."reservation_passenger" USING "btree" ("reservation_id");



CREATE INDEX "idx_reservation_status" ON "public"."reservation" USING "btree" ("status");



CREATE INDEX "idx_reservation_trip" ON "public"."reservation" USING "btree" ("trip_id");



CREATE INDEX "idx_search_log_pair" ON "public"."search_log" USING "btree" ("from_wilaya_id", "to_wilaya_id");



CREATE INDEX "idx_search_log_zero" ON "public"."search_log" USING "btree" ("created_at") WHERE ("results_count" = 0);



CREATE INDEX "idx_sms_log_phone" ON "public"."sms_log" USING "btree" ("phone", "purpose", "created_at" DESC);



CREATE INDEX "idx_sms_log_user" ON "public"."sms_log" USING "btree" ("user_id");



CREATE INDEX "idx_sos_event_status" ON "public"."sos_event" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_trip_departure" ON "public"."trip" USING "btree" ("departure_at");



CREATE INDEX "idx_trip_driver" ON "public"."trip" USING "btree" ("driver_id");



CREATE INDEX "idx_trip_price_trip" ON "public"."trip_price" USING "btree" ("trip_id");



CREATE INDEX "idx_trip_published_at" ON "public"."trip" USING "btree" ("published_at");



CREATE INDEX "idx_trip_share_token_res" ON "public"."trip_share_token" USING "btree" ("reservation_id");



CREATE INDEX "idx_trip_status" ON "public"."trip" USING "btree" ("status");



CREATE INDEX "idx_trip_stop_wpoint" ON "public"."trip_stop" USING "btree" ("wpoint_id");



CREATE INDEX "idx_trip_trajectory" ON "public"."trip" USING "btree" ("trajectory_id");



CREATE INDEX "idx_trip_vehicle" ON "public"."trip" USING "btree" ("vehicle_id");



CREATE INDEX "idx_vehicle_inspection_vehicle" ON "public"."vehicle_inspection" USING "btree" ("vehicle_id", "created_at" DESC);



CREATE INDEX "idx_waitlist_trip_position" ON "public"."waitlist_entry" USING "btree" ("trip_id", "position") WHERE ("status" = 'waiting'::"text");



CREATE INDEX "idx_wallet_entry_customer" ON "public"."wallet_entry" USING "btree" ("customer_id", "created_at" DESC);



CREATE INDEX "idx_wpc_commune" ON "public"."wpoint_commune" USING "btree" ("commune_id");



CREATE INDEX "idx_wpoint_traj_pos" ON "public"."wpoint" USING "btree" ("trajectory_id", "position");



CREATE UNIQUE INDEX "uq_payment_gateway_transaction" ON "public"."payment" USING "btree" ("gateway_transaction_id") WHERE ("gateway_transaction_id" IS NOT NULL);



CREATE UNIQUE INDEX "uq_refund_payment_inflight" ON "public"."refund" USING "btree" ("payment_id") WHERE ("status" = ANY (ARRAY['pending'::"text", 'processing'::"text"]));



CREATE UNIQUE INDEX "uq_trip_recurring_occurrence" ON "public"."trip" USING "btree" ("recurring_template_id", "recurring_date") WHERE ("recurring_template_id" IS NOT NULL);



CREATE UNIQUE INDEX "uq_waitlist_active_per_customer" ON "public"."waitlist_entry" USING "btree" ("trip_id", "customer_id") WHERE ("status" = 'waiting'::"text");



CREATE OR REPLACE TRIGGER "trg_customer_referral_code" BEFORE INSERT ON "public"."customer" FOR EACH ROW EXECUTE FUNCTION "public"."trg_customer_referral_code"();



CREATE OR REPLACE TRIGGER "trg_customer_touch" BEFORE UPDATE ON "public"."customer" FOR EACH ROW EXECUTE FUNCTION "public"."trg_touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_default_trip_price_touch" BEFORE UPDATE ON "public"."default_trip_price" FOR EACH ROW EXECUTE FUNCTION "public"."trg_touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_driver_touch" BEFORE UPDATE ON "public"."driver" FOR EACH ROW EXECUTE FUNCTION "public"."trg_touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_no_show_event_apply" AFTER INSERT ON "public"."no_show_event" FOR EACH ROW EXECUTE FUNCTION "public"."trg_no_show_event_apply"();



CREATE OR REPLACE TRIGGER "trg_payment_guard" BEFORE INSERT OR UPDATE ON "public"."payment" FOR EACH ROW EXECUTE FUNCTION "public"."trg_payment_guard"();



CREATE OR REPLACE TRIGGER "trg_payment_touch" BEFORE UPDATE ON "public"."payment" FOR EACH ROW EXECUTE FUNCTION "public"."trg_touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_rating_apply_ins" AFTER INSERT ON "public"."rating" FOR EACH ROW EXECUTE FUNCTION "public"."trg_rating_apply"();



CREATE OR REPLACE TRIGGER "trg_rating_apply_upd" AFTER UPDATE OF "hidden_at" ON "public"."rating" FOR EACH ROW EXECUTE FUNCTION "public"."trg_rating_apply"();



CREATE OR REPLACE TRIGGER "trg_recurring_template_guard" BEFORE INSERT OR UPDATE ON "public"."recurring_trip_template" FOR EACH ROW EXECUTE FUNCTION "public"."trg_recurring_template_guard"();



CREATE OR REPLACE TRIGGER "trg_referral_reward_on_first_completed_trip" AFTER UPDATE OF "status" ON "public"."reservation" FOR EACH ROW WHEN ((("new"."status" = 'completed'::"public"."reservation_status") AND ("old"."status" IS DISTINCT FROM 'completed'::"public"."reservation_status"))) EXECUTE FUNCTION "public"."trg_referral_reward_on_first_completed_trip"();



CREATE OR REPLACE TRIGGER "trg_reservation_cancel_cascade" AFTER UPDATE OF "status" ON "public"."reservation" FOR EACH ROW EXECUTE FUNCTION "public"."trg_reservation_cancel_cascade"();



CREATE OR REPLACE TRIGGER "trg_reservation_capacity_guard" AFTER INSERT OR UPDATE OF "seats", "status", "trip_id" ON "public"."reservation" FOR EACH ROW EXECUTE FUNCTION "public"."trg_reservation_capacity_guard"();



CREATE OR REPLACE TRIGGER "trg_reservation_completed_earning" AFTER UPDATE OF "status" ON "public"."reservation" FOR EACH ROW WHEN ((("new"."status" = 'completed'::"public"."reservation_status") AND ("old"."status" IS DISTINCT FROM 'completed'::"public"."reservation_status"))) EXECUTE FUNCTION "public"."trg_reservation_completed_earning"();



CREATE OR REPLACE TRIGGER "trg_trajectory_guard" BEFORE INSERT OR UPDATE OF "name" ON "public"."trajectory" FOR EACH ROW EXECUTE FUNCTION "public"."trg_trajectory_guard"();



CREATE OR REPLACE TRIGGER "trg_trajectory_touch" BEFORE UPDATE ON "public"."trajectory" FOR EACH ROW EXECUTE FUNCTION "public"."trg_touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_trip_cancel_cascade" AFTER UPDATE OF "status" ON "public"."trip" FOR EACH ROW EXECUTE FUNCTION "public"."trg_trip_cancel_cascade"();



CREATE OR REPLACE TRIGGER "trg_trip_capacity_guard" AFTER UPDATE OF "capacity" ON "public"."trip" FOR EACH ROW EXECUTE FUNCTION "public"."trg_trip_capacity_guard"();



CREATE OR REPLACE TRIGGER "trg_trip_edit_lock" BEFORE UPDATE ON "public"."trip" FOR EACH ROW EXECUTE FUNCTION "public"."trg_trip_edit_lock"();



CREATE OR REPLACE TRIGGER "trg_trip_price_lock" BEFORE INSERT OR DELETE OR UPDATE ON "public"."trip_price" FOR EACH ROW EXECUTE FUNCTION "public"."trg_trip_price_lock"();



CREATE OR REPLACE TRIGGER "trg_trip_price_touch" BEFORE UPDATE ON "public"."trip_price" FOR EACH ROW EXECUTE FUNCTION "public"."trg_touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_trip_status_guard" BEFORE UPDATE OF "status" ON "public"."trip" FOR EACH ROW EXECUTE FUNCTION "public"."trg_trip_status_guard"();



CREATE OR REPLACE TRIGGER "trg_trip_stop_lock" BEFORE INSERT OR DELETE OR UPDATE ON "public"."trip_stop" FOR EACH ROW EXECUTE FUNCTION "public"."trg_trip_stop_lock"();



CREATE OR REPLACE TRIGGER "trg_trip_touch" BEFORE UPDATE ON "public"."trip" FOR EACH ROW EXECUTE FUNCTION "public"."trg_touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_trip_vehicle_capacity_guard" BEFORE INSERT OR UPDATE OF "vehicle_id", "capacity" ON "public"."trip" FOR EACH ROW EXECUTE FUNCTION "public"."trg_trip_vehicle_capacity_guard"();



CREATE OR REPLACE TRIGGER "trg_vehicle_touch" BEFORE UPDATE ON "public"."vehicle" FOR EACH ROW EXECUTE FUNCTION "public"."trg_touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_wpoint_guard" BEFORE UPDATE OF "wilaya_id", "trajectory_id" ON "public"."wpoint" FOR EACH ROW EXECUTE FUNCTION "public"."trg_wpoint_guard"();



ALTER TABLE ONLY "public"."app_session"
    ADD CONSTRAINT "app_session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."app_user"
    ADD CONSTRAINT "app_user_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."app_user"
    ADD CONSTRAINT "app_user_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."driver"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."app_user_otp"
    ADD CONSTRAINT "app_user_otp_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."commune"
    ADD CONSTRAINT "commune_daira_id_wilaya_id_fkey" FOREIGN KEY ("daira_id", "wilaya_id") REFERENCES "public"."daira"("id", "wilaya_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contact_reveal_log"
    ADD CONSTRAINT "contact_reveal_log_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservation"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation"
    ADD CONSTRAINT "conversation_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservation"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer"
    ADD CONSTRAINT "customer_home_commune_fk" FOREIGN KEY ("home_commune_id", "home_wilaya_id") REFERENCES "public"."commune"("id", "wilaya_id");



ALTER TABLE ONLY "public"."customer"
    ADD CONSTRAINT "customer_referred_by_customer_id_fkey" FOREIGN KEY ("referred_by_customer_id") REFERENCES "public"."customer"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."daira"
    ADD CONSTRAINT "daira_wilaya_id_fkey" FOREIGN KEY ("wilaya_id") REFERENCES "public"."wilaya"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."default_trip_price"
    ADD CONSTRAINT "default_trip_price_from_wpoint_id_trajectory_id_fkey" FOREIGN KEY ("from_wpoint_id", "trajectory_id") REFERENCES "public"."wpoint"("id", "trajectory_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."default_trip_price"
    ADD CONSTRAINT "default_trip_price_to_wpoint_id_trajectory_id_fkey" FOREIGN KEY ("to_wpoint_id", "trajectory_id") REFERENCES "public"."wpoint"("id", "trajectory_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."default_trip_price"
    ADD CONSTRAINT "default_trip_price_trajectory_id_fkey" FOREIGN KEY ("trajectory_id") REFERENCES "public"."trajectory"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."driver_last_location"
    ADD CONSTRAINT "driver_last_location_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."driver"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."driver"
    ADD CONSTRAINT "driver_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicle"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."emergency_contact"
    ADD CONSTRAINT "emergency_contact_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."favorite_driver"
    ADD CONSTRAINT "favorite_driver_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."favorite_driver"
    ADD CONSTRAINT "favorite_driver_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."driver"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."favorite_route"
    ADD CONSTRAINT "favorite_route_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."favorite_route"
    ADD CONSTRAINT "favorite_route_destination_wpoint_id_fkey" FOREIGN KEY ("destination_wpoint_id") REFERENCES "public"."wpoint"("id");



ALTER TABLE ONLY "public"."favorite_route"
    ADD CONSTRAINT "favorite_route_origin_wpoint_id_fkey" FOREIGN KEY ("origin_wpoint_id") REFERENCES "public"."wpoint"("id");



ALTER TABLE ONLY "public"."kyc_document"
    ADD CONSTRAINT "kyc_document_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."driver"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message"
    ADD CONSTRAINT "message_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."no_show_event"
    ADD CONSTRAINT "no_show_event_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."no_show_event"
    ADD CONSTRAINT "no_show_event_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."driver"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."no_show_event"
    ADD CONSTRAINT "no_show_event_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservation"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."no_show_event"
    ADD CONSTRAINT "no_show_event_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trip"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payment_gateway_event"
    ADD CONSTRAINT "payment_gateway_event_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payment"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payment"
    ADD CONSTRAINT "payment_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservation"("id");



ALTER TABLE ONLY "public"."payout_batch"
    ADD CONSTRAINT "payout_batch_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."driver"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payout_ledger"
    ADD CONSTRAINT "payout_ledger_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."driver"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payout_ledger"
    ADD CONSTRAINT "payout_ledger_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payment"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payout_ledger"
    ADD CONSTRAINT "payout_ledger_payout_batch_id_fkey" FOREIGN KEY ("payout_batch_id") REFERENCES "public"."payout_batch"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payout_ledger"
    ADD CONSTRAINT "payout_ledger_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservation"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payout_ledger"
    ADD CONSTRAINT "payout_ledger_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trip"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."promo_redemption"
    ADD CONSTRAINT "promo_redemption_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."promo_redemption"
    ADD CONSTRAINT "promo_redemption_promo_code_id_fkey" FOREIGN KEY ("promo_code_id") REFERENCES "public"."promo_code"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."promo_redemption"
    ADD CONSTRAINT "promo_redemption_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservation"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."rating"
    ADD CONSTRAINT "rating_ratee_customer_id_fkey" FOREIGN KEY ("ratee_customer_id") REFERENCES "public"."customer"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rating"
    ADD CONSTRAINT "rating_ratee_driver_id_fkey" FOREIGN KEY ("ratee_driver_id") REFERENCES "public"."driver"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rating"
    ADD CONSTRAINT "rating_rater_customer_id_fkey" FOREIGN KEY ("rater_customer_id") REFERENCES "public"."customer"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rating"
    ADD CONSTRAINT "rating_rater_driver_id_fkey" FOREIGN KEY ("rater_driver_id") REFERENCES "public"."driver"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rating"
    ADD CONSTRAINT "rating_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservation"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recurring_trip_exception"
    ADD CONSTRAINT "recurring_trip_exception_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."recurring_trip_template"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recurring_trip_template"
    ADD CONSTRAINT "recurring_trip_template_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."driver"("id");



ALTER TABLE ONLY "public"."recurring_trip_template"
    ADD CONSTRAINT "recurring_trip_template_trajectory_id_fkey" FOREIGN KEY ("trajectory_id") REFERENCES "public"."trajectory"("id");



ALTER TABLE ONLY "public"."recurring_trip_template"
    ADD CONSTRAINT "recurring_trip_template_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicle"("id");



ALTER TABLE ONLY "public"."referral_reward"
    ADD CONSTRAINT "referral_reward_referred_id_fkey" FOREIGN KEY ("referred_id") REFERENCES "public"."customer"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."referral_reward"
    ADD CONSTRAINT "referral_reward_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "public"."customer"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."referral_reward"
    ADD CONSTRAINT "referral_reward_trigger_reservation_id_fkey" FOREIGN KEY ("trigger_reservation_id") REFERENCES "public"."reservation"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."refund"
    ADD CONSTRAINT "refund_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payment"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."refund"
    ADD CONSTRAINT "refund_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservation"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservation"
    ADD CONSTRAINT "reservation_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id");



ALTER TABLE ONLY "public"."reservation"
    ADD CONSTRAINT "reservation_dropoff_commune_id_fkey" FOREIGN KEY ("dropoff_commune_id") REFERENCES "public"."commune"("id");



ALTER TABLE ONLY "public"."reservation"
    ADD CONSTRAINT "reservation_dropoff_wpoint_id_trajectory_id_fkey" FOREIGN KEY ("dropoff_wpoint_id", "trajectory_id") REFERENCES "public"."wpoint"("id", "trajectory_id");



ALTER TABLE ONLY "public"."reservation_passenger"
    ADD CONSTRAINT "reservation_passenger_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservation"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservation"
    ADD CONSTRAINT "reservation_pickup_commune_id_fkey" FOREIGN KEY ("pickup_commune_id") REFERENCES "public"."commune"("id");



ALTER TABLE ONLY "public"."reservation"
    ADD CONSTRAINT "reservation_pickup_wpoint_id_trajectory_id_fkey" FOREIGN KEY ("pickup_wpoint_id", "trajectory_id") REFERENCES "public"."wpoint"("id", "trajectory_id");



ALTER TABLE ONLY "public"."reservation"
    ADD CONSTRAINT "reservation_trip_id_trajectory_id_fkey" FOREIGN KEY ("trip_id", "trajectory_id") REFERENCES "public"."trip"("id", "trajectory_id");



ALTER TABLE ONLY "public"."sms_log"
    ADD CONSTRAINT "sms_log_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "public"."notification"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sos_event"
    ADD CONSTRAINT "sos_event_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservation"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sos_event"
    ADD CONSTRAINT "sos_event_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trip"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."trip"
    ADD CONSTRAINT "trip_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."driver"("id");



ALTER TABLE ONLY "public"."trip_price"
    ADD CONSTRAINT "trip_price_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trip"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_price"
    ADD CONSTRAINT "trip_price_trip_id_from_wpoint_id_fkey" FOREIGN KEY ("trip_id", "from_wpoint_id") REFERENCES "public"."trip_stop"("trip_id", "wpoint_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_price"
    ADD CONSTRAINT "trip_price_trip_id_to_wpoint_id_fkey" FOREIGN KEY ("trip_id", "to_wpoint_id") REFERENCES "public"."trip_stop"("trip_id", "wpoint_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip"
    ADD CONSTRAINT "trip_recurring_template_id_fkey" FOREIGN KEY ("recurring_template_id") REFERENCES "public"."recurring_trip_template"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."trip_share_token"
    ADD CONSTRAINT "trip_share_token_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservation"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_stop"
    ADD CONSTRAINT "trip_stop_trip_id_trajectory_id_fkey" FOREIGN KEY ("trip_id", "trajectory_id") REFERENCES "public"."trip"("id", "trajectory_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_stop"
    ADD CONSTRAINT "trip_stop_wpoint_id_trajectory_id_fkey" FOREIGN KEY ("wpoint_id", "trajectory_id") REFERENCES "public"."wpoint"("id", "trajectory_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip"
    ADD CONSTRAINT "trip_trajectory_id_fkey" FOREIGN KEY ("trajectory_id") REFERENCES "public"."trajectory"("id");



ALTER TABLE ONLY "public"."trip"
    ADD CONSTRAINT "trip_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicle"("id");



ALTER TABLE ONLY "public"."vehicle_inspection"
    ADD CONSTRAINT "vehicle_inspection_submitted_by_driver_fkey" FOREIGN KEY ("submitted_by_driver") REFERENCES "public"."driver"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vehicle_inspection"
    ADD CONSTRAINT "vehicle_inspection_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicle"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vehicle_last_location"
    ADD CONSTRAINT "vehicle_last_location_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicle"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."waitlist_entry"
    ADD CONSTRAINT "waitlist_entry_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."waitlist_entry"
    ADD CONSTRAINT "waitlist_entry_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservation"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."waitlist_entry"
    ADD CONSTRAINT "waitlist_entry_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trip"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wallet_entry"
    ADD CONSTRAINT "wallet_entry_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wallet_entry"
    ADD CONSTRAINT "wallet_entry_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservation"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."wilaya"
    ADD CONSTRAINT "wilaya_pays_id_fkey" FOREIGN KEY ("pays_id") REFERENCES "public"."pays"("id");



ALTER TABLE ONLY "public"."wpoint_commune"
    ADD CONSTRAINT "wpoint_commune_commune_id_wilaya_id_fkey" FOREIGN KEY ("commune_id", "wilaya_id") REFERENCES "public"."commune"("id", "wilaya_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wpoint_commune"
    ADD CONSTRAINT "wpoint_commune_wpoint_id_wilaya_id_fkey" FOREIGN KEY ("wpoint_id", "wilaya_id") REFERENCES "public"."wpoint"("id", "wilaya_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wpoint"
    ADD CONSTRAINT "wpoint_trajectory_id_fkey" FOREIGN KEY ("trajectory_id") REFERENCES "public"."trajectory"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wpoint"
    ADD CONSTRAINT "wpoint_wilaya_id_fkey" FOREIGN KEY ("wilaya_id") REFERENCES "public"."wilaya"("id");



ALTER TABLE "public"."app_session" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_user" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_user_otp" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."commune" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daira" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."default_trip_price" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."driver" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."driver_last_location" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."import_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "p_read_commune" ON "public"."commune" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "p_read_daira" ON "public"."daira" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "p_read_pays" ON "public"."pays" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "p_read_wilaya" ON "public"."wilaya" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."payment" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pays" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reservation" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trajectory" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trip" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trip_price" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trip_stop" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vehicle" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vehicle_last_location" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wilaya" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wpoint" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wpoint_commune" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT ALL ON SCHEMA "public" TO "service_role";




































































































































































































