import React from "react";
import type { PersonKey } from "../../types";
import { PERSONS } from "../../constants/themes";

export function WhoScreen({ onPick, onSelect }: { onPick?: (k: PersonKey)=>void; onSelect?: (k: PersonKey)=>void }) {
  const pick = (k: PersonKey) => { (onPick||onSelect)?.(k); };
  return (
    <div className="min-h-[100vh] flex flex-col items-center justify-center px-6 py-10" style={{background:"linear-gradient(180deg,var(--wash-top),var(--card-bg))"}}>
      <div className="w-full max-w-[344px] flex flex-col gap-4">
        <div className="text-center mb-2">
          <div className="text-[26px] font-semibold tracking-tight" style={{fontFamily:'Fraunces, serif', color:'var(--text)'}}>Who's there?</div>
          <div className="text-[11px] uppercase tracking-wide text-[var(--muted)] mt-1">private • just you two</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(["aisling","ciaran"] as PersonKey[]).map(k=>{
            const p = PERSONS[k];
            return (
              <button
                key={k}
                onClick={()=> pick(k)}
                className="h-[96px] min-h-[44px] rounded-[22px] border bg-[var(--card-bg)] flex flex-col items-center justify-center gap-2 active:scale-[0.98] transition"
                style={{borderColor:'var(--border)', transitionTimingFunction:'cubic-bezier(0.34,1.56,0.64,1)', transitionDuration:'180ms'}}
              >
                <span className="grid h-[44px] w-[44px] place-items-center rounded-full text-[16px] font-bold text-white border-2 border-white shadow-sm" style={{background:p.accent2}}>{p.initial}</span>
                <span className="text-[13px] font-semibold" style={{color:'var(--text)'}}>{p.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
export default WhoScreen;
