import React, { useState } from "react";
import type { PersonKey } from "../../types";
import { HOUSEHOLD_ID, HOUSEHOLD_TZ } from "../../lib/buildMeta";

export function HouseholdSettings({ currentUser }: { currentUser?: PersonKey }){
  const [name,setName]=useState(()=>{ try{ return localStorage.getItem("couple_v1_household_name")||"Aisling & Ciaran"; }catch{return "Aisling & Ciaran"; }});
  const [hid,setHid]=useState(()=>{ try{ return localStorage.getItem("couple_v1_household_id")||HOUSEHOLD_ID; }catch{return HOUSEHOLD_ID; }});
  const [youPin,setYouPin]=useState(""); const [partnerPin,setPartnerPin]=useState(""); const [err,setErr]=useState("");
  const updateName=(n:string)=>{ setName(n); try{ localStorage.setItem("couple_v1_household_name",n);}catch{} };
  const updateHid=(id:string)=>{ setHid(id); try{ localStorage.setItem("couple_v1_household_id",id);}catch{} };
  const canContinue = /^\d{4}$/.test(youPin) && /^\d{4}$/.test(partnerPin) && youPin!==partnerPin;
  const doCreate=async()=>{
    if(!canContinue){ setErr("Both PINs must be 4 digits and different"); return; }
    try{
      const mod = await import("../../lib/supabase");
      const sb = (mod as any).getSupabase?.();
      if (!sb) { setErr("PIN setup requires Supabase connection — try again when online"); return; }
      // For custom households, create via RPC set_household_pin (if exists) else insert via pin table
      // We hash client-side is okay for transport? Better send plain to server RPC which hashes server-side.
      // Use RPC upsert_household_pin(hid, pin, person_key)
      const tryUpsert = async (pinVal:string, pk:PersonKey) => {
        // Try RPC first
        try {
          const { error } = await sb.rpc("upsert_household_pin", { hid, pin: pinVal, person_key: pk } as any);
          if (!error) return true;
        } catch {}
        // Fallback: hash server-side via pgcrypto? we fallback to direct table if RPC missing but table open - but we try
        try {
          // Hash locally for fallback table insert if table exists and RLS allows anon insert for own hid (should not, but try)
          const { sha256hex } = await import("../../lib/pins");
          // actually our pins module no longer exports sha256hex, compute via subtle
          const buf = new TextEncoder().encode(pinVal);
          const digest = await crypto.subtle.digest('SHA-256', buf);
          const arr = new Uint8Array(digest);
          let hex=''; for(let i=0;i<arr.length;i++) hex+=(arr[i]??0).toString(16).padStart(2,'0');
          const { error } = await sb.from("household_pins").upsert({ household_id: hid, pin_hash: hex, person_key: pk } as any, { onConflict: 'household_id,pin_hash' } as any);
          return !error;
        } catch { return false; }
      };
      const okA = await tryUpsert(youPin, "aisling");
      const okB = await tryUpsert(partnerPin, "ciaran");
      if (!okA || !okB) {
        setErr("Failed to save PINs server-side — check connection or try again");
        return;
      }
      updateHid(hid);
      setErr(""); setYouPin(""); setPartnerPin("");
      alert("household "+hid+" pins set server-side");
    }catch(e:any){ setErr(String(e?.message||e)); }
  };
  return (
    <div className="space-y-3">
      <div className="rounded-[16px] border bg-[var(--card-bg)] p-3 space-y-2" style={{borderColor:'var(--border)'}}>
        <div className="text-[12px] font-semibold">Household • {hid} • TZ {HOUSEHOLD_TZ}</div>
        <input value={name} onChange={e=> updateName(e.target.value)} placeholder="Household name" className="w-full rounded-full border bg-[var(--card-bg)] px-3 h-[36px] text-[11px]"/>
        <input value={hid} onChange={e=> setHid(e.target.value)} placeholder="household id" className="w-full rounded-full border bg-[var(--card-bg)] px-3 h-[36px] text-[11px]"/>
        <div className="grid grid-cols-2 gap-2">
          <input value={youPin} onChange={e=> setYouPin(e.target.value.replace(/\D/g,"").slice(0,4))} inputMode="numeric" placeholder="Aisling PIN" className="rounded-[12px] border bg-white px-3 py-2 text-center text-[14px] tracking-widest"/>
          <input value={partnerPin} onChange={e=> setPartnerPin(e.target.value.replace(/\D/g,"").slice(0,4))} inputMode="numeric" placeholder="Ciaran PIN" className="rounded-[12px] border bg-white px-3 py-2 text-center text-[14px] tracking-widest"/>
        </div>
        {err && <div className="text-[11px] text-[#B91C1C]">{err}</div>}
        <button disabled={!canContinue} onClick={doCreate} className={"w-full h-[44px] rounded-full text-[12px] "+(canContinue?"bg-[#0A0A0A] text-white":"bg-[var(--chip-bg)] text-[#8B7357]")}>Set PINs • {HOUSEHOLD_ID}</button>
        <div className="text-[10px] text-[var(--muted)]">PINs stored server-side only, never in bundle.</div>
      </div>
    </div>
  );
}
export default HouseholdSettings;
