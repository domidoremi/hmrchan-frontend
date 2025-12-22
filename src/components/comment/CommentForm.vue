<template>
  <form class="comment-form" @submit.prevent="handleSubmit">
    <div v-if="!isAuthenticated" class="login-prompt glass-card">
      <LogIn :size="24" class="prompt-icon" />
      <p>{{ $t('comment.loginRequired') }}</p>
      <Button size="sm" @click="goToLogin">{{ $t('nav.login') }}</Button>
    </div>

    <div v-else class="form-content">
      <div class="user-avatar">
        <img :src="userAvatar" :alt="user?.username" />
      </div>
      <div class="form-input-wrapper">
        <textarea
          ref="textareaRef"
          v-model="content"
          class="glass-input comment-textarea"
          :placeholder="placeholder"
          :disabled="isSubmitting"
          rows="3"
          :maxlength="maxLength"
          @input="autoResize"
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
import { ref, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { LogIn } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useAuthStore, useCommentsStore, useToastStore } from '@/stores'
import { validateComment } from '@/utils/security'
import { normalizeAvatarUrl } from '@/api/userService'
import Button from '@/components/ui/Button.vue'

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
const textareaRef = ref<HTMLTextAreaElement>()
const maxLength = 2000

const userAvatar = computed(() => {
  const url = normalizeAvatarUrl(user.value?.avatar_url)
  if (url) return url
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.value?.username || 'default'}`
})

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
    if (textareaRef.value) {
      textareaRef.value.style.height = 'auto'
      textareaRef.value.style.height = `${textareaRef.value.scrollHeight}px`
    }
  })
}

function goToLogin() {
  router.push('/login')
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
  textareaRef.value?.focus()
}

defineExpose({ focus })
</script>

<style scoped>
.comment-form {
  margin-bottom: var(--spacing-4);
}

.login-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-6);
  text-align: center;
}

.prompt-icon {
  color: var(--color-text-tertiary);
}

.form-content {
  display: flex;
  gap: var(--spacing-3);
}

.user-avatar img {
  width: 40px;
  height: 40px;
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
</style>
