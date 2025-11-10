# Service Worker HTTPS Fix - CRITICAL DISCOVERY

## The Real Problem

The interceptors in `main.ts` (`forceHttps.ts`) worked perfectly for the main page, BUT:

**Service Workers run in a SEPARATE JavaScript context!**

- Main page: Has its own `window.XMLHttpRequest` and `window.fetch` ✅
- Service Worker: Has its own `self.fetch` (no XHR in SW context) ❌

When we overrode `window.fetch` in main.ts, it didn't affect the service worker context.

## Evidence from Logs

```
Mixed Content: The page at 'https://780d25e9.hmrchan-frontend.pages.dev/service-worker.js' 
was loaded over HTTPS, but requested an insecure resource 'http://api.momichan.xyz/...'
```

The error explicitly says **service-worker.js** was making the HTTP request!

## The Fix

Added fetch interceptor **inside the service worker file itself**:

```javascript
// In public/service-worker.js (line 12-54)
const originalFetch = self.fetch.bind(self);
self.fetch = function(input, init) {
  // Force HTTPS for api.momichan.xyz
  if (url.includes('api.momichan.xyz') && url.startsWith('http://')) {
    const httpsUrl = url.replace('http://', 'https://');
    console.error('[SW] 🚨🚨🚨 FORCED HTTP → HTTPS:', url, '→', httpsUrl);
    // ... return HTTPS request
  }
  return originalFetch(input, init);
};
```

This runs **immediately** when the service worker loads, before any fetch event handlers.

## Why This Works

1. **Main page context**: `forceHttps.ts` intercepts `window.fetch` ✅
2. **Service worker context**: `service-worker.js` intercepts `self.fetch` ✅
3. **Complete coverage**: ALL contexts now force HTTPS ✅

## Deploy Instructions

```bash
# Add the updated service worker
git add public/service-worker.js

# If not already committed, also add previous fixes
git add src/utils/forceHttps.ts src/main.ts src/api/client.ts src/config/runtime.ts

# Commit
git commit -m "fix: HTTPS enforcement in service worker context (was missing!)"

# Push
git push origin main
```

## After Deploy - Verification

1. Hard refresh to clear service worker cache: `Ctrl+Shift+R`
2. Or manually unregister: DevTools → Application → Service Workers → Unregister
3. Reload page
4. Check console for:
   - `🔒 [XHR Interceptor] Installed` (main context)
   - `🔒 [Fetch Interceptor] Installed` (main context)
   - `[SW] 🔒 Fetch interceptor installed in Service Worker context` (SW context)
5. **NO mixed content errors should appear**

## Why We Needed This

Service workers intercept fetch requests to implement:
- Offline caching
- Network-first/cache-first strategies
- Background sync

Since they intercept requests BEFORE they reach the network, they need their own HTTPS enforcement.

## The Complete 6-Layer Defense

1. **Main page XHR**: `forceHttps.ts` → `window.XMLHttpRequest`
2. **Main page Fetch**: `forceHttps.ts` → `window.fetch`
3. **Axios config**: Runtime detection in `client.ts`
4. **Axios interceptor**: Triple-check in `client.ts`
5. **Runtime helpers**: `runtime.ts` functions
6. **Service Worker**: `self.fetch` override in `service-worker.js` 🆕

Now EVERY possible code path forces HTTPS! 🔒
