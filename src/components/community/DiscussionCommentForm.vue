<template>
  <form class="discussion-comment-form" @submit.prevent="handleSubmit">
    <div v-if="!isAuthenticated" class="login-prompt glass-card">
      <div class="prompt-icon-wrap">
        <AnimatedIcon name="user" :fallback-icon="LogIn" size="lg" class="prompt-icon" />
      </div>
      <div class="prompt-text">
        <h4 class="prompt-title">{{ $t('comment.loginRequiredTitle') }}</h4>
        <p class="prompt-desc">{{ $t('comment.loginRequired') }}</p>
      </div>
      <div class="prompt-actions">
        <Button type="button" size="sm" class="prompt-btn" @click="goToLogin">{{
          $t('nav.login')
        }}</Button>
        <Button type="button" variant="ghost" size="sm" class="prompt-btn" @click="goToRegister">
          {{ $t('nav.register') }}
        </Button>
      </div>
    </div>

    <div v-else class="form-content">
      <div class="user-avatar">
        <img :src="userAvatar" :alt="user?.username" />
      </div>
      <div class="form-input-wrapper">
        <Textarea
          ref="textareaRef"
          v-model="content"
          class="comment-textarea"
          :placeholder="placeholder"
          :disabled="isSubmitting"
          rows="3"
          :maxlength="maxLength"
          @update:modelValue="autoResize"
        />
        <div class="form-footer">
          <span class="char-count" :class="{ warning: content.length > maxLength * 0.9 }">
            {{ content.length }}/{{ maxLength }}
          </span>
          <div class="form-actions">
            <Button v-if="parentId" variant="ghost" size="sm" @click="$emit('cancel')">
              {{ $t('common.cancel') }}
            </Button>
            <Button type="submit" size="sm" :disabled="!canSubmit" :loading="isSubmitting">
              {{ parentId ? $t('comment.reply') : $t('comment.submit') }}
            </Button>
          </div>
        </div>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { LogIn } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useAuthStore, useToastStore } from '@/stores'
import { discussionService, type DiscussionComment, ApiError } from '@/api'
import { validateComment, sanitizeComment, commentRateLimiter } from '@/utils/security'
import { useUserAvatar } from '@/composables/useUserAvatar'
import Button from '@/components/ui/Button.vue'
import Textarea from '@/components/ui/Textarea.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'

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
const textareaRef = ref<{ el: HTMLTextAreaElement | null } | null>(null)
const maxLength = 2000

const { avatarUrl: userAvatar } = useUserAvatar()

const placeholder = computed(() => {
  if (props.replyToUsername) {
    return t('comment.replyPlaceholder', { username: props.replyToUsername })
  }
  return t('comment.placeholder')
})

const canSubmit = computed(() => {
  const validation = validateComment(content.value)
  return validation.valid && !isSubmitting.value
})

function autoResize() {
  nextTick(() => {
    const textarea = textareaRef.value?.el
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  })
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

  const sanitizedContent = sanitizeComment(content.value)

  try {
    const newComment = await discussionService.addComment(props.discussionId, {
      content: sanitizedContent,
      ...(props.parentId ? { parent_id: props.parentId } : {}),
    })

    commentRateLimiter.record()
    content.value = ''
    toastStore.success(t('comment.submitSuccess'))
    emit('submitted', newComment)
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
  textareaRef.value?.el?.focus()
}

function setContent(text: string) {
  content.value = text
}

defineExpose({ focus, setContent })
</script>

<style scoped>
.discussion-comment-form {
  margin-bottom: var(--spacing-4);
}

.login-prompt {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--spacing-4);
  padding: var(--spacing-5) var(--spacing-6);
  text-align: left;
  border: 1px solid var(--glass-border);
}

.prompt-icon-wrap {
  width: 3.25rem;
  height: 3.25rem;
  border-radius: var(--radius-full);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.prompt-icon {
  color: var(--color-text-tertiary);
}

.prompt-text {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  min-width: 0;
}

.prompt-title {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.prompt-desc {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.prompt-actions {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.form-content {
  display: flex;
  gap: var(--spacing-3);
}

.user-avatar img {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  object-fit: cover;
}

.form-input-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.comment-textarea {
  resize: none;
  min-height: 80px;
  max-height: 300px;
}

.form-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.char-count {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.char-count.warning {
  color: var(--color-warning);
}

.form-actions {
  display: flex;
  gap: var(--spacing-2);
}

@media (max-width: 640px) {
  .login-prompt {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
  }

  .prompt-actions {
    width: 100%;
    justify-self: stretch;
    flex-direction: column;
  }

  .prompt-btn {
    width: 100%;
  }
}
</style>
