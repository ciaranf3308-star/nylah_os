# Nylah OS Push Deploy Checklist — V65

**Date:** 2026-08-05 Dublin  
**Supabase project ref:** `zlllebsjtgihsxhcmcvb`  
**Household id:** `ash-ciaran-2026`  
**Table:** `couple_data` Row id `ash-ciaran-2026`  

## 0) VAPID keys (already generated, keep same)

`push-vapid.json` at repo root:

```json
{
  "publicKey": "BP4RL2RLsbcX3WetqBoYMHmksNprWzcfubLegJ8VDbgTH0_T369YNTNAMWA5YbrxylWJwSe7MDCyVOOQ0Jfm7Cw",
  "privateKey": "VZEE-dORaoNClPuT0hY6nLP182uc-1oGAB9mZ5bq6Y4"
}
```

Same key must appear in:

- `client/.env.local` : `VITE_VAPID_PUBLIC_KEY=BP4RL2...`
- `client/public/supabase-env.js` : `window.__VAPID_PUBLIC_KEY__="BP4RL..."`
- Edge secrets: `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`

## 1) Create `push_subscriptions` table (recommended, else fallback to meta.push_fallback)

Run in Supabase Dashboard → SQL Editor:

```sql
-- Enable pgcrypto if not present
create extension if not exists "pgcrypto";

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  household_id text not null default 'ash-ciaran-2026',
  user_key text not null check (user_key in ('aisling','ciaran')),
  endpoint text not null unique,
  keys jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- allow anon to upsert/select/delete own household (simple RLS off for now, or anon enabled)
alter table public.push_subscriptions enable row level security;

drop policy if exists "anon_all_push" on public.push_subscriptions;
create policy "anon_all_push" on public.push_subscriptions
  for all using (true) with check (true);

-- update timestamp trigger
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_push_subs_updated_at on public.push_subscriptions;
create trigger trg_push_subs_updated_at
  before update on public.push_subscriptions
  for each row execute function public.handle_updated_at();
```

Verify:

```sql
select * from push_subscriptions limit 5;
```

If table creation fails due to permissions, app will fallback to `couple_data.meta.push_fallback` (object keyed by user):

```json
{
  "aisling": { "endpoint":"...", "keys":{ "p256dh":"...", "auth":"..." }, "updatedAt":"2026-08-05T..." },
  "ciaran": { ... }
}
```

Fallback is auto-maintained by `saveSubscription()` in `lib/push.ts` which does:

1. `upsert push_subscriptions` onConflict endpoint
2. `localStorage couple_v1_push_sub_<user>` backup
3. `remoteLoad()` then `remoteSave({ meta: { ...meta, push_fallback: { ...pf, [user]: {endpoint,keys,updatedAt} } } })`

## 2) Deploy edge function `push-notify`

```bash
# install supabase CLI if needed
npm i -g supabase

# login once
supabase login

# link project
cd ~/workspace/ts-spaces/couple-fridge-phone
supabase link --project-ref zlllebsjtgihsxhcmcvb

# deploy function
supabase functions deploy push-notify --project-ref zlllebsjtgihsxhcmcvb
```

Function source: `supabase/functions/push-notify/index.ts`

- Reads `push_subscriptions` WHERE household + `!= sender`
- Reads `couple_data.meta.push_fallback` as fallback
- Uses `web-push@3.6.7` with VAPID to send
- Payload: `{title, body, url}`
- Returns `{sent, failed, total}`

## 3) Set VAPID secrets for edge

```bash
supabase secrets set --project-ref zlllebsjtgihsxhcmcvb VAPID_PUBLIC_KEY=BP4RL2RLsbcX3WetqBoYMHmksNprWzcfubLegJ8VDbgTH0_T369YNTNAMWA5YbrxylWJwSe7MDCyVOOQ0Jfm7Cw

supabase secrets set --project-ref zlllebsjtgihsxhcmcvb VAPID_PRIVATE_KEY=VZEE-dORaoNClPuT0hY6nLP182uc-1oGAB9mZ5bq6Y4

supabase secrets list --project-ref zlllebsjtgihsxhcmcvb
```

Also set standard:

```bash
supabase secrets set --project-ref zlllebsjtgihsxhcmcvb SUPABASE_URL=https://zlllebsjtgihsxhcmcvb.supabase.co
# SUPABASE_SERVICE_ROLE_KEY is auto-injected but verify
```

If using Deno edge env vars `SUPABASE_URL/SERVICE_ROLE` are auto.

## 4) Verify edge function

```bash
curl -X POST https://zlllebsjtgihsxhcmcvb.supabase.co/functions/v1/push-notify \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"sender":"ciaran","title":"Test","body":"Buzz check","url":"./?standalone"}'
```

Expect `{"sent":1,"failed":0,"total":1}` if other device subscribed.

Logs:

```bash
supabase functions logs push-notify --project-ref zlllebsjtgihsxhcmcvb --tail
```

## 5) App side QA (open-app, no edge needed)

- Install PWA on both phones: Safari → Share → Add to Home Screen (iOS 16.4+ otherwise push unsupported)
- Open Blueprint → Notifications card → On → Allow → shows `Permission: granted • Subscribed • 1 • PWA`
- Tap `Send test push to me` → immediate Notification `Test buzz for Ciarán` + vibrate `[80,40,80]` + toast fallback `Sent • check notification shade`
- On phone A: Ciarán claims Bins (`assignedTo=ciaran`)
  - Phone B foreground: Notification `New chore for you: Bins • assigned to you` + vibrate + in-app toast black pill `New chore for you: Bins`
- On phone B: Aisling completes Bins (`completedBy=aisling`)
  - Phone A foreground: Notification `Aisling did Bins` + vibrate + toast `Aisling stole Bins`
- Blocked case: Settings → Nylah → Notifications OFF → app shows blocked card `Blocked — enable Notifications in iOS Settings → Nylah → Allow Notifications, then reinstall PWA. Open-app buzz will use in-app toast until allowed.` and toggle stays fallback toast.

## 6) Closed-app QA (needs edge deployed)

Same as above but with app backgrounded / sw alive:

- Both PWA installed, Notification permission granted, service worker ready
- `subscribePush('aisling')` saves to `push_subscriptions` else `meta.push_fallback`
- Device closed → other device triggers `notifyOther()` which `fetch` edge `/functions/v1/push-notify` with sender/title/body
- Edge reads subs excluding sender, sends via web-push, SW shows Notification even when closed
- Tap notification → `notificationclick` → `clients.openWindow(url||'./?standalone')`

## 7) Delete persistence still required for push fallback tombstones

- Shopping add → archive → refresh → remains deleted (tombstone wins via effectiveTs)
- Notes add → archive → refresh → remains archived
- Calendar add → delete → refresh → remains deleted
- Second device realtime deletes via `prevChoresRef` diff + supabase channel

Keep `meta.push_fallback` clean: on `unsubscribePush()` delete endpoint from table + localStorage + `meta.push_fallback[user]` removal (future).

## 8) Version bumps

Each version:

```bash
# edit client/public/version.json code+1 build vXX-...
# edit client/version.json same
# edit client/public/sw.js CACHE_NAME nylah-os-vXX-...
HATCH_SPACES_BUILD_DRIVER=1 bun ./client/build.mjs
rm -rf /tmp/nylah_os_push/assets; cp -Rf client/dist/* /tmp/nylah_os_push/
cd /tmp/nylah_os_push && git add -A && git commit -m "VXX ..." && git push
curl -s https://ciaranf3308-star.github.io/nylah_os/version.json | jq .code
```

## 9) Design lock verification

- Width 100vw `w-full max-w-none` transparent header `Ciaran heartsvg Aisling` `#E8CEB7 #F7EFE8 <40% sat` 390→100vw 16-file flat `.nojekyll 404==index` Fraunces 26/17 + Inter 16 no emoji 52/44/56 touch, FAB 56 `bottom-[88px]` shadow `0 12px 24px`, grain 0.16-0.35, deck -0.8deg 28px shadow 0 16 40, trophy gold `#FACC15` crown 18px +50 pop bouncy 700ms `cubic-bezier(0.34,1.56,0.64,1)` confetti 12/24/36

