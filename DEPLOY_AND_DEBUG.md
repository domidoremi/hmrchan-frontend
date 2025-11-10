# 🚀 部署和调试指南

## 立即部署

```bash
git add .
git commit -m "fix: hardcode HTTPS URL and add comprehensive debugging

CRITICAL CHANGES:
1. Hardcoded HTTPS URL for production builds
   - Bypasses all environment variable and build-time inlining issues
   - Dev: /api/v1 (Vite proxy), Prod: https://api.momichan.xyz/api/v1

2. Locked baseURL with Object.defineProperty
   - Prevents any runtime modifications

3. Enhanced axios interceptor
   - Logs every request with full URL details
   - Forces HTTP → HTTPS conversion as last resort
   - Uses axios.getUri() to check actual request URL

4. Service Worker HTTPS enforcement
   - Already fixed in previous commit

5. Temporarily enabled console logs in production
   - Commented out Vite config console dropping
   - Needed to debug the persistent Mixed Content issue

This is the nuclear option - if this doesn't work, the problem is
external to our code (CDN cache, browser cache, etc)."

git push origin main
```

## ✅ 部署后验证清单

### 第一步：清除所有缓存

1. **浏览器缓存**
   - 按 `Ctrl + Shift + Delete`
   - 选择 "全部时间"
   - 勾选所有选项
   - 清除数据

2. **Service Worker**
   - 开发工具 → Application → Service Workers
   - 点击 "Unregister" 注销所有 SW
   - 关闭所有浏览器标签

3. **硬刷新**
   - 按 `Ctrl + Shift + R` (Windows)
   - 或 `Cmd + Shift + R` (Mac)

### 第二步：检查控制台日志

打开新的隐私/无痕窗口，访问站点，检查控制台：

#### ✅ 期望看到的日志

```javascript
🌐 API Configuration: {
  baseURL: "https://api.momichan.xyz/api/v1",  // ✅ 必须是 HTTPS
  strategy: "hardcoded-https",  // ✅ 确认使用硬编码策略
  isProd: true,
  isHttps: true  // ✅ 必须是 true
}
```

#### ✅ 每个请求都应该显示

```javascript
[Request] {
  method: "GET",
  url: "/posts",
  baseURL: "https://api.momichan.xyz/api/v1",  // ✅ HTTPS
  fullUrl: "https://api.momichan.xyz/api/v1/posts?page=1...",  // ✅ HTTPS
  params: {page: 1, ...}
}
```

#### ❌ 如果看到这个 - 说明拦截器在工作

```javascript
🚨🚨🚨 CRITICAL: HTTP URL detected! {
  original: "http://api.momichan.xyz/api/v1/posts",
  fixed: "https://api.momichan.xyz/api/v1/posts",
  configBaseURL: "http://...",  // 这里会显示 HTTP 的来源
  configUrl: "/posts"
}
```

虽然这是警告，但请求会被修正为 HTTPS，所以不会有 Mixed Content 错误。

### 第三步：检查网络请求

1. **打开 Network 标签**
2. **勾选 "Preserve log"**
3. **刷新页面**
4. **检查所有请求**

#### ✅ 应该看到

```
GET https://api.momichan.xyz/api/v1/posts?... 200 OK
GET https://api.momichan.xyz/api/v1/posts/stats/summary 200 OK
GET https://api.momichan.xyz/api/v1/auth/me 200 OK
```

#### ❌ 不应该看到

```
GET http://api.momichan.xyz/...  (blocked:mixed-content)
```

### 第四步：功能测试

- [ ] 主页帖子列表加载正常
- [ ] 可以滚动加载更多帖子
- [ ] 统计数据显示正常
- [ ] 登录功能正常
- [ ] 头像图片显示
- [ ] 视频/图片预览正常

## 🔍 故障排除

### 情况 1：仍然看到 Mixed Content 错误

**症状**：
```
Mixed Content: ...requested an insecure XMLHttpRequest endpoint 'http://...'
```

**可能原因**：

1. **浏览器缓存了旧代码**
   - 解决：强制硬刷新 `Ctrl + Shift + R`
   - 或使用隐私/无痕模式

2. **CDN/Cloudflare 缓存了旧版本**
   - 解决：等待 5-10 分钟让缓存过期
   - 或在 Cloudflare 手动清除缓存

3. **Service Worker 仍在使用旧代码**
   - 解决：Application → Service Workers → Unregister
   - 关闭所有标签，重新打开

4. **构建时环境变量仍是 HTTP**
   - 检查：Cloudflare Pages → Settings → Environment variables
   - 确认都是 HTTPS
   - 重新触发构建

### 情况 2：看不到任何控制台日志

**可能原因**：

1. **Vite 配置仍在删除 console**
   - 检查：`vite.config.ts` 中的 `drop: ['console']` 是否被注释
   - 如果没有，重新提交并推送

2. **构建还没完成**
   - 检查：Cloudflare Pages 构建状态
   - 等待构建完成

### 情况 3：日志显示 HTTPS，但仍有 Mixed Content

这是**最奇怪**的情况，可能意味着：

1. **有其他代码在直接使用 fetch() API**
   - 搜索代码库中的 `fetch(` 调用
   - 检查第三方库

2. **某个第三方库在创建 HTTP 请求**
   - 检查 Network 标签中失败请求的 initiator
   - 查看堆栈追踪

3. **浏览器扩展在修改请求**
   - 在隐私/无痕模式测试
   - 禁用所有浏览器扩展

### 情况 4：拦截器警告 HTTP，但没有 Mixed Content

这是**好消息**！说明：
- 拦截器成功捕获并修正了 HTTP 请求
- 实际发送的请求是 HTTPS
- 功能正常

后续可以追踪为什么会有 HTTP（从日志中的 `configBaseURL` 字段）。

## 📞 调试协助

如果以上都无效，请提供以下信息：

1. **完整的控制台日志**（从页面加载开始）
2. **Network 标签截图**（显示失败的请求）
3. **Application 标签**（Service Worker 状态）
4. **Cloudflare Pages 构建日志**
5. **Cloudflare Environment Variables 截图**

## 🎯 成功标志

当看到以下情况，说明问题解决：

- ✅ 控制台：`🌐 API Configuration` 显示 `baseURL: "https://..."`
- ✅ 控制台：`[Request]` 日志显示 `fullUrl: "https://..."`
- ✅ 控制台：**没有** Mixed Content 错误
- ✅ Network：所有 API 请求都是 `https://api.momichan.xyz/api/v1/*`
- ✅ 功能：帖子列表正常加载
- ✅ 功能：所有其他功能正常

---

**注意**：一旦确认修复成功，请恢复 `vite.config.ts` 中的 console 删除配置，以减少生产环境的包大小和提高性能。
