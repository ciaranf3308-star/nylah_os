import { createRoot } from "react-dom/client";
import React from "react";
import { App } from "./App";
import "./theme.css";

// V174 self-heal: old queue with camelCase caused upsert error -> Sync failed stuck + PWA stale 172
// V181 update: normalize fix now uses `data` column (jsonb), so camelCase inside payload.data is legit.
// Only wipe when retries stuck or payload missing hid/id, NOT on camelCase inside payload.
try{
  const raw = localStorage.getItem('idb_mutation_queue');
  if(raw){
    try{
      const arr = JSON.parse(raw);
      if(Array.isArray(arr) && arr.length>0){
        let dirty = false;
        for(const o of arr){
          if(!o) continue;
          if((o.retries||0)>=3){ dirty = true; break; }
          // old bug: top-level column mismatch caused PGRST204 - those rows had no household_id or missing id
          if(!o.id || !o.household_id){ dirty = true; break; }
          // old v172-v173 stored cleanRow with bad columns like deletedAt at top-level (not inside data) - those would have been at o.payload.deletedAt with retries
          // but we no longer treat payload camelCase inside data as dirty because data blob is jsonb
        }
        if(dirty){
          console.log('[beirt v181 self-heal] clearing stuck queue', arr.length);
          // keep household safe, just wipe queue - server will be source of truth on next load
          try{ localStorage.removeItem('idb_mutation_queue'); }catch{}
          try{ localStorage.removeItem('couple_v1_queue_count'); }catch{}
          try{ localStorage.setItem('idb_mutation_queue','[]'); }catch{}
          try{ localStorage.setItem('couple_v1_queue_count','0'); }catch{}
          try{ localStorage.removeItem('couple_v1_last_push_err'); }catch{}
          try{ indexedDB.deleteDatabase('couple_v1_idb'); }catch{}
          // force SW update if still on 172
          try{
            if('serviceWorker' in navigator){
              navigator.serviceWorker.getRegistrations().then(regs=>{
                for(const r of regs){ try{ r.update(); }catch{} }
              }).catch(()=>{});
              // also clear caches if >1 day old stuck
              if('caches' in window){
                // @ts-ignore
                caches.keys().then(keys=>{ for(const k of keys){ try{ caches.delete(k) }catch{} } }).catch(()=>{})
              }
            }
          }catch{}
        }
      }
    }catch{}
  }
  // also if version.json says 173+ but local code is old, force SW update on load
  try{
    const codeRaw = localStorage.getItem('couple_v1_app_code');
    const code = codeRaw ? Number(JSON.parse(codeRaw)) : Number(codeRaw||0);
    if(code && code < 173){
      if('serviceWorker' in navigator){
        navigator.serviceWorker.getRegistrations().then(regs=>{
          for(const r of regs){ try{ r.update(); }catch{} }
        }).catch(()=>{});
      }
    }
  }catch{}
}catch{}

// V159 outside-login wipe — ?wipe=1 clears stale cache before anything loads
try{
  const sp = new URLSearchParams(location.search);
  if(sp.get("wipe")==="1" || sp.has("wipe")){
    const keep = new Set(["couple_v1_supabase_url","couple_v1_supabase_anon","couple_v1_supabase_anon_key"]);
    try{
      const del:string[]=[];
      for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k && k.startsWith("couple_v1_") && !keep.has(k)) del.push(k); for(let j=0;j<localStorage.length;j++){ const k2=localStorage.key(j); if(k2 && k2.startsWith("idb_")) del.push(k2); break; } }
      // second pass for idb_ prefix clean
      for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k && k.startsWith("idb_")) del.push(k); }
      for(const k of del){ try{ localStorage.removeItem(k); }catch{} }
    }catch{}
    try{ indexedDB.deleteDatabase("couple_v1_idb"); }catch{}
    sp.delete("wipe");
    try{ const qs=sp.toString(); const next=location.pathname+(qs?"?"+qs:"")+ (location.hash||""); history.replaceState(null,"",next); }catch{}
  }
}catch{}

class ErrorBoundary extends React.Component<any,{hasError:boolean; err:any}>{
  constructor(p:any){ super(p); this.state={hasError:false, err:null} }
  static getDerivedStateFromError(err:any){ return {hasError:true, err} }
  componentDidCatch(e:any){ console.error("[beirtos] boundary", e) }
  render(){
    if(this.state.hasError){
      return React.createElement("pre",{style:{padding:"16px",margin:"16px",borderRadius:"12px",background:"#F5F3F0",color:"#0A0A0A",whiteSpace:"pre-wrap",font:"12px/1.4 ui-monospace",border:"1px solid #E8DDD3"}}, `Beirt error - tap to reload\n${this.state.err?.message||this.state.err}\n\n${this.state.err?.stack||""}`);
    }
    return this.props.children;
  }
}

function mount() {
  const raw = document.querySelector<HTMLElement>("[data-generated-space-root]") ||
              document.getElementById("root") as any;
  let rootEl = raw as any;
  if (!rootEl) {
    rootEl = document.createElement("div");
    rootEl.id = "root";
    document.body.appendChild(rootEl);
  }
  // clear white
  rootEl.innerHTML = "";
  try {
    createRoot(rootEl).render(
      <div className="hatch-space-root" data-hatch-space-root>
        <ErrorBoundary><App /></ErrorBoundary>
      </div>
    );
  } catch (e: any) {
    rootEl.innerHTML = `<pre style="padding:16px;color:#8B5E3C;background:#FFFEFB">Beirt mount error: ${e?.message||e}\n${e?.stack||""}</pre>`;
    console.error(e);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  });
}

window.addEventListener("error", (ev)=>{
  const el = document.getElementById("nylah-error");
  if (!el) {
    const d = document.createElement("div");
    d.id = "nylah-error";
    d.style.cssText = "position:fixed;bottom:0;left:0;right:0;background:#8B5E3C;color:#FFFEFB;padding:8px 12px;font:12px/14px system-ui;z-index:99999";
    d.textContent = "JS error: " + (ev.message || ev.error?.message || "unknown");
    document.body.appendChild(d);
  }
});
