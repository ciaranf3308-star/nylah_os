import { useState } from "react";
import { getEffectiveRowId, clearAllLocalData } from "../../lib/supabase";

export function RecoveryTools({ choresRaw, calendarRaw, shoppingRaw, notesRaw, setChoresRaw, setCalendarRaw, setShoppingRaw, setNotesRaw }: any){
  const [msg,setMsg]=useState<string|null>(null);
  const hid = (()=>{ try{ return getEffectiveRowId() || localStorage.getItem("couple_v1_household_id") || "∅" } catch{ return "∅"} })()
  async function clearSw(){
    try{
      if('serviceWorker' in navigator){
        const regs=await navigator.serviceWorker.getRegistrations();
        for(const r of regs) await r.unregister();
        setMsg("SW cleared "+regs.length);
      } else setMsg("no SW");
    }catch(e:any){ setMsg("sw err "+String(e?.message||e)); }
    setTimeout(()=> setMsg(null),4000);
  }
  async function purgeIdb(){
    try{
      const dbs = await (indexedDB as any).databases?.();
      if(Array.isArray(dbs)){ for(const db of dbs){ if(db.name) indexedDB.deleteDatabase(db.name); } setMsg("IDB purged "+dbs.length); }
      else { indexedDB.deleteDatabase("couple_v1_idb"); setMsg("IDB purge requested"); }
    }catch(e:any){ setMsg("idb err "+String(e?.message||e)); }
    setTimeout(()=> setMsg(null),4000);
  }
  function debugDump(){
    try{
      const dump={ chores: choresRaw?.length, calendar: calendarRaw?.length, shopping: shoppingRaw?.length, notes: notesRaw?.length, tz:"Europe/Dublin", house: hid, build: (localStorage.getItem("couple_v1_build")||"v159") };
      console.log("[debug]", dump);
      setMsg("logged debug "+JSON.stringify(dump));
    }catch{}
    setTimeout(()=> setMsg(null),4000);
  }
  async function wipeCache(){
    if(!confirm(`Wipe this phone & reload from ${hid}? This keeps server.`)) return;
    try{
      await clearAllLocalData()
      setMsg(`wiped ${hid} — reloading…`)
      setTimeout(()=>{ try{ location.reload() }catch{} }, 600)
    }catch(e:any){ setMsg("wipe err "+String(e?.message||e)) }
  }
  function nukeLocal(){
    if(!confirm("purge local? this keeps remote")) return;
    try{ localStorage.clear(); sessionStorage.clear(); setMsg("local cleared"); }catch{}
  }
  return (
    <div className="rounded-[16px] border bg-[var(--card-bg)] px-4 py-3 space-y-3" style={{borderColor:"var(--border)"}}>
      <div className="text-[12px] font-semibold flex items-center justify-between"><span>RecoveryTools • {hid.slice(0,16)} • 44px</span><span className="text-[10px] text-[var(--muted)]">v159 server-wins</span></div>
      {msg && <div className="text-[11px] text-[#92400E] bg-[#FEF3C7] border border-[#FDE68A] rounded-[8px] px-2 py-1">{msg}</div>}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={debugDump} className="h-[44px] min-h-[44px] rounded-full border bg-[var(--chip-bg)] text-[11px]" style={{borderColor:'var(--border)', transitionTimingFunction:'cubic-bezier(0.34,1.56,0.64,1)'}}>Debug {hid.slice(0,6)}</button>
        <button onClick={clearSw} className="h-[44px] min-h-[44px] rounded-full border bg-[var(--card-bg)] text-[11px]">Clear SW</button>
        <button onClick={purgeIdb} className="h-[44px] min-h-[44px] rounded-full border bg-[#FEF2F2] text-[#B91C1C] text-[11px]">Purge IDB</button>
        <button onClick={nukeLocal} className="h-[44px] min-h-[44px] rounded-full border bg-[#0A0A0A]/10 text-[11px]">Purge local</button>
      </div>
      <button onClick={wipeCache} className="w-full h-[48px] rounded-full bg-[#121214] text-white text-[12.5px] font-semibold tracking-[-0.01em]">Wipe this phone & reload from house</button>
      <div className="text-[10px] text-[var(--muted)]">hid {hid} • ?wipe=1 clears local + reloads. Server-wins normalized tables: calendar_events/chores/shopping_items/notes_memo. No empty wipe.</div>
    </div>
  );
}
export default RecoveryTools;
