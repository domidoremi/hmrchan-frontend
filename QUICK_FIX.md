# 🚨 混合内容错误 - 快速修复指南

## 问题
```
Mixed Content: HTTPS页面请求HTTP资源被阻止
```

## ⚡ 立即修复（选择一个）

### 方案 A: 配置 Cloudflare Pages（推荐）

1. **登录**: https://dash.cloudflare.com/
2. **进入**: Workers & Pages → 你的项目 → Settings → Environment variables
3. **添加** (Production):
   ```
   VITE_API_BASE_URL = https://api.momichan.xyz
   VITE_API_ENDPOINT = https://api.momichan.xyz/api/v1
   ```
4. **重新部署**: Settings → Deployments → Retry deployment

### 方案 B: 使用代码默认值（已完成✅）

我已经修改了代码，添加了HTTPS默认值。只需要：

```bash
# 1. 提交更改
git add .
git commit -m "fix: add HTTPS fallback for production"
git push

# 2. 等待自动部署完成
```

## ✅ 验证修复

打开浏览器Console (F12)，检查：
- ❌ 不应该看到 "Mixed Content" 错误
- ✅ Network标签中所有请求都是 `https://`

## 📋 修改的文件

1. ✅ `src/api/client.ts` - 添加生产HTTPS默认值
2. ✅ `src/utils/url.ts` - 添加API URL HTTPS fallback
3. ✅ `CLOUDFLARE_DEPLOYMENT.md` - 完整部署指南

## 🔧 如果还有问题

### 清除缓存
```bash
# 浏览器
Ctrl + Shift + Delete → 清除缓存

# 或硬刷新
Ctrl + Shift + R
```

### 检查API请求
```javascript
// 在浏览器Console运行
console.log('API:', import.meta.env.VITE_API_ENDPOINT)
// 应该输出: https://api.momichan.xyz/api/v1
```

### 后端CORS配置

如果看到CORS错误，联系后端添加：
```python
allow_origins=[
    "https://71723daa.hmrchan-frontend.pages.dev",
    "https://*.pages.dev",
]
```

## 📚 详细文档

- 完整指南: `CLOUDFLARE_DEPLOYMENT.md`
- API修复: `PLYR_MEDIA_FIXES.md`
- 功能增强: `MEDIA_ENHANCEMENTS.md`

---

**修复时间**: < 5分钟  
**难度**: ⭐ 简单
