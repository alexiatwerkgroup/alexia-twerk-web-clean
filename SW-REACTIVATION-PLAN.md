# Service Worker Reactivation Plan

**Status:** Pending — schedule dedicated session
**Estimated impact:** Performance +5-8 points (mobile), repeat-visit LCP <500ms, PWA-eligible
**Risk:** Medium — affects all active users; bad SW deploy = broken loading

---

## Current state (2026-05-06)

- `service-worker.js` (v2.0.0) is **well-designed** but **not active**.
  - Strategy: HTML = network-first, assets = stale-while-revalidate
  - App shell pre-cached: /, /index.html, /manifest.json, icons
  - Cross-origin requests bypassed
- `assets/twerkhub-sw-killer.js` is loaded on every page and:
  1. Permanently overrides `navigator.serviceWorker.register()` to reject
  2. One-time: unregisters any SW + wipes Cache API
- Was added 2026-04-25 to kill a buggy old SW (`universal-inject` rewriter).
  That old SW is gone. The killer is now blocking the GOOD v2.0.0.

---

## Reactivation plan (4 phases)

### Phase 1 — Audit (30 min)
- Diff service-worker.js vs the buggy version that was killed
- Verify the `universal-inject` script is fully removed
- Confirm no HTML page has stray `<script src=*universal-inject*>`
- Check that all assets the SW pre-caches still exist + return 200

### Phase 2 — Update killer to whitelist v2.0.0 (1 hour)
Modify `twerkhub-sw-killer.js`:
- Keep the one-time cleanup (unregister old + wipe cache)
- Replace the permanent `register()` shim with a **whitelist** that:
  - Allows registration of `/service-worker.js` ONLY
  - Verifies the SW responds with the correct v2.0.0 marker on install
  - Falls back to no-op if any other URL tries to register
- Add a **kill-switch** via URL param: `?kill_sw=1` → unregister + clear

### Phase 3 — Add registration to platform (30 min)
- Add `<script>` tag at end of body in all HTMLs that calls
  `navigator.serviceWorker.register('/service-worker.js')` after window load
- Add a `localStorage` flag `twk_sw_v2_registered` to skip re-registration
- Listen for `controllerchange` event to reload page once on new SW

### Phase 4 — Stage + deploy (variable)
- Test on local + Vercel preview deployment first
- Open DevTools > Application > Service Workers, verify activation
- Test offline mode (DevTools > Network > Offline)
- Test repeat-visit speed (cached assets should load instantly)
- Deploy to production
- Monitor Sentry/console errors for 24-48h
- Have rollback ready: revert killer, push as emergency

---

## Rollback procedure

If SW causes issues in production:
1. Push update to killer that unregisters all SW + wipes cache (one-time)
2. Force-bump cache version on all assets (`?v=` change)
3. Clear localStorage flag
4. Wait for users to revisit (Cloudflare cache purge accelerates)

---

## Success criteria

- [ ] Lighthouse Performance ≥ 90 mobile (currently ~88-95)
- [ ] PWA category passing (manifest + SW + icons)
- [ ] Repeat-visit LCP < 500ms (measured via Vercel Analytics)
- [ ] Zero increase in 5xx error rate after 48h
- [ ] No customer reports of "page won't load"

---

## Files to modify

```
assets/twerkhub-sw-killer.js    # update to whitelist + add kill-switch
service-worker.js                # verify v2.0.0 strategy, possibly add WebP cache
manifest.json                    # ensure all icons / shortcuts current
[ALL HTMLs]                       # add register() snippet
```

---

## Notes for next session

- DO NOT just delete the killer — leftover users with old SW still need cleanup
- DO NOT enable on all pages at once if possible; consider home-only first as canary
- Coordinate cache-bust strategy with the SW upgrade so users get fresh HTML + SW
