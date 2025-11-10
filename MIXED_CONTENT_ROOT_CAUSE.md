# Mixed Content Error - Root Cause Found! 🎯

## The Real Problem

**Your API server is redirecting HTTPS requests to HTTP URLs!**

### Evidence

```bash
$ curl -v "https://api.momichan.xyz/api/v1/posts?page=1&page_size=6"

< HTTP/1.1 307 Temporary Redirect
< location: http://api.momichan.xyz/api/v1/posts/?page=1&page_size=6
             ^^^^^ HTTP instead of HTTPS!
```

### What's Happening

1. Frontend makes HTTPS request: `https://api.momichan.xyz/api/v1/posts?page=1...`
2. API server responds with `307 Temporary Redirect`
3. **Redirect location uses HTTP**: `http://api.momichan.xyz/api/v1/posts/?page=1...`
4. Browser tries to follow redirect to HTTP
5. Browser's mixed content policy **blocks the HTTP request** ❌

### Why Some Requests Work

- ✅ `/posts/stats/summary` - Works (no redirect, returns 200 directly)
- ❌ `/posts?page=1...` - Fails (307 redirect to HTTP)
- ❌ `/posts?page=2...` - Fails (307 redirect to HTTP)

The difference: requests with query parameters trigger a redirect that adds a trailing slash (`/posts/` instead of `/posts`), and this redirect incorrectly uses HTTP protocol.

## Permanent Solution (Backend Fix)

Fix your nginx configuration to use HTTPS in redirects:

### Option 1: Set Nginx to use HTTPS scheme

In your nginx config (`/etc/nginx/sites-available/your-api`):

```nginx
server {
    listen 443 ssl http2;
    server_name api.momichan.xyz;
    
    # Force HTTPS scheme in redirects
    absolute_redirect off;  # Use relative redirects
    # OR
    port_in_redirect off;
    
    # If using proxy_pass
    location / {
        proxy_pass http://your_backend;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_redirect http:// https://;  # Force HTTPS in redirects
    }
}
```

### Option 2: Disable automatic trailing slash redirect

```nginx
location /api/v1/posts {
    # Don't redirect to add trailing slash
    try_files $uri $uri/ @backend;
}

location @backend {
    proxy_pass http://your_backend;
    proxy_set_header X-Forwarded-Proto https;
}
```

### Option 3: Fix the application code

If you're using a web framework (Django, Flask, FastAPI, etc.), ensure it respects the `X-Forwarded-Proto` header:

**FastAPI/Starlette:**
```python
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware

app.add_middleware(TrustedHostMiddleware, allowed_hosts=["api.momichan.xyz"])
# Configure to respect X-Forwarded-Proto
```

**Django:**
```python
# settings.py
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True
```

## Temporary Frontend Workaround

Until backend is fixed, add trailing slashes to API endpoints:

```typescript
// services.ts
export const postsApi = {
  getPosts(params?: PostListParams) {
    // Add trailing slash to avoid redirect
    return api.get<PaginatedResponse<Post>>('/posts/', { params })
    //                                              ^ add this
  },
}
```

## Verification

After fixing backend, test with curl:

```bash
# Should return 200 directly, no redirect
curl -v "https://api.momichan.xyz/api/v1/posts?page=1"

# Should see:
# < HTTP/1.1 200 OK
# NOT:
# < HTTP/1.1 307 Temporary Redirect
```

## Why This Wasn't Caught Earlier

All our frontend HTTPS enforcement code was working correctly:
- ✅ Axios was configured with HTTPS
- ✅ Request interceptors were forcing HTTPS  
- ✅ XHR/Fetch interceptors were installed
- ✅ Runtime detection was correct

**But** we can't control what the API server returns in redirect Location headers. When the browser follows a redirect, it uses the exact URL from the Location header - if that's HTTP, the browser blocks it due to mixed content policy.

## Summary

- **Problem**: API server returning HTTP redirects
- **Permanent Fix**: Configure nginx/backend to use HTTPS in redirects
- **Temporary Workaround**: Add trailing slashes in frontend API calls
- **Test**: `curl -v https://api.momichan.xyz/api/v1/posts?page=1` should return 200, not 307

**This is a backend configuration issue, not a frontend code issue!**
