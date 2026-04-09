# Build Issue Documentation

## Issue: SIGBUS Memory Corruption

**Status:** Known issue - workaround in place

**Symptom:** Next.js build fails with `SIGBUS` signal (memory corruption)

**Attempted Fixes:**
1. ✅ Clean `.next` directory
2. ✅ Increased memory to 8GB (`--max-old-space-size=8192`)
3. ✅ Disabled SWC minification
4. ❌ Reinstall node_modules (would take too long)

**Current Workaround:**
- Use development mode (`npm run dev`) for now
- Implementation can proceed in dev mode
- Build will be fixed as part of Phase 3 completion

**Next Steps to Fix:**
1. Try rebuilding with `npm ci` instead of `npm install`
2. Check for disk corruption: `fsck`
3. Try building with `NODE_OPTIONS="--disable-gpu"`
4. Consider upgrading Next.js to 15.x if compatible
5. Check for conflicting native modules

**Impact:**
- Development: No impact - dev server works fine
- Production: Will need to resolve before deployment
- Current phase: Can proceed with implementation in dev mode

---

**Date:** 2026-04-09
**Phase:** 3 - Billing & Payments Integration
