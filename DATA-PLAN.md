# Data Plan

**Strategy**: client-only (no server).

**Rationale**: User-input-only couple app — chores/calendar/shopping/notes all from localStorage primary (keys couple_v1_*), 2-phone merge via direct browser fetch to Apps Script URL client-side, no server actions, no DB, shareable Hatch link as requested.

This web artifact has no server surface: no actions, no database, and no external data sources. State lives in the browser. If it later needs a server, update the plan via `web_artifact_submit_plan` with `data_strategy.kind = "internal_data"` or `"external_data"`.
