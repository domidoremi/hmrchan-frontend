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
        <div class="settings-section glass-card">
          <div class="skeleton" style="height: 80px; width: 80px; border-radius: 50%;" />
          <div class="skeleton" style="height: 24px; width: 200px; margin-top: 16px;" />
        </div>
      </template>

      <template v-else-if="profile">
        <form class="settings-form" @submit.prevent="saveProfile">
          <section class="settings-section glass-card">
            <h2 class="section-title">{{ $t('profile.avatar') }}</h2>
            <div class="avatar-section">
              <img
                v-if="profile.avatar_url"
                class="avatar-preview"
                :src="profile.avatar_url"
                :alt="profile.username"
              />
              <div v-else class="avatar-preview avatar-placeholder">
                <User :size="40" />
              </div>
              <div class="avatar-actions">
                <label class="glass-button avatar-upload-btn">
                  <Camera :size="16" />
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

          <section class="settings-section glass-card">
            <h2 class="section-title">{{ $t('profile.basicInfo') }}</h2>

            <div class="form-group">
              <label for="username">{{ $t('profile.username') }}</label>
              <input
                id="username"
                v-model="form.username"
                type="text"
                class="glass-input"
                :disabled="!canChangeUsername"
                :placeholder="$t('profile.usernamePlaceholder')"
              />
              <p v-if="!canChangeUsername" class="field-hint">
                {{ $t('profile.usernameChangeLimit', { days: daysUntilUsernameChange }) }}
              </p>
              <p class="field-hint">{{ $t('profile.usernameHint') }}</p>
            </div>

            <div class="form-group">
              <label for="full_name">{{ $t('profile.fullName') }}</label>
              <input
                id="full_name"
                v-model="form.full_name"
                type="text"
                class="glass-input"
                maxlength="255"
                :placeholder="$t('profile.fullNamePlaceholder')"
              />
            </div>

            <div class="form-group">
              <label for="bio">{{ $t('profile.bio') }}</label>
              <textarea
                id="bio"
                v-model="form.bio"
                class="glass-input bio-textarea"
                maxlength="500"
                rows="4"
                :placeholder="$t('profile.bioPlaceholder')"
              />
              <p class="field-hint">{{ form.bio?.length || 0 }}/500</p>
            </div>
          </section>

          <div class="form-actions">
            <Button type="submit" :disabled="isSaving">
              <span v-if="isSaving" class="spinner spinner-sm" />
              {{ $t('common.save') }}
            </Button>
          </div>
        </form>

        <section class="settings-section glass-card">
          <h2 class="section-title">{{ $t('profile.changePassword') }}</h2>
          <form @submit.prevent="changePassword">
            <div class="form-group">
              <label for="current_password">{{ $t('profile.currentPassword') }}</label>
              <input
                id="current_password"
                v-model="passwordForm.current_password"
                type="password"
                class="glass-input"
                required
              />
            </div>

            <div class="form-group">
              <label for="new_password">{{ $t('profile.newPassword') }}</label>
              <input
                id="new_password"
                v-model="passwordForm.new_password"
                type="password"
                class="glass-input"
                minlength="8"
                required
              />
            </div>

            <div class="form-group">
              <label for="confirm_password">{{ $t('profile.confirmPassword') }}</label>
              <input
                id="confirm_password"
                v-model="passwordForm.confirm_password"
                type="password"
                class="glass-input"
                required
              />
            </div>

            <div class="form-actions">
              <Button type="submit" variant="secondary" :disabled="isChangingPassword">
                <span v-if="isChangingPassword" class="spinner spinner-sm" />
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
import { ArrowLeft, User, Camera } from 'lucide-vue-next'
import { userService, type UserProfile, ApiError } from '@/api'
import { useAuthStore, useToastStore } from '@/stores'
import Button from '@/components/ui/Button.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import ImageCropper from '@/components/ui/ImageCropper.vue'

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

const canChangeUsername = computed(() =>
  userService.canChangeUsername(profile.value?.username_changed_at)
)

const daysUntilUsernameChange = computed(() =>
  userService.getDaysUntilUsernameChange(profile.value?.username_changed_at)
)

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

function handleAvatarSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

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
    if (profile.value) {
      profile.value.avatar_url = result.url
    }
    if (authStore.user) {
      authStore.user.avatar_url = result.url
    }
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
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
}

.settings-section {
  padding: var(--spacing-6);
  margin-bottom: var(--spacing-6);
}

.section-title {
  font-size: var(--text-lg);
  margin: 0 0 var(--spacing-4);
}

.avatar-section {
  display: flex;
  align-items: center;
  gap: var(--spacing-6);
}

.avatar-preview {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface);
  color: var(--color-text-secondary);
}

.avatar-upload-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  cursor: pointer;
}

.form-group {
  margin-bottom: var(--spacing-4);
}

.form-group label {
  display: block;
  font-weight: var(--font-medium);
  margin-bottom: var(--spacing-2);
}

.form-group .glass-input {
  width: 100%;
}

.bio-textarea {
  resize: vertical;
  min-height: 100px;
}

.field-hint {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-top: var(--spacing-1);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-3);
  margin-top: var(--spacing-4);
}

.settings-form {
  display: contents;
}
</style>
