// ChoreOpen.tsx — Open tab (race, open, assigned to other) — now with planner grouping + priority
import type { ChoreV2 } from "./choreTypes";
import { effectivePoints, getDueMsChore, isBonusChore, timingLabel, todayKey, toLocalKeyDublin, HOUSEHOLD_TZ } from "./choreScoring";
import { PERSONS } from "../../constants/themes";
import { ChoreIcon } from "../../lib/choreIcons";

type Props = {
  list: ChoreV2[];
  nowMs: number;
  currentUser: any;
  onDetail: (c:ChoreV2)=>void;
  onComplete: (c:ChoreV2)=>void;
  onDelete?: (id:string)=>void;
  setChores: any;
  setToast: (s:string|null)=>void;
  monthKey: string;
};

function bucketKey(c: any, nowMs: number): "overdue"|"today"|"tomorrow"|"week"|"later" {
  const due = getDueMsChore(c);
  const diff = due - nowMs;
  if (diff < 0) return "overdue";
  try {
    const k = toLocalKeyDublin(new Date(due).toISOString(), HOUSEHOLD_TZ);
    const today = todayKey(HOUSEHOLD_TZ);
    const d = new Date();
    const tomorrowDate = new Date(d); tomorrowDate.setDate(d.getDate()+1);
    const tomorrowK = todayKey(HOUSEHOLD_TZ) === k ? null : null; // placeholder, compute via toLocalKey for tomorrow
    // simpler: use diff thresholds
    if (k===today) return "today";
    const tomorrowMs = new Date(today).getTime() + 86400000;
    const kDate = new Date(k+"T00:00:00");
    const todayDate = new Date(today+"T00:00:00");
    const dayDiff = Math.round((kDate.getTime()-todayDate.getTime())/86400000);
    if (dayDiff===1) return "tomorrow";
    if (dayDiff<=7) return "week";
  } catch {}
  const diffDays = diff/86400000;
  if (diffDays <=1) return "today";
  if (diffDays <=2) return "tomorrow";
  if (diffDays <=7) return "week";
  return "later";
}

export function ChoreOpen({ list, nowMs, currentUser, onDetail, onComplete, onDelete, setChores, setToast, monthKey }: Props) {
  if (list.length===0) {
    return (
      <div className="rounded-[28px] border border-dashed bg-[var(--card-bg)] px-6 py-10 text-center" style={{borderColor:"var(--border)"}}>
        <div className="font-display text-[16px]" style={{fontFamily:"Fraunces"}}>No open chores</div>
        <div className="text-[12px] text-[var(--muted)] mt-1">All caught up • deck is clear</div>
        <div className="mt-3 text-[11px] text-[var(--muted)]">Race 1.15× when both claim • Planner shows what to do when</div>
      </div>
    );
  }

  // Group into planner buckets
  const grouped: Record<string, ChoreV2[]> = { overdue:[], today:[], tomorrow:[], week:[], later:[] };
  for (const c of list) {
    const b = bucketKey(c, nowMs);
    grouped[b].push(c as any);
  }
  // sort each bucket by priority: pain high → points high → due earliest
  for (const k of Object.keys(grouped)) {
    grouped[k].sort((a:any,b:any)=> {
      const pa=(a.pain||5)-(b.pain||5);
      if (pa!==0) return -pa; // higher pain first
      const pts = effectivePoints(b, false)-effectivePoints(a,false);
      if (pts!==0) return pts;
      return getDueMsChore(a)-getDueMsChore(b);
    });
  }

  const bestPlan = (()=> {
    // ready-made planner: top 3 actionable now
    const plan: ChoreV2[] = [];
    if (grouped.overdue.length) plan.push(...grouped.overdue.slice(0,2));
    if (grouped.today.length) plan.push(...grouped.today.slice(0,3-plan.length));
    if (grouped.tomorrow.length && plan.length<3) plan.push(...grouped.tomorrow.slice(0,3-plan.length));
    return plan.slice(0,3);
  })();

  const Section = ({ title, items, accent }: { title:string, items:ChoreV2[], accent?:string })=>{
    if (!items.length) return null;
    return (
      <div className="space-y-1.5">
        <div className="px-1 flex items-center justify-between">
          <span className="text-[11px] font-semibold tracking-[0.12em] uppercase" style={{color: accent||"var(--muted)"}}>{title} • {items.length}</span>
          <span className="text-[10px] text-[var(--muted)]">{items.reduce((s,c)=>s+effectivePoints(c as any, false),0)} pts total</span>
        </div>
        {items.map(c=>{
          const dueMs=getDueMsChore(c);
          const overdue=dueMs < nowMs;
          const dueToday=Math.abs(dueMs-nowMs)<24*3600000;
          const isContested=(c as any).swipes?.aisling==="right" && (c as any).swipes?.ciaran==="right";
          const hoursOpen=c.updatedAt ? (nowMs - new Date(c.updatedAt).getTime())/3600000 : 0;
          const canSteal=c.assignedTo && c.assignedTo!==currentUser && (hoursOpen>3 || overdue);
          const points=effectivePoints(c, isBonusChore(c, nowMs));
          const priority = c.pain>=8 ? "High" : c.pain>=5 ? "Med" : "Low";
          const prioColor = c.pain>=8 ? "#B91C1C" : c.pain>=5 ? "#A16207" : "#6B7280";
          return (
            <div key={c.id} className={"w-full text-left rounded-[22px] border bg-[var(--card-bg)] px-4 py-3 flex items-center gap-3 min-h-[92px] "+(isContested?"border-[#FCA5A5] bg-[var(--card-bg)]/30":"")} style={{borderColor:isContested?"#FCA5A5":"var(--border)", boxShadow:"0 8px 24px rgba(0,0,0,0.06)", background: isContested?"#FEE2E2": overdue?"var(--card-bg)":"linear-gradient(180deg,var(--wash-mid) 0%,var(--card-bg) 100%)"}}>
              <span className={"grid h-10 w-10 place-items-center rounded-full border text-[12px] font-bold shrink-0 "+(overdue?"border-[#EF4444] ring-2 ring-[#EF4444]/30": dueToday?"border-[var(--wash-mid)] ring-2 ring-[var(--wash-mid)]":"border-[var(--border)] bg-[var(--card-bg)]")} style={{minHeight:40, minWidth:40}}><ChoreIcon id={(c as any).icon||'broom'} size={16} /></span>
              <button onClick={()=> onDetail(c)} className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap"><span className="font-medium text-[14px] truncate">{c.title}</span><span className="rounded-full px-2 py-0.5 text-[10px] font-semibold border" style={{borderColor:prioColor+"40", background:prioColor+"14", color:prioColor}}>{priority} • {c.pain}/10</span>{isContested && <span className="rounded-full bg-[var(--card-bg)] border border-[#FCA5A5] px-2 py-0.5 text-[10px] font-bold text-[#991B1B]">RACE • 1.15×</span>}</div>
                <div className="text-[11px] text-[var(--muted)]">{timingLabel(c, nowMs)} • {points} pts {c.assignedTo ? `• ${c.assignedTo}`:""}</div>
              </button>
              <div className="flex flex-col gap-1 shrink-0 items-end">
                <button onClick={()=> onComplete(c)} className="h-[36px] rounded-full bg-[#0A0A0A] px-3 text-[11px] text-white active:scale-[0.96] min-w-[52px]" style={{minHeight:36}}>Done</button>
                <div className="flex gap-1">
                  {canSteal && <button onClick={()=>{ const nowISO=new Date().toISOString(); setChores((p:any)=> p.map((x:any)=> x.id===c.id ? {...x, assignedTo:currentUser, updatedAt:nowISO}:x)); setToast(`${PERSONS[currentUser].name} stole ${c.title}`); setTimeout(()=>setToast(null),3000); }} className="h-[28px] rounded-full border bg-[var(--card-bg)] px-2.5 text-[10px] font-semibold" style={{borderColor:"var(--border)", minHeight:28}}>Steal</button>}
                  {onDelete && <button onClick={()=> onDelete(c.id)} className="h-[28px] w-[28px] grid place-items-center rounded-full border bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C] text-[10px]" aria-label="Delete">✕</button>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Ready-made planner */}
      {bestPlan.length>0 && (
        <div className="rounded-[22px] border bg-[#FFFEFB] px-4 py-3 shadow-sm" style={{borderColor:"#E8DDD3"}}>
          <div className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#8A7D6E] mb-2 flex items-center justify-between"><span>✦ Your plan today</span><span className="text-[10px] normal-case tracking-normal font-medium bg-[#121214] text-white px-2 py-0.5 rounded-full">Do these first</span></div>
          <div className="space-y-1.5">
            {bestPlan.map((c,i)=> (
              <div key={c.id} className="flex items-center gap-2 text-[13px]">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-[#121214] text-white text-[11px] font-bold">{i+1}</span>
                <span className="flex-1 truncate font-medium">{c.title}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full border bg-[#FFF3E3] border-[#F0D9BE] text-[#8A6A4A]">{c.pain>=7?'high':'med'} • {effectivePoints(c as any,false)} pts</span>
              </div>
            ))}
          </div>
          <div className="mt-2 text-[10.5px] text-[var(--muted)]">Grouped by when it's due • high pain = do first</div>
        </div>
      )}

      <Section title="Overdue" items={grouped.overdue as any} accent="#B91C1C" />
      <Section title="Today" items={grouped.today as any} accent="#0A0A0A" />
      <Section title="Tomorrow" items={grouped.tomorrow as any} />
      <Section title="This week" items={grouped.week as any} />
      <Section title="Later" items={grouped.later as any} />
    </div>
  );
}

export default ChoreOpen;
