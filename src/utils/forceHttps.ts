/**
 * Nuclear option: Intercept ALL XMLHttpRequest AND fetch at the browser level
 * This runs before axios, service worker, everything
 */

// Helper function to force HTTPS
function forceHttpsUrl(url: string | URL): string {
  const urlString = typeof url === 'string' ? url : url.toString();
  
  // Force HTTPS if URL is HTTP and points to api.momichan.xyz
  if (urlString.includes('api.momichan.xyz') && urlString.startsWith('http://')) {
    const httpsUrl = urlString.replace('http://', 'https://');
    console.error('🚨🚨🚨 [HTTPS Enforcer] Forced HTTP → HTTPS:', urlString, '→', httpsUrl);
    return httpsUrl;
  }
  
  return urlString;
}

// ==================== Intercept XMLHttpRequest ====================
const OriginalXHR = window.XMLHttpRequest;

class HttpsXHR extends OriginalXHR {
  constructor() {
    super();
    console.log('[XHR] New XMLHttpRequest created via interceptor');
  }

  open(
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null
  ): void {
    const urlString = typeof url === 'string' ? url : url.toString();
    console.log('[XHR] open() called with URL:', urlString);
    
    const finalUrl = forceHttpsUrl(url);
    
    if (finalUrl !== urlString) {
      console.error('🚨🚨🚨 [XHR] FORCED HTTPS:', urlString, '→', finalUrl);
    }
    
    // Call original open with forced HTTPS URL
    if (async !== undefined) {
      if (username !== undefined) {
        super.open(method, finalUrl, async, username, password);
      } else {
        super.open(method, finalUrl, async);
      }
    } else {
      super.open(method, finalUrl);
    }
  }
  
  send(body?: Document | XMLHttpRequestBodyInit | null): void {
    console.log('[XHR] send() called, responseURL will be:', this.responseURL);
    super.send(body);
  }
}

window.XMLHttpRequest = HttpsXHR as unknown as typeof XMLHttpRequest;
console.log('🔒 [XHR Interceptor] Installed');
console.log('[XHR] Test: new XMLHttpRequest() instanceof HttpsXHR:', new window.XMLHttpRequest() instanceof HttpsXHR);

// ==================== Intercept fetch ====================
const originalFetch = window.fetch;

window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let url: string;
  
  if (typeof input === 'string') {
    url = forceHttpsUrl(input);
    return originalFetch(url, init);
  } else if (input instanceof URL) {
    url = forceHttpsUrl(input.toString());
    return originalFetch(url, init);
  } else if (input instanceof Request) {
    const originalUrl = input.url;
    const forcedUrl = forceHttpsUrl(originalUrl);
    
    if (originalUrl !== forcedUrl) {
      // Create new Request with HTTPS URL
      const newRequest = new Request(forcedUrl, {
        method: input.method,
        headers: input.headers,
        body: input.body,
        mode: input.mode,
        credentials: input.credentials,
        cache: input.cache,
        redirect: input.redirect,
        referrer: input.referrer,
        integrity: input.integrity,
      });
      return originalFetch(newRequest);
    }
    return originalFetch(input, init);
  }
  
  return originalFetch(input, init);
};

console.log('🔒 [Fetch Interceptor] Installed');
console.log('🔒 [Global HTTPS Enforcer] All HTTP requests to api.momichan.xyz will be forced to HTTPS');

export {};
