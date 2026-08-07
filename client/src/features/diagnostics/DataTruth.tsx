import { useEffect, useState } from "react";
import { HOUSEHOLD_TZ } from "../../lib/buildMeta";
import { getEffectiveRowId } from "../../lib/supabase";

export function DataTruth({ choresRaw, calendarRaw, shoppingRaw, notesRaw }: { choresRaw?:any[]; calendarRaw?:any[]; shoppingRaw?:any[]; notesRaw?:any[] }){
  const [queueLen,setQueueLen]=useState(0);
  const [rev,setRev]=useState<string>("–");
  const [build,setBuild]=useState<string>("–");
  const [hid,setHid]=useState<string>("–");
  useEffect(()=>{
    try{
      const raw=localStorage.getItem("couple_v1_queue_count")
      if(raw) setQueueLen(Number(raw)||0)
      else {
        try{ const q2=localStorage.getItem("idb_mutation_queue"); if(q2){ const arr=JSON.parse(q2); if(Array.isArray(arr)) setQueueLen(arr.length)} }catch{}
      }
    }catch{}
    try{ setRev(localStorage.getItem("couple_v1_revision")||localStorage.getItem("couple_v1_last_sync")||"–"); }catch{}
    try{ setBuild(localStorage.getItem("couple_v1_build")||( (window as any).__NYLAH_VERSION__ )||"v159"); }catch{}
    try{
      const eff = getEffectiveRowId()
      setHid(eff||"∅ (onboarding)")
    }catch{ try{ setHid(localStorage.getItem("couple_v1_household_id")||"∅") }catch{} }
  },[]);
  const c=choresRaw?.length||0;
  const cal=calendarRaw?.length||0;
  const s=shoppingRaw?.length||0;
  const n=notesRaw?.length||0;
  return (
    <div className="rounded-[16px] border bg-[var(--card-bg)] px-4 py-3 space-y-2" style={{borderColor:"var(--border)"}}>
      <div className="text-[12px] font-semibold tracking-wide">DataTruth • server-wins normalized</div>
      <div className="text-[11px] font-mono text-[var(--muted)]">hid {hid} TZ {HOUSEHOLD_TZ} • c:{c} cal:{cal} s:{s} n:{n} • rev {rev?.slice?.(0,24)||rev} • queue {queueLen} • build {build}</div>
      <div className="text-[11px] text-[var(--muted)]">Source: Supabase calendar_events/chores/shopping_items/notes_memo where deleted_at is null, household_id=hid. Server is truth — local cache replaced on open. Photo 900px thumb 180px, trip grocery|online|personal|want</div>
      <div className="grid grid-cols-4 gap-2 text-[10px]">{[
        {k:"chores",v:c},{k:"calendar",v:cal},{k:"shopping",v:s},{k:"notes",v:n}
      ].map(x=><span key={x.k} className="rounded-full border bg-[var(--chip-bg)] px-2 py-1 text-center" style={{borderColor:'var(--border)'}}>{x.k}:{x.v}</span>)}</div>
    </div>
  );
}
export default DataTruth;
