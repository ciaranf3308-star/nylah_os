// ChoreMine.tsx — V211 Quest Log — more game, more delight
import type { ChoreV2 } from "./choreTypes";
import { effectivePoints, getDueMsChore, isBonusChore, timingLabel } from "./choreScoring";
import { PERSONS } from "../../constants/themes";
import { ChoreIcon, CHORE_ICONS, CHORE_ICON_BY_TEMPLATE } from "../../lib/choreIcons";

type Props = {
  list: ChoreV2[];
  nowMs: number;
  currentUser: any;
  onDetail: (c:ChoreV2)=>void;
  onComplete: (c:ChoreV2)=>void;
  onSnooze: (c:ChoreV2)=>void;
  onSwap: (c:ChoreV2)=>void;
  onDelete?: (id:string)=>void;
  triggerPop: (id:string, pts:number)=>void;
  confetti: (pts:number)=>void;
  setChores: any;
  setToast: (s:string|null)=>void;
  monthKey: string;
};

function iconFor(ch:any): string {
  if(ch.icon && (CHORE_ICONS as any)[ch.icon]) return ch.icon;
  if(ch.templateId && (CHORE_ICON_BY_TEMPLATE as any)[ch.templateId]) return (CHORE_ICON_BY_TEMPLATE as any)[ch.templateId];
  const t=(ch.title||"").toLowerCase();
  if(t.includes("bin")) return "bins";
  if(t.includes("dish")) return "dishes";
  if(t.includes("laundr")) return "laundry";
  if(t.includes("vacuum")) return "vacuum";
  if(t.includes("bath")) return "bathroom";
  if(t.includes("shop")||t.includes("grocer")) return "groceries";
  return "broom";
}

export function ChoreMine({ list, nowMs, currentUser, onDetail, onComplete, onSnooze, onSwap, onDelete }: Props) {
  if (list.length===0) {
    return (
      <div className="rounded-[20px] border border-dashed bg-[var(--card-bg)] px-6 py-10 text-center" style={{borderColor:"var(--border)"}}>
        <div className="mx-auto mb-3 grid h-[48px] w-[48px] place-items-center rounded-full bg-[var(--chip-bg)] border" style={{borderColor:"var(--border)"}}>
          <span className="text-[12px] font-[700]" style={{color:"var(--muted)"}}>✦</span>
        </div>
        <div className="font-['Fraunces'] text-[15px] font-[620]" style={{color:"var(--text)"}}>No quests</div>
        <div className="text-[12px] mt-1" style={{color:"var(--muted)"}}>Swipe right in Deck to claim • they land here • finish fast for streaks</div>
        <div className="mt-3 inline-flex gap-1.5">
          <span className="h-1 w-1 rounded-full bg-[var(--border)]" /><span className="h-1 w-1 rounded-full bg-[var(--border)]" /><span className="h-1 w-1 rounded-full bg-[var(--border)]" />
        </div>
      </div>
    );
  }
  return (
    <div className="grid gap-2.5">
      <div className="px-1 flex items-center justify-between">
        <span className="text-[11px] font-[600] tracking-[0.08em] uppercase" style={{color:"var(--muted)"}}>My Quests • {list.length}</span>
        <span className="text-[11px]" style={{color:"var(--muted)"}}>tap title for split • Done = +pts</span>
      </div>
      {list.slice(0,24).map(c=>{
        const dueMs=getDueMsChore(c as any);
        const overdue=dueMs < nowMs;
        const overMs = overdue ? nowMs - dueMs : 0;
        const overHrs = Math.floor(overMs/3600000);
        const points = effectivePoints(c, isBonusChore(c, nowMs));
        const dueLabel = timingLabel(c, nowMs);
        const pctLeft = (()=>{ try{ const total= (c as any).timeWindowHours ? (c as any).timeWindowHours*3600000 : 24*3600000; const left=dueMs-nowMs; return Math.max(0, Math.min(100, (left/total)*100)); }catch{return 70}})();
        return (
          <div key={c.id} className="group w-full text-left rounded-[18px] border bg-[var(--card-bg)] px-3.5 py-3 flex items-center gap-3 min-h-[86px] transition-all hover:shadow-[0_4px_18px_rgba(0,0,0,0.06)]" style={{borderColor: overdue ? "#F2B7A9" : "var(--border)", background: overdue ? "color-mix(in srgb, var(--card-bg) 88%, #FEF2F2 12%)" : "var(--card-bg)"}}>
            <span className={"grid h-[44px] w-[44px] place-items-center rounded-full border shrink-0 bg-[var(--chip-bg)] "+(overdue?"animate-[pulseRace_1.2s_ease_infinite] border-[#F2B7A9]":"border-[var(--border)]")} style={{minHeight:44,minWidth:44}}>
              <ChoreIcon id={iconFor(c) as any} size={18} />
            </span>
            <button onClick={()=> onDetail(c)} className="flex-1 text-left min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-[600] text-[13.5px] truncate max-w-[160px] sm:max-w-[220px]" style={{fontFamily:"Fraunces, serif", color:"var(--text)"}}>{c.title}</span>
                <span className={"inline-flex items-center h-[18px] rounded-full border px-2 text-[10px] font-[600] "+(overdue?"bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C]":"bg-[var(--chip-bg)] border-[var(--border)] text-[var(--muted)]")}>{overdue? `OVER ${overHrs}h` : dueLabel.split("•").pop()?.trim()?.slice(0,22)}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-[4px] w-[64px] rounded-full bg-[var(--border)] overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{width: `${pctLeft}%`, background: overdue ? "#E07A5F" : pctLeft<18 ? "#E07A5F" : "#A8D5BA"}} />
                </div>
                <span className="text-[11px] font-[600] tabular-nums" style={{color:"var(--text-secondary)"}}>{points} pts{c.multiplier>1?" • 1.15×":""}{isBonusChore(c, nowMs)?" • rush":""}</span>
              </div>
            </button>
            <div className="flex flex-col gap-1 shrink-0 items-end">
              <button onClick={()=> { try{if(navigator.vibrate) navigator.vibrate(8)}catch{}; onComplete(c); }} className="h-[38px] min-w-[64px] rounded-full bg-[#121214] px-3.5 text-[12px] font-[700] text-white active:scale-[0.96] shadow-[0_4px_12px_rgba(0,0,0,0.14)] dark:bg-[#FF6B26] dark:text-[#121214]" style={{minHeight:38}}>Done</button>
              <div className="flex gap-1">
                <button onClick={()=> onSnooze(c)} className="h-[28px] rounded-full border bg-[var(--card-bg)] px-2.5 text-[10.5px] font-[550] hover:bg-[var(--chip-bg)]" style={{borderColor:"var(--border)", color:"var(--muted)"}}>Snooze</button>
                <button onClick={()=> onSwap(c)} className="h-[28px] rounded-full border bg-[var(--card-bg)] px-2.5 text-[10.5px] font-[550] hover:bg-[var(--chip-bg)]" style={{borderColor:"var(--border)", color:"var(--muted)"}}>Pass →</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ChoreMine;
