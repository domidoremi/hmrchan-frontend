# 缓存问题调试指南

## 🐛 问题症状

```
mediaFilesCount: 0
media_files: undefined
```

## 🔍 根本原因

### 三层缓存导致问题：

1. **Service Worker Cache** - 缓存API响应
2. **IndexedDB** - 应用层缓存
3. **Memory Cache** - 运行时缓存（Pinia store）

### 时序问题：

```
1. 用户访问帖子
2. fetchPost() 检测到5分钟内的缓存
3. 立即返回旧缓存（无media_files）
4. 开始后台刷新
5. **用户已经打开PhotoSwipe**（使用旧数据）
6. 后台刷新完成（更新currentPost，但PhotoSwipe已打开）
```

## 🔧 临时解决方案

### 方案1: 浏览器控制台执行

```javascript
// 1. 删除所有数据库
indexedDB.deleteDatabase('hmrchan_db')
indexedDB.deleteDatabase('hmrchan-cache')

// 2. 清除Service Worker缓存
navigator.serviceWorker.getRegistrations().then((registrations) => {
  registrations.forEach((reg) => reg.unregister())
})

// 3. 清除所有缓存
caches.keys().then((names) => {
  names.forEach((name) => caches.delete(name))
})

// 4. 刷新页面
location.reload()
```

### 方案2: 开发者工具

1. F12 > Application
2. Storage > Clear storage
3. 勾选所有
4. Clear site data
5. 刷新

## 🛠️ 永久修复方案

### 修复1: 禁用API响应的SW缓存

Service Worker不应缓存 `/api/v1/posts/{id}` 响应

### 修复2: 缩短缓存TTL

5分钟太长，改为30秒

### 修复3: 后台刷新完成后触发事件

通知PhotoSwipe数据已更新

### 修复4: 添加"刷新"按钮

让用户手动刷新数据
