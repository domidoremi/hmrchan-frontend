# HTTPS Mixed Content Fix - Deployment Guide

## Problem Summary
Your Cloudflare Pages deployment was making HTTP requests instead of HTTPS, causing "Mixed Content" errors where the browser blocks HTTP requests from HTTPS pages.

## Root Cause
Despite having HTTPS values in environment variables and .env files, the built application was somehow constructing HTTP URLs for API calls. This could be due to:
1. Cloudflare Pages environment variables not being properly applied during build
2. Timing issues where axios client initializes before environment variables are loaded
3. Build-time vs runtime environment variable confusion

## Solution Implemented
We've implemented **multiple layers of aggressive HTTPS enforcement** that work regardless of environment variables:

### 1. Runtime Protocol Detection (`src/api/client.ts`)
- Detects the page protocol at runtime
- If the page is HTTPS, **always** use HTTPS API
- Never relies solely on build-time environment variables

### 2. Triple-Layer HTTPS Enforcement in Request Interceptor
The axios request interceptor now has 3 checkpoints:
- **STEP 1**: Verify baseURL is HTTPS
- **STEP 2**: Verify URL is HTTPS (if full URL)
- **STEP 3**: Verify final constructed URL is HTTPS

If HTTP is detected at any step, it's immediately converted to HTTPS and logged.

### 3. Enhanced Runtime Configuration (`src/config/runtime.ts`)
- Added `forceHttpsProtocol()` helper function
- Always returns HTTPS URLs regardless of environment variables
- Prioritizes runtime detection over build-time configuration

## Deployment Steps

### Step 1: Build Locally (Optional - for testing)
```bash
cd f:\Projects\hmrchan\frontend
npm run build
```

Check the build output to ensure no errors.

### Step 2: Commit Changes
```bash
git add src/api/client.ts src/config/runtime.ts
git commit -m "fix: aggressive HTTPS enforcement to prevent mixed content errors"
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
4. Look for the log: `🌐 API Configuration:`
5. Verify these values:
   - `safeBaseURL`: should be `https://api.momichan.xyz/api/v1`
   - `isHttps`: should be `true`
   - `windowProtocol`: should be `https:`
6. Check for any `[Request]` logs - all URLs should be HTTPS
7. **NO mixed content errors should appear**

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

### Why This Fix Works
1. **Runtime Detection**: By checking `window.location.protocol` at runtime, we know for certain if the page is HTTPS
2. **No Environment Variable Dependency**: The fix doesn't rely on environment variables being set correctly
3. **Multiple Layers**: Even if one layer fails, the other layers catch HTTP URLs
4. **Comprehensive Coverage**: Covers axios initialization, request interceptor, and runtime configuration

### Code Changes Made
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
