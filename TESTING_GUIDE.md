# 测试指南

## 快速测试步骤

### 1. 启动开发服务器

```bash
bun run dev
```

访问 http://localhost:5173

### 2. 测试缩略图质量功能

#### 桌面端测试 (≥ 1024px)

1. 打开浏览器开发者工具 (F12)
2. 切换到 Network 标签
3. 访问首页 `/`
4. 查找 `/api/v1/posts` 请求
5. 检查请求参数是否包含 `thumbnail_quality=large`
6. 检查响应中的 `thumbnail_url` 是否包含 `?size=large`

#### 平板端测试 (640px - 1024px)

1. 在开发者工具中切换到设备模拟模式
2. 选择 iPad 或设置宽度为 768px
3. 刷新页面
4. 检查请求参数是否包含 `thumbnail_quality=medium`
5. 检查响应中的 `thumbnail_url` 是否包含 `?size=medium`

#### 移动端测试 (< 640px)

1. 选择 iPhone 或设置宽度为 375px
2. 刷新页面
3. 检查请求参数是否包含 `thumbnail_quality=small`
4. 检查响应中的 `thumbnail_url` 是否包含 `?size=small`

### 3. 测试访客限制提示功能

#### 未登录状态测试

1. 确保处于未登录状态（清除 localStorage 或使用无痕模式）
2. 访问首页 `/`
3. 应该看到 GuestLimitBanner 组件显示
4. 检查提示文案是否正确显示
5. 点击"登录"按钮，应跳转到 `/login?redirect=/`

#### 探索页面测试

1. 访问 `/explore`
2. 选择不同的平台筛选（YouTube, TikTok 等）
3. 检查是否显示访客限制提示
4. 如果是多平台查询，检查提示文案是否显示"每平台限制"

#### 搜索页面测试

1. 访问 `/search?q=test`
2. 检查搜索结果页是否显示访客限制提示
3. 切换不同的平台筛选
4. 验证提示文案的正确性

#### 登录用户测试

1. 登录账号
2. 访问首页、探索页、搜索页
3. 确认 GuestLimitBanner **不显示**
4. 验证可以加载更多内容（超过访客限制数量）

### 4. 测试国际化

#### 英文测试

1. 在设置中切换语言为 English
2. 访问首页（未登录状态）
3. 检查 GuestLimitBanner 显示英文文案：
   - 标题: "Limited Content for Guests"
   - 描述: "As a guest, you can view up to X posts..."

#### 中文测试

1. 切换语言为简体中文
2. 检查 GuestLimitBanner 显示中文文案：
   - 标题: "访客内容限制"
   - 描述: "作为访客，您最多可以查看 X 条内容..."

#### 日文测试

1. 切换语言为日本語
2. 检查 GuestLimitBanner 显示日文文案：
   - 标题: "ゲストコンテンツ制限"
   - 描述: "ゲストとして、最大 X 件の投稿を表示できます..."

### 5. 测试响应式设计

#### 桌面端 (≥ 1024px)

- GuestLimitBanner 应横向排列
- 图标、文字、按钮在一行显示
- 按钮宽度自适应内容

#### 移动端 (< 640px)

- GuestLimitBanner 应纵向排列
- 图标、文字、按钮居中显示
- 按钮占满宽度

### 6. 测试边界情况

#### 无限制响应

1. 登录用户访问页面
2. 检查响应头中没有 `X-Content-Limited` 或值为 `false`
3. 确认 GuestLimitBanner 不显示

#### 网络错误

1. 在开发者工具中模拟离线状态
2. 刷新页面
3. 应显示错误提示而不是 GuestLimitBanner

#### 空结果

1. 搜索一个不存在的关键词
2. 应显示"无结果"提示
3. 不应显示 GuestLimitBanner

## 自动化测试建议

### 单元测试

```typescript
// src/components/ui/__tests__/GuestLimitBanner.spec.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GuestLimitBanner from '../GuestLimitBanner.vue'

describe('GuestLimitBanner', () => {
  it('should not render when limitInfo is undefined', () => {
    const wrapper = mount(GuestLimitBanner, {
      props: { limitInfo: undefined },
    })
    expect(wrapper.find('.guest-limit-banner').exists()).toBe(false)
  })

  it('should render when limitInfo.isLimited is true', () => {
    const wrapper = mount(GuestLimitBanner, {
      props: {
        limitInfo: {
          isLimited: true,
          guestLimit: 10,
        },
      },
    })
    expect(wrapper.find('.guest-limit-banner').exists()).toBe(true)
  })

  it('should show single platform description', () => {
    const wrapper = mount(GuestLimitBanner, {
      props: {
        limitInfo: {
          isLimited: true,
          guestLimit: 10,
        },
      },
    })
    expect(wrapper.text()).toContain('10')
  })

  it('should show multi-platform description', () => {
    const wrapper = mount(GuestLimitBanner, {
      props: {
        limitInfo: {
          isLimited: true,
          perPlatformLimit: 15,
          maxResults: 60,
        },
      },
    })
    expect(wrapper.text()).toContain('15')
    expect(wrapper.text()).toContain('60')
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
    // Mock window.innerWidth
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

  it('should display GuestLimitBanner when limitInfo is present', async () => {
    vi.mocked(postService.listPosts).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
      total_pages: 0,
      limitInfo: {
        isLimited: true,
        guestLimit: 10,
      },
    })

    const wrapper = mount(HomePage)
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent({ name: 'GuestLimitBanner' }).exists()).toBe(true)
  })
})
```

## 性能测试

### 图片加载性能

1. 打开 Network 标签
2. 切换到移动端视图 (small quality)
3. 记录总传输大小
4. 切换到桌面端视图 (large quality)
5. 对比传输大小差异
6. 预期：移动端传输大小应显著小于桌面端

### 响应时间

1. 在 Network 标签中查看 API 请求时间
2. 添加 `thumbnail_quality` 参数不应显著增加响应时间
3. 预期：响应时间差异 < 50ms

## 浏览器兼容性测试

测试以下浏览器：

- Chrome (最新版)
- Firefox (最新版)
- Safari (最新版)
- Edge (最新版)
- 移动端 Safari (iOS)
- 移动端 Chrome (Android)

检查项：

- GuestLimitBanner 样式正常显示
- 响应式布局正确
- 按钮点击正常工作
- 国际化文案正确显示

## 问题排查

### GuestLimitBanner 不显示

1. 检查是否处于未登录状态
2. 检查 Network 标签中的响应头是否包含 `X-Content-Limited: true`
3. 检查 `limitInfo` 状态是否正确设置
4. 检查组件的 `v-if` 条件

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

## 报告问题

如果发现问题，请提供：

1. 浏览器和版本
2. 屏幕尺寸
3. 登录状态
4. 复现步骤
5. 预期行为 vs 实际行为
6. 控制台错误信息
7. Network 标签截图
