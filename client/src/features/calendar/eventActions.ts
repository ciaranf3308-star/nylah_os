import type { CalendarEventV2, CalendarEventStatus, CalendarEventResponse, PersonKey } from "../../types";
import { HOUSEHOLD_TZ } from "../../lib/dates";
import { upsertCalendarSeries, upsertCalendarOverride } from "../../lib/normalized";
import { uid } from "../../shared/utils/helpers";

export type { CalendarEventV2, CalendarEventStatus, CalendarEventResponse };

export function getResponses(ev: any): CalendarEventResponse[] {
  if (ev.responses && ev.responses.length) return ev.responses as any;
  const res: CalendarEventResponse[] = [];
  if (ev.swipes) {
    if (ev.swipes?.aisling) {
      const v = ev.swipes.aisling as any;
      if (v === "yes" || v === "no" || v === "discuss") res.push({ eventId: ev.id, memberId: "aisling", response: v, respondedAt: ev.updatedAt || ev.createdAt });
    }
    if (ev.swipes?.ciaran) {
      const v = (ev.swipes as any).ciaran as any;
      if (v === "yes" || v === "no" || v === "discuss") res.push({ eventId: ev.id, memberId: "ciaran", response: v, respondedAt: ev.updatedAt || ev.createdAt });
    }
  }
  return res;
}

export function computeStatusFromResponses(ev: any, responses: CalendarEventResponse[]): CalendarEventStatus {
  if ((ev as any).status === "cancelled" || (ev as any).status === "completed" || (ev as any).status === "draft") return ev.status as any;
  if ((ev as any).status === "dismissed") return "cancelled" as any;
  const attendees: string[] = (ev as any).attendees && (ev as any).attendees.length ? (ev as any).attendees : ["aisling","ciaran"];
  const proposer = (ev as any).proposer as PersonKey | undefined;
  if (attendees.length === 1) {
    const sole = attendees[0] as PersonKey;
    if (proposer && proposer === sole) return "agreed" as any;
    const soleResp = responses.find(r => r.memberId === sole);
    if (!soleResp) return (`awaiting_${sole}` as any);
    if (soleResp.response === "yes") return "agreed" as any;
    if (soleResp.response === "no") return "declined" as any;
    if (soleResp.response === "discuss") return "needs_discussion" as any;
    return (`awaiting_${sole}` as any);
  }
  const hasA = responses.find(r => r.memberId === "aisling");
  const hasC = responses.find(r => r.memberId === "ciaran");
  const proposerResp = proposer ? responses.find(r=> r.memberId===proposer) : null;
  if (!hasA || !hasC) {
    // proposer implicit yes for both-events (if proposer exists and hasn't responded, treat as yes)
    const effA = hasA ? hasA.response : (proposer==="aisling" ? "yes" : null);
    const effC = hasC ? hasC.response : (proposer==="ciaran" ? "yes" : null);
    if (!effA) return "awaiting_aisling" as any;
    if (!effC) return "awaiting_ciaran" as any;
    // both effective yes
    if (effA==="yes" && effC==="yes") return "agreed" as any;
    if (effA==="no" || effC==="no") return (effA==="no" && effC==="no" ? "declined" : "needs_discussion") as any;
    if (effA==="discuss" || effC==="discuss") return "needs_discussion" as any;
    return "proposed" as any;
  }
  const aResp = hasA.response;
  const cResp = hasC.response;
  if (aResp==="yes" && cResp==="yes") return "agreed" as any;
  if (aResp==="no" && cResp==="no") return "declined" as any;
  if (aResp==="no" || cResp==="no" || aResp==="discuss" || cResp==="discuss") return "needs_discussion" as any;
  return "proposed" as any;
}

export async function upsertSeries(ev: any){
  try{ await upsertCalendarSeries(ev); }catch{}
}
export async function upsertOverride(data:any){
  try{ await upsertCalendarOverride(data); }catch{}
}

export function makeMutationId(){ try{ return (globalThis.crypto as any)?.randomUUID ? (globalThis.crypto as any).randomUUID() : String(Date.now()); } catch{ return String(Date.now()); } }

export function shouldSuppressGeneratedOccurrence(templateId:string, occurrenceId:string, overrides:any[], deletedSeriesUntil?:string|null): boolean {
  // thin wrapper over lib/recurrence helper — zero logic change
  try{
    const { shouldSuppressGeneratedOccurrence: real } = require("../../lib/recurrence") as any;
    return real(templateId, occurrenceId, overrides, deletedSeriesUntil);
  }catch{
    // fallback: check if override exists for this occurrence (this-only)
    return (overrides||[]).some((o:any)=> o.templateId===templateId && o.occurrenceId===occurrenceId);
  }
}
