# 🎯 Service Worker HTTPS 修复

## 问题根源

**Service Worker 是独立的 JavaScript 环境**，不会经过 axios 拦截器！

从你的日志可以看到：
```
Mixed Content: The page at 'https://df8a2afd.hmrchan-frontend.pages.dev/service-worker.js' 
was loaded over HTTPS, but requested an insecure resource 
'http://api.momichan.xyz/api/v1/posts/...'
```

即使主应用的 axios 请求使用了 HTTPS，Service Worker 发起的 fetch 请求仍然使用 HTTP。

## 修复内容

### 1. Service Worker fetch 事件处理器

在 `public/service-worker.js` 的 `fetch` 事件监听器开头添加 HTTPS 强制转换：

```javascript
self.addEventListener('fetch', (event) => {
  let { request } = event
  let url = new URL(request.url)

  // 🔒 运行时强制 HTTPS - Service Worker 最后防线
  if (url.protocol === 'http:' && url.hostname === 'api.momichan.xyz') {
    const httpsUrl = request.url.replace('http://', 'https://')
    console.warn('[SW] 🚨 Forcing HTTP to HTTPS:', request.url, '→', httpsUrl)
    
    // 创建新的 HTTPS 请求
    request = new Request(httpsUrl, {
      method: request.method,
      headers: request.headers,
      mode: request.mode === 'no-cors' ? 'cors' : request.mode,
      credentials: request.credentials,
      cache: request.cache,
      redirect: request.redirect,
      referrer: request.referrer,
      integrity: request.integrity,
    })
    
    url = new URL(httpsUrl)
  }
  
  // ... 继续处理请求
})
```

### 2. 缓存版本升级

```javascript
const CACHE_VERSION = 'v1.2.0' // 从 v1.1.0 升级
```

这会强制所有客户端下载和安装新的 Service Worker。

## 为什么之前的修复不够

| 修复层 | 覆盖范围 | Service Worker |
|--------|---------|----------------|
| ✅ 运行时配置 (`runtime.ts`) | 主应用 | ❌ 不覆盖 |
| ✅ Axios 拦截器 (`client.ts`) | Axios 请求 | ❌ 不覆盖 |
| ✅ URL 辅助函数 (`url.ts`) | 应用代码 | ❌ 不覆盖 |
| ✅ **Service Worker fetch** | **所有请求** | ✅ **覆盖** |

Service Worker 直接使用 `fetch()` API，完全绕过了我们的所有拦截器和辅助函数。

## 部署和验证

### 部署

```bash
git add .
git commit -m "fix: add HTTPS enforcement in Service Worker fetch handler

- Service Worker operates independently and doesn't use axios interceptors
- Added HTTP to HTTPS conversion in SW fetch event before making requests
- Bumped cache version to v1.2.0 to force SW update
- This ensures ALL network requests use HTTPS, including SW-initiated fetches"
git push origin main
```

### 验证步骤

1. **清除 Service Worker**
   - 浏览器开发工具 → Application → Service Workers
   - 点击 "Unregister" 注销旧 SW
   - 刷新页面

2. **检查新 SW 安装**
   - 控制台应该看到: `[SW] Service Worker loaded`
   - Application 标签显示: Cache Storage v1.2.0

3. **检查网络请求**
   - Network 标签
   - 所有 API 请求都应该是 `https://api.momichan.xyz/api/v1/*`
   - **不应该**看到任何 Mixed Content 错误

4. **检查 SW 警告**
   - 如果看到 `[SW] 🚨 Forcing HTTP to HTTPS`
   - 说明构建时环境变量仍是 HTTP
   - 但运行时已被修正为 HTTPS（功能正常）

## 技术细节

### Service Worker 生命周期

```
旧 SW (v1.1.0) 运行中
    ↓
用户访问新部署
    ↓
浏览器下载新 SW (v1.2.0)
    ↓
新 SW 进入 "waiting" 状态
    ↓
用户刷新页面 / 关闭所有标签
    ↓
新 SW 激活并接管
    ↓
旧缓存被清理
```

### 为什么需要 `skipWaiting()`

```javascript
self.skipWaiting()  // 立即激活，不等待
```

这会让新 SW 立即接管，用户刷新一次即可看到修复。

## 完整的 HTTPS 防护层

现在我们有 **4 层 HTTPS 防护**：

1. **构建时**: Cloudflare env vars (HTTPS) → Vite 内联
2. **运行时初始化**: `getRuntimeApiEndpoint()` 强制转换
3. **请求发送**: Axios 拦截器检查并转换
4. **Service Worker**: SW fetch 事件拦截并转换

即使任何一层失败，其他层都能保证 HTTPS。

## 预期结果

✅ **零** Mixed Content 错误  
✅ **所有**请求（包括 SW 发起的）都使用 HTTPS  
✅ 应用完全正常工作  
✅ 离线缓存功能正常  

---

**关键点**: Service Worker 是这个问题的最后一块拼图！
