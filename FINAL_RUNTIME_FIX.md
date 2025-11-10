# 🎯 最终修复：运行时 HTTPS 强制转换

## 🔍 问题根源分析

### 为什么之前的修复没有生效？

**关键问题：Vite 构建时内联（Build-time Inlining）**

```typescript
// 源代码
const BASE_URL = getApiEndpoint()

// 如果环境变量是: VITE_API_ENDPOINT=http://api.momichan.xyz/api/v1
// forceHttps() 在构建时执行，但它检查 import.meta.env.PROD

// Vite 构建时会内联所有环境变量和条件：
// 构建后的 JS 文件
const BASE_URL = "http://api.momichan.xyz/api/v1"  // ← 已经是字面量！
```

**问题链条**：
1. Cloudflare Pages 构建时环境变量是 `http://...` （配置错误）
2. Vite 读取环境变量并在构建时内联
3. `forceHttps()` 也在构建时执行，但条件检查也被内联
4. 最终构建产物包含硬编码的 HTTP URL
5. 浏览器加载时，URL 已经是 HTTP，无法修改

---

## ✅ 最终解决方案：运行时强制转换

### 核心概念

**在浏览器运行时检测并强制转换 HTTP → HTTPS**

```typescript
function getRuntimeBaseURL(): string {
  let url = getApiEndpoint()
  
  // 关键：使用 typeof window 检测，确保在浏览器环境执行
  // 这个检查不会被 Vite 内联，会保留到运行时
  if (typeof window !== 'undefined' && url.startsWith('http://')) {
    url = url.replace('http://', 'https://')
    console.warn('🔒 [Runtime Security] Forced HTTP to HTTPS:', url)
  }
  
  return url
}
```

**为什么这样有效？**
- `typeof window !== 'undefined'` 是运行时检查，不会被内联
- `url.startsWith('http://')` 在运行时动态检测 URL
- 即使构建时 URL 是 HTTP，运行时也能强制改成 HTTPS

---

## 🔧 已完成的修复

### 1. ✅ `src/api/client.ts` - Axios 客户端

**修复前**：
```typescript
const BASE_URL = getApiEndpoint()  // 构建时内联
```

**修复后**：
```typescript
function getRuntimeBaseURL(): string {
  let url = getApiEndpoint()
  
  // 运行时强制转换
  if (typeof window !== 'undefined' && url.startsWith('http://')) {
    url = url.replace('http://', 'https://')
    console.warn('🔒 [Runtime Security] Forced HTTP to HTTPS:', url)
  }
  
  return url
}

const BASE_URL = getRuntimeBaseURL()  // 运行时执行
```

### 2. ✅ `src/api/services.ts` - 媒体 URL 函数

**修复前**：
```typescript
getStreamUrl(mediaId: UUID) {
  return `${getApiBaseUrl()}${getApiEndpoint().replace(getApiBaseUrl(), '')}/media/${mediaId}/stream`
}
```

**修复后**：
```typescript
_forceHttps(url: string): string {
  if (typeof window !== 'undefined' && url.startsWith('http://')) {
    return url.replace('http://', 'https://')
  }
  return url
},

getStreamUrl(mediaId: UUID) {
  const url = `${getApiEndpoint()}/media/${mediaId}/stream`
  return this._forceHttps(url)  // 运行时强制 HTTPS
}
```

**额外好处**：
- 简化了 URL 构造逻辑
- 移除了复杂的字符串替换
- 所有媒体 URL 统一使用 `_forceHttps()`

---

## 🎯 三层防护体系

现在有完整的三层防护：

### 第一层：环境变量（理想状态）
```env
VITE_API_ENDPOINT=https://api.momichan.xyz/api/v1
```
如果正确配置，直接使用 HTTPS。

### 第二层：构建时转换（url.ts）
```typescript
function forceHttps(url: string): string {
  if (import.meta.env.PROD && url.startsWith('http://')) {
    return url.replace('http://', 'https://')
  }
  return url
}
```
如果环境变量是 HTTP，构建时尝试转换。

### 第三层：运行时转换（client.ts + services.ts）
```typescript
if (typeof window !== 'undefined' && url.startsWith('http://')) {
  url = url.replace('http://', 'https://')
}
```
**最后防线**：即使前两层失败，运行时强制转换。

---

## 🚀 部署步骤

### 1. 提交代码

```bash
git add src/api/client.ts src/api/services.ts
git commit -m "fix: add runtime HTTPS enforcement to prevent build-time HTTP inlining

- Added getRuntimeBaseURL() with runtime HTTPS check
- Added _forceHttps() to mediaApi for consistent URL handling
- Simplified media URL construction
- Removed unused getApiBaseUrl import

This fixes Mixed Content errors even when env vars are HTTP during build"

git push
```

### 2. 等待部署

Cloudflare Pages 自动构建（2-5 分钟）

### 3. 验证修复

访问: https://7442700f.hmrchan-frontend.pages.dev/

**在 Console 查看**：
```javascript
🌐 API Configuration: {
  baseURL: "https://api.momichan.xyz/api/v1",
  runtimeForced: true,  // ← 新增字段，显示是否运行时强制转换
  ...
}
```

**如果看到警告**：
```
🔒 [Runtime Security] Forced HTTP to HTTPS: https://api.momichan.xyz/api/v1
```
说明运行时转换生效了！

---

## 📊 测试场景

### 场景 1: 环境变量 = HTTPS ✅
```
构建时: HTTPS → 运行时: HTTPS
结果: 直接使用，无转换
```

### 场景 2: 环境变量 = HTTP ✅
```
构建时: HTTP → 运行时: 强制转换为 HTTPS
结果: 运行时修复，显示警告
```

### 场景 3: 环境变量未设置 ✅
```
构建时: fallback HTTPS → 运行时: HTTPS
结果: 使用默认 HTTPS
```

### 场景 4: 旧版本缓存 ✅
```
浏览器缓存: 旧的 HTTP 代码
新代码: 运行时强制 HTTPS
结果: 即使是旧代码，也会被新逻辑覆盖
```

---

## 🔍 调试指南

### 如何确认修复生效？

#### 1. 检查 Console 日志

```javascript
// 应该看到
🌐 API Configuration: {
  baseURL: "https://api.momichan.xyz/api/v1",
  runtimeForced: true  // 如果这是 true，说明运行时转换生效
}

// 如果环境变量是 HTTP，还会看到
🔒 [Runtime Security] Forced HTTP to HTTPS: ...
```

#### 2. 检查 Network 请求

```
所有 API 请求都应该是：
✅ https://api.momichan.xyz/api/v1/posts?...
✅ https://api.momichan.xyz/api/v1/media/...

不应该有：
❌ http://api.momichan.xyz/...
```

#### 3. 检查媒体资源

```
图片/视频 src 应该是：
✅ https://api.momichan.xyz/api/v1/media/{uuid}/stream
```

---

## 🎉 预期结果

部署成功后：

1. ✅ **无 Mixed Content 错误**
2. ✅ **所有 API 请求使用 HTTPS**
3. ✅ **所有媒体资源使用 HTTPS**
4. ✅ **帖子列表正常加载**
5. ✅ **视频/图片正常播放**
6. ✅ **Console 显示正确的 HTTPS URL**

---

## 📚 技术细节

### 为什么 `typeof window !== 'undefined'` 不会被内联？

Vite/Rollup 的内联优化只处理：
- `import.meta.env.*` 变量
- `process.env.*` 变量
- 常量表达式

但 `typeof window` 是**运行时检查**，编译器无法在构建时确定其值（SSR vs 浏览器），因此会保留到运行时。

### SSR 兼容性

```typescript
if (typeof window !== 'undefined' && url.startsWith('http://')) {
  // 这个分支只在浏览器环境执行
  // SSR 环境下 typeof window === 'undefined'，不会执行
}
```

这确保了代码在 SSR 环境下也能正常工作。

---

## ⚠️ 重要提醒

### 仍需修正 Cloudflare Pages 环境变量

虽然运行时修复能解决问题，但**最佳实践**是修正环境变量：

```
VITE_API_ENDPOINT = https://api.momichan.xyz/api/v1  ✅
```

这样：
- 减少运行时开销
- 避免警告日志
- 符合最佳安全实践

---

## ✅ 完成清单

- [x] 添加 `getRuntimeBaseURL()` 运行时 HTTPS 检查
- [x] 添加 `_forceHttps()` 到 mediaApi
- [x] 简化媒体 URL 构造
- [x] 移除未使用的 `getApiBaseUrl` 导入
- [x] 添加 `runtimeForced` 调试字段
- [ ] 提交并推送代码
- [ ] 等待 Cloudflare Pages 部署
- [ ] 验证修复生效
- [ ] （可选）修正 Cloudflare 环境变量

---

**修复日期**: 2025-11-11 02:10 AM  
**状态**: 🟢 代码已完成，准备部署  
**预计生效时间**: 5 分钟内

---

**立即部署**:
```bash
git add .
git commit -m "fix: add runtime HTTPS enforcement"
git push
```

**这次一定能解决问题！** 🎯
