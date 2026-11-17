-- NexShow Phase 6: seat holds and abandoned bookings. Run once in the Supabase SQL editor (after phase5.sql).

-- Replaces the Phase 1 version. Besides freeing expired seat holds, it now also expires unpaid (pending) bookings
-- whose hold has run out, so their seats become bookable again and any Movie Coins they reserved are returned.
create or replace function release_expired_locks() returns integer language plpgsql as $$
declare n integer; r record;
begin
  for r in
    select b.id from bookings b join seat_locks l on l.id = b.lock_id
     where b.status = 'pending' and not l.released and l.expires_at < now()
  loop
    perform fail_booking(r.id, 'expired');
  end loop;

  with dead as (
    update seat_locks set released = true where not released and expires_at < now() returning id)
  update show_seats set status = 'available', lock_id = null
   where lock_id in (select id from dead) and status = 'locked';
  get diagnostics n = row_count;
  return n;
end $$;

-- When a person starts choosing seats again for the same show, drop their earlier hold (and unpaid booking) first.
create or replace function release_user_locks(p_user uuid, p_show bigint) returns void language plpgsql as $$
declare r record;
begin
  for r in
    select b.id from bookings b join seat_locks l on l.id = b.lock_id
     where b.user_id = p_user and b.show_id = p_show and b.status = 'pending' and not l.released
  loop
    perform fail_booking(r.id, 'cancelled');
  end loop;

  with mine as (
    update seat_locks set released = true where user_id = p_user and show_id = p_show and not released returning id)
  update show_seats set status = 'available', lock_id = null
   where lock_id in (select id from mine) and status = 'locked';
end $$;

revoke execute on function release_user_locks(uuid, bigint) from public, anon, authenticated;
grant execute on function release_user_locks(uuid, bigint) to service_role;
