# 🔒 硬编码 HTTPS 修复 - 最终方案

## 🎯 根本问题

**Vite 在构建时内联所有动态计算的值**，包括函数调用的返回值。

即使我们写了：
```typescript
const BASE_URL = getRuntimeApiEndpoint()  // 这个函数在构建时被执行！
```

Vite 会执行这个函数，然后将返回值直接内联到代码中：
```typescript
const BASE_URL = "http://api.momichan.xyz/api/v1"  // 硬编码！
```

## ✨ 最终解决方案

### 1. 完全硬编码 HTTPS URL

在 `src/api/client.ts` 中：

```typescript
// 🔒 强制使用 HTTPS - 完全不依赖环境变量或构建时计算
function getBaseURL(): string {
  // 开发环境：使用相对路径，Vite 代理
  if (import.meta.env.DEV) {
    return '/api/v1'
  }
  
  // 生产环境：硬编码 HTTPS
  return 'https://api.momichan.xyz/api/v1'
}

const BASE_URL = getBaseURL()
```

**关键点**：`import.meta.env.DEV` 会在构建时被替换为布尔值：
- 开发构建：`if (true) { return '/api/v1' }`
- 生产构建：`if (false) { ... } return 'https://...'` 

死代码消除会移除 `if` 块，只保留 `return 'https://...'`。

### 2. 锁定 baseURL 防止修改

```typescript
Object.defineProperty(apiClient.defaults, 'baseURL', {
  get() { return BASE_URL },
  set() { 
    console.error('🚨 Attempted to modify baseURL - ignored!')
  },
  configurable: false
})
```

### 3. 拦截器强制 HTTPS

```typescript
apiClient.interceptors.request.use((config) => {
  const fullUrl = axios.getUri(config)
  
  if (fullUrl.startsWith('http://')) {
    const httpsUrl = fullUrl.replace('http://', 'https://')
    console.error('🚨🚨🚨 CRITICAL: HTTP detected!', fullUrl, '→', httpsUrl)
    
    config.baseURL = ''
    config.url = httpsUrl
  }
  
  return config
})
```

### 4. Vite 配置问题

**重要**：`vite.config.ts` 中的这行配置会删除所有 console：

```typescript
drop: ['console', 'debugger'],
```

这导致我们看不到调试信息！需要临时注释掉：

```typescript
// 临时注释以便调试
// drop: ['console', 'debugger'],
```

## 🚀 部署步骤

### 1. 注释 Vite 配置中的 console 删除

编辑 `vite.config.ts`：

```typescript
...(mode === 'production' && {
  esbuildOptions: {
    // 临时注释以便调试 HTTPS 问题
    // drop: ['console', 'debugger'],
  },
}),
```

### 2. 提交并部署

```bash
git add .
git commit -m "fix: use hardcoded HTTPS URL and add extensive logging

CRITICAL FIX:
- Hardcoded HTTPS URL for production (https://api.momichan.xyz/api/v1)
- Locked baseURL with Object.defineProperty to prevent modifications
- Added comprehensive request logging in axios interceptor
- Force convert any HTTP URLs to HTTPS in interceptor
- Temporarily disabled console dropping for debugging

This completely bypasses Vite build-time inlining issues."

git push origin main
```

### 3. 部署后检查

打开浏览器控制台，应该看到：

```javascript
🌐 API Configuration: {
  baseURL: "https://api.momichan.xyz/api/v1",  // ✅ HTTPS
  strategy: "hardcoded-https",  // ✅ 确认策略
  isProd: true
}

[Request] {
  method: "GET",
  url: "/posts",
  baseURL: "https://api.momichan.xyz/api/v1",  // ✅ HTTPS
  fullUrl: "https://api.momichan.xyz/api/v1/posts?...",  // ✅ HTTPS
  params: {...}
}
```

**如果看到 HTTP**：

```javascript
🚨🚨🚨 CRITICAL: HTTP URL detected! {
  original: "http://api.momichan.xyz/api/v1/posts",  // ❌ 问题点
  fixed: "https://api.momichan.xyz/api/v1/posts",  // ✅ 已修复
  configBaseURL: "http://...",  // ❌ 来源
  configUrl: "/posts"
}
```

这会告诉我们 HTTP 从哪里来的。

## 🔍 诊断指南

### 场景 1：baseURL 显示 HTTPS，但请求是 HTTP

**原因**：日志显示的是代码中的常量值，但 axios 实际使用的可能不同。

**解决**：拦截器中的 `fullUrl` 日志会显示真实的 URL。

### 场景 2：拦截器没有输出任何日志

**原因**：
1. Vite 配置删除了所有 console
2. 拦截器没有被调用（axios 版本问题？）

**解决**：注释 Vite 配置中的 `drop: ['console']`

### 场景 3：fullUrl 显示 HTTP

**原因**：
1. 其他代码在创建请求前修改了 config
2. 某个库或插件在拦截 axios

**解决**：检查调用堆栈，找到是谁调用了 api.get()

## 📊 为什么其他方法都失败了

| 方法 | 问题 |
|------|------|
| 环境变量 | Vite 构建时内联 |
| `getRuntimeApiEndpoint()` | 函数调用在构建时被执行 |
| `forceHttps()` 辅助函数 | 在模块顶层调用时仍然是构建时 |
| Axios 拦截器（单独） | 如果 baseURL 已经是 HTTP，拦截器看到的也是 HTTP |
| Service Worker | 只覆盖 SW 发起的请求，不覆盖主应用 |

## ✅ 为什么这次会成功

1. **完全硬编码**：生产环境的 URL 是硬编码的字符串字面量
2. **条件编译**：`import.meta.env.DEV` 在构建时被替换，确保生产代码只有 HTTPS 分支
3. **不可变 baseURL**：使用 `Object.defineProperty` 防止运行时修改
4. **拦截器作为最后防线**：即使前面都失败，拦截器会在发送前修正
5. **完整 URL 检查**：使用 `axios.getUri()` 获取实际发送的完整 URL

## 🎉 预期结果

- ✅ 所有请求使用 HTTPS
- ✅ 零 Mixed Content 错误
- ✅ 控制台有详细的请求日志
- ✅ 能看到任何 HTTP → HTTPS 的转换
- ✅ 应用完全正常工作

## 🔄 成功后恢复 Console 删除

一旦确认修复成功，恢复 Vite 配置：

```typescript
drop: ['console', 'debugger'],  // 生产环境删除 console
```

---

**关键insight**：问题不在于 HTTPS 转换逻辑，而在于**何时**执行这个逻辑。必须确保是在**浏览器运行时**，而不是**构建时**。
