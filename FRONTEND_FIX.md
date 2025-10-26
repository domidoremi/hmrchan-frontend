# 🔧 前端CORS问题最终解决方案

## 问题根源

前端代码在直接访问 `http://localhost:8000`，绕过了Vite的代理配置，导致浏览器CORS预检请求失败。

## ✅ 解决方案

### 1. 修改环境变量

文件：`frontend/.env.development`

**之前** (错误):
```bash
VITE_API_BASE_URL=http://localhost:8000  # ❌ 变量名不匹配
```

**之后** (正确):
```bash
VITE_API_URL=/api  # ✅ 使用Vite代理
```

### 2. Vite代理配置

文件：`frontend/vite.config.ts` (已有，无需修改)

```typescript
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    },
  },
}
```

## 🎯 工作原理

### 使用代理方式

```
Browser (http://localhost:5173)
    ↓ 请求 /api/posts
Vite Dev Server (localhost:5173)
    ↓ 代理转发到 http://localhost:8000/api/posts
Backend API (localhost:8000)
```

**优点**:
- ✅ 同源请求，无CORS问题
- ✅ 开发环境简单
- ✅ 生产环境可以用Nginx代理

### 直接请求方式（之前的错误做法）

```
Browser (http://localhost:5173)
    ↓ 直接请求 http://localhost:8000/api/posts
    ❌ CORS预检失败
Backend API (localhost:8000)
```

## 🔄 重启前端服务

环境变量修改后，**必须重启**前端开发服务器：

```bash
# 1. 停止当前服务 (Ctrl+C)

# 2. 重新启动
cd frontend
bun run dev
```

## 🧪 验证

启动后检查：

### 1. 检查API路径

打开浏览器开发者工具（F12），查看Network标签：

**正确** ✅:
```
Request URL: http://localhost:5173/api/posts?page=1
```

**错误** ❌:
```
Request URL: http://localhost:8000/api/posts?page=1
```

### 2. 无CORS错误

控制台不应该有CORS错误消息。

### 3. 数据加载成功

首页应该显示内容列表。

## 📝 其他环境文件

### 生产环境

文件：`frontend/.env.production`

```bash
# 生产环境使用实际的API域名
VITE_API_URL=https://api.yourdomain.com/api
```

或者如果前端和后端部署在同一域名下：
```bash
VITE_API_URL=/api
```

## 🎉 完成

修改后：
1. 重启前端服务：`bun run dev`
2. 访问：http://localhost:5173
3. 应该能正常加载数据，无CORS错误

## 💡 为什么之前测试通过但浏览器失败？

- **Python脚本测试**：直接HTTP请求，不涉及浏览器CORS策略
- **浏览器访问**：受同源策略限制，需要CORS头或使用代理

## 🔍 如果仍有问题

### 清除浏览器缓存

1. 按 `Ctrl + Shift + Delete`
2. 清除缓存
3. 或使用无痕模式测试

### 检查环境变量

```bash
# 前端目录下
cat .env.development
```

应该看到：
```
VITE_API_URL=/api
```

### 检查Vite配置

```bash
cat vite.config.ts | grep -A 5 proxy
```

应该有proxy配置。

---

**关键点**：开发环境使用Vite代理（`/api`），不要直接请求跨域URL！
