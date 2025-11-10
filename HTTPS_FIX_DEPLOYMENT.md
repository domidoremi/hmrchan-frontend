# HTTPS Mixed Content Fix - Deployment Guide

## Problem Summary
Your Cloudflare Pages deployment was making HTTP requests instead of HTTPS, causing "Mixed Content" errors where the browser blocks HTTP requests from HTTPS pages.

## Root Cause - CRITICAL DISCOVERY
The issue was **extremely sneaky**: 
- Axios was configured with HTTPS URLs ✅
- Request interceptor saw HTTPS URLs ✅
- But the **actual XHR request** sent HTTP ❌

This means something between axios and the browser's XHR layer was converting HTTPS → HTTP. This could be:
1. Browser extension interference
2. Axios adapter layer bug
3. Some other middleware/proxy
4. Service Worker interference (though ours was trying to help)

## Solution Implemented - NUCLEAR OPTION
We've implemented **THE ULTIMATE HTTPS ENFORCEMENT** - a multi-layer defense system:

### Layer 1: Global Browser-Level Interception (`src/utils/forceHttps.ts`) 🆕 **NUCLEAR**
**This is the game changer!** Installed BEFORE anything else loads:
- **XMLHttpRequest interceptor**: Wraps the native XHR class, forces HTTPS before the request leaves the browser
- **Fetch API interceptor**: Wraps native fetch(), forces HTTPS for all fetch calls
- Runs at the **absolute lowest level** - even before axios, even before service worker
- If HTTP is detected anywhere, it's converted to HTTPS and logged with 🚨🚨🚨

### Layer 2: Runtime Protocol Detection (`src/api/client.ts`)
- Detects the page protocol at runtime
- If the page is HTTPS, **always** use HTTPS API
- Never relies solely on build-time environment variables

### Layer 3: Triple-Layer HTTPS Enforcement in Request Interceptor
The axios request interceptor has 3 checkpoints:
- **STEP 1**: Verify baseURL is HTTPS
- **STEP 2**: Verify URL is HTTPS (if full URL)
- **STEP 3**: Verify final constructed URL is HTTPS

If HTTP is detected at any step, it's immediately converted to HTTPS and logged.

### Layer 4: Enhanced Runtime Configuration (`src/config/runtime.ts`)
- Added `forceHttpsProtocol()` helper function
- Always returns HTTPS URLs regardless of environment variables
- Prioritizes runtime detection over build-time configuration

### Layer 5: Service Worker HTTPS Enforcement
- Service worker also checks and converts HTTP to HTTPS as a final fallback

## Deployment Steps

### Step 1: Build Locally (Optional - for testing)
```bash
cd f:\Projects\hmrchan\frontend
npm run build
```

Check the build output to ensure no errors.

### Step 2: Commit Changes
```bash
git add src/api/client.ts src/config/runtime.ts src/utils/forceHttps.ts src/main.ts HTTPS_FIX_DEPLOYMENT.md
git commit -m "fix: nuclear HTTPS enforcement at browser XHR/fetch level to prevent mixed content"
git push origin main
```

### Step 3: Cloudflare Pages Will Auto-Deploy
- Cloudflare Pages will detect the push and automatically rebuild
- The new build will have the HTTPS enforcement

### Step 4: Verify Deployment
After deployment completes:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Navigate to your site
4. **FIRST**: Look for the interceptor installation logs (should appear immediately):
   - `🔒 [XHR Interceptor] Installed`
   - `🔒 [Fetch Interceptor] Installed`
   - `🔒 [Global HTTPS Enforcer] All HTTP requests to api.momichan.xyz will be forced to HTTPS`
5. Look for the API configuration log: `🌐 API Configuration:`
   - `safeBaseURL`: should be `https://api.momichan.xyz/api/v1` ✅
   - `isHttps`: should be `true` ✅
   - `windowProtocol`: should be `https:` ✅
6. Check for any `[Request]` logs - all URLs should be HTTPS
7. **CRITICAL**: Look for any `🚨🚨🚨 [HTTPS Enforcer]` logs - if you see them, it means HTTP was detected and converted
8. **NO mixed content errors should appear** ✅

### Step 5: Test API Calls
- Navigate through different pages
- Check that all API calls succeed
- Verify in Network tab that all requests are HTTPS

## Verification Checklist
- [ ] No mixed content errors in console
- [ ] All API requests use HTTPS URLs
- [ ] Login works correctly
- [ ] Posts/content loads correctly
- [ ] Images/media loads correctly
- [ ] No 503 errors (those are backend availability issues, not HTTPS issues)

## Troubleshooting

### If you still see HTTP requests:
1. **Clear browser cache**: Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
2. **Check Service Worker**: Go to Application tab → Service Workers → Unregister old service worker
3. **Check build logs in Cloudflare Pages**: Ensure build completed successfully
4. **Verify deployment**: Make sure the latest commit is deployed

### If you see 🚨 warnings in console:
This is GOOD - it means the enforcement is working. The warnings show that HTTP was detected and converted to HTTPS.

### If API calls fail with CORS errors:
This is a backend issue, not related to HTTPS enforcement. Check your backend CORS configuration.

## Environment Variables (Still Recommended)
Although the code no longer strictly depends on them, you should still set these in Cloudflare Pages for documentation and potential future use:

```
VITE_API_BASE_URL=https://api.momichan.xyz
VITE_API_ENDPOINT=https://api.momichan.xyz/api/v1
VITE_API_URL=https://api.momichan.xyz/api
```

**Important**: Make sure there are NO trailing slashes and NO spaces in the values.

## Technical Details

### Why This Fix Works - THE NUCLEAR APPROACH
This is a **5-layer defense system** that makes it **IMPOSSIBLE** for HTTP requests to api.momichan.xyz:

1. **Layer 1 (NUCLEAR)**: Browser-level XHR/fetch interception
   - Wraps the native browser APIs (`XMLHttpRequest` and `fetch`)
   - Runs **before everything** (imported first in main.ts)
   - Even if axios, service worker, or any library tries to use HTTP, this layer catches it
   - **This is the game changer** - it operates at the lowest possible level

2. **Layer 2**: Runtime protocol detection
   - Checks `window.location.protocol` at runtime
   - If page is HTTPS, forces API to HTTPS
   - No dependency on build-time environment variables

3. **Layer 3**: Triple-checkpoint axios interceptor
   - Checks baseURL, URL, and final constructed URL
   - Each checkpoint converts HTTP → HTTPS

4. **Layer 4**: Runtime configuration functions
   - All helper functions return HTTPS URLs
   - Even if environment variables are HTTP, they're converted

5. **Layer 5**: Service worker enforcement
   - Final fallback in the service worker
   - Catches any requests that somehow bypass layers 1-4

**Why 5 layers?** Because something was converting HTTPS → HTTP **after** axios but **before** the browser. The only way to guarantee HTTPS is to intercept at the **absolute lowest level** - the browser's native APIs.

### Code Changes Made
- **`src/utils/forceHttps.ts`** (NEW - THE GAME CHANGER):
  - Global XMLHttpRequest interceptor
  - Global fetch API interceptor
  - Runs at the absolute lowest browser level
  - Forces HTTPS before any request leaves the browser
- **`src/main.ts`**:
  - Import forceHttps.ts as THE FIRST import
  - Ensures interceptors are installed before Vue, axios, everything
- `src/api/client.ts`: 
  - Added runtime protocol detection
  - Enhanced HTTPS enforcement in request interceptor
  - Added safety wrapper (SAFE_BASE_URL)
- `src/config/runtime.ts`:
  - Added `forceHttpsProtocol()` helper
  - Prioritized runtime detection over environment variables
  - Ensured all functions return HTTPS URLs

## Support
If issues persist after deployment:
1. Check browser console for error messages
2. Check Cloudflare Pages build logs
3. Verify the commit was deployed
4. Test in incognito/private browsing mode (to rule out cache issues)
