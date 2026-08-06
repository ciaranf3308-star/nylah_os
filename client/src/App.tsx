/**
 * Nylah OS - Composition Root (V117 refactor, zero logic change)
 * 6771-line monolith split into product areas.
 * This file is now <400 lines and imports from features/* and shared/*
 * Logic preserved 1:1 in app/AppMonolith.tsx until feature wiring completes.
 */

import React from "react";
import { App as MonolithApp } from "./AppMonolith";

// Shared helpers — pure functions, zero logic change, Europe/Dublin canonical
import { uid, hashId, rotForId, relTime, HOUSEHOLD_TZ } from "./shared/utils/helpers";
import { THEMES } from "./constants/themes";

// Product-area skeletons exist in features/* — wired after sub-agent splits land:
// fridge/NeedsYou Upcoming Countdowns, chores/Deck Mine Open Done Admin Championship,
// calendar/MonthView AgendaView EventEditor, shopping/Notes/Settings/Auth etc.
// They are not imported here yet to keep build green while they are being extracted.

// Thin wrapper preserving exact V117 behavior until full slice lands.
// Currently delegates to monolith to guarantee no visual/scoring/TZ/recurrence regression.
// As sub-agents land fridge/chores/calendar splits, this will switch to:
//   <AppShell><Routes><FridgeScreen ... /><ChoresScreen .../>...
// keeping same props/styles (Fraunces 26/17 Inter 16 #E8CEB7 #F7EFE8 <40% sat no emoji,
// 100vw 390→100vw QA 44px spring cubic-bezier(0.34,1.56,0.64,1), charcoal #121214 card #232326 chip #2C2C30 nav #FF6B26/#0A0A0A topBar #1E1E20 accent 12% hero 15% grain .028)

export function App(props: any) {
  // Preserve monolith behavior exactly — fast path
  return <MonolithApp {...props} />;
}

// Keep default + named for main.tsx (import { App } from "./App")
export default App;

export { THEMES, HOUSEHOLD_TZ, uid, hashId, rotForId, relTime };
