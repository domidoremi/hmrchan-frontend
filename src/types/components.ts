/**
 * 通用组件类型定义
 * 为所有UI组件提供统一的类型接口
 */

import type { Component, CSSProperties } from 'vue'

// ========== 基础组件类型 ==========

/**
 * 基础组件 Props
 * 所有组件都应该支持的基础属性
 */
export interface BaseComponentProps {
  /** CSS 类名 */
  class?: string | string[] | Record<string, boolean>
  /** 内联样式 */
  style?: string | CSSProperties
  /** 测试 ID */
  testId?: string
}

/**
 * 尺寸变体
 */
export type SizeVariant = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

/**
 * 颜色变体
 */
export type ColorVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'

/**
 * 按钮变体
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline'

/**
 * 位置类型
 */
export type Position = 'top' | 'right' | 'bottom' | 'left'

/**
 * 对齐方式
 */
export type Alignment = 'start' | 'center' | 'end' | 'stretch'

// ========== 按钮组件类型 ==========

/**
 * 按钮组件 Props
 */
export interface ButtonProps extends BaseComponentProps {
  /** 按钮变体 */
  variant?: ButtonVariant
  /** 按钮尺寸 */
  size?: SizeVariant
  /** 加载状态 */
  loading?: boolean
  /** 禁用状态 */
  disabled?: boolean
  /** 图标组件 */
  icon?: Component
  /** 图标位置 */
  iconPosition?: 'left' | 'right'
  /** 全宽按钮 */
  fullWidth?: boolean
  /** 圆角按钮 */
  rounded?: boolean
  /** 按钮类型 */
  type?: 'button' | 'submit' | 'reset'
}

// ========== 输入组件类型 ==========

/**
 * 输入框组件 Props
 */
export interface InputProps extends BaseComponentProps {
  /** 输入值 */
  modelValue: string | number
  /** 输入类型 */
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'
  /** 标签 */
  label?: string
  /** 占位符 */
  placeholder?: string
  /** 错误信息 */
  error?: string
  /** 提示信息 */
  hint?: string
  /** 必填 */
  required?: boolean
  /** 禁用 */
  disabled?: boolean
  /** 只读 */
  readonly?: boolean
  /** 前缀 */
  prefix?: string
  /** 后缀 */
  suffix?: string
  /** 可清除 */
  clearable?: boolean
  /** 最大长度 */
  maxLength?: number
  /** 显示字符计数 */
  showCount?: boolean
  /** 尺寸 */
  size?: SizeVariant
}

/**
 * 选择框选项
 */
export interface SelectOption<T = string | number> {
  /** 选项值 */
  value: T
  /** 选项标签 */
  label: string
  /** 禁用 */
  disabled?: boolean
  /** 图标 */
  icon?: Component
  /** 分组 */
  group?: string
}

/**
 * 选择框组件 Props
 */
export interface SelectProps<T = string | number> extends BaseComponentProps {
  /** 选中值 */
  modelValue: T | T[]
  /** 选项列表 */
  options: SelectOption<T>[]
  /** 标签 */
  label?: string
  /** 占位符 */
  placeholder?: string
  /** 错误信息 */
  error?: string
  /** 提示信息 */
  hint?: string
  /** 必填 */
  required?: boolean
  /** 禁用 */
  disabled?: boolean
  /** 多选 */
  multiple?: boolean
  /** 可搜索 */
  searchable?: boolean
  /** 可清除 */
  clearable?: boolean
  /** 尺寸 */
  size?: SizeVariant
}

/**
 * 复选框组件 Props
 */
export interface CheckboxProps<T = string | number> extends BaseComponentProps {
  /** 选中状态 */
  modelValue: boolean | T[]
  /** 标签 */
  label?: string
  /** 值（用于数组） */
  value?: T
  /** 禁用 */
  disabled?: boolean
  /** 中间状态 */
  indeterminate?: boolean
  /** 尺寸 */
  size?: SizeVariant
}

/**
 * 单选框组件 Props
 */
export interface RadioProps<T = string | number> extends BaseComponentProps {
  /** 选中值 */
  modelValue: T
  /** 单选框值 */
  value: T
  /** 标签 */
  label?: string
  /** 禁用 */
  disabled?: boolean
  /** 尺寸 */
  size?: SizeVariant
}

/**
 * 开关组件 Props
 */
export interface SwitchProps<T = boolean> extends BaseComponentProps {
  /** 开关状态 */
  modelValue: boolean
  /** 标签 */
  label?: string
  /** 禁用 */
  disabled?: boolean
  /** 加载状态 */
  loading?: boolean
  /** 尺寸 */
  size?: SizeVariant
  /** 开启时的值 */
  trueValue?: T
  /** 关闭时的值 */
  falseValue?: T
}

// ========== 反馈组件类型 ==========

/**
 * 模态框组件 Props
 */
export interface ModalProps extends BaseComponentProps {
  /** 显示状态 */
  modelValue: boolean
  /** 标题 */
  title?: string
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  /** 可关闭 */
  closable?: boolean
  /** 点击遮罩关闭 */
  maskClosable?: boolean
  /** 显示底部 */
  footer?: boolean
  /** 居中显示 */
  centered?: boolean
  /** 全屏模式 */
  fullscreen?: boolean
  /** 自定义宽度 */
  width?: string | number
}

/**
 * Toast 通知类型
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info'

/**
 * Toast 通知位置
 */
export type ToastPosition =
  | 'top'
  | 'top-right'
  | 'top-left'
  | 'bottom'
  | 'bottom-right'
  | 'bottom-left'

/**
 * Toast 通知选项
 */
export interface ToastOptions {
  /** 通知类型 */
  type?: ToastType
  /** 标题 */
  title?: string
  /** 消息内容 */
  message: string
  /** 持续时间（毫秒） */
  duration?: number
  /** 位置 */
  position?: ToastPosition
  /** 可关闭 */
  closable?: boolean
  /** 图标 */
  icon?: Component
  /** 操作按钮 */
  action?: {
    text: string
    onClick: () => void
  }
}

/**
 * 加载组件 Props
 */
export interface LoadingProps extends BaseComponentProps {
  /** 加载状态 */
  loading?: boolean
  /** 加载文本 */
  text?: string
  /** 尺寸 */
  size?: SizeVariant
  /** 全屏 */
  fullscreen?: boolean
  /** 遮罩 */
  mask?: boolean
}

/**
 * 空状态组件 Props
 */
export interface EmptyStateProps extends BaseComponentProps {
  /** 图标 */
  icon?: Component | string
  /** 标题 */
  title: string
  /** 描述 */
  description?: string
  /** 操作按钮文本 */
  actionText?: string
  /** 操作按钮图标 */
  actionIcon?: Component
  /** 变体 */
  variant?: 'default' | 'compact' | 'illustration'
}

/**
 * 骨架屏组件 Props
 */
export interface SkeletonProps extends BaseComponentProps {
  /** 加载状态 */
  loading?: boolean
  /** 行数 */
  rows?: number
  /** 显示头像 */
  avatar?: boolean
  /** 头像形状 */
  avatarShape?: 'circle' | 'square'
  /** 动画 */
  animated?: boolean
}

// ========== 数据展示组件类型 ==========

/**
 * 卡片组件 Props
 */
export interface CardProps extends BaseComponentProps {
  /** 标题 */
  title?: string
  /** 副标题 */
  subtitle?: string
  /** 显示头部 */
  header?: boolean
  /** 显示底部 */
  footer?: boolean
  /** 可悬停 */
  hoverable?: boolean
  /** 边框 */
  bordered?: boolean
  /** 阴影 */
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  /** 内边距 */
  padding?: SizeVariant
}

/**
 * 统计卡片趋势
 */
export interface StatTrend {
  /** 趋势值 */
  value: number
  /** 趋势方向 */
  direction: 'up' | 'down'
  /** 趋势文本 */
  text?: string
}

/**
 * 统计卡片组件 Props
 */
export interface StatCardProps extends BaseComponentProps {
  /** 图标 */
  icon?: Component
  /** 图标颜色 */
  iconColor?: string
  /** 标题 */
  title: string
  /** 数值 */
  value: string | number
  /** 标签 */
  label?: string
  /** 趋势 */
  trend?: StatTrend
  /** 加载状态 */
  loading?: boolean
  /** 变体 */
  variant?: 'default' | 'compact' | 'detailed'
}

/**
 * 徽章组件 Props
 */
export interface BadgeProps extends BaseComponentProps {
  /** 徽章内容 */
  content?: string | number
  /** 颜色变体 */
  variant?: ColorVariant
  /** 最大值 */
  max?: number
  /** 显示为点 */
  dot?: boolean
  /** 显示零值 */
  showZero?: boolean
}

// ========== 布局组件类型 ==========

/**
 * 网格组件 Props
 */
export interface GridProps extends BaseComponentProps {
  /** 列数 */
  cols?: number | Record<string, number>
  /** 间距 */
  gap?: SizeVariant | number
  /** 行间距 */
  rowGap?: SizeVariant | number
  /** 列间距 */
  colGap?: SizeVariant | number
}

/**
 * 堆栈组件 Props
 */
export interface StackProps extends BaseComponentProps {
  /** 方向 */
  direction?: 'horizontal' | 'vertical'
  /** 间距 */
  spacing?: SizeVariant | number
  /** 对齐方式 */
  align?: Alignment
  /** 分布方式 */
  justify?: 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly'
  /** 换行 */
  wrap?: boolean
}

/**
 * 容器组件 Props
 */
export interface ContainerProps extends BaseComponentProps {
  /** 最大宽度 */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  /** 居中 */
  centered?: boolean
  /** 内边距 */
  padding?: SizeVariant
}

/**
 * 分区组件 Props
 */
export interface SectionProps extends BaseComponentProps {
  /** 标题 */
  title?: string
  /** 描述 */
  description?: string
  /** 显示分隔线 */
  divider?: boolean
  /** 内边距 */
  padding?: SizeVariant
}

// ========== 表单验证类型 ==========

/**
 * 验证规则
 */
export interface ValidationRule {
  /** 必填 */
  required?: boolean
  /** 最小长度 */
  minLength?: number
  /** 最大长度 */
  maxLength?: number
  /** 最小值 */
  min?: number
  /** 最大值 */
  max?: number
  /** 正则表达式 */
  pattern?: RegExp
  /** 自定义验证函数 */
  validator?: (value: unknown) => boolean | string
  /** 错误消息 */
  message?: string
}

/**
 * 表单字段
 */
export interface FormField<T = unknown> {
  /** 字段名 */
  name: string
  /** 字段值 */
  value: T
  /** 验证规则 */
  rules?: ValidationRule[]
  /** 错误信息 */
  error?: string
  /** 是否已触摸 */
  touched?: boolean
  /** 是否有效 */
  valid?: boolean
}

/**
 * 表单状态
 */
export interface FormState<T extends Record<string, unknown> = Record<string, unknown>> {
  /** 表单值 */
  values: T
  /** 表单错误 */
  errors: Partial<Record<keyof T, string>>
  /** 已触摸字段 */
  touched: Partial<Record<keyof T, boolean>>
  /** 表单是否有效 */
  valid: boolean
  /** 表单是否提交中 */
  submitting: boolean
  /** 表单是否已提交 */
  submitted: boolean
}

// ========== 动画类型 ==========

/**
 * 动画选项
 */
export interface AnimationOptions {
  /** 持续时间（秒） */
  duration?: number
  /** 延迟（秒） */
  delay?: number
  /** 缓动函数 */
  ease?: string
  /** 重复次数 */
  repeat?: number
  /** 往返动画 */
  yoyo?: boolean
  /** 完成回调 */
  onComplete?: () => void
}

/**
 * 过渡类型
 */
export type TransitionType = 'fade' | 'slide' | 'scale' | 'rotate' | 'bounce' | 'shake'

// ========== 响应式类型 ==========

/**
 * 断点
 */
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

/**
 * 响应式值
 */
export type ResponsiveValue<T> = T | Partial<Record<Breakpoint, T>>

// ========== 事件类型 ==========

/**
 * 点击事件处理器
 */
export type ClickHandler = (event: MouseEvent) => void

/**
 * 输入事件处理器
 */
export type InputHandler = (value: string | number) => void

/**
 * 变更事件处理器
 */
export type ChangeHandler<T = unknown> = (value: T) => void

/**
 * 提交事件处理器
 */
export type SubmitHandler<T = Record<string, unknown>> = (values: T) => void | Promise<void>

// ========== 工具类型 ==========

/**
 * 可选的部分属性
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/**
 * 必需的部分属性
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>

/**
 * 深度部分
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

/**
 * 深度只读
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P]
}
