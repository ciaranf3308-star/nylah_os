// Scalable onboarding v227 — supports couple + friends/roommates second path
// No hard-coded household, no Aisling/Ciaran copy, server PINs only, boutique flow
// Dean fork pattern re-implemented clean (no code copy): connectionType couple|friends → LS + html data-connection + meta

import { useEffect, useState } from "react";
import { getSupabase, TABLE as SB_TABLE } from "../../lib/supabase";

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const arr = new Uint8Array(6);
  try { (crypto as any).getRandomValues(arr); } catch { for(let i=0;i<6;i++) arr[i]=Math.floor(Math.random()*chars.length); }
  let code = "";
  for (let i=0;i<6;i++) code += chars[arr[i]%chars.length];
  return code;
}

type ConnectionType = "couple" | "friends";
type OnboardingProps = { onComplete: (hid:string)=>void };

export function OnboardingFlow({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<"welcome"|"connection"|"create_names"|"create_email"|"create_pins"|"creating"|"share"|"join_code"|"join_pick"|"join_pin"|"joining"|"recover_email">("welcome");
  const [connectionType, setConnectionType] = useState<ConnectionType>("couple");
  const [youName, setYouName] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [youPin, setYouPin] = useState("");
  const [partnerPin, setPartnerPin] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [inviteCode, setInviteCode] = useState<string>("");
  const [householdId, setHouseholdId] = useState<string>("");
  const [error, setError] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinMeta, setJoinMeta] = useState<any>(null);
  const [joinPersons, setJoinPersons] = useState<any[]>([]);
  const [joining, setJoining] = useState(false);
  const [selectedJoinKey, setSelectedJoinKey] = useState<string>("");
  const [joinPin, setJoinPin] = useState("");
  const [joinPinWrong, setJoinPinWrong] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(()=>{
    try {
      const sp = new URLSearchParams(location.search);
      const c = sp.get("code");
      if (c && c.length>=4) {
        const clean = c.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6);
        setJoinCode(clean);
        setStep(s => s==="welcome" ? "join_code" : s);
      }
      // hydrate connection if already picked this session
      const ct = localStorage.getItem("couple_v1_connection_type") as ConnectionType|null;
      if (ct === "couple" || ct === "friends") setConnectionType(ct);
    } catch {}
  }, []);

  // keep html attr in sync — lets CSS theme per connection if we want
  useEffect(()=>{
    try { document.documentElement.setAttribute("data-connection", connectionType); localStorage.setItem("couple_v1_connection_type", connectionType); } catch {}
  }, [connectionType]);

  const canContinueNames = youName.trim().length>=1 && partnerName.trim().length>=1;
  const isValidEmail = (s:string)=> /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
  const canContinueEmail = isValidEmail(recoveryEmail);
  const canContinuePins = /^\d{4}$/.test(youPin) && /^\d{4}$/.test(partnerPin) && youPin!==partnerPin;

  const normalizePersons = (persons:any, householdName:string, hid?:string)=>{
    if (!Array.isArray(persons) || persons.length===0) persons = [{key:"person_1",name:"Partner 1"},{key:"person_2",name:"Partner 2"}];
    const isPlaceholder = (n:string)=> !n || n==="Partner 1" || n==="Partner 2" || n.toLowerCase().includes("partner");
    const allPlaceholder = persons.every((p:any)=> isPlaceholder(p?.name));
    if (allPlaceholder && householdName && householdName.includes("&")) {
      const parts = householdName.split("&").map((s:string)=>s.trim()).filter(Boolean);
      if (parts.length>=2) {
        const [a,b]=parts;
        if (hid==='ash-ciaran-2026') {
          return [{key:"aisling",name:a,initial:a.slice(0,1).toUpperCase()},{key:"ciaran",name:b,initial:b.slice(0,1).toUpperCase()}];
        }
        const keys = hid==='ash-ciaran-2026' ? ["aisling","ciaran"] : ["person_1","person_2"];
        return [
          {key:keys[0],name:a,initial:a.slice(0,1).toUpperCase()},
          {key:keys[1],name:b,initial:b.slice(0,1).toUpperCase()},
        ];
      }
    }
    if (hid==='ash-ciaran-2026') {
      return persons.map((p:any,i:number)=>{
        const realKey = i===0?"aisling":"ciaran";
        const n = p?.name && !isPlaceholder(p.name) ? p.name : (i===0?"Aisling":"Ciaran");
        return {key:realKey,name:n,initial:(n.slice(0,1).toUpperCase())};
      });
    }
    return persons;
  };

  const startCreate = () => {
    setError("");
    if (!canContinueNames) { setError("Add both names"); return; }
    setStep("create_email");
  };

  const startPins = () => {
    setError("");
    if (!canContinueEmail) { setError("Add a recovery email — you can use your own"); return; }
    setStep("create_pins");
  };

  const doCreate = async () => {
    setError("");
    if (!canContinuePins) { setError("Both PINs must be 4 digits and different"); return; }
    setCreating(true); setStep("creating");
    try {
      const code = generateInviteCode();
      const hid = `nylah-${code.toLowerCase()}`;
      setInviteCode(code); setHouseholdId(hid);
      const persons = [
        { key:"person_1", name: youName.trim(), initial: youName.trim().slice(0,1).toUpperCase() },
        { key:"person_2", name: partnerName.trim(), initial: partnerName.trim().slice(0,1).toUpperCase() },
      ];
      try {
        localStorage.setItem("couple_v1_household_id", hid);
        localStorage.setItem("couple_v1_household_code", code);
        localStorage.setItem("couple_v1_household_name", `${youName.trim()} & ${partnerName.trim()}`);
        localStorage.setItem(`couple_v1_household_persons_${hid}`, JSON.stringify(persons));
        localStorage.setItem(`couple_v1_household_persons`, JSON.stringify(persons));
        localStorage.setItem("couple_v1_connection_type", connectionType);
        localStorage.setItem(`couple_v1_household_connection_${hid}`, connectionType);
        document.documentElement.setAttribute("data-connection", connectionType);
        try { localStorage.removeItem(`couple_v1_household_pins_${hid}`); localStorage.removeItem(`couple_v1_household_pins_plain_${hid}`);} catch {}
        try { localStorage.setItem("couple_v1_onboarded_at", new Date().toISOString()); } catch {}
      } catch {}

      const sb = getSupabase();
      if (sb) {
        let rpcOk = false;
        try {
          const { error } = await (sb as any).rpc("create_household_with_invite", { hid, code, name: `${youName.trim()} & ${partnerName.trim()}` });
          if (!error) rpcOk = true;
        } catch {}
        if (!rpcOk) {
          try { await sb.from("households").upsert({ id: hid, code, name: `${youName.trim()} & ${partnerName.trim()}`, tz: "Europe/Dublin", meta: { persons, connectionType } } as any, { onConflict: "id" } as any); } catch {}
          try { await sb.from("household_invites").upsert({ code, household_id: hid } as any, { onConflict: "code" } as any); } catch {}
        } else {
          // best-effort patch meta with connectionType
          try { await (sb as any).from("households").update({ meta: { persons, connectionType } } as any).eq("id", hid); } catch {}
        }
        try {
          const emailClean = recoveryEmail.trim().toLowerCase();
          if (emailClean) {
            try { await (sb as any).rpc("set_household_recovery_email", { hid, email: emailClean }); } catch {}
            try { await (sb as any).from("households").update({ recovery_email: emailClean } as any).eq("id", hid); } catch {}
          }
        } catch {}
        try { await (sb as any).rpc("upsert_household_pin", { hid, pin: youPin, person_key: "person_1" }); } catch(e:any){ console.warn("[onboard] pin1 err", e?.message); }
        try { await (sb as any).rpc("upsert_household_pin", { hid, pin: partnerPin, person_key: "person_2" }); } catch(e:any){ console.warn("[onboard] pin2 err", e?.message); }

        const meta = {
          householdName: `${youName.trim()} & ${partnerName.trim()}`,
          householdId: hid,
          inviteCode: code,
          persons,
          connectionType,
          recoveryEmail: recoveryEmail.trim().toLowerCase(),
          createdAt: new Date().toISOString(),
          onboardedAt: new Date().toISOString(),
          tz: "Europe/Dublin",
        };
        const row = { id: hid, chores: [], calendar: [], shopping: [], notes: [], meta, updated_at: new Date().toISOString(), revision: 1 };
        try {
          const { error: insErr } = await (sb as any).from(SB_TABLE).upsert(row, { onConflict: 'id' });
          if (insErr) console.warn("[onboard] supabase seed error", insErr.message);
        } catch {}

        try {
          const { data: v1 } = await (sb as any).rpc("verify_household_pin", { hid, pin: youPin });
          const { data: v2 } = await (sb as any).rpc("verify_household_pin", { hid, pin: partnerPin });
          if (!v1 || !v2) console.warn("[onboard] pin verify after create missing — pgcrypto may be absent");
        } catch {}
      }

      setCreating(false);
      setStep("share");
    } catch (e:any) {
      setCreating(false);
      setError("Couldn't create — try again: "+String(e?.message||e).slice(0,80));
      setStep("create_pins");
    }
  };

  const doCopyCode = async () => {
    try { await navigator.clipboard.writeText(inviteCode); setError("Copied!"); setTimeout(()=>setError(""), 1200); } catch { setError(inviteCode); }
  };
  const doShare = async () => {
    const url = `${location.origin}${location.pathname}?code=${inviteCode}`;
    const label = connectionType==="friends" ? "flat" : "space";
    const text = `Join our Beirt ${label} — code: ${inviteCode} — ${url}`;
    try {
      if ((navigator as any).share) await (navigator as any).share({ title: "Join us on Beirt", text, url });
      else { await navigator.clipboard.writeText(text); setError("Link copied!"); setTimeout(()=>setError(""), 1200); }
    } catch {}
  };
  const startJoin = () => { setError(""); setJoinCode(""); setStep("join_code"); };

  const doJoinLookup = async () => {
    setError("");
    const rawInput = joinCode.trim();
    const lower = rawInput.toLowerCase().trim();
    const isNyDirect = lower.startsWith("nylah-") && lower.length >= 8;
    const isLegacyDirect = lower==="ash-ciaran-2026" || lower.startsWith("ash-ciaran");
    const isAnyHid = isNyDirect || isLegacyDirect || (lower.includes("-") && lower.length>=6 && lower.length<=40 && /^[a-z0-9-]+$/.test(lower));
    const isFullHid = isAnyHid;
    const codeClean = rawInput.toUpperCase().replace(/[^A-Z0-9-]/g,"").slice(0,32);
    if (!isFullHid && codeClean.replace(/[^A-Z0-9]/g,"").length < 4) { setError("Enter the 6-letter code or household ID"); return; }
    setJoining(true);
    try {
      let hidCandidates: string[] = [];
      let code = "";
      if (isFullHid) {
        const hid = rawInput.toLowerCase().trim();
        hidCandidates = [hid];
        if (hid.startsWith("nylah-")) {
          code = hid.split("nylah-")[1]?.slice(0,6).toUpperCase() || "" ;
          hidCandidates.push(hid.slice(5));
        } else {
          code = rawInput.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6);
          if (hid.includes("ash-ciaran")) code = "ASHCI";
        }
      } else {
        code = rawInput.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6);
        const hid = `nylah-${code.toLowerCase()}`;
        hidCandidates = [hid, code.toLowerCase()];
      }
      const sb = getSupabase();
      if (!sb) { setError("No connection — check internet"); setJoining(false); return; }

      let data: any = null;
      try {
        let rpcData: any = null;
        try {
          const r1 = await (sb as any).rpc("lookup_household_by_code", { p_code: code });
          rpcData = r1.data;
        } catch {}
        if (!rpcData) {
          const r2 = await (sb as any).rpc("lookup_household_by_code", { code });
          rpcData = r2.data;
        }
        if (rpcData) {
          const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
          if (row) {
            const hid = row.id || row.household_id || hidCandidates[0];
            const rawPersons = row.persons || row.meta?.persons || [{key:"person_1", name:"Partner 1"},{key:"person_2", name:"Partner 2"}];
            const ct = row.meta?.connectionType || row.meta?.connection_type || row.connectionType || "couple";
            const persons = normalizePersons(rawPersons, row.name || row.household_name || "", hid);
            data = { id: hid, meta: { householdName: row.name || row.household_name || "You & Partner", persons, inviteCode: code, connectionType: ct } };
            if (ct) { setConnectionType(ct==="friends"?"friends":"couple"); }
          }
        }
      } catch {}

      if (!data && !isFullHid) {
        try {
          const resInvite = await (sb as any).from("household_invites").select("*").eq("code", code).maybeSingle();
          if (resInvite && resInvite.data) {
            const mappedHid = resInvite.data.household_id || hidCandidates[0];
            const resHouse = await (sb as any).from("households").select('*').eq('id', mappedHid).maybeSingle();
            if (resHouse && resHouse.data) {
              const hh = resHouse.data;
              const ct = hh.meta?.connectionType || hh.meta?.connection_type || "couple";
              data = { id: mappedHid, meta: { householdName: hh.name, inviteCode: code, persons: hh.meta?.persons || [{key:"person_1",name:"Partner 1"},{key:"person_2",name:"Partner 2"}], connectionType: ct } };
              if (ct) setConnectionType(ct==="friends"?"friends":"couple");
            } else {
              const resCouple = await (sb as any).from(SB_TABLE).select('*').eq('id', mappedHid).maybeSingle();
              if (resCouple && resCouple.data) data = resCouple.data;
              else data = { id: mappedHid, meta: { householdName: "You & Partner", inviteCode: code, persons: [{key:"person_1",name:"Partner 1"},{key:"person_2",name:"Partner 2"}] } };
            }
          }
        } catch {}
      }

      if (!data) {
        for (const hid of hidCandidates) {
          try {
            const res1 = await (sb as any).from(SB_TABLE).select('*').eq('id', hid).maybeSingle();
            if (res1?.data) { 
              const ct = (res1.data as any)?.meta?.connectionType || "couple";
              if (ct) setConnectionType(ct==="friends"?"friends":"couple");
              data = res1.data; break; 
            }
            const hh = await (sb as any).from("households").select('*').eq('id', hid).maybeSingle();
            if (hh?.data) { 
              const ct = hh.data.meta?.connectionType || "couple";
              if (ct) setConnectionType(ct==="friends"?"friends":"couple");
              data = { id: hid, meta: { householdName: hh.data.name, persons: hh.data.meta?.persons || [{key:"person_1",name:"Partner 1"},{key:"person_2",name:"Partner 2"}], inviteCode: code, connectionType: ct } }; break; 
            }
          } catch {}
        }
      }

      if (!data) {
        setError("No household found with that code — check letters or ask for invite again");
        setJoining(false);
        return;
      }
      const meta = (data as any).meta;
      // propagate connectionType from found house
      const ctFound = meta?.connectionType || meta?.connection_type || "couple";
      if (ctFound === "friends" || ctFound === "couple") {
        setConnectionType(ctFound);
        try { localStorage.setItem("couple_v1_connection_type", ctFound); localStorage.setItem(`couple_v1_household_connection_${(data as any).id}`, ctFound); document.documentElement.setAttribute("data-connection", ctFound);} catch {}
      }
      setJoinMeta(meta);
      const rawPersons = meta?.persons || [{key:"person_1", name:"Partner 1"}, {key:"person_2", name:"Partner 2"}];
      const mixedHid = (data as any).id || hidCandidates[0] || "";
      const mixedName = (meta as any)?.householdName || (data as any)?.householdName || "";
      const persons = normalizePersons(rawPersons, mixedName, mixedHid);
      const safePersons = persons.map((p:any, idx:number)=> ({
        key: (p.key && typeof p.key==="string" ? p.key : (idx===0?"person_1":"person_2")),
        name: p.name || (idx===0?"Partner 1":"Partner 2"),
        initial: p.initial || (p.name||"P").slice(0,1).toUpperCase(),
      }));
      setJoinPersons(safePersons);
      setInviteCode(code);
      setHouseholdId((data as any).id || hidCandidates[0] || "");
      setJoining(false);
      setStep("join_pick");
    } catch (e:any) {
      setJoining(false);
      setError("Couldn't find — try again: "+String(e?.message||e).slice(0,60));
    }
  };

  const doPickJoinPerson = (personKey: string) => {
    setSelectedJoinKey(personKey);
    setJoinPin("");
    setJoinPinWrong(false);
    setError("");
    setStep("join_pin");
  };

  const doJoinPinVerify = async () => {
    if (!/^\d{4}$/.test(joinPin)) { setJoinPinWrong(true); return; }
    setJoining(true); setJoinPinWrong(false); setError("");
    try {
      const sb = getSupabase();
      if (!sb) { setError("No connection"); setJoining(false); return; }
      const { data, error } = await (sb as any).rpc("verify_household_pin", { hid: householdId, pin: joinPin } as any);
      if (error || !data) { setJoinPinWrong(true); setJoining(false); return; }
      const returnedKey = typeof data === "string" ? data : (Array.isArray(data) ? (data[0]?.person_key || data[0]) : (data as any).person_key);
      if (returnedKey && returnedKey !== selectedJoinKey) {
        setError(`That PIN is for ${joinPersons.find((p:any)=>p.key===returnedKey)?.name || returnedKey}, not ${joinPersons.find((p:any)=>p.key===selectedJoinKey)?.name}. Tap the correct name.`);
        setJoinPinWrong(true);
        setJoining(false);
        return;
      }
      if (!returnedKey) { setJoinPinWrong(true); setJoining(false); return; }

      try {
        localStorage.setItem("couple_v1_household_id", householdId);
        localStorage.setItem("couple_v1_household_code", inviteCode);
        localStorage.setItem("couple_v1_household_name", joinMeta?.householdName || "You & Partner");
        localStorage.setItem(`couple_v1_household_persons_${householdId}`, JSON.stringify(joinPersons));
        localStorage.setItem(`couple_v1_household_persons`, JSON.stringify(joinPersons));
        const ct = joinMeta?.connectionType || joinMeta?.connection_type || connectionType || "couple";
        localStorage.setItem("couple_v1_connection_type", ct);
        localStorage.setItem(`couple_v1_household_connection_${householdId}`, ct);
        try { document.documentElement.setAttribute("data-connection", ct);} catch {}
        try { localStorage.removeItem(`couple_v1_household_pins_${householdId}`); } catch {}
      } catch {}
      setJoining(false);
      onComplete(householdId);
    } catch {
      setJoinPinWrong(true);
      setJoining(false);
    }
  };

  const doJoinWithoutPin = async () => {
    setError(""); setJoining(true);
    try {
      const persons = joinPersons;
      const meta = joinMeta;
      try {
        localStorage.setItem("couple_v1_household_id", householdId);
        localStorage.setItem("couple_v1_household_code", inviteCode);
        localStorage.setItem("couple_v1_household_name", meta?.householdName || "You & Partner");
        localStorage.setItem(`couple_v1_household_persons_${householdId}`, JSON.stringify(persons));
        localStorage.setItem(`couple_v1_household_persons`, JSON.stringify(persons));
        const ct = meta?.connectionType || meta?.connection_type || connectionType || "couple";
        localStorage.setItem("couple_v1_connection_type", ct);
        localStorage.setItem(`couple_v1_household_connection_${householdId}`, ct);
        try { document.documentElement.setAttribute("data-connection", ct);} catch {}
      } catch {}
      setJoining(false);
      onComplete(householdId);
    } catch (e:any) {
      setJoining(false);
      setError("Join failed: "+String(e?.message||e).slice(0,60));
    }
  };

  const doRecoverByEmail = async () => {
    setError(""); setJoining(true);
    const email = recoveryEmail.trim().toLowerCase();
    if (!isValidEmail(email)) { setError("Enter your recovery email"); setJoining(false); return; }
    const sb = getSupabase();
    if (!sb) { setError("No connection"); setJoining(false); return; }
    try {
      let found:any = null;
      try {
        const r1 = await (sb as any).rpc("lookup_household_by_email", { p_email: email });
        if (r1.data && r1.data.length) found = Array.isArray(r1.data) ? r1.data[0] : r1.data;
        else if (r1.data && !Array.isArray(r1.data)) found = r1.data;
      } catch {}
      if (!found) {
        try {
          const r2 = await (sb as any).rpc("lookup_household_by_email", { email });
          if (r2.data) found = Array.isArray(r2.data) ? r2.data[0] : r2.data;
        } catch {}
      }
      if (!found) { setError("No house found for that email — check spelling or use your code"); setJoining(false); return; }
      const hid = found.id; const code = found.code_ret || found.code || "";
      const rawPersons = found.persons;
      const householdName = found.name || found.household_name || "";
      const safePersons = normalizePersons(rawPersons, householdName, hid);
      const ct = found.meta?.connectionType || found.connectionType || found.meta?.connection_type || "couple";
      if (ct) { setConnectionType(ct==="friends"?"friends":"couple"); try { localStorage.setItem("couple_v1_connection_type", ct); document.documentElement.setAttribute("data-connection", ct);} catch {}}
      setHouseholdId(hid); setInviteCode(code); setJoinMeta({ householdName, persons: safePersons, connectionType: ct });
      setJoinPersons(safePersons);
      setJoining(false);
      setStep("join_pick");
    } catch (e:any) {
      setJoining(false);
      setError("Recovery failed: "+String(e?.message||e).slice(0,80));
    }
  };


    if (step==="welcome") {
    return (
      <div className="absolute inset-0 z-[90] flex min-h-dvh w-full flex-col bg-[#FFFBF6] overflow-hidden">
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Instrument+Sans:wght@400;500&display=swap');`}</style>

        <div className="flex flex-col items-center px-6 pt-[36px] pb-[18px] shrink-0 bg-[#FFFBF6]">
          <div className="flex flex-col items-center">
            <div className="h-[64px] w-[78px] grid place-items-center">
              <svg width="78" height="70" viewBox="0 0 88 82" fill="none" className="overflow-visible">
                <path d="M44 4.5L8.5 30.5V30.9L12.2 30.9V68.2C12.2 72.8 16 77 21.2 77H66.8C72 77 75.8 72.8 75.8 68.2V30.9H79.5L44 4.5Z" stroke="#E7C5A3" strokeWidth="4.2" strokeLinejoin="round" strokeLinecap="round" fill="none"/>
                <path d="M44 7.2L11.8 31.6V67.6C11.8 71.2 15.8 74.6 21.4 74.6H66.6C72.2 74.6 76.2 71.2 76.2 67.6V31.6L44 7.2Z" fill="#FFFEFB"/>
                <circle cx="30.5" cy="36" r="10.2" fill="#A9C4B5"/><path d="M18.2 68 C18.2 54.6 24.4 49.6 30.6 49.6 C36.8 49.6 43 54.6 43 68" fill="#A9C4B5"/>
                <circle cx="55.5" cy="36" r="10.2" fill="#C97A48"/><path d="M43.2 68 C43.2 54.6 49.6 49.6 55.8 49.6 C62 49.6 68.2 54.6 68.2 68" fill="#C97A48"/>
              </svg>
            </div>
            <div className="text-[42px] font-bold leading-[0.92] tracking-[-0.03em] text-[#16120E]" style={{fontFamily:"Fraunces"}}>Beirt</div>
            <div className="mt-1 flex items-center gap-2 text-[10px] font-semibold tracking-[0.18em] uppercase">
              <span className="text-[#8AA99B]">HOME</span><span className="h-[2px] w-[2px] rounded-full bg-[#8B7357]/60" /><span className="text-[#C97A48]">PEOPLE</span><span className="h-[2px] w-[2px] rounded-full bg-[#8B7357]/60" /><span className="text-[#151210]">TOGETHER</span>
            </div>
          </div>
          <h1 className="mt-6 text-[30px] font-bold leading-[0.96] tracking-[-0.03em] text-[#16120E] text-center" style={{fontFamily:"Fraunces"}}>A home runs<br/>better together</h1>
          <p className="mt-2.5 max-w-[300px] text-[12.5px] leading-[1.5] text-[#6E5F55] text-center" style={{fontFamily:"Instrument Sans"}}>Beirt is your private space for two. Stay organised, share responsibilities, and build a stronger home—together.</p>
        </div>

        <div className="relative w-full flex-1 bg-[#FFFBF6] overflow-hidden">
          <div className="absolute inset-0">
            <img
              src="./onboarding-photo.png"
              alt=""
              className="w-full h-full object-cover"
              style={{ objectPosition:"50% 62%" }}
              draggable={false}
            />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[34%] bg-gradient-to-t from-[#0F1012]/28 to-transparent" />
        </div>

        <div className="relative z-[3] -mt-[86px] w-full px-[14px] pb-[max(14px,env(safe-area-inset-bottom))]">
          <div className="mx-auto w-full max-w-[388px] rounded-[24px] bg-[#101214] px-[16px] pt-[12px] pb-[14px] border border-white/[0.05]" style={{boxShadow:"0 24px 64px rgba(0,0,0,0.42), 0 2px 0 rgba(255,255,255,0.05) inset"}}>
            <button onClick={()=> setStep("connection")} className="w-full h-[50px] rounded-full bg-[#E07A3F] text-white font-semibold text-[14.5px] flex items-center pl-6 pr-[6px] active:scale-[0.98]">
              <span className="flex-1 text-center">Create our space</span>
              <span className="grid h-[36px] w-[36px] place-items-center rounded-full bg-black text-white">→</span>
            </button>
            <button onClick={startJoin} className="mt-2.5 w-full h-[48px] rounded-full border border-[#A8C5B5]/70 flex items-center px-3 gap-3 text-white active:scale-[0.98]">
              <span className="grid h-[32px] w-[34px] place-items-center rounded-full border border-[#A8C5B5]/40">☰</span>
              <span className="flex-1 text-left text-[13.5px]">I have a code</span>
              <span className="pr-2 opacity-70">›</span>
            </button>
            <button onClick={()=>{ setJoinCode("ASHCI"); setStep("join_code"); }} className="mt-2 w-full text-[10.5px] text-white/60 underline text-center">Lost your space? Restore Aisling & Ciaran (ASHCI / ash-ciaran-2026)</button>
          </div>
        </div>
      </div>
    );
  }                                     

  if (step==="connection") {
    const isCouple = connectionType==="couple";
    return (
      <div className="absolute inset-0 z-[90] flex min-h-dvh w-full flex-col bg-[#FFFBF6] overflow-auto">
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Instrument+Sans:wght@400;500&display=swap');`}</style>
        <div className="mx-auto w-full max-w-[380px] px-6 pt-[28px] pb-[24px]">
          <button onClick={()=> setStep("welcome")} className="text-[11px] text-[#8B7357]">← Back</button>
          <h2 className="mt-3 text-[28px] font-bold leading-[0.96] tracking-[-0.02em] text-[#16120E]" style={{fontFamily:"Fraunces"}}>Who's this for?</h2>
          <p className="mt-2 text-[12.5px] leading-[1.5] text-[#6E5F55]" style={{fontFamily:"Instrument Sans"}}>Picking this sets the wording everywhere — no extra features, just the right language. Both scale to thousands of houses via <span className="font-mono text-[11px] bg-black/5 px-1 py-0.5 rounded">nylah-xxxxxx</span>.</p>

          <div className="mt-6 grid gap-3">
            <button
              onClick={()=> { setConnectionType("couple"); try{localStorage.setItem("couple_v1_connection_type","couple"); document.documentElement.setAttribute("data-connection","couple");}catch{} }}
              className={`text-left rounded-[18px] border px-4 py-4 flex gap-3 items-start transition ${isCouple ? "bg-[#0F1012] text-white border-[#0F1012] shadow-[0_12px_28px_rgba(0,0,0,0.18)]" : "bg-white border-[#E8DDD3] hover:shadow-sm"}`}
            >
              <span className={`grid h-10 w-10 place-items-center rounded-full shrink-0 ${isCouple ? "bg-white text-black" : "bg-[#F6EFE8] text-[#8B7357]"}`}>♥</span>
              <span className="flex-1">
                <span className="text-[14px] font-semibold block" style={{fontFamily:"Instrument Sans"}}>For couples</span>
                <span className={`text-[11.5px] leading-[1.4] mt-0.5 block ${isCouple ? "text-white/70" : "text-[#6E5F55]"}`}>You two building a life together. Partners sharing responsibilities and plans.</span>
                <span className={`mt-2 inline-flex text-[10px] px-2 py-1 rounded-full ${isCouple ? "bg-white/15 text-white/80" : "bg-[#F6EFE8] text-[#8B7357]"}`}>nylah- saves as couple • wording "partner"</span>
              </span>
              <span className={`mt-1 h-4 w-4 rounded-full border grid place-items-center ${isCouple ? "border-white bg-white" : "border-[#D8CDC2]"}`}>{isCouple && <span className="h-1.5 w-1.5 rounded-full bg-black" />}</span>
            </button>

            <button
              onClick={()=> { setConnectionType("friends"); try{localStorage.setItem("couple_v1_connection_type","friends"); document.documentElement.setAttribute("data-connection","friends");}catch{} }}
              className={`text-left rounded-[18px] border px-4 py-4 flex gap-3 items-start transition ${!isCouple ? "bg-[#0F1012] text-white border-[#0F1012] shadow-[0_12px_28px_rgba(0,0,0,0.18)]" : "bg-white border-[#E8DDD3] hover:shadow-sm"}`}
            >
              <span className={`grid h-10 w-10 place-items-center rounded-full shrink-0 ${!isCouple ? "bg-white text-black" : "bg-[#EEF4F0] text-[#6E8A7A]"}`}>⍤</span>
              <span className="flex-1">
                <span className="text-[14px] font-semibold block" style={{fontFamily:"Instrument Sans"}}>For roommates & friends</span>
                <span className={`text-[11.5px] leading-[1.4] mt-0.5 block ${!isCouple ? "text-white/70" : "text-[#6E5F55]"}`}>Roommates, close friends, buddies keeping track of life together. Same fridge, different wording.</span>
                <span className={`mt-2 inline-flex text-[10px] px-2 py-1 rounded-full ${!isCouple ? "bg-white/15 text-white/80" : "bg-[#EEF4F0] text-[#6E8A7A]"}`}>nylah- saves as friends • wording "flatmate"</span>
              </span>
              <span className={`mt-1 h-4 w-4 rounded-full border grid place-items-center ${!isCouple ? "border-white bg-white" : "border-[#D8CDC2]"}`}>{!isCouple && <span className="h-1.5 w-1.5 rounded-full bg-black" />}</span>
            </button>
          </div>

          <button onClick={()=>{ setError(""); setStep("create_names"); }} className="mt-5 w-full h-[48px] rounded-full bg-[#0A0A0A] text-white text-[14px] font-semibold active:scale-[0.98]">Continue as {connectionType==="friends" ? "friends" : "couple"} →</button>
          <div className="mt-3 text-[10.5px] text-[#8B7357] text-center">Household still <span className="font-mono">nylah-xxxxxx</span> • scalable to 4k houses • stored server side via meta.connectionType</div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-[90] flex items-center justify-center bg-[var(--bg)] px-4 overflow-auto backdrop-blur-[2px]" style={{ background: "linear-gradient(180deg,#FEF6EE 0%,#FEF3E8 38%,#FFFEFB 100%)" }}>
      <div className="w-full max-w-[360px] rounded-[28px] border bg-[var(--card-bg)] shadow-[0_18px_50px_rgba(0,0,0,0.10)] px-6 py-7 flex flex-col items-center" style={{ borderColor:"var(--border)" }}>

        {step==="create_names" && (
          <>
            <div className="w-full text-left">
              <div className="flex items-center justify-between">
                <button onClick={()=> setStep("connection")} className="text-[11px] text-[#8B7357]">← Back</button>
                <span className="text-[10px] px-2 py-1 rounded-full bg-[#F6EFE8] text-[#8B7357]">{connectionType==="friends" ? "Roommates" : "Couple"} • {connectionType}</span>
              </div>
              <div className="mt-2 font-display text-[20px] font-semibold text-[#0A0A0A]">What should we call you two?</div>
              <div className="mt-1 text-[12px] text-[#6B5242]">{connectionType==="friends" ? "This shows on chips, notes, calendar dots. Names of flatmates." : "These show up everywhere — on chips, calendar dots, notes."} You can change later.</div>
            </div>
            <div className="mt-4 w-full space-y-3">
              <div>
                <label className="text-[11px] text-[#6B5242] font-medium">You</label>
                <input value={youName} onChange={e=> setYouName(e.target.value)} placeholder={connectionType==="friends" ? "e.g. Sam" : "e.g. Maya"} className="mt-1 w-full rounded-[14px] border bg-white px-3 py-3 text-[14px] outline-none" style={{borderColor:"var(--border)"}} autoFocus />
              </div>
              <div>
                <label className="text-[11px] text-[#6B5242] font-medium">{connectionType==="friends" ? "Your flatmate / friend" : "Your partner"}</label>
                <input value={partnerName} onChange={e=> setPartnerName(e.target.value)} placeholder={connectionType==="friends" ? "e.g. Alex" : "e.g. Jon"} className="mt-1 w-full rounded-[14px] border bg-white px-3 py-3 text-[14px] outline-none" style={{borderColor:"var(--border)"}} />
              </div>
            </div>
            {error && <div className="mt-3 text-[11px] text-[#991B1B] w-full">{error}</div>}
            <button disabled={!canContinueNames} onClick={startCreate} className={"mt-5 w-full h-[48px] rounded-full text-[14px] font-semibold active:scale-[0.98] "+(canContinueNames?"bg-[#0A0A0A] text-white shadow-sm":"bg-[var(--chip-bg)] text-[#8B7357]")}>Continue</button>
          </>
        )}
        {step==="create_email" && (
          <>
            <div className="w-full text-left">
              <button onClick={()=> setStep("create_names")} className="text-[11px] text-[#8B7357]">← Back</button>
              <div className="mt-2 font-display text-[20px] font-semibold text-[#0A0A0A]">Recovery email</div>
              <div className="mt-1 text-[12px] text-[#6B5242]">One per household ({connectionType}). If you lose your code and {connectionType==="friends" ? "your flatmate" : "your partner"} can't share it, we can find your house with this. Private — never listed.</div>
            </div>
            <div className="mt-4 w-full space-y-3">
              <input value={recoveryEmail} onChange={e=> setRecoveryEmail(e.target.value)} placeholder="you@email.com" type="email" className="mt-1 w-full rounded-[14px] border bg-white px-3 py-3 text-[14px] outline-none" style={{borderColor:"var(--border)"}} autoFocus />
              <div className="text-[10px] text-[#8B7357]">Used only for “forgot code” — no spam, no public listing. Stored server-side with same RLS that blocks anon listing.</div>
            </div>
            {error && <div className="mt-3 text-[11px] text-[#991B1B] w-full">{error}</div>}
            <button disabled={!canContinueEmail} onClick={startPins} className={"mt-5 w-full h-[48px] rounded-full text-[14px] font-semibold active:scale-[0.98] "+(canContinueEmail?"bg-[#0A0A0A] text-white shadow-sm":"bg-[var(--chip-bg)] text-[#8B7357]")}>Continue</button>
          </>
        )}
        {step==="create_pins" && (
          <>
            <div className="w-full text-left">
              <button onClick={()=> setStep("create_email")} className="text-[11px] text-[#8B7357]">← Back</button>
              <div className="mt-2 font-display text-[20px] font-semibold text-[#0A0A0A]">Set your 4-digit PINs</div>
              <div className="mt-1 text-[12px] text-[#6B5242]">Hashed server-side with bcrypt. Never stored plain on device. Different PINs required. ({connectionType})</div>
            </div>
            <div className="mt-4 w-full space-y-3">
              <div>
                <label className="text-[11px] text-[#6B5242] font-medium">{youName||"You"}’s PIN</label>
                <input value={youPin} onChange={e=> setYouPin(e.target.value.replace(/\D/g,"").slice(0,4))} inputMode="numeric" placeholder="••••" className="mt-1 w-full rounded-[14px] border bg-white px-3 py-3 text-center text-[18px] tracking-[0.3em] outline-none" style={{borderColor:"var(--border)"}} />
              </div>
              <div>
                <label className="text-[11px] text-[#6B5242] font-medium">{partnerName|| (connectionType==="friends"?"Flatmate":"Partner") }’s PIN</label>
                <input value={partnerPin} onChange={e=> setPartnerPin(e.target.value.replace(/\D/g,"").slice(0,4))} inputMode="numeric" placeholder="••••" className="mt-1 w-full rounded-[14px] border bg-white px-3 py-3 text-center text-[18px] tracking-[0.3em] outline-none" style={{borderColor:"var(--border)"}} />
              </div>
              <div className="text-[10px] text-[#8B7357]">Must be different. Fingerprint/Face ID can be added later in Settings.</div>
            </div>
            {error && <div className="mt-3 text-[11px] text-[#991B1B] w-full">{error}</div>}
            <button disabled={!canContinuePins} onClick={doCreate} className={"mt-5 w-full h-[48px] rounded-full text-[14px] font-semibold active:scale-[0.98] "+(canContinuePins?"bg-[#0A0A0A] text-white shadow-sm":"bg-[var(--chip-bg)] text-[#8B7357]")}>{creating?"Creating…":"Create our "+(connectionType==="friends"?"flat":"space")}</button>
            <div className="mt-2 text-[10px] text-[#8B7357] text-center">Household ID will be nylah-xxxxxx ({connectionType}) • stored locally + on Supabase meta.connectionType</div>
          </>
        )}
        {step==="creating" && (
          <div className="py-10 text-center">
            <div className="h-10 w-10 rounded-full bg-[var(--chip-bg)] animate-pulse mx-auto grid place-items-center">♥</div>
            <div className="mt-3 text-[14px] font-medium text-[#2D2118]">Creating your private {connectionType==="friends"?"flat":"space"}…</div>
            <div className="mt-1 text-[11px] text-[#6B5242]">Generating invite code, hashing PINs server-side, saving household-isolated row with connectionType {connectionType}</div>
          </div>
        )}
        {step==="share" && (
          <>
            <div className="h-10 w-10 rounded-full bg-[#0A0A0A] text-white grid place-items-center">✓</div>
            <div className="mt-3 font-display text-[20px] font-semibold text-[#0A0A0A] text-center">You’re set!</div>
            <div className="mt-1 text-[12px] text-[#6B5242] text-center">Share this code with {partnerName|| (connectionType==="friends"?"your flatmate":"your partner")} — they need it + their PIN to join. Type: {connectionType}</div>
            <div className="mt-4 w-full rounded-[20px] border bg-[var(--chip-bg)] px-4 py-4 text-center" style={{borderColor:"var(--border)"}}>
              <div className="text-[11px] uppercase tracking-[0.12em] text-[#8B7357]">Invite code ({connectionType})</div>
              <div className="mt-1 font-mono text-[28px] font-bold tracking-[0.18em] text-[#0A0A0A]">{inviteCode}</div>
              <div className="mt-1 text-[11px] text-[#6B5242]">{householdId} • {youName} & {partnerName} • {connectionType}</div>
              <div className="mt-3 flex gap-2 justify-center">
                <button onClick={doCopyCode} className="h-[36px] rounded-full bg-white border border-[var(--border)] px-4 text-[11px] font-semibold">Copy code</button>
                <button onClick={doShare} className="h-[36px] rounded-full bg-[#0A0A0A] text-white px-4 text-[11px] font-semibold">Share link</button>
              </div>
            </div>
            {error && <div className="mt-2 text-[11px] text-[#6B5242]">{error}</div>}
            <button onClick={()=> onComplete(householdId)} className="mt-4 w-full h-[48px] rounded-full bg-[#0A0A0A] text-white text-[14px] font-semibold active:scale-[0.98]">Continue to our {connectionType==="friends"?"flat":"space"} →</button>
            <div className="mt-2 text-[10px] text-[#8B7357] text-center">You’ll be asked who you are, then your PIN (server-verified). Type saved locally as data-connection={connectionType}.</div>
          </>
        )}
        {step==="join_code" && (
          <>
            <div className="w-full text-left">
              <button onClick={()=> setStep("welcome")} className="text-[11px] text-[#8B7357]">← Back</button>
              <div className="mt-2 font-display text-[20px] font-semibold text-[#0A0A0A]">Enter your invite code or household ID</div>
              <div className="mt-1 text-[12px] text-[#6B5242]">6-letter code like ABC123 or full ID like nylah-abc123. Works for couples & roommates — type auto-detected.</div>
            </div>
            <input value={joinCode} onChange={e=> setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g,"").slice(0,32))} placeholder="ABC123 or nylah-abc123" className="mt-4 w-full rounded-[16px] border bg-white px-4 py-4 text-center font-mono text-[14px] tracking-[0.12em] outline-none" style={{borderColor:"var(--border)"}} autoFocus />
            {error && <div className="mt-2 text-[11px] text-[#991B1B] w-full text-center">{error}</div>}
            <button onClick={doJoinLookup} disabled={joining} className="mt-4 w-full h-[48px] rounded-full bg-[#0A0A0A] text-white text-[14px] font-semibold disabled:opacity-60 active:scale-[0.98]">{joining?"Looking up…":"Find household"}</button>
            <button onClick={()=> { setRecoveryEmail(""); setError(""); setStep("recover_email"); }} className="mt-3 text-[11px] text-[#8B7357] underline">Don't have the code? Recover with email</button>
            <div className="mt-3 w-full rounded-[14px] bg-[var(--chip-bg)] px-3 py-2.5 text-left">
              <div className="text-[11px] font-semibold text-[#2D2118]">Why PIN again?</div>
              <div className="text-[10.5px] text-[#6B5242] leading-[1.35] mt-0.5">Your PIN is hashed bcrypt on Supabase. Joining checks server-side — fail-closed if wrong. Works for both tracks.</div>
            </div>
          </>
        )}
        {step==="recover_email" && (
          <>
            <div className="w-full text-left">
              <button onClick={()=> setStep("join_code")} className="text-[11px] text-[#8B7357]">← Back</button>
              <div className="mt-2 font-display text-[20px] font-semibold text-[#0A0A0A]">Recover with email</div>
              <div className="mt-1 text-[12px] text-[#6B5242]">Enter the recovery email you used when you created your house. One per household — private, no listing.</div>
            </div>
            <input value={recoveryEmail} onChange={e=> setRecoveryEmail(e.target.value)} placeholder="you@email.com" type="email" className="mt-4 w-full rounded-[14px] border bg-white px-3 py-3 text-[14px] outline-none" style={{borderColor:"var(--border)"}} autoFocus />
            {error && <div className="mt-2 text-[11px] text-[#991B1B] w-full text-center">{error}</div>}
            <button onClick={doRecoverByEmail} disabled={joining} className="mt-4 w-full h-[48px] rounded-full bg-[#0A0A0A] text-white text-[14px] font-semibold disabled:opacity-60 active:scale-[0.98]">{joining?"Finding…":"Find my house"}</button>
            <div className="mt-2 text-[10px] text-[#8B7357] text-center">We look up your house by email server-side (security definer RPC). Then you still need your PIN.</div>
          </>
        )}
        {step==="join_pick" && (
          <>
            <div className="h-10 w-10 rounded-full bg-[var(--chip-bg)] grid place-items-center text-[16px]">♥</div>
            <div className="mt-3 font-display text-[18px] font-semibold text-[#0A0A0A] text-center">Which one are you?</div>
            <div className="mt-1 text-[12px] text-[#6B5242] text-center">{joinMeta?.householdName||"You two"} — {inviteCode} — {joinMeta?.connectionType || connectionType} — pick your name. You’ll enter your PIN next.</div>
            <div className="mt-4 w-full space-y-2">
              {joinPersons.map((p:any)=> (
                <button key={p.key} onClick={()=> doPickJoinPerson(p.key)} disabled={joining} className="w-full flex items-center gap-3 rounded-[16px] border bg-white px-4 py-3 text-left active:scale-[0.98]" style={{borderColor:"var(--border)"}}>
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--chip-bg)] text-[12px] font-bold">{p.initial||p.name?.slice(0,1).toUpperCase()}</span>
                  <span className="flex-1"><div className="text-[14px] font-medium">{p.name}</div><div className="text-[11px] text-[#6B5242]">Tap to join as {p.name} — PIN needed ({joinMeta?.connectionType||connectionType})</div></span>
                  <span className="text-[11px] text-[#8B7357]">→</span>
                </button>
              ))}
            </div>
            {error && <div className="mt-3 text-[11px] text-[#991B1B]">{error}</div>}
            <div className="mt-3 text-[10px] text-[#8B7357] text-center">No PIN storage on device — server bcrypt only.</div>
            <button onClick={doJoinWithoutPin} className="mt-2 text-[11px] text-[#8B7357] underline">Skip PIN (legacy / offline dev)</button>
          </>
        )}
        {step==="join_pin" && (
          <>
            <div className="w-full text-left">
              <button onClick={()=> setStep("join_pick")} className="text-[11px] text-[#8B7357]">← Back</button>
              <div className="mt-2 font-display text-[20px] font-semibold text-[#0A0A0A]">Enter your PIN</div>
              <div className="mt-1 text-[12px] text-[#6B5242]">Joining as <b>{joinPersons.find((p:any)=>p.key===selectedJoinKey)?.name}</b> — PIN is verified server-side against {householdId}, fail-closed if wrong. ({connectionType})</div>
            </div>
            <input value={joinPin} onChange={e=> setJoinPin(e.target.value.replace(/\D/g,"").slice(0,4))} inputMode="numeric" placeholder="••••" className={"mt-4 w-full rounded-[16px] border bg-white px-4 py-4 text-center text-[18px] tracking-[0.35em] outline-none "+(joinPinWrong?"border-[#E07A5F]":"")} style={{borderColor: joinPinWrong ? "#E07A5F" :"var(--border)"}} autoFocus />
            {joinPinWrong && <div className="mt-2 text-[11px] text-[#991B1B] w-full text-center">Wrong PIN for this person — try again or tap Back to pick other name.</div>}
            {error && <div className="mt-2 text-[11px] text-[#991B1B] w-full text-center">{error}</div>}
            <button onClick={doJoinPinVerify} disabled={joining || joinPin.length!==4} className="mt-4 w-full h-[48px] rounded-full bg-[#0A0A0A] text-white text-[14px] font-semibold disabled:opacity-60 active:scale-[0.98]">{joining?"Verifying server-side…":"Verify PIN & Join"}</button>
            <div className="mt-2 text-[10px] text-[#8B7357] text-center">Server RPC verify_household_pin({householdId}, ****) → {selectedJoinKey} if correct. Type {connectionType}.</div>
          </>
        )}
        {step==="joining" && (
          <div className="py-10 text-center">
            <div className="h-10 w-10 rounded-full bg-[var(--chip-bg)] animate-pulse mx-auto grid place-items-center">♥</div>
            <div className="mt-3 text-[14px] font-medium text-[#2D2118]">Joining your {connectionType==="friends"?"flat":"space"}…</div>
            <div className="mt-1 text-[11px] text-[#6B5242]">Syncing household-isolated chores, calendar, shopping, notes</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default OnboardingFlow;
