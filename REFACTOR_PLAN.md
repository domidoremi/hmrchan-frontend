# HMR Chan Frontend 项目重构计划

## 📊 项目评估报告

### 项目规模统计

- **Vue组件**: 60+ 个
- **Composables**: 35 个
- **Utils工具函数**: 37 个
- **Stores**: 7 个
- **Views页面**: 15 个

### 代码质量评分

- ✅ **TypeScript覆盖率**: 良好（无 @ts-ignore）
- ⚠️ **类型安全**: 中等（19处使用 `any` 类型，主要在表单组件）
- ⚠️ **代码组织**: 需要改进（存在功能重复）
- ✅ **响应式设计**: 良好（已实现 useResponsiveLayout）
- ⚠️ **可维护性**: 中等（需要重构和文档）

---

## 🔍 发现的主要问题

### 1. 功能重复问题 ⚠️ 严重

#### 1.1 Composables 与 Utils 重复

存在相同功能的 composable 和 utility 函数：

```
- debounce.ts (utils) ↔️ useDebounce.ts (composable)
- throttle.ts (utils) ↔️ useThrottle.ts (composable)
- toast.ts (utils) ↔️ useToast.ts (composable)
```

**影响**：

- 开发者不知道该使用哪个
- 维护成本高（需要同时更新两处）
- 可能导致行为不一致

**建议**：

- 统一使用 composables，移除 utils 中的重复函数
- 保留 utils 仅用于纯函数工具（如格式化、验证）

#### 1.2 响应式 Composables 重复

```
- useResponsive.ts (通用响应式检测)
- useResponsiveLayout.ts (布局专用响应式)
```

**建议**：

- 合并为一个统一的 `useResponsive.ts`
- 包含通用断点检测 + 布局计算功能

### 2. 组件设计问题 ⚠️ 中等

#### 2.1 PostCard 组件复杂度过高

`PostCard.vue` 及其子组件结构：

```
PostCard.vue (590行)
├── PostCardMedia.vue
├── PostCardActions.vue
└── PostCardContent.vue
```

**问题**：

- 主组件责任过多
- Props 传递层级深
- 难以单独复用子组件

**建议**：

- 使用 Composition API 提取更多逻辑
- 考虑使用 Provide/Inject 简化 Props 传递
- 将状态管理移至 composable

#### 2.2 表单组件类型安全问题

表单组件中大量使用 `any` 类型：

```typescript
// 19处 `: any` 使用
useFormValidation.ts (8处)
RadioGroup.vue (5处)
Radio.vue (4处)
Checkbox.vue (1处)
Select.vue (1处)
```

**建议**：

- 使用泛型定义表单值类型
- 添加严格的类型约束
- 创建表单组件通用类型接口

### 3. 代码组织问题 ⚠️ 中等

#### 3.1 Composables 过多（35个）

可能的问题：

- 部分 composable 功能过于简单，不需要单独文件
- 缺乏分类（如 `composables/form/`, `composables/ui/`）
- 职责划分不清晰

**建议重组**：

```
composables/
├── core/          # 核心功能（响应式、路由、i18n）
├── ui/            # UI相关（动画、主题、布局）
├── form/          # 表单相关
├── data/          # 数据操作（缓存、优化更新）
├── media/         # 媒体处理
└── business/      # 业务逻辑
```

#### 3.2 Utils 组织混乱

```
utils/
├── cache/         # 有子目录
├── performance/   # 有子目录
├── format.ts      # 通用格式化
├── dateFormat.ts  # 专用格式化
├── numberFormat.ts # 专用格式化
└── ... (30+ 其他文件)
```

**建议重组**：

```
utils/
├── format/        # 所有格式化函数
├── validation/    # 验证函数
├── helpers/       # 辅助函数
├── storage/       # 存储相关
└── ...
```

### 4. 性能问题 ⚠️ 低

#### 4.1 可能的性能瓶颈

- ✅ 已使用 lazy loading
- ✅ 已实现图片优化
- ⚠️ 未发现明显的虚拟滚动实现（已有 useVirtualScroll 但未广泛使用）

#### 4.2 Bundle 大小

需要检查：

- 是否有未使用的依赖
- Tree-shaking 是否正常工作
- 是否可以进一步代码分割

### 5. 文档和注释 ⚠️ 中等

#### 5.1 缺少文档

- ❌ 组件使用文档不完整
- ❌ Composables API文档不足
- ⚠️ 代码注释不一致

**建议**：

- 为所有公共 composables 添加 JSDoc
- 创建组件使用示例
- 使用 Storybook 或类似工具展示组件

### 6. 测试覆盖 ⚠️ 严重

```
__tests__/ (仅1个目录项)
```

**问题**：

- 测试覆盖率极低
- 没有系统的测试策略

**建议**：

- 为核心 composables 添加单元测试
- 为关键组件添加组件测试
- 设置测试覆盖率目标（至少60%）

---

## 🎯 重构优先级

### 阶段一：立即修复（高优先级）⚡

#### 1.1 合并重复功能（预计1-2天）

- [ ] 合并 `useResponsive` 和 `useResponsiveLayout`
- [ ] 移除 utils 中与 composables 重复的函数
- [ ] 统一导入路径

#### 1.2 修复类型安全（预计2-3天）

- [ ] 重构表单组件，移除所有 `any` 类型
- [ ] 创建通用表单类型接口
- [ ] 添加泛型支持

#### 1.3 文档补充（预计1天）

- [ ] 为所有 composables 添加 JSDoc
- [ ] 创建 CONTRIBUTING.md
- [ ] 更新 README.md

### 阶段二：改进架构（中优先级）📐

#### 2.1 重组目录结构（预计2天）

- [ ] 重组 composables 目录（按功能分类）
- [ ] 重组 utils 目录（按功能分类）
- [ ] 更新导入路径和别名

#### 2.2 优化组件设计（预计3-4天）

- [ ] 重构 PostCard 组件，减少复杂度
- [ ] 使用 Provide/Inject 优化 Props 传递
- [ ] 提取更多可复用逻辑到 composables

#### 2.3 统一代码风格（预计1天）

- [ ] 配置 ESLint 规则
- [ ] 配置 Prettier
- [ ] 运行自动格式化

### 阶段三：质量提升（低优先级）🔧

#### 3.1 添加测试（预计1周）

- [ ] 为核心 composables 添加单元测试
- [ ] 为关键组件添加组件测试
- [ ] 设置 CI/CD 测试流程

#### 3.2 性能优化（预计2-3天）

- [ ] 分析 bundle 大小
- [ ] 优化依赖导入
- [ ] 在长列表中使用虚拟滚动

#### 3.3 开发者体验（预计1-2天）

- [ ] 设置 Storybook
- [ ] 创建组件使用示例
- [ ] 添加开发工具和调试面板

---

## 📝 具体重构任务清单

### Task 1: 合并响应式 Composables ✅ 可立即开始

**目标**：将 `useResponsive` 和 `useResponsiveLayout` 合并

**步骤**：

```typescript
// 新的 useResponsive.ts
export function useResponsive() {
  // 合并两者的功能
  return {
    // 基础响应式
    windowWidth,
    windowHeight,
    isMobile,
    isTablet,
    isDesktop,
    breakpoint,

    // 布局计算（来自 useResponsiveLayout）
    navbarHeight,
    bottomNavHeight,
    safeAreaBottom,
    contentTopOffset,
    stickyTopOffset,
    zIndex,
    containerWidth,
    spacing,
  }
}
```

**影响范围**：

- BackToTop.vue
- AccessLimitBanner.vue
- 其他使用响应式的组件

### Task 2: 移除 Utils 重复函数 ✅ 可立即开始

**需要移除的文件**：

```
utils/debounce.ts → 使用 composables/useDebounce.ts
utils/throttle.ts → 使用 composables/useThrottle.ts
utils/toast.ts → 使用 composables/useToast.ts
```

**步骤**：

1. 全局搜索使用这些 utils 的地方
2. 替换为对应的 composable
3. 删除 utils 文件
4. 更新导入语句

### Task 3: 表单组件类型重构 ⚠️ 需要仔细设计

**创建通用表单类型**：

```typescript
// types/form.ts
export interface FormFieldProps<T = any> {
  modelValue: T
  label?: string
  error?: string
  disabled?: boolean
  required?: boolean
}

export interface SelectOption<T = string> {
  label: string
  value: T
  disabled?: boolean
}

// 使用泛型重构组件
export interface SelectProps<T = string> extends FormFieldProps<T> {
  options: SelectOption<T>[]
  multiple?: boolean
}
```

**重构顺序**：

1. Input.vue
2. Select.vue
3. Checkbox.vue
4. Radio.vue
5. RadioGroup.vue

### Task 4: PostCard 组件重构 ⚠️ 需要仔细设计

**当前问题**：

- PostCard.vue 主组件过于复杂
- Props drilling 严重
- 状态管理分散

**重构方案**：

```typescript
// composables/usePostCard.ts 扩展
export function usePostCard(post: Post) {
  // 提供上下文
  provide(POST_CARD_KEY, {
    post,
    isFavorited,
    isHovered,
    // ... 其他共享状态
  })

  return {
    // 公开必要的方法
    handleFavorite,
    handleShare,
    handleMore,
  }
}

// 在子组件中使用
const postContext = inject(POST_CARD_KEY)
```

---

## 🚀 实施建议

### 开发流程

1. **创建功能分支**：`refactor/phase-1-duplicate-removal`
2. **小步提交**：每个任务完成后立即提交
3. **代码审查**：重要重构需要 review
4. **测试验证**：确保功能不受影响

### 风险控制

- ✅ 在开始前备份代码
- ✅ 使用 Git 分支管理
- ✅ 增量重构，避免大规模改动
- ⚠️ 重构后进行全面测试

### 时间估算

- **阶段一**：5-7 个工作日
- **阶段二**：7-10 个工作日
- **阶段三**：10-15 个工作日

**总计**：约 4-6 周完成全面重构

---

## 📊 成功指标

重构完成后应达到：

- ✅ 零代码重复（功能层面）
- ✅ 90%+ 类型安全（无 any 类型）
- ✅ 60%+ 测试覆盖率
- ✅ 完整的组件文档
- ✅ 统一的代码风格
- ✅ 更快的开发速度

---

## 🔄 持续改进

建立长期的代码质量保障机制：

1. **代码审查检查清单**
   - [ ] 无 any 类型
   - [ ] 有适当的注释
   - [ ] 遵循命名规范
   - [ ] 有相应的测试

2. **自动化工具**
   - ESLint + Prettier
   - TypeScript strict mode
   - Pre-commit hooks
   - CI/CD 测试

3. **定期审查**
   - 每月代码质量审查
   - 每季度架构审查
   - 及时清理技术债务

---

## 📚 参考资源

- [Vue 3 Best Practices](https://vuejs.org/guide/best-practices/)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [Clean Code JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)

---

**文档版本**: 1.0.0  
**创建日期**: 2025-11-17  
**最后更新**: 2025-11-17  
**负责人**: AI Assistant
