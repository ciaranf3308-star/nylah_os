import { spaceQueryClient } from "@hatch/space-sdk/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { WhiteFixErrorBoundary } from "./App";
import "./theme.css";

const rootEl = document.querySelector<HTMLElement>("[data-generated-space-root]");
if (!rootEl) {
  throw new Error("missing generated space root element");
}

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
