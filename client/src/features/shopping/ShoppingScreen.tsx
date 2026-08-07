// V159 facelift — warm plaster + charcoal Hume, swipe+tap, Shop Mode, bulk comma, server-wins trip field
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import type { PersonKey, ShoppingItemV2, ShoppingTrip } from "../../types";
import { uid } from "../../shared/utils/helpers";

type TripDef = { id: ShoppingTrip | "all"; label: string; short: string; hint: string; icon: string; dot: string };
const TRIPS: TripDef[] = [
  { id: "all", label: "Everything", short: "All", hint: "Grouped", icon: "◐", dot: "var(--border)" },
  { id: "grocery", label: "Next grocery run", short: "Grocery", hint: "Aisles", icon: "🛒", dot: "#FF6B26" },
  { id: "online", label: "Online", short: "Online", hint: "Order later", icon: "↗", dot: "#6B8CAE" },
  { id: "personal", label: "Personal", short: "Personal", hint: "Just mine", icon: "◐", dot: "#B8A08A" },
  { id: "want", label: "Wants / later", short: "Wants", hint: "Nice to have", icon: "✦", dot: "#8BA888" },
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

// ——— swipe hook ———
function useSwipeRow(disabled: boolean, onRight: () => void, onLeft: () => void) {
  const startX = useRef<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  const down = useCallback((e: React.PointerEvent) => {
    if (disabled) return;
    try { (e.target as Element).setPointerCapture(e.pointerId); } catch {}
    startX.current = e.clientX;
    setDragging(true);
  }, [disabled]);

  const move = useCallback((e: React.PointerEvent) => {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    setOffset(Math.max(-140, Math.min(140, dx)));
  }, []);

  const up = useCallback((e: React.PointerEvent) => {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    setDragging(false);
    if (dx > 64) onRight();
    else if (dx < -64) onLeft();
    setOffset(0);
    try { (e.target as Element).releasePointerCapture(e.pointerId); } catch {}
  }, [onLeft, onRight]);

  return { offset, dragging, handlers: { onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerCancel: () => { startX.current = null; setDragging(false); setOffset(0); } } };
}

function BottomConfirm({ open, itemLabel, onCancel, onDelete, dontAsk, setDontAsk }: any) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[85] flex items-end justify-center px-3 pb-[max(16px,env(safe-area-inset-bottom))] animate-[fadeIn_0.18s]">
      <button onClick={onCancel} className="absolute inset-0 bg-[#0F0E10]/28 backdrop-blur-[3px]" aria-label="close sheet" />
      <div className="relative w-full max-w-[400px] rounded-[22px] bg-[var(--card-bg,#FEFEFD)] border border-[var(--border,#E8DDD4)] shadow-[0_18px_48px_rgba(18,18,20,0.22)] p-5 animate-[sheetIn_0.22s]">
        <div className="text-[10px] uppercase tracking-[0.14em] font-semibold opacity-60">Remove?</div>
        <div className="mt-1.5 text-[16px] font-[650] tracking-[-0.015em]" style={{ fontFamily: "Fraunces, serif" }}>
          Delete “{itemLabel}”?
        </div>
        <div className="mt-1.5 text-[12.5px] leading-[1.45] opacity-70">Gone from both phones. You can undo for a few seconds.</div>
        <label className="mt-3.5 flex items-center gap-2 text-[11.5px] opacity-70 cursor-pointer select-none">
          <input type="checkbox" checked={!!dontAsk} onChange={e=> setDontAsk(e.target.checked)} className="h-[14px] w-[14px] rounded-[4px]" /> Don’t show this again
        </label>
        <div className="mt-4 flex gap-2.5">
          <button onClick={onCancel} className="flex-1 h-[44px] rounded-full border bg-[var(--card-bg,#FEFEFD)] text-[13.5px] font-medium active:scale-[0.98]" style={{ borderColor: "var(--border,#E8DDD4)" }}>Keep</button>
          <button onClick={onDelete} className="flex-1 h-[44px] rounded-full bg-[#121214] text-white text-[13.5px] font-semibold active:scale-[0.98]">Delete</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function UndoToast({ snack, onUndo, onDismiss }: any) {
  if (!snack) return null;
  return createPortal(
    <div className="fixed bottom-[92px] left-1/2 -translate-x-1/2 z-[86] w-[calc(100%-24px)] max-w-[400px] rounded-full bg-[#121214] text-white px-4 py-2.5 flex items-center justify-between shadow-[0_10px_28px_rgba(0,0,0,0.22)] animate-[sheetIn_0.2s]">
      <span className="text-[12.5px] truncate pr-3 tracking-wide">{snack.label} deleted</span>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={onUndo} className="h-[32px] rounded-full bg-white text-[#121214] px-3.5 text-[11.5px] font-semibold">Undo</button>
        <button onClick={onDismiss} className="grid h-[28px] w-[28px] place-items-center rounded-full bg-white/10 text-[10px]">✕</button>
      </div>
    </div>,
    document.body
  );
}

function TripPill({ active, def, count, onClick }: { active?: boolean; def: TripDef; count?: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={
        "h-[36px] whitespace-nowrap rounded-full border px-3.5 text-[12.5px] font-[500] tracking-wide transition flex items-center gap-1.5 active:scale-[0.97] " +
        (active ? "bg-[#121214] text-white border-[#121214] shadow-[0_2px_10px_rgba(0,0,0,0.12)]" : "bg-[var(--card-bg,#FEFEFD)] text-[var(--text,#1E1C1A)] border-[var(--border,#E9DDD4)] hover:border-[#D9CFC6]")
      }
      style={{ fontFamily: "Inter, ui-sans" }}
      aria-label={`${def.label} — ${count ?? 0}`}
    >
      <span className="text-[10px] grid h-[14px] w-[14px] place-items-center rounded-full" style={{ background: active ? "rgba(255,255,255,0.16)" : def.dot, color: active ? "white" : "white" }}>{def.id==="all" ? "" : ""}</span>
      <span>{def.short}</span>
      {typeof count==="number" && <span className={"ml-0.5 text-[11px] "+(active ? "opacity-70":"opacity-50")}>{count}</span>}
    </button>
  );
}

function RowCard({ it, onTap, onSwipeRight, onSwipeLeft }: { it: ShoppingItemV2; onTap: () => void; onSwipeRight: () => void; onSwipeLeft: () => void; }) {
  const isBought = !!it.purchased;
  const { offset, dragging, handlers } = useSwipeRow(false, onSwipeRight, onSwipeLeft);
  const trip = getItemTrip(it);
  const def = TRIPS.find(t=>t.id===trip);
  const dot = def?.dot || "#FF6B26";

  // ignore click if dragged far
  const handleClick = () => {
    if (Math.abs(offset) > 8) return;
    onTap();
  };

  return (
    <div className="relative select-none touch-pan-y">
      {/* swipe background */}
      <div className="absolute inset-0 flex items-center justify-between px-4 rounded-[18px] overflow-hidden">
        <div className={"flex items-center gap-2 transition-opacity duration-150 " + (offset>18 ? "opacity-100":"opacity-0")}>
          <div className="w-8 h-8 rounded-full bg-[#8BA888] grid place-items-center text-white text-[13px]">✓</div>
          <span className="text-[11px] font-semibold tracking-widest uppercase text-[#8BA888]">Bought</span>
        </div>
        <div className={"flex items-center gap-2 ml-auto transition-opacity duration-150 " + (offset<-18 ? "opacity-100":"opacity-0")}>
          <span className="text-[11px] font-semibold tracking-widest uppercase text-[#D14B3A]">{isBought ? "Delete":"Remove"}</span>
          <div className="w-8 h-8 rounded-full bg-[#D14B3A] grid place-items-center text-white text-[12px]">✕</div>
        </div>
      </div>

      <button
        onClick={handleClick}
        {...(handlers as any)}
        className={
          "relative w-full text-left flex items-center gap-3.5 px-3.5 min-h-[60px] rounded-[18px] border bg-[var(--card-bg,#FEFEFD)] transition-[transform,box-shadow,opacity] will-change-transform " +
          (dragging ? "duration-0 shadow-[0_2px_14px_rgba(0,0,0,0.06)] " : "duration-200 ") +
          (isBought ? "opacity-[0.60] " : "")
        }
        style={{
          transform: `translateX(${offset}px)`,
          borderColor: "var(--border,#E9DDD4)",
          // subtle plaster paper: inset highlight + soft edge
          boxShadow: isBought ? "none" : "inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 8px rgba(0,0,0,0.03)",
          fontFamily: "Instrument Sans, Inter, ui-sans",
        }}
        aria-label={`${it.item} — ${isBought ? "bought, tap to delete" : "need, tap to mark bought"}`}
      >
        {/* trip dot + check */}
        <span className="grid h-[32px] w-[32px] place-items-center rounded-full shrink-0 border bg-white/80" style={{ borderColor: "var(--border,#E9DDD4)" }}>
          {isBought ? (
            <span className="grid h-[20px] w-[20px] place-items-center rounded-full bg-[#8BA888] text-white text-[11px]">✓</span>
          ) : (
            <span className="h-[8px] w-[8px] rounded-full" style={{ background: dot }} />
          )}
        </span>

        <span className="flex-1 min-w-0 flex flex-col">
          <span className={"block text-[14.8px] leading-[1.3] truncate tracking-[-0.01em] " + (isBought ? "line-through decoration-[1.5px] decoration-[#8BA888]/50 text-[var(--muted,rgba(0,0,0,0.55))]" : "text-[var(--text,#1E1C1A)]")} style={{ fontFamily: "Fraunces, serif", fontWeight: 500 }}>
            {it.item}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] tracking-wide">
            <span className={"inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold tracking-wide border " + (isBought ? "bg-[#E8EDE4] text-[#6B8C6B] border-transparent" : "bg-[#FDF8F3] text-[#9A8F89] border-[var(--border,#E9DDD4)]")}>
              {isBought ? "bought" : trip}
            </span>
            {!isBought && <span className="text-[10.5px] opacity-50 hidden sm:inline">tap → bought • swipe → same</span>}
          </span>
        </span>

        <span className="text-[10px] opacity-40 shrink-0">
          {isBought ? "↩" : "○"}
        </span>
      </button>
    </div>
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
  const snackTimer = useRef<any>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (tripFilter !== "all") setAddTrip(tripFilter as ShoppingTrip); }, [tripFilter]);

  useEffect(() => {
    try { if (dontAskAgain) localStorage.setItem("couple_v1_shop_skip_delete_confirm", "1"); } catch {}
    if (dontAskAgain) setSkipConfirm(true);
  }, [dontAskAgain]);

  const activeAll = useMemo(() => items.filter((a: any) => !a.deletedAt && !a.archivedAt && (a.item || "").trim()), [items]);

  const filtered = useMemo(() => {
    let list = activeAll;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(i => i.item.toLowerCase().includes(q));
    }
    if (tripFilter !== "all") list = list.filter(i => getItemTrip(i) === tripFilter);
    return list;
  }, [activeAll, query, tripFilter]);

  const todo = useMemo(() => filtered.filter(s => !s.purchased), [filtered]);
  const bought = useMemo(() => filtered.filter(s => !!s.purchased), [filtered]);

  const grouped = useMemo(() => {
    if (tripFilter !== "all") {
      return [{ trip: tripFilter as ShoppingTrip, def: TRIPS.find(t => t.id === tripFilter)!, items: todo }];
    }
    const map = new Map<ShoppingTrip, ShoppingItemV2[]>();
    for (const it of todo) {
      const tr = getItemTrip(it);
      if (!map.has(tr)) map.set(tr, []);
      map.get(tr)!.push(it);
    }
    const order: ShoppingTrip[] = ["grocery", "online", "personal", "want"];
    const out: { trip: ShoppingTrip; def: TripDef; items: ShoppingItemV2[] }[] = [];
    for (const k of order) if (map.has(k)) out.push({ trip: k, def: TRIPS.find(t => t.id === k)!, items: map.get(k)! });
    for (const kv of Array.from(map.entries())) {
      const k = kv[0] as ShoppingTrip; const v = kv[1];
      if (!(order as any).includes(k)) out.push({ trip: k, def: { id: k, label: k, short: k, hint: "", icon: "•", dot: "#D9CFC6" } as any, items: v });
    }
    return out;
  }, [todo, tripFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: activeAll.filter(i => !i.purchased).length };
    for (const t of ["grocery", "online", "personal", "want"] as ShoppingTrip[]) c[t] = activeAll.filter(i => !i.purchased && getItemTrip(i) === t).length;
    return c;
  }, [activeAll]);

  // shop mode lock body scroll
  useEffect(() => {
    if (shopMode) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [shopMode]);

  function bulkAddFromText(text: string) {
    const raw = text.trim();
    if (!raw) return;
    // split on comma or newline — ignore empties, limit 12 to avoid spam
    const parts = raw.split(/[,\\n]+/).map(s => s.trim()).filter(Boolean).slice(0, 12);
    if (parts.length === 0) return;
    const nowISO = new Date().toISOString();
    const newItems = parts.map(p => ({
      id: uid("shop"),
      item: p,
      qty: 1,
      cat: (addTrip === "personal" ? "Personal" : addTrip === "online" ? "Other" : addTrip === "want" ? "Entertainment" : "Food") as any,
      trip: addTrip,
      purchased: false,
      addedBy: who,
      createdAt: nowISO,
      repeatCount: 0,
      frequency: "as-needed" as any,
      updatedAt: nowISO,
      updatedBy: who,
    } as any));
    safeSet((prev: any) => [...newItems, ...(Array.isArray(prev) ? prev : [])]);
    setAddText("");
    try { addInputRef.current?.focus(); } catch {}
  }

  function addItem() { bulkAddFromText(addText); }

  function markBought(it: ShoppingItemV2) {
    const nowISO = new Date().toISOString();
    safeSet((prev: any) =>
      (Array.isArray(prev) ? prev : []).map((x: any) => x.id === it.id ? { ...x, purchased: true, lastDoneAt: nowISO, updatedAt: nowISO, updatedBy: who, status: "purchased" } : x)
    );
    try { (navigator as any)?.vibrate?.(10); } catch {}
  }

  function markNeed(it: ShoppingItemV2) {
    const nowISO = new Date().toISOString();
    safeSet((prev: any) =>
      (Array.isArray(prev) ? prev : []).map((x: any) => x.id === it.id ? { ...x, purchased: false, updatedAt: nowISO, updatedBy: who, status: "active" } : x)
    );
  }

  function requestDelete(it: ShoppingItemV2) {
    if (skipConfirm) doDelete(it);
    else setConfirmItem(it);
  }

  function doDelete(it: ShoppingItemV2) {
    const nowISO = new Date().toISOString();
    setSnack({ id: it.id, label: it.item, prev: { ...it } });
    if (snackTimer.current) clearTimeout(snackTimer.current);
    snackTimer.current = setTimeout(() => setSnack(null), 4200);
    // tombstone for server-wins sync — keep deletedAt for mergeById, but hide from UI immediately
    safeSet((prev: any) => {
      const arr = Array.isArray(prev) ? prev : [];
      return arr.map((x: any) => x.id === it.id ? { ...x, deletedAt: nowISO, archivedAt: nowISO, status: "deleted", updatedAt: nowISO, updatedBy: who } : x).filter((x: any) => !x.deletedAt);
    });
    setConfirmItem(null);
  }

  function handleUndo() {
    if (!snack) return;
    const prev = snack.prev;
    if (!prev) { setSnack(null); return; }
    const nowISO = new Date().toISOString();
    safeSet((p: any) => {
      const arr = Array.isArray(p) ? p : [];
      if (!arr.find((x: any) => x.id === prev.id)) return [{ ...prev, deletedAt: undefined, archivedAt: undefined, purchased: true, updatedAt: nowISO }, ...arr];
      return arr.map((x: any) => x.id === prev.id ? { ...prev, deletedAt: undefined, archivedAt: undefined, updatedAt: nowISO } : x);
    });
    setSnack(null);
    if (snackTimer.current) clearTimeout(snackTimer.current);
  }

  const handleRowTap = useCallback((it: ShoppingItemV2) => {
    if (!it.purchased) markBought(it);
    else requestDelete(it);
  }, [skipConfirm]);

  const handleSwipeRight = useCallback((it: ShoppingItemV2) => {
    if (!it.purchased) markBought(it);
    else markNeed(it);
  }, []);

  const handleSwipeLeft = useCallback((it: ShoppingItemV2) => {
    requestDelete(it);
  }, [skipConfirm]);

  return (
    <div className="w-full min-h-[100vh] bg-[var(--wash-top,#FEF9F0)] pb-[128px]" style={{ fontFamily: "Inter, Instrument Sans, ui-sans" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Instrument+Sans:wght@400;500;600&display=swap');
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes sheetIn{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}
      `}</style>

      {/* ——— header ——— */}
      <div className="w-full px-4 pt-5 pb-3 max-w-[560px] mx-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold opacity-60" style={{ fontFamily: "Inter, ui-sans" }}>Shop · boutique</div>
            <h1 className="mt-1 text-[28px] leading-[0.92] tracking-[-0.02em] font-[700]" style={{ fontFamily: "Fraunces, serif" }}>
              What we need
            </h1>
            <div className="mt-1.5 flex items-center gap-2 text-[11.5px] opacity-65 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-[var(--card-bg,#FEFEFD)] px-2.5 py-1" style={{ borderColor: "var(--border,#E9DDD4)" }}>
                <span className="h-[6px] w-[6px] rounded-full bg-[#FF6B26]" /> {counts.all} to get
              </span>
              <span className="opacity-50">tap = bought • swipe too</span>
            </div>
          </div>

          <button
            onClick={() => setShopMode(true)}
            className="shrink-0 h-[42px] px-4 rounded-full bg-[#121214] text-white text-[12.5px] font-semibold tracking-wide flex items-center gap-2 active:scale-[0.97] shadow-[0_6px_20px_rgba(18,18,20,0.16)]"
            aria-label="Open Shop Mode focused list"
          >
            <span className="w-[16px] h-[16px] rounded-full border border-white/20 grid place-items-center text-[9px]">◐</span>
            Shop
          </button>
        </div>

        {/* add — bulk comma */}
        <div className="mt-4 rounded-[20px] border bg-[var(--card-bg,#FEFEFD)] p-2 flex items-center gap-2 shadow-[0_4px_14px_rgba(0,0,0,0.03)]" style={{ borderColor: "var(--border,#E9DDD4)" }}>
          <input
            ref={addInputRef}
            value={addText}
            onChange={e => setAddText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}
            placeholder={`Add ${addTrip === "grocery" ? "milk, eggs, sourdough…" : addTrip === "online" ? "something to order…" : addTrip === "personal" ? "just for me…" : "a want…"} — comma for bulk`}
            className="flex-1 h-[44px] rounded-full bg-transparent px-3 text-[14px] outline-none placeholder:opacity-60"
            enterKeyHint="done"
          />
          <select
            value={addTrip}
            onChange={e => setAddTrip(e.target.value as ShoppingTrip)}
            className="h-[36px] rounded-full border bg-[#FDF8F3] px-2.5 text-[11px] font-medium outline-none"
            style={{ borderColor: "var(--border,#E9DDD4)" }}
          >
            <option value="grocery">Grocery</option>
            <option value="online">Online</option>
            <option value="personal">Personal</option>
            <option value="want">Wants</option>
          </select>
          <button
            onClick={addItem}
            disabled={!addText.trim()}
            className="h-[40px] w-[40px] grid place-items-center rounded-full bg-[#121214] text-white text-[16px] disabled:opacity-30 active:scale-[0.94] transition"
            aria-label="Add"
          >
            +
          </button>
        </div>

        {/* search */}
        <div className="mt-2.5 flex items-center gap-2">
          <div className="relative flex-1">
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find in list…" className="w-full h-[36px] rounded-full border bg-[var(--card-bg,#FEFEFD)] pl-3 pr-8 text-[12.5px] outline-none" style={{ borderColor: "var(--border,#E9DDD4)" }} />
            {query && <button onClick={() => setQuery("")} className="absolute right-1 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-full bg-[#FDF8F3] text-[10px]">✕</button>}
          </div>
          <span className="text-[11px] opacity-50">{filtered.length} showing</span>
        </div>

        {/* trip pills */}
        <div className="mt-3.5 flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {TRIPS.map(t => (
            <TripPill key={t.id} def={t} count={(counts as any)[t.id] ?? (t.id==="all"?counts.all:0)} active={tripFilter === t.id} onClick={() => setTripFilter(t.id as any)} />
          ))}
        </div>
      </div>

      {/* ——— list ——— */}
      <div className="px-3 max-w-[560px] mx-auto space-y-6">
        {todo.length === 0 && bought.length === 0 && (
          <div className="rounded-[22px] border border-dashed bg-[var(--card-bg,#FEFEFD)]/80 px-6 py-12 text-center backdrop-blur-[1px]" style={{ borderColor: "var(--border,#E9DDD4)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)" }}>
            <div className="mx-auto w-[52px] h-[52px] rounded-full bg-[#FDF8F3] border border-dashed grid place-items-center text-[18px] mb-3" style={{ borderColor: "#E9DDD4" }}>○</div>
            <div className="text-[15px] font-[600]" style={{ fontFamily: "Fraunces, serif" }}>Nothing here</div>
            <div className="mt-1 text-[12.5px] opacity-60 max-w-[260px] mx-auto">Add milk, bread, that cable — try “oat milk, eggs, tomatoes” with commas to add at once.</div>
            <div className="mt-4 flex justify-center gap-2 text-[10.5px] tracking-wide opacity-60 flex-wrap">
              <span className="px-2.5 py-1 rounded-full bg-[#FDF8F3] border">Tap → Bought</span>
              <span className="px-2.5 py-1 rounded-full bg-[#FDF8F3] border">Tap again → Delete</span>
              <span className="px-2.5 py-1 rounded-full bg-[#FDF8F3] border">Swipe → same</span>
            </div>
          </div>
        )}

        {grouped.map(g => (
          <div key={g.trip} className="space-y-2.5">
            <div className="flex items-center gap-2 px-1.5">
              <span className="text-[11px] uppercase tracking-[0.14em] font-semibold opacity-55 flex items-center gap-1.5" style={{ fontFamily: "Inter, ui-sans" }}>
                <span className="h-[6px] w-[6px] rounded-full" style={{ background: g.def.dot }} /> {g.def.label}
              </span>
              <span className="h-[1px] flex-1 opacity-20" style={{ background: "var(--border,#E9DDD4)" }} />
              <span className="text-[11px] opacity-40">{g.items.length}</span>
            </div>
            <div className="grid gap-2.5">
              {g.items.map(it => (
                <RowCard
                  key={it.id}
                  it={it as any}
                  onTap={() => handleRowTap(it as any)}
                  onSwipeRight={() => handleSwipeRight(it as any)}
                  onSwipeLeft={() => handleSwipeLeft(it as any)}
                />
              ))}
            </div>
          </div>
        ))}

        {bought.length > 0 && (
          <div className="pt-2">
            <div className="flex items-center gap-2 px-1.5 mb-3">
              <span className="text-[11px] uppercase tracking-wide font-semibold opacity-45">Bought • tap to remove</span>
              <span className="h-[1px] flex-1 opacity-15" style={{ background: "var(--border,#E9DDD4)" }} />
              <span className="text-[10.5px] opacity-40">{bought.length}</span>
            </div>
            <div className="grid gap-2">
              {bought.map(it => (
                <div key={it.id} className="flex items-center gap-2 px-1">
                  <RowCard
                    it={it as any}
                    onTap={() => handleRowTap(it as any)}
                    onSwipeRight={() => handleSwipeRight(it as any)}
                    onSwipeLeft={() => handleSwipeLeft(it as any)}
                  />
                  <button onClick={() => markNeed(it as any)} className="shrink-0 h-[36px] rounded-full border bg-white px-2.5 text-[11px] opacity-70">Need?</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ——— Shop Mode overlay ——— */}
      {shopMode && createPortal(
        <div className="fixed inset-0 z-[80] bg-[var(--wash-top,#FEF9F0)] flex flex-col animate-[fadeIn_0.22s]">
          <div className="pt-[max(10px,env(safe-area-inset-top))] bg-[var(--card-bg,#FEFEFD)] border-b" style={{ borderColor: "var(--border,#E9DDD4)" }}>
            <div className="px-4 py-3 flex items-center justify-between max-w-[560px] mx-auto w-full">
              <div>
                <h2 className="text-[22px] leading-[1] tracking-[-0.02em] font-[700]" style={{ fontFamily: "Fraunces, serif" }}>Shop Mode</h2>
                <p className="mt-1 text-[11px] tracking-widest uppercase opacity-55">Big taps · {todo.length} left · trip {tripFilter}</p>
              </div>
              <button onClick={() => setShopMode(false)} className="w-[44px] h-[44px] rounded-full bg-[#121214] text-white grid place-items-center active:scale-95">✕</button>
            </div>
            <div className="px-4 pb-3 flex gap-2 overflow-x-auto max-w-[560px] mx-auto w-full">
              {TRIPS.map(t=>(
                <button key={t.id} onClick={()=>setTripFilter(t.id as any)} className={"shrink-0 h-[34px] px-3 rounded-full border text-[12px] font-medium "+(tripFilter===t.id ? "bg-[#121214] text-white border-[#121214]" : "bg-white border-[#E9DDD4] opacity-70")}>{t.short}</button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-auto px-3 py-4 pb-10">
            <div className="mx-auto max-w-[560px] space-y-2.5">
              {todo.length===0 ? (
                <p className="text-center mt-20 opacity-50 font-display text-[16px]" style={{ fontFamily: "Fraunces, serif" }}>Nothing in {tripFilter} — nice work.</p>
              ) : (
                todo.map(it=>(
                  <button
                    key={it.id}
                    onClick={()=>{ markBought(it as any); try{(navigator as any).vibrate?.(12);}catch{} }}
                    className="w-full min-h-[68px] rounded-[20px] border bg-[var(--card-bg,#FEFEFD)] px-4 flex items-center gap-3.5 text-left active:scale-[0.98] shadow-[0_4px_14px_rgba(0,0,0,0.04)]"
                    style={{ borderColor: "var(--border,#E9DDD4)" }}
                  >
                    <span className="grid h-[36px] w-[36px] place-items-center rounded-full border bg-[#FDF8F3] text-[14px]">○</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[17px] font-[600] tracking-[-0.01em] truncate" style={{ fontFamily: "Fraunces, serif" }}>{it.item}</span>
                      <span className="block text-[11px] opacity-50">{getItemTrip(it)} · tap to check</span>
                    </span>
                    <span className="h-[44px] w-[44px] grid place-items-center rounded-full bg-[#121214] text-white text-[13px]">✓</span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="pb-[max(12px,env(safe-area-inset-bottom))] px-4 py-3 bg-[var(--card-bg,#FEFEFD)] border-t max-w-[560px] mx-auto w-full" style={{ borderColor: "var(--border,#E9DDD4)" }}>
            <div className="flex items-center justify-between text-[11px] opacity-55">
              <span>Tap big card → bought · swipe still works</span>
              <button onClick={()=>setShopMode(false)} className="h-[36px] px-3.5 rounded-full bg-[#FDF8F3] border text-[11px]">Done</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <BottomConfirm
        open={!!confirmItem}
        itemLabel={confirmItem?.item}
        onCancel={() => setConfirmItem(null)}
        onDelete={() => confirmItem && doDelete(confirmItem as any)}
        dontAsk={dontAskAgain}
        setDontAsk={setDontAskAgain}
      />
      <UndoToast snack={snack} onUndo={handleUndo} onDismiss={() => { setSnack(null); if (snackTimer.current) clearTimeout(snackTimer.current); }} />
    </div>
  );
}

export default ShoppingScreen;
