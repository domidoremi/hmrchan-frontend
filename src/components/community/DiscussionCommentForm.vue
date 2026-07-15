<template>
  <form
    class="discussion-comment-form"
    data-testid="discussion-comment-composer"
    @submit.prevent="handleSubmit"
  >
    <CommentComposerShell
      :authenticated="isAuthenticated"
      :avatar-src="userAvatar"
      :avatar-alt="user?.username"
      :avatar-fallback="userAvatarFallbackLabel"
      :title="props.parentId ? t('comment.reply') : t('comment.title')"
      :subtitle="composerSubtitle"
      :char-count="content.length"
      :max-length="maxLength"
    >
      <template #guest>
        <div class="login-prompt surface-paper-sketch">
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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              class="prompt-btn"
              @click="goToRegister"
            >
              {{ t('nav.register') }}
            </Button>
          </div>
        </div>
      </template>

      <template #toolbar>
        <PlainTextToolbar :disabled="isSubmitting" @action="handleToolbarAction" />
      </template>

      <div class="form-editor">
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

      <template #footer>
        <div class="form-footer">
          <span class="composer-chip">{{ t('community.mentionHint') }}</span>
          <div class="form-actions">
            <Button
              v-if="props.parentId"
              type="button"
              variant="ghost"
              size="sm"
              @click="$emit('cancel')"
            >
              {{ t('common.cancel') }}
            </Button>
            <Button type="submit" size="sm" :disabled="!canSubmit" :loading="isSubmitting">
              {{ props.parentId ? t('comment.reply') : t('comment.submit') }}
            </Button>
          </div>
        </div>
      </template>
    </CommentComposerShell>
  </form>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { LogIn } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore, useToastStore } from '@/stores'
import { discussionService, type DiscussionComment, ApiError } from '@/api'
import { validateComment, sanitizeComment, commentRateLimiter } from '@/utils/security'
import { useUserAvatar } from '@/composables/useUserAvatar'
import { useUpdateBlocker } from '@/utils/app-update/updateBlockers'
import { applyPlainTextSnippet, type PlainTextToolAction } from '@/utils/plainTextTools'
import Button from '@/components/ui/Button.vue'
import Textarea from '@/components/ui/Textarea.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import PlainTextToolbar from '@/components/thread/PlainTextToolbar.vue'
import { CommentComposerShell } from '@/components/comment/shared'

interface Props {
  discussionId: string
  parentId?: string
  replyToUsername?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  cancel: []
  submitted: [comment: DiscussionComment]
}>()

const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const toastStore = useToastStore()

const { user, isAuthenticated } = storeToRefs(authStore)

const content = ref('')
const isSubmitting = ref(false)
const textareaRef = useTemplateRef<{ el: HTMLTextAreaElement | null }>('textareaRef')
const maxLength = 2000

const { avatarUrl: userAvatar } = useUserAvatar()

const placeholder = computed(() => {
  if (props.replyToUsername) {
    return t('comment.replyPlaceholder', { username: props.replyToUsername })
  }
  return t('comment.placeholder')
})

const composerSubtitle = computed(() =>
  props.replyToUsername
    ? t('comment.replyPlaceholder', { username: props.replyToUsername })
    : t('community.mentionHint')
)

const userAvatarFallbackLabel = computed(() => {
  const source = user.value?.username?.trim() || '?'
  return source.slice(0, 1).toUpperCase() || '?'
})
const shouldBlockUpdate = computed(() => {
  return isSubmitting.value || content.value.trim().length > 0
})
const updateBlockerId = computed(
  () => `discussion-comment-form:${props.discussionId}:${props.parentId ?? 'root'}`
)

const canSubmit = computed(() => {
  const validation = validateComment(content.value)
  return validation.valid && !isSubmitting.value
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

function handleToolbarAction(action: PlainTextToolAction) {
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

function goToLogin() {
  router.push('/login')
}

function goToRegister() {
  router.push('/register')
}

async function handleSubmit() {
  if (!canSubmit.value) return

  if (!commentRateLimiter.canProceed()) {
    const remaining = Math.ceil(commentRateLimiter.getRemainingTime() / 1000)
    toastStore.error(t('comment.error.rateLimitedWithTime', { seconds: remaining }))
    return
  }

  isSubmitting.value = true

  try {
    const newComment = await discussionService.addComment(props.discussionId, {
      content: sanitizeComment(content.value),
      ...(props.parentId ? { parent_id: props.parentId } : {}),
    })

    commentRateLimiter.record()
    content.value = ''
    toastStore.success(t('comment.submitSuccess'))
    emit('submitted', newComment)
    autoResize()
  } catch (err) {
    if (err instanceof ApiError) {
      toastStore.error(err.message)
    } else {
      toastStore.error(t('comment.error.addFailed'))
    }
  } finally {
    isSubmitting.value = false
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
.discussion-comment-form {
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

.prompt-text {
  display: grid;
  gap: var(--spacing-1);
  min-inline-size: 0;
}

.prompt-title {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--surface-paper-ink);
}

.prompt-desc {
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.55;
  color: var(--surface-paper-ink-soft);
}

.prompt-actions,
.form-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.form-editor {
  min-block-size: 7.25rem;
}

.comment-textarea {
  min-block-size: 7.25rem;
  max-block-size: 18rem;
  resize: none;
  border: 0;
  background: transparent;
  box-shadow: none;
  padding: 0;
  line-height: 1.7;
  color: var(--color-text-primary);
}

.comment-textarea::placeholder {
  color: color-mix(in srgb, var(--color-text-tertiary) 82%, transparent);
}

.form-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-3);
  width: 100%;
}

.composer-chip {
  display: inline-flex;
  align-items: center;
  min-block-size: 1.65rem;
  padding-inline: 0.625rem;
  border-radius: 999rem;
  background: rgba(var(--color-primary-rgb), 0.08);
  color: var(--color-primary);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

@media (max-width: 48rem) {
  .login-prompt {
    grid-template-columns: 1fr;
  }

  .prompt-actions,
  .form-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .prompt-btn,
  .form-actions > .btn {
    inline-size: 100%;
  }
}
</style>
