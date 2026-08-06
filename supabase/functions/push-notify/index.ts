import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") || "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
function corsHeaders(){return {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type, Authorization, apikey, x-client-info",};}
import webpush from "https://esm.sh/web-push@3.6.7";
if (VAPID_PUBLIC && VAPID_PRIVATE) { webpush.setVapidDetails("mailto:hello@nylah.os", VAPID_PUBLIC, VAPID_PRIVATE); }
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders() });
  try {
    const { sender, title, body, url } = await req.json();
    if (!title) return new Response(JSON.stringify({ error: "no title" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders() } });
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    // 1) try push_subscriptions table
    let subs: any[] = [];
    try {
      let q = supabase.from("push_subscriptions").select("*");
      if (sender) q = q.neq("user_key", sender);
      const { data, error } = await q;
      if (!error && data) subs = subs.concat(data);
    } catch {}
    // 2) fallback: couple_data row meta.push_fallback
    try {
      const { data: row } = await supabase.from("couple_data").select("meta").eq("id","ash-ciaran-2026").maybeSingle();
      const pf = (row as any)?.meta?.push_fallback;
      if (pf && typeof pf === 'object') {
        for (const [userKey, val] of Object.entries(pf as any)) {
          if (sender && userKey === sender) continue;
          const v:any = val as any;
          if (v?.endpoint && v?.keys) {
            // dedup by endpoint
            if (!subs.some(s=>s.endpoint===v.endpoint)) subs.push({ id:`meta-${userKey}`, endpoint:v.endpoint, keys:v.keys, user_key:userKey });
          }
        }
      }
    } catch {}
    const payload = JSON.stringify({ title, body, url: url || "./?standalone" });
    let sent=0, failed=0; const errs:string[]=[];
    for (const sub of subs) {
      try {
        const pushSub={ endpoint:sub.endpoint, keys:sub.keys };
        await (webpush as any).sendNotification(pushSub, payload);
        sent++;
      } catch(e:any){ failed++; errs.push(e?.message?.slice(0,80)||String(e).slice(0,80)); if (String(e).includes("410")||e?.statusCode===410){ try{ await supabase.from("push_subscriptions").delete().eq("id", sub.id);}catch{}} }
    }
    return new Response(JSON.stringify({ sent, failed, total: subs.length, errs: errs.slice(0,3), sources: subs.length }), { headers: { "Content-Type":"application/json", ...corsHeaders() } });
  } catch(e:any){ return new Response(JSON.stringify({ error:e?.message||String(e)}), { status:500, headers:{ "Content-Type":"application/json", ...corsHeaders()}}); }
});
