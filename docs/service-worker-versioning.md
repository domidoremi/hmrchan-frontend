# Service Worker 版本管理策略

## 版本号格式

```
v{major}-{minor}-{patch}-{git-hash}-b{build-number}
```

**示例**: `v1-0-0-a1b2c3d-b123`

### 组成部分

| 部分                | 来源                   | 说明                 | 示例              |
| ------------------- | ---------------------- | -------------------- | ----------------- |
| `major.minor.patch` | `package.json` version | 语义化版本号         | `1.0.0` → `1-0-0` |
| `git-hash`          | Git commit (short)     | 当前提交的短哈希     | `a1b2c3d`         |
| `build-number`      | Git commit count       | 构建编号（提交总数） | `b123`            |

## 版本更新时机

### 自动更新（推荐）

每次运行 `bun run build` 时，脚本会：

1. **检查 SW 文件内容** - 计算内容哈希（排除版本行）
2. **检查 Git 状态** - 获取当前 commit hash
3. **智能判断** - 只在以下情况更新版本：
   - SW 文件内容发生变化
   - Git commit 发生变化
   - 使用 `--force` 参数强制更新

### 手动更新

```bash
# 查看当前版本（不修改文件）
node scripts/update-sw-version.js --dry-run

# 强制更新版本
node scripts/update-sw-version.js --force
```

## 缓存失效策略

### CACHE_VERSION 的作用

```javascript
const CACHE_VERSION = 'v1-0-0-a1b2c3d-b123'
const CACHE_NAMES = {
  static: `hmrchan-static-${CACHE_VERSION}`,
  api: `hmrchan-api-${CACHE_VERSION}`,
  media: `hmrchan-media-${CACHE_VERSION}`,
  posts: `hmrchan-posts-${CACHE_VERSION}`,
}
```

当 `CACHE_VERSION` 改变时：

- ✅ 新的 SW 安装时会创建新的缓存空间
- ✅ 激活时会删除旧版本的所有缓存
- ✅ 用户获得最新的资源和数据

### 何时需要更新缓存版本

| 场景                  | 是否更新 | 原因                       |
| --------------------- | -------- | -------------------------- |
| 修改 SW 缓存策略      | ✅ 是    | 缓存逻辑变化，需要重新缓存 |
| 修改 API 响应格式     | ✅ 是    | 旧缓存数据可能不兼容       |
| 修改静态资源          | ✅ 是    | 确保用户获得最新资源       |
| 修改业务代码（非 SW） | ⚠️ 自动  | Git commit 变化会自动更新  |
| 仅修改文档/注释       | ❌ 否    | 不影响功能，无需清空缓存   |

## 版本号示例

### 开发阶段

```
v1-0-0-a1b2c3d-b45   # 第 45 次构建，commit a1b2c3d
v1-0-0-b2c3d4e-b46   # 第 46 次构建，commit b2c3d4e
```

### 发布新版本

```
v1-0-0-c3d4e5f-b50   # 1.0.0 版本
v1-1-0-d4e5f6a-b75   # 1.1.0 版本（新功能）
v1-1-1-e5f6a7b-b78   # 1.1.1 版本（bug 修复）
v2-0-0-f6a7b8c-b100  # 2.0.0 版本（重大更新）
```

## 最佳实践

### 1. 语义化版本管理

在 `package.json` 中遵循语义化版本规范：

```json
{
  "version": "1.2.3"
}
```

- **Major (1)**: 不兼容的 API 变更
- **Minor (2)**: 向后兼容的新功能
- **Patch (3)**: 向后兼容的 bug 修复

### 2. 提交信息规范

使用 Conventional Commits 格式，便于追踪版本变化：

```bash
feat: 添加视频播放器手势控制
fix: 修复缓存键标准化问题
perf: 优化 SW 缓存策略
```

### 3. 版本发布流程

```bash
# 1. 更新版本号
npm version patch  # 或 minor / major

# 2. 构建（自动更新 SW 版本）
bun run build

# 3. 提交版本变更
git add .
git commit -m "chore: 发布 v1.2.3"

# 4. 创建标签
git tag v1.2.3

# 5. 推送
git push origin main --tags
```

### 4. 监控版本部署

在浏览器控制台查看当前 SW 版本：

```javascript
// 查看活动的 SW 版本
navigator.serviceWorker.getRegistration().then((reg) => {
  console.log('SW Version:', reg.active?.scriptURL)
})

// 查看缓存版本
caches.keys().then((keys) => {
  console.log('Cache Keys:', keys)
})
```

## 故障排查

### 问题：用户看到旧版本

**原因**：浏览器缓存了旧的 SW 文件

**解决方案**：

1. 确保 `sw.js` 的 HTTP 响应头设置了 `Cache-Control: no-cache`
2. 在 `_headers` 文件中配置：
   ```
   /sw.js
     Cache-Control: no-cache, no-store, must-revalidate
   ```

### 问题：频繁清空缓存

**原因**：每次构建都生成新版本号

**解决方案**：

- 使用优化后的脚本（基于 Git hash）
- 只在真正需要时更新 `package.json` 的 version

### 问题：开发环境缓存问题

**解决方案**：

```javascript
// 开发环境禁用 SW
if (import.meta.env.DEV) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((reg) => reg.unregister())
  })
}
```

## 参考资料

- [Service Worker Lifecycle](https://web.dev/service-worker-lifecycle/)
- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
