import React, { useState } from "react";
import type { Theme, PersonKey } from "../../types";
import { THEMES } from "../../constants/themes";
import { ThemeSettings } from "./ThemeSettings";
import { HouseholdSettings } from "./HouseholdSettings";
import { BiometricsSettings } from "../auth/BiometricsSettings";

type Props = {
  theme: Theme; setTheme:any; onConfetti?:any;
  choresRaw:any; calendarRaw:any; shoppingRaw:any; notesRaw:any;
  setChoresRaw:any; setCalendarRaw:any; setShoppingRaw:any; setNotesRaw:any;
  currentUser: PersonKey;
};

export function SettingsScreen({ theme, setTheme, onConfetti, choresRaw, calendarRaw, shoppingRaw, notesRaw, setChoresRaw, setCalendarRaw, setShoppingRaw, setNotesRaw, currentUser }: Props){
  const [openGroups,setOpenGroups]=useState<Record<string,boolean>>(()=>({appearance:true, household:false, notifications:false, data:false, advanced:false}));
  const toggle=(k:string)=> setOpenGroups(p=>({...p,[k]:!p[k]}));
  return (
    <div className="space-y-3 py-2">
      {/* Group 1 Appearance */}
      <div className="rounded-[16px] border bg-[var(--card-bg)] overflow-hidden" style={{borderColor:"var(--border)"}}>
        <button onClick={()=>toggle('appearance')} className="w-full flex items-center justify-between min-h-[52px] px-4 text-left"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--chip-bg)] text-[12px]">🎨</span><div><div className="text-[14px] font-medium">Appearance</div><div className="text-[11px] text-[var(--muted)]">{theme.name||"Beige"} • charcoal orange Hume</div></div></div><span className="text-[12px]">{openGroups.appearance?"▲":"▼"}</span></button>
        {openGroups.appearance && <div className="px-4 pb-3 pt-1 space-y-3 border-t" style={{borderColor:"var(--border)"}}><ThemeSettings theme={theme} setTheme={setTheme} onConfetti={onConfetti}/></div>}
      </div>
      {/* Group 2 Household */}
      <div className="rounded-[16px] border bg-[var(--card-bg)] overflow-hidden" style={{borderColor:"var(--border)"}}>
        <button onClick={()=>toggle('household')} className="w-full flex items-center justify-between min-h-[52px] px-4"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--chip-bg)] text-[12px]">🏠</span><div className="text-left"><div className="text-[14px] font-medium">Household</div><div className="text-[11px] text-[var(--muted)]">ID { "ash-ciaran-2026"} • TZ {"Europe/Dublin"}</div></div></div><span className="text-[12px]">{openGroups.household?"▲":"▼"}</span></button>
        {openGroups.household && <div className="px-4 pb-3 pt-2 border-t" style={{borderColor:"var(--border)"}}><HouseholdSettings currentUser={currentUser} /></div>}
      </div>
      {/* Group 3 People & Biometrics */}
      <div className="rounded-[16px] border bg-[var(--card-bg)] overflow-hidden" style={{borderColor:"var(--border)"}}>
        <button onClick={()=>toggle('notifications')} className="w-full flex items-center justify-between min-h-[52px] px-4 text-left"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--chip-bg)] text-[12px]">👤</span><div><div className="text-[14px] font-medium">People & unlock</div><div className="text-[11px] text-[var(--muted)]">Face ID toggle, remember device toggle • PERSONS aisling/ciaran initials 44px spring</div></div></div><span className="text-[12px]">{openGroups.notifications?"▲":"▼"}</span></button>
        {openGroups.notifications && <div className="px-4 pb-3 pt-2 border-t space-y-3" style={{borderColor:"var(--border)"}}><BiometricsSettings currentUser={currentUser} /></div>}
      </div>
      {/* Group 4 Data */}
      <div className="rounded-[16px] border bg-[var(--card-bg)] overflow-hidden" style={{borderColor:"var(--border)"}}>
        <button onClick={()=>toggle('data')} className="w-full flex items-center justify-between min-h-[52px] px-4"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--chip-bg)] text-[12px]">📊</span><div className="text-left"><div className="text-[14px] font-medium">Data & sync</div><div className="text-[11px] text-[var(--muted)]">couple_data row counts, rev, offline queue</div></div></div><span className="text-[12px]">{openGroups.data?"▲":"▼"}</span></button>
        {openGroups.data && <div className="px-4 pb-3 pt-2 border-t text-[11px] text-[var(--muted)]"><div>c:{choresRaw?.length||0} cal:{calendarRaw?.length||0} s:{shoppingRaw?.length||0} n:{notesRaw?.length||0} rev:{(typeof window!=="undefined" ? (localStorage.getItem("couple_v1_rev")||"–") : "–")} queue:{(() => { try{ const q=JSON.parse(localStorage.getItem("couple_v1_offline_queue")||"[]"); return Array.isArray(q)?q.length:0;}catch{return 0;}})()}</div></div>}
      </div>
      {/* Group 5 Advanced */}
      <div className="rounded-[16px] border bg-[var(--card-bg)] overflow-hidden" style={{borderColor:"var(--border)"}}>
        <button onClick={()=>toggle('advanced')} className="w-full flex items-center justify-between min-h-[52px] px-4"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--chip-bg)] text-[12px]">🛠️</span><div className="text-left"><div className="text-[14px] font-medium">Advanced • RecoveryTools debug clear SW purge IDB</div><div className="text-[11px] text-[var(--muted)]">debug, clear SW, purge IDB</div></div></div><span className="text-[12px]">{openGroups.advanced?"▲":"▼"}</span></button>
        {openGroups.advanced && <div className="px-4 pb-3 pt-2 border-t space-y-2">
          <button onClick={()=>{ try{ if('serviceWorker' in navigator){ navigator.serviceWorker.getRegistrations().then(rs=> rs.forEach(r=> r.unregister())); } alert("SW clear attempted"); }catch(e){ alert("sw err "+String(e)); } }} className="w-full h-[40px] rounded-full border bg-[var(--card-bg)] text-[11px]">Clear SW</button>
          <button onClick={()=>{ try{ const req=indexedDB.deleteDatabase("couple_v1_idb"); req.onsuccess=()=> alert("IDB purged"); }catch{} }} className="w-full h-[40px] rounded-full border bg-[#FEF2F2] text-[#B91C1C] text-[11px]">Purge IDB</button>
        </div>}
      </div>
    </div>
  );
}
export default SettingsScreen;
