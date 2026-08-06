import { spaceQueryClient } from "@hatch/space-sdk/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { WhiteFixErrorBoundary } from "./App";
import "./theme.css";

// Global error trap - turns white screen into visible message
try {
  // @ts-ignore
  window.addEventListener("error", (e:any)=>{
    try{
      console.error("[Nylah boot error]", e?.message||e, e?.error);
      const el=document.querySelector("[data-generated-space-root]") as HTMLElement;
      if(el && !el.innerHTML) {
        el.innerHTML='<div style="min-height:100dvh;display:grid;place-items:center;padding:24px;background:#FFFCF8;color:#292624;font:14px system-ui"><div style="max-width:320px;text-align:center"><div style="font-family:Fraunces,serif;font-size:18px;font-weight:600;margin-bottom:8px">Boot hiccup — tap to reload</div><div style="opacity:.7;font-size:12px;margin-bottom:12px;white-space:pre-wrap;max-height:120px;overflow:auto">'+(e?.message||e?.error?.message||'unknown')+'</div><button style="height:44px;border-radius:9999px;padding:0 20px;background:#0A0A0A;color:#fff;font-size:13px" onclick="try{localStorage.clear();sessionStorage.clear()}catch{};if(window.caches){caches.keys().then(k=>k.forEach(x=>caches.delete(x)))};if(navigator.serviceWorker){navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister()))};location.reload()">Clear cache & reload</button></div></div>';
      }
    }catch{}
  });
  // @ts-ignore
  window.addEventListener("unhandledrejection", (e:any)=>{ console.error("[Nylah unhandled]", e?.reason); });
} catch {}

const rootEl = document.querySelector<HTMLElement>("[data-generated-space-root]");
if (!rootEl) {
  throw new Error("missing generated space root element");
}

try {
  createRoot(rootEl).render(
    <WhiteFixErrorBoundary>
      <StrictMode>
        <QueryClientProvider client={spaceQueryClient}>
          <div className="hatch-space-root" data-hatch-space-root>
            <App />
          </div>
        </QueryClientProvider>
      </StrictMode>
    </WhiteFixErrorBoundary>,
  );
} catch (e:any) {
  console.error("[Nylah root render failed]", e);
  rootEl.innerHTML = '<div style="min-height:100dvh;display:grid;place-items:center;padding:24px;background:#FFFCF8"><div style="max-width:320px;text-align:center"><div style="font-size:18px;font-weight:600;margin-bottom:8px">Render failed — tap to reload</div><div style="font-size:12px;opacity:.7;margin-bottom:12px">'+(e?.message||'')+'</div><button style="height:44px;border-radius:9999px;padding:0 20px;background:#0A0A0A;color:#fff" onclick="location.reload()">Reload</button></div></div>';
}
