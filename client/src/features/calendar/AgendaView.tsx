import type { CalendarEventV2, PersonKey } from "../../types";
import { HOUSEHOLD_TZ } from "../../lib/dates";
import EventIcon from "../../components/EventIcon";
import { getKindDef, inferKindFromTitle } from "../../lib/eventTypes";

type Props = {
  eventsForToday: CalendarEventV2[];
  eventsForTomorrow: CalendarEventV2[];
  laterFlat: { key:string, ev:CalendarEventV2 }[];
  onSelectEvent: (ev:CalendarEventV2)=>void;
  currentUser: PersonKey;
};

function toTimeDublin(iso?: string){
  if(!iso) return "";
  try{ return new Date(iso).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",timeZone:HOUSEHOLD_TZ}); }catch{ return ""; }
}

export function AgendaView({ eventsForToday, eventsForTomorrow, laterFlat, onSelectEvent, currentUser }: Props){
  const AgendaRow = ({ ev }: { ev: CalendarEventV2 }) => {
    const isPending = ["proposed","awaiting_aisling","awaiting_ciaran","needs_discussion"].includes(ev.status as any);
    const timeStr = (ev as any).allDay ? "All day" : toTimeDublin((ev as any).start||(ev as any).dueAt);
    const attendees = (ev as any).attendees || ["aisling","ciaran"];
    const isBoth = attendees.length!==1;
    const leftRuleColor = isBoth ? "#8B7357" : (attendees[0]==="aisling" ? "#A89FDA" : "#E07A5F");
    const kindId = (ev as any).kind || (ev as any).eventKind || inferKindFromTitle((ev as any).title||"") || "other";
    const def = getKindDef(kindId);
    return (
      <button onClick={()=> onSelectEvent(ev)} className="w-full text-left flex items-stretch rounded-[18px] border bg-[var(--card-bg)] overflow-hidden active:scale-[0.98] min-h-[64px] relative group" style={{borderColor:"var(--border)", paddingLeft:3}}>
        <span className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-[18px]" style={{background:leftRuleColor}} aria-hidden="true"/>
        <span className="flex flex-1 items-center gap-3 px-3.5 py-3 min-w-0 ml-[3px]">
          <span className="h-[38px] w-[38px] shrink-0 grid place-items-center rounded-full border" style={{ background:`radial-gradient(110% 90% at 30% 20%, white 0%, ${def.light.bg} 50%)`, borderColor:"rgba(0,0,0,0.06)" }}>
            <EventIcon kind={def.id} title={ev.title} size={38} theme="light" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-semibold truncate" style={{letterSpacing:"-0.01em"}}>{ev.title}</span>
            <span className="block text-[11px] truncate max-w-[160px] flex items-center gap-1.5" style={{color:'var(--muted)'}}>{timeStr}{ (ev as any).location ? ` • ${(ev as any).location}` : ""} {isPending && <span className="inline-flex px-1.5 py-0.5 rounded-full bg-[#FFF1E0] text-[#9A6720] text-[10px] border border-[#F0D9BE]">Needs you</span>}</span>
          </span>
          <span className="shrink-0 rounded-full h-8 w-8 grid place-items-center border text-[12px] group-hover:bg-[#FFF8F0] transition" style={{background:'var(--chip-bg)', borderColor:'var(--border)'}}>›</span>
        </span>
      </button>
    );
  };
  return (
    <div className="space-y-4 px-1">
      <div>
        <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)] mb-2">Today • Europe/Dublin</div>
        <div className="space-y-2">{eventsForToday.length? eventsForToday.map(ev=><AgendaRow key={ev.id} ev={ev}/>) : <div className="text-[12px] text-[var(--muted)] italic">Nothing — enjoy the quiet.</div>}</div>
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)] mb-2">Tomorrow</div>
        <div className="space-y-2">{eventsForTomorrow.map(ev=><AgendaRow key={ev.id} ev={ev}/>)}</div>
      </div>
      {laterFlat.length>0 && (
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)] mb-2">Upcoming • Future split</div>
          <div className="space-y-2">{laterFlat.map(({key,ev})=><AgendaRow key={ev.id+"-"+key} ev={ev}/>)}</div>
        </div>
      )}
    </div>
  );
}
export default AgendaView;
