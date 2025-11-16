<template>
  <div class="form-select-container">
    <!-- Label -->
    <label v-if="label" :for="selectId" class="select-label" :class="{ 'is-required': required }">
      {{ label }}
    </label>

    <!-- Select Wrapper -->
    <div class="form-select-wrapper" :class="wrapperClass" ref="selectRef">
      <!-- Select Button -->
      <button
        :id="selectId"
        type="button"
        class="select-button"
        :disabled="disabled"
        :aria-expanded="isOpen"
        :aria-haspopup="true"
        :aria-invalid="!!error"
        :aria-describedby="error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined"
        @click="toggleDropdown"
        @keydown.enter.prevent="toggleDropdown"
        @keydown.space.prevent="toggleDropdown"
        @keydown.escape="closeDropdown"
        @keydown.down.prevent="focusNextOption"
        @keydown.up.prevent="focusPreviousOption"
      >
        <!-- Selected Value Display -->
        <span class="select-value" :class="{ 'is-placeholder': !hasValue }">
          {{ displayValue }}
        </span>

        <!-- Arrow Icon -->
        <svg
          class="select-arrow"
          :class="{ 'is-open': isOpen }"
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <!-- Dropdown -->
      <Transition name="dropdown">
        <div v-if="isOpen" class="select-dropdown" :style="dropdownStyle">
          <!-- Search Input -->
          <div v-if="searchable" class="select-search">
            <input
              ref="searchInputRef"
              v-model="searchQuery"
              type="text"
              class="search-input"
              :placeholder="searchPlaceholder"
              @keydown.escape="closeDropdown"
              @keydown.down.prevent="focusNextOption"
              @keydown.up.prevent="focusPreviousOption"
              @keydown.enter.prevent="selectFocusedOption"
            />
          </div>

          <!-- Options List -->
          <div class="select-options" ref="optionsRef">
            <div
              v-for="(option, index) in filteredOptions"
              :key="getOptionValue(option)"
              class="select-option"
              :class="{
                'is-selected': isSelected(option),
                'is-focused': focusedIndex === index,
              }"
              @click="handleSelect(option)"
              @mouseenter="focusedIndex = index"
            >
              <!-- Checkbox for multi-select -->
              <div v-if="multiple" class="option-checkbox">
                <svg
                  v-if="isSelected(option)"
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              <!-- Custom Option Slot -->
              <slot
                v-if="$slots.option"
                name="option"
                :option="option"
                :selected="isSelected(option)"
              />

              <!-- Default Option Display -->
              <span v-else class="option-label">
                {{ getOptionLabel(option) }}
              </span>
            </div>

            <!-- No Results -->
            <div v-if="filteredOptions.length === 0" class="select-empty">
              {{ noResultsText }}
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Hint Text -->
    <div v-if="hint && !error" :id="`${selectId}-hint`" class="select-hint">
      {{ hint }}
    </div>

    <!-- Error Message -->
    <div v-if="error" :id="`${selectId}-error`" class="select-error" role="alert">
      <svg
        class="error-icon"
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span>{{ error }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

defineOptions({
  name: 'FormSelect',
})

type OptionValue = string | number
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Option = OptionValue | { label: string; value: OptionValue; [key: string]: any }

interface Props {
  modelValue: OptionValue | OptionValue[] | null
  options: Option[]
  label?: string
  placeholder?: string
  error?: string
  hint?: string
  required?: boolean
  disabled?: boolean
  multiple?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  noResultsText?: string
  valueKey?: string
  labelKey?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Select an option',
  disabled: false,
  required: false,
  multiple: false,
  searchable: false,
  searchPlaceholder: 'Search...',
  noResultsText: 'No results found',
  valueKey: 'value',
  labelKey: 'label',
})

const emit = defineEmits<{
  'update:modelValue': [value: OptionValue | OptionValue[] | null]
  change: [value: OptionValue | OptionValue[] | null]
  open: []
  close: []
}>()

const selectRef = ref<HTMLElement>()
const searchInputRef = ref<HTMLInputElement>()
const optionsRef = ref<HTMLElement>()
const isOpen = ref(false)
const searchQuery = ref('')
const focusedIndex = ref(0)

const selectId = computed(() => `select-${Math.random().toString(36).substr(2, 9)}`)

const hasValue = computed(() => {
  if (props.multiple) {
    return Array.isArray(props.modelValue) && props.modelValue.length > 0
  }
  return props.modelValue !== null && props.modelValue !== undefined
})

const displayValue = computed(() => {
  if (!hasValue.value) return props.placeholder

  if (props.multiple && Array.isArray(props.modelValue)) {
    const modelValue = props.modelValue as OptionValue[]
    const selectedOptions = props.options.filter((opt) => modelValue.includes(getOptionValue(opt)))
    if (selectedOptions.length === 0) return props.placeholder
    if (selectedOptions.length === 1) return getOptionLabel(selectedOptions[0]!)
    return `${selectedOptions.length} selected`
  }

  const selectedOption = props.options.find((opt) => getOptionValue(opt) === props.modelValue)
  return selectedOption ? getOptionLabel(selectedOption) : props.placeholder
})

const filteredOptions = computed(() => {
  if (!props.searchable || !searchQuery.value) {
    return props.options
  }

  const query = searchQuery.value.toLowerCase()
  return props.options.filter((option) => {
    const label = getOptionLabel(option).toLowerCase()
    return label.includes(query)
  })
})

const wrapperClass = computed(() => ({
  'is-open': isOpen.value,
  'is-disabled': props.disabled,
  'has-error': props.error,
  'has-value': hasValue.value,
}))

const dropdownStyle = computed(() => ({
  maxHeight: '300px',
}))

function getOptionValue(option: Option): OptionValue {
  if (typeof option === 'object' && option !== null) {
    return option[props.valueKey]
  }
  return option
}

function getOptionLabel(option: Option): string {
  if (typeof option === 'object' && option !== null) {
    return String(option[props.labelKey])
  }
  return String(option)
}

function isSelected(option: Option): boolean {
  const value = getOptionValue(option)
  if (props.multiple && Array.isArray(props.modelValue)) {
    return props.modelValue.includes(value)
  }
  return props.modelValue === value
}

function toggleDropdown() {
  if (props.disabled) return
  if (isOpen.value) {
    closeDropdown()
  } else {
    openDropdown()
  }
}

async function openDropdown() {
  isOpen.value = true
  searchQuery.value = ''
  focusedIndex.value = 0
  emit('open')

  await nextTick()
  if (props.searchable && searchInputRef.value) {
    searchInputRef.value.focus()
  }
}

function closeDropdown() {
  isOpen.value = false
  searchQuery.value = ''
  emit('close')
}

function handleSelect(option: Option) {
  const value = getOptionValue(option)

  if (props.multiple) {
    const currentValue = Array.isArray(props.modelValue) ? [...props.modelValue] : []
    const index = currentValue.indexOf(value)

    if (index > -1) {
      currentValue.splice(index, 1)
    } else {
      currentValue.push(value)
    }

    emit('update:modelValue', currentValue)
    emit('change', currentValue)
  } else {
    emit('update:modelValue', value)
    emit('change', value)
    closeDropdown()
  }
}

function focusNextOption() {
  if (focusedIndex.value < filteredOptions.value.length - 1) {
    focusedIndex.value++
    scrollToFocusedOption()
  }
}

function focusPreviousOption() {
  if (focusedIndex.value > 0) {
    focusedIndex.value--
    scrollToFocusedOption()
  }
}

function selectFocusedOption() {
  const option = filteredOptions.value[focusedIndex.value]
  if (option) {
    handleSelect(option)
  }
}

function scrollToFocusedOption() {
  nextTick(() => {
    if (!optionsRef.value) return
    const focusedElement = optionsRef.value.children[focusedIndex.value] as HTMLElement
    if (focusedElement) {
      focusedElement.scrollIntoView({ block: 'nearest' })
    }
  })
}

function handleClickOutside(event: MouseEvent) {
  if (selectRef.value && !selectRef.value.contains(event.target as Node)) {
    closeDropdown()
  }
}

watch(
  () => props.options,
  () => {
    focusedIndex.value = 0
  },
)

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.form-select-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  width: 100%;
}

/* Label */
.select-label {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-1);
}

.select-label.is-required::after {
  content: ' *';
  color: var(--color-error);
}

/* Select Wrapper */
.form-select-wrapper {
  position: relative;
  width: 100%;
}

/* Select Button */
.select-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-3) var(--spacing-4);
  font-size: var(--text-base);
  font-family: var(--font-sans);
  color: var(--color-text-primary);
  background: var(--glass-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  backdrop-filter: var(--glass-blur);
  cursor: pointer;
  transition: all var(--transition-base);
  text-align: left;
}

.select-button:hover:not(:disabled) {
  border-color: var(--color-primary-light);
}

.select-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-select-wrapper.is-open .select-button {
  border-color: var(--color-primary);
  background: var(--glass-bg-strong);
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
}

.form-select-wrapper.has-error .select-button {
  border-color: var(--color-error);
}

.form-select-wrapper.has-error.is-open .select-button {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

/* Select Value */
.select-value {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.select-value.is-placeholder {
  color: var(--color-text-tertiary);
}

/* Arrow Icon */
.select-arrow {
  flex-shrink: 0;
  margin-left: var(--spacing-2);
  color: var(--color-text-tertiary);
  transition: transform var(--transition-base);
}

.select-arrow.is-open {
  transform: rotate(180deg);
}

/* Dropdown */
.select-dropdown {
  position: absolute;
  top: calc(100% + var(--spacing-2));
  left: 0;
  right: 0;
  background: var(--glass-bg-strong);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--shadow-xl);
  overflow: hidden;
  z-index: var(--z-dropdown);
}

/* Dropdown Transitions */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all var(--transition-fast);
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Search Input */
.select-search {
  padding: var(--spacing-3);
  border-bottom: 1px solid var(--color-border);
}

.search-input {
  width: 100%;
  padding: var(--spacing-2) var(--spacing-3);
  font-size: var(--text-sm);
  font-family: var(--font-sans);
  color: var(--color-text-primary);
  background: var(--color-surface-variant);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  outline: none;
  transition: all var(--transition-fast);
}

.search-input:focus {
  border-color: var(--color-primary);
  background: var(--color-surface);
}

.search-input::placeholder {
  color: var(--color-text-tertiary);
}

/* Options List */
.select-options {
  max-height: 250px;
  overflow-y: auto;
  padding: var(--spacing-2);
}

.select-options::-webkit-scrollbar {
  width: 6px;
}

.select-options::-webkit-scrollbar-track {
  background: transparent;
}

.select-options::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: var(--radius-full);
}

.select-options::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-tertiary);
}

/* Option Item */
.select-option {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.select-option:hover,
.select-option.is-focused {
  background: var(--color-surface-variant);
}

.select-option.is-selected {
  background: rgba(139, 92, 246, 0.1);
  color: var(--color-primary);
}

.select-option.is-selected:hover {
  background: rgba(139, 92, 246, 0.15);
}

/* Checkbox */
.option-checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.select-option.is-selected .option-checkbox {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

/* Option Label */
.option-label {
  flex: 1;
  font-size: var(--text-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Empty State */
.select-empty {
  padding: var(--spacing-6) var(--spacing-4);
  text-align: center;
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

/* Hint Text */
.select-hint {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  line-height: var(--line-normal);
}

/* Error Message */
.select-error {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  font-size: var(--text-xs);
  color: var(--color-error);
  line-height: var(--line-normal);
  font-weight: var(--font-medium);
}

.error-icon {
  flex-shrink: 0;
  animation: errorShake 0.4s ease-in-out;
}

@keyframes errorShake {
  0%,
  100% {
    transform: translateX(0);
  }

  25% {
    transform: translateX(-4px);
  }

  75% {
    transform: translateX(4px);
  }
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .select-button {
    font-size: var(--text-sm);
    padding: var(--spacing-2) var(--spacing-3);
  }

  .select-dropdown {
    max-height: 250px;
  }

  .select-options {
    max-height: 200px;
  }
}
</style>
