# V9 Fix — full list you reported

1. Main data-loss offline queue
- Before: enqueueMutation set couple_v1_last_mutation BEFORE Supabase; reconnect remoteSave saw same id → return true → queue deleted without write
- Fix: offline path does NOT set last_mutation; last_mutation only after verified server write; remoteSave verifies remote meta.lastMutationId before skipping duplicate

2. Saved indicator bullshit
- Before: remoteLoad set last_sync, applying remote set Saved, receiving realtime set Saved, touchSync on tab nav fabricated Saved, initial assumed Saved from LS
- Fix: remoteLoad no longer sets last_sync or had_remote; applyRemoteSnapshot does NOT mark Saved; touchSync no longer fabricates; initial status is unknown unless queue exists; realtime push only updates via merge guard; only verified remoteSave sets last_sync/had_remote/last_mutation

3. Transient empty wipe
- Before: empty write allowed if had_remote==1, so hydration failure could overwrite row with 4 empties
- Fix: empty write blocked unless allowEmpty:true; no exception based on had_remote; log "block empty write - would wipe row"

4. Whole household rewrite
- Note: single row architecture remains (client-side merge). Mitigation: revision CAS + mergeById + verification of server revision advancement; withTimestamps no longer manufactures now for stale records (see 5)

5. Manufactures timestamps
- Before: withTimestamps added now to every item missing updatedAt, making stale look fresh
- Fix: withTimestamps preserves existing updatedAt/updated_at/createdAt, no new now; only true new items get timestamp outside (via caller mutationId path)

6. Saved before server verification
- Before: remoteSave returned true/false, caller assumed rev+1 and marked Saved
- Fix: remoteSave verifies server meta.lastMutationId===sent, checks revision advanced, sets LS revision from server row (not old+1); caller no longer assumes rev+1; only server-confirmed path sets Saved

7. Real DB inspector removed
- Before: DebugCenter function existed but never mounted
- Fix: DebugCenter restored inside BlueprintPanel Developer panel — shows direct remote load, true remote counts, raw JSON, Force pull, Row health, Realtime test, Local vs Remote counts, manual env override, copy debug JSON; visible with ?debug=1 or localStorage couple_v1_debug=1 or localhost
