<template>
  <div class="profile-page">
    <div class="container">
      <ProfileSubPageHeader
        :title="$t('profile.settings')"
        :subtitle="$t('profile.settingsSubtitle')"
        :hint="$t('profile.settingsHint')"
      >
        <template #actions>
          <Button variant="ghost" size="sm" type="button" @click="fetchProfile">
            <AnimatedIcon name="loading" :fallback-icon="RefreshCw" size="sm" />
            {{ $t('common.refresh') }}
          </Button>
        </template>
      </ProfileSubPageHeader>

      <StateIndicator v-if="error" variant="error" :description="error" @action="fetchProfile" />

      <template v-else-if="isLoading">
        <div class="settings-skeleton">
          <div class="settings-section glass-card">
            <div class="skeleton-header">
              <Skeleton width="100px" height="20px" />
            </div>
            <div class="skeleton-avatar-section">
              <Skeleton variant="avatar" width="80px" height="80px" />
              <Skeleton width="140px" height="40px" />
            </div>
          </div>
          <div class="settings-section glass-card">
            <div class="skeleton-header">
              <Skeleton width="120px" height="20px" />
            </div>
            <div class="skeleton-form">
              <Skeleton width="100%" height="48px" />
              <Skeleton width="100%" height="48px" />
              <Skeleton width="100%" height="100px" />
            </div>
          </div>
        </div>
      </template>

      <template v-else-if="profile">
        <div class="settings-layout">
          <div class="settings-main">
            <form class="settings-form" @submit.prevent="saveProfile">
              <!-- Avatar Section -->
              <section id="avatar-section" class="settings-section glass-card">
                <div class="section-header">
                  <div class="section-icon">
                    <AnimatedIcon name="user" :fallback-icon="User" size="sm" />
                  </div>
                  <div>
                    <h2 class="section-title">{{ $t('profile.avatar') }}</h2>
                    <p class="section-desc">{{ $t('profile.avatarSectionHint') }}</p>
                  </div>
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
                      <AnimatedIcon name="user" :fallback-icon="User" size="xl" />
                    </div>
                    <div class="avatar-badge">
                      <AnimatedIcon name="sparkle" :fallback-icon="Camera" size="sm" />
                    </div>
                  </div>
                  <div class="avatar-info">
                    <p class="avatar-hint">
                      {{ $t('profile.avatarHint') }}
                    </p>
                    <label class="glass-button avatar-upload-btn">
                      <AnimatedIcon name="explore" :fallback-icon="Upload" size="sm" />
                      {{ $t('profile.uploadAvatar') }}
                      <input
                        type="file"
                        accept="image/*"
                        class="sr-only"
                        @change="handleAvatarSelect"
                      />
                    </label>
                    <div class="avatar-meta">
                      <span>{{ $t('profile.avatarMetaHint') }}</span>
                      <span class="meta-dot" />
                      <span>{{ $t('profile.avatarMetaPrivacy') }}</span>
                    </div>
                  </div>
                </div>
              </section>

              <!-- Basic Info Section -->
              <section id="basic-info" class="settings-section glass-card">
                <div class="section-header">
                  <div class="section-icon">
                    <AnimatedIcon name="explore" :fallback-icon="FileText" size="sm" />
                  </div>
                  <div>
                    <h2 class="section-title">{{ $t('profile.basicInfo') }}</h2>
                    <p class="section-desc">{{ $t('profile.basicInfoHint') }}</p>
                  </div>
                </div>

                <!-- Username (readonly) -->
                <div class="form-group">
                  <label for="username">
                    <AnimatedIcon name="explore" :fallback-icon="AtSign" size="sm" />
                    {{ $t('profile.username') }}
                  </label>
                  <div class="input-wrapper input-readonly">
                    <Input
                      id="username"
                      :model-value="profile.username"
                      type="text"
                      class="input-with-icon"
                      autocomplete="username"
                      disabled
                      readonly
                    />
                    <AnimatedIcon
                      name="sparkle"
                      :fallback-icon="Lock"
                      size="sm"
                      class="input-icon-right"
                    />
                  </div>
                  <p class="field-hint">{{ $t('profile.usernameReadonly') }}</p>
                </div>

                <!-- Display Name -->
                <div class="form-group">
                  <label for="full_name">
                    <AnimatedIcon name="user" :fallback-icon="User" size="sm" />
                    {{ $t('profile.fullName') }}
                  </label>
                  <div class="input-wrapper">
                    <Input
                      id="full_name"
                      v-model="form.full_name"
                      type="text"
                      class="input-with-icon"
                      maxlength="255"
                      :placeholder="$t('profile.fullNamePlaceholder')"
                      autocomplete="name"
                    />
                  </div>
                  <p class="field-hint">{{ $t('profile.displayNameHint') }}</p>
                </div>

                <!-- Bio -->
                <div class="form-group">
                  <label for="bio">
                    <AnimatedIcon name="explore" :fallback-icon="FileText" size="sm" />
                    {{ $t('profile.bio') }}
                  </label>
                  <div class="input-wrapper">
                    <Textarea
                      id="bio"
                      v-model="form.bio"
                      class="bio-textarea"
                      maxlength="500"
                      rows="4"
                      :placeholder="$t('profile.bioPlaceholder')"
                    />
                  </div>
                  <div class="field-hint-row">
                    <p class="field-hint">{{ $t('profile.bioHint') }}</p>
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
                    <AnimatedIcon v-else name="sparkle" :fallback-icon="Save" size="sm" />
                    {{ $t('common.save') }}
                  </Button>
                  <Button type="button" variant="ghost" :disabled="isSaving" @click="fetchProfile">
                    <AnimatedIcon name="loading" :fallback-icon="RefreshCw" size="sm" />
                    {{ $t('common.reset') }}
                  </Button>
                </div>
              </section>
            </form>

            <!-- Change Email Section -->
            <section id="email-section" class="settings-section glass-card email-section">
              <div class="section-header">
                <div class="section-icon">
                  <AnimatedIcon name="explore" :fallback-icon="Mail" size="sm" />
                </div>
                <div>
                  <h2 class="section-title">{{ $t('email.changeEmailTitle') }}</h2>
                  <p class="section-desc">{{ $t('email.changeEmailHint') }}</p>
                </div>
              </div>

              <div class="form-group">
                <label>
                  <AnimatedIcon name="explore" :fallback-icon="Mail" size="sm" />
                  {{ $t('email.currentEmail') }}
                </label>
                <div class="input-wrapper input-readonly">
                  <Input
                    :model-value="profile.email"
                    type="email"
                    class="input-with-icon"
                    autocomplete="email"
                    disabled
                    readonly
                  />
                  <AnimatedIcon
                    name="sparkle"
                    :fallback-icon="Lock"
                    size="sm"
                    class="input-icon-right"
                  />
                </div>
              </div>

              <form @submit.prevent="handleChangeEmail">
                <div class="form-group">
                  <label for="new_email">
                    <AnimatedIcon name="explore" :fallback-icon="Mail" size="sm" />
                    {{ $t('email.newEmail') }}
                  </label>
                  <div class="input-wrapper">
                    <Input
                      id="new_email"
                      v-model="emailForm.new_email"
                      type="email"
                      class="input-with-icon"
                      :placeholder="$t('email.newEmailPlaceholder')"
                      autocomplete="email"
                      required
                    />
                  </div>
                </div>

                <div class="form-group">
                  <label for="email_password">
                    <AnimatedIcon name="sparkle" :fallback-icon="Key" size="sm" />
                    {{ $t('email.confirmWithPassword') }}
                  </label>
                  <div class="input-wrapper">
                    <Input
                      id="email_password"
                      v-model="emailForm.password"
                      :type="showEmailPassword ? 'text' : 'password'"
                      class="input-with-icon"
                      autocomplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      class="password-toggle"
                      @click="showEmailPassword = !showEmailPassword"
                    >
                      <AnimatedIcon
                        v-if="showEmailPassword"
                        name="explore"
                        :fallback-icon="EyeOff"
                        size="sm"
                      />
                      <AnimatedIcon v-else name="explore" :fallback-icon="Eye" size="sm" />
                    </button>
                  </div>
                  <p class="field-hint">{{ $t('email.changeEmailVerifyHint') }}</p>
                </div>

                <div class="form-actions">
                  <Button
                    type="submit"
                    variant="secondary"
                    :disabled="isChangingEmail || !canChangeEmail"
                  >
                    <span v-if="isChangingEmail" class="spinner spinner-sm" />
                    <AnimatedIcon v-else name="explore" :fallback-icon="Mail" size="sm" />
                    {{ $t('email.changeEmailButton') }}
                  </Button>
                </div>
              </form>
            </section>

            <!-- Password Section -->
            <section id="password-section" class="settings-section glass-card password-section">
              <div class="section-header">
                <div class="section-icon section-icon--warning">
                  <AnimatedIcon name="sparkle" :fallback-icon="Shield" size="sm" />
                </div>
                <div>
                  <h2 class="section-title">{{ $t('profile.changePassword') }}</h2>
                  <p class="section-desc">{{ $t('profile.passwordHint') }}</p>
                </div>
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
                    <AnimatedIcon name="sparkle" :fallback-icon="Key" size="sm" />
                    {{ $t('profile.currentPassword') }}
                  </label>
                  <div class="input-wrapper">
                    <Input
                      id="current_password"
                      v-model="passwordForm.current_password"
                      :type="showCurrentPassword ? 'text' : 'password'"
                      class="input-with-icon"
                      autocomplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      class="password-toggle"
                      @click="showCurrentPassword = !showCurrentPassword"
                    >
                      <AnimatedIcon
                        v-if="showCurrentPassword"
                        name="explore"
                        :fallback-icon="EyeOff"
                        size="sm"
                      />
                      <AnimatedIcon v-else name="explore" :fallback-icon="Eye" size="sm" />
                    </button>
                  </div>
                </div>

                <div class="form-group">
                  <label for="new_password">
                    <AnimatedIcon name="sparkle" :fallback-icon="Lock" size="sm" />
                    {{ $t('profile.newPassword') }}
                  </label>
                  <div class="input-wrapper">
                    <Input
                      id="new_password"
                      v-model="passwordForm.new_password"
                      :type="showNewPassword ? 'text' : 'password'"
                      class="input-with-icon"
                      autocomplete="new-password"
                      minlength="8"
                      required
                    />
                    <button
                      type="button"
                      class="password-toggle"
                      @click="showNewPassword = !showNewPassword"
                    >
                      <AnimatedIcon
                        v-if="showNewPassword"
                        name="explore"
                        :fallback-icon="EyeOff"
                        size="sm"
                      />
                      <AnimatedIcon v-else name="explore" :fallback-icon="Eye" size="sm" />
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
                    <AnimatedIcon name="sparkle" :fallback-icon="CheckCircle" size="sm" />
                    {{ $t('profile.confirmPassword') }}
                  </label>
                  <div class="input-wrapper">
                    <Input
                      id="confirm_password"
                      v-model="passwordForm.confirm_password"
                      :type="showConfirmPassword ? 'text' : 'password'"
                      class="input-with-icon"
                      :error="Boolean(passwordForm.confirm_password && !passwordsMatch)"
                      autocomplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      class="password-toggle"
                      @click="showConfirmPassword = !showConfirmPassword"
                    >
                      <AnimatedIcon
                        v-if="showConfirmPassword"
                        name="explore"
                        :fallback-icon="EyeOff"
                        size="sm"
                      />
                      <AnimatedIcon v-else name="explore" :fallback-icon="Eye" size="sm" />
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
                    <AnimatedIcon v-else name="sparkle" :fallback-icon="Shield" size="sm" />
                    {{ $t('profile.changePassword') }}
                  </Button>
                </div>
              </form>
            </section>
          </div>

          <!-- Right Aside (Wide Screens) -->
          <aside class="settings-aside">
            <div class="settings-aside-card glass-card">
              <h3 class="aside-title">{{ $t('profile.settings') }}</h3>
              <nav class="aside-nav">
                <a class="aside-link" href="#avatar-section">{{ $t('profile.avatar') }}</a>
                <a class="aside-link" href="#basic-info">{{ $t('profile.basicInfo') }}</a>
                <a class="aside-link" href="#email-section">{{ $t('email.changeEmailTitle') }}</a>
                <a class="aside-link" href="#password-section">{{
                  $t('profile.changePassword')
                }}</a>
              </nav>
            </div>

            <div class="settings-aside-card glass-card">
              <h3 class="aside-title">{{ $t('profile.summary') }}</h3>
              <div class="aside-meta">
                <div class="meta-row">
                  <span class="meta-label">{{ $t('profile.username') }}</span>
                  <span class="meta-value">@{{ profile.username }}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">{{ $t('email.currentEmail') }}</span>
                  <span class="meta-value">{{ profile.email }}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
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

    <!-- Email Verify Dialog -->
    <EmailVerifyDialog
      :is-open="showEmailVerify"
      :action="emailVerifyAction"
      :email="profile?.email ?? ''"
      :target-email="emailVerifyTarget"
      @close="showEmailVerify = false"
      @verified="handleEmailVerified"
    />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ProfileSettingsPage' })

import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
// ... icons imports ...
import {
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
  RefreshCw,
  Mail,
} from 'lucide-vue-next'
import { userService, normalizeAvatarUrl, type UserProfile, ApiError, authService } from '@/api'
import { useAuthStore, useToastStore } from '@/stores'
import { refreshAvatarCache } from '@/composables/useUserAvatar'
import { checkPasswordStrength } from '@/utils/crypto'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Textarea from '@/components/ui/Textarea.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import { defineAsyncComponent } from 'vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import ProfileSubPageHeader from '@/components/profile/ProfileSubPageHeader.vue'

// 动态导入大型组件以减少初始包体积
const ImageCropper = defineAsyncComponent(() => import('@/components/ui/ImageCropper.vue'))
const EmailVerifyDialog = defineAsyncComponent(
  () => import('@/components/ui/EmailVerifyDialog.vue')
)

const { t } = useI18n()
const authStore = useAuthStore()
const toastStore = useToastStore()

const profile = ref<UserProfile | null>(null)
// ... refs ...
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
const showEmailPassword = ref(false)

// Change email
const isChangingEmail = ref(false)
const emailForm = ref({
  new_email: '',
  password: '',
})

const canChangeEmail = computed(() => {
  return (
    emailForm.value.new_email &&
    emailForm.value.new_email !== profile.value?.email &&
    emailForm.value.password
  )
})

// Email verification code dialog
const showEmailVerify = ref(false)
const emailVerifyAction = ref('')
// 'change_email' | 'change_password'
type PendingAction = 'change_email' | 'change_password'
const pendingAction = ref<PendingAction | null>(null)

const emailVerifyTarget = computed(() => {
  if (pendingAction.value === 'change_email') {
    return emailForm.value.new_email
  }
  return undefined
})

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

// ... password strength computed ...
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
    weak: t('profile.passwordWeak'),
    fair: t('profile.passwordFair'),
    good: t('profile.passwordGood'),
    strong: t('profile.passwordStrong'),
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

function changePassword() {
  if (isChangingPassword.value) return

  if (passwordForm.value.new_password !== passwordForm.value.confirm_password) {
    toastStore.error(t('profile.passwordMismatch'))
    return
  }

  if (passwordForm.value.new_password.length < 8) {
    toastStore.error(t('profile.passwordTooShort'))
    return
  }

  // Open email verification dialog
  pendingAction.value = 'change_password'
  emailVerifyAction.value = 'change_password'
  showEmailVerify.value = true
}

async function executeChangePassword(verificationToken: string) {
  isChangingPassword.value = true

  try {
    await userService.changePassword({
      current_password: passwordForm.value.current_password,
      new_password: passwordForm.value.new_password,
      verification_token: verificationToken,
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

function handleChangeEmail() {
  if (!canChangeEmail.value) return
  // Open email verification dialog
  pendingAction.value = 'change_email'
  emailVerifyAction.value = 'change_email'
  showEmailVerify.value = true
}

async function executeChangeEmail(verificationToken: string) {
  isChangingEmail.value = true

  try {
    await authService.changeEmail({
      new_email: emailForm.value.new_email,
      verification_token: verificationToken,
    })

    toastStore.success(t('email.changeEmailSuccess'))
    emailForm.value = { new_email: '', password: '' }
    await fetchProfile()
  } catch (err) {
    if (err instanceof ApiError) {
      toastStore.error(err.message)
    } else {
      toastStore.error(t('common.error'))
    }
  } finally {
    isChangingEmail.value = false
  }
}

/** Called when email OTP verification succeeds */
async function handleEmailVerified(verificationToken: string) {
  showEmailVerify.value = false

  if (pendingAction.value === 'change_email') {
    await executeChangeEmail(verificationToken)
  } else if (pendingAction.value === 'change_password') {
    await executeChangePassword(verificationToken)
  }
  pendingAction.value = null
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
    toastStore.error(t('profile.avatarTypeError'))
    input.value = ''
    return
  }

  // 验证文件大小
  const sizeMB = file.size / (1024 * 1024)
  if (sizeMB > AVATAR_LIMITS.MAX_FILE_SIZE_MB) {
    toastStore.error(t('profile.avatarSizeError', { max: AVATAR_LIMITS.MAX_FILE_SIZE_MB }))
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
.profile-page {
  min-height: 100svh;
  min-height: 100dvh;
  padding: var(--spacing-4) 0;
}

.settings-layout {
  display: grid;
  gap: var(--spacing-6);
}

.settings-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.settings-aside {
  display: none;
}

.settings-aside-card {
  padding: var(--spacing-4);
  border-radius: var(--radius-lg);
}

.aside-title {
  margin: 0 0 var(--spacing-3);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.aside-nav {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.aside-link {
  text-decoration: none;
  color: var(--color-text-secondary);
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.aside-link:hover {
  color: var(--color-text-primary);
  background: var(--glass-bg-subtle);
}

.aside-meta {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.meta-row {
  display: flex;
  justify-content: space-between;
  gap: var(--spacing-3);
  font-size: var(--text-sm);
}

.meta-label {
  color: var(--color-text-tertiary);
}

.meta-value {
  color: var(--color-text-primary);
  font-weight: var(--font-medium);
  text-align: right;
  max-width: 11.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Skeleton Loading */
.settings-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
  max-width: 60rem;
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
  max-width: 60rem;
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

.section-desc {
  margin: 0;
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
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
  color: var(--color-on-primary);
  border-radius: 50%;
  border: 2px solid var(--color-bg);
}

.avatar-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.avatar-meta {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.avatar-meta .meta-dot {
  width: 4px;
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--color-text-tertiary);
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
  max-width: 60rem;
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

.input-wrapper .input-with-icon {
  width: 100%;
  padding-right: var(--spacing-10);
}

.input-readonly .input-with-icon {
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

.bio-textarea {
  resize: vertical;
  min-height: 6.25rem;
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

/* Tablet and below */
@media (max-width: 1024px) {
  .settings-form,
  .settings-section {
    max-width: 100%;
  }
}

/* Wide screens */
@media (min-width: 1200px) {
  .settings-layout {
    grid-template-columns: minmax(0, 1fr) 280px;
    align-items: start;
  }

  .settings-aside {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
    position: sticky;
    top: calc(var(--navbar-height) + var(--spacing-4));
    max-height: calc(100dvh - var(--navbar-height) - var(--spacing-8));
    height: fit-content;
    overflow-y: auto;
  }

  .settings-form,
  .settings-section {
    max-width: 100%;
  }
}

/* Mobile */
@media (max-width: 768px) {
  .profile-page {
    padding: var(--spacing-4) 0;
  }
  .profile-page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-left {
    width: 100%;
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

  .form-group :deep(.ui-input) {
    min-height: 3rem;
    font-size: 1rem; /* Prevent iOS zoom */
  }

  .bio-textarea {
    min-height: 7.5rem;
  }

  .form-actions {
    flex-direction: column;
    margin-top: var(--spacing-4);
    padding-top: var(--spacing-3);
  }

  .form-actions :deep(button) {
    width: 100%;
    min-height: 3rem;
  }
}

/* Small Mobile */
@media (max-width: 480px) {
  .profile-page {
    padding: var(--spacing-3) 0;
  }
  .header-left h1 {
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
