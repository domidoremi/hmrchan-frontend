<template>
  <MainLayout>
    <div class="contact-page">
      <div class="contact-header glass-card">
        <button class="back-button glass-button" @click="goBack">
          <ArrowLeft :size="20" />
          {{ $t('common.back') }}
        </button>

        <h1>{{ $t('contact.title') }}</h1>
        <p class="subtitle">
          {{ $t('contact.subtitle') }}
        </p>
      </div>

      <div class="contact-content glass-card">
        <section class="contact-section">
          <h2>{{ $t('contact.githubTitle') }}</h2>
          <p>
            {{ $t('contact.githubDesc') }}
          </p>
          <a href="https://github.com/domidoremi/hmrchan-frontend/issues" class="contact-link" target="_blank"
            rel="noopener noreferrer">
            {{ $t('contact.githubLink') }}
          </a>
        </section>

        <section class="contact-section">
          <h2>{{ $t('contact.emailTitle') }}</h2>
          <p>
            {{ $t('contact.emailDesc') }}
          </p>
        </section>
      </div>

      <div class="contact-form-card glass-card">
        <section class="contact-section contact-form-section">
          <h2>{{ $t('contact.formTitle', '站内联系表单') }}</h2>
          <p class="contact-form-hint">
            {{ $t('contact.formHint', '您可以通过此表单直接向开发者发送反馈, 请勿包含敏感信息。') }}
          </p>
          <form class="contact-form" @submit.prevent="handleSubmit">
            <div class="form-row">
              <label class="form-label">{{ $t('contact.typeLabel', '反馈类型') }}</label>
              <div class="form-options">
                <label class="option-pill" :class="{ active: form.type === 'bug' }">
                  <input v-model="form.type" type="radio" value="bug">
                  <span>{{ $t('contact.typeBug', 'Bug 反馈') }}</span>
                </label>
                <label class="option-pill" :class="{ active: form.type === 'feature' }">
                  <input v-model="form.type" type="radio" value="feature">
                  <span>{{ $t('contact.typeFeature', '功能建议') }}</span>
                </label>
                <label class="option-pill" :class="{ active: form.type === 'other' }">
                  <input v-model="form.type" type="radio" value="other">
                  <span>{{ $t('contact.typeOther', '其他') }}</span>
                </label>
              </div>
            </div>

            <div class="form-row">
              <label class="form-label">{{ $t('contact.authStatus', '登录状态') }}</label>
              <div class="form-options">
                <label class="option-pill" :class="{ active: form.authStatus === 'auto' }">
                  <input v-model="form.authStatus" type="radio" value="auto">
                  <span>{{ isAuthenticated ? $t('contact.authLoggedIn', '已登录') :
                    $t('contact.authGuest', '未登录或游客') }}</span>
                </label>
                <label class="option-pill" :class="{ active: form.authStatus === 'guest' }">
                  <input v-model="form.authStatus" type="radio" value="guest">
                  <span>{{ $t('contact.authForceGuest', '以访客身份提交') }}</span>
                </label>
              </div>
            </div>

            <div class="form-row">
              <label class="form-label">{{ $t('contact.emailLabel', '联系邮箱 (可选)') }}</label>
              <GlassInput v-model="form.email" type="email" :placeholder="resolvedEmailPlaceholder"
                autocomplete="email" />
            </div>

            <div class="form-row">
              <label class="form-label">{{ $t('contact.messageLabel', '反馈内容') }}</label>
              <textarea v-model="form.message" class="contact-textarea" :maxlength="MAX_MESSAGE_LENGTH"
                rows="5"></textarea>
              <div class="field-hint">
                {{ form.message.length }} / {{ MAX_MESSAGE_LENGTH }}
              </div>
            </div>

            <div class="form-row">
              <label class="form-label">{{ $t('contact.attachmentsLabel', '附件 (可选)') }}</label>
              <input class="file-input" type="file" :accept="ACCEPTED_FILE_TYPES" @change="handleFileChange">
              <div class="field-hint">
                {{
                  $t(
                    'contact.attachmentsHint',
                    '最多 1 个图片文件, 不超过 5MB, 仅支持 PNG / JPEG / WEBP / GIF。',
                  )
                }}
              </div>
              <ul v-if="selectedFiles.length" class="file-list">
                <li v-for="file in selectedFiles" :key="file.name" class="file-item">
                  <span class="file-name">{{ file.name }}</span>
                  <span class="file-size">{{ formatFileSize(file.size) }}</span>
                </li>
              </ul>
            </div>

            <div class="form-actions">
              <GlassButton :disabled="isSubmitting" type="submit">
                <span v-if="!isSubmitting">{{ $t('common.submit', '提交') }}</span>
                <span v-else>{{ $t('common.sending', '正在发送') }}</span>
              </GlassButton>
            </div>
          </form>
        </section>
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import MainLayout from '@/components/layout/MainLayout.vue'
import GlassInput from '@/components/ui/input/Input.vue'
import GlassButton from '@/components/ui/button/Button.vue'
import { useAuthStore, useToastStore } from '@/stores'
import apiClient from '@/api/client'

const MAX_MESSAGE_LENGTH = 2000
const MAX_FILE_SIZE = 5 * 1024 * 1024
const MAX_FILE_COUNT = 1
const ACCEPTED_FILE_TYPES = '.png,.jpg,.jpeg,.webp,.gif'
const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]
const FINGERPRINT_STORAGE_KEY = 'hmrchan_feedback_fingerprint'

const getOrCreateFingerprint = (): string | null => {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    const existing = window.localStorage.getItem(FINGERPRINT_STORAGE_KEY)
    if (existing) {
      return existing
    }
    let value = ''
    if (window.crypto && 'randomUUID' in window.crypto) {
      value = window.crypto.randomUUID()
    } else {
      value = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    }
    window.localStorage.setItem(FINGERPRINT_STORAGE_KEY, value)
    return value
  } catch {
    return null
  }
}

const router = useRouter()
const authStore = useAuthStore()
const toastStore = useToastStore()

const isAuthenticated = computed(() => authStore.isAuthenticated)
const currentUserEmail = computed(() => (authStore.user && authStore.user.email) ? authStore.user.email : '')
const resolvedEmailPlaceholder = computed(() => currentUserEmail.value || 'your@email')

const form = ref({
  type: 'bug',
  authStatus: 'auto',
  email: '',
  message: '',
})

const selectedFiles = ref<File[]>([])
const isSubmitting = ref(false)

const goBack = () => {
  router.back()
}

const formatFileSize = (size: number) => {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }
  if (size >= 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }
  return `${size} B`
}

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (!files) {
    selectedFiles.value = []
    return
  }

  const validFiles: File[] = []
  for (const file of Array.from(files)) {
    if (validFiles.length >= MAX_FILE_COUNT) {
      break
    }
    if (file.size > MAX_FILE_SIZE) {
      toastStore.error('单个附件大小不能超过 5MB')
      continue
    }
    if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
      toastStore.error('不支持的文件类型')
      continue
    }
    validFiles.push(file)
  }

  selectedFiles.value = validFiles
}

const resolveCategory = (type: string): string => {
  if (type === 'bug' || type === 'feature' || type === 'other') {
    return type
  }
  return 'general'
}

const validateForm = () => {
  if (!form.value.message.trim()) {
    toastStore.error('请填写反馈内容')
    return false
  }
  if (form.value.message.length > MAX_MESSAGE_LENGTH) {
    toastStore.error('反馈内容过长')
    return false
  }
  return true
}

const handleSubmit = async () => {
  if (isSubmitting.value) {
    return
  }
  if (!validateForm()) {
    return
  }

  isSubmitting.value = true
  try {
    const fingerprint = getOrCreateFingerprint()
    const formData = new FormData()

    formData.append('message', form.value.message.trim())

    const contact = form.value.email.trim()
    if (contact) {
      formData.append('contact', contact)
    }

    const category = resolveCategory(form.value.type)
    if (category) {
      formData.append('category', category)
    }

    if (fingerprint) {
      formData.append('fingerprint', fingerprint)
    }

    if (selectedFiles.value.length > 0) {
      const attachment = selectedFiles.value[0]
      if (attachment) {
        formData.append('attachment', attachment, attachment.name)
      }
    }

    const headers: Record<string, string> = {}
    if (fingerprint) {
      headers['X-Client-Fingerprint'] = fingerprint
    }

    await apiClient.post('feedback', {
      body: formData,
      headers,
    }).json<unknown>()

    toastStore.success('反馈已提交, 感谢你的反馈!')
    form.value.message = ''
    form.value.email = ''
    selectedFiles.value = []
  } catch (err) {
    const httpError = err as {
      response?: { status?: number }
      responseData?: { message?: string; error_code?: string }
      message?: string
    }
    const status = httpError.response?.status
    const data = httpError.responseData || {}
    const backendMessage = (data as { message?: string }).message

    if (status === 400) {
      toastStore.error(backendMessage || '提交内容不符合要求, 请检查后重试')
    } else if (status === 429) {
      toastStore.error('提交过于频繁, 请稍后再试')
    } else if (status && status >= 500) {
      toastStore.error('服务器暂时不可用, 请稍后再试')
    } else {
      toastStore.error(httpError.message || '提交失败, 请稍后重试')
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.contact-page {
  max-width: 900px;
  margin: 0 auto;
  padding: var(--spacing-xl);
}

.contact-header {
  padding: var(--spacing-xl);
  margin-bottom: var(--spacing-lg);
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-md);
  padding: 0.5rem 1rem;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--text-primary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
}

.back-button:hover {
  background: rgba(255, 255, 255, 0.1);
}

.contact-header h1 {
  font-size: var(--text-3xl);
  font-weight: 700;
  margin-bottom: var(--spacing-sm);
  color: var(--text-primary);
}

.subtitle {
  font-size: var(--text-md);
  color: var(--text-secondary);
}

.contact-content {
  padding: var(--spacing-xl);
}

.contact-form-card {
  margin-top: var(--spacing-lg);
  padding: var(--spacing-xl);
}

.contact-section {
  margin-bottom: var(--spacing-2xl);
}

.contact-section:last-of-type {
  margin-bottom: var(--spacing-xl);
}

.contact-section h2 {
  font-size: var(--text-2xl);
  font-weight: 600;
  margin-bottom: var(--spacing-md);
  color: var(--text-primary);
}

.contact-section p {
  font-size: var(--text-md);
  color: var(--text-secondary);
  line-height: 1.8;
  margin-bottom: var(--spacing-md);
}

.contact-link {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
  background: var(--primary-color);
  color: white;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s;
}

.contact-link:hover {
  background: var(--primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

.contact-form-section {
  padding-top: 0;
}

.contact-form-hint {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-lg);
}

.contact-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.form-label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-primary);
}

.form-options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.option-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  padding: 0.4rem 0.75rem;
  border-radius: 999px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  cursor: pointer;
  font-size: var(--text-sm);
  position: relative;
}

.option-pill input {
  position: absolute;
  inset: 0;
  opacity: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  cursor: pointer;
}

.option-pill.active {
  background: rgba(139, 92, 246, 0.16);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.option-pill.active span {
  font-weight: 600;
}

.contact-textarea {
  width: 100%;
  min-height: 140px;
  border-radius: var(--radius-md);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  padding: 0.75rem 1rem;
  color: var(--text-primary);
  resize: vertical;
}

.contact-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 1px var(--primary-color);
}

.field-hint {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.file-input {
  font-size: var(--text-sm);
}

.file-list {
  margin: var(--spacing-xs) 0 0;
  padding: 0;
  list-style: none;
}

.file-item {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.contact-page .glass-card:active {
  transform: none;
}

@media (max-width: 768px) {
  .contact-page {
    padding: var(--spacing-md);
  }

  .contact-header,
  .contact-content {
    padding: var(--spacing-md);
  }

  .contact-header h1 {
    font-size: var(--text-2xl);
  }

  .contact-section h2 {
    font-size: var(--text-xl);
  }
}
</style>
