# 开发性能优化快速参考

## 快速测试命令

```bash
# 测试开发服务器启动速度
npm run perf:dev

# 分析热更新性能
npm run perf:hmr

# 测试构建速度
npm run perf:build

# 比较构建配置
npm run perf:compare

# 完整的构建分析
npm run build:analyze
```

## 性能目标

| 指标           | 目标   | 当前预期 |
| -------------- | ------ | -------- |
| 开发服务器启动 | < 5s   | 3-5s     |
| 热更新响应     | < 1s   | < 200ms  |
| 生产构建       | < 2min | 40-60s   |

## 常见问题快速解决

### 启动慢？

```bash
# 清理 Vite 缓存
rm -rf node_modules/.vite

# 重新安装依赖
rm -rf node_modules
npm install
```

### 热更新慢？

1. 检查组件是否使用 `<script setup>`
2. 检查是否导入了整个 store（使用 `storeToRefs`）
3. 拆分大型组件（> 300 行）

### 构建慢？

1. 确认 `sourcemap: false`
2. 确认 `reportCompressedSize: false`
3. 使用 `npm run perf:build` 分析

## 优化检查清单

### 开发服务器

- [x] 精确指定 `optimizeDeps.include`
- [x] 排除按需加载的依赖
- [x] 配置 `optimizeDeps.entries`
- [x] 增强 `server.warmup`
- [x] 启用 `fs.strict`

### 热更新

- [ ] 迁移组件到 `<script setup>`
- [ ] 使用 `storeToRefs` 解构 store
- [ ] 拆分大型组件
- [ ] 避免全局样式导入

### 构建

- [x] 禁用 sourcemap
- [x] 禁用 reportCompressedSize
- [x] 使用 esbuild 压缩
- [x] 优化代码分割

## 最佳实践

### 导入优化

```typescript
// ❌ 不好
import { usePostsStore } from '@/stores/posts'
const store = usePostsStore()
const posts = store.posts // 失去响应性

// ✅ 好
import { storeToRefs } from 'pinia'
import { usePostsStore } from '@/stores/posts'
const store = usePostsStore()
const { posts, loading } = storeToRefs(store)
```

### 组件优化

```vue
<!-- ❌ 不好 -->
<script lang="ts">
export default defineComponent({
  setup() {
    // ...
  },
})
</script>

<!-- ✅ 好 -->
<script setup lang="ts">
// ...
</script>
```

### 懒加载

```typescript
// ❌ 不好
import MediaViewer from '@/components/ui/MediaViewer.vue'

// ✅ 好
const MediaViewer = defineAsyncComponent(() => import('@/components/ui/MediaViewer.vue'))
```

## 详细文档

- [完整优化文档](./dev-experience-optimization.md)
- [Script Setup 迁移指南](./script-setup-migration-guide.md)
- [任务实施总结](./task-30-implementation-summary.md)

## 监控建议

- 每周测试一次启动速度
- 每次重大更新后测试构建速度
- 记录性能指标，跟踪趋势

## 需要帮助？

查看详细文档或联系团队成员。
