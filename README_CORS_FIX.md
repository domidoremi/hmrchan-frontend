# CORS问题解决方案

## 问题描述

前端访问后端API时遇到CORS错误：
```
Access to XMLHttpRequest at 'http://localhost:8000/api/posts' from origin 'http://localhost:5173' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## 根本原因

后端默认CORS配置只允许：
- `http://localhost:3000`
- `http://localhost:8000`

但前端Vite开发服务器运行在 `http://localhost:5173`

## ✅ 解决方案

### 1. 已创建后端 `.env` 文件

在 `backend/.env` 中添加了前端地址：
```bash
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8000
```

### 2. 重启后端服务

如果后端正在运行，需要重启以加载新的环境变量：

```bash
# 停止当前服务 (Ctrl+C)

# 重新启动
cd backend
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. 验证修复

重启后端后，刷新前端页面：
```bash
# 前端应该可以正常访问了
http://localhost:5173
```

## 🔍 其他可能的问题

### 后端未启动

检查后端是否正在运行：
```bash
# 访问健康检查端点
curl http://localhost:8000/health

# 或访问API文档
http://localhost:8000/api/docs
```

如果无法访问，启动后端：
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

### 使用Docker

如果使用Docker：
```bash
# 重启容器以加载新的环境变量
docker-compose restart api

# 或重新构建
docker-compose up -d --build api
```

## 📝 验证步骤

1. ✅ 后端 `.env` 文件已创建，包含正确的CORS配置
2. ⏳ 重启后端服务
3. ⏳ 刷新前端页面，确认数据加载成功

## 🎯 预期结果

修复后，前端应该能够：
- ✅ 加载首页统计数据
- ✅ 显示最新内容列表
- ✅ 使用收藏功能
- ✅ 搜索和筛选内容

## 💡 生产环境配置

生产环境需要配置实际的域名：
```bash
CORS_ORIGINS=https://yourdomain.com,https://api.yourdomain.com
```

不要在生产环境使用 `*`（允许所有域名），这会带来安全风险。
