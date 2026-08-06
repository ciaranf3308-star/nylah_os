import React, { useState } from "react";
import type { PersonKey } from "../../types";
import { PERSONS } from "../../constants/themes";
import { HOUSEHOLD_ID, HOUSEHOLD_TZ } from "../../lib/buildMeta";
import { setHouseholdPinMap, setHouseholdPlainPins } from "../../lib/pins";

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
      // hash would be via verifyPin but for settings we store hashed pin map via setHouseholdPinMap
      const { sha256hex } = await import("../../lib/pins");
      const hashA=await sha256hex(youPin); const hashB=await sha256hex(partnerPin);
      const map:Record<string,PersonKey>={}; map[hashA]="aisling"; map[hashB]="ciaran";
      setHouseholdPinMap(hid, map);
      const plainMap:Record<string,PersonKey>={}; plainMap[youPin]="aisling"; plainMap[partnerPin]="ciaran";
      try{ setHouseholdPlainPins(hid, plainMap); }catch{}
      updateHid(hid);
      setErr(""); setYouPin(""); setPartnerPin("");
      alert("household "+hid+" pins set");
    }catch(e:any){ setErr(String(e?.message||e)); }
  };
  return (
    <div className="space-y-3">
      <div className="rounded-[16px] border bg-[var(--card-bg)] p-3 space-y-2" style={{borderColor:'var(--border)'}}>
        <div className="text-[12px] font-semibold">Household • {hid} • TZ {HOUSEHOLD_TZ}</div>
        <input value={name} onChange={e=> updateName(e.target.value)} placeholder="Household name" className="w-full rounded-full border bg-[var(--card-bg)] px-3 h-[36px] text-[11px]"/>
        <input value={hid} onChange={e=> setHid(e.target.value)} placeholder="household id" className="w-full rounded-full border bg-[var(--card-bg)] px-3 h-[36px] text-[11px]"/>
        <div className="grid grid-cols-2 gap-2">
          <input value={youPin} onChange={e=> setYouPin(e.target.value.replace(/\D/g,"").slice(0,4))} inputMode="numeric" placeholder="Aisling 4463" className="rounded-[12px] border bg-white px-3 py-2 text-center text-[14px] tracking-widest"/>
          <input value={partnerPin} onChange={e=> setPartnerPin(e.target.value.replace(/\D/g,"").slice(0,4))} inputMode="numeric" placeholder="Ciaran 1958" className="rounded-[12px] border bg-white px-3 py-2 text-center text-[14px] tracking-widest"/>
        </div>
        {err && <div className="text-[11px] text-[#B91C1C]">{err}</div>}
        <button disabled={!canContinue} onClick={doCreate} className={"w-full h-[44px] rounded-full text-[12px] "+(canContinue?"bg-[#0A0A0A] text-white":"bg-[var(--chip-bg)] text-[#8B7357]")}>Set PINs • {HOUSEHOLD_ID}</button>
      </div>
    </div>
  );
}
export default HouseholdSettings;
