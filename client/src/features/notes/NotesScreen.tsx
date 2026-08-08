// Notes boutique overhaul — matches fridge/shop quality, 100vw full-bleed, warm paper + tape, polaroid photo, script moments
import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { PersonKey, NoteMemo } from "../../types";
import { PERSONS } from "../../constants/themes";
import { uid, relTime, rotForId } from "../../shared/utils/helpers";
import { resizeToDataUrl, createThumbnail } from "../../lib/images";
import { getSupabase, getEffectiveRowId } from "../../lib/supabase";

function hardPersistNote(note:any, op:'create'|'update'|'delete'){
  try{
    const hid=getEffectiveRowId(); if(!hid) return;
    const sb=getSupabase(); const id=String(note?.id||''); if(!id) return;
    const payload={...note, household_id:hid, updated_at: note?.updatedAt||note?.updated_at||new Date().toISOString(), created_at: note?.createdAt||note?.created_at||new Date().toISOString()};
    if(op==='delete'){
      (async()=>{ try{ if(sb) await (sb as any).from('notes').delete().eq('id',id).eq('household_id',hid);}catch{} })();
      import("../../data/offlineQueue").then(async ({enqueueOp})=>{ try{ await enqueueOp('note','delete', id, hid, {id, deleted_at:new Date().toISOString()}); }catch{} });
      return;
    }
    (async()=>{ try{ if(sb){ const row:any={id, household_id:hid, data:payload, updated_at:payload.updated_at, created_at:payload.created_at}; if(payload.deletedAt||payload.deleted_at) row.deleted_at=payload.deletedAt||payload.deleted_at; await (sb as any).from('notes').upsert(row,{onConflict:'id'});} }catch{} })();
    import("../../data/offlineQueue").then(async ({enqueueOp})=>{ try{ await enqueueOp('note', op, id, hid, payload); const {drainOps}=await import("../../data/offlineQueue"); const cli=await import("../../lib/supabase").then(m=>m.getSupabase()); if(cli) try{ await drainOps(cli as any);}catch{} }catch{} });
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
  const older = useMemo(()=> filtered.slice(featured ? 1 : 0).slice(0,20), [filtered, featured]);

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
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Pinyon+Script&display=swap');`}</style>

      {/* Header card only — single (fixes dupe header) */}
      <div className="w-full px-5 pt-5">
        <div className="relative overflow-hidden rounded-[20px] border border-[#F2DDC4]/80 px-5 pt-5 pb-4" style={{background:"linear-gradient(180deg,#FEECD6 0%,#FEF5E7 100%)", boxShadow:"0 8px 24px rgba(0,0,0,0.05)"}}>
          <div className="pointer-events-none absolute right-0 top-0 h-full w-[56%]" style={{background:"linear-gradient(90deg,#FFFEFB 0%, #FFFBF2 100%)", clipPath:"polygon(16% 0, 100% 0, 100% 100%, 0% 100%)"}} />
          <div className="pointer-events-none absolute right-[46px] top-[14px] w-[98px] h-[28px] bg-[#E2C1A3] rotate-[-8deg] rounded-[3px] opacity-90 shadow-sm" style={{transform:"rotate(-9deg)"}} />
          <div className="pointer-events-none absolute right-[28px] top-[22px] text-[#E07A5F] text-[22px]">♡</div>
          <div className="relative z-[1]">
            <div className="text-[24px] font-[700] tracking-[-0.01em] text-[#2A1F1C]" style={{fontFamily:"Fraunces, serif"}}>Notes</div>
            <div className="text-[10.5px] tracking-[0.16em] font-semibold uppercase text-[#D17A3E] mt-0.5">Capture what matters</div>
          </div>
          <div className="relative z-[1] mt-4 flex items-center gap-2.5">
            <div className="flex-1 flex items-center gap-2 rounded-[14px] bg-white border border-[#EADDCF] px-3 h-[44px] shadow-sm">
              <span className="text-[#A08F82]">⌕</span>
              <input value={query} onChange={e=> setQuery(e.target.value)} placeholder="Search notes..." className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#A89A8F]" />
            </div>
            <div className="relative shrink-0">
              <select value={filter} onChange={e=> setFilter(e.target.value as any)} className="h-[44px] rounded-[12px] border bg-white pl-3 pr-7 text-[12.5px] font-medium appearance-none" style={{borderColor:"#E9DDD4"}}><option value="all">All</option><option value="unread">Unread</option><option value="pinned">Pinned</option><option value="love">Love</option><option value="archive">Archive</option></select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px]">▼</span>
            </div>
            <button onClick={()=> setShowAdd(true)} className="grid h-[44px] w-[44px] place-items-center rounded-full bg-[#101214] text-white text-[20px] shrink-0 active:scale-[0.96]">+</button>
          </div>
        </div>
      </div>

      {/* Featured — lined paper BEHIND content, not over */}
      {featured ? (
        <div className="w-full px-5 pt-4">
          <div className="relative rounded-[18px] border bg-white overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.06)]" style={{borderColor:"#F0E2D4"}}>
            {/* faint lines behind */}
            <div className="pointer-events-none absolute inset-0 z-0" style={{backgroundImage:"repeating-linear-gradient(0deg, transparent 0 30px, #F7EDE3 30px 31px)", top:"0px", opacity:0.7}} />
            <div className="relative z-[1]">
              <div className="px-5 pt-4 pb-1 flex items-center justify-between">
                <div className="text-[11px] tracking-[0.16em] font-semibold uppercase text-[#6B8D7A] flex items-center gap-1.5">FROM {(PERSONS[featured.author as any]?.name||featured.author||"Ciaran").toUpperCase()} <span className="text-[#E07A5F]">♥</span></div>
                <button onClick={()=> setSelected(featured)} className="grid h-[28px] w-[28px] place-items-center rounded-full bg-[#F9F1EA] text-[#A89E96]">⋯</button>
              </div>
              <div className="px-5 pb-4 grid grid-cols-[132px_1fr] gap-4">
                <div className="relative">
                  <div className="pointer-events-none absolute -left-2 -top-2 w-[36px] h-[18px] bg-[#E9D5C0]/80 rotate-[-14deg] rounded-[2px]" />
                  {featured.photoDataUrl ? (
                    <div className="rounded-[8px] bg-white p-1 shadow-[0_5px_14px_rgba(0,0,0,0.11)]" style={{transform:"rotate(-2deg)"}}>
                      <img src={featured.photoDataUrl} alt="" className="w-[122px] h-[108px] rounded-[4px] object-cover" />
                      <div className="pt-1 text-right pr-1 text-[#A8C5B5] text-[13px]">♡</div>
                    </div>
                  ) : (
                    <div className="rounded-[8px] bg-white/80 border border-dashed border-[#E8D8C8] px-2 py-6 text-center text-[11px] text-[#9A8D85]">No photo</div>
                  )}
                  <div className="mt-2 text-[11px] text-[#7A706A]">{relTime(featured.createdAt, nowMs)} • <span className="text-[#D07A41]">{featured.isLove?"Love":"Note"}</span></div>
                </div>
                <div className="min-w-0">
                  <div className="text-[16px] font-[650] leading-[1.25] text-[#221B18] line-clamp-2" style={{fontFamily:"Fraunces, serif"}}>{featured.body}</div>
                  <div className="mt-2 text-[13.5px] leading-[1.45] text-[#6B5E57] italic" style={{fontFamily:"Pinyon Script, cursive"}}>Those little moments<br/>that mean<br/>everything.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full px-5 pt-4"><div className="rounded-[16px] border border-dashed bg-white px-5 py-10 text-center text-[13px] text-[#8B7E77]" style={{borderColor:"#E8DDD4"}}>No notes yet — tap + to add</div></div>
      )}

      {/* Older */}
      <div className="w-full px-5 pt-5">
        <div className="text-[12px] tracking-[0.14em] font-semibold uppercase text-[#6D645D] pb-2">Older</div>
        <div className="grid gap-2.5">
          {older.map(n=> (
            <button key={n.id} onClick={()=> setSelected(n)} className="w-full text-left flex items-center gap-3 rounded-[14px] border bg-white px-3 py-3" style={{borderColor:"#E8DDD4"}}>
              <span className="grid h-[36px] w-[36px] place-items-center rounded-full text-[12px] font-bold text-white shrink-0" style={{background: (PERSONS[n.author as any]?.accent2||"#9CB0D9")}}>{(PERSONS[n.author as any]?.initial||n.author?.slice(0,1)||"?")?.toUpperCase()}</span>
              <span className="flex-1 min-w-0"><span className="block text-[13px] font-medium truncate">{n.body}</span><span className="block text-[11px] text-[#7A706A]">{relTime(n.createdAt, nowMs)} • Personal</span></span>
              <span className="grid h-[22px] w-[22px] place-items-center text-[#9AA0A6]">›</span>
            </button>
          ))}
        </div>
      </div>

      {/* bottom arches — subtle, behind, not covering list */}
      <div className="pointer-events-none absolute bottom-[64px] left-0 right-0 h-[200px] overflow-hidden opacity-40 z-0">
        <div className="absolute -left-[26%] bottom-[-32%] w-[74%] h-[260px] rounded-full" style={{background:"#F1C9A6"}} />
        <div className="absolute -right-[22%] bottom-[-22%] w-[60%] h-[220px] rounded-full" style={{background:"#C7D6C9"}} />
      </div>

      {/* sheets */}
      <BottomSheet open={showAdd} onClose={()=> setShowAdd(false)} title="New note">
        <div className="space-y-3">
          <textarea value={addBody} onChange={e=> setAddBody(e.target.value)} placeholder="Yoiii …" className="w-full rounded-[14px] border bg-white px-3 py-3 text-[14px] min-h-[96px] outline-none" style={{borderColor:"#E9DDD4"}} />
          <label className="flex items-center gap-2 text-[12.5px]"><input type="checkbox" checked={addIsLove} onChange={e=> setAddIsLove(e.target.checked)} /> Love note <span className="text-[#E07A5F]">♥</span></label>
          <div className="w-full">
            <input id="note-photo-input" type="file" accept="image/*" onChange={e=>{ const f=e.target.files?.[0]; if(f) handlePhotoFile(f); }} className="sr-only" />
            <label htmlFor="note-photo-input" className="flex h-[62px] w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] border-2 border-dashed bg-white px-3 text-[13px] font-semibold text-[#6B5E57] hover:bg-[#FFFBF8]" style={{borderColor:"#E9DDD4"}}>
              {isResizing ? "Resizing…" : addPhotoDataUrl ? "Change photo" : "Tap to add photo"}
            </label>
            {isResizing && <span className="mt-1 block text-[11px] text-[#8B7E77]">Compressing to 900px…</span>}
          </div>
          {addPhotoDataUrl && (
            <div className="flex gap-3 items-start rounded-[12px] border bg-white p-2" style={{borderColor:"#E9DDD4"}}>
              <img src={addThumbDataUrl || addPhotoDataUrl} alt="preview" className="h-[96px] w-[96px] rounded-[10px] object-cover border" style={{borderColor:"#E9DDD4"}} />
              <div className="text-[11px] leading-[1.4] text-[#6B5E57]">900px • thumb<br/><button onClick={()=>{ setAddPhotoDataUrl(undefined); setAddThumbDataUrl(undefined); }} className="mt-1 underline text-[#B91C1C]">Remove</button></div>
            </div>
          )}
          <button onClick={addNote} disabled={!addBody.trim() || isResizing} className="w-full h-[50px] rounded-[16px] bg-[#121214] text-white text-[14px] font-semibold disabled:opacity-40">Add</button>
        </div>
      </BottomSheet>

      <BottomSheet open={!!selected} onClose={()=> setSelected(null)} title={selected ? (PERSONS[selected.author as any]?.name||selected.author||"?") : undefined}>
        {selected && (
          <div className="space-y-3">
            <div className="text-[14.5px] leading-[1.45] whitespace-pre-wrap">{selected.body}</div>
            {selected.photoDataUrl && <img src={selected.photoDataUrl} alt="" className="w-full rounded-[12px] border" style={{borderColor:"#E9DDD4"}} />}
            <div className="text-[11px] text-[#8B7E77]">{relTime(selected.createdAt, nowMs)}</div>
            <div className="flex gap-2">
              <button onClick={()=> { const nowISO=new Date().toISOString(); const upd=(selected as any).pinned_at || (selected as any).pinnedAt ? null : nowISO; const next={...selected, pinned_at: upd, pinnedAt: upd, updatedAt:nowISO, updatedBy:currentUser}; try{ hardPersistNote(next,'update'); }catch{}; setNotes((p:any)=> p.map((x:any)=> x.id===selected.id ? {...x, pinned_at: upd, pinnedAt: upd, updatedAt: nowISO } : x)); setSelected(null); }} className="flex-1 h-[42px] rounded-[12px] border bg-white text-[12px]">Pin</button>
              <button onClick={()=> { const nowISO=new Date().toISOString(); const next={...selected, archived_at: nowISO, archivedAt: nowISO, updatedAt: nowISO, updatedBy: currentUser}; try{ hardPersistNote(next,'update'); }catch{}; setNotes((p:any)=> p.map((x:any)=> x.id===selected.id ? {...x, archived_at: nowISO, archivedAt: nowISO, updatedAt: nowISO } : x)); setSelected(null); }} className="flex-1 h-[42px] rounded-[12px] border bg-white text-[12px] text-[#B91C1C]">Archive</button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

export function NotesScreen(props:any){ return <NotesMemoPage {...props} />; }
export default NotesScreen;
