// Shop — boutique match fridge quality, lifted to mockup
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import type { PersonKey, ShoppingItemV2, ShoppingTrip } from "../../types";
import { uid } from "../../shared/utils/helpers";
import { getSupabase, getEffectiveRowId } from "../../lib/supabase";

function hardPersistShopping(item:any, op:'create'|'update'|'delete'){
  try{
    const hid=getEffectiveRowId(); if(!hid) return;
    const sb=getSupabase(); const id=String(item?.id||''); if(!id) return;
    const payload={...item, household_id:hid, updated_at: item?.updatedAt||item?.updated_at||new Date().toISOString(), created_at: item?.createdAt||item?.created_at||new Date().toISOString()};
    if(op==='delete'){
      (async()=>{ try{ if(sb) await (sb as any).from('shopping_items').delete().eq('id',id);}catch{} try{ const {getQueue,persistQueue}=await import("../../data/offlineQueue"); const q=await getQueue(); const nxt=q.filter((o:any)=>!(o.id===id && o.kind==='shopping')); if(nxt.length!==q.length) await persistQueue(nxt as any);}catch{} })();
      import("../../data/offlineQueue").then(async ({enqueueOp})=>{ try{ await enqueueOp('shopping','delete', id, hid, {id, deleted_at:new Date().toISOString()}); const {getQueue}=await import("../../data/offlineQueue"); const q=await getQueue(); if(q.length){ const {drainOps}=await import("../../data/offlineQueue"); const cli=sb; if(cli) try{ await drainOps(cli as any);}catch{}} }catch{} });
      return;
    }
    (async()=>{ try{ if(sb){ const row:any={id, household_id:hid, data:payload, updated_at:payload.updated_at, created_at:payload.created_at}; if(payload.deletedAt||payload.deleted_at) row.deleted_at=payload.deletedAt||payload.deleted_at; await (sb as any).from('shopping_items').upsert(row,{onConflict:'id'});} }catch{} })();
    import("../../data/offlineQueue").then(async ({enqueueOp})=>{ try{ await enqueueOp('shopping', op, id, hid, payload); const {getQueue}=await import("../../data/offlineQueue"); const q=await getQueue(); if(q.length){ const {drainOps}=await import("../../data/offlineQueue"); const cli=sb; if(cli) try{ await drainOps(cli as any);}catch{} } }catch{} });
  }catch{}
}

type TripDef = { id: ShoppingTrip | "all"; label: string; short: string; hint: string; icon: string; dot: string };
const TRIPS: TripDef[] = [
  { id: "all", label: "Everything", short: "All", hint: "Grouped", icon: "◐", dot: "#CCC3BB" },
  { id: "grocery", label: "Grocery run", short: "Grocery", hint: "Aisles", icon: "🛒", dot: "#FF6B26" },
  { id: "online", label: "Online", short: "Online", hint: "Order later", icon: "↗", dot: "#6B8CAE" },
  { id: "personal", label: "Personal", short: "Personal", hint: "Just mine", icon: "◐", dot: "#5D8A66" },
  { id: "want", label: "Wants / later", short: "Wants", hint: "Nice to have", icon: "✦", dot: "#D8CFC6" },
];

function getItemTrip(it: any): ShoppingTrip {
  if (it?.trip && typeof it.trip === "string") return it.trip as ShoppingTrip;
  const t = (it?.templateKind as string)?.toLowerCase();
  if (t === "personal") return "personal";
  if (t === "wants") return "want";
  const cat = (it?.cat as string)?.toLowerCase();
  if (cat === "personal") return "personal";
  if (cat === "entertainment" || cat === "trips" || cat === "bills") return "online";
  return "grocery";
}

function BottomConfirm({ open, itemLabel, onCancel, onDelete, dontAsk, setDontAsk }: any){
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[85] flex items-end justify-center px-3 pb-[max(16px,env(safe-area-inset-bottom))] animate-[fadeIn_0.18s]">
      <button onClick={onCancel} className="absolute inset-0 bg-[#0F0E10]/28 backdrop-blur-[3px]" aria-label="close sheet" />
      <div className="relative w-full max-w-[400px] rounded-[22px] bg-white border border-[#E8DDD4] shadow-[0_18px_48px_rgba(18,18,20,0.22)] p-5 animate-[sheetIn_0.22s]">
        <div className="text-[10px] uppercase tracking-[0.14em] font-semibold opacity-60">Remove?</div>
        <div className="mt-1.5 text-[16px] font-[650] tracking-[-0.015em]" style={{ fontFamily: "Fraunces, serif" }}>
          Delete “{itemLabel}” ?
        </div>
        <div className="mt-1.5 text-[12.5px] leading-[1.45] opacity-70">Gone from both phones. You can undo for a few seconds.</div>
        <label className="mt-3.5 flex items-center gap-2 text-[11.5px] opacity-70 cursor-pointer select-none">
          <input type="checkbox" checked={!!dontAsk} onChange={e=> setDontAsk(e.target.checked)} className="h-[14px] w-[14px] rounded-[4px]" /> Don’t show this again
        </label>
        <div className="mt-4 flex gap-2.5">
          <button onClick={onCancel} className="flex-1 h-[44px] rounded-full border bg-white text-[13.5px] font-medium active:scale-[0.98]" style={{ borderColor: "#E9DDD4" }}>Keep</button>
          <button onClick={onDelete} className="flex-1 h-[44px] rounded-full bg-[#121214] text-white text-[13.5px] font-semibold active:scale-[0.98]">Delete</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function ShoppingScreen(props: any) {
  const { items: rawItems, setItems, currentUser } = (props || {}) as {
    items: ShoppingItemV2[]; setItems: any; currentUser: PersonKey;
  };
  const items = Array.isArray(rawItems) ? rawItems : [];
  const safeSet = typeof setItems === "function" ? setItems : (() => {}) as any;
  const who = (currentUser || "person_1") as any;

  const [tripFilter, setTripFilter] = useState<ShoppingTrip | "all">("all");
  const [addText, setAddText] = useState("");
  const [addTrip, setAddTrip] = useState<ShoppingTrip>("grocery");
  const [query, setQuery] = useState("");
  const [shopMode, setShopMode] = useState(false);
  const [confirmItem, setConfirmItem] = useState<ShoppingItemV2 | null>(null);
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [skipConfirm, setSkipConfirm] = useState(() => {
    try { return localStorage.getItem("couple_v1_shop_skip_delete_confirm") === "1"; } catch { return false; }
  });
  const [snack, setSnack] = useState<{ id: string; label: string; prev: any } | null>(null);
  const [boughtOpen, setBoughtOpen] = useState(false);
  const snackTimer = useRef<any>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (tripFilter !== "all") setAddTrip(tripFilter as ShoppingTrip); }, [tripFilter]);
  useEffect(() => {
    try { if (dontAskAgain) localStorage.setItem("couple_v1_shop_skip_delete_confirm", "1"); } catch {}
    if (dontAskAgain) setSkipConfirm(true);
  }, [dontAskAgain]);

  const activeAll = useMemo(() => items.filter((a: any) => !a.deletedAt && !a.archivedAt && (a.item || "").trim()), [items]);
  const todo = useMemo(()=> activeAll.filter((a:any)=> !a.purchased), [activeAll]);
  const bought = useMemo(()=> activeAll.filter((a:any)=> a.purchased), [activeAll]);

  const filteredTodo = useMemo(()=> {
    let list = todo;
    if (query.trim()) {
      const q=query.toLowerCase();
      list=list.filter(i=> i.item.toLowerCase().includes(q));
    }
    if (tripFilter !== "all") list=list.filter(i=> getItemTrip(i)===tripFilter);
    return list;
  }, [todo, query, tripFilter]);

  const filteredBought = useMemo(()=> {
    if (tripFilter==="all") return bought;
    return bought.filter(i=> getItemTrip(i)===tripFilter);
  }, [bought, tripFilter]);

  const counts = useMemo(()=> {
    const total = activeAll.length;
    const toBuy = todo.length;
    const boug = bought.length;
    return { total, toBuy, boug };
  }, [activeAll, todo, bought]);

  const progressPct = counts.total ? Math.round((counts.boug / counts.total)*100) : 0;

  const buyAgain = useMemo(()=>{
    // top 6 bought items unique by name
    const seen=new Set<string>(); const out:any[]=[];
    for (const it of [...bought, ...activeAll].reverse()){
      const k=(it.item||"").toLowerCase().trim(); if(!k || seen.has(k)) continue; seen.add(k);
      if (out.length>=6) break;
      if (!todo.find(t=> (t.item||"").toLowerCase()===k)) out.push(it);
    }
    return out.slice(0,3);
  }, [bought, activeAll, todo]);

  useEffect(()=>{
    if (shopMode) document.body.style.overflow="hidden";
    else document.body.style.overflow="";
    return ()=>{ document.body.style.overflow=""; };
  }, [shopMode]);

  function bulkAddFromText(text: string){
    const raw=text.trim(); if(!raw) return;
    const parts = raw.split(/[,\n]+/).map(s=>s.trim()).filter(Boolean).slice(0,12);
    if(!parts.length) return;
    const nowISO=new Date().toISOString();
    const newItems = parts.map(p=> ({
      id: uid("shop"),
      item: p,
      qty:1,
      cat: (addTrip==="personal"? "Personal": addTrip==="online"? "Other": addTrip==="want"? "Entertainment":"Food") as any,
      trip: addTrip,
      purchased:false,
      addedBy: who,
      createdAt: nowISO,
      repeatCount:0,
      frequency:"as-needed" as any,
      updatedAt: nowISO,
      updatedBy: who,
    } as any));
    safeSet((prev:any)=> [...newItems, ...(Array.isArray(prev)? prev: [])]);
    try{ newItems.forEach((ni:any)=> hardPersistShopping(ni,'create')); }catch{}
    setAddText("");
    try{ addInputRef.current?.focus(); }catch{}
  }

  function markBought(it: ShoppingItemV2){
    const nowISO=new Date().toISOString();
    safeSet((prev:any)=> (Array.isArray(prev)? prev: []).map((x:any)=> x.id===it.id? {...x, purchased:true, lastDoneAt:nowISO, updatedAt:nowISO, updatedBy:who, status:"purchased"}:x));
    try{ hardPersistShopping({...it, purchased:true, lastDoneAt:nowISO, updatedAt:nowISO, updatedBy:who, status:"purchased"},'update'); }catch{}
    try{ (navigator as any)?.vibrate?.(10); }catch{}
  }
  function markNeed(it: ShoppingItemV2){
    const nowISO=new Date().toISOString();
    safeSet((prev:any)=> (Array.isArray(prev)? prev: []).map((x:any)=> x.id===it.id? {...x, purchased:false, updatedAt:nowISO, updatedBy:who, status:"active"}:x));
    try{ hardPersistShopping({...it, purchased:false, updatedAt:nowISO, updatedBy:who, status:"active"},'update'); }catch{}
  }
  function requestDelete(it: ShoppingItemV2){ if(skipConfirm) doDelete(it); else setConfirmItem(it); }
  function doDelete(it: ShoppingItemV2){
    const nowISO=new Date().toISOString();
    setSnack({ id: it.id, label: it.item, prev: {...it} });
    if(snackTimer.current) clearTimeout(snackTimer.current);
    snackTimer.current=setTimeout(()=> setSnack(null), 4200);
    safeSet((prev:any)=> {
      const arr=Array.isArray(prev)? prev: [];
      return arr.map((x:any)=> x.id===it.id? {...x, deletedAt:nowISO, archivedAt:nowISO, status:"deleted", updatedAt:nowISO, updatedBy:who}:x).filter((x:any)=> !x.deletedAt);
    });
    try{ hardPersistShopping({id:it.id, deletedAt:nowISO, updatedAt:nowISO}, 'delete'); }catch{}
    setConfirmItem(null);
  }
  function handleUndo(){
    if(!snack) return; const prev=snack.prev; if(!prev){ setSnack(null); return; }
    const nowISO=new Date().toISOString();
    safeSet((p:any)=> {
      const arr=Array.isArray(p)? p: [];
      if(!arr.find((x:any)=> x.id===prev.id)) return [{...prev, deletedAt:undefined, archivedAt:undefined, purchased:true, updatedAt:nowISO}, ...arr];
      return arr.map((x:any)=> x.id===prev.id? {...prev, deletedAt:undefined, archivedAt:undefined, updatedAt:nowISO}:x);
    });
    setSnack(null); if(snackTimer.current) clearTimeout(snackTimer.current);
  }

  const nextRunLabel = tripFilter==="all" ? "Grocery run" : TRIPS.find(t=> t.id===tripFilter)?.label || "Grocery run";

  return (
    <div className="w-full min-h-[100vh] bg-[#FFFBF8] pb-[128px]" style={{ fontFamily: "Inter, Instrument Sans, ui-sans" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Instrument+Sans:wght@400;500;600&display=swap');
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes sheetIn{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}
      `}</style>

      {/* NEXT RUN card */}
      <div className="w-full px-4 pt-5 max-w-[560px] mx-auto">
        <div className="relative overflow-hidden rounded-[22px] px-5 pt-4 pb-4 border border-[#F4D8BF]/60" style={{ background:"linear-gradient(180deg,#FFE8D3 0%,#FFF1E5 100%)", boxShadow:"0 6px 24px rgba(0,0,0,0.05)" }}>
          {/* subtle wave */}
          <svg className="pointer-events-none absolute inset-0 w-full h-full opacity-60" viewBox="0 0 400 150" preserveAspectRatio="none"><path d="M 220 0 Q 260 40 220 80 T 220 160" stroke="#FFD4B8" strokeWidth="1.2" fill="none" opacity="0.6"/><path d="M 250 0 Q 290 45 250 85 T 250 160" stroke="#FFD4B8" strokeWidth="1" fill="none" opacity="0.4"/></svg>
          <div className="relative flex gap-4">
            <div className="flex-1 min-w-0">
              <div className="text-[11.5px] tracking-[0.16em] font-semibold text-[#E05A1F]/90 uppercase">Next run</div>
              <div className="mt-1 text-[28px] leading-[0.95] font-[700] text-[#1A1210]" style={{ fontFamily: "Fraunces, serif" }}>{nextRunLabel}</div>
              <div className="mt-2 flex items-center gap-2 text-[13px] text-[#2B1F1C]"><span className="font-medium">{counts.toBuy} to buy</span><span className="h-[4px] w-[4px] rounded-full bg-[#FF6B26] inline-block" /> <span className="opacity-80">{counts.boug} bought</span><span className="h-[4px] w-[4px] rounded-full bg-[#FF6B26] inline-block" /> <span className="opacity-70">{counts.total} total</span></div>
              <div className="mt-3 h-[8px] rounded-full bg-[#FFDCC3] w-full max-w-[300px] overflow-hidden"><div className="h-full rounded-full bg-[#FF6B26] transition-all" style={{ width: `${(counts.total? (counts.boug/counts.total)*100: 0)}%` }} /></div>
              <div className="mt-2.5 text-[12.5px] text-[#5A4D46]">{counts.toBuy>0 ? `${counts.toBuy} to go — let's knock it out.` : `All done — nice run.`}</div>
            </div>
            <div className="shrink-0 self-center">
              <button onClick={()=> setShopMode(true)} className="grid place-items-center rounded-[18px] bg-white border border-[#F0D6BF] px-4 pt-3 pb-3 shadow-[0_6px_18px_rgba(0,0,0,0.08)] w-[122px] active:scale-[0.98]">
                <div className="grid h-[44px] w-[44px] place-items-center rounded-full border border-[#F3D6BE] bg-[#FFFBF6]"><span className="text-[18px]">👜</span></div>
                <div className="mt-2 text-[13.5px] font-semibold text-[#2A1F1C]" style={{ fontFamily: "Instrument Sans" }}>Shop mode</div>
                <div className="text-[11.5px] text-[#E05A1F]">{counts.toBuy} left</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* add bar */}
      <div className="w-full px-4 pt-4 max-w-[560px] mx-auto">
        <div className="flex items-center gap-0 rounded-[18px] border bg-white px-2 h-[56px] shadow-[0_2px_10px_rgba(0,0,0,0.04)]" style={{ borderColor:"#E8DDD4" }}>
          <input ref={addInputRef} value={addText} onChange={e=> setAddText(e.target.value)} onKeyDown={e=> { if(e.key==='Enter'){ e.preventDefault(); if(addText.trim()) bulkAddFromText(addText); }}} placeholder="Add milk, eggs, sourdough..." className="flex-1 bg-transparent px-3 text-[14.5px] placeholder:text-[#9A8F89] outline-none" style={{ fontFamily:"Instrument Sans"}} />
          <div className="h-[28px] w-[1px] bg-[#EEE4DD] mx-1" />
          <select value={addTrip} onChange={e=> setAddTrip(e.target.value as any)} className="h-[36px] rounded-full border bg-[#FFFBF7] px-3 pr-7 text-[12.5px] font-medium appearance-none" style={{ borderColor:"#E9DDD4" }}>
            <option value="grocery">Grocery</option><option value="online">Online</option><option value="personal">Personal</option><option value="want">Wants</option>
          </select>
          <button onClick={()=> { if(addText.trim()) bulkAddFromText(addText); }} className="ml-2 grid h-[42px] w-[42px] place-items-center rounded-full bg-[#FF6B26] text-white text-[20px] active:scale-[0.96]">+</button>
        </div>
      </div>

      {/* filters */}
      <div className="w-full max-w-[560px] mx-auto px-4 pt-3.5">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {TRIPS.map(t=>{
            const activeChip = tripFilter===t.id;
            return (
              <button key={t.id} onClick={()=> setTripFilter(t.id)} className={"shrink-0 h-[34px] inline-flex items-center gap-2 rounded-full border px-3 text-[12.5px] font-medium "+(activeChip?"bg-[#121214] text-white border-[#121214]":"bg-white text-[#2B1F1C]")} style={{ borderColor: activeChip? "#121214":"#E8DDD4" }}>
                <span className="grid h-[10px] w-[10px] place-items-center rounded-full" style={{ background: activeChip? (t.id==="all"?"#E8D0BB": t.dot) : t.dot }} />
                {t.short}
              </button>
            );
          })}
        </div>
      </div>

      {/* To buy */}
      <div className="w-full max-w-[560px] mx-auto px-4 pt-3">
        <div className="flex items-center justify-between px-0.5 pb-2">
          <div className="text-[18px] font-[650] tracking-[-0.01em] text-[#1E1714]" style={{ fontFamily:"Fraunces, serif"}}>To buy</div>
          <span className="grid h-[22px] min-w-[22px] place-items-center rounded-full bg-[#EFE8E2] px-2 text-[11px] font-medium">{filteredTodo.length}</span>
        </div>
        <div className="grid gap-2.5">
          {filteredTodo.length===0 ? (
            <div className="rounded-[16px] border border-dashed bg-white px-5 py-8 text-center text-[12.5px] text-[#8A7E77]" style={{ borderColor:"#E8DDD4"}}>Nothing to buy{ tripFilter!=="all" ? ` in ${tripFilter}`: ""} — add above</div>
          ) : filteredTodo.slice(0,30).map((it:any)=> (
            <div key={it.id} className="flex items-center gap-3 rounded-[14px] border bg-white px-3 py-3" style={{ borderColor:"#E9DDD4", boxShadow:"0 2px 8px rgba(0,0,0,0.03)"}}>
              <button onClick={()=> markBought(it)} className="grid h-[32px] w-[32px] place-items-center rounded-full border bg-white shrink-0 active:scale-[0.96]" style={{ borderColor:"#E0D6D1"}}>
                <span className="h-[18px] w-[18px] rounded-full border border-[#D9CFC8] grid place-items-center bg-white" />
              </button>
              <button onClick={()=> markBought(it)} className="flex-1 text-left min-w-0">
                <div className="text-[15.5px] font-[600] tracking-[-0.01em] text-[#1E1714] truncate" style={{ fontFamily:"Fraunces, serif"}}>{it.item}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-[#8B7E77]"><span className="h-[5px] w-[5px] rounded-full inline-block" style={{ background: TRIPS.find(t=> t.id===getItemTrip(it))?.dot || "#FF6B26"}}/> {getItemTrip(it)==="grocery"?"Grocery": getItemTrip(it)}</div>
              </button>
              <button onClick={()=> requestDelete(it)} className="grid h-[32px] w-[32px] place-items-center rounded-full text-[#9A8F89] text-[14px]">⋯</button>
            </div>
          ))}
        </div>
      </div>

      {/* Buy again */}
      {buyAgain.length>0 && (
        <div className="w-full max-w-[560px] mx-auto px-4 pt-5">
          <div className="flex items-center justify-between pb-2">
            <div className="text-[16px] font-[600] text-[#1E1714]" style={{ fontFamily:"Fraunces, serif"}}>Buy again</div>
            <button onClick={()=> setBoughtOpen(o=>!o)} className="text-[12px] text-[#E05A1F] font-medium">{boughtOpen? "Hide" : "See all"}</button>
          </div>
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
            {buyAgain.map((it:any)=> {
              const icon = (it.item||"").toLowerCase().includes("milk") ? "🥛" : (it.item||"").toLowerCase().includes("egg") ? "🥚" : (it.item||"").toLowerCase().includes("bread") ? "🍞" : "🧺";
              const bg = icon==="🥛" ? "#FDE9DD" : icon==="🥚" ? "#E6EDE1" : "#F8E4D4";
              return (
                <div key={it.id+"buyagain"} className="shrink-0 flex items-center gap-2 rounded-[14px] border bg-white px-2.5 py-2 pr-2" style={{ borderColor:"#E9DDD4"}}>
                  <div className="grid h-[38px] w-[38px] place-items-center rounded-full" style={{ background:bg }}>{icon}</div>
                  <div className="text-[13px] font-medium text-[#2A1F1C] min-w-[64px] max-w-[92px] truncate">{it.item}</div>
                  <button onClick={()=> { const nid={...it, id: uid("shop"), purchased:false, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString()}; safeSet((p:any)=> [nid, ...(Array.isArray(p)?p:[])]); try{ hardPersistShopping(nid,'create'); }catch{} }} className="grid h-[28px] w-[28px] place-items-center rounded-full border bg-white text-[14px]" style={{ borderColor:"#E8DDD4"}}>+</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bought accordion */}
      <div className="w-full max-w-[560px] mx-auto px-4 pt-4">
        <button onClick={()=> setBoughtOpen(o=> !o)} className="w-full flex items-center justify-between rounded-[14px] border bg-[#EEEEE8] px-4 py-3 text-left" style={{ borderColor:"#E3DDD6"}}>
          <div className="flex items-center gap-3">
            <span className="grid h-[32px] w-[32px] place-items-center rounded-full bg-[#6E8D73] text-white">✓</span>
            <div>
              <div className="text-[14.5px] font-semibold text-[#2A1F1C]" style={{ fontFamily:"Fraunces, serif"}}>Bought</div>
              <div className="text-[11.5px] text-[#7A706A]">{filteredBought.length} bought this run</div>
            </div>
          </div>
          <span className={"text-[#7A706A] transition-transform "+(boughtOpen? "rotate-180":"")}>▼</span>
        </button>
        {boughtOpen && (
          <div className="mt-2 grid gap-2">
            {filteredBought.slice(0,30).map((it:any)=> (
              <div key={it.id} className="flex items-center gap-3 rounded-[12px] border bg-white/80 px-3 py-2.5 opacity-70" style={{ borderColor:"#E6DDD7"}}>
                <button onClick={()=> markNeed(it)} className="grid h-[28px] w-[28px] place-items-center rounded-full bg-[#6E8D73] text-white text-[12px]">✓</button>
                <div className="flex-1 min-w-0 line-through decoration-[#8BA888]/60 text-[13.5px] text-[#6B5D55] truncate">{it.item}</div>
                <button onClick={()=> requestDelete(it)} className="text-[11px] opacity-50">↩</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shop Mode */}
      {shopMode && createPortal(
        <div className="fixed inset-0 z-[80] bg-[#FFFBF8]">
          <div className="w-full max-w-[560px] mx-auto px-5 pt-8 pb-6">
            <div className="flex items-center justify-between">
              <div className="text-[22px] font-[700]" style={{ fontFamily:"Fraunces, serif"}}>Shop mode</div>
              <button onClick={()=> setShopMode(false)} className="grid h-[36px] w-[36px] place-items-center rounded-full border bg-white" style={{ borderColor:"#E8DDD4"}}>✕</button>
            </div>
            <div className="mt-2 text-[12.5px] opacity-70">{filteredTodo.length} left • tap to tick</div>
            <div className="mt-5 grid gap-2">
              {filteredTodo.map((it:any)=> (
                <button key={it.id+"shopmode"} onClick={()=> markBought(it)} className="w-full text-left rounded-[12px] border bg-white px-4 py-3 flex items-center gap-3" style={{ borderColor:"#E8DDD4"}}>
                  <span className="grid h-[26px] w-[26px] place-items-center rounded-full border bg-white" style={{ borderColor:"#D9CFC8"}}>○</span>
                  <span className="text-[14.5px] font-medium">{it.item}</span>
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      <BottomConfirm open={!!confirmItem} itemLabel={(confirmItem as any)?.item || ""} onCancel={()=> setConfirmItem(null)} onDelete={()=> confirmItem && doDelete(confirmItem as any)} dontAsk={dontAskAgain} setDontAsk={setDontAskAgain} />

      {snack && (
        <div className="fixed bottom-[88px] left-1/2 -translate-x-1/2 z-[86] flex items-center gap-2 rounded-full bg-[#121214] text-white px-4 py-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.28)]">
          <span className="text-[12.5px]">Deleted {snack.label}</span>
          <button onClick={handleUndo} className="ml-1 h-[30px] rounded-full bg-white text-[#121214] px-3 text-[11.5px] font-semibold">Undo</button>
        </div>
      )}
    </div>
  );
}

export default ShoppingScreen;
