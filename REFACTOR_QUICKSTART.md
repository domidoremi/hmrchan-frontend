# 重构快速开始指南

## 🚀 第一步：合并 useResponsive

这是最容易开始的重构任务，风险低，影响大。

### 当前问题

```typescript
// 现在有两个相似的文件：
composables / useResponsive.ts // 通用响应式
composables / useResponsiveLayout.ts // 布局响应式

// 使用者困惑：应该用哪个？
```

### 重构步骤

#### Step 1: 创建新的统一文件

```typescript
// composables/useResponsive.ts (重写)
import { ref, computed, onMounted, onUnmounted } from 'vue'

/**
 * 统一的响应式 composable
 * 提供断点检测和布局计算功能
 */
export function useResponsive() {
  // ==================== 基础响应式 ====================
  const windowWidth = ref(window.innerWidth)
  const windowHeight = ref(window.innerHeight)

  // Breakpoint 定义
  const breakpoints = {
    xs: 0,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  } as const

  // 当前断点
  const breakpoint = computed(() => {
    const w = windowWidth.value
    if (w < breakpoints.sm) return 'xs'
    if (w < breakpoints.md) return 'sm'
    if (w < breakpoints.lg) return 'md'
    if (w < breakpoints.xl) return 'lg'
    if (w < breakpoints['2xl']) return 'xl'
    return '2xl'
  })

  // 设备类型
  const isMobile = computed(() => windowWidth.value < breakpoints.md)
  const isTablet = computed(
    () => windowWidth.value >= breakpoints.md && windowWidth.value < breakpoints.lg,
  )
  const isDesktop = computed(() => windowWidth.value >= breakpoints.lg)
  const isLargeDesktop = computed(() => windowWidth.value >= breakpoints.xl)

  // ==================== 布局计算 ====================

  // 动态导航栏高度
  const navbarHeight = computed(() => {
    if (windowWidth.value < 768) return 66 // 移动端
    if (windowWidth.value < 1024) return 72 // 平板
    return 78 // 桌面
  })

  // 底部导航栏高度（仅移动端）
  const bottomNavHeight = computed(() => {
    return isMobile.value ? 64 : 0
  })

  // 安全区域底部
  const safeAreaBottom = computed(() => {
    if (isMobile.value) {
      return bottomNavHeight.value + 16
    }
    return 16
  })

  // 内容顶部偏移
  const contentTopOffset = computed(() => {
    if (isMobile.value) return navbarHeight.value + 8
    if (isTablet.value) return navbarHeight.value + 16
    return navbarHeight.value + 24
  })

  // Sticky 定位偏移
  const stickyTopOffset = computed(() => {
    if (isMobile.value) return 8
    if (isTablet.value) return navbarHeight.value + 4
    return navbarHeight.value + 4
  })

  // Z-index 层级管理
  const zIndex = {
    base: 1,
    dropdown: 100,
    sticky: 500,
    navbar: 1000,
    drawer: 1500,
    modal: 2000,
    toast: 3000,
    tooltip: 4000,
  } as const

  // 容器宽度
  const containerWidth = computed(() => {
    const w = windowWidth.value
    if (w < 640) return '100%'
    if (w < 768) return 'min(640px, 100%)'
    if (w < 1024) return 'min(768px, 100%)'
    if (w < 1280) return 'min(1024px, 100%)'
    return 'min(1200px, 100%)'
  })

  // 动态间距
  const spacing = computed(() => {
    const w = windowWidth.value
    return {
      xs: Math.max(4, Math.min(8, w * 0.008)),
      sm: Math.max(8, Math.min(12, w * 0.012)),
      md: Math.max(12, Math.min(16, w * 0.016)),
      lg: Math.max(16, Math.min(24, w * 0.024)),
      xl: Math.max(24, Math.min(32, w * 0.032)),
    }
  })

  // ==================== 生命周期 ====================

  const updateSize = () => {
    windowWidth.value = window.innerWidth
    windowHeight.value = window.innerHeight
  }

  onMounted(() => {
    window.addEventListener('resize', updateSize)
    updateSize()
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateSize)
  })

  // ==================== 返回 API ====================

  return {
    // 基础
    windowWidth,
    windowHeight,
    breakpoint,
    breakpoints,

    // 设备类型
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,

    // 布局计算
    navbarHeight,
    bottomNavHeight,
    safeAreaBottom,
    contentTopOffset,
    stickyTopOffset,

    // 辅助
    zIndex,
    containerWidth,
    spacing,
  }
}

// 向后兼容：导出旧的 API
export { useResponsive as useResponsiveLayout }
```

#### Step 2: 备份旧文件

```bash
# 创建备份
mkdir -p composables/deprecated
mv composables/useResponsiveLayout.ts composables/deprecated/
```

#### Step 3: 更新导入语句

全局搜索并替换：

```typescript
// 查找所有使用旧 composable 的地方
// 搜索：useResponsiveLayout
// 替换为：useResponsive

// 示例修改：
// ❌ 旧代码
import { useResponsiveLayout } from '@/composables/useResponsiveLayout'

// ✅ 新代码
import { useResponsive } from '@/composables/useResponsive'
```

#### Step 4: 测试

```bash
# 运行开发服务器
npm run dev

# 测试关键页面：
# 1. 首页
# 2. 帖子详情页
# 3. 登录页
# 4. 调整浏览器窗口大小，确保响应式正常
```

#### Step 5: 提交

```bash
git add .
git commit -m "refactor: 合并 useResponsive 和 useResponsiveLayout

- 将两个 composable 合并为一个统一的 useResponsive
- 保留向后兼容的导出
- 更新所有导入语句

BREAKING CHANGE: useResponsiveLayout 已弃用，使用 useResponsive 代替
"
```

---

## 🚀 第二步：移除重复的 Utils

### 识别重复

```typescript
// 三组重复的功能：

1. utils/debounce.ts ↔️ composables/useDebounce.ts
2. utils/throttle.ts ↔️ composables/useThrottle.ts
3. utils/toast.ts ↔️ composables/useToast.ts ↔️ stores/toast.ts
```

### 统一架构决策

**原则**：状态驱动的功能使用 Composable，纯函数使用 Utils

```
Toast 功能 → 有状态 → 使用 Store + Composable
Debounce → 可以纯函数 → 保留 Utils（但提供 Composable 包装）
Throttle → 可以纯函数 → 保留 Utils（但提供 Composable 包装）
```

### 重构 Toast（示例）

#### Step 1: 确定保留的实现

```typescript
// ✅ 保留：stores/toast.ts (状态管理)
export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([])

  const success = (message: string) => {
    // ...
  }

  return { toasts, success, error, warning, info }
})

// ✅ 保留：composables/useToast.ts (便捷包装)
export function useToast() {
  const store = useToastStore()
  return {
    success: store.success,
    error: store.error,
    // ... 暴露便捷方法
  }
}

// ❌ 删除：utils/toast.ts (重复功能)
```

#### Step 2: 迁移使用者

```typescript
// 查找所有使用 utils/toast 的地方
// 搜索：from '@/utils/toast'

// ❌ 旧代码
import { showToast } from '@/utils/toast'
showToast('Success!')

// ✅ 新代码
import { useToast } from '@/composables/useToast'
const toast = useToast()
toast.success('Success!')
```

#### Step 3: 删除旧文件

```bash
# 确认没有引用后删除
rm src/utils/toast.ts
```

---

## 🚀 第三步：修复表单组件类型

### 目标：移除所有 `any` 类型

#### 创建通用类型

```typescript
// types/form.ts (新文件)

/**
 * 表单字段基础 Props
 */
export interface FormFieldProps<T = string> {
  modelValue: T
  label?: string
  placeholder?: string
  error?: string
  hint?: string
  disabled?: boolean
  required?: boolean
  readonly?: boolean
}

/**
 * 选项类型
 */
export interface SelectOption<T = string> {
  label: string
  value: T
  disabled?: boolean
  icon?: Component
}

/**
 * Select 组件 Props
 */
export interface SelectProps<T = string> extends FormFieldProps<T> {
  options: SelectOption<T>[]
  multiple?: boolean
  clearable?: boolean
  searchable?: boolean
}

/**
 * Checkbox Props
 */
export interface CheckboxProps extends FormFieldProps<boolean> {
  trueValue?: any
  falseValue?: any
}

/**
 * Radio Props
 */
export interface RadioProps<T = string> extends FormFieldProps<T> {
  value: T
}

/**
 * RadioGroup Props
 */
export interface RadioGroupProps<T = string> extends FormFieldProps<T> {
  options: SelectOption<T>[]
  direction?: 'horizontal' | 'vertical'
}
```

#### 重构 Select 组件（示例）

```vue
<!-- components/form/Select.vue -->
<script setup lang="ts" generic="T = string">
import { computed } from 'vue'
import type { SelectProps, SelectOption } from '@/types/form'

// ✅ 使用泛型，类型安全！
const props = defineProps<SelectProps<T>>()

const emit = defineEmits<{
  'update:modelValue': [value: T]
}>()

// 类型推断正常工作
const selectedOption = computed(() => {
  return props.options.find((opt) => opt.value === props.modelValue)
})
</script>
```

#### 使用示例

```vue
<template>
  <!-- 字符串类型 -->
  <Select
    v-model="stringValue"
    :options="stringOptions"
  />

  <!-- 数字类型 -->
  <Select<number>
    v-model="numberValue"
    :options="numberOptions"
  />

  <!-- 自定义类型 -->
  <Select<UserRole>
    v-model="roleValue"
    :options="roleOptions"
  />
</template>

<script setup lang="ts">
enum UserRole {
  Admin = 'admin',
  User = 'user',
  Guest = 'guest',
}

const roleValue = ref<UserRole>(UserRole.User)
const roleOptions: SelectOption<UserRole>[] = [
  { label: '管理员', value: UserRole.Admin },
  { label: '用户', value: UserRole.User },
  { label: '访客', value: UserRole.Guest },
]
</script>
```

---

## 📝 检查清单

### 重构前

- [ ] 阅读重构计划文档
- [ ] 理解当前代码结构
- [ ] 创建功能分支
- [ ] 备份当前代码

### 重构中

- [ ] 小步提交（每个任务一个 commit）
- [ ] 保持功能正常工作
- [ ] 更新相关文档
- [ ] 添加必要的注释

### 重构后

- [ ] 全面测试功能
- [ ] 检查控制台无错误
- [ ] 检查类型检查通过
- [ ] 代码审查
- [ ] 合并到主分支

---

## 🛠️ 有用的命令

```bash
# 全局搜索
grep -r "useResponsiveLayout" src/

# 查找文件
find src/ -name "*.ts" | grep responsive

# 统计代码行数
cloc src/

# 检查类型
npm run type-check

# 格式化代码
npm run format

# Lint 检查
npm run lint
```

---

## ⚠️ 常见陷阱

1. **不要一次改太多**
   - ✅ 每次只重构一个功能
   - ❌ 同时重构多个模块

2. **保持向后兼容**
   - ✅ 先添加新API，再逐步迁移
   - ❌ 直接删除旧API

3. **不要忽略测试**
   - ✅ 重构后立即测试
   - ❌ 积累一堆未测试的改动

4. **注意依赖关系**
   - ✅ 从叶子节点开始重构
   - ❌ 从核心模块开始

---

## 📚 参考资源

- [Vue 3 Composition API](https://vuejs.org/api/composition-api)
- [TypeScript Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- [Refactoring Guru](https://refactoring.guru/)

---

**开始第一个任务吧！** 🚀

建议从"合并 useResponsive"开始，这是最简单也是影响最大的改进。
