import type { CalendarEventV2 } from "../../types";

type Props = {
  cells: { key: string|null; day:number|null; isSelected:boolean; isToday:boolean }[];
  byDay: Map<string, CalendarEventV2[]>;
  onSelect: (k:string)=>void;
};

export function MonthView({ cells, byDay, onSelect }: Props){
  return (
    <div className="nylah-arena rounded-[24px] px-5 pt-5 pb-4 relative overflow-hidden" style={{background:'var(--card-bg)', border:'1px solid var(--border)'}}>
      <div className="relative">
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-[0.13em] text-[var(--muted)] mb-2 px-1" style={{fontFamily:'var(--font-ui)'}}><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span></div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((c,i)=>{
            if (!c.key) return <div key={"empty-"+i} className="min-h-[44px] min-w-[44px]" />;
            const dayEvs = (byDay.get(c.key!) || []) as any[];
            const hasEv = dayEvs.length>0;
            const isSel = c.isSelected;
            const isToday = c.isToday;
            const attTypes = (()=>{ const s=new Set<string>(); for(const ev of dayEvs as any[]){ const at=(ev as any).attendees||["aisling","ciaran"]; if(at.length===2||at.length===0) s.add("both"); else s.add(at[0]); } return Array.from(s); })();
            const hasA = attTypes.includes("aisling"); const hasC = attTypes.includes("ciaran"); const hasB = attTypes.includes("both");
            const countCat = attTypes.length;
            const bgForCell = isSel ? '#121214' : (()=>{ if(!hasEv) return 'var(--card-bg)'; if(countCat===1){ if(hasA) return '#E9E6FF'; if(hasC) return '#FFE9E1'; if(hasB) return '#FFF2D8'; } if(hasA && hasC && !hasB) return 'linear-gradient(90deg, #E9E6FF 0 50%, #FFE9E1 50% 100%)'; if(hasA && hasB) return 'linear-gradient(90deg, #E9E6FF 0 50%, #FFF2D8 50% 100%)'; if(hasC && hasB) return 'linear-gradient(90deg, #FFE9E1 0 50%, #FFF2D8 50% 100%)'; if(hasA && hasC && hasB) return 'linear-gradient(90deg, #E9E6FF 0 33%, #FFE9E1 33% 66%, #FFF2D8 66% 100%)'; return '#F7EFE6'; })();
            const borderForCell = isSel ? '#121214' : isToday ? '#FF6B26' : hasEv ? (hasA && !hasC && !hasB ? '#C7BFFF' : hasC && !hasA && !hasB ? '#FFB59A' : '#E8DDD3') : 'var(--border)';
            return (
              <button
                key={c.key}
                onClick={()=> onSelect(c.key!)}
                aria-label={c.key + (hasEv ? " has "+dayEvs.length+" events" : "")}
                className="relative min-h-[44px] w-full rounded-[14px] grid place-items-center border active:scale-[0.96] py-2.5"
                style={{
                  minHeight:44,
                  background: bgForCell as any,
                  color: isSel ? '#FFFEFB' : 'var(--text)',
                  borderColor: borderForCell,
                  borderWidth: hasEv && !isSel ? '1.5px' : '1px',
                  fontFamily: 'Fraunces, var(--font-display)',
                  fontWeight: isSel||isToday?700: hasEv?600:500,
                  fontSize:'13px',
                  transition:'transform 160ms cubic-bezier(0.34,1.56,0.64,1)'
                }}
              >
                <span className="leading-none">{c.day}</span>
                {hasEv && (
                  <span className="absolute bottom-[4px] left-1/2 -translate-x-1/2 flex gap-[3px] justify-center items-center">
                    {dayEvs.slice(0,3).map((ev:any,j:number)=> {
                      const at = (ev as any).attendees || ["aisling","ciaran"];
                      const col = at.length===1 ? (at[0]==="aisling" ? "#7B6EE6" : "#E07A5F") : "#8B7357";
                      return <span key={j} className="rounded-full ring-1 ring-white/70" style={{width:'6.5px',height:'6.5px',background:col}} />;
                    })}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-center gap-3 text-[11px] font-medium text-[var(--text-secondary)]">
          <span className="inline-flex items-center gap-1.5"><span className="h-[7px] w-[7px] rounded-full" style={{background:"#A89FDA"}}/> Aisling</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-[7px] w-[7px] rounded-full" style={{background:"#E07A5F"}}/> Ciaran</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-[7px] w-[7px] rounded-full" style={{background:"#8B7357"}}/> Both</span>
        </div>
      </div>
    </div>
  );
}
export default MonthView;
