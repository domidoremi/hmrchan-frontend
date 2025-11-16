# 技术债务追踪

## 🔴 高优先级债务（需要立即处理）

### 1. 功能重复 - 关键问题

**负债等级**: 🔴🔴🔴 严重  
**影响**: 维护成本高、容易出错、开发者困惑

#### 具体问题：

```typescript
// 重复 #1: Debounce
utils / debounce.ts // 250行
composables / useDebounce.ts // 120行

// 重复 #2: Throttle
utils / throttle.ts // 180行
composables / useThrottle.ts // 200行

// 重复 #3: Toast
utils / toast.ts // 150行
composables / useToast.ts // 100行
stores / toast.ts // 150行  ⚠️ 三个地方！
```

**解决方案**：

```typescript
// 统一架构
Store (toast.ts)          → 状态管理
  ↓
Composable (useToast.ts)  → 组合式API封装
  ↓
Component                 → 使用

// 删除 utils/toast.ts
```

**工作量**: 0.5天  
**风险**: 低（只是重定向导入）

---

### 2. 类型安全问题

**负债等级**: 🔴🔴 重要  
**影响**: 运行时错误风险、IDE 支持差

#### 问题文件清单：

```typescript
useFormValidation.ts  (8 个 any)
RadioGroup.vue        (5 个 any)
Radio.vue             (4 个 any)
Checkbox.vue          (1 个 any)
Select.vue            (1 个 any)
```

**具体案例**：

```typescript
// ❌ 当前代码
interface Props {
  modelValue: any // 不安全！
  options: any[] // 不安全！
}

// ✅ 应该改为
interface Props<T = string> {
  modelValue: T
  options: SelectOption<T>[]
}

interface SelectOption<T> {
  label: string
  value: T
  disabled?: boolean
}
```

**工作量**: 2-3天  
**风险**: 中（需要仔细测试所有表单场景）

---

### 3. 响应式 Composables 冲突

**负债等级**: 🔴 中等  
**影响**: 开发者困惑、可能的逻辑不一致

```typescript
// 两个类似的 composable
useResponsive.ts // 224行 - 通用断点检测
useResponsiveLayout.ts // 120行 - 布局计算

// 使用场景重叠
isMobile // 在两个文件中都有！
isTablet // 在两个文件中都有！
isDesktop // 在两个文件中都有！
```

**解决方案**：

```typescript
// 合并为一个文件
export function useResponsive() {
  // 基础功能（来自 useResponsive）
  const { windowWidth, windowHeight, breakpoint } = useViewport()

  // 布局功能（来自 useResponsiveLayout）
  const { navbarHeight, safeAreaBottom } = useLayoutCalculations(windowWidth)

  return {
    // 暴露所有功能
    windowWidth,
    windowHeight,
    breakpoint,
    isMobile,
    isTablet,
    isDesktop,
    navbarHeight,
    safeAreaBottom,
    // ...
  }
}
```

**工作量**: 0.5天  
**风险**: 低（只是合并）

---

## 🟡 中优先级债务（短期内处理）

### 4. PostCard 组件复杂度

**负债等级**: 🟡🟡 中等  
**影响**: 难以维护、测试困难、复用性差

#### 当前结构：

```
PostCard.vue (590行)
├── Props传递: 15+ props
├── Events: 4+ events
├── 状态管理: 分散在组件内
└── 子组件:
    ├── PostCardMedia.vue
    ├── PostCardActions.vue
    └── PostCardContent.vue
```

#### 问题分析：

1. **责任过多**：处理收藏、分享、预览、动画
2. **Props drilling**：需要传递很多数据到子组件
3. **难以测试**：逻辑耦合严重

#### 重构建议：

```typescript
// 方案A: Provide/Inject 模式
// PostCard.vue
const cardContext = {
  post: computed(() => props.post),
  isFavorited: ref(false),
  isHovered: ref(false),
  handlers: {
    onFavorite,
    onShare,
    onMore,
  },
}
provide('postCard', cardContext)

// PostCardActions.vue
const { isFavorited, handlers } = inject('postCard')

// 方案B: Composable 模式
const { state, actions, handlers } = usePostCardState(props.post)
```

**工作量**: 3-4天  
**风险**: 中（需要全面测试）

---

### 5. Composables 组织混乱

**负债等级**: 🟡 中等  
**影响**: 难以找到需要的功能、命名不一致

#### 当前状态：

```
composables/ (35个文件，平坦结构)
├── useAccessibility.ts
├── useAnimation.ts
├── useAutoSave.ts
├── ... (32 more files)
```

#### 建议结构：

```
composables/
├── core/                    # 核心功能
│   ├── useResponsive.ts
│   ├── useRouter.ts
│   └── useI18n.ts
├── ui/                      # UI交互
│   ├── useAnimation.ts
│   ├── useModal.ts
│   ├── useToast.ts
│   └── useTheme.ts
├── form/                    # 表单相关
│   ├── useFormValidation.ts
│   └── useAutoSave.ts
├── data/                    # 数据处理
│   ├── useFetch.ts
│   ├── useCache.ts
│   └── useOptimisticUpdate.ts
├── media/                   # 媒体处理
│   ├── useImagePreload.ts
│   ├── useImageLazyLoad.ts
│   └── useMediaErrorRecovery.ts
└── business/               # 业务逻辑
    ├── usePostCard.ts
    ├── useFavorites.ts
    └── useSearch.ts
```

**工作量**: 2天  
**风险**: 低（主要是移动文件）

---

### 6. Utils 函数组织

**负债等级**: 🟡 中等  
**影响**: 难以维护、导入路径混乱

#### 建议重组：

```
utils/
├── format/                 # 格式化
│   ├── date.ts
│   ├── number.ts
│   └── text.ts
├── validation/             # 验证
│   ├── input.ts
│   └── xss.ts
├── storage/               # 存储
│   ├── indexedDB.ts
│   ├── storageManager.ts
│   └── cache/
├── performance/           # 性能
│   ├── preload.ts
│   └── imageOptimizer.ts
└── helpers/              # 辅助
    ├── url.ts
    ├── avatar.ts
    └── common.ts
```

**工作量**: 1-2天  
**风险**: 低

---

## 🟢 低优先级债务（长期改进）

### 7. 测试覆盖不足

**负债等级**: 🟢 长期  
**影响**: 难以重构、回归风险高

#### 当前状态：

```
__tests__/  (几乎为空)
├── unit/   (?)
└── e2e/    (?)
```

#### 目标覆盖率：

- 核心 Composables: 80%+
- 关键组件: 60%+
- Utils 函数: 90%+

#### 测试策略：

```typescript
// 1. 单元测试 (Vitest)
describe('useResponsive', () => {
  it('should detect mobile breakpoint', () => {
    // ...
  })
})

// 2. 组件测试 (Vue Test Utils)
describe('PostCard', () => {
  it('should render correctly', () => {
    // ...
  })
})

// 3. E2E测试 (Playwright)
test('user can favorite a post', async ({ page }) => {
  // ...
})
```

**工作量**: 2周  
**风险**: 低

---

### 8. 文档不完整

**负债等级**: 🟢 长期  
**影响**: 新开发者上手难、协作困难

#### 缺失的文档：

- [ ] API 文档（Composables）
- [ ] 组件使用文档
- [ ] 架构设计文档
- [ ] 贡献指南
- [ ] 代码规范

#### 建议工具：

- **VitePress**: 文档站点
- **Storybook**: 组件展示
- **JSDoc**: API文档

**工作量**: 1周  
**风险**: 无

---

### 9. 性能优化机会

**负债等级**: 🟢 优化  
**影响**: 用户体验

#### 潜在优化点：

1. **Bundle 大小**
   - 分析未使用的依赖
   - 优化图片资源
   - 代码分割优化

2. **渲染性能**
   - 虚拟滚动（已有但未广泛使用）
   - 图片懒加载（已实现）
   - 动画性能优化

3. **网络性能**
   - API 请求合并
   - 缓存策略优化
   - 预加载策略

**工作量**: 1周  
**风险**: 低

---

## 📊 债务总计

| 等级  | 数量 | 总工作量 | 风险级别 |
| ----- | ---- | -------- | -------- |
| 🔴 高 | 3个  | 3.5-5天  | 低-中    |
| 🟡 中 | 4个  | 8-10天   | 低-中    |
| 🟢 低 | 3个  | 4周+     | 低       |

**总计**: 约 6-8 周完成所有债务清理

---

## 🎯 还债计划

### Sprint 1 (Week 1-2): 清理重复代码

- [ ] 合并响应式 composables
- [ ] 移除重复的 utils 函数
- [ ] 统一 toast 实现

**目标**: 消除所有功能重复

### Sprint 2 (Week 3-4): 提升类型安全

- [ ] 重构表单组件
- [ ] 添加泛型支持
- [ ] 移除所有 any 类型

**目标**: 达到 95%+ 类型安全

### Sprint 3 (Week 5-6): 优化架构

- [ ] 重组 composables 目录
- [ ] 重组 utils 目录
- [ ] 重构 PostCard 组件

**目标**: 提升代码可维护性

### Sprint 4+ (Week 7+): 长期改进

- [ ] 添加测试
- [ ] 完善文档
- [ ] 性能优化

**目标**: 建立长期质量保障

---

## 📈 债务追踪

### 已解决 ✅

- [x] 创建响应式布局系统 (useResponsiveLayout)
- [x] 修复导航栏遮挡问题
- [x] 实现动态布局计算

### 进行中 🔄

- [ ] 无

### 待处理 ⏳

- [ ] 合并响应式 composables
- [ ] 移除重复 utils
- [ ] 类型安全重构
- [ ] PostCard 重构
- [ ] 目录重组
- [ ] 测试添加
- [ ] 文档完善

---

**文档版本**: 1.0.0  
**最后更新**: 2025-11-17  
**维护者**: Development Team
