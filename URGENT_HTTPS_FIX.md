# 🚨 紧急修复：Mixed Content 错误

## 问题现象

```
Mixed Content: ... requested an insecure XMLHttpRequest endpoint 
'http://api.momichan.xyz/api/v1/posts/...'
```

## 根本原因

**Cloudflare Pages 的环境变量被设置成了 HTTP 而不是 HTTPS！**

---

## ✅ 立即修复（二选一）

### 方案 A：修正 Cloudflare Pages 环境变量（推荐）

#### 第一步：检查并修正环境变量

1. **登录**: https://dash.cloudflare.com/
2. **进入**: Workers & Pages → `hmrchan-frontend` → Settings → Environment variables
3. **查看** Production 标签页

#### 第二步：删除或修改错误的环境变量

**如果看到这些（HTTP）**:
```
❌ VITE_API_BASE_URL = http://api.momichan.xyz
❌ VITE_API_ENDPOINT = http://api.momichan.xyz/api/v1
```

**修改为（HTTPS）**:
```
✅ VITE_API_BASE_URL = https://api.momichan.xyz
✅ VITE_API_ENDPOINT = https://api.momichan.xyz/api/v1
```

#### 第三步：重新部署

**重要**: 修改环境变量后必须重新部署！

**方法 1 - Cloudflare Dashboard**:
```
Settings → Deployments → 点击最新部署 → "Retry deployment"
```

**方法 2 - Git 推送**:
```bash
git add .
git commit -m "fix: force HTTPS in production environment"
git push
```

---

### 方案 B：使用代码自动修复（已完成）

我已经在代码中添加了 `forceHttps()` 函数，**即使环境变量是 HTTP，也会自动转换为 HTTPS**。

#### 修改的文件
- ✅ `src/utils/url.ts` - 添加 `forceHttps()` 自动转换

#### 工作原理
```typescript
function forceHttps(url: string): string {
  // 生产环境强制使用 HTTPS
  if (import.meta.env.PROD && url.startsWith('http://')) {
    return url.replace('http://', 'https://')
  }
  return url
}

export function getApiBaseUrl(): string {
  if (import.meta.env.VITE_API_BASE_URL) {
    return forceHttps(import.meta.env.VITE_API_BASE_URL)  // ← 自动转换
  }
  // ...
}
```

#### 部署新代码
```bash
git add src/utils/url.ts
git commit -m "fix: force HTTPS conversion in production"
git push
```

---

## 📊 验证修复

### 部署后检查清单

1. **打开网站**: https://cbd1b0f5.hmrchan-frontend.pages.dev/
2. **打开 DevTools**: F12 → Console
3. **检查错误**: 应该没有 "Mixed Content" 错误
4. **检查 Network**: 
   - F12 → Network 标签
   - 查找 API 请求
   - 所有请求应该是 `https://api.momichan.xyz/api/v1/...`

### 预期结果

✅ **成功**:
- 无 "Mixed Content" 错误
- 所有 API 请求使用 HTTPS
- 帖子列表正常加载
- 媒体内容正常播放

❌ **仍然失败**:
- 如果还有问题，查看下方的"深度排查"部分

---

## 🔍 深度排查

### 1. 查看构建日志

在 Cloudflare Pages Dashboard:
```
Deployments → 点击最新部署 → View build log
```

**查找**:
```
VITE_API_BASE_URL=...
VITE_API_ENDPOINT=...
```

**应该看到**:
```
VITE_API_BASE_URL=https://api.momichan.xyz
VITE_API_ENDPOINT=https://api.momichan.xyz/api/v1
```

### 2. 检查构建产物

下载部署的 JavaScript 文件：
```
https://cbd1b0f5.hmrchan-frontend.pages.dev/assets/api-8KquAKZQ.js
```

**搜索**: `api.momichan.xyz`

**应该看到**:
```javascript
// ✅ 正确
"https://api.momichan.xyz/api/v1"

// ❌ 错误
"http://api.momichan.xyz/api/v1"
```

### 3. 浏览器 Console 调试

在网站上打开 Console，运行：
```javascript
// 检查环境模式
console.log('Production Mode:', import.meta?.env?.PROD)

// 查看 API 配置（如果有日志）
// 应该在 Console 看到类似的输出
```

---

## 🆘 如果仍然失败

### 检查是否有多个环境变量源

Cloudflare Pages 可能从多个地方读取环境变量：

1. **项目环境变量** (Settings → Environment variables)
2. **构建配置** (Settings → Builds & deployments)
3. **.env.production** 文件（被 Git 提交）

**确保所有地方都是 HTTPS！**

### 检查 Cloudflare Pages 构建命令

Settings → Builds & deployments → Build configurations

**应该是**:
```
Build command: npm run build
Build output directory: dist
Root directory: /
```

**不应该有**: 自定义的环境变量注入

---

## 📝 完整解决方案总结

### 短期修复（立即生效）
1. ✅ 修改 Cloudflare Pages 环境变量为 HTTPS
2. ✅ 重新部署

### 长期修复（防止再次发生）
1. ✅ 代码添加 `forceHttps()` 自动转换（已完成）
2. ✅ 更新部署文档说明环境变量必须是 HTTPS
3. ✅ 添加构建时环境变量验证（可选）

### 验证清单
- [ ] Cloudflare Pages 环境变量都是 HTTPS
- [ ] 最新代码包含 `forceHttps()` 函数
- [ ] 重新部署完成
- [ ] 浏览器测试无 "Mixed Content" 错误
- [ ] API 请求正常工作

---

## 🔗 相关文档

- **CLOUDFLARE_DEPLOYMENT.md** - 完整部署指南
- **QUICK_FIX.md** - 快速修复指南
- **API_MIGRATION_GUIDE.md** - API v1 迁移指南

---

**修复时间**: < 5 分钟  
**优先级**: 🔴 紧急  
**影响范围**: 所有生产环境用户

---

**最后更新**: 2025-11-11 01:20 AM  
**状态**: 🔧 修复代码已提交，等待部署
