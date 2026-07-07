-- ============================================================================
-- 2026-07-05 — Lock subscription_* columns + RevenueCat webhook writer
--
-- Problem: profiles.subscription_tier / _expires_at / _product_id were writable
-- by the owning user via the `profiles_update_self` RLS policy. A user could
-- grant themselves `pro` with a single direct PostgREST call. Harmless while no
-- server code trusts the column, but it must be locked before the webhook makes
-- the mirror authoritative (and before any admin/analytics reads it).
--
-- Fix (mirrors the existing prevent_profile_role_escalation pattern):
--   1. Add `subscription_event_at` — the RevenueCat event timestamp of the last
--      applied event. Acts as an out-of-order / duplicate-delivery watermark.
--   2. prevent_subscription_tampering — BEFORE INSERT/UPDATE trigger that blocks
--      any change to the subscription_* columns unless the caller is the
--      RevenueCat webhook (service_role) or an admin. RLS can't do per-column
--      UPDATE limits, so this uses the same trigger approach as role guarding.
--   3. apply_subscription_event — SECURITY DEFINER RPC granted to service_role
--      ONLY. The webhook edge function calls this; the watermark makes it
--      idempotent and safe against out-of-order deliveries.
--
-- Companion: supabase/functions/revenuecat-webhook/index.ts
--
-- Safe to re-run: IF NOT EXISTS / CREATE OR REPLACE / DROP TRIGGER IF EXISTS.
-- ============================================================================

-- ------------------------------------------------------------
-- 1. Watermark column
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists subscription_event_at timestamptz;

comment on column public.profiles.subscription_event_at is
  'RevenueCat event_timestamp of the last applied webhook event. Out-of-order '
  'guard: apply_subscription_event only writes when the incoming event is >= this.';

-- ------------------------------------------------------------
-- 2. prevent_subscription_tampering — block client writes to subscription_*
-- ------------------------------------------------------------
create or replace function public.prevent_subscription_tampering()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  -- On INSERT, a self-serve profile may only start at the free defaults.
  if tg_op = 'INSERT' then
    if (new.subscription_tier is distinct from 'free'
        or new.subscription_expires_at is not null
        or new.subscription_product_id is not null
        or new.subscription_event_at is not null)
       and coalesce(auth.role(), '') <> 'service_role'
       and not public.is_admin() then
      raise exception
        'subscription_* columns are managed by the RevenueCat webhook and cannot be set directly.';
    end if;
    return new;
  end if;

  -- On UPDATE, block any change to the subscription mirror by a normal user.
  if (new.subscription_tier is distinct from old.subscription_tier
      or new.subscription_expires_at is distinct from old.subscription_expires_at
      or new.subscription_product_id is distinct from old.subscription_product_id
      or new.subscription_event_at is distinct from old.subscription_event_at)
     and coalesce(auth.role(), '') <> 'service_role'
     and not public.is_admin() then
    raise exception
      'subscription_* columns are managed by the RevenueCat webhook and cannot be set directly.';
  end if;

  return new;
end;
$function$;

-- Trigger functions fire as the table owner and never need direct EXECUTE.
-- Revoke the default PUBLIC grant so it isn't callable via the REST API.
revoke all on function public.prevent_subscription_tampering()
  from public, anon, authenticated;

drop trigger if exists prevent_subscription_tampering on public.profiles;
create trigger prevent_subscription_tampering
  before insert or update on public.profiles
  for each row execute function public.prevent_subscription_tampering();

-- ------------------------------------------------------------
-- 3. apply_subscription_event — the ONLY intended writer of subscription_*
--    (service_role only; called by the revenuecat-webhook edge function)
-- ------------------------------------------------------------
create or replace function public.apply_subscription_event(
  p_user_id    uuid,
  p_tier       text,
  p_expires_at timestamptz,
  p_product_id text,
  p_event_at   timestamptz
)
 returns boolean
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_count int;
begin
  update public.profiles
     set subscription_tier       = p_tier,
         subscription_expires_at = p_expires_at,
         subscription_product_id = p_product_id,
         subscription_event_at   = p_event_at
   where id = p_user_id
     -- watermark: skip stale / duplicate deliveries
     and (subscription_event_at is null or subscription_event_at <= p_event_at);

  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$function$;

-- Lock it down: only the webhook (service_role) may call this.
revoke all on function
  public.apply_subscription_event(uuid, text, timestamptz, text, timestamptz)
  from public;
revoke all on function
  public.apply_subscription_event(uuid, text, timestamptz, text, timestamptz)
  from anon, authenticated;
grant execute on function
  public.apply_subscription_event(uuid, text, timestamptz, text, timestamptz)
  to service_role;
