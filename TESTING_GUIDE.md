# 测试指南

## 快速测试步骤

### 1. 启动开发服务器

```bash
bun run dev
```

访问 http://localhost:5173

### 2. 测试缩略图质量功能

#### 桌面端测试 (≥ 640px)

1. 打开浏览器开发者工具 (F12)
2. 切换到 Network 标签
3. 访问首页 `/`
4. 查找 `/api/v1/posts` 请求
5. 检查请求参数是否包含 `thumbnail_quality=large`
6. 检查响应中的 `thumbnail_url` 是否包含 `?size=large`

#### 移动端测试 (< 640px)

1. 在开发者工具中切换到设备模拟模式
2. 选择 iPhone 或设置宽度为 375px
3. 刷新页面
4. 检查请求参数是否包含 `thumbnail_quality=medium`
5. 检查响应中的 `thumbnail_url` 是否包含 `?size=medium`

### 3. 测试国际化

#### 英文测试

1. 在设置中切换语言为 English
2. 访问首页
3. 检查所有文案显示为英文

#### 中文测试

1. 切换语言为简体中文
2. 检查所有文案显示为中文

#### 日文测试

1. 切换语言为日本語
2. 检查所有文案显示为日文

### 4. 测试响应式设计

#### 桌面端 (≥ 1024px)

- 检查 Masonry 布局为 4 列
- 导航栏完整显示
- 卡片尺寸适中

#### 平板端 (640px - 1024px)

- 检查 Masonry 布局为 3 列
- 导航栏可能收缩
- 卡片尺寸适应屏幕

#### 移动端 (< 640px)

- 检查 Masonry 布局为 2 列
- 导航栏显示汉堡菜单
- 卡片尺寸适应小屏幕

### 5. 测试边界情况

#### 网络错误

1. 在开发者工具中模拟离线状态
2. 刷新页面
3. 应显示错误提示和重试按钮

#### 空结果

1. 搜索一个不存在的关键词
2. 应显示"无结果"提示
3. 提供返回或清除搜索的选项

#### 加载状态

1. 在 Network 标签中限制网速（Slow 3G）
2. 刷新页面
3. 应显示骨架屏加载动画
4. 加载完成后平滑过渡到实际内容

## 自动化测试建议

### 单元测试

```typescript
// src/composables/__tests__/useMasonryColumns.spec.ts
import { describe, it, expect } from 'vitest'
import { useMasonryColumns } from '../useMasonryColumns'

describe('useMasonryColumns', () => {
  it('should distribute posts evenly across columns', () => {
    const { distributePosts, columns } = useMasonryColumns({ initialColumnCount: 3 })
    const posts = Array.from({ length: 9 }, (_, i) => ({ id: `${i}`, height: 200 }))

    distributePosts(posts, 300, false)

    expect(columns.value).toHaveLength(3)
    expect(columns.value[0]).toHaveLength(3)
  })
})
```

### 集成测试

```typescript
// src/views/__tests__/HomePage.spec.ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import HomePage from '../HomePage.vue'
import { postService } from '@/api'

vi.mock('@/api', () => ({
  postService: {
    listPosts: vi.fn(),
  },
}))

describe('HomePage', () => {
  it('should pass thumbnail_quality parameter based on screen size', async () => {
    // Mock window.innerWidth for desktop
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200,
    })

    const wrapper = mount(HomePage)
    await wrapper.vm.$nextTick()

    expect(postService.listPosts).toHaveBeenCalledWith(
      expect.objectContaining({
        thumbnail_quality: 'large',
      })
    )
  })

  it('should use medium quality on mobile', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    })

    const wrapper = mount(HomePage)
    await wrapper.vm.$nextTick()

    expect(postService.listPosts).toHaveBeenCalledWith(
      expect.objectContaining({
        thumbnail_quality: 'medium',
      })
    )
  })
})
```

## 性能测试

### 图片加载性能

1. 打开 Network 标签
2. 切换到移动端视图 (medium quality)
3. 记录总传输大小
4. 切换到桌面端视图 (large quality)
5. 对比传输大小差异
6. 预期：移动端传输大小应显著小于桌面端

### 响应时间

1. 在 Network 标签中查看 API 请求时间
2. 添加 `thumbnail_quality` 参数不应显著增加响应时间
3. 预期：响应时间差异 < 50ms

### Core Web Vitals

使用 Lighthouse 测试以下指标：

- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1

## 浏览器兼容性测试

测试以下浏览器：

- Chrome (最新版)
- Firefox (最新版)
- Safari (最新版)
- Edge (最新版)
- 移动端 Safari (iOS)
- 移动端 Chrome (Android)

检查项：

- 页面布局正常显示
- 响应式布局正确
- 按钮和交互正常工作
- 国际化文案正确显示
- 图片加载正常
- 动画流畅

## 问题排查

### 缩略图质量参数未生效

1. 检查 Network 标签中的请求 URL
2. 确认 `thumbnail_quality` 参数存在
3. 检查后端是否正确处理该参数
4. 验证响应中的 `thumbnail_url` 格式

### 国际化文案不显示

1. 检查 i18n 配置是否正确
2. 确认翻译键存在于所有语言文件中
3. 检查组件中的 `$t()` 调用是否正确
4. 验证当前语言设置

### Masonry 布局错乱

1. 检查容器宽度是否正确计算
2. 验证 ResizeObserver 是否正常工作
3. 检查列数是否根据屏幕尺寸正确设置
4. 确认图片加载完成后触发重新布局

### 无限滚动不工作

1. 检查 IntersectionObserver 是否支持
2. 验证 sentinel 元素是否正确渲染
3. 检查 hasMore 状态是否正确
4. 确认 API 返回的分页信息正确

## 报告问题

如果发现问题，请提供：

1. 浏览器和版本
2. 屏幕尺寸
3. 登录状态
4. 复现步骤
5. 预期行为 vs 实际行为
6. 控制台错误信息
7. Network 标签截图
8. 相关的 localStorage/sessionStorage 数据
