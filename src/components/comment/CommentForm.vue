<template>
  <form class="comment-form" @submit.prevent="handleSubmit">
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
            <Button v-if="replyTo" variant="ghost" size="sm" @click="$emit('cancel')">
              {{ $t('common.cancel') }}
            </Button>
            <Button type="submit" size="sm" :disabled="!canSubmit" :loading="isSubmitting">
              {{ replyTo ? $t('comment.reply') : $t('comment.submit') }}
            </Button>
          </div>
        </div>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { LogIn } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useAuthStore, useCommentsStore, useToastStore } from '@/stores'
import { validateComment } from '@/utils/security'
import { useUserAvatar } from '@/composables/useUserAvatar'
import Button from '@/components/ui/Button.vue'
import Textarea from '@/components/ui/Textarea.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'

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
const textareaRef = useTemplateRef<{ el: HTMLTextAreaElement | null }>('textareaRef')
const maxLength = 2000

// 使用统一的用户头像 composable，确保与其他组件同步
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

  isSubmitting.value = true

  const result = await commentsStore.addComment(props.postId, {
    content: content.value,
    ...(props.replyTo ? { parent_id: props.replyTo } : {}),
  })

  isSubmitting.value = false

  if (result.success) {
    content.value = ''
    toastStore.success(t('comment.submitSuccess'))
    emit('submitted')
  } else {
    const errorKey = result.error || 'comment.error.addFailed'
    if (result.remainingSeconds) {
      toastStore.error(t('comment.error.rateLimitedWithTime', { seconds: result.remainingSeconds }))
    } else {
      toastStore.error(t(errorKey))
    }
  }
}

// 聚焦输入框
function focus() {
  textareaRef.value?.el?.focus()
}

// 设置内容（用于回复时添加 @用户名）
function setContent(text: string) {
  content.value = text
}

defineExpose({ focus, setContent })
</script>

<style scoped>
.comment-form {
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
  min-height: 5rem;
  max-height: 18.75rem;
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
