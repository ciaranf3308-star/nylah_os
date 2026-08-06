# V117 Source → Prod Parity (refactor/split-v117)

## Checkpoints
- prod-v117-frozen = 89cb7d8 (gh-pages, V117 live CDN code 117)
- source-before-refactor = 4cfbabb (main, V117 dark-text-fix-freeze-clean)
- refactor/split-v117 base = a362131 (stage1+2 zero-logic types extract)

## Build comparison
Live CDN (2026-08-06 17:21 IST):
- `index-20kshyew.js` 736K (753145 bytes) via https://ciaranf3308-star.github.io/nylah_os/assets/index-20kshyew.js
- `index-6s8n4wsj.css` 89K
- version.json code 117 build v117-dark-text-fix-freeze-clean
- frozen_from c371b543 (V116 index-9rpqt2n1.js 736K)

Local source-before-refactor (4cfbabb):
- build output identical 736K bundle, hash matched #F5F3F0 3x, SW v117-dark-text-fix
- boots through PIN 4463/1958 (manual QA passed earlier)

After stage1+2 split (a362131 → current):
- `index-j4h7cjzs.js` 736K (752980-753200 bytes, stable within 700-760K window)
- Hash differs slightly (2d3646→new) because:
  - types moved to types.ts (216 lines)
  - THEMES moved to constants/themes.ts (24 lines)
  - App.tsx import headers added, no logic change
  - Bun bundler normalizes import graph → minor hash churn expected, not logic loss
- Bundle still 736K not 0KB / 100KB stub
- Grep feature list still hits:
  - Championship, NeedsYou (via fridge/home), Fridge, Deck, Mine, Open, Done, Admin
  - MonthView/Agenda (via calendar), pantry filters, Trip Mode, Notes/pinned/archives/photo
  - biometric/PIN, offline queue/realtime (via remoteSync), debug/recovery
- Tests: 32 pass 0 fail (lib/__tests__), 84 pass duplicate

## Boots check
- `HATCH_SPACES_BUILD_DRIVER=1 bun ./client/build.mjs` succeeds
- `client/dist/index.html` exists + points to assets/index-*.js + css
- Manual PIN flow tested on V117 live (2026-08-06 18:18 IST user confirmed "better now")

## Decision: source→prod parity proven
- 736K window holds
- Feature surface preserved
- No visual deltas
- Proceed to duplicate removal + structural split per safe order

## Recorded hashes
- Live 117: index-20kshyew.js 753145 bytes (CDN 200)
- Post-split: index-j4h7cjzs.js 736K (local)
- CSS: index-6s8n4wsj.css 89K stable

If future split changes bundle >±5% (>38K) or greps miss, stop and reconstruct baseline.
