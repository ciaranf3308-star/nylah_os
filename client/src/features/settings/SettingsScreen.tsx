import { useState } from "react";
import type { Theme, PersonKey } from "../../types";
import { ThemeSettings } from "./ThemeSettings";
import { HouseholdSettings } from "./HouseholdSettings";
import { BiometricsSettings } from "../auth/BiometricsSettings";

type Props = {
  theme?: Theme; setTheme?: any; onConfetti?: any;
  choresRaw?: any; calendarRaw?: any; shoppingRaw?: any; notesRaw?: any;
  setChoresRaw?: any; setCalendarRaw?: any; setShoppingRaw?: any; setNotesRaw?: any;
  currentUser?: PersonKey;
};

export function SettingsScreen(props: any = {}){
  const { theme, setTheme, onConfetti, choresRaw, calendarRaw, shoppingRaw, notesRaw, setChoresRaw, setCalendarRaw, setShoppingRaw, setNotesRaw, currentUser } = (props as Props) || ({} as any);
  const safeTheme = (theme as any) || { name: "Beige", id: "beige" } as any;
  const safeSetTheme = typeof setTheme === 'function' ? setTheme : (()=>{}) as any;
  const safeOnConfetti = typeof onConfetti === 'function' ? onConfetti : (()=>{}) as any;
  const safeCurrentUser = (currentUser || "aisling") as any;
  const safeChores = Array.isArray(choresRaw) ? choresRaw : [];
  const safeCalendar = Array.isArray(calendarRaw) ? calendarRaw : [];
  const safeShopping = Array.isArray(shoppingRaw) ? shoppingRaw : [];
  const safeNotes = Array.isArray(notesRaw) ? notesRaw : [];
  const safeSetChoresRaw = typeof setChoresRaw === 'function' ? setChoresRaw : (()=>{}) as any;
  const safeSetCalendarRaw = typeof setCalendarRaw === 'function' ? setCalendarRaw : (()=>{}) as any;
  const safeSetShoppingRaw = typeof setShoppingRaw === 'function' ? setShoppingRaw : (()=>{}) as any;
  const safeSetNotesRaw = typeof setNotesRaw === 'function' ? setNotesRaw : (()=>{}) as any;
  const [openGroups,setOpenGroups]=useState<Record<string,boolean>>(()=>({appearance:true, household:false, notifications:false, data:false, advanced:false}));
  const toggle=(k:string)=> setOpenGroups(p=>({...p,[k]:!p[k]}));
  const displayTheme = safeTheme;
  return (
    <div className="space-y-3 py-2">
      {/* Group 1 Appearance — warm pastel + charcoal Hume */}
      <div className="rounded-[16px] border bg-[var(--card-bg)] overflow-hidden" style={{borderColor:"var(--border)"}}>
        <button onClick={()=>toggle('appearance')} className="w-full flex items-center justify-between min-h-[52px] px-4 text-left"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--chip-bg)] text-[12px]">🎨</span><div><div className="text-[14px] font-medium">Appearance</div><div className="text-[11px] text-[var(--muted)]">{displayTheme?.name||"Beige"} • charcoal orange Hume</div></div></div><span className="text-[12px]">{openGroups.appearance?"▲":"▼"}</span></button>
        {openGroups.appearance && <div className="px-4 pb-3 pt-1 space-y-3 border-t" style={{borderColor:"var(--border)"}}><ThemeSettings theme={displayTheme} setTheme={safeSetTheme} onConfetti={safeOnConfetti}/></div>}
      </div>
      {/* Group 2 Household */}
      <div className="rounded-[16px] border bg-[var(--card-bg)] overflow-hidden" style={{borderColor:"var(--border)"}}>
        <button onClick={()=>toggle('household')} className="w-full flex items-center justify-between min-h-[52px] px-4"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--chip-bg)] text-[12px]">🏠</span><div className="text-left"><div className="text-[14px] font-medium">Household</div><div className="text-[11px] text-[var(--muted)]">ID { "ash-ciaran-2026"} • TZ {"Europe/Dublin"}</div></div></div><span className="text-[12px]">{openGroups.household?"▲":"▼"}</span></button>
        {openGroups.household && <div className="px-4 pb-3 pt-2 border-t" style={{borderColor:"var(--border)"}}><HouseholdSettings currentUser={safeCurrentUser} /></div>}
      </div>
      {/* Group 3 People & Biometrics */}
      <div className="rounded-[16px] border bg-[var(--card-bg)] overflow-hidden" style={{borderColor:"var(--border)"}}>
        <button onClick={()=>toggle('notifications')} className="w-full flex items-center justify-between min-h-[52px] px-4 text-left"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--chip-bg)] text-[12px]">👤</span><div><div className="text-[14px] font-medium">People & unlock</div><div className="text-[11px] text-[var(--muted)]">Face ID toggle • 44px spring</div></div></div><span className="text-[12px]">{openGroups.notifications?"▲":"▼"}</span></button>
        {openGroups.notifications && <div className="px-4 pb-3 pt-2 border-t space-y-3" style={{borderColor:"var(--border)"}}><BiometricsSettings currentUser={safeCurrentUser} /></div>}
      </div>
      {/* Group 4 Data */}
      <div className="rounded-[16px] border bg-[var(--card-bg)] overflow-hidden" style={{borderColor:"var(--border)"}}>
        <button onClick={()=>toggle('data')} className="w-full flex items-center justify-between min-h-[52px] px-4"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--chip-bg)] text-[12px]">📊</span><div className="text-left"><div className="text-[14px] font-medium">Data & sync</div><div className="text-[11px] text-[var(--muted)]">counts, rev, offline queue</div></div></div><span className="text-[12px]">{openGroups.data?"▲":"▼"}</span></button>
        {openGroups.data && <div className="px-4 pb-3 pt-2 border-t text-[11px] text-[var(--muted)]"><div>c:{safeChores?.length||0} cal:{safeCalendar?.length||0} s:{safeShopping?.length||0} n:{safeNotes?.length||0} rev:{(typeof window!=="undefined" ? (localStorage.getItem("couple_v1_rev")||"–") : "–")} queue:{(() => { try{ const q=JSON.parse(localStorage.getItem("couple_v1_offline_queue")||"[]"); return Array.isArray(q)?q.length:0;}catch{return 0;}})()}</div></div>}
      </div>
      {/* Group 5 Advanced */}
      <div className="rounded-[16px] border bg-[var(--card-bg)] overflow-hidden" style={{borderColor:"var(--border)"}}>
        <button onClick={()=>toggle('advanced')} className="w-full flex items-center justify-between min-h-[52px] px-4"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--chip-bg)] text-[12px]">🛠️</span><div className="text-left"><div className="text-[14px] font-medium">Advanced</div><div className="text-[11px] text-[var(--muted)]">debug, clear SW, purge IDB</div></div></div><span className="text-[12px]">{openGroups.advanced?"▲":"▼"}</span></button>
        {openGroups.advanced && <div className="px-4 pb-3 pt-2 border-t space-y-2">
          <button onClick={()=>{ try{ if('serviceWorker' in navigator){ navigator.serviceWorker.getRegistrations().then(rs=> rs.forEach(r=> r.unregister())); } alert("SW clear attempted"); }catch(e){ alert("sw err "+String(e)); } }} className="w-full h-[40px] rounded-full border bg-[var(--card-bg)] text-[11px]">Clear SW — v120</button>
          <button onClick={()=>{ try{ const req=indexedDB.deleteDatabase("couple_v1_idb"); req.onsuccess=()=> alert("IDB purged"); }catch{} }} className="w-full h-[40px] rounded-full border bg-[#FEF2F2] text-[#B91C1C] text-[11px]">Purge IDB</button>
        </div>}
      </div>
    </div>
  );
}
export default SettingsScreen;
