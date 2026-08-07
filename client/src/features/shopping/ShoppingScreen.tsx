import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { PersonKey, ShoppingItemV2, ShoppingCategory, ShoppingFrequency } from "../../types";
import { CATS } from "../../types";
import { uid } from "../../shared/utils/helpers";

function IconCheckTiny({ size=12 }: {size?:number}){ return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}><path d="M5 12.5l3.7 3.7L19 7"/></svg>; }
function parseNeedDaysToBool(s?: string): boolean[] {
  const out = [false,false,false,false,false,false,false];
  if (!s) return out;
  const toks = s.split(",").map(t=> t.trim().toLowerCase()).filter(Boolean);
  const map: Record<string,number> = {mo:0,mon:0,monday:0,tu:1,tue:1,tues:1,tuesday:1,we:2,wed:2,wednesday:2,th:3,thu:3,thur:3,thurs:3,thursday:3,fr:4,fri:4,friday:4,sa:5,sat:5,saturday:5,su:6,sun:6,sunday:6};
  for (const tk of toks) { const idx = (map as any)[tk]; if (idx!==undefined) out[idx]=true; }
  return out as any;
}
function boolToNeedDaysString(b: boolean[]): string | undefined {
  const labels=["Mo","Tu","We","Th","Fr","Sa","Su"];
  const sel = labels.filter((_,i)=> b[i]);
  return sel.length ? sel.join(",") : undefined;
}
function IconCat({ cat, size=16, active }: {cat: ShoppingCategory; size?: number; active?: boolean}) {
  const stroke = active ? "#0A0A0A" : "#8B7357";
  const s = size;
  if (cat==="Food") return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 7c-2-2-7-1.5-5 3 1.2 2.6 5 5 5 5s3.8-2.4 5-5c2-4.5-3-5-5-3Z"/><path d="M12 7V4"/><path d="M9 4c0.5-0.8 2.5-1 3 0"/></svg>;
  if (cat==="Household") return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.5}><path d="M7 10l3 8 2-4 2 4 3-8"/><path d="M12 2v3"/><path d="M9 22h6"/></svg>;
  if (cat==="Toiletries") return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.5}><path d="M12 2.8c0 0-7 8.2-7 13.2a7 7 0 0 0 14 0C19 11 12 2.8 12 2.8Z"/></svg>;
  if (cat==="Clothes") return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.5}><path d="M9 3l-5 5 2 2 3-2.5V20h6V7.5L18 10l2-2-5-5H9Z"/></svg>;
  if (cat==="Bills") return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.5}><path d="M7 3h10a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>;
  if (cat==="Trips") return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.5}><rect x="6" y="7" width="12" height="10" rx="2"/><path d="M9 7V5h6v2"/><path d="M8 12h8"/></svg>;
  if (cat==="Entertainment") return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.5}><path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3l-3 3-3-3H6a2 2 0 0 1-2-2V7Z"/><circle cx="12" cy="10" r="1.2"/><circle cx="9" cy="10" r="1.2"/><circle cx="15" cy="10" r="1.2"/></svg>;
  if (cat==="Personal") return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.5}><circle cx="12" cy="8" r="3.2"/><path d="M6 20a6 6 0 0 1 12 0"/></svg>;
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.5}><path d="M6 7h12v10H6z"/><path d="M9 7V5h6v2"/></svg>;
}
function BottomSheet({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: React.ReactNode; title?: string }) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(()=>{ onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    prevFocusRef.current = document.activeElement as HTMLElement;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onCloseRef.current?.(); }
      if (e.key === "Tab" && sheetRef.current) {
        const focusable = sheetRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;
        const first = focusable[0] as HTMLElement;
        const last = focusable[focusable.length - 1] as HTMLElement;
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", h);
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = (document.documentElement as any).style?.overscrollBehavior;
    document.body.style.overflow = "hidden";
    try { (document.documentElement as any).style.overscrollBehavior = "none"; } catch {}
    requestAnimationFrame(() => {
      if (sheetRef.current) {
        const auto = sheetRef.current.querySelector<HTMLElement>('[autofocus]');
        if (auto) auto.focus();
        else {
          const first = sheetRef.current.querySelector<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
          first?.focus();
        }
      }
    });
    return () => {
      document.removeEventListener("keydown", h);
      document.body.style.overflow = prevOverflow;
      try { (document.documentElement as any).style.overscrollBehavior = prevOverscroll || ""; } catch {}
      try { prevFocusRef.current?.focus(); } catch {}
    };
  }, [open]);
  if (!open) return null;
  const content = (
    <div className="fixed inset-0 z-[80] flex items-end justify-center px-3 pb-[max(16px,env(safe-area-inset-bottom))] pointer-events-auto">
      <button aria-label="Close sheet" onClick={onClose} className="absolute inset-0 bg-[#292624]/20 backdrop-blur-[3px] min-h-[44px]" />
      <div ref={sheetRef} role="dialog" aria-modal="true" aria-labelledby={title ? "sheet-title" : undefined} className="relative w-full max-w-[420px] animate-[sheetIn_0.24s_ease] rounded-[16px] bg-[var(--card-bg)] border shadow-[0_-16px_48px_rgba(0,0,0,0.18)] max-h-[72dvh] flex flex-col focus:outline-none" style={{ borderColor: "var(--border)" }} tabIndex={-1}>
        <div className="flex items-center justify-center pt-3 pb-2 shrink-0" aria-hidden="true"><span className="rounded-full bg-[var(--border)]" style={{ width: "36px", height: "5px", display: "block" }} /></div>
        <div className="flex items-center justify-between px-5 pb-3 shrink-0 gap-2">
          {title ? <div id="sheet-title" className="font-display text-[16px] font-medium text-[var(--text)]">{title}</div> : <div className="flex-1" />}
          <button onClick={onClose} aria-label="Close" className="grid h-[44px] w-[44px] place-items-center rounded-full bg-[var(--card-bg)] border hover:bg-[var(--chip-bg)] shrink-0" style={{ borderColor: "var(--border)" }}>
            <span aria-hidden="true" className="text-[14px]"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 6l12 12M18 6L6 18"/></svg></span>
          </button>
        </div>
        <div className="px-4 pb-6 overflow-auto no-scrollbar overscroll-contain">{children}</div>
      </div>
    </div>
  );
  return createPortal(content, document.body);
}


function ShoppingPageFacelift(props: any) {
  let { items, setItems, currentUser, onCelebrate, nowMs } = (props || {}) as {
    items: ShoppingItemV2[]; setItems: any; currentUser: PersonKey; onCelebrate?: any; nowMs: number;
  };
  // v120 tabs guard: defensive defaults so .filter never crashes if props undefined
  if (!Array.isArray(items)) items = [] as any;
  if (typeof setItems !== 'function') setItems = (()=>{}) as any;
  if (!currentUser) currentUser = "aisling" as any;
  if (typeof onCelebrate !== 'function') onCelebrate = (()=>{}) as any;
  if (typeof nowMs !== 'number') nowMs = Date.now();
  const [tripMode, setTripMode] = useState(false);
  const [segment, setSegment] = useState<"household"|"aisling"|"ciaran">("household");
  const [catFilter, setCatFilter] = useState<ShoppingCategory|"All">("All");
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addText, setAddText] = useState("");
  const [addCat, setAddCat] = useState<ShoppingCategory>("Food");
  const [addFreq, setAddFreq] = useState<ShoppingFrequency>("as-needed");
  const [addQty, setAddQty] = useState(1);
  const [addNeedDays, setAddNeedDays] = useState<boolean[]>(()=>[false,false,false,false,false,false,false]);
  const [editing, setEditing] = useState<ShoppingItemV2|null>(null);
  const [editQty, setEditQty] = useState(1);
  const [editCat, setEditCat] = useState<ShoppingCategory>("Food");
  const [editFreq, setEditFreq] = useState<ShoppingFrequency>("as-needed");
  const [editNeedDays, setEditNeedDays] = useState<boolean[]>(()=>[false,false,false,false,false,false,false]);
  const [editNotes, setEditNotes] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showBought, setShowBought] = useState(false);
  const [confirmDelId, setConfirmDelId] = useState<string|null>(null);

  const activeItems = useMemo(()=> items.filter((s:any)=> !(s as any).deletedAt && !(s as any).archivedAt && (s as any).item?.trim()), [items]);
  const boughtAll = useMemo(()=> activeItems.filter(s=> s.purchased).sort((a,b)=> new Date((b as any).lastDoneAt||b.createdAt).getTime()-new Date((a as any).lastDoneAt||a.createdAt).getTime()), [activeItems]);

  const filtered = useMemo(()=>{
    let list = activeItems;
    if(segment==="household") list = list.filter(i=> !(i as any).tags?.some((t:string)=> t.includes("aisling")||t.includes("ciaran")) || (i as any).templateKind);
    else if(segment==="aisling") list = list.filter(i=> (i as any).addedBy==="aisling" || (i as any).templateOwner==="aisling" || (i as any).tags?.some((t:string)=> t.includes("aisling")));
    else list = list.filter(i=> (i as any).addedBy==="ciaran" || (i as any).templateOwner==="ciaran" || (i as any).tags?.some((t:string)=> t.includes("ciaran")));
    if(catFilter!=="All") list = list.filter(i=> i.cat===catFilter);
    if(query.trim()){
      const q=query.toLowerCase();
      list = list.filter(i=> i.item.toLowerCase().includes(q) || i.cat.toLowerCase().includes(q));
    }
    return list;
  }, [activeItems, segment, catFilter, query]);

  const todo = useMemo(()=> filtered.filter(s=> !s.purchased).sort((a,b)=> CATS.indexOf(a.cat)-CATS.indexOf(b.cat)), [filtered]);
  const bought = useMemo(()=> filtered.filter(s=> s.purchased), [filtered]);
  const countTodo = todo.length;
  const suggested = useMemo(()=> boughtAll.slice(0,3), [boughtAll]);

  const grouped = useMemo(()=>{
    const map = new Map<ShoppingCategory, ShoppingItemV2[]>();
    for(const it of todo){
      const k = it.cat as ShoppingCategory;
      if(!map.has(k)) map.set(k, []);
      map.get(k)!.push(it as any);
    }
    const ordered: {cat: ShoppingCategory; items: ShoppingItemV2[]}[] = [];
    for(const c of CATS){ if(map.has(c)) ordered.push({cat:c, items: map.get(c)!}); }
    for(const [k,v] of map.entries()){ if(!(CATS as any).includes(k)) ordered.push({cat:k, items:v}); }
    return ordered;
  }, [todo]);

  const tripProgress = useMemo(()=>{
    const total = activeItems.filter(s=> !s.purchased).length + activeItems.filter(s=> s.purchased).length;
    const done = activeItems.filter(s=> s.purchased).length;
    return { done, total: total||1, left: Math.max(0, total-done) };
  }, [activeItems]);

  function addItem(){
    if(!addText.trim()) return;
    const now = new Date();
    const needStr = (addFreq==="weekly" || addFreq==="biweekly") ? boolToNeedDaysString(addNeedDays) : undefined;
    const it: ShoppingItemV2 = {
      id: uid("shop"),
      item: addText.trim(),
      qty: addQty,
      cat: addCat,
      purchased: false,
      addedBy: currentUser,
      createdAt: now.toISOString(),
      repeatCount: 0,
      frequency: addFreq,
      needDays: needStr,
      notes: undefined,
      updatedAt: now.toISOString(),
      updatedBy: currentUser,
      originalDom: addFreq === "monthly" ? now.getDate() : undefined,
    } as any;
    setItems((p:any)=> [it, ...p]);
    setAddText(""); setAddOpen(false);
    setAddCat("Food"); setAddFreq("as-needed" as any); setAddQty(1);
    setAddNeedDays([false,false,false,false,false,false,false]);
    setShowAdvanced(false);
  }

  function togglePurchased(it: ShoppingItemV2){
    const nowISO = new Date().toISOString();
    setItems((prev:any)=> prev.map((x:any)=> x.id===it.id ? {...x, purchased: !x.purchased, lastDoneAt: !x.purchased ? nowISO : x.lastDoneAt, updatedAt: nowISO, updatedBy: currentUser} : x));
    if(!it.purchased){ try{ onCelebrate?.(it); }catch{} }
  }

  function saveEdit(){
    if(!editing) return;
    const needStr = (editFreq==="weekly" || editFreq==="biweekly") ? boolToNeedDaysString(editNeedDays) : undefined;
    setItems((prev:any)=> prev.map((x:any)=> x.id===editing.id ? {...x, qty: editQty, cat: editCat, frequency: editFreq, needDays: needStr, notes: editNotes||undefined, updatedAt: new Date().toISOString(), updatedBy: currentUser} : x));
    setEditing(null); setConfirmDelId(null);
  }

  function handleDelete(id: string){
    const nowISO = new Date().toISOString();
    setItems((p:any)=> p.map((x:any)=> x.id===id ? {...x, deletedAt: nowISO, updatedAt: nowISO, updatedBy: currentUser } : x));
    setEditing(null); setConfirmDelId(null);
  }

  function handleArchive(id: string){
    const nowISO = new Date().toISOString();
    setItems((p:any)=> p.map((x:any)=> x.id===id ? {...x, archivedAt: nowISO, updatedAt: nowISO, updatedBy: currentUser } : x));
    setEditing(null);
  }

  // Trip grouped
  const tripGrouped = useMemo(()=>{
    const list = activeItems.filter(s=> !s.purchased);
    const map = new Map<ShoppingCategory, ShoppingItemV2[]>();
    for(const it of list){ const k=it.cat as ShoppingCategory; if(!map.has(k)) map.set(k,[]); map.get(k)!.push(it as any); }
    const ordered:any[]=[];
    for(const c of CATS){ if(map.has(c)) ordered.push({cat:c, items: map.get(c)}); }
    for(const [k,v] of map.entries()) if(!(CATS as any).includes(k)) ordered.push({cat:k, items:v});
    return ordered as {cat:ShoppingCategory, items:ShoppingItemV2[]}[];
  }, [activeItems]);

  const tripDone = activeItems.filter(s=> s.purchased);

  if(tripMode){
    const left = tripProgress.left;
    return createPortal(
      <div className="fixed inset-0 z-[80] flex flex-col bg-[var(--chip-bg)] safe-trip">
        {/* progress rail 2px */}
        <div className="h-[2px] w-full bg-[var(--wash-mid)]">
          <div className="h-[2px] bg-[#0A0A0A] transition-all duration-500" style={{width: tripProgress.total? (tripProgress.done/tripProgress.total*100)+'%' : '0%'}}/>
        </div>
        <div className="flex items-center justify-between px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3 border-b bg-[var(--card-bg)]" style={{borderColor:'var(--border)'}}>
          <button onClick={()=> setTripMode(false)} className="grid h-[44px] w-[44px] place-items-center rounded-full border bg-[var(--card-bg)] active:scale-[0.97]" style={{borderColor:'var(--border)'}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
          <div className="text-center">
            <div className="font-display text-[15px] font-semibold">Shop</div>
            <div className="text-[11px] text-[var(--muted)]">{tripProgress.done} of {tripProgress.total} • {left} left</div>
          </div>
          <div className="w-[44px]"/>
        </div>
        <div className="flex-1 overflow-auto px-4 py-4 space-y-6 pb-[120px]">
          {tripGrouped.length===0 && tripDone.length===0 && <div className="py-16 text-center text-[13px] text-[var(--muted)]">Nothing to buy — add from pantry first.</div>}
          {tripGrouped.map(g=> (
            <div key={g.cat as any} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">{g.cat}</span>
                <span className="h-[1px] flex-1 bg-[var(--border)]"/>
                <span className="text-[11px] text-[#9A8A7D]">{g.items.length}</span>
              </div>
              <div className="space-y-2">
                {g.items.map(it=> (
                  <button key={it.id} onClick={()=> togglePurchased(it)} className="w-full flex items-center gap-3 px-3 min-h-[64px] rounded-[16px] border bg-[var(--card-bg)] text-left active:scale-[0.97] transition-transform" style={{borderColor:'var(--border)', minHeight:64}}>
                    <span className="grid h-[28px] w-[28px] place-items-center rounded-full border bg-[var(--card-bg)] shrink-0" style={{borderColor:'var(--border)'}}><span className="h-[8px] w-[8px] rounded-full border border-[#8B7357]"/></span>
                    <span className="text-[15px] font-medium text-[var(--text)]">{it.item}<span className="ml-2 text-[13px] text-[var(--muted)]">{it.qty>1? `×${it.qty}`:''}</span></span>
                    <span className="ml-auto grid h-6 w-6 place-items-center rounded-full bg-[var(--chip-bg)]"><IconCat cat={it.cat as any} size={10}/></span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {tripDone.length>0 && (
            <div className="pt-4 border-t border-dashed" style={{borderColor:'var(--border)'}}>
              <div className="px-1 text-[11px] uppercase tracking-wide text-[var(--muted)] mb-2">Picked • {tripDone.length}</div>
              {tripDone.slice(0,20).map(it=> (
                <div key={it.id} className="flex items-center gap-3 px-3 min-h-[48px] rounded-[12px] bg-[var(--chip-bg)]/70 mb-1">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-[#0A0A0A] text-white"><IconCheckTiny size={11}/></span>
                  <span className="text-[13px] line-through text-[var(--muted)] flex-1 truncate">{it.item}</span>
                  <button onClick={()=> togglePurchased(it as any)} className="text-[11px] underline text-[var(--text-secondary)] min-h-[44px] px-2">Undo</button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="sticky bottom-0 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 bg-[var(--card-bg)] border-t" style={{borderColor:'var(--border)'}}>
          <button onClick={()=> { try{ onCelebrate?.({confetti:true, count:36}); }catch{} setTripMode(false); }} className="w-full h-[56px] rounded-[16px] bg-[#0A0A0A] text-white text-[15px] font-semibold active:scale-[0.97] transition-transform shadow-[0_10px_24px_rgba(0,0,0,0.2)]" style={{transitionTimingFunction:'cubic-bezier(0.34,1.56,0.64,1)'}}>
            Finish trip • {left} left
          </button>
        </div>
      </div>,
      document.body
    );
  }

  return (
    <div className="space-y-5">
      {/* calm header */}
      <div className="px-1 pt-1">
        <h2 className="font-display text-[28px] font-semibold tracking-tight text-[var(--text)] leading-[1.05]">Pantry</h2>
        <div className="mt-1 text-[12px] text-[var(--text-secondary)]">{countTodo===0 ? "All stocked" : `${countTodo} to buy`}</div>
      </div>

      {/* unified control bar - 3 controls same height radius border */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="5"/><path d="M20 20l-3.5-3.5"/></svg></span>
          <input value={query} onChange={e=> setQuery(e.target.value)} placeholder="Search pantry…" className="w-full h-[44px] rounded-[12px] border bg-[var(--card-bg)] pl-9 pr-3 text-[13px] placeholder:text-[#9A8A7D] outline-none focus:border-[#CFC2B6]" style={{borderColor:'var(--border)'}} />
          {query && <button onClick={()=> setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-full bg-[var(--chip-bg)] text-[10px]">✕</button>}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-[160px]">
            <select value={catFilter as any} onChange={e=> setCatFilter(e.target.value as any)} className="w-full h-[44px] min-h-[44px] rounded-[12px] border bg-[var(--card-bg)] px-3 pr-8 text-[12px] font-medium appearance-none outline-none focus:border-[#CFC2B6]" style={{borderColor:"var(--border)"}}>
              <option value="All">All categories</option>
              {CATS.map(c=> <option key={c} value={c}>{c}</option>)}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 4 L6 8 L10 4" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round"/></svg></span>
          </div>
          <div className="relative flex-1 sm:w-[140px]">
            <select value={segment} onChange={e=> setSegment(e.target.value as any)} className="w-full h-[44px] min-h-[44px] rounded-[12px] border bg-[var(--card-bg)] px-3 pr-8 text-[12px] font-medium appearance-none outline-none focus:border-[#CFC2B6]" style={{borderColor:"var(--border)"}}>
              <option value="household">Household</option>
              <option value="aisling">Aisling</option>
              <option value="ciaran">Ciaran</option>
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 4 L6 8 L10 4" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round"/></svg></span>
          </div>
        </div>
      </div>

      <button onClick={()=> setAddOpen(true)} className="w-full flex items-center justify-between rounded-[16px] border border-dashed bg-[var(--card-bg)] px-4 h-[48px] text-left active:scale-[0.98] transition-transform hover:border-[#CFC2B6]" style={{borderColor:"var(--border)"}}>
        <span className="text-[13px] text-[var(--text-secondary)] flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#0A0A0A] text-white"><svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="1.6"><path d="M6 1v10M1 6h10"/></svg></span>Add something you need…</span>
        <span className="text-[11px] text-[var(--muted)]">Tap to add</span>
      </button>

      <div className="space-y-6">
        {todo.length===0 ? (
          <div className="rounded-[20px] border bg-[var(--card-bg)] px-6 py-12 text-center" style={{borderColor:"var(--border)"}}>
            <div className="mx-auto grid h-[64px] w-[64px] place-items-center rounded-full bg-[var(--chip-bg)] border" style={{borderColor:"var(--border)"}}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.2"><path d="M6 8h12l-1 11H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>
            </div>
            <div className="mt-3 font-display text-[15px] font-medium text-[var(--text)]">All stocked</div>
            <div className="mt-1 text-[12px] text-[var(--muted)]">Running low? Quick-add below.</div>
            {suggested.length>0 && (
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {suggested.map(it=> (
                  <button key={it.id} onClick={()=> { 
                    const nowISO=new Date().toISOString();
                    const ex=activeItems.find((x:any)=> x.item===it.item && !(x as any).purchased);
                    if(ex){ setItems((p:any)=> p.map((x:any)=> x.id===ex.id? {...x, qty: (x.qty||1)+1, updatedAt:nowISO, updatedBy: currentUser}:x)); }
                    else { setItems((p:any)=> [{id: uid("shop"), item: it.item, qty:1, cat: it.cat, purchased:false, addedBy: currentUser, createdAt:nowISO, repeatCount:0, frequency:"as-needed" as any, updatedAt:nowISO, updatedBy: currentUser } as any, ...p]); }
                  }} className="h-[44px] rounded-full border bg-[var(--card-bg)] px-3.5 text-[12px] active:scale-[0.96]" style={{borderColor:'var(--border)'}}>+ {it.item}</button>
                ))}
              </div>
            )}
            <button onClick={()=> setTripMode(true)} className="mt-5 h-[44px] rounded-full bg-[#0A0A0A] px-5 text-[12px] font-semibold text-white">Start trip</button>
          </div>
        ) : grouped.map(g=> (
          <div key={g.cat as any} className="space-y-2">
            <div className="flex items-center gap-2 px-1 h-[24px] border-b" style={{borderColor:'var(--border)'}}>
              <span className="text-[11px] uppercase tracking-[0.08em] font-semibold text-[var(--muted)]">{g.cat}</span>
              <span className="text-[11px] text-[#9A8A7D]">{g.items.length}</span>
              <span className="flex-1 h-[1px] bg-[var(--border)] ml-2"/>
            </div>
            <div className="grid gap-2">
              {g.items.map(it=> (
                <div key={it.id} className="group flex items-center gap-0 rounded-[16px] border bg-[var(--card-bg)] px-1 py-1 min-h-[56px] hover:border-[#CFC2B6] transition-colors" style={{borderColor:'var(--border)'}}>
                  <button onClick={()=> togglePurchased(it)} className="grid h-[44px] w-[44px] place-items-center shrink-0 active:scale-[0.92]" aria-label="toggle">
                    <span className="grid h-[24px] w-[24px] place-items-center rounded-full border bg-[var(--card-bg)]" style={{borderColor:'#CFC2B6'}}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="transparent"><path d="M5 12.5l4 4L19 7" strokeWidth="2"/></svg>
                    </span>
                  </button>
                  <button onClick={()=> { setEditing(it as any); setEditQty(it.qty); setEditCat(it.cat); setEditFreq(it.frequency||"as-needed" as any); setEditNeedDays(parseNeedDaysToBool((it as any).needDays)); setEditNotes((it as any).notes||""); setConfirmDelId(null); }} className="flex-1 text-left min-w-0 flex items-center gap-2 pr-2">
                    <span className="text-[15px] font-[500] text-[var(--text)] truncate">{it.item}</span>
                    {it.qty>1 && <span className="text-[13px] text-[var(--muted)]">×{it.qty}</span>}
                  </button>
                  <span className="h-[6px] w-[6px] rounded-full bg-[var(--border)] mr-2"/>
                  <button onClick={()=> { setEditing(it as any); setEditQty(it.qty); setEditCat(it.cat); setEditFreq(it.frequency||"as-needed" as any); setEditNeedDays(parseNeedDaysToBool((it as any).needDays)); setEditNotes((it as any).notes||""); }} className="grid h-[44px] w-[44px] place-items-center text-[#9A8A7D]"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M9 18l6-6"/><path d="M14 8l2-2"/><circle cx="11" cy="11" r="2"/></svg></button>
                </div>
              ))}
            </div>
          </div>
        ))}
        {bought.length>0 && (
          <div className="pt-2">
            <button onClick={()=> setShowBought(v=>!v)} className="w-full flex items-center gap-2 px-1 h-[44px] text-left">
              <span className="text-[11px] uppercase tracking-wide text-[var(--muted)]">Bought</span>
              <span className="text-[11px] text-[#9A8A7D]">{bought.length}</span>
              <span className="flex-1 h-[1px] bg-[var(--border)] ml-2"/>
              <span className="text-[11px] text-[var(--text-secondary)]">{showBought? "Hide":"Show"}</span>
            </button>
            {showBought && (
              <div className="grid gap-1.5 mt-2">
                {bought.slice(0,12).map(it=> (
                  <div key={it.id} className="flex items-center gap-3 rounded-[12px] border border-dashed bg-[var(--chip-bg)]/60 px-3 py-2 min-h-[40px] opacity-[0.65]" style={{borderColor:'var(--border)'}}>
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-[#0A0A0A] text-white"><IconCheckTiny size={10}/></span>
                    <span className="text-[13px] line-through decoration-[1px] text-[var(--muted)] truncate flex-1">{it.item}</span>
                    <button onClick={()=> togglePurchased(it)} className="text-[11px] underline text-[var(--text-secondary)] min-h-[44px] px-2">Undo</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="pt-2 pb-6 flex justify-center">
        <button onClick={()=> setTripMode(true)} disabled={countTodo===0} className="h-[44px] rounded-full border bg-[var(--card-bg)] px-5 text-[12px] font-medium disabled:opacity-40 active:scale-[0.97]" style={{borderColor:'var(--border)'}}>Trip • {countTodo>0? `${countTodo} items`:"All done"}</button>
      </div>

      {/* Add sheet - progressive */}
      <BottomSheet open={addOpen} onClose={()=> setAddOpen(false)} title="Add to pantry">
        <div className="space-y-4">
          <input value={addText} onChange={e=> setAddText(e.target.value)} placeholder="Milk, bread, eggs…" className="w-full h-[48px] rounded-[12px] border bg-[var(--card-bg)] px-4 text-[14px] outline-none focus:border-[#CFC2B6]" style={{borderColor:"var(--border)"}} autoFocus />
          <div className="grid grid-cols-3 gap-2">
            <select value={addCat} onChange={e=> setAddCat(e.target.value as any)} className="h-[44px] rounded-[12px] border bg-[var(--card-bg)] px-2 text-[12px]" style={{borderColor:"var(--border)"}}>{CATS.map(c=> <option key={c} value={c}>{c}</option>)}</select>
            <div className="flex items-center rounded-[12px] border bg-[var(--card-bg)] px-2" style={{borderColor:'var(--border)'}}>
              <button onClick={()=> setAddQty(q=> Math.max(1,q-1))} className="h-[36px] w-[36px] rounded-full border bg-[var(--card-bg)] flex items-center justify-center">−</button>
              <span className="w-8 text-center text-[13px] font-medium">{addQty}</span>
              <button onClick={()=> setAddQty(q=> q+1)} className="h-[36px] w-[36px] rounded-full border bg-[var(--card-bg)] flex items-center justify-center">+</button>
            </div>
            <button onClick={()=> setShowAdvanced(v=>!v)} className="h-[44px] rounded-[12px] border bg-[var(--card-bg)] text-[11px]">{showAdvanced? "Hide":"Advanced"}</button>
          </div>
          {showAdvanced && (
            <div className="space-y-2 rounded-[12px] border bg-[var(--card-bg)] p-3" style={{borderColor:'var(--border)'}}>
              <select value={addFreq} onChange={e=> setAddFreq(e.target.value as any)} className="w-full h-[44px] rounded-[12px] border bg-[var(--card-bg)] px-3 text-[12px]" style={{borderColor:"var(--border)"}}><option value="as-needed">As needed</option><option value="daily">Daily</option><option value="every-2d">Every 2d</option><option value="weekly">Weekly</option><option value="biweekly">Biweekly</option><option value="monthly">Monthly</option></select>
              {(addFreq==="weekly" || addFreq==="biweekly") && (
                <div className="grid grid-cols-7 gap-1">
                  {["Mo","Tu","We","Th","Fr","Sa","Su"].map((d,i)=> (
                    <button key={d} onClick={()=> { const nxt=[...addNeedDays]; nxt[i]=!nxt[i]; setAddNeedDays(nxt); }} className={"h-[44px] rounded-full border text-[11px] grid place-items-center "+(addNeedDays[i]?"bg-[#0A0A0A] text-white border-[#0A0A0A]":"bg-[var(--card-bg)] border-[var(--border)]")}>{d}</button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button onClick={addItem} disabled={!addText.trim()} className="w-full h-[52px] rounded-[16px] bg-[#0A0A0A] text-white text-[14px] font-semibold disabled:opacity-40 active:scale-[0.98]">Add to pantry</button>
        </div>
      </BottomSheet>

      {/* Edit sheet - proper form */}
      <BottomSheet open={!!editing} onClose={()=> { setEditing(null); setConfirmDelId(null); }} title={editing?.item}>
        {editing && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-[12px] border bg-[var(--card-bg)] px-3 py-2" style={{borderColor:'var(--border)'}}>
              <button onClick={()=> setEditQty(q=> Math.max(1,q-1))} className="grid h-[44px] w-[44px] place-items-center rounded-full border bg-[var(--card-bg)]"><svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.6"><path d="M5 12h14"/></svg></button>
              <span className="w-10 text-center text-[15px] font-medium">{editQty}</span>
              <button onClick={()=> setEditQty(q=> q+1)} className="grid h-[44px] w-[44px] place-items-center rounded-full border bg-[var(--card-bg)]"><svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.6"><path d="M12 5v14M5 12h14"/></svg></button>
              <span className="ml-auto text-[11px] text-[var(--muted)]">Quantity</span>
            </div>
            <select value={editCat} onChange={e=> setEditCat(e.target.value as any)} className="w-full h-[44px] rounded-[12px] border bg-[var(--card-bg)] px-3 text-[12px]" style={{borderColor:'var(--border)'}}>{CATS.map(c=> <option key={c}>{c}</option>)}</select>

            <button onClick={()=> setShowAdvanced(v=>!v)} className="text-[11px] underline text-[var(--muted)]">{showAdvanced? "Hide advanced":"Advanced • frequency"}</button>
            {showAdvanced && (
              <div className="space-y-2">
                <select value={editFreq} onChange={e=> setEditFreq(e.target.value as any)} className="w-full h-[44px] rounded-[12px] border bg-[var(--card-bg)] px-3 text-[12px]" style={{borderColor:'var(--border)'}}><option value="as-needed">As needed</option><option value="daily">Daily</option><option value="every-2d">Every 2d</option><option value="weekly">Weekly</option><option value="biweekly">Biweekly</option><option value="monthly">Monthly</option></select>
                {(editFreq==="weekly" || editFreq==="biweekly") && (
                  <div className="grid grid-cols-7 gap-1">
                    {["Mo","Tu","We","Th","Fr","Sa","Su"].map((d,i)=> (
                      <button key={d} onClick={()=> { const nxt=[...editNeedDays]; nxt[i]=!nxt[i]; setEditNeedDays(nxt); }} className={"h-[44px] rounded-full border text-[11px] grid place-items-center "+(editNeedDays[i]?"bg-[#0A0A0A] text-white border-[#0A0A0A]":"bg-[var(--card-bg)] border-[var(--border)]")}>{d}</button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <textarea value={editNotes} onChange={e=> setEditNotes(e.target.value)} placeholder="Notes — brand, aisle…" className="w-full rounded-[12px] border bg-[var(--card-bg)] px-3 py-3 text-[12px] min-h-[80px] outline-none focus:border-[#CFC2B6]" style={{borderColor:'var(--border)'}} />

            <div className="flex gap-2">
              <button onClick={saveEdit} className="flex-1 h-[44px] rounded-[16px] bg-[#0A0A0A] text-white text-[13px] font-medium active:scale-[0.98]">Save</button>
              <button onClick={()=> handleArchive(editing.id)} className="h-[44px] rounded-[16px] border bg-[var(--card-bg)] px-4 text-[12px] text-[var(--text-secondary)]">Archive</button>
            </div>

            <div className="pt-2 border-t flex justify-between" style={{borderColor:'var(--border)'}}>
              {confirmDelId===editing.id ? (
                <div className="flex gap-2 w-full">
                  <span className="text-[11px] text-[#991B1B] flex-1 pt-2">Really delete?</span>
                  <button onClick={()=> setConfirmDelId(null)} className="h-[44px] rounded-full border px-4 text-[11px]">Cancel</button>
                  <button onClick={()=> handleDelete(editing.id)} className="h-[44px] rounded-full bg-[#B91C1C] text-white px-4 text-[11px]">Delete</button>
                </div>
              ) : (
                <button onClick={()=> setConfirmDelId(editing.id)} className="text-[11px] text-[#B91C1C] underline">Delete item</button>
              )}
            </div>

          </div>
        )}
      </BottomSheet>
    </div>
  );
}


function PersonalAdd({ onAdd, placeholder }: { onAdd:(v:string)=>void; placeholder?:string }){
  const [v,setV]=useState("");
  return (
    <div className="mt-1.5 flex gap-1.5">
      <input value={v} onChange={e=> setV(e.target.value)} placeholder={placeholder} className="flex-1 rounded-full border bg-[var(--card-bg)] px-2.5 py-1 text-[11px] outline-none" style={{ borderColor:"var(--border)" }} onKeyDown={e=>{ if(e.key==="Enter"){ onAdd(v); setV(""); }}} />
      <button onClick={()=>{ onAdd(v); setV(""); }} className="rounded-full bg-[#0A0A0A] px-3 py-1 text-[11px] text-white">+</button>
    </div>
  );
}

export function ShoppingScreen(props:any){
  return <ShoppingPageFacelift {...props} />;
}
export default ShoppingScreen;
