<template>
  <div class="email-code-input" :class="{ 'email-code-input--error': error }">
    <input
      v-for="(_, i) in digits"
      :key="i"
      :ref="(el) => setRef(el as HTMLInputElement | null, i)"
      v-model="digits[i]"
      type="text"
      inputmode="numeric"
      autocomplete="one-time-code"
      maxlength="1"
      class="code-digit"
      :class="{ 'code-digit--filled': digits[i] }"
      :disabled="disabled"
      @input="handleInput(i)"
      @keydown="handleKeydown($event, i)"
      @paste="handlePaste($event)"
      @focus="handleFocus(i)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onUnmounted } from 'vue'

interface Props {
  length?: number
  disabled?: boolean
  error?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  length: 6,
  disabled: false,
  error: false,
})

const emit = defineEmits<{
  complete: [code: string]
  'update:modelValue': [code: string]
}>()

const digits = ref<string[]>(Array.from({ length: props.length }, () => ''))
const inputRefs: (HTMLInputElement | null)[] = []

function setRef(el: HTMLInputElement | null, i: number) {
  inputRefs[i] = el
}

function getCode(): string {
  return digits.value.join('')
}

function handleInput(index: number) {
  // Only keep last digit if multiple chars somehow entered
  const val = digits.value[index] ?? ''
  if (val.length > 1) {
    digits.value[index] = val.slice(-1)
  }

  // Strip non-numeric
  if (digits.value[index] && !/^\d$/.test(digits.value[index]!)) {
    digits.value[index] = ''
    return
  }

  emit('update:modelValue', getCode())

  // Auto-advance to next input
  if (digits.value[index] && index < props.length - 1) {
    nextTick(() => inputRefs[index + 1]?.focus())
  }

  // Check completion
  const code = getCode()
  if (code.length === props.length) {
    emit('complete', code)
  }
}

function handleKeydown(event: KeyboardEvent, index: number) {
  if (event.key === 'Backspace') {
    if (!digits.value[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      event.preventDefault()
      digits.value[index - 1] = ''
      inputRefs[index - 1]?.focus()
      emit('update:modelValue', getCode())
    }
  } else if (event.key === 'ArrowLeft' && index > 0) {
    event.preventDefault()
    inputRefs[index - 1]?.focus()
  } else if (event.key === 'ArrowRight' && index < props.length - 1) {
    event.preventDefault()
    inputRefs[index + 1]?.focus()
  }
}

function handlePaste(event: ClipboardEvent) {
  event.preventDefault()
  const pasted = event.clipboardData?.getData('text')?.replace(/\D/g, '').slice(0, props.length)
  if (!pasted) return

  for (let i = 0; i < props.length; i++) {
    digits.value[i] = pasted[i] || ''
  }

  emit('update:modelValue', getCode())

  // Focus the next empty or last filled
  const nextEmpty = digits.value.findIndex((d) => !d)
  const focusIndex = nextEmpty === -1 ? props.length - 1 : nextEmpty
  nextTick(() => inputRefs[focusIndex]?.focus())

  const code = getCode()
  if (code.length === props.length) {
    emit('complete', code)
  }
}

function handleFocus(index: number) {
  // Select content on focus for easy replacement
  nextTick(() => inputRefs[index]?.select())
}

/** Reset all digits */
function reset() {
  digits.value = Array.from({ length: props.length }, () => '')
  emit('update:modelValue', '')
  nextTick(() => inputRefs[0]?.focus())
}

/** Focus first input */
function focus() {
  inputRefs[0]?.focus()
}

let resetTimer: ReturnType<typeof setTimeout> | null = null

// Watch for external error to shake
watch(
  () => props.error,
  (hasError) => {
    if (hasError) {
      // Reset after shake animation
      if (resetTimer) clearTimeout(resetTimer)
      resetTimer = setTimeout(() => reset(), 600)
    }
  }
)

onUnmounted(() => {
  if (resetTimer) {
    clearTimeout(resetTimer)
    resetTimer = null
  }
})

defineExpose({ reset, focus })
</script>

<style scoped>
.email-code-input {
  display: flex;
  gap: var(--spacing-2);
  justify-content: center;
}

.code-digit {
  width: 44px;
  height: 52px;
  text-align: center;
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  font-variant-numeric: tabular-nums;
  border: 1.5px solid var(--glass-border);
  border-radius: var(--radius-lg);
  background: var(--glass-bg-light);
  color: var(--color-text-primary);
  outline: none;
  caret-color: var(--color-primary);
  transition:
    border-color 150ms ease,
    box-shadow 150ms ease,
    background 150ms ease;
}

.code-digit:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.15);
  background: var(--glass-bg-strong);
}

.code-digit--filled {
  border-color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.06);
}

.code-digit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Error shake */
.email-code-input--error {
  animation: shake 0.4s ease-in-out;
}

.email-code-input--error .code-digit {
  border-color: var(--color-error);
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  20%,
  60% {
    transform: translateX(-6px);
  }
  40%,
  80% {
    transform: translateX(6px);
  }
}

@media (max-width: 380px) {
  .code-digit {
    width: 38px;
    height: 46px;
    font-size: var(--text-lg);
  }

  .email-code-input {
    gap: 6px;
  }
}
</style>
