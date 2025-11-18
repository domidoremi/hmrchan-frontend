import { reactive, computed } from 'vue'

/**
 * Validation rule function type
 * Returns error message string if validation fails, null/undefined if passes
 * @template T - The value type being validated
 */
export type ValidationRule<T = unknown> = (
  value: T,
  formValues?: Record<string, unknown>,
) => string | null | undefined

/**
 * Validation schema - maps field names to validation rules
 * @template T - The form values type
 */
export type ValidationSchema<T extends Record<string, unknown>> = {
  [K in keyof T]?: ValidationRule<T[K]> | ValidationRule<T[K]>[]
}

/**
 * Field validation state
 */
export interface FieldState {
  error: string | null
  touched: boolean
  dirty: boolean
}

/**
 * Form validation composable
 * Provides real-time validation with common validation rules
 * @template T - The form values type
 */
export function useFormValidation<T extends Record<string, unknown>>(
  schema: ValidationSchema<T>,
  initialValues?: Partial<T>,
) {
  // Field states
  const errors = reactive<Record<string, string>>({})
  const touched = reactive<Record<string, boolean>>({})
  const dirty = reactive<Record<string, boolean>>({})

  // Form values
  const values = reactive<T>({ ...initialValues } as T)

  // Computed states
  const isValid = computed(() => Object.keys(errors).length === 0)
  const hasErrors = computed(() => Object.keys(errors).length > 0)
  const touchedFields = computed(() => Object.keys(touched).filter((key) => touched[key]))
  const dirtyFields = computed(() => Object.keys(dirty).filter((key) => dirty[key]))

  /**
   * Validate a single field
   */
  function validateField(field: keyof T, value: T[keyof T]): boolean {
    const fieldKey = String(field)
    const rules = schema[field]
    if (!rules) return true

    const ruleArray = Array.isArray(rules) ? rules : [rules]

    for (const rule of ruleArray) {
      const error = rule(value)
      if (error) {
        errors[fieldKey] = error
        return false
      }
    }

    delete errors[fieldKey]
    return true
  }

  /**
   * Validate all fields
   */
  function validateAll(): boolean {
    let isFormValid = true

    for (const field in schema) {
      const value = values[field]
      if (!validateField(field as keyof T, value as T[keyof T])) {
        isFormValid = false
      }
    }

    return isFormValid
  }

  /**
   * Set field value and optionally validate
   */
  function setFieldValue(field: keyof T, value: T[keyof T], validate = true) {
    const fieldKey = String(field)
    ;(values as Record<string, unknown>)[fieldKey] = value
    dirty[fieldKey] = true

    if (validate && touched[fieldKey]) {
      validateField(field, value)
    }
  }

  /**
   * Mark field as touched
   */
  function setFieldTouched(field: keyof T, isTouched = true) {
    const fieldKey = String(field)
    touched[fieldKey] = isTouched

    if (isTouched) {
      const fieldValue = (values as Record<string, unknown>)[fieldKey]
      validateField(field, fieldValue as T[keyof T])
    }
  }

  /**
   * Get field state
   */
  function getFieldState(field: keyof T): FieldState {
    const fieldKey = String(field)
    return {
      error: errors[fieldKey] || null,
      touched: touched[fieldKey] || false,
      dirty: dirty[fieldKey] || false,
    }
  }

  /**
   * Reset form to initial values
   */
  function reset(newValues?: Partial<T>) {
    Object.keys(errors).forEach((key) => delete errors[key])
    Object.keys(touched).forEach((key) => delete touched[key])
    Object.keys(dirty).forEach((key) => delete dirty[key])

    const resetValues = newValues || initialValues || {}
    const valuesRecord = values as Record<string, unknown>
    Object.keys(valuesRecord).forEach((key) => delete valuesRecord[key])
    Object.assign(values, resetValues)
  }

  /**
   * Reset validation errors only
   */
  function resetErrors() {
    Object.keys(errors).forEach((key) => delete errors[key])
  }

  /**
   * Set custom error for a field
   */
  function setFieldError(field: keyof T, error: string | null) {
    const fieldKey = String(field)
    if (error) {
      errors[fieldKey] = error
    } else {
      delete errors[fieldKey]
    }
  }

  /**
   * Set multiple errors at once (useful for server-side validation)
   */
  function setErrors(newErrors: Partial<Record<keyof T, string>>) {
    Object.assign(errors, newErrors)
  }

  return {
    // State
    values,
    errors,
    touched,
    dirty,

    // Computed
    isValid,
    hasErrors,
    touchedFields,
    dirtyFields,

    // Methods
    validateField,
    validateAll,
    setFieldValue,
    setFieldTouched,
    getFieldState,
    setFieldError,
    setErrors,
    reset,
    resetErrors,
  }
}

/**
 * Common validation rules
 */
export const validationRules = {
  /**
   * Required field validation
   */
  required: (message = 'This field is required'): ValidationRule => {
    return (value: unknown) => {
      if (value === null || value === undefined || value === '') {
        return message
      }
      if (Array.isArray(value) && value.length === 0) {
        return message
      }
      return null
    }
  },

  /**
   * Minimum length validation
   */
  minLength: (min: number, message?: string): ValidationRule<string> => {
    return (value: string) => {
      if (!value) return null
      if (value.length < min) {
        return message || `Must be at least ${min} characters`
      }
      return null
    }
  },

  /**
   * Maximum length validation
   */
  maxLength: (max: number, message?: string): ValidationRule<string> => {
    return (value: string) => {
      if (!value) return null
      if (value.length > max) {
        return message || `Must be at most ${max} characters`
      }
      return null
    }
  },

  /**
   * Email validation
   */
  email: (message = 'Invalid email address'): ValidationRule<string> => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return (value: string) => {
      if (!value) return null
      if (!emailRegex.test(value)) {
        return message
      }
      return null
    }
  },

  /**
   * URL validation
   */
  url: (message = 'Invalid URL'): ValidationRule<string> => {
    return (value: string) => {
      if (!value) return null
      try {
        new URL(value)
        return null
      } catch {
        return message
      }
    }
  },

  /**
   * Pattern validation (regex)
   */
  pattern: (regex: RegExp, message = 'Invalid format'): ValidationRule<string> => {
    return (value: string) => {
      if (!value) return null
      if (!regex.test(value)) {
        return message
      }
      return null
    }
  },

  /**
   * Minimum value validation (for numbers)
   */
  min: (min: number, message?: string): ValidationRule<number> => {
    return (value: number) => {
      if (value === null || value === undefined) return null
      if (value < min) {
        return message || `Must be at least ${min}`
      }
      return null
    }
  },

  /**
   * Maximum value validation (for numbers)
   */
  max: (max: number, message?: string): ValidationRule<number> => {
    return (value: number) => {
      if (value === null || value === undefined) return null
      if (value > max) {
        return message || `Must be at most ${max}`
      }
      return null
    }
  },

  /**
   * Number validation
   */
  number: (message = 'Must be a number'): ValidationRule => {
    return (value: unknown) => {
      if (value === null || value === undefined || value === '') return null
      if (isNaN(Number(value))) {
        return message
      }
      return null
    }
  },

  /**
   * Integer validation
   */
  integer: (message = 'Must be an integer'): ValidationRule => {
    return (value: unknown) => {
      if (value === null || value === undefined || value === '') return null
      if (!Number.isInteger(Number(value))) {
        return message
      }
      return null
    }
  },

  /**
   * Match another field (e.g., password confirmation)
   */
  match: (otherField: string, message?: string): ValidationRule => {
    return (value: unknown, formValues?: Record<string, unknown>) => {
      if (!value) return null
      if (formValues && value !== formValues[otherField]) {
        return message || `Must match ${otherField}`
      }
      return null
    }
  },

  /**
   * Custom validation function
   */
  custom: (validator: (value: unknown) => boolean, message: string): ValidationRule => {
    return (value: unknown) => {
      if (!validator(value)) {
        return message
      }
      return null
    }
  },

  /**
   * Phone number validation (basic)
   */
  phone: (message = 'Invalid phone number'): ValidationRule<string> => {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/
    return (value: string) => {
      if (!value) return null
      if (!phoneRegex.test(value) || value.replace(/\D/g, '').length < 10) {
        return message
      }
      return null
    }
  },

  /**
   * Alphanumeric validation
   */
  alphanumeric: (message = 'Must contain only letters and numbers'): ValidationRule<string> => {
    const alphanumericRegex = /^[a-zA-Z0-9]+$/
    return (value: string) => {
      if (!value) return null
      if (!alphanumericRegex.test(value)) {
        return message
      }
      return null
    }
  },

  /**
   * Username validation (alphanumeric, underscore, hyphen)
   */
  username: (message = 'Invalid username format'): ValidationRule<string> => {
    const usernameRegex = /^[a-zA-Z0-9_-]+$/
    return (value: string) => {
      if (!value) return null
      if (!usernameRegex.test(value)) {
        return message
      }
      return null
    }
  },

  /**
   * Strong password validation
   */
  strongPassword: (
    message = 'Password must contain at least 8 characters, one uppercase, one lowercase, one number, and one special character',
  ): ValidationRule<string> => {
    return (value: string) => {
      if (!value) return null
      const hasMinLength = value.length >= 8
      const hasUpperCase = /[A-Z]/.test(value)
      const hasLowerCase = /[a-z]/.test(value)
      const hasNumber = /\d/.test(value)
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value)

      if (!hasMinLength || !hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
        return message
      }
      return null
    }
  },
}
