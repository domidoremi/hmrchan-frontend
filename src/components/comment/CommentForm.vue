<template>
  <form class="comment-form" @submit.prevent="handleSubmit">
    <div v-if="!isAuthenticated" class="login-prompt surface-paper-sketch">
      <div class="prompt-icon-wrap">
        <AnimatedIcon name="user" :fallback-icon="LogIn" size="lg" class="prompt-icon" />
      </div>
      <div class="prompt-text">
        <h4 class="prompt-title">{{ t('comment.loginRequiredTitle') }}</h4>
        <p class="prompt-desc">{{ t('comment.loginRequired') }}</p>
      </div>
      <div class="prompt-actions">
        <Button type="button" size="sm" class="prompt-btn" @click="goToLogin">
          {{ t('nav.login') }}
        </Button>
        <Button type="button" variant="ghost" size="sm" class="prompt-btn" @click="goToRegister">
          {{ t('nav.register') }}
        </Button>
      </div>
    </div>

    <div v-else class="form-shell surface-paper-sketch analog-dot-grid">
      <div class="form-content">
        <Avatar
          :src="userAvatar"
          :alt="user?.username"
          class="user-avatar"
          size="custom"
          :fallback="userAvatarFallbackLabel"
        />

        <div class="form-main">
          <header class="form-head">
            <div class="form-head__copy">
              <strong class="form-head__title">
                {{ props.replyTo ? t('comment.reply') : t('comment.title') }}
              </strong>
              <span class="form-head__subtitle">
                {{
                  props.replyToUsername
                    ? t('comment.replyPlaceholder', { username: props.replyToUsername })
                    : t('comment.placeholder')
                }}
              </span>
            </div>
            <span class="char-count" :class="{ warning: content.length > maxLength * 0.9 }">
              {{ content.length }}/{{ maxLength }}
            </span>
          </header>

          <PlainTextToolbar
            :disabled="isSubmitting"
            :show-media-action="true"
            @action="handleToolbarAction"
          />

          <div class="form-editor paper-rule">
            <Textarea
              ref="textareaRef"
              v-model="content"
              class="comment-textarea"
              :placeholder="placeholder"
              :disabled="isSubmitting"
              rows="4"
              :maxlength="maxLength"
              @update:modelValue="autoResize"
            />
          </div>

          <SketchDropUploader
            v-if="showUploader || attachmentItems.length > 0"
            ref="uploaderRef"
            v-model="attachmentItems"
            mode="comment-images"
            class="comment-uploader"
            :title="t('comment.toolbar.media')"
            :description="t('comment.placeholder')"
            :select-label="t('uploader.select')"
            :hint="uploadHint"
            accept="image/jpeg,image/png,image/webp,image/gif"
            :max-files="maxImages"
            :disabled="isSubmitting"
            :upload-fn="uploadCommentImage"
            :delete-fn="deleteCommentImage"
            :validate-fn="validateCommentImage"
            @error="handleUploadError"
          />

          <footer class="form-footer paper-rule">
            <div class="form-footer__status">
              <span class="paper-chip">
                {{ successfulImageIds.length }} / {{ maxImages }} {{ t('comment.toolbar.media') }}
              </span>
              <span v-if="isUploadingImages" class="form-footer__note">
                {{ t('uploader.status.uploading') }}
              </span>
            </div>

            <div class="form-actions">
              <Button v-if="props.replyTo" variant="ghost" size="sm" @click="$emit('cancel')">
                {{ t('common.cancel') }}
              </Button>
              <Button type="submit" size="sm" :disabled="!canSubmit" :loading="isSubmitting">
                {{ props.replyTo ? t('comment.reply') : t('comment.submit') }}
              </Button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { LogIn } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { commentService, type CommentImageUploadResponse } from '@/api/commentService'
import { useAuthStore, useCommentsStore, useToastStore } from '@/stores'
import type { UploadQueueItem } from '@/types'
import { validateComment } from '@/utils/security'
import { useUserAvatar } from '@/composables/useUserAvatar'
import { useUpdateBlocker } from '@/utils/app-update/updateBlockers'
import { applyPlainTextSnippet, type PlainTextToolAction } from '@/utils/plainTextTools'
import Avatar from '@/components/ui/Avatar.vue'
import Button from '@/components/ui/Button.vue'
import Textarea from '@/components/ui/Textarea.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import PlainTextToolbar from '@/components/thread/PlainTextToolbar.vue'
import SketchDropUploader from '@/components/ui/SketchDropUploader.vue'

interface Props {
  postId: string
  replyTo?: string
  replyToUsername?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  cancel: []
  submitted: []
}>()

const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const commentsStore = useCommentsStore()
const toastStore = useToastStore()

const { user, isAuthenticated } = storeToRefs(authStore)

const content = ref('')
const isSubmitting = ref(false)
const showUploader = ref(false)
const attachmentItems = ref<UploadQueueItem[]>([])
const textareaRef = useTemplateRef<{ el: HTMLTextAreaElement | null }>('textareaRef')
const uploaderRef = useTemplateRef<{ openPicker: () => void; clear: () => void }>('uploaderRef')
const maxLength = 2000
const maxImages = 9

const { avatarUrl: userAvatar } = useUserAvatar()

const placeholder = computed(() => {
  if (props.replyToUsername) {
    return t('comment.replyPlaceholder', { username: props.replyToUsername })
  }
  return t('comment.placeholder')
})

const userAvatarFallbackLabel = computed(() => {
  const source = user.value?.username?.trim() || '?'
  return source.slice(0, 1).toUpperCase() || '?'
})

const successfulImageIds = computed(() =>
  attachmentItems.value
    .filter((item) => item.status === 'success' && item.remoteId)
    .map((item) => item.remoteId as string)
)

const isUploadingImages = computed(() =>
  attachmentItems.value.some((item) => item.status === 'uploading')
)
const shouldBlockUpdate = computed(() => {
  return (
    isSubmitting.value ||
    content.value.trim().length > 0 ||
    attachmentItems.value.length > 0 ||
    isUploadingImages.value
  )
})
const updateBlockerId = computed(() => `comment-form:${props.postId}:${props.replyTo ?? 'root'}`)

const uploadHint = computed(() => t('comment.image.tooManyImages'))

const canSubmit = computed(() => {
  const validation = validateComment(content.value)
  return validation.valid && !isSubmitting.value && !isUploadingImages.value
})

useUpdateBlocker(updateBlockerId, shouldBlockUpdate)

function autoResize() {
  nextTick(() => {
    const textarea = textareaRef.value?.el
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  })
}

function focusSelection(start?: number, end?: number) {
  nextTick(() => {
    const textarea = textareaRef.value?.el
    if (!textarea) return
    textarea.focus()
    if (start != null && end != null) {
      textarea.setSelectionRange(start, end)
    }
  })
}

function goToLogin() {
  router.push('/login')
}

function goToRegister() {
  router.push('/register')
}

function validateCommentImage(file: File, queuedItems: UploadQueueItem[]): string | null {
  const files = [...queuedItems.map((item) => item.file), file]
  const result = commentService.validateImageFiles(files)
  if (!result.valid) {
    return result.error ? t(result.error) : t('uploader.errors.uploadFailed')
  }

  const singleResult = commentService.validateImageFile(file)
  if (!singleResult.valid) {
    return singleResult.error ? t(singleResult.error) : t('uploader.errors.uploadFailed')
  }

  return null
}

async function uploadCommentImage(file: File): Promise<CommentImageUploadResponse> {
  return commentService.uploadImage(file)
}

async function deleteCommentImage(item: UploadQueueItem) {
  if (!item.remoteId) return
  await commentService.deleteImage(item.remoteId)
}

function handleUploadError(message: string) {
  toastStore.error(message)
}

function handleToolbarAction(action: PlainTextToolAction | 'media') {
  if (action === 'media') {
    showUploader.value = true
    nextTick(() => uploaderRef.value?.openPicker())
    return
  }

  const textarea = textareaRef.value?.el
  const result = applyPlainTextSnippet(
    content.value,
    action,
    textarea?.selectionStart,
    textarea?.selectionEnd
  )
  content.value = result.value
  autoResize()
  focusSelection(result.caretStart, result.caretEnd)
}

async function handleSubmit() {
  if (!canSubmit.value) return

  isSubmitting.value = true

  const result = await commentsStore.addComment(props.postId, {
    content: content.value,
    image_ids: successfulImageIds.value,
    ...(props.replyTo ? { parent_id: props.replyTo } : {}),
  })

  isSubmitting.value = false

  if (result.success) {
    content.value = ''
    uploaderRef.value?.clear()
    showUploader.value = false
    toastStore.success(t('comment.submitSuccess'))
    emit('submitted')
    autoResize()
    return
  }

  const errorKey = result.error || 'comment.error.addFailed'
  if (result.remainingSeconds) {
    toastStore.error(t('comment.error.rateLimitedWithTime', { seconds: result.remainingSeconds }))
  } else {
    toastStore.error(t(errorKey))
  }
}

function focus() {
  focusSelection()
}

function setContent(text: string) {
  content.value = text
  autoResize()
}

defineExpose({ focus, setContent })
</script>

<style scoped>
.comment-form {
  margin-block-end: var(--spacing-4);
}

.login-prompt {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--spacing-4);
  padding-block: var(--spacing-5);
  padding-inline: var(--spacing-5);
}

.prompt-icon-wrap {
  inline-size: 3.25rem;
  block-size: 3.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0.0625rem solid var(--surface-paper-border);
  border-radius: 1.2rem;
  background: color-mix(in srgb, var(--surface-paper-bg) 82%, rgba(255, 255, 255, 0.42));
}

.prompt-icon {
  color: var(--surface-paper-ink-soft);
}

.prompt-text,
.form-main,
.form-head__copy {
  display: grid;
  gap: var(--spacing-1);
  min-inline-size: 0;
}

.prompt-title,
.form-head__title {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--surface-paper-ink);
}

.prompt-desc,
.form-head__subtitle {
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.55;
  color: var(--surface-paper-ink-soft);
}

.prompt-actions,
.form-actions,
.form-footer__status {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.form-shell {
  padding: var(--spacing-4);
}

.form-content {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--spacing-3);
  align-items: start;
}

.user-avatar {
  --avatar-size: 2.75rem;
  border: 0.0625rem solid var(--surface-paper-border);
  border-radius: 1rem;
}

.form-head,
.form-footer {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-3);
}

.char-count {
  flex-shrink: 0;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.char-count.warning {
  color: var(--color-warning);
}

.form-editor {
  padding-block-end: var(--spacing-3);
}

.comment-textarea {
  min-block-size: 7.25rem;
  max-block-size: 18rem;
  resize: none;
  border: 0;
  background: transparent;
  box-shadow: none;
}

:deep(.comment-textarea textarea),
:deep(.comment-textarea .ui-textarea__field) {
  min-block-size: 7.25rem;
  padding-inline: 0;
  padding-block: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
  line-height: 1.7;
  color: var(--surface-paper-ink);
}

:deep(.comment-textarea textarea::placeholder),
:deep(.comment-textarea .ui-textarea__field::placeholder) {
  color: color-mix(in srgb, var(--surface-paper-ink-soft) 84%, transparent);
}

.comment-uploader {
  margin-block-start: calc(var(--spacing-1) * -1);
}

.form-footer {
  padding-block-start: var(--spacing-3);
}

.form-footer__note {
  font-size: var(--text-xs);
  color: var(--surface-paper-ink-soft);
}

@media (max-width: 48rem) {
  .login-prompt,
  .form-content {
    grid-template-columns: 1fr;
  }

  .prompt-actions,
  .form-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .prompt-btn,
  .form-actions > :deep(*) {
    inline-size: 100%;
  }

  .user-avatar {
    justify-self: start;
  }
}
</style>
