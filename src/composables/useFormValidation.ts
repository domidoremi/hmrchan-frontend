/**
 * 表单验证 Composable
 * 提供即时验证、错误提示、键盘类型推断等功能
 *
 * 设计原则：
 * 1. 即时校验 - 在用户离开输入框（blur）时校验
 * 2. 错误提示具体 - 告诉用户具体问题而非通用错误
 * 3. 乐观反馈 - 输入正确时给予积极反馈
 */

import { ref, computed, type Ref } from 'vue'

// 验证规则类型
export interface ValidationRule {
  /** 验证函数，返回 true 表示通过 */
  validate: (value: string) => boolean
  /** 错误提示消息 */
  message: string
  /** 可选：验证触发时机 */
  trigger?: 'blur' | 'input' | 'change'
}

// 字段状态
export interface FieldState {
  value: Ref<string>
  error: Ref<string | null>
  touched: Ref<boolean>
  valid: Ref<boolean>
  dirty: Ref<boolean>
}

// 预置验证规则
export const validators = {
  required: (message = '此字段为必填项'): ValidationRule => ({
    validate: (v) => v.trim().length > 0,
    message,
    trigger: 'blur',
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    validate: (v) => v.length >= min,
    message: message || `最少需要 ${min} 个字符`,
    trigger: 'blur',
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    validate: (v) => v.length <= max,
    message: message || `最多允许 ${max} 个字符`,
    trigger: 'input',
  }),

  email: (message = '请输入有效的邮箱地址'): ValidationRule => ({
    validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    message,
    trigger: 'blur',
  }),

  pattern: (regex: RegExp, message: string): ValidationRule => ({
    validate: (v) => regex.test(v),
    message,
    trigger: 'blur',
  }),

  password: (message = '密码需要至少8位，包含字母和数字'): ValidationRule => ({
    validate: (v) => /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/.test(v),
    message,
    trigger: 'blur',
  }),

  match: (otherValue: () => string, message = '两次输入不一致'): ValidationRule => ({
    validate: (v) => v === otherValue(),
    message,
    trigger: 'blur',
  }),

  username: (message = '用户名只能包含字母、数字和下划线'): ValidationRule => ({
    validate: (v) => /^[a-zA-Z0-9_]+$/.test(v),
    message,
    trigger: 'blur',
  }),
}

// 输入类型到键盘类型的映射
export const inputTypeMap: Record<string, string> = {
  email: 'email',
  tel: 'tel',
  url: 'url',
  number: 'decimal',
  search: 'search',
}

/**
 * 创建表单字段
 */
export function useField(
  initialValue = '',
  rules: ValidationRule[] = []
): FieldState & {
  validate: () => boolean
  reset: () => void
  handleBlur: () => void
  handleInput: (e: Event) => void
} {
  const value = ref(initialValue)
  const error = ref<string | null>(null)
  const touched = ref(false)
  const dirty = ref(false)

  const valid = computed(() => {
    if (!touched.value) return true
    return rules.every((rule) => rule.validate(value.value))
  })

  function validate(): boolean {
    touched.value = true
    error.value = null

    for (const rule of rules) {
      if (!rule.validate(value.value)) {
        error.value = rule.message
        return false
      }
    }

    return true
  }

  function handleBlur() {
    touched.value = true
    // 只运行 blur 触发的规则
    for (const rule of rules) {
      if (rule.trigger === 'blur' || !rule.trigger) {
        if (!rule.validate(value.value)) {
          error.value = rule.message
          return
        }
      }
    }
    error.value = null
  }

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement
    value.value = target.value
    dirty.value = true

    // 只运行 input 触发的规则
    for (const rule of rules) {
      if (rule.trigger === 'input') {
        if (!rule.validate(value.value)) {
          error.value = rule.message
          return
        }
      }
    }

    // 如果已经 touched，清除之前的错误（如果现在通过了）
    if (touched.value && error.value) {
      const failed = rules.find((r) => !r.validate(value.value))
      error.value = failed ? failed.message : null
    }
  }

  function reset() {
    value.value = initialValue
    error.value = null
    touched.value = false
    dirty.value = false
  }

  return {
    value,
    error,
    touched,
    valid,
    dirty,
    validate,
    reset,
    handleBlur,
    handleInput,
  }
}

/**
 * 创建表单
 */
export function useForm<T extends Record<string, FieldState>>(
  fields: T
): {
  fields: T
  isValid: Ref<boolean>
  isDirty: Ref<boolean>
  validate: () => boolean
  reset: () => void
  getValues: () => Record<keyof T, string>
} {
  const isValid = computed(() => {
    return Object.values(fields).every((field) => field.valid.value)
  })

  const isDirty = computed(() => {
    return Object.values(fields).some((field) => field.dirty.value)
  })

  function validate(): boolean {
    let allValid = true
    for (const field of Object.values(fields)) {
      if ('validate' in field && typeof field.validate === 'function') {
        if (!field.validate()) {
          allValid = false
        }
      }
    }
    return allValid
  }

  function reset() {
    for (const field of Object.values(fields)) {
      if ('reset' in field && typeof field.reset === 'function') {
        field.reset()
      }
    }
  }

  function getValues(): Record<keyof T, string> {
    const values: Record<string, string> = {}
    for (const [key, field] of Object.entries(fields)) {
      values[key] = field.value.value
    }
    return values as Record<keyof T, string>
  }

  return {
    fields,
    isValid,
    isDirty,
    validate,
    reset,
    getValues,
  }
}
