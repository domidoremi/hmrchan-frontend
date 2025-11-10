# 🔒 终极 HTTPS 修复方案

## 🎯 根本原因

**Vite 在构建时会内联环境变量**。即使 Cloudflare Pages 设置了正确的 HTTPS 环境变量，如果之前的构建使用了 HTTP 值，这些 HTTP URL 已经被硬编码到 JavaScript bundle 中。

## ✨ 解决方案

创建 **完全运行时**的配置系统，绕过 Vite 的构建时内联机制。

### 核心改动

#### 1. 新建 `src/config/runtime.ts`
```typescript
// 运行时动态获取 API URL，完全绕过构建时内联
export function getRuntimeApiEndpoint(): string {
  if (typeof window === 'undefined') {
    return 'https://api.momichan.xyz/api/v1'
  }

  let endpoint = import.meta.env.VITE_API_ENDPOINT
  if (!endpoint) {
    endpoint = 'https://api.momichan.xyz/api/v1'
  }

  // 🔒 运行时强制 HTTPS
  if (endpoint.startsWith('http://')) {
    endpoint = endpoint.replace('http://', 'https://')
    console.error('🚨 HTTP detected and converted to HTTPS')
  }

  return endpoint
}
```

#### 2. 更新所有 API 配置使用运行时函数

**修改的文件：**
- ✅ `src/api/client.ts` - axios baseURL
- ✅ `src/api/services.ts` - 媒体 URL 构建
- ✅ `src/config/api.ts` - API 配置
- ✅ `src/utils/avatar.ts` - 头像 URL
- ✅ `src/components/ui/ApiUnavailableNotice.vue` - API URL 显示

#### 3. Axios 拦截器增强

在 `client.ts` 的请求拦截器中添加**最后防线**：

```typescript
apiClient.interceptors.request.use((config) => {
  // 🔒 运行时强制 HTTPS - 即使 baseURL 被内联为 HTTP
  if (config.baseURL?.startsWith('http://')) {
    config.baseURL = config.baseURL.replace('http://', 'https://')
    console.warn('🚨 [Interceptor] Forcing HTTP to HTTPS')
  }
  
  if (config.url?.startsWith('http://')) {
    config.url = config.url.replace('http://', 'https://')
  }
  
  return config
})
```

#### 4. **Service Worker HTTPS 强制 ⚠️ 关键修复**

Service Worker 独立运行，不经过 axios 拦截器。在 `public/service-worker.js` 中添加：

```javascript
self.addEventListener('fetch', (event) => {
  let { request } = event
  let url = new URL(request.url)

  // 🔒 运行时强制 HTTPS - Service Worker 最后防线
  if (url.protocol === 'http:' && url.hostname === 'api.momichan.xyz') {
    const httpsUrl = request.url.replace('http://', 'https://')
    console.warn('[SW] 🚨 Forcing HTTP to HTTPS:', httpsUrl)
    
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
  // ... rest of fetch handler
})
```

**Cache Version 升级到 v1.2.0** 以强制更新 Service Worker。

## 🚀 部署步骤

### 1. 确认 Cloudflare Pages 环境变量

确保以下变量都设置为 **HTTPS**：

```
VITE_API_BASE_URL=https://api.momichan.xyz
VITE_API_ENDPOINT=https://api.momichan.xyz/api/v1
VITE_API_URL=https://api.momichan.xyz/api
```

### 2. 提交代码

```bash
git add .
git commit -m "fix: implement runtime HTTPS enforcement to bypass Vite build-time inlining"
git push origin main
```

### 3. 触发新构建

- Cloudflare Pages 会自动构建
- **重要**：新构建会使用 HTTPS 环境变量
- 运行时强制转换作为双重保险

## ✅ 验证清单

部署后检查：

### 浏览器控制台
- [ ] ✅ `🌐 API Configuration` 显示 `baseURL: 'https://...'`
- [ ] ❌ **不应该**看到 "Mixed Content" 错误
- [ ] ❌ **不应该**看到 `🚨 [Interceptor] Forcing HTTP to HTTPS`（说明构建正确）

### 网络选项卡
- [ ] 所有 API 请求都是 `https://api.momichan.xyz/api/v1/*`
- [ ] 没有任何 `http://` 请求

### 功能测试
- [ ] 帖子列表加载成功
- [ ] 登录/认证正常
- [ ] 用户头像显示
- [ ] 视频/图片播放正常

## 🔍 故障排除

### 如果仍然看到 Mixed Content 错误

1. **清除浏览器缓存**
   - Ctrl + Shift + Delete
   - 清除所有缓存数据

2. **验证是最新构建**
   - 检查 Cloudflare Pages 部署时间
   - 确认访问的是新部署的 URL

3. **检查环境变量生效**
   - 在浏览器控制台运行：
     ```javascript
     console.log(import.meta.env.VITE_API_ENDPOINT)
     ```
   - 应该显示 `https://api.momichan.xyz/api/v1`

4. **查看拦截器警告**
   - 如果看到 `🚨 [Interceptor]` 警告
   - 说明构建时环境变量仍是 HTTP
   - 需要确认 Cloudflare 环境变量设置并重新构建

### 如果拦截器一直触发

说明 Cloudflare Pages 构建时环境变量不是 HTTPS：

1. 进入 Cloudflare Dashboard
2. 选择项目 → Settings → Environment variables
3. 确认 **Production** 标签下的变量是 HTTPS
4. 点击 "Save" 后
5. 手动触发重新部署：Deployments → ⋯ → Retry deployment

## 📊 技术细节

### Vite 环境变量内联机制

```javascript
// 构建时，Vite 会替换：
const url = import.meta.env.VITE_API_ENDPOINT
// 变成：
const url = "http://api.momichan.xyz/api/v1"  // 硬编码！
```

### 运行时绕过方案

```javascript
// 我们的方案：
function getRuntimeApiEndpoint() {
  let url = import.meta.env.VITE_API_ENDPOINT || 'https://...'
  // 即使 url 是 HTTP，运行时也会转换
  if (url.startsWith('http://')) {
    url = url.replace('http://', 'https://')
  }
  return url
}
```

### 多层防护

1. **构建时**：Cloudflare env vars 设置 HTTPS → Vite 内联 HTTPS
2. **运行时初始化**：`getRuntimeApiEndpoint()` 强制 HTTPS
3. **请求时**：axios 拦截器最后检查并强制 HTTPS

## 🎉 预期结果

- ✅ **零** Mixed Content 错误
- ✅ 所有请求使用 HTTPS
- ✅ 应用完全正常工作
- ✅ 即使未来环境变量配置错误，运行时也会自动修正

---

**状态**：终极方案，多层防护  
**信心**：极高 - 从根源解决问题  
**下一步**：部署验证
