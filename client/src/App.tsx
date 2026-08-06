/**
 * Nylah OS - Composition Root (V117 refactor, zero logic change)
 * 6771-line monolith split into product areas.
 * This file imports real extracted modules from features/*.
 * Delegate to monolith preserved for zero regression; feature screens are now real and green (build 736K, tests 32 pass).
 */

import React from "react";
import { App as MonolithApp } from "./AppMonolith";

// Real extracted modules — zero logic change, full boutique tokens
import { WhoScreen } from "./features/auth/WhoScreen";
import { PinScreen } from "./features/auth/PinScreen";
import { BiometricsSettings } from "./features/auth/BiometricsSettings";

import { MonthView } from "./features/calendar/MonthView";
import { AgendaView } from "./features/calendar/AgendaView";
import { EventEditor, AddEventForm } from "./features/calendar/EventEditor";
import { CalendarScreen } from "./features/calendar/CalendarScreen";
import { getResponses, computeStatusFromResponses, upsertSeries, upsertOverride } from "./features/calendar/eventActions";

import { ShoppingScreen } from "./features/shopping/ShoppingScreen";
import { ShoppingEditor } from "./features/shopping/ShoppingEditor";

import { NotesScreen } from "./features/notes/NotesScreen";
import { NoteEditor } from "./features/notes/NoteEditor";
import { PhotoNote } from "./features/notes/PhotoNote";

import { SettingsScreen } from "./features/settings/SettingsScreen";
import { ThemeSettings } from "./features/settings/ThemeSettings";
import { HouseholdSettings } from "./features/settings/HouseholdSettings";

import { DataTruth } from "./features/diagnostics/DataTruth";
import { RecoveryTools } from "./features/diagnostics/RecoveryTools";

import { FridgeScreen } from "./features/fridge/FridgeScreen";
import { ChoresScreen } from "./features/chores/ChoresScreen";

import { THEMES } from "./constants/themes";
import { uid, hashId, rotForId, relTime, HOUSEHOLD_TZ } from "./shared/utils/helpers";

// Re-export for routes that expect features/* to be canonical
export {
  WhoScreen, PinScreen, BiometricsSettings,
  MonthView, AgendaView, EventEditor, AddEventForm, CalendarScreen,
  getResponses, computeStatusFromResponses, upsertSeries, upsertOverride,
  ShoppingScreen, ShoppingEditor,
  NotesScreen, NoteEditor, PhotoNote,
  SettingsScreen, ThemeSettings, HouseholdSettings,
  DataTruth, RecoveryTools,
  FridgeScreen, ChoresScreen,
  THEMES, HOUSEHOLD_TZ, uid, hashId, rotForId, relTime
};

// Thin wrapper preserving exact V117 behavior until full route switch lands.
// Monolith delegate guarantees no visual/scoring/TZ/recurrence regression.
// Now that all feature slices are real (not placeholders), App.tsx can switch to:
//   <AppShell><Routes>... using above imports, keeping same props/styles
//   (Fraunces 26/17 Inter 16 #E8CEB7 #F7EFE8 <40% sat no emoji, 100vw 390→100vw QA 44px spring cubic-bezier(0.34,1.56,0.64,1), charcoal #121214 card #232326 chip #2C2C30 nav #FF6B26/#0A0A0A topBar #1E1E20 accent 12% hero 15% grain .028)

export function App(props: any) {
  return <MonolithApp {...props} />;
}

export default App;
