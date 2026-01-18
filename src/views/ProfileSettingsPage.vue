<template>
  <div class="profile-settings-page">
    <div class="container">
      <header class="page-header">
        <button type="button" class="back-btn glass-button" @click="goBack">
          <ArrowLeft :size="20" />
        </button>
        <h1>{{ $t('profile.settings') }}</h1>
      </header>

      <StateIndicator v-if="error" variant="error" :description="error" @action="fetchProfile" />

      <template v-else-if="isLoading">
        <div class="settings-skeleton">
          <div class="settings-section glass-card">
            <div class="skeleton-header">
              <div class="skeleton" style="height: 20px; width: 100px" />
            </div>
            <div class="skeleton-avatar-section">
              <div class="skeleton skeleton-avatar" />
              <div class="skeleton" style="height: 40px; width: 140px; border-radius: 8px" />
            </div>
          </div>
          <div class="settings-section glass-card">
            <div class="skeleton-header">
              <div class="skeleton" style="height: 20px; width: 120px" />
            </div>
            <div class="skeleton-form">
              <div class="skeleton" style="height: 48px; width: 100%; border-radius: 12px" />
              <div class="skeleton" style="height: 48px; width: 100%; border-radius: 12px" />
              <div class="skeleton" style="height: 100px; width: 100%; border-radius: 12px" />
            </div>
          </div>
        </div>
      </template>

      <template v-else-if="profile">
        <form class="settings-form" @submit.prevent="saveProfile">
          <!-- Avatar Section -->
          <section class="settings-section glass-card">
            <div class="section-header">
              <div class="section-icon">
                <User :size="18" />
              </div>
              <h2 class="section-title">{{ $t('profile.avatar') }}</h2>
            </div>
            <div class="avatar-section">
              <div class="avatar-wrapper">
                <img
                  v-if="profile.avatar_url"
                  class="avatar-preview"
                  :src="normalizeAvatarUrl(profile.avatar_url) || profile.avatar_url"
                  :alt="profile.username"
                />
                <div v-else class="avatar-preview avatar-placeholder">
                  <User :size="40" />
                </div>
                <div class="avatar-badge">
                  <Camera :size="14" />
                </div>
              </div>
              <div class="avatar-info">
                <p class="avatar-hint">
                  {{ $t('profile.avatarHint', '支持 JPG、PNG 格式，建议尺寸 200×200') }}
                </p>
                <label class="glass-button avatar-upload-btn">
                  <Upload :size="16" />
                  {{ $t('profile.uploadAvatar') }}
                  <input
                    type="file"
                    accept="image/*"
                    class="sr-only"
                    @change="handleAvatarSelect"
                  />
                </label>
              </div>
            </div>
          </section>

          <!-- Basic Info Section -->
          <section class="settings-section glass-card">
            <div class="section-header">
              <div class="section-icon">
                <FileText :size="18" />
              </div>
              <h2 class="section-title">{{ $t('profile.basicInfo') }}</h2>
            </div>

            <!-- Username (readonly) -->
            <div class="form-group">
              <label for="username">
                <AtSign :size="14" />
                {{ $t('profile.username') }}
              </label>
              <div class="input-wrapper input-readonly">
                <input
                  id="username"
                  :value="profile.username"
                  type="text"
                  class="glass-input"
                  disabled
                  readonly
                />
                <Lock :size="16" class="input-icon-right" />
              </div>
              <p class="field-hint">{{ $t('profile.usernameReadonly', '用户名不可修改') }}</p>
            </div>

            <!-- Display Name -->
            <div class="form-group">
              <label for="full_name">
                <User :size="14" />
                {{ $t('profile.fullName') }}
              </label>
              <div class="input-wrapper">
                <input
                  id="full_name"
                  v-model="form.full_name"
                  type="text"
                  class="glass-input"
                  maxlength="255"
                  :placeholder="$t('profile.fullNamePlaceholder')"
                />
              </div>
              <p class="field-hint">{{ $t('profile.displayNameHint', '这是您的公开显示名称') }}</p>
            </div>

            <!-- Bio -->
            <div class="form-group">
              <label for="bio">
                <FileText :size="14" />
                {{ $t('profile.bio') }}
              </label>
              <div class="input-wrapper">
                <textarea
                  id="bio"
                  v-model="form.bio"
                  class="glass-input bio-textarea"
                  maxlength="500"
                  rows="4"
                  :placeholder="$t('profile.bioPlaceholder')"
                />
              </div>
              <div class="field-hint-row">
                <p class="field-hint">{{ $t('profile.bioHint', '介绍一下自己吧') }}</p>
                <span
                  class="char-count"
                  :class="{ 'char-count--warning': (form.bio?.length || 0) > 450 }"
                >
                  {{ form.bio?.length || 0 }}/500
                </span>
              </div>
            </div>

            <div class="form-actions">
              <Button type="submit" :disabled="isSaving">
                <span v-if="isSaving" class="spinner spinner-sm" />
                <Save v-else :size="16" />
                {{ $t('common.save') }}
              </Button>
            </div>
          </section>
        </form>

        <!-- Password Section -->
        <section class="settings-section glass-card password-section">
          <div class="section-header">
            <div class="section-icon section-icon--warning">
              <Shield :size="18" />
            </div>
            <h2 class="section-title">{{ $t('profile.changePassword') }}</h2>
          </div>
          <form @submit.prevent="changePassword">
            <!-- Hidden username for password managers -->
            <input
              type="text"
              :value="profile?.username"
              autocomplete="username"
              class="sr-only"
              tabindex="-1"
              aria-hidden="true"
              readonly
            />

            <div class="form-group">
              <label for="current_password">
                <Key :size="14" />
                {{ $t('profile.currentPassword') }}
              </label>
              <div class="input-wrapper">
                <input
                  id="current_password"
                  v-model="passwordForm.current_password"
                  :type="showCurrentPassword ? 'text' : 'password'"
                  class="glass-input"
                  autocomplete="current-password"
                  required
                />
                <button
                  type="button"
                  class="password-toggle"
                  @click="showCurrentPassword = !showCurrentPassword"
                >
                  <EyeOff v-if="showCurrentPassword" :size="16" />
                  <Eye v-else :size="16" />
                </button>
              </div>
            </div>

            <div class="form-group">
              <label for="new_password">
                <Lock :size="14" />
                {{ $t('profile.newPassword') }}
              </label>
              <div class="input-wrapper">
                <input
                  id="new_password"
                  v-model="passwordForm.new_password"
                  :type="showNewPassword ? 'text' : 'password'"
                  class="glass-input"
                  autocomplete="new-password"
                  minlength="8"
                  required
                />
                <button
                  type="button"
                  class="password-toggle"
                  @click="showNewPassword = !showNewPassword"
                >
                  <EyeOff v-if="showNewPassword" :size="16" />
                  <Eye v-else :size="16" />
                </button>
              </div>
              <!-- Password Strength Indicator -->
              <div v-if="passwordForm.new_password" class="password-strength">
                <div class="strength-bar">
                  <div
                    class="strength-fill"
                    :class="passwordStrengthClass"
                    :style="{ width: `${passwordStrength * 25}%` }"
                  />
                </div>
                <span class="strength-text" :class="passwordStrengthClass">
                  {{ passwordStrengthText }}
                </span>
              </div>
            </div>

            <div class="form-group">
              <label for="confirm_password">
                <CheckCircle :size="14" />
                {{ $t('profile.confirmPassword') }}
              </label>
              <div class="input-wrapper">
                <input
                  id="confirm_password"
                  v-model="passwordForm.confirm_password"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  class="glass-input"
                  :class="{ 'input-error': passwordForm.confirm_password && !passwordsMatch }"
                  autocomplete="new-password"
                  required
                />
                <button
                  type="button"
                  class="password-toggle"
                  @click="showConfirmPassword = !showConfirmPassword"
                >
                  <EyeOff v-if="showConfirmPassword" :size="16" />
                  <Eye v-else :size="16" />
                </button>
              </div>
              <p v-if="passwordForm.confirm_password && !passwordsMatch" class="field-error">
                {{ $t('profile.passwordMismatch') }}
              </p>
            </div>

            <div class="form-actions">
              <Button
                type="submit"
                variant="secondary"
                :disabled="isChangingPassword || !canChangePassword"
              >
                <span v-if="isChangingPassword" class="spinner spinner-sm" />
                <Shield v-else :size="16" />
                {{ $t('profile.changePassword') }}
              </Button>
            </div>
          </form>
        </section>
      </template>
    </div>

    <Teleport to="body">
      <ImageCropper
        v-if="showCropper"
        :image-src="cropImageSrc"
        @crop="handleCroppedImage"
        @cancel="closeCropper"
      />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  ArrowLeft,
  User,
  Camera,
  Upload,
  FileText,
  AtSign,
  Lock,
  Key,
  Eye,
  EyeOff,
  Shield,
  Save,
  CheckCircle,
} from 'lucide-vue-next'
import { userService, normalizeAvatarUrl, type UserProfile, ApiError } from '@/api'
import { useAuthStore, useToastStore } from '@/stores'
import { refreshAvatarCache } from '@/composables/useUserAvatar'
import { checkPasswordStrength } from '@/utils/crypto'
import Button from '@/components/ui/Button.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import { defineAsyncComponent } from 'vue'

// 动态导入大型组件以减少初始包体积
const ImageCropper = defineAsyncComponent(() => import('@/components/ui/ImageCropper.vue'))

const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const toastStore = useToastStore()

const profile = ref<UserProfile | null>(null)
const isLoading = ref(false)
const isSaving = ref(false)
const isChangingPassword = ref(false)
const error = ref<string | null>(null)

const showCropper = ref(false)
const cropImageSrc = ref('')

// Password visibility toggles
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

const form = ref({
  username: '',
  full_name: '',
  bio: '',
})

const passwordForm = ref({
  current_password: '',
  new_password: '',
  confirm_password: '',
})

// Password strength calculation - 使用 crypto 模块
const passwordStrengthResult = computed(() => {
  return checkPasswordStrength(passwordForm.value.new_password)
})

const passwordStrength = computed(() => {
  // 映射到 0-4 范围以兼容现有 UI
  const { level } = passwordStrengthResult.value
  if (level === 'weak') return 1
  if (level === 'fair') return 2
  if (level === 'good') return 3
  return 4
})

const passwordStrengthClass = computed(() => {
  const { level } = passwordStrengthResult.value
  return `strength-${level}`
})

const passwordStrengthText = computed(() => {
  const { level } = passwordStrengthResult.value
  const textMap = {
    weak: t('profile.passwordWeak', '弱'),
    fair: t('profile.passwordFair', '一般'),
    good: t('profile.passwordGood', '良好'),
    strong: t('profile.passwordStrong', '强'),
  }
  return textMap[level]
})

const passwordsMatch = computed(() => {
  return passwordForm.value.new_password === passwordForm.value.confirm_password
})

const canChangePassword = computed(() => {
  return (
    passwordForm.value.current_password &&
    passwordForm.value.new_password.length >= 8 &&
    passwordsMatch.value
  )
})

function goBack() {
  router.back()
}

async function fetchProfile() {
  isLoading.value = true
  error.value = null

  try {
    const data = await userService.getProfile()
    profile.value = data
    form.value = {
      username: data.username,
      full_name: data.full_name || '',
      bio: data.bio || '',
    }
  } catch (err) {
    if (err instanceof ApiError) {
      error.value = err.message
    } else {
      error.value = t('common.error')
    }
  } finally {
    isLoading.value = false
  }
}

async function saveProfile() {
  if (isSaving.value) return

  const validation = userService.validateUsername(form.value.username)
  if (!validation.valid) {
    toastStore.error(t(validation.error!))
    return
  }

  isSaving.value = true

  try {
    const updated = await userService.updateProfile({
      username: form.value.username !== profile.value?.username ? form.value.username : undefined,
      full_name: form.value.full_name || undefined,
      bio: form.value.bio || undefined,
    })
    profile.value = updated
    toastStore.success(t('profile.updateSuccess'))
  } catch (err) {
    if (err instanceof ApiError) {
      toastStore.error(err.message)
    } else {
      toastStore.error(t('common.error'))
    }
  } finally {
    isSaving.value = false
  }
}

async function changePassword() {
  if (isChangingPassword.value) return

  if (passwordForm.value.new_password !== passwordForm.value.confirm_password) {
    toastStore.error(t('profile.passwordMismatch'))
    return
  }

  if (passwordForm.value.new_password.length < 8) {
    toastStore.error(t('profile.passwordTooShort'))
    return
  }

  isChangingPassword.value = true

  try {
    await userService.changePassword({
      current_password: passwordForm.value.current_password,
      new_password: passwordForm.value.new_password,
    })
    toastStore.success(t('profile.passwordChanged'))
    passwordForm.value = {
      current_password: '',
      new_password: '',
      confirm_password: '',
    }
  } catch (err) {
    if (err instanceof ApiError) {
      toastStore.error(err.message)
    } else {
      toastStore.error(t('common.error'))
    }
  } finally {
    isChangingPassword.value = false
  }
}

// 头像上传限制
const AVATAR_LIMITS = {
  MAX_FILE_SIZE_MB: 5,
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
}

function handleAvatarSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  // 验证文件类型
  if (!AVATAR_LIMITS.ALLOWED_TYPES.includes(file.type)) {
    toastStore.error(t('profile.avatarTypeError', '仅支持 JPG、PNG、GIF、WebP 格式'))
    input.value = ''
    return
  }

  // 验证文件大小
  const sizeMB = file.size / (1024 * 1024)
  if (sizeMB > AVATAR_LIMITS.MAX_FILE_SIZE_MB) {
    toastStore.error(
      t('profile.avatarSizeError', `文件大小不能超过 ${AVATAR_LIMITS.MAX_FILE_SIZE_MB}MB`)
    )
    input.value = ''
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    cropImageSrc.value = e.target?.result as string
    showCropper.value = true
  }
  reader.readAsDataURL(file)
  input.value = ''
}

function closeCropper() {
  showCropper.value = false
  cropImageSrc.value = ''
}

async function handleCroppedImage(blob: Blob) {
  showCropper.value = false

  const file = new File([blob], 'avatar.png', { type: 'image/png' })

  try {
    const result = await userService.uploadAvatar(file)
    // 文件名包含时间戳，本身就是唯一的，无需额外添加参数破坏缓存
    const cleanUrl = result.url

    if (profile.value) {
      profile.value.avatar_url = cleanUrl
    }
    if (authStore.user) {
      authStore.user.avatar_url = cleanUrl
    }
    // 刷新全局头像缓存，确保导航栏等组件立即更新
    refreshAvatarCache()
    // 同步更新 auth store 中的用户数据
    await authStore.fetchCurrentUser()
    toastStore.success(t('profile.avatarUpdated'))
  } catch (err) {
    if (err instanceof ApiError) {
      toastStore.error(err.message)
    } else {
      toastStore.error(t('common.error'))
    }
  }
}

onMounted(() => {
  fetchProfile()
})
</script>

<style scoped>
.profile-settings-page {
  min-height: 100vh;
  padding: var(--spacing-6) 0;
}

.page-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-6);
}

.page-header h1 {
  margin: 0;
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
}

/* Skeleton Loading */
.settings-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
  max-width: 640px;
}

.skeleton-header {
  margin-bottom: var(--spacing-4);
}

.skeleton-avatar-section {
  display: flex;
  align-items: center;
  gap: var(--spacing-6);
}

.skeleton-avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
}

.skeleton-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

/* Settings Section */
.settings-section {
  padding: var(--spacing-6);
  margin-bottom: var(--spacing-6);
  position: relative;
  z-index: 1;
}

.section-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-5);
  padding-bottom: var(--spacing-4);
  border-bottom: 1px solid var(--glass-border);
}

.section-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: rgba(var(--color-primary-rgb), 0.1);
  color: var(--color-primary);
  border-radius: var(--radius-lg);
}

.section-icon--warning {
  background: rgba(var(--color-warning-rgb, 245, 158, 11), 0.1);
  color: var(--color-warning, #f59e0b);
}

.section-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin: 0;
}

/* Avatar Section */
.avatar-section {
  display: flex;
  align-items: center;
  gap: var(--spacing-6);
}

.avatar-wrapper {
  position: relative;
  flex-shrink: 0;
}

.avatar-preview {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--glass-border);
  transition: border-color var(--transition-fast);
}

.avatar-wrapper:hover .avatar-preview {
  border-color: var(--color-primary);
}

.avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface);
  color: var(--color-text-secondary);
}

.avatar-badge {
  position: absolute;
  bottom: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: var(--color-primary);
  color: white;
  border-radius: 50%;
  border: 2px solid var(--color-bg);
}

.avatar-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.avatar-hint {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: 0;
}

.avatar-upload-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  cursor: pointer;
}

/* Form Styles */
.settings-form {
  max-width: 640px;
}

.password-section {
  max-width: 640px;
}

.form-group {
  margin-bottom: var(--spacing-5);
}

.form-group label {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-weight: var(--font-medium);
  margin-bottom: var(--spacing-2);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.input-wrapper {
  position: relative;
}

.input-wrapper .glass-input {
  width: 100%;
  padding-right: var(--spacing-10);
}

.input-readonly .glass-input {
  opacity: 0.7;
  cursor: not-allowed;
  background: var(--glass-bg-subtle);
}

.input-icon-right {
  position: absolute;
  right: var(--spacing-3);
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-tertiary);
}

.input-error {
  border-color: var(--color-error) !important;
}

.bio-textarea {
  resize: vertical;
  min-height: 100px;
  padding-right: var(--spacing-4) !important;
}

.field-hint {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  margin: var(--spacing-2) 0 0;
}

.field-hint-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--spacing-2);
}

.field-error {
  font-size: var(--text-sm);
  color: var(--color-error);
  margin: var(--spacing-2) 0 0;
}

.char-count {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  font-variant-numeric: tabular-nums;
}

.char-count--warning {
  color: var(--color-warning, #f59e0b);
}

/* Password Toggle */
.password-toggle {
  position: absolute;
  right: var(--spacing-3);
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.password-toggle:hover {
  color: var(--color-text-primary);
  background: var(--glass-bg-light);
}

/* Password Strength */
.password-strength {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-top: var(--spacing-2);
}

.strength-bar {
  flex: 1;
  height: 4px;
  background: var(--glass-bg-light);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: all var(--transition-base);
}

.strength-fill.strength-weak {
  background: var(--color-error);
}

.strength-fill.strength-fair {
  background: var(--color-warning, #f59e0b);
}

.strength-fill.strength-good {
  background: var(--color-info, #3b82f6);
}

.strength-fill.strength-strong {
  background: var(--color-success);
}

.strength-text {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.strength-text.strength-weak {
  color: var(--color-error);
}

.strength-text.strength-fair {
  color: var(--color-warning, #f59e0b);
}

.strength-text.strength-good {
  color: var(--color-info, #3b82f6);
}

.strength-text.strength-strong {
  color: var(--color-success);
}

/* Form Actions */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-3);
  margin-top: var(--spacing-6);
  padding-top: var(--spacing-4);
  border-top: 1px solid var(--glass-border);
}

/* Desktop */
@media (min-width: 1025px) {
  .profile-settings-page .container {
    max-width: 800px;
    margin: 0 auto;
  }
}

/* Tablet */
@media (max-width: 1024px) {
  .settings-form,
  .password-section {
    max-width: 100%;
  }
}

/* Mobile */
@media (max-width: 768px) {
  .profile-settings-page {
    padding: var(--spacing-4) 0;
  }

  .page-header {
    gap: var(--spacing-3);
    margin-bottom: var(--spacing-4);
  }

  .page-header h1 {
    font-size: var(--text-xl);
  }

  .settings-section {
    padding: var(--spacing-4);
    margin-bottom: var(--spacing-4);
    border-radius: var(--radius-lg);
  }

  .section-header {
    margin-bottom: var(--spacing-4);
    padding-bottom: var(--spacing-3);
  }

  .section-icon {
    width: 32px;
    height: 32px;
  }

  .section-title {
    font-size: var(--text-base);
  }

  .avatar-section {
    flex-direction: column;
    text-align: center;
    gap: var(--spacing-4);
  }

  .avatar-preview {
    width: 100px;
    height: 100px;
  }

  .avatar-info {
    width: 100%;
    align-items: center;
  }

  .avatar-upload-btn {
    width: 100%;
    justify-content: center;
    padding: var(--spacing-3) var(--spacing-4);
  }

  .form-group {
    margin-bottom: var(--spacing-4);
  }

  .form-group label {
    font-size: var(--text-sm);
  }

  .form-group .glass-input {
    min-height: 48px;
    font-size: 16px; /* Prevent iOS zoom */
  }

  .bio-textarea {
    min-height: 120px;
  }

  .form-actions {
    flex-direction: column;
    margin-top: var(--spacing-4);
    padding-top: var(--spacing-3);
  }

  .form-actions :deep(button) {
    width: 100%;
    min-height: 48px;
  }
}

/* Small Mobile */
@media (max-width: 480px) {
  .profile-settings-page {
    padding: var(--spacing-3) 0;
  }

  .page-header h1 {
    font-size: var(--text-lg);
  }

  .settings-section {
    padding: var(--spacing-3);
    border-radius: var(--radius-md);
  }

  .avatar-preview {
    width: 80px;
    height: 80px;
  }

  .avatar-badge {
    width: 24px;
    height: 24px;
  }
}
</style>
