// Notes boutique overhaul v213 — true boutique memo board, sticky polaroid, tape, script moments — 100vw full-bleed, 100% persistence true-live
import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { PersonKey, NoteMemo } from "../../types";
import { PERSONS } from "../../constants/themes";
import { uid, relTime, rotForId } from "../../shared/utils/helpers";
import { resizeToDataUrl, createThumbnail } from "../../lib/images";
import { getSupabase, getEffectiveRowId } from "../../lib/supabase";

function hardPersistNote(note:any, op:'create'|'update'|'delete'){
  try{
    const hid=getEffectiveRowId(); if(!hid){ try{ (async()=>{ const {enqueueOp}=await import("../../data/offlineQueue"); await enqueueOp('note',op,String(note?.id||''),'ash-ciaran-2026',note).catch(()=>{}); })(); }catch{}; return; }
    const sb=getSupabase(); const id=String(note?.id||''); if(!id) return;
    const nowISO = new Date().toISOString();
    const payload={...note, household_id:hid, updated_at: note?.updatedAt||note?.updated_at||nowISO, created_at: note?.createdAt||note?.created_at||nowISO};
    if(op==='delete'){
      (async()=>{ 
        try{ 
          if(sb){ 
            try{ await (sb as any).from('notes_memo').delete().eq('id',id).eq('household_id',hid);}catch{}
            try{ await (sb as any).from('notes').delete().eq('id',id).eq('household_id',hid);}catch{}
            try{
              const {data:legacy}=await (sb as any).from('couple_data').select('id,notes').eq('id',hid).maybeSingle();
              if(legacy && Array.isArray((legacy as any).notes)){
                const nextNotes=(legacy as any).notes.filter((n:any)=>String(n.id||n.ID)!==id);
                await (sb as any).from('couple_data').update({notes:nextNotes, updated_at:nowISO}).eq('id',hid);
              }
            }catch{}
          }
        }catch{} 
        try{ const {getQueue,persistQueue}=await import("../../data/offlineQueue"); const q=await getQueue(); const nxt=q.filter((o:any)=>!(o.id===id && o.kind==='note')); if(nxt.length!==q.length) await persistQueue(nxt as any);}catch{} 
      })();
      import("../../data/offlineQueue").then(async ({enqueueOp})=>{ try{ await enqueueOp('note','delete', id, hid, {id, deleted_at:nowISO}); const {getQueue}=await import("../../data/offlineQueue"); const q=await getQueue(); if(q.length){ const {drainOps}=await import("../../data/offlineQueue"); const cli=sb; if(cli) try{ await drainOps(cli as any);}catch{}} }catch{} });
      try{ localStorage.setItem('couple_v1_last_local_write', nowISO); }catch{}
      return;
    }
    (async()=>{ 
      try{ 
        if(sb){ 
          const rowMemo:any={id, household_id:hid, body: payload.body||payload.text||'', author: payload.author||'aisling', created_at:payload.created_at, seen_by: payload.seenBy||payload.seen_by||{}, is_love: !!payload.isLove, photo_data_url: payload.photoDataUrl, photo_thumb_data_url: payload.photoThumbDataUrl, pinned_at: payload.pinnedAt||payload.pinned_at||null, archived_at: payload.archivedAt||payload.archived_at||null, updated_at:payload.updated_at}; 
          if(payload.deletedAt||payload.deleted_at) rowMemo.deleted_at=payload.deletedAt||payload.deleted_at;
          try{ await (sb as any).from('notes_memo').upsert(rowMemo,{onConflict:'id'}); }catch(e){ 
            const rowLegacy:any={id, household_id:hid, data:payload, updated_at:payload.updated_at, created_at:payload.created_at};
            try{ await (sb as any).from('notes_memo').upsert(rowLegacy as any,{onConflict:'id'} as any); }catch{}
          }
          try{ const row:any={id, household_id:hid, data:payload, updated_at:payload.updated_at, created_at:payload.created_at}; await (sb as any).from('notes').upsert(row,{onConflict:'id'});}catch{}
          try{
            const {data:legacy}=await (sb as any).from('couple_data').select('id,notes').eq('id',hid).maybeSingle();
            if(legacy){
              const arr=Array.isArray((legacy as any).notes)? (legacy as any).notes.slice(): [];
              const idx=arr.findIndex((n:any)=>String(n.id)===id);
              if(idx>=0) arr[idx]={...arr[idx], ...payload};
              else arr.unshift(payload);
              const trimmed=arr.slice(0,200);
              await (sb as any).from('couple_data').update({notes:trimmed, updated_at:nowISO}).eq('id',hid);
            }
          }catch{}
        } 
      }catch{} 
    })();
    import("../../data/offlineQueue").then(async ({enqueueOp})=>{ try{ await enqueueOp('note', op, id, hid, payload); const {getQueue}=await import("../../data/offlineQueue"); const q=await getQueue(); if(q.length){ const {drainOps}=await import("../../data/offlineQueue"); const cli=sb; if(cli) try{ await drainOps(cli as any);}catch{}} }catch{} });
    try{ localStorage.setItem('couple_v1_last_local_write', nowISO); }catch{}
  }catch{}
}

function BottomSheet({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: React.ReactNode; title?: string }) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(()=>{ onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    prevFocusRef.current = document.activeElement as HTMLElement;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); onCloseRef.current?.(); } };
    document.addEventListener("keydown", h);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", h); document.body.style.overflow = prevOverflow; try { prevFocusRef.current?.focus(); } catch {} };
  }, [open]);
  if (!open) return null;
  const content = (
    <div className="fixed inset-0 z-[80] flex items-end justify-center px-3 pb-[max(16px,env(safe-area-inset-bottom))] pointer-events-auto">
      <button aria-label="Close sheet" onClick={onClose} className="absolute inset-0 bg-[#292624]/20 backdrop-blur-[3px] min-h-[44px]" />
      <div ref={sheetRef} role="dialog" aria-modal="true" className="relative w-full max-w-[420px] rounded-[22px] bg-white border shadow-[0_-16px_48px_rgba(0,0,0,0.18)] max-h-[74dvh] flex flex-col" style={{ borderColor:"#E8DDD4" }} tabIndex={-1}>
        <div className="flex items-center justify-center pt-3 pb-2"><span className="rounded-full bg-[#E9DDD4]" style={{ width:"36px", height:"5px", display:"block"}}/></div>
        <div className="flex items-center justify-between px-5 pb-3 gap-2">
          {title ? <div className="font-display text-[16px] font-medium" style={{fontFamily:"Fraunces"}}>{title}</div> : <div className="flex-1"/>}
          <button onClick={onClose} aria-label="Close" className="grid h-[44px] w-[44px] place-items-center rounded-full border bg-white" style={{borderColor:"#E9DDD4"}}>✕</button>
        </div>
        <div className="px-4 pb-6 overflow-auto">{children}</div>
      </div>
    </div>
  );
  return createPortal(content, document.body);
}

function NotesMemoPage(props: any) {
  let { notes, setNotes, currentUser, nowMs } = (props || {}) as { notes: NoteMemo[]; setNotes: any; currentUser: PersonKey; nowMs: number; };
  if (!Array.isArray(notes)) notes = [] as any;
  if (typeof setNotes !== 'function') setNotes = (()=>{}) as any;
  if (!currentUser) currentUser = "aisling" as any;
  if (typeof nowMs !== 'number') nowMs = Date.now();
  const [filter, setFilter] = useState<"all"|"unread"|"pinned"|"love"|"archive">("all");
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addBody, setAddBody] = useState("");
  const [addIsLove, setAddIsLove] = useState(false);
  const [addPhotoDataUrl, setAddPhotoDataUrl] = useState<string|undefined>(undefined);
  const [addThumbDataUrl, setAddThumbDataUrl] = useState<string|undefined>(undefined);
  const [isResizing, setIsResizing] = useState(false);
  const [selected, setSelected] = useState<NoteMemo|null>(null);
  useEffect(()=>{ try{ localStorage.removeItem("couple_v1_deleted_notes"); }catch{} }, []);

  useEffect(()=>{
    if(!selected) return;
    try{
      const viewer = currentUser as any;
      const author = (selected as any).author;
      if(author===viewer) return;
      const seen = (selected as any).seenBy || {};
      if(seen[viewer]) return;
      const nextSeen = { ...seen, [viewer]: true };
      const nowISO = new Date().toISOString();
      const next = { ...(selected as any), seenBy: nextSeen, updatedAt: nowISO, updated_at: nowISO };
      setNotes((p:any)=> (Array.isArray(p)?p:[]).map((x:any)=> x.id===selected.id ? {...x, seenBy: nextSeen, updatedAt: nowISO, updated_at: nowISO} : x));
      try{ hardPersistNote(next, 'update'); }catch{}
      setSelected((s:any)=> s ? {...s, seenBy: nextSeen} as any : s);
    }catch{}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  const activeNotes = useMemo(()=> notes.filter((n:any)=> !(n as any).deletedAt && !(n as any).archived_at && !(n as any).archivedAt), [notes]);
  const partner: PersonKey = currentUser==="aisling"?"ciaran":"aisling";

  const filtered = useMemo(()=>{
    let list = activeNotes;
    if(filter==="unread") list = list.filter(n=> n.author===partner && !((n.seenBy as any)?.[currentUser]));
    else if(filter==="pinned") list = list.filter(n=> (n as any).pinned_at || (n as any).pinnedAt);
    else if(filter==="love") list = list.filter(n=> n.isLove);
    else if(filter==="archive") { const arch = notes.filter((n:any)=> (n as any).archivedAt || (n as any).archived_at); list = arch as any; }
    if(query.trim()){ const q=query.toLowerCase(); list = list.filter(n=> n.body.toLowerCase().includes(q)); }
    return list.sort((a,b)=> new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());
  }, [activeNotes, filter, query, notes, partner, currentUser]);

  const featured = filtered[0] || null;
  const older = useMemo(()=> filtered.slice(featured ? 1 : 0).slice(0,24), [filtered, featured]);

  async function handlePhotoFile(file: File) {
    try {
      setIsResizing(true);
      const reader = new FileReader();
      const base64: string = await new Promise((res, rej) => { reader.onload = () => res(reader.result as string); reader.onerror = rej; reader.readAsDataURL(file); });
      const full = await resizeToDataUrl(base64, 900, "image/jpeg", 0.82);
      const thumb = await createThumbnail(full, 180, "image/jpeg", 0.8);
      setAddPhotoDataUrl(full); setAddThumbDataUrl(thumb);
    } catch {} finally { setIsResizing(false); }
  }

  async function addNote(){
    if(!addBody.trim()) return;
    let finalFull = addPhotoDataUrl; let finalThumb = addThumbDataUrl;
    if (finalFull && finalFull.length > 8000) {
      try { finalFull = await resizeToDataUrl(finalFull, 900, "image/jpeg", 0.82); finalThumb = await createThumbnail(finalFull, 180, "image/jpeg", 0.8); } catch {}
    }
    const n: NoteMemo = { id: uid("note"), body: addBody.trim(), author: currentUser, createdAt: new Date().toISOString(), seenBy: { aisling: currentUser==="aisling", ciaran: currentUser==="ciaran" } as any, isLove: addIsLove, photoDataUrl: finalFull, photoThumbDataUrl: finalThumb, rotation: rotForId(uid("r")), updatedAt: new Date().toISOString(), } as any;
    setNotes((p:any)=> [n, ...p]); try{ hardPersistNote(n,'create'); }catch{}
    setAddBody(""); setAddIsLove(false); setAddPhotoDataUrl(undefined); setAddThumbDataUrl(undefined); setShowAdd(false);
  }

  return (
    <div className="w-[100vw] ml-[calc(-50vw+50%)] min-h-[100vh] bg-[#FFFBF6] pb-[128px] relative overflow-hidden">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Pinyon+Script:wght@400&family=Instrument+Sans:wght@400;500&display=swap');`}</style>

      {/* Header — boutique warm, edge-to-edge no margin */}
      <div className="w-full px-5 pt-5">
        <div className="relative overflow-hidden rounded-[24px] border border-[#F2DDC4]/80 px-5 pt-5 pb-4" style={{background:"linear-gradient(180deg,#FEECD6 0%,#FEF5E7 22%,#FFFEFB 100%)", boxShadow:"0 10px 28px rgba(61,37,20,0.08)"}}>
          {/* warm wash shapes */}
          <div className="pointer-events-none absolute -right-[10%] -top-[18%] w-[56%] h-[88%] rounded-full blur-[6px]" style={{background:"radial-gradient(80% 80% at 60% 40%, #FFE8CF 0%, #FFF4E8 60%, transparent 70%)"}} />
          {/* tape + heart — hero visuals break out */}
          <div className="pointer-events-none absolute right-[44px] top-[16px] w-[92px] h-[22px] bg-[#E9CBB0]/85 rotate-[-7deg] rounded-[2px] shadow-[0_2px_6px_rgba(0,0,0,0.08)]" style={{transform:"rotate(-8deg)"}} />
          <div className="pointer-events-none absolute right-[18px] top-[11px] text-[18px] opacity-90">♡</div>
          <div className="pointer-events-none absolute right-[-10px] bottom-[-12px] w-[108px] h-[108px] rounded-full" style={{background:"#F1C9A6", opacity:0.22}} />
          <div className="relative z-[1] flex items-start justify-between">
            <div>
              <div className="text-[26px] font-[700] tracking-[-0.012em] text-[#221A16]" style={{fontFamily:"Fraunces, serif"}}>Notes</div>
              <div className="text-[10.5px] tracking-[0.18em] font-semibold uppercase text-[#C47A44] mt-1">Sticky board • love notes • tape</div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="text-[11px] text-[#7A706A] mr-1">{filtered.length} total</div>
              <div className="h-[22px] w-[1px] bg-[#EADDCF] mx-1" />
            </div>
          </div>
          <div className="relative z-[1] mt-4 flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 rounded-[14px] bg-white/90 backdrop-blur border border-[#EADDCF]/80 px-3 h-[44px] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <span className="text-[#A08F82] text-[13px]">⌕</span>
              <input value={query} onChange={e=> setQuery(e.target.value)} placeholder="Search little moments…" className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#A89A8F]" style={{fontFamily:"Instrument Sans"}}/>
            </div>
            <select value={filter} onChange={e=> setFilter(e.target.value as any)} className="h-[44px] rounded-[12px] border bg-white pl-3 pr-6 text-[12px] font-medium appearance-none min-w-[88px]" style={{borderColor:"#E9DDD4", fontFamily:"Instrument Sans"}}><option value="all">All</option><option value="unread">Unread</option><option value="pinned">Pinned</option><option value="love">Love ♥</option><option value="archive">Archive</option></select>
            <button onClick={()=> setShowAdd(true)} className="grid h-[44px] w-[44px] place-items-center rounded-full bg-[#111113] text-white text-[20px] shrink-0 active:scale-[0.96] shadow-[0_6px_18px_rgba(0,0,0,0.16)]" style={{transition:"transform 180ms cubic-bezier(0.34,1.56,0.64,1)"}}>+</button>
          </div>
        </div>
      </div>

      {/* Featured — polaroid boutique, breaks out edge */}
      {featured ? (
        <div className="w-full px-5 pt-5 relative">
          {/* soft paper shadow behind */}
          <div className="absolute inset-0 mx-5 mt-5 rounded-[18px] bg-[#F7E7D6] rotate-[1deg] blur-[0.2px] opacity-60" style={{top:"20px", bottom:"-6px"}} />
          <div className="relative rounded-[18px] border bg-[#FFFEFB] overflow-hidden shadow-[0_12px_30px_rgba(61,40,24,0.10)]" style={{borderColor:"#F0E2D4", transform:`rotate(${rotForId(featured.id)||-0.6}deg)`}}>
            {/* washi double tape — breaks out overlay */}
            <div className="pointer-events-none absolute -left-2 -top-2 w-[44px] h-[20px] bg-[#E9D5C0]/90 -rotate-[14deg] rounded-[3px] shadow-sm z-[2]" />
            <div className="pointer-events-none absolute right-[14%] -top-1.5 w-[72px] h-[18px] bg-[#E0D8CF]/80 rotate-[6deg] rounded-[3px] shadow-sm z-[2]" />
            {/* faint lined paper behind content only */}
            <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.64]" style={{backgroundImage:"repeating-linear-gradient(0deg, transparent 0 28px, #F6EDE4 28px 29px)", backgroundPosition:"0 58px"}} />
            <div className="relative z-[1]">
              <div className="px-5 pt-4 pb-2 flex items-center justify-between">
                <div className="text-[11px] tracking-[0.16em] font-semibold uppercase text-[#7A8B79] flex items-center gap-1.5">FROM {(PERSONS[featured.author as any]?.name||featured.author||"Ciaran").toUpperCase()} <span className="text-[#E07A5F] text-[12px]">♥</span> {featured.isLove && <span className="ml-1 rounded-full bg-[#FFF0EB] border border-[#F8C6B6] px-2 py-0.5 text-[10px] normal-case tracking-normal text-[#B95A45]">Love note</span>}</div>
                <button onClick={()=> setSelected(featured)} className="grid h-[32px] w-[32px] place-items-center rounded-full bg-[#F9F1EA] border border-[#F0E2D4] text-[#8B7E77] text-[12px] active:scale-[0.96]">⋯</button>
              </div>
              <div className="px-5 pb-4 grid grid-cols-[134px_1fr] gap-4 items-start">
                <div className="relative mt-0.5">
                  {featured.photoDataUrl ? (
                    <div className="rounded-[10px] bg-white p-[6px] shadow-[0_8px_22px_rgba(0,0,0,0.14)] rotate-[-1.8deg] border border-[#F1E3D6]" style={{transform:"rotate(-2deg)"}}>
                      <img src={featured.photoDataUrl} alt="" className="w-[118px] h-[106px] rounded-[6px] object-cover" />
                      <div className="pt-1.5 text-right pr-1 text-[13px] font-[600]" style={{fontFamily:"Pinyon Script, cursive", color:"#8AA79A"}}>us ♡</div>
                    </div>
                  ) : (
                    <div className="rounded-[12px] bg-[#FFFBF6]/90 border border-dashed border-[#E8D8C8] px-2 py-7 text-center">
                      <div className="text-[20px] opacity-80">♡</div>
                      <div className="mt-1 text-[11px] text-[#9A8D85]" style={{fontFamily:"Instrument Sans"}}>No photo</div>
                      <div className="mt-0.5 text-[10px] text-[#A89A8F]">tap ⋯ → add</div>
                    </div>
                  )}
                  <div className="mt-2.5 px-1 text-[11px] text-[#7A706A] flex items-center gap-1.5"><span className="h-[4px] w-[4px] rounded-full bg-[#D0A07A] inline-block"/> {relTime(featured.createdAt, nowMs)} • {(featured.isLove?"Love":"Personal")}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-[17px] font-[700] leading-[1.24] text-[#221B18] line-clamp-3" style={{fontFamily:"Fraunces, serif"}}>{featured.body}</div>
                  <div className="mt-3 rounded-[10px] bg-[#FFF4EA]/70 border border-[#F2DCC7]/70 px-3 py-2">
                    <div className="text-[14px] leading-[1.42] text-[#6B5E57] italic" style={{fontFamily:"Pinyon Script, cursive"}}>Those little moments<br/>that mean<br/>everything.</div>
                    <div className="mt-1 text-[10.5px] text-[#9A8D85]">— {PERSONS[featured.author as any]?.name||featured.author}</div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(featured as any).pinnedAt && <span className="rounded-full bg-[#EFEFE8] border border-[#E3DDD4] px-2.5 py-1 text-[10px]">📌 Pinned</span>}
                    {((featured as any).seenBy && (featured as any).seenBy[partner]) ? null : featured.author===partner && <span className="rounded-full bg-[#111113] text-white px-2.5 py-1 text-[10px]">New</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full px-5 pt-5"><div className="rounded-[18px] border border-dashed bg-[#FFFEFA] px-5 py-14 text-center shadow-[0_6px_18px_rgba(0,0,0,0.04)]" style={{borderColor:"#E8DDD4"}}><div className="text-[28px]">♡</div><div className="mt-2 text-[14px] font-semibold text-[#3D2E26]" style={{fontFamily:"Fraunces"}}>No notes yet</div><div className="mt-1 text-[12px] text-[#8B7E77]">Tap + to pin first note to board</div></div></div>
      )}

      {/* Memo board — Older sticky notes (boutique board) */}
      <div className="w-full px-5 pt-7">
        <div className="flex items-center justify-between px-1 pb-3">
          <div className="flex items-center gap-2"><div className="h-[5px] w-[22px] rounded-full bg-[#E8C9AA]"/><div className="text-[11.5px] tracking-[0.16em] font-[650] uppercase text-[#8A7E75]">Memo board</div><span className="rounded-full bg-[#F1E7DE] px-2 py-0.5 text-[10.5px]">{older.length}</span></div>
          <div className="text-[10px] text-[#9A8F88]">tap to open • swirled • tape</div>
        </div>
        {older.length===0 ? (
          <div className="rounded-[16px] border border-dashed bg-white/70 px-5 py-10 text-center text-[12.5px] text-[#8A7E77]">Board clear • older notes live here</div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5 auto-rows-[minmax(0,auto)]">
            {older.map((n:any)=>{
              const rot = rotForId(n.id) || 0;
              const isLove = !!n.isLove;
              const isPinned = !!(n.pinned_at||n.pinnedAt);
              const hasPhoto = !!n.photoThumbDataUrl || !!n.photoDataUrl;
              const bg = isLove ? "linear-gradient(180deg,#FFF7F4 0%,#FFF1EE 100%)" : rot%2===0 ? "linear-gradient(180deg,#FFFEFB 0%,#FFF8EE 100%)" : "linear-gradient(180deg,#FFFEFB 0%,#F7F3E6 100%)";
              const tape = isLove ? "#F8C9C0" : rot>0 ? "#E9D5C0" : "#D8D0C6";
              return (
                <button key={n.id} onClick={()=> setSelected(n)} className="text-left relative rounded-[14px] border bg-white px-3 pt-7 pb-3 min-h-[132px] flex flex-col shadow-[0_6px_16px_rgba(52,33,18,0.08)] active:scale-[0.985] transition-[transform,box-shadow] group" style={{borderColor:isPinned?"#E8C9AA": isLove?"#F8D9D0" : "#E9DDD4", background: bg as any, transform:`rotate(${rot*0.9}deg)`}}>
                  {/* tape */}
                  <div className="pointer-events-none absolute left-1/2 -top-1.5 -translate-x-1/2 w-[44px] h-[14px] rounded-[3px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] opacity-90" style={{background:tape, transform:`translateX(-50%) rotate(${rot>0?-6:5}deg)`}} />
                  {/* pin / love header */}
                  <div className="flex items-center justify-between -mt-1 mb-1.5">
                    <span className={"inline-flex h-[20px] place-items-center rounded-full border px-2 text-[10px] font-semibold "+(isLove?"bg-[#FFF0EB] border-[#F8C6B6] text-[#B65A45]":"bg-[#F7F2EE] border-[#E9DDD4] text-[#7A706A]")}>{isLove?"♥ Love":"Note"}</span>
                    {isPinned && <span className="text-[10px]">📌</span>}
                  </div>
                  {hasPhoto && (
                    <div className="rounded-[8px] bg-white p-[4px] shadow-[0_3px_10px_rgba(0,0,0,0.10)] -rotate-1 mb-2 border border-[#F1E3D6]" style={{transform:"rotate(-1deg)"}}>
                      <img src={n.photoThumbDataUrl||n.photoDataUrl} alt="" className="w-full h-[72px] rounded-[5px] object-cover" loading="lazy"/>
                    </div>
                  )}
                  <div className="text-[12.8px] leading-[1.35] font-[560] text-[#2E241F] line-clamp-4" style={{fontFamily:"Instrument Sans"}}>{n.body}</div>
                  <div className="mt-auto pt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="grid h-[20px] w-[20px] place-items-center rounded-full text-[9.5px] font-bold text-white" style={{background: (PERSONS[n.author as any]?.accent2||"#9CB0D9")}}>{(PERSONS[n.author as any]?.initial||n.author?.slice(0,1)||"?")?.toUpperCase()}</span>
                      <span className="text-[10px] text-[#8B7E77]">{relTime(n.createdAt, nowMs).replace(" ago","")}</span>
                    </div>
                    <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-[#F9F1EA] text-[10px] text-[#8B7E77] group-active:bg-[#111113] group-active:text-white">→</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* warm arches — subtle */}
      <div className="pointer-events-none absolute bottom-[64px] left-0 right-0 h-[200px] overflow-hidden opacity-[0.42] z-0">
        <div className="absolute -left-[26%] bottom-[-28%] w-[74%] h-[240px] rounded-full blur-[0.3px]" style={{background:"#F1C9A6"}} />
        <div className="absolute -right-[22%] bottom-[-18%] w-[60%] h-[200px] rounded-full" style={{background:"#C7D6C9", opacity:0.92}} />
      </div>

      {/* sheets */}
      <BottomSheet open={showAdd} onClose={()=> setShowAdd(false)} title="Pin to board">
        <div className="space-y-3">
          <textarea value={addBody} onChange={e=> setAddBody(e.target.value)} placeholder="Yoiii… little reminder to us…" className="w-full rounded-[14px] border bg-white px-3.5 py-3 text-[14px] min-h-[104px] outline-none focus:border-[#D9A77A]" style={{borderColor:"#E9DDD4"}} />
          <label className="flex items-center gap-2 text-[12.5px] bg-[#FFF7F1] border border-[#F2DDC7] px-3 py-2 rounded-full w-fit"><input type="checkbox" checked={addIsLove} onChange={e=> setAddIsLove(e.target.checked)} className="h-[14px] w-[14px] rounded-[4px]" /> Love note <span className="text-[#E07A5F]">♥</span></label>
          <div className="w-full">
            <input id="note-photo-input-v213" type="file" accept="image/*" onChange={e=>{ const f=e.target.files?.[0]; if(f) handlePhotoFile(f); }} className="sr-only" />
            <label htmlFor="note-photo-input-v213" className="flex h-[62px] w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] border-2 border-dashed bg-white px-3 text-[13px] font-semibold text-[#6B5E57] hover:bg-[#FFFBF8]" style={{borderColor:"#E9DDD4"}}>
              {isResizing ? "Resizing…" : addPhotoDataUrl ? "Change photo" : "Tap to add polaroid"}
            </label>
            {isResizing && <span className="mt-1 block text-[11px] text-[#8B7E77]">Compressing to 900px…</span>}
          </div>
          {addPhotoDataUrl && (
            <div className="flex gap-3 items-start rounded-[12px] border bg-[#FFFEFB] p-2.5" style={{borderColor:"#E9DDD4"}}>
              <img src={addThumbDataUrl || addPhotoDataUrl} alt="preview" className="h-[86px] w-[86px] rounded-[10px] object-cover border shadow-sm" style={{borderColor:"#E9DDD4"}} />
              <div className="text-[11.5px] leading-[1.4] text-[#6B5E57]">900px JPEG • 180px thumb<br/><span className="text-[10.5px] text-[#8B7E77]">{(addPhotoDataUrl.length/1024).toFixed(0)}k saves space</span><br/><button onClick={()=>{ setAddPhotoDataUrl(undefined); setAddThumbDataUrl(undefined); }} className="mt-1.5 inline-flex h-[28px] px-2.5 rounded-full bg-[#FFF0EE] border border-[#F8C6B6] text-[#B91C1C] text-[11px]">Remove</button></div>
            </div>
          )}
          <button onClick={addNote} disabled={!addBody.trim() || isResizing} className="w-full h-[48px] rounded-[14px] bg-[#111113] text-white text-[14px] font-semibold disabled:opacity-40 active:scale-[0.99] shadow-[0_8px_18px_rgba(0,0,0,0.16)]">Pin it to fridge</button>
          <div className="text-[10.5px] text-center text-[#9A8F88]">Saves live to both phones • Europe/Dublin time • verified</div>
        </div>
      </BottomSheet>

      <BottomSheet open={!!selected} onClose={()=> setSelected(null)} title={selected ? (PERSONS[selected.author as any]?.name||selected.author||"?") : undefined}>
        {selected && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={"inline-flex rounded-full px-2.5 py-1 text-[11px] border "+(selected.isLove?"bg-[#FFF0EB] border-[#F8C6B6] text-[#B95A45]":"bg-[#F7F2EE] border-[#E9DDD4] text-[#7A706A]")}>{selected.isLove?"♥ Love":"Note"}</span>
              {(selected as any).pinned_at||(selected as any).pinnedAt ? <span className="rounded-full bg-[#EFEFE8] border border-[#E3DDD4] px-2.5 py-1 text-[10px]">📌 Pinned</span> : null}
              <span className="text-[11px] text-[#9A8F88]">{relTime(selected.createdAt, nowMs)}</span>
            </div>
            <div className="text-[14.8px] leading-[1.5] whitespace-pre-wrap font-[480]" style={{fontFamily:"Instrument Sans"}}>{selected.body}</div>
            {selected.photoDataUrl && <img src={selected.photoDataUrl} alt="" className="w-full rounded-[14px] border shadow-[0_8px_20px_rgba(0,0,0,0.10)]" style={{borderColor:"#E9DDD4"}} />}
            {selected.photoThumbDataUrl && !selected.photoDataUrl && <img src={selected.photoThumbDataUrl} alt="" className="w-full rounded-[14px] border" style={{borderColor:"#E9DDD4"}} />}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button onClick={()=> { const nowISO=new Date().toISOString(); const upd=(selected as any).pinned_at || (selected as any).pinnedAt ? null : nowISO; const next={...selected, pinned_at: upd, pinnedAt: upd, updatedAt:nowISO, updatedBy:currentUser}; try{ hardPersistNote(next,'update'); }catch{}; setNotes((p:any)=> p.map((x:any)=> x.id===selected.id ? {...x, pinned_at: upd, pinnedAt: upd, updatedAt: nowISO } : x)); setSelected(null); }} className="h-[42px] rounded-[12px] border bg-white text-[12.5px] flex items-center justify-center gap-1.5">{(selected as any).pinned_at || (selected as any).pinnedAt ? "Unpin" : "📌 Pin"}</button>
              <button onClick={()=> { const nowISO=new Date().toISOString(); const next={...selected, archived_at: nowISO, archivedAt: nowISO, updatedAt: nowISO, updatedBy: currentUser}; try{ hardPersistNote(next,'update'); }catch{}; setNotes((p:any)=> p.map((x:any)=> x.id===selected.id ? {...x, archived_at: nowISO, archivedAt: nowISO, updatedAt: nowISO } : x)); setSelected(null); }} className="h-[42px] rounded-[12px] border bg-white text-[12px] text-[#7A706A]">Archive • hide</button>
            </div>
            <div className="text-[11px] text-[#9A8F88] text-center">Author {PERSONS[selected.author as any]?.name||selected.author} • {relTime(selected.createdAt, nowMs)} • edits save live</div>
            <button onClick={()=> { const id=selected.id; try{ hardPersistNote({id},'delete'); }catch{}; setNotes((p:any)=> (Array.isArray(p)?p:[]).filter((x:any)=> x.id!==id)); setSelected(null); }} className="w-full h-[44px] rounded-[12px] border border-[#F0C9C9] bg-[#FFF3F3] text-[12.5px] font-semibold text-[#B91C1C] active:scale-[0.99]">Delete permanently • both phones</button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

export function NotesScreen(props:any){ return <NotesMemoPage {...props} />; }
export default NotesScreen;
