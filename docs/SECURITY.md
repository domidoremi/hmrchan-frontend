# 前端安全性文档

本文档详细说明 MomiChan 前端项目实施的安全措施，涵盖认证、数据保护、网络安全等方面。

## 目录

- [认证与授权](#认证与授权)
- [XSS 防护](#xss-防护)
- [CSRF 防护](#csrf-防护)
- [HTTP 安全头](#http-安全头)
- [API 安全](#api-安全)
- [数据存储安全](#数据存储安全)
- [网络安全](#网络安全)
- [安全最佳实践](#安全最佳实践)

---

## 认证与授权

### 双 Token 机制

项目采用 access_token + refresh_token 双令牌架构，平衡安全性与用户体验：

```
┌─────────────────────────────────────────────────────────────┐
│  Access Token                    Refresh Token              │
│  ├─ 有效期: 15 分钟              ├─ 有效期: 30 天            │
│  ├─ 存储: localStorage           ├─ 存储: HttpOnly Cookie   │
│  ├─ 用途: API 请求认证           ├─ 用途: 刷新 Access Token │
│  └─ 风险: 可被 XSS 读取          └─ 风险: 仅 CSRF（已防护） │
└─────────────────────────────────────────────────────────────┘
```

**实现位置**: `src/stores/auth.ts`, `src/api/client.ts`

### Token 自动刷新

- 心跳机制定期刷新 token（默认 5 分钟）
- 401 响应自动触发刷新流程
- 刷新失败自动登出并清理状态
- 并发请求时使用队列避免重复刷新

```typescript
// src/api/client.ts - Token 刷新队列
let isRefreshing = false
let refreshSubscribers: Array<{ resolve; reject }> = []

// 等待 token 刷新完成后重试请求
if (isRefreshing) {
  return new Promise((resolve, reject) => {
    subscribeTokenRefresh(resolve, reject)
  })
}
```

### 路由守卫

```typescript
// src/router/index.ts
router.beforeEach(async (to, _from, next) => {
  // requiresAuth: 需要登录才能访问
  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }

  // guestOnly: 仅未登录用户可访问（登录/注册页）
  if (to.meta.guestOnly && isAuthenticated) {
    next('/')
    return
  }
})
```

---

## XSS 防护

### Vue 自动转义

Vue 3 默认对模板中的插值进行 HTML 转义：

```vue
<!-- 安全：自动转义 -->
<p>{{ userInput }}</p>

<!-- 危险：避免使用 v-html -->
<p v-html="userInput"></p>
<!-- ❌ 项目中未使用 -->
```

**审计结果**: 项目中未发现 `v-html`、`innerHTML` 或 `dangerouslySetInnerHTML` 的使用。

### 无危险代码执行

项目中不存在以下危险模式：

- `eval()`
- `new Function()`
- `document.write()`
- 动态脚本注入

### Content Security Policy

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval'
    https://static.cloudflareinsights.com
    https://challenges.cloudflare.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https: blob:;
  connect-src 'self' https: wss:;
  frame-src 'self' https://challenges.cloudflare.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
```

**配置位置**: `_headers`

> ⚠️ **注意**: 当前 CSP 包含 `unsafe-inline` 和 `unsafe-eval`，这是为了兼容 Vite 开发模式和某些第三方库。生产环境建议使用 nonce 机制替代。

---

## CSRF 防护

### SameSite Cookie

Refresh token 存储在 HttpOnly Cookie 中，配合 SameSite 属性防止 CSRF：

```
Set-Cookie: refresh_token=xxx; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth
```

### CORS 白名单

Edge function 实施严格的 Origin 验证：

```typescript
// functions/api/[[path]].ts
const ALLOWED_ORIGINS = [
  'https://momichan.xyz',
  'https://www.momichan.xyz',
  'https://himeri.momichan.xyz',
]

function isAllowedOrigin(origin: string | null, isDev: boolean): boolean {
  if (!origin) return false
  if (ALLOWED_ORIGINS.includes(origin)) return true
  if (isDev && DEV_ORIGINS.includes(origin)) return true
  if (origin.endsWith('.pages.dev')) return true // Cloudflare 预览
  return false
}
```

### Credentials 模式

所有 API 请求使用 `credentials: 'include'` 发送 Cookie，配合 CORS 白名单确保安全：

```typescript
// src/api/client.ts
const response = await fetch(url, {
  ...fetchConfig,
  credentials: 'include', // 发送 HttpOnly Cookie
})
```

---

## HTTP 安全头

**配置位置**: `_headers`

| 安全头                       | 值                                             | 作用                     |
| ---------------------------- | ---------------------------------------------- | ------------------------ |
| `Strict-Transport-Security`  | `max-age=31536000; includeSubDomains; preload` | 强制 HTTPS，防止降级攻击 |
| `X-Frame-Options`            | `SAMEORIGIN`                                   | 防止点击劫持             |
| `X-Content-Type-Options`     | `nosniff`                                      | 防止 MIME 类型嗅探       |
| `Referrer-Policy`            | `strict-origin-when-cross-origin`              | 控制 Referer 泄露        |
| `Cross-Origin-Opener-Policy` | `same-origin-allow-popups`                     | 隔离浏览上下文           |
| `Permissions-Policy`         | `camera=(), microphone=(), geolocation=()...`  | 禁用敏感 API             |

---

## API 安全

### 统一请求客户端

所有 HTTP 请求通过 `src/api/client.ts` 统一处理：

- 自动附加 Authorization 头
- 统一错误处理和 Toast 提示
- 请求超时控制（30 秒）
- Token 自动刷新

### 请求超时保护

```typescript
// src/api/client.ts
const REQUEST_TIMEOUT = 30000
const REFRESH_TIMEOUT = 10000

const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), timeout)
```

### 请求节流

前端实施本地限流，防止滥用：

```typescript
// src/composables/useThrottle.ts
const { throttledAction, isThrottled, cooldownRemaining } = useThrottle({
  interval: 1000, // 基础间隔
  maxBurst: 5, // 突发限制
  cooldownTime: 30000, // 冷却时间
})

// 响应后端 429 限流
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After')
  triggerCooldown(parseInt(retryAfter, 10))
}
```

### 错误信息脱敏

Edge function 不向客户端暴露内部错误细节：

```typescript
// functions/api/[[path]].ts
catch (error) {
  // 仅服务端日志记录详细信息
  console.error('[API Proxy] Error:', error)
  console.error('[API Proxy] Target URL:', targetUrl)

  // 返回通用错误，不泄露内部结构
  return new Response(JSON.stringify({
    error: 'Service Unavailable',
    message: 'Unable to process request. Please try again later.',
  }), { status: 502 })
}
```

---

## 数据存储安全

### localStorage 使用规范

| 数据类型      | 存储位置        | 敏感度 | 说明                        |
| ------------- | --------------- | ------ | --------------------------- |
| Access Token  | localStorage    | 中     | 短期有效，被窃取影响有限    |
| 用户偏好      | localStorage    | 低     | 语言、主题等非敏感设置      |
| 搜索历史      | localStorage    | 低     | 用户搜索记录                |
| Refresh Token | HttpOnly Cookie | 高     | 浏览器自动管理，JS 不可访问 |

### sessionStorage 使用

仅用于页面间临时数据传递（如缩略图预加载）：

```typescript
// 导航时缓存缩略图 URL
sessionStorage.setItem(`post-thumbnail-${postId}`, thumbnailSrc)

// 页面卸载时清理
onUnmounted(() => {
  sessionStorage.removeItem(`post-thumbnail-${postId}`)
})
```

### 缓存安全

内存缓存按用户隔离，缓存 key 包含 token 后缀：

```typescript
// src/api/client.ts
function buildCacheKey(method: string, url: string, skipAuth: boolean): string {
  const token = skipAuth ? '' : getAccessToken() || ''
  const tokenSuffix = token ? `:${token.slice(-8)}` : ''
  return `api:${method}:${url}${tokenSuffix}`
}
```

---

## 网络安全

### HTTPS 强制

- HSTS 预加载确保始终使用 HTTPS
- CSP `upgrade-insecure-requests` 自动升级 HTTP 请求

### API 代理架构

前端不直接访问后端 API，通过 Cloudflare Pages Function 代理：

```
浏览器 → Cloudflare Edge → 后端 API
         (functions/api/)
```

优势：

- 隐藏后端真实地址
- 统一 CORS 处理
- Edge 级别的 DDoS 防护
- 请求日志和监控

### WebSocket 安全

WebSocket 连接使用 `wss://` 协议，CSP 已配置 `connect-src wss:`。

---

## 安全最佳实践

### 开发规范

1. **禁止使用 `any` 类型** - 使用 `unknown` + 类型守卫
2. **禁止硬编码密钥** - 所有密钥通过环境变量注入
3. **输入验证** - 前端验证 + 后端验证双重保障
4. **依赖审计** - 定期运行 `bun audit` 检查漏洞

### 敏感操作保护

敏感操作（如修改密码）需要二次验证：

```typescript
// src/api/authService.ts
async verifyPassword(password: string): Promise<{ verification_token: string }>
async verifyIdentity(action: string, method?: 'password' | 'email')
```

### 人机验证

集成 Cloudflare Turnstile 防止自动化攻击：

```vue
<!-- src/components/ui/TurnstileWidget.vue -->
<TurnstileWidget
  :site-key="turnstileSiteKey"
  @verify="onTurnstileVerify"
  @error="onTurnstileError"
/>
```

### 设备指纹

登录/注册时收集设备信息用于会话管理：

```typescript
// src/utils/device.ts
interface DeviceInfo {
  device_fingerprint: string
  device_type: string
  device_os: string
  device_browser: string
  screen_resolution: string
  timezone: string
  language: string
}
```

---

## 安全检查清单

### 部署前检查

- [ ] 环境变量已正确配置（不含测试密钥）
- [ ] CSP 策略已审查
- [ ] CORS 白名单已更新
- [ ] 依赖无已知漏洞
- [ ] 敏感信息未提交到代码库

### 定期审计

- [ ] 每月运行依赖安全扫描
- [ ] 每季度审查 CSP 策略
- [ ] 每季度审查 CORS 配置
- [ ] 每年进行安全渗透测试

---

## 相关文件

| 文件                                    | 职责                    |
| --------------------------------------- | ----------------------- |
| `src/api/client.ts`                     | HTTP 客户端、Token 管理 |
| `src/stores/auth.ts`                    | 认证状态、心跳刷新      |
| `src/router/index.ts`                   | 路由守卫                |
| `src/composables/useThrottle.ts`        | 请求节流                |
| `functions/api/[[path]].ts`             | API 代理、CORS          |
| `_headers`                              | HTTP 安全头             |
| `src/components/ui/TurnstileWidget.vue` | 人机验证                |
| `src/utils/device.ts`                   | 设备指纹                |

---

## 版本历史

| 版本 | 日期       | 变更     |
| ---- | ---------- | -------- |
| 1.0  | 2026-01-16 | 初始文档 |
