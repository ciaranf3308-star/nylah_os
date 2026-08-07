import { useEffect, useMemo, useState } from "react";
import type { Theme, PersonKey } from "../../types";
import { ThemeSettings } from "./ThemeSettings";
import { HouseholdSettings } from "./HouseholdSettings";
import { BiometricsSettings } from "../auth/BiometricsSettings";
import { getEffectiveRowId, getEffectiveTable, hasSupabaseConfig } from "../../lib/supabase";
import { remoteLoad } from "../../lib/remoteSync";

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

  const [openGroups,setOpenGroups]=useState<Record<string,boolean>>(()=>({appearance:true, household:false, notifications:false, data:true, advanced:false}));
  const toggle=(k:string)=> setOpenGroups(p=>({...p,[k]:!p[k]}));
  const displayTheme = safeTheme;

  // --- Debug state for Data & sync ---
  const [lsHouseId,setLsHouseId]=useState<string>("–");
  const [lsHouseCode,setLsHouseCode]=useState<string>("–");
  const [inviteCode,setInviteCode]=useState<string>("–");
  const [rev,setRev]=useState<string>("–");
  const [lastSync,setLastSync]=useState<string>("–");
  const [lastConfirmed,setLastConfirmed]=useState<string>("–");
  const [lastMut,setLastMut]=useState<string>("–");
  const [hadRemote,setHadRemote]=useState<string>("–");
  const [pushErr,setPushErr]=useState<string>("–");
  const [queueLen,setQueueLen]=useState<number>(0);
  const [online,setOnline]=useState<boolean>(true);
  const [anonPresent,setAnonPresent]=useState<string>("unknown");
  const [build,setBuild]=useState<string>("v121-settings-debug");
  const [effId,setEffId]=useState<string>("ash-ciaran-2026");
  const [isPulling,setIsPulling]=useState(false);
  const [pullMsg,setPullMsg]=useState<string|null>(null);
  const [remoteCounts,setRemoteCounts]=useState<{c:number;cal:number;s:number;n:number}|null>(null);

  useEffect(()=>{
    try{ setLsHouseId(localStorage.getItem("couple_v1_household_id")||"–"); }catch{}
    try{ setLsHouseCode(localStorage.getItem("couple_v1_household_code")||"–"); }catch{}
    try{ setInviteCode(localStorage.getItem("couple_v1_household_code")||localStorage.getItem("couple_v1_household_invite")||localStorage.getItem("couple_v1_household_invite_code")||"–"); }catch{}
    try{ setRev(localStorage.getItem("couple_v1_revision")||localStorage.getItem("couple_v1_rev")||"–"); }catch{}
    try{ setLastSync(localStorage.getItem("couple_v1_last_sync")||"–"); }catch{}
    try{ setLastConfirmed(localStorage.getItem("couple_v1_last_confirmed_at")||"–"); }catch{}
    try{ setLastMut(localStorage.getItem("couple_v1_last_mutation")||"–"); }catch{}
    try{ setHadRemote(localStorage.getItem("couple_v1_had_remote")||"–"); }catch{}
    try{ setPushErr(localStorage.getItem("couple_v1_last_push_err")||"–"); }catch{}
    try{ const raw=localStorage.getItem("couple_v1_offline_queue"); if(raw){const q=JSON.parse(raw); if(Array.isArray(q)) setQueueLen(q.length);} }catch{}
    try{ const raw2=localStorage.getItem("couple_v1_queue_count"); if(raw2) { const n=Number(raw2); if(!isNaN(n)&&n>queueLen) setQueueLen(n); } }catch{}
    try{ setOnline(typeof navigator!=='undefined' ? navigator.onLine!==false : true); }catch{}
    try{
      // anon present check without exposing full key
      let found=false; let tail="????";
      const w:any = typeof window!=='undefined' ? (window as any) : null;
      const cand = w?.__SUPABASE_ANON__ || w?.__SUPABASE_ANON_KEY__;
      if (cand) { found=true; tail=String(cand).slice(-4); }
      else {
        // @ts-ignore
        const envK = (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY;
        if (envK) { found=true; tail=String(envK).slice(-4); }
        else if (hasSupabaseConfig()) { found=true; tail="hardcode"; }
      }
      setAnonPresent(found ? `eyJ…${tail}` : "no ✗");
    }catch{ setAnonPresent("error"); }
    try{ setEffId(getEffectiveRowId()); }catch{}
    try{
      const v = (localStorage.getItem("couple_v1_build") || (window as any).__NYLAH_VERSION__ || "v121-settings-debug");
      setBuild(String(v).slice(0,24));
    }catch{}
    // online listener
    const onOnline=()=> setOnline(true); const onOffline=()=> setOnline(false);
    try{ window.addEventListener('online', onOnline); window.addEventListener('offline', onOffline); }catch{}
    return ()=>{ try{ window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); }catch{} };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  async function doForcePull(){
    if(isPulling) return;
    setIsPulling(true); setPullMsg("pulling…");
    try{
      const data = await remoteLoad();
      if(!data){ setPullMsg("no remote — offline or empty row"); setTimeout(()=>setPullMsg(null),3000); return; }
      // Merge into setters — use safe setters that call useLocalState which will trigger saves
      try{
        if(Array.isArray(data.chores) && data.chores.length>0) safeSetChoresRaw(data.chores);
        if(Array.isArray(data.calendar) && data.calendar.length>0) safeSetCalendarRaw(data.calendar);
        if(Array.isArray(data.shopping) && data.shopping.length>0) safeSetShoppingRaw(data.shopping);
        if(Array.isArray(data.notes) && data.notes.length>0) safeSetNotesRaw(data.notes);
        setRemoteCounts({c:data.chores?.length||0, cal:data.calendar?.length||0, s:data.shopping?.length||0, n:data.notes?.length||0});
      }catch(e:any){ setPullMsg("merge err "+(e?.message||e)); }
      setPullMsg(`pulled c:${data.chores?.length||0} cal:${data.calendar?.length||0} s:${data.shopping?.length||0} n:${data.notes?.length||0} • ${new Date().toLocaleTimeString()}`);
      try{ localStorage.setItem("couple_v1_last_sync", data.updated_at||new Date().toISOString()); }catch{}
      setTimeout(()=> setPullMsg(null),4000);
    }catch(e:any){ setPullMsg("pull ex "+String(e?.message||e).slice(0,80)); setTimeout(()=> setPullMsg(null),4000); }
    finally{ setIsPulling(false); }
  }

  function doFixHouse(){
    try{
      localStorage.setItem("couple_v1_household_id","ash-ciaran-2026");
      localStorage.removeItem("couple_v1_household_code");
      try{ localStorage.setItem("couple_v1_household_migrated_from", effId); }catch{}
      try{ localStorage.setItem("couple_v1_household_fixed_at", new Date().toISOString()); }catch{}
      alert("House fixed to ash-ciaran-2026 — reloading");
      location.reload();
    }catch(e:any){ alert("fix err "+String(e?.message||e)); }
  }

  function doSwitchDebug(target:string){
    try{
      if(!confirm(`Switch household to ${target}? This is for debugging empty houses.`)) return;
      localStorage.setItem("couple_v1_household_id", target);
      alert(`switched to ${target} — reloading`);
      location.reload();
    }catch{}
  }

  function doExportLocal(){
    try{
      const dump = {
        house: effId,
        lsHouseId,
        lsCode: lsHouseCode,
        inviteCode,
        currentUser: safeCurrentUser,
        counts: { c: safeChores.length, cal: safeCalendar.length, s: safeShopping.length, n: safeNotes.length },
        rev, lastSync, lastConfirmed, lastMut, hadRemote, lastPushErr: pushErr?.slice(0,200),
        queueLen,
        online,
        anonPresent,
        build,
        table: getEffectiveTable(),
        ts: new Date().toISOString(),
        // minimal payload samples for debugging (ids only)
        sampleIds: {
          chores: safeChores.slice(0,3).map((x:any)=>x?.id||x?.title).filter(Boolean),
          cal: safeCalendar.slice(0,3).map((x:any)=>x?.id||x?.title).filter(Boolean),
        }
      };
      const blob = new Blob([JSON.stringify(dump,null,2)], {type:"application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href=url; a.download=`nylah-debug-${effId}-${Date.now()}.json`; a.click();
      URL.revokeObjectURL(url);
    }catch(e:any){ alert("export err "+String(e?.message||e)); }
  }

  const debugJson = useMemo(()=>{
    const j:any = {
      build,
      effHouse: effId,
      lsHouseId,
      lsCode: lsHouseCode,
      inviteCode,
      currentUser: safeCurrentUser,
      table: (()=>{ try{return getEffectiveTable()}catch{return "couple_data"}})(),
      countsLocal: { c: safeChores.length, cal: safeCalendar.length, s: safeShopping.length, n: safeNotes.length },
      countsRemote: remoteCounts||"not pulled yet",
      rev,
      lastSync,
      lastConfirmed,
      lastMutation: lastMut?.slice(0,16),
      hadRemote,
      lastPushErr: pushErr?.slice(0,160),
      queueLen,
      online: online ? "online ✓" : "offline ✗",
      anon: anonPresent,
      tz: "Europe/Dublin",
      ua: typeof navigator!=='undefined' ? navigator.userAgent.slice(0,64) : "–",
      href: typeof location!=='undefined' ? location.href.slice(0,80) : "–",
      ts: new Date().toISOString(),
    };
    try{ j.migratedFrom = localStorage.getItem("couple_v1_household_migrated_from")||"–"; }catch{}
    return JSON.stringify(j,null,2);
  }, [build, effId, lsHouseId, lsHouseCode, inviteCode, safeCurrentUser, safeChores.length, safeCalendar.length, safeShopping.length, safeNotes.length, rev, lastSync, lastConfirmed, lastMut, hadRemote, pushErr, queueLen, online, anonPresent, remoteCounts]);

  const showEmptyWarning = useMemo(()=>{
    const localEmpty = (safeChores.length+safeCalendar.length+safeShopping.length+safeNotes.length)===0;
    const effIsTest = effId==="nylah-98jylh" || effId==="nylah-fbkf2m" || effId.startsWith("nylah-");
    if(localEmpty && effIsTest) return `You're on test house ${effId} which is empty — main house ash-ciaran-2026 has 4/6/2/7`;
    if(localEmpty) return "Local is empty — try Force Pull from server";
    if(effIsTest) return `Warning: you're on ${effId} — tap Fix House → ash-ciaran-2026`;
    return null;
  }, [safeChores.length, safeCalendar.length, safeShopping.length, safeNotes.length, effId]);

  async function doCopyDebug(){
    try{ await navigator.clipboard.writeText(debugJson); setPullMsg("debug copied ✓"); setTimeout(()=>setPullMsg(null),2000);}catch{ try{ const ta=document.createElement("textarea"); ta.value=debugJson; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); setPullMsg("debug copied ✓"); setTimeout(()=>setPullMsg(null),2000);}catch{}}
  }
  async function doCopyHouse(){
    try{ await navigator.clipboard.writeText(effId); setPullMsg("house id copied"); setTimeout(()=>setPullMsg(null),1500);}catch{}
  }

  return (
    <div className="space-y-3 py-2">
      {/* Group 1 Appearance — warm pastel + charcoal Hume */}
      <div className="rounded-[16px] border bg-[var(--card-bg)] overflow-hidden" style={{borderColor:"var(--border)"}}>
        <button onClick={()=>toggle('appearance')} className="w-full flex items-center justify-between min-h-[52px] px-4 text-left"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--chip-bg)] text-[12px]">🎨</span><div><div className="text-[14px] font-medium">Appearance</div><div className="text-[11px] text-[var(--muted)]">{displayTheme?.name||"Beige"} • charcoal orange Hume</div></div></div><span className="text-[12px]">{openGroups.appearance?"▲":"▼"}</span></button>
        {openGroups.appearance && <div className="px-4 pb-3 pt-1 space-y-3 border-t" style={{borderColor:"var(--border)"}}><ThemeSettings theme={displayTheme} setTheme={safeSetTheme} onConfetti={safeOnConfetti}/></div>}
      </div>
      {/* Group 2 Household */}
      <div className="rounded-[16px] border bg-[var(--card-bg)] overflow-hidden" style={{borderColor:"var(--border)"}}>
        <button onClick={()=>toggle('household')} className="w-full flex items-center justify-between min-h-[52px] px-4"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--chip-bg)] text-[12px]">🏠</span><div className="text-left"><div className="text-[14px] font-medium">Household</div><div className="text-[11px] text-[var(--muted)]">ID {effId} • TZ {"Europe/Dublin"}</div></div></div><span className="text-[12px]">{openGroups.household?"▲":"▼"}</span></button>
        {openGroups.household && <div className="px-4 pb-3 pt-2 border-t" style={{borderColor:"var(--border)"}}><HouseholdSettings currentUser={safeCurrentUser} />
          <div className="mt-3 text-[11px] text-[var(--muted)] space-y-1">
            <div>eff: <code className="px-1 rounded bg-[var(--chip-bg)]">{effId}</code> <button onClick={doCopyHouse} className="ml-1 rounded-full border px-2 py-0.5 text-[10px]">copy</button></div>
            <div>LS id: <code className="px-1 rounded bg-[var(--chip-bg)]">{lsHouseId}</code> code: <code className="px-1 rounded bg-[var(--chip-bg)]">{lsHouseCode}</code></div>
            <div>invite: <code className="px-1 rounded bg-[var(--chip-bg)]">{inviteCode}</code> user: {safeCurrentUser}</div>
          </div>
        </div>}
      </div>
      {/* Group 3 People & Biometrics */}
      <div className="rounded-[16px] border bg-[var(--card-bg)] overflow-hidden" style={{borderColor:"var(--border)"}}>
        <button onClick={()=>toggle('notifications')} className="w-full flex items-center justify-between min-h-[52px] px-4 text-left"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--chip-bg)] text-[12px]">👤</span><div><div className="text-[14px] font-medium">People & unlock</div><div className="text-[11px] text-[var(--muted)]">Face ID • {safeCurrentUser} • 44px spring</div></div></div><span className="text-[12px]">{openGroups.notifications?"▲":"▼"}</span></button>
        {openGroups.notifications && <div className="px-4 pb-3 pt-2 border-t space-y-3" style={{borderColor:"var(--border)"}}><BiometricsSettings currentUser={safeCurrentUser} /></div>}
      </div>
      {/* Group 4 Data & sync — v121 enlarged */}
      <div className="rounded-[16px] border bg-[var(--card-bg)] overflow-hidden shadow-[0_4px_18px_rgba(0,0,0,0.04)]" style={{borderColor:"var(--border)"}}>
        <button onClick={()=>toggle('data')} className="w-full flex items-center justify-between min-h-[52px] px-4"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#FEF3C7] text-[12px]">📊</span><div className="text-left"><div className="text-[14px] font-medium">Data & sync — debug</div><div className="text-[11px] text-[var(--muted)]">c:{safeChores?.length||0} cal:{safeCalendar?.length||0} s:{safeShopping?.length||0} n:{safeNotes?.length||0} • rev {String(rev).slice(0,6)} • {online?"online":"offline"} • {queueLen?`${queueLen} queued`:"saved"}</div></div></div><span className="text-[12px]">{openGroups.data?"▲":"▼"}</span></button>
        {openGroups.data && (
          <div className="px-4 pb-3 pt-3 border-t space-y-3" style={{borderColor:"var(--border)"}}>
            {showEmptyWarning && (
              <div className="rounded-[10px] border bg-[#FEF3C7] border-[#FDE68A] px-3 py-2 text-[11px] text-[#92400E] leading-[1.4]">
                ⚠️ {showEmptyWarning} <button onClick={doFixHouse} className="ml-2 rounded-full bg-[#0A0A0A] text-white px-2.5 py-1 text-[10px]">Fix House → ash-ciaran-2026</button>
              </div>
            )}
            {pullMsg && <div className="rounded-[8px] bg-[var(--chip-bg)] border px-2.5 py-1.5 text-[11px] text-[var(--muted)]">{pullMsg}</div>}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-[10px] border bg-[var(--card-bg)] px-2.5 py-2" style={{borderColor:"var(--border)"}}><div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">effective house</div><div className="font-mono text-[11px] truncate">{effId}</div><div className="text-[10px] text-[var(--muted)] mt-0.5">LS id {lsHouseId.slice(0,12)} code {lsHouseCode.slice(0,8)}</div></div>
              <div className="rounded-[10px] border bg-[var(--card-bg)] px-2.5 py-2" style={{borderColor:"var(--border)"}}><div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">online • supabase</div><div className="text-[11px]">{online?"online ✓":"offline ✗"} • {anonPresent} • {hasSupabaseConfig()? "cfg ✓":"cfg ✗"}</div><div className="text-[10px] text-[var(--muted)]">build {build} • tz Europe/Dublin</div></div>
              <div className="rounded-[10px] border bg-[var(--card-bg)] px-2.5 py-2" style={{borderColor:"var(--border)"}}><div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">local counts</div><div className="text-[11px] font-mono">c:{safeChores.length} cal:{safeCalendar.length} s:{safeShopping.length} n:{safeNotes.length}</div><div className="text-[10px] text-[var(--muted)]">queue {queueLen} • rev {String(rev).slice(0,12)}</div></div>
              <div className="rounded-[10px] border bg-[var(--card-bg)] px-2.5 py-2" style={{borderColor:"var(--border)"}}><div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">server timestamps</div><div className="text-[10px]">saved {lastSync==="–"?"–": new Date(lastSync).toLocaleString()} </div><div className="text-[10px]">confirmed {lastConfirmed==="–"?"–": new Date(lastConfirmed).toLocaleString().slice(0,18)}</div></div>
            </div>
            <div className="rounded-[10px] border bg-[var(--chip-bg)] px-2.5 py-2 text-[10px] font-mono leading-[1.35]" style={{borderColor:"var(--border)"}}>
              <div>mut {String(lastMut).slice(0,18)} hadRemote {String(hadRemote).slice(0,6)} invite {String(inviteCode).slice(0,10)}</div>
              <div className="truncate">err {String(pushErr).slice(0,120)}</div>
              {remoteCounts && <div className="mt-1 text-[10px]">remote pulled c:{remoteCounts.c} cal:{remoteCounts.cal} s:{remoteCounts.s} n:{remoteCounts.n}</div>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={doForcePull} disabled={isPulling} className="h-[44px] min-h-[44px] rounded-full border bg-[#0A0A0A] text-white text-[12px] font-semibold active:scale-[0.98] disabled:opacity-60" style={{transitionTimingFunction:"cubic-bezier(0.34,1.56,0.64,1)"}}>{isPulling?"Pulling…":"Force Pull from server"}</button>
              <button onClick={doFixHouse} className="h-[44px] min-h-[44px] rounded-full border bg-[var(--card-bg)] text-[12px] font-semibold" style={{borderColor:"var(--border)"}}>Fix House → ash-ciaran</button>
              <button onClick={doExportLocal} className="h-[40px] rounded-full border bg-[var(--chip-bg)] text-[11px]">Export Debug JSON</button>
              <button onClick={doCopyDebug} className="h-[40px] rounded-full border bg-[var(--card-bg)] text-[11px]">Copy Debug</button>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-wide text-[var(--muted)] font-semibold">debug JSON — paste to support</div>
              <pre className="max-h-[160px] overflow-auto rounded-[10px] border bg-[#FFFCF8] p-2.5 text-[10px] font-mono leading-[1.35] text-[#2B211E]" style={{borderColor:"var(--border)", whiteSpace:"pre-wrap", wordBreak:"break-word"}}>{debugJson}</pre>
            </div>
            {/* Inline DataTruth style summary — keep compact */}
            <div className="text-[10px] text-[var(--muted)]">100vw 390→100vw QA 44px spring cubic-bezier(0.34,1.56,0.64,1) • Fraunces 26/17 Inter 16 • charcoal #121214 card #232326 chip #2C2C30 nav #FF6B26</div>
          </div>
        )}
      </div>
      {/* Group 5 Advanced */}
      <div className="rounded-[16px] border bg-[var(--card-bg)] overflow-hidden" style={{borderColor:"var(--border)"}}>
        <button onClick={()=>toggle('advanced')} className="w-full flex items-center justify-between min-h-[52px] px-4"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--chip-bg)] text-[12px]">🛠️</span><div className="text-left"><div className="text-[14px] font-medium">Advanced</div><div className="text-[11px] text-[var(--muted)]">debug, fix, clear SW, purge IDB, v121 auto-migrate</div></div></div><span className="text-[12px]">{openGroups.advanced?"▲":"▼"}</span></button>
        {openGroups.advanced && <div className="px-4 pb-3 pt-2 border-t space-y-2">
          <div className="text-[11px] text-[var(--muted)]">Build {build} • eff {effId} • SW nylah-os-v121-settings-debug pending</div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={()=>{ try{ if('serviceWorker' in navigator){ navigator.serviceWorker.getRegistrations().then(rs=>{ rs.forEach(r=> r.unregister()); alert("SW clear attempted "+rs.length);}); } else alert("no SW"); }catch(e:any){ alert("sw err "+String(e?.message||e)); } }} className="w-full h-[44px] rounded-full border bg-[var(--card-bg)] text-[11px]">Clear SW — v121</button>
            <button onClick={async()=>{ try{ const dbs=await (indexedDB as any).databases?.(); if(Array.isArray(dbs)){ for(const db of dbs){ if(db.name) indexedDB.deleteDatabase(db.name); } alert("IDB purged "+dbs.length);} else { const req=indexedDB.deleteDatabase("couple_v1_idb"); req.onsuccess=()=> alert("IDB purged"); } }catch(e:any){ alert("idb err "+String(e?.message||e)); } }} className="w-full h-[44px] rounded-full border bg-[#FEF2F2] text-[#B91C1C] text-[11px]">Purge IDB</button>
            <button onClick={()=>{ localStorage.setItem("couple_v1_force_resync", String(Date.now())); alert("force resync flag set — reload app"); location.reload(); }} className="w-full h-[40px] rounded-full border bg-[var(--chip-bg)] text-[11px]">Flag Force Resync</button>
            <button onClick={()=>{ if(confirm("Switch to nylah-98jylh empty test house for debugging?")) doSwitchDebug("nylah-98jylh"); }} className="w-full h-[40px] rounded-full border bg-[#FFFbeb] text-[11px]">Debug → nylah-98jylh</button>
            <button onClick={()=> doSwitchDebug("nylah-fbkf2m")} className="w-full h-[40px] rounded-full border bg-[#FFFbeb] text-[11px]">Debug → nylah-fbkf2m</button>
            <button onClick={()=>{ try{ localStorage.clear(); sessionStorage.clear(); alert("local cleared — reload"); location.reload(); }catch{}}} className="w-full h-[40px] rounded-full border bg-[#0A0A0A] text-white text-[11px]">Nuke Local — keep remote</button>
          </div>
          <div className="text-[10px] text-[var(--muted)]">Auto-migrate: nylah-98jylh/ fbkf2m → ash-ciaran-2026 on app start. PinScreen login now sets force-resync flag then remote pulls. Revision from localStorage kept truthful to server.</div>
        </div>}
      </div>
    </div>
  );
}
export default SettingsScreen;
