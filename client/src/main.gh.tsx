import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./theme.css";

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
        <App />
      </div>
    );
  } catch (e: any) {
    rootEl.innerHTML = `<pre style="padding:16px;color:#8B5E3C;background:#FFFEFB">Nylah mount error: ${e?.message||e}\n${e?.stack||""}</pre>`;
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
