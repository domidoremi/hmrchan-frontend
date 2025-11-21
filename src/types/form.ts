/**
 * 表单相关类型定义文件
 *
 * 功能说明：
 * - 提供类型安全的表单组件接口
 * - 定义表单字段、验证规则和表单状态类型
 * - 支持泛型以适配不同的字段值类型
 *
 * 待处理: [未使用] 该文件中的类型定义未被项目中任何文件导入使用
 * 建议：评估是否需要保留这些类型定义，或者在实际使用时再引入
 */

/**
 * 表单字段基础 Props 接口
 *
 * 所有表单字段组件的通用属性定义
 *
 * @template T - 字段值的类型，默认为 string
 */
export interface FormFieldProps<T = string> {
  /** 字段值 */
  modelValue: T
  /** 标签文本 */
  label?: string
  /** 占位符文本 */
  placeholder?: string
  /** 错误信息 */
  error?: string
  /** 提示信息 */
  hint?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 是否必填 */
  required?: boolean
  /** 是否只读 */
  readonly?: boolean
  /** 字段名称 */
  name?: string
  /** 字段ID */
  id?: string
}

/**
 * 输入框 Props
 */
export interface InputProps extends FormFieldProps<string> {
  /** 输入类型 */
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'
  /** 最大长度 */
  maxlength?: number
  /** 最小长度 */
  minlength?: number
  /** 自动完成 */
  autocomplete?: string
  /** 是否可清空 */
  clearable?: boolean
}

/**
 * 选项类型
 * @template T - 选项值的类型
 */
export interface SelectOption<T = string> {
  /** 显示文本 */
  label: string
  /** 选项值 */
  value: T
  /** 是否禁用 */
  disabled?: boolean
  /** 图标组件 */
  icon?: unknown
  /** 描述信息 */
  description?: string
}

/**
 * Select 组件 Props
 * @template T - 选项值的类型
 */
export interface SelectProps<T = string> extends FormFieldProps<T | T[]> {
  /** 选项列表 */
  options: SelectOption<T>[]
  /** 是否多选 */
  multiple?: boolean
  /** 是否可清空 */
  clearable?: boolean
  /** 是否可搜索 */
  searchable?: boolean
  /** 是否显示全选 */
  showSelectAll?: boolean
  /** 多选时的最大选择数量 */
  maxSelections?: number
}

/**
 * Checkbox Props
 */
export interface CheckboxProps extends FormFieldProps<boolean> {
  /** 选中时的值 */
  trueValue?: boolean | string | number
  /** 未选中时的值 */
  falseValue?: boolean | string | number
  /** 是否不确定状态 */
  indeterminate?: boolean
}

/**
 * Radio Props
 * @template T - radio值的类型
 */
export interface RadioProps<T = string> extends Omit<FormFieldProps<T>, 'modelValue'> {
  /** 当前选中的值（来自父级RadioGroup） */
  modelValue: T
  /** 该radio的值 */
  value: T
}

/**
 * RadioGroup Props
 * @template T - radio选项值的类型
 */
export interface RadioGroupProps<T = string> extends FormFieldProps<T> {
  /** 选项列表（如果使用选项模式） */
  options?: SelectOption<T>[]
  /** 布局方向 */
  direction?: 'horizontal' | 'vertical'
  /** 选项之间的间距 */
  gap?: 'sm' | 'md' | 'lg'
}

/**
 * 表单验证规则
 */
export interface ValidationRule<T = unknown> {
  /** 验证函数 */
  validator: (value: T) => boolean | Promise<boolean>
  /** 错误信息 */
  message: string
  /** 触发时机 */
  trigger?: 'blur' | 'change' | 'input'
}

/**
 * 表单字段配置
 */
export interface FormField<T = unknown> {
  /** 字段名 */
  name: string
  /** 字段值 */
  value: T
  /** 验证规则 */
  rules?: ValidationRule<T>[]
  /** 错误信息 */
  error?: string
  /** 是否已验证 */
  validated?: boolean
  /** 是否必填 */
  required?: boolean
}

/**
 * 表单验证结果
 */
export interface ValidationResult {
  /** 是否通过验证 */
  valid: boolean
  /** 错误信息 */
  errors: Record<string, string>
}

/**
 * 表单状态
 */
export interface FormState<T extends Record<string, unknown> = Record<string, unknown>> {
  /** 表单值 */
  values: T
  /** 错误信息 */
  errors: Record<keyof T, string>
  /** 是否正在提交 */
  submitting: boolean
  /** 是否已修改 */
  dirty: boolean
  /** 是否已验证 */
  validated: boolean
}

/**
 * 表单事件
 */
export interface FormEvents<T = unknown> {
  /** 值变化事件 */
  'update:modelValue': [value: T]
  /** 聚焦事件 */
  focus: [event: FocusEvent]
  /** 失焦事件 */
  blur: [event: FocusEvent]
  /** 输入事件 */
  input: [event: Event]
  /** 变化事件 */
  change: [event: Event]
  /** 清空事件 */
  clear: []
}

/**
 * Switch Props
 */
export interface SwitchProps extends FormFieldProps<boolean> {
  /** 选中时的值 */
  activeValue?: boolean | string | number
  /** 未选中时的值 */
  inactiveValue?: boolean | string | number
  /** 选中时的颜色 */
  activeColor?: string
  /** 未选中时的颜色 */
  inactiveColor?: string
  /** 选中时的文本 */
  activeText?: string
  /** 未选中时的文本 */
  inactiveText?: string
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg'
}
