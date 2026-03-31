<template>
  <section class="sketch-uploader surface-paper-sketch" :data-mode="mode">
    <input
      ref="inputRef"
      type="file"
      class="sr-only"
      :accept="accept"
      :multiple="multiple"
      :disabled="disabled"
      @change="handleInputChange"
    />

    <button
      type="button"
      class="sketch-uploader__dropzone"
      :class="{ 'is-drag-active': isDragActive, 'is-disabled': disabled }"
      :disabled="disabled"
      @click="openPicker"
      @dragenter.prevent="handleDragEnter"
      @dragover.prevent="handleDragEnter"
      @dragleave.prevent="handleDragLeave"
      @drop.prevent="handleDrop"
    >
      <span class="sketch-uploader__icon" aria-hidden="true">
        <UploadCloud :size="24" />
      </span>
      <strong class="sketch-uploader__title">{{ title }}</strong>
      <p class="sketch-uploader__description">{{ description }}</p>
      <span class="sketch-uploader__select">{{ selectLabel }}</span>
      <span v-if="hint" class="sketch-uploader__hint">{{ hint }}</span>
    </button>

    <TransitionGroup
      v-if="items.length > 0"
      name="upload-item"
      tag="ul"
      class="sketch-uploader__list"
    >
      <li
        v-for="item in items"
        :key="item.id"
        class="sketch-uploader__item"
        :class="`is-${item.status}`"
      >
        <div class="sketch-uploader__preview">
          <img
            v-if="item.previewUrl && item.mimeType.startsWith('image/')"
            :src="item.previewUrl"
            :alt="item.name"
            class="sketch-uploader__thumb"
          />
          <span v-else class="sketch-uploader__file-icon" aria-hidden="true">
            <FileImage v-if="item.mimeType.startsWith('image/')" :size="18" />
            <FileText v-else :size="18" />
          </span>
        </div>

        <div class="sketch-uploader__meta">
          <div class="sketch-uploader__headline">
            <strong class="sketch-uploader__name">{{ item.name }}</strong>
            <span class="sketch-uploader__size">{{ formatFileSize(item.size) }}</span>
          </div>

          <div class="sketch-uploader__status-row">
            <span class="sketch-uploader__status">
              <LoaderCircle v-if="item.status === 'uploading'" :size="14" class="is-spinning" />
              <CircleCheckBig v-else-if="item.status === 'success'" :size="14" />
              <AlertTriangle v-else-if="item.status === 'error'" :size="14" />
              <Clock3 v-else :size="14" />
              <span>{{ resolveStatusLabel(item) }}</span>
            </span>
            <span v-if="item.status === 'uploading'" class="sketch-uploader__percent">
              {{ Math.round(item.progress) }}%
            </span>
          </div>

          <div class="sketch-uploader__progress" aria-hidden="true">
            <span class="sketch-uploader__progress-fill" :style="{ width: `${item.progress}%` }" />
          </div>

          <p v-if="item.error" class="sketch-uploader__error">{{ item.error }}</p>
        </div>

        <div class="sketch-uploader__actions">
          <button
            v-if="item.status === 'uploading'"
            type="button"
            class="sketch-uploader__action"
            @click="cancelUpload(item.id)"
          >
            <X :size="16" />
          </button>
          <button
            v-else-if="item.status === 'error' && Boolean(uploadFn)"
            type="button"
            class="sketch-uploader__action"
            @click="retryUpload(item.id)"
          >
            <RotateCcw :size="16" />
          </button>
          <button type="button" class="sketch-uploader__action" @click="removeItem(item.id)">
            <Trash2 :size="16" />
          </button>
        </div>
      </li>
    </TransitionGroup>
  </section>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  AlertTriangle,
  CircleCheckBig,
  Clock3,
  FileImage,
  FileText,
  LoaderCircle,
  RotateCcw,
  Trash2,
  UploadCloud,
  X,
} from '@lucide/vue'
import type { UploadQueueItem, UploadSurfaceMode } from '@/types'

interface UploadResponseShape {
  id?: string
  url?: string
  thumbnail_url?: string
  mime_type?: string
}

interface Props {
  mode?: UploadSurfaceMode
  title: string
  description: string
  selectLabel: string
  hint?: string
  accept?: string
  multiple?: boolean
  maxFiles?: number
  disabled?: boolean
  autoUpload?: boolean
  uploadFn?: ((file: File, signal: AbortSignal) => Promise<UploadResponseShape>) | undefined
  deleteFn?: ((item: UploadQueueItem) => Promise<void> | void) | undefined
  validateFn?: ((file: File, items: UploadQueueItem[]) => string | null) | undefined
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'comment-images',
  hint: '',
  accept: '',
  multiple: true,
  maxFiles: 9,
  disabled: false,
  autoUpload: true,
  uploadFn: undefined,
  deleteFn: undefined,
  validateFn: undefined,
})

const emit = defineEmits<{
  error: [message: string]
  uploaded: [item: UploadQueueItem]
  removed: [itemId: string]
  selected: [items: UploadQueueItem[]]
}>()

const items = defineModel<UploadQueueItem[]>({ default: [] })
const inputRef = useTemplateRef<HTMLInputElement>('inputRef')
const isDragActive = ref(false)
const controllers = new Map<string, AbortController>()
const progressTimers = new Map<string, ReturnType<typeof setInterval>>()
const { t } = useI18n()

const canUpload = computed(() => props.autoUpload && typeof props.uploadFn === 'function')

function openPicker() {
  inputRef.value?.click()
}

function createItem(file: File): UploadQueueItem {
  const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`

  return {
    id,
    file,
    name: file.name,
    size: file.size,
    mimeType: file.type,
    status: canUpload.value ? 'uploading' : 'ready',
    progress: canUpload.value ? 10 : 0,
    previewUrl,
    remoteId: null,
    remoteUrl: null,
    thumbnailUrl: null,
    error: null,
  }
}

function cleanupPreview(item: UploadQueueItem) {
  if (item.previewUrl?.startsWith('blob:')) {
    URL.revokeObjectURL(item.previewUrl)
  }
}

function clearProgressTimer(itemId: string) {
  const timer = progressTimers.get(itemId)
  if (timer) {
    clearInterval(timer)
    progressTimers.delete(itemId)
  }
}

function setProgressPulse(itemId: string) {
  clearProgressTimer(itemId)
  const timer = setInterval(() => {
    const item = items.value.find((entry) => entry.id === itemId)
    if (!item || item.status !== 'uploading') {
      clearProgressTimer(itemId)
      return
    }
    const nextProgress = Math.min(item.progress + 9, 86)
    patchItem(itemId, { progress: nextProgress })
  }, 180)
  progressTimers.set(itemId, timer)
}

function patchItem(itemId: string, patch: Partial<UploadQueueItem>) {
  items.value = items.value.map((item) => (item.id === itemId ? { ...item, ...patch } : item))
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size}B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`
  return `${(size / (1024 * 1024)).toFixed(1)}MB`
}

function resolveStatusLabel(item: UploadQueueItem): string {
  if (item.status === 'success') return t('uploader.status.success')
  if (item.status === 'error') return t('uploader.status.error')
  if (item.status === 'uploading') return t('uploader.status.uploading')
  if (item.status === 'canceled') return t('uploader.status.canceled')
  return t('uploader.status.ready')
}

function validateFiles(files: File[]): File[] {
  const availableSlots = Math.max(props.maxFiles - items.value.length, 0)
  const nextFiles = availableSlots > 0 ? files.slice(0, availableSlots) : []

  if (files.length > availableSlots) {
    emit('error', t('uploader.errors.queueLimit', { count: props.maxFiles }))
  }

  return nextFiles.filter((file) => {
    const customError = props.validateFn?.(file, items.value) ?? null
    if (customError) {
      emit('error', customError)
      return false
    }
    return true
  })
}

function handleDragEnter() {
  if (props.disabled) return
  isDragActive.value = true
}

function handleDragLeave(event: DragEvent) {
  if (!event.currentTarget) {
    isDragActive.value = false
    return
  }
  const target = event.currentTarget as HTMLElement
  const relatedTarget = event.relatedTarget as Node | null
  if (relatedTarget && target.contains(relatedTarget)) return
  isDragActive.value = false
}

async function queueFiles(fileList: FileList | File[]) {
  const files = Array.from(fileList)
  const validFiles = validateFiles(files)
  if (validFiles.length === 0) return

  const nextItems = validFiles.map(createItem)
  items.value = [...items.value, ...nextItems]
  emit('selected', nextItems)

  if (!canUpload.value) return

  await Promise.all(nextItems.map((item) => startUpload(item.id)))
}

function handleDrop(event: DragEvent) {
  if (props.disabled) return
  isDragActive.value = false
  if (!event.dataTransfer?.files?.length) return
  void queueFiles(event.dataTransfer.files)
}

function handleInputChange(event: Event) {
  const files = (event.target as HTMLInputElement).files
  if (!files?.length) return
  void queueFiles(files)
  ;(event.target as HTMLInputElement).value = ''
}

async function startUpload(itemId: string) {
  if (!props.uploadFn) return
  const item = items.value.find((entry) => entry.id === itemId)
  if (!item) return

  const controller = new AbortController()
  controllers.set(itemId, controller)
  patchItem(itemId, { status: 'uploading', progress: 14, error: null })
  setProgressPulse(itemId)

  try {
    const response = await props.uploadFn(item.file, controller.signal)
    clearProgressTimer(itemId)
    controllers.delete(itemId)
    patchItem(itemId, {
      status: 'success',
      progress: 100,
      remoteId: response.id ?? null,
      remoteUrl: response.url ?? null,
      thumbnailUrl: response.thumbnail_url ?? null,
    })
    const uploadedItem = items.value.find((entry) => entry.id === itemId)
    if (uploadedItem) {
      emit('uploaded', uploadedItem)
    }
  } catch (error) {
    clearProgressTimer(itemId)
    controllers.delete(itemId)
    const message =
      error instanceof Error && error.message ? error.message : t('uploader.errors.uploadFailed')
    patchItem(itemId, {
      status: 'error',
      progress: 100,
      error: message,
    })
    emit('error', message)
  }
}

function cancelUpload(itemId: string) {
  controllers.get(itemId)?.abort()
  controllers.delete(itemId)
  clearProgressTimer(itemId)
  patchItem(itemId, {
    status: 'canceled',
    progress: 0,
    error: null,
  })
}

function retryUpload(itemId: string) {
  void startUpload(itemId)
}

async function removeItem(itemId: string) {
  const item = items.value.find((entry) => entry.id === itemId)
  if (!item) return

  controllers.get(itemId)?.abort()
  controllers.delete(itemId)
  clearProgressTimer(itemId)

  if (item.status === 'success' && props.deleteFn) {
    try {
      await props.deleteFn(item)
    } catch (error) {
      emit(
        'error',
        error instanceof Error && error.message ? error.message : t('uploader.errors.removeFailed')
      )
    }
  }

  cleanupPreview(item)
  items.value = items.value.filter((entry) => entry.id !== itemId)
  emit('removed', itemId)
}

function clear() {
  for (const item of items.value) {
    controllers.get(item.id)?.abort()
    cleanupPreview(item)
    clearProgressTimer(item.id)
  }
  controllers.clear()
  progressTimers.clear()
  items.value = []
}

defineExpose({ openPicker, clear })

onUnmounted(() => {
  clear()
})
</script>

<style scoped>
.sketch-uploader {
  display: grid;
  gap: 1rem;
  padding: 1rem;
}

.sketch-uploader__dropzone {
  display: grid;
  justify-items: center;
  gap: 0.5rem;
  padding-block: 1.25rem;
  padding-inline: 1rem;
  border: 1px dashed var(--surface-paper-border-strong);
  border-radius: 1.25rem;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.42), transparent 48%),
    color-mix(in srgb, var(--surface-paper-bg) 88%, rgba(255, 255, 255, 0.24));
  text-align: center;
  transition:
    border-color var(--duration-fast) var(--ease-out),
    background-color var(--duration-fast) var(--ease-out),
    transform var(--duration-fast) var(--ease-out);
}

.sketch-uploader__dropzone.is-drag-active {
  border-style: solid;
  border-color: color-mix(
    in srgb,
    var(--surface-paper-accent) 72%,
    var(--surface-paper-border-strong)
  );
  transform: translateY(-0.08rem);
}

.sketch-uploader__dropzone.is-disabled {
  opacity: 0.55;
}

.sketch-uploader__icon {
  display: inline-grid;
  place-items: center;
  inline-size: 3rem;
  block-size: 3rem;
  border-radius: 999rem;
  border: 1px solid var(--surface-paper-border);
  color: var(--surface-paper-accent);
  background: rgba(var(--surface-paper-accent-rgb), 0.08);
}

.sketch-uploader__title {
  color: var(--surface-paper-ink);
  font-size: var(--text-base);
}

.sketch-uploader__description,
.sketch-uploader__hint {
  margin: 0;
  max-inline-size: 46ch;
  color: var(--surface-paper-ink-soft);
  line-height: 1.6;
}

.sketch-uploader__select {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding-block: 0.5rem;
  padding-inline: 0.9rem;
  border-radius: 999rem;
  border: 1px solid var(--surface-paper-border);
  background: color-mix(in srgb, var(--surface-paper-bg-strong) 86%, rgba(255, 255, 255, 0.3));
  color: var(--surface-paper-ink);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
}

.sketch-uploader__list {
  display: grid;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.sketch-uploader__item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: start;
  padding: 0.8rem;
  border: 1px solid var(--surface-paper-border);
  border-radius: 1rem;
  background: color-mix(in srgb, var(--surface-paper-bg) 90%, rgba(255, 255, 255, 0.24));
}

.sketch-uploader__preview {
  display: inline-grid;
  place-items: center;
  inline-size: 3.1rem;
  block-size: 3.1rem;
  border-radius: 0.95rem;
  border: 1px solid var(--surface-paper-border);
  background: rgba(var(--surface-paper-accent-rgb), 0.08);
  overflow: clip;
}

.sketch-uploader__thumb {
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
}

.sketch-uploader__file-icon {
  color: var(--surface-paper-accent);
}

.sketch-uploader__meta {
  display: grid;
  gap: 0.35rem;
  min-inline-size: 0;
}

.sketch-uploader__headline,
.sketch-uploader__status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}

.sketch-uploader__name,
.sketch-uploader__status {
  min-inline-size: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.sketch-uploader__name {
  color: var(--surface-paper-ink);
  overflow-wrap: anywhere;
}

.sketch-uploader__size,
.sketch-uploader__percent,
.sketch-uploader__status {
  color: var(--surface-paper-ink-soft);
  font-size: var(--text-xs);
}

.sketch-uploader__progress {
  inline-size: 100%;
  block-size: 0.35rem;
  overflow: clip;
  border-radius: 999rem;
  background: rgba(var(--surface-paper-accent-rgb), 0.12);
}

.sketch-uploader__progress-fill {
  display: block;
  block-size: 100%;
  border-radius: inherit;
  background: linear-gradient(
    90deg,
    var(--surface-paper-accent),
    color-mix(in srgb, var(--surface-paper-accent) 72%, #ffffff 28%)
  );
  transition: width var(--duration-fast) var(--ease-out);
}

.sketch-uploader__error {
  margin: 0;
  color: var(--color-error);
  font-size: var(--text-xs);
}

.sketch-uploader__actions {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.sketch-uploader__action {
  display: inline-grid;
  place-items: center;
  inline-size: 2rem;
  block-size: 2rem;
  border: 1px solid var(--surface-paper-border);
  border-radius: 999rem;
  color: var(--surface-paper-ink-soft);
  background: rgba(255, 255, 255, 0.45);
}

.is-spinning {
  animation: uploader-spin 1s linear infinite;
}

.upload-item-enter-active,
.upload-item-leave-active {
  transition:
    opacity var(--duration-fast) var(--ease-out),
    transform var(--duration-fast) var(--ease-out);
}

.upload-item-enter-from,
.upload-item-leave-to {
  opacity: 0;
  transform: translateY(0.35rem);
}

@keyframes uploader-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .sketch-uploader__item {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .sketch-uploader__actions {
    grid-column: 1 / -1;
    justify-self: end;
  }
}
</style>
