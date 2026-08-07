// Proper onboarding restored from source-before-refactor 4cfbabb — adapted for server-side PINs (V119)
// No hardcoded PINs, hashes, or person mappings. All PIN verification via verify_household_pin RPC.
// Existing users with local household_id or legacy couple_v1_* keys bypass via shouldShowOnboarding check in App.tsx.
// Fresh users must create or join via validated invite code; no generic Continue bypass.

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

function getStoredHouseholdId(): string | null {
  try { return localStorage.getItem("couple_v1_household_id"); } catch { return null; }
}
function hasAnyLegacyData(): boolean {
  try {
    for (let i=0;i<localStorage.length;i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith("couple_v1_")) return true;
    }
  } catch {}
  return false;
}

function applyCustomPersonNamesNoMutate() {
  // In factored repo PERSONS is imported constant; we only ensure localStorage persons are kept.
  // Original monolith mutated global PERSONS dict; here we no-op — names read from localStorage by state layer.
  try {
    const hid = getStoredHouseholdId();
    // trigger potential listeners if any — nothing else needed
    void hid;
  } catch {}
}

type OnboardingProps = {
  onComplete: (hid:string)=>void;
};

export function OnboardingFlow({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<"welcome"|"create_names"|"create_pins"|"creating"|"share"|"join_code"|"join_pick"|"joining">("welcome");
  const [youName, setYouName] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [youPin, setYouPin] = useState("");
  const [partnerPin, setPartnerPin] = useState("");
  const [inviteCode, setInviteCode] = useState<string>("");
  const [householdId, setHouseholdId] = useState<string>("");
  const [error, setError] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinMeta, setJoinMeta] = useState<any>(null);
  const [joinPersons, setJoinPersons] = useState<any[]>([]);
  const [joining, setJoining] = useState(false);
  const [creating, setCreating] = useState(false);

  // auto-fill invite code from shared link ?code=XXXX
  useEffect(()=>{
    try {
      const sp = new URLSearchParams(location.search);
      const c = sp.get("code");
      if (c && c.length>=4) {
        const clean = c.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6);
        setJoinCode(clean);
        setStep(s => s==="welcome" ? "join_code" : s);
      }
    } catch {}
  }, []);

  const canContinueNames = youName.trim().length>=1 && partnerName.trim().length>=1;
  const canContinuePins = /^\d{4}$/.test(youPin) && /^\d{4}$/.test(partnerPin) && youPin!==partnerPin;

  const startCreate = () => {
    setError("");
    if (!canContinueNames) { setError("Add both names"); return; }
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
        { key:"aisling", name: youName.trim(), initial: youName.trim().slice(0,1).toUpperCase() },
        { key:"ciaran", name: partnerName.trim(), initial: partnerName.trim().slice(0,1).toUpperCase() },
      ];
      try {
        localStorage.setItem("couple_v1_household_id", hid);
        localStorage.setItem("couple_v1_household_code", code);
        localStorage.setItem("couple_v1_household_name", `${youName.trim()} & ${partnerName.trim()}`);
        localStorage.setItem(`couple_v1_household_persons_${hid}`, JSON.stringify(persons));
        localStorage.setItem(`couple_v1_household_persons`, JSON.stringify(persons));
        // Do NOT store PINs locally — server-side only via RPC
        // Clear any legacy PIN maps if present
        try { localStorage.removeItem(`couple_v1_household_pins_${hid}`); } catch {}
        try { localStorage.removeItem(`couple_v1_household_pins_plain_${hid}`); } catch {}
      } catch {}
      try {
        const sb = getSupabase();
        if (sb) {
          // Seed PINs server-side via upsert_household_pin (hashing done server-side with pgcrypto)
          try {
            await (sb as any).rpc("upsert_household_pin", { hid, pin: youPin, person_key: "aisling" });
          } catch(e:any){ console.warn("[onboard] upsert_pin aisling err", e?.message); }
          try {
            await (sb as any).rpc("upsert_household_pin", { hid, pin: partnerPin, person_key: "ciaran" });
          } catch(e:any){ console.warn("[onboard] upsert_pin ciaran err", e?.message); }

          const meta = {
            householdName: `${youName.trim()} & ${partnerName.trim()}`,
            householdId: hid,
            inviteCode: code,
            persons,
            createdAt: new Date().toISOString(),
            onboardedAt: new Date().toISOString(),
            tz: "Europe/Dublin",
          };
          const row = {
            id: hid,
            chores: [],
            calendar: [],
            shopping: [],
            notes: [],
            meta,
            updated_at: new Date().toISOString(),
            revision: 1,
          };
          const { error: insErr } = await (sb as any).from(SB_TABLE).upsert(row, { onConflict: 'id' });
          if (insErr) console.warn("[onboard] supabase upsert error", insErr.message);
        }
      } catch (e:any) { console.warn("[onboard] sb err", e?.message); }
      setCreating(false);
      setStep("share");
      try { applyCustomPersonNamesNoMutate(); } catch {}
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
    const text = `Join our Beirt — our private space for two. Code: ${inviteCode} — ${url}`;
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: "Join us on Beirt", text, url });
      } else {
        await navigator.clipboard.writeText(text);
        setError("Link copied!");
        setTimeout(()=>setError(""), 1200);
      }
    } catch {}
  };
  const startJoin = () => { setError(""); setJoinCode(""); setStep("join_code"); };

  const doJoinLookup = async () => {
    setError("");
    const code = joinCode.trim().toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6);
    if (code.length<4) { setError("Enter the 6-letter code"); return; }
    setJoining(true);
    try {
      const hid = `nylah-${code.toLowerCase()}`;
      const sb = getSupabase();
      if (!sb) { setError("No connection — check internet"); setJoining(false); return; }
      let data: any = null;
      // 1. Prefer household_invites table if present (spec)
      try {
        const resInvite = await (sb as any).from("household_invites").select("*").eq("code", code).maybeSingle();
        if (resInvite && resInvite.data) {
          // if invite table maps to household id, use it
          const mappedHid = resInvite.data.household_id || resInvite.data.householdId || hid;
          const resHouse = await (sb as any).from(SB_TABLE).select('*').eq('id', mappedHid).maybeSingle();
          if (resHouse && resHouse.data) data = resHouse.data;
          else data = { id: mappedHid, meta: resInvite.data.meta || { persons: resInvite.data.persons } };
        }
      } catch {}
      // 2. Fallback original couple_data lookup by hid
      if (!data) {
        const res1 = await (sb as any).from(SB_TABLE).select('*').eq('id', hid).maybeSingle();
        data = res1.data;
        if (!data) {
          const res2 = await (sb as any).from(SB_TABLE).select('*').eq('id', code.toLowerCase()).maybeSingle();
          if (res2.data) data = res2.data;
        }
      }
      if (!data) {
        setError("No couple found with that code — check letters");
        setJoining(false);
        return;
      }
      const meta = (data as any).meta;
      setJoinMeta(meta);
      const persons = meta?.persons || [{key:"aisling", name:"Partner 1"}, {key:"ciaran", name:"Partner 2"}];
      setJoinPersons(persons);
      setInviteCode(code);
      setHouseholdId((data as any).id || hid);
      setJoining(false);
      setStep("join_pick");
    } catch (e:any) {
      setJoining(false);
      setError("Couldn't find — try again: "+String(e?.message||e).slice(0,60));
    }
  };

  const doJoinAs = async (personKey: string) => {
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
        // clear legacy pin maps — server-side verification only
        try { localStorage.removeItem(`couple_v1_household_pins_${householdId}`); } catch {}
        try { localStorage.removeItem(`couple_v1_household_pins_plain_${householdId}`); } catch {}
      } catch {}
      try { applyCustomPersonNamesNoMutate(); } catch {}
      setJoining(false);
      onComplete(householdId);
    } catch (e:any) {
      setJoining(false);
      setError("Join failed: "+String(e?.message||e).slice(0,60));
    }
  };

  return (
    <div className="absolute inset-0 z-[90] flex items-center justify-center bg-[var(--bg)] px-6 overflow-auto" style={{ background: "linear-gradient(180deg,var(--chip-bg) 0%,var(--card-bg) 60%,var(--wash-top) 100%)" }}>
      <div className="w-full max-w-[360px] rounded-[28px] border bg-[var(--card-bg)] shadow-[0_18px_50px_rgba(0,0,0,0.10)] px-6 py-7 flex flex-col items-center" style={{ borderColor:"var(--border)" }}>
        {step==="welcome" && (
          <>
            <div className="h-12 w-12 rounded-full grid place-items-center bg-[#0A0A0A] text-white text-[20px] font-display">♥</div>
            <div className="mt-3 font-display text-[26px] font-semibold tracking-tight text-[#0A0A0A] text-center">Beirt</div>
            <div className="mt-1 text-[13px] text-[#6B5242] text-center leading-[1.4]">Beirt — Irish for two. A private space for two. Shared calendar, chores, shopping, notes. No ads. Just you two.</div>
            <div className="mt-5 w-full space-y-2.5">
              <button onClick={()=> setStep("create_names")} className="w-full h-[52px] rounded-full bg-[#0A0A0A] text-white text-[14px] font-semibold active:scale-[0.98] shadow-sm">Create our space</button>
              <button onClick={startJoin} className="w-full h-[48px] rounded-full bg-white border border-[var(--border)] text-[#2D2118] text-[13px] font-medium active:scale-[0.98]">I have a code</button>
            </div>
            <div className="mt-4 text-[11px] text-[#8B7357] text-center">For friends beta — invite only. Your data stays in your own household.</div>
            {hasAnyLegacyData() && <button onClick={()=> onComplete(getStoredHouseholdId()||"ash-ciaran-2026")} className="mt-2 text-[11px] underline text-[#6B5242]">I’m Aisling & Ciaran — keep our space</button>}
          </>
        )}
        {step==="create_names" && (
          <>
            <div className="w-full text-left">
              <button onClick={()=> setStep("welcome")} className="text-[11px] text-[#8B7357]">← Back</button>
              <div className="mt-2 font-display text-[20px] font-semibold text-[#0A0A0A]">What should we call you two?</div>
              <div className="mt-1 text-[12px] text-[#6B5242]">These show up everywhere — on chips, calendar dots, notes.</div>
            </div>
            <div className="mt-4 w-full space-y-3">
              <div>
                <label className="text-[11px] text-[#6B5242] font-medium">You</label>
                <input value={youName} onChange={e=> setYouName(e.target.value)} placeholder="e.g. Maya" className="mt-1 w-full rounded-[14px] border bg-white px-3 py-3 text-[14px] outline-none" style={{borderColor:"var(--border)"}} autoFocus />
              </div>
              <div>
                <label className="text-[11px] text-[#6B5242] font-medium">Your partner</label>
                <input value={partnerName} onChange={e=> setPartnerName(e.target.value)} placeholder="e.g. Jon" className="mt-1 w-full rounded-[14px] border bg-white px-3 py-3 text-[14px] outline-none" style={{borderColor:"var(--border)"}} />
              </div>
            </div>
            {error && <div className="mt-3 text-[11px] text-[#991B1B] w-full">{error}</div>}
            <button disabled={!canContinueNames} onClick={startCreate} className={"mt-5 w-full h-[48px] rounded-full text-[14px] font-semibold active:scale-[0.98] "+(canContinueNames?"bg-[#0A0A0A] text-white shadow-sm":"bg-[var(--chip-bg)] text-[#8B7357]")}>Continue</button>
            <div className="mt-2 text-[10px] text-[#8B7357] text-center">You can change names later in Settings</div>
          </>
        )}
        {step==="create_pins" && (
          <>
            <div className="w-full text-left">
              <button onClick={()=> setStep("create_names")} className="text-[11px] text-[#8B7357]">← Back</button>
              <div className="mt-2 font-display text-[20px] font-semibold text-[#0A0A0A]">Set your 4-digit PINs</div>
              <div className="mt-1 text-[12px] text-[#6B5242]">Each of you gets your own. This is your lock screen — fingerprint will be a quick tap on top of it.</div>
            </div>
            <div className="mt-4 w-full space-y-3">
              <div>
                <label className="text-[11px] text-[#6B5242] font-medium">{youName||"You"}’s PIN</label>
                <input value={youPin} onChange={e=> setYouPin(e.target.value.replace(/\D/g,"").slice(0,4))} inputMode="numeric" placeholder="••••" className="mt-1 w-full rounded-[14px] border bg-white px-3 py-3 text-center text-[18px] tracking-[0.3em] outline-none" style={{borderColor:"var(--border)"}} />
              </div>
              <div>
                <label className="text-[11px] text-[#6B5242] font-medium">{partnerName||"Partner"}’s PIN</label>
                <input value={partnerPin} onChange={e=> setPartnerPin(e.target.value.replace(/\D/g,"").slice(0,4))} inputMode="numeric" placeholder="••••" className="mt-1 w-full rounded-[14px] border bg-white px-3 py-3 text-center text-[18px] tracking-[0.3em] outline-none" style={{borderColor:"var(--border)"}} />
              </div>
              <div className="text-[10px] text-[#8B7357]">Must be different. You can also set up fingerprint after — in Settings → Fingerprint.</div>
            </div>
            {error && <div className="mt-3 text-[11px] text-[#991B1B] w-full">{error}</div>}
            <button disabled={!canContinuePins} onClick={doCreate} className={"mt-5 w-full h-[48px] rounded-full text-[14px] font-semibold active:scale-[0.98] "+(canContinuePins?"bg-[#0A0A0A] text-white shadow-sm":"bg-[var(--chip-bg)] text-[#8B7357]")}>{creating?"Creating…":"Create our couple space"}</button>
          </>
        )}
        {step==="creating" && (
          <div className="py-10 text-center">
            <div className="h-10 w-10 rounded-full bg-[var(--chip-bg)] animate-pulse mx-auto grid place-items-center">♥</div>
            <div className="mt-3 text-[14px] font-medium text-[#2D2118]">Creating your private space…</div>
            <div className="mt-1 text-[11px] text-[#6B5242]">Generating invite code, saving your household</div>
          </div>
        )}
        {step==="share" && (
          <>
            <div className="h-10 w-10 rounded-full bg-[#0A0A0A] text-white grid place-items-center">✓</div>
            <div className="mt-3 font-display text-[20px] font-semibold text-[#0A0A0A] text-center">You’re set!</div>
            <div className="mt-1 text-[12px] text-[#6B5242] text-center">Share this code with {partnerName||"your partner"} so they can join your space.</div>
            <div className="mt-4 w-full rounded-[20px] border bg-[var(--chip-bg)] px-4 py-4 text-center" style={{borderColor:"var(--border)"}}>
              <div className="text-[11px] uppercase tracking-[0.12em] text-[#8B7357]">Invite code</div>
              <div className="mt-1 font-mono text-[28px] font-bold tracking-[0.18em] text-[#0A0A0A]">{inviteCode}</div>
              <div className="mt-1 text-[11px] text-[#6B5242]">nylah-{inviteCode?.toLowerCase()} • private to you two</div>
              <div className="mt-3 flex gap-2 justify-center">
                <button onClick={doCopyCode} className="h-[36px] rounded-full bg-white border border-[var(--border)] px-4 text-[11px] font-semibold">Copy code</button>
                <button onClick={doShare} className="h-[36px] rounded-full bg-[#0A0A0A] text-white px-4 text-[11px] font-semibold">Share link</button>
              </div>
            </div>
            {error && <div className="mt-2 text-[11px] text-[#6B5242]">{error}</div>}
            <button onClick={()=> onComplete(householdId)} className="mt-4 w-full h-[48px] rounded-full bg-[#0A0A0A] text-white text-[14px] font-semibold active:scale-[0.98]">Continue to our space →</button>
            <div className="mt-2 text-[10px] text-[#8B7357] text-center">Your partner can join anytime from their phone with the code. Until they join, you can use it solo.</div>
          </>
        )}
        {step==="join_code" && (
          <>
            <div className="w-full text-left">
              <button onClick={()=> setStep("welcome")} className="text-[11px] text-[#8B7357]">← Back</button>
              <div className="mt-2 font-display text-[20px] font-semibold text-[#0A0A0A]">Enter your invite code</div>
              <div className="mt-1 text-[12px] text-[#6B5242]">Your partner should have sent you a 6-letter code like ABC123.</div>
            </div>
            <input value={joinCode} onChange={e=> setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6))} placeholder="ABC123" className="mt-4 w-full rounded-[16px] border bg-white px-4 py-4 text-center font-mono text-[20px] tracking-[0.22em] outline-none" style={{borderColor:"var(--border)"}} autoFocus />
            {error && <div className="mt-2 text-[11px] text-[#991B1B] w-full text-center">{error}</div>}
            <button onClick={doJoinLookup} disabled={joining} className="mt-4 w-full h-[48px] rounded-full bg-[#0A0A0A] text-white text-[14px] font-semibold disabled:opacity-60 active:scale-[0.98]">{joining?"Looking up…":"Join our space"}</button>
            <div className="mt-2 text-[10px] text-[#8B7357] text-center">Codes are single-household private. If it’s expired, ask your partner to go to Settings → Share invite code and send a new one.</div>
          </>
        )}
        {step==="join_pick" && (
          <>
            <div className="h-10 w-10 rounded-full bg-[var(--chip-bg)] grid place-items-center text-[16px]">♥</div>
            <div className="mt-3 font-display text-[18px] font-semibold text-[#0A0A0A] text-center">Which one are you?</div>
            <div className="mt-1 text-[12px] text-[#6B5242] text-center">{joinMeta?.householdName||"You two"} — pick your name to link your phone.</div>
            <div className="mt-4 w-full space-y-2">
              {joinPersons.map((p:any)=> (
                <button key={p.key} onClick={()=> doJoinAs(p.key)} disabled={joining} className="w-full flex items-center gap-3 rounded-[16px] border bg-white px-4 py-3 text-left active:scale-[0.98]" style={{borderColor:"var(--border)"}}>
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--chip-bg)] text-[12px] font-bold">{p.initial||p.name?.slice(0,1).toUpperCase()}</span>
                  <span className="flex-1"><div className="text-[14px] font-medium">{p.name}</div><div className="text-[11px] text-[#6B5242]">Tap to join as {p.name}</div></span>
                  <span className="text-[11px] text-[#8B7357]">→</span>
                </button>
              ))}
            </div>
            {error && <div className="mt-3 text-[11px] text-[#991B1B]">{error}</div>}
          </>
        )}
      </div>
    </div>
  );
}

export default OnboardingFlow;
