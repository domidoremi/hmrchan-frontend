<template>
  <div class="settings-page profile-sub-page">
    <div class="container">
      <ProfileSubPageHeader
        :title="$t('profile.settings')"
        :subtitle="$t('profile.settingsSubtitle')"
        :hint="$t('profile.settingsHint')"
      >
        <template #actions>
          <Button variant="ghost" size="sm" type="button" @click="refreshSettingsData">
            <AnimatedIcon name="loading" :fallback-icon="RefreshCw" size="sm" />
            {{ $t('common.refresh') }}
          </Button>
        </template>
      </ProfileSubPageHeader>

      <StateIndicator v-if="error" variant="error" :description="error" @action="fetchProfile" />

      <template v-else-if="isLoading">
        <div class="settings-skeleton">
          <div class="settings-section glass-surface--base">
            <div class="skeleton-header">
              <Skeleton width="100px" height="20px" />
            </div>
            <div class="skeleton-avatar-section">
              <Skeleton variant="avatar" width="80px" height="80px" />
              <Skeleton width="140px" height="40px" />
            </div>
          </div>
          <div class="settings-section glass-surface--base">
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
        <div class="settings-dashboard">
          <section class="settings-overview glass-surface--editorial">
            <div class="settings-overview__copy">
              <p class="settings-overview__eyebrow">{{ $t('profile.summary') }}</p>
              <h2 class="settings-overview__title">{{ userDisplayName }}</h2>
              <p class="settings-overview__subtitle">{{ $t('profile.settingsHint') }}</p>
            </div>

            <div class="settings-overview__meta">
              <div class="settings-overview__meta-item">
                <span class="settings-overview__meta-label">{{ $t('email.currentEmail') }}</span>
                <strong class="settings-overview__meta-value">{{ profile.email }}</strong>
              </div>
              <div class="settings-overview__meta-item">
                <span class="settings-overview__meta-label">{{
                  $t('profile.loginMethodTitle')
                }}</span>
                <strong class="settings-overview__meta-value">{{ authSourceSummaryLabel }}</strong>
              </div>
              <div class="settings-overview__meta-item">
                <span class="settings-overview__meta-label">{{
                  $t('profile.accountStatusLabel')
                }}</span>
                <strong class="settings-overview__meta-value">
                  {{
                    isDeletionStatusLoading
                      ? $t('common.loading')
                      : deletionStatus?.is_deleted
                        ? $t('profile.accountDeletionPending')
                        : $t('profile.accountActive')
                  }}
                </strong>
              </div>
            </div>
          </section>

          <div class="settings-group-switcher" role="tablist" :aria-label="$t('profile.settings')">
            <button
              v-for="group in settingsDashboardGroups"
              :key="group.id"
              type="button"
              class="settings-group-switcher__item"
              :class="{ 'settings-group-switcher__item--active': activeSettingsGroup === group.id }"
              :aria-selected="activeSettingsGroup === group.id"
              :tabindex="activeSettingsGroup === group.id ? 0 : -1"
              role="tab"
              @click="activeSettingsGroup = group.id"
            >
              <div class="settings-group-switcher__icon">
                <AnimatedIcon :name="group.iconName" :fallback-icon="group.icon" size="sm" />
              </div>
              <div class="settings-group-switcher__copy">
                <strong>{{ group.title }}</strong>
                <span>{{ group.description }}</span>
              </div>
            </button>
          </div>

          <div class="settings-layout">
            <div class="settings-main">
              <div v-show="activeSettingsGroup === 'account'" class="settings-group-panel">
                <form class="settings-form" @submit.prevent="saveProfile">
                  <!-- Avatar Section -->
                  <section id="avatar-section" class="settings-section glass-surface--editorial">
                    <div class="settings-section-head">
                      <div class="settings-section-icon">
                        <AnimatedIcon name="user" :fallback-icon="User" size="sm" />
                      </div>
                      <div>
                        <h2 class="settings-section-title">{{ $t('profile.avatar') }}</h2>
                        <p class="settings-section-desc">{{ $t('profile.avatarSectionHint') }}</p>
                      </div>
                    </div>
                    <div class="avatar-section">
                      <div class="avatar-wrapper">
                        <img
                          v-if="profileAvatarPreviewUrl"
                          class="avatar-preview"
                          :src="profileAvatarPreviewUrl"
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
                        <SketchDropUploader
                          ref="avatarUploaderRef"
                          v-model="avatarUploadItems"
                          mode="avatar"
                          class="avatar-uploader"
                          :title="$t('profile.uploadAvatar')"
                          :description="$t('profile.avatarSectionHint')"
                          :select-label="$t('uploader.select')"
                          :hint="$t('profile.avatarMetaHint')"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          :multiple="false"
                          :max-files="1"
                          :auto-upload="false"
                          :validate-fn="validateAvatarUpload"
                          @error="toastStore.error($event)"
                          @selected="handleAvatarQueueSelected"
                        />
                        <div class="avatar-meta">
                          <span>{{ $t('profile.avatarMetaHint') }}</span>
                          <span class="meta-dot" />
                          <span>{{ $t('profile.avatarMetaPrivacy') }}</span>
                        </div>
                      </div>
                    </div>
                  </section>

                  <!-- Basic Info Section -->
                  <section id="basic-info" class="settings-section glass-surface--editorial">
                    <div class="settings-section-head">
                      <div class="settings-section-icon">
                        <AnimatedIcon name="explore" :fallback-icon="FileText" size="sm" />
                      </div>
                      <div>
                        <h2 class="settings-section-title">{{ $t('profile.basicInfo') }}</h2>
                        <p class="settings-section-desc">{{ $t('profile.basicInfoHint') }}</p>
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
                      <Button
                        type="button"
                        variant="ghost"
                        :disabled="isSaving"
                        @click="fetchProfile"
                      >
                        <AnimatedIcon name="loading" :fallback-icon="RefreshCw" size="sm" />
                        {{ $t('common.reset') }}
                      </Button>
                    </div>
                  </section>
                </form>
              </div>

              <section
                v-show="activeSettingsGroup === 'appearance'"
                class="settings-section settings-section--embedded glass-surface--editorial"
              >
                <div class="settings-section-head">
                  <div class="settings-section-icon">
                    <AnimatedIcon name="sparkle" :fallback-icon="Palette" size="sm" />
                  </div>
                  <div>
                    <h2 class="settings-section-title">{{ $t('settings.categoryAppearance') }}</h2>
                    <p class="settings-section-desc">{{ $t('settings.display') }}</p>
                  </div>
                </div>

                <SettingsPanel
                  :compact="false"
                  :embedded="true"
                  :show-header="false"
                  :allowed-categories="appearanceSettingsCategories"
                />
              </section>

              <div v-show="activeSettingsGroup === 'privacy'" class="settings-group-panel">
                <section
                  class="settings-section settings-section--embedded glass-surface--editorial"
                >
                  <div class="settings-section-head">
                    <div class="settings-section-icon">
                      <AnimatedIcon name="sparkle" :fallback-icon="Download" size="sm" />
                    </div>
                    <div>
                      <h2 class="settings-section-title">{{ $t('settings.categoryPrivacy') }}</h2>
                      <p class="settings-section-desc">{{ $t('settings.privacy') }}</p>
                    </div>
                  </div>

                  <SettingsPanel
                    :compact="false"
                    :embedded="true"
                    :show-header="false"
                    :allowed-categories="privacySettingsCategories"
                  />
                </section>

                <section
                  id="account-section"
                  class="settings-section glass-surface--editorial account-section"
                >
                  <div class="settings-section-head">
                    <div class="settings-section-icon">
                      <AnimatedIcon name="explore" :fallback-icon="Download" size="sm" />
                    </div>
                    <div>
                      <h2 class="settings-section-title">{{ $t('profile.accountToolsTitle') }}</h2>
                      <p class="settings-section-desc">{{ $t('profile.accountToolsHint') }}</p>
                    </div>
                  </div>

                  <div class="account-status-card">
                    <div class="account-status-copy">
                      <p class="two-factor-status-label">{{ $t('profile.accountStatusLabel') }}</p>
                      <p class="two-factor-status-value">
                        {{
                          isDeletionStatusLoading
                            ? $t('common.loading')
                            : deletionStatus?.is_deleted
                              ? $t('profile.accountDeletionPending')
                              : $t('profile.accountActive')
                        }}
                      </p>
                      <p class="field-hint">
                        {{
                          isDeletionStatusLoading
                            ? $t('profile.accountStatusLoadingHint')
                            : deletionStatus?.is_deleted
                              ? $t('profile.accountDeletionPendingHint', {
                                  days: deletionStatus.days_remaining ?? 0,
                                })
                              : $t('profile.accountActiveHint')
                        }}
                      </p>
                    </div>

                    <div class="account-actions">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        :loading="isExportingData"
                        @click="exportAccountData"
                      >
                        <AnimatedIcon name="explore" :fallback-icon="Download" size="sm" />
                        {{ $t('profile.exportDataAction') }}
                      </Button>
                      <Button
                        v-if="deletionStatus?.is_deleted"
                        type="button"
                        variant="secondary"
                        size="sm"
                        @click="openRestoreAccountFlow"
                      >
                        <AnimatedIcon name="user" :fallback-icon="User" size="sm" />
                        {{ $t('profile.restoreAccountAction') }}
                      </Button>
                      <Button
                        v-else
                        type="button"
                        variant="danger"
                        size="sm"
                        @click="openDeleteAccountDialog"
                      >
                        <AnimatedIcon name="explore" :fallback-icon="Trash2" size="sm" />
                        {{ $t('profile.deleteAccountAction') }}
                      </Button>
                    </div>
                  </div>

                  <div class="account-summary-card">
                    <div class="account-summary-card__header">
                      <div>
                        <p class="two-factor-status-label">{{ $t('profile.dataSummaryTitle') }}</p>
                        <p class="field-hint">{{ $t('profile.dataSummaryHint') }}</p>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        :loading="isDataSummaryLoading"
                        @click="refreshAccountDataSummary"
                      >
                        <AnimatedIcon name="loading" :fallback-icon="RefreshCw" size="sm" />
                        {{ $t('common.refresh') }}
                      </Button>
                    </div>

                    <div class="account-meta-grid">
                      <div class="account-meta-item">
                        <span class="account-meta-label">{{ $t('profile.accountCreatedAt') }}</span>
                        <span class="account-meta-value">
                          {{
                            dataSummary?.created_at
                              ? formatDateTime(dataSummary.created_at)
                              : formatDateTime(profile.created_at)
                          }}
                        </span>
                      </div>
                      <div class="account-meta-item">
                        <span class="account-meta-label">{{
                          $t('profile.accountSummaryUsername')
                        }}</span>
                        <span class="account-meta-value"
                          >@{{ dataSummary?.username || profile.username }}</span
                        >
                      </div>
                      <div class="account-meta-item">
                        <span class="account-meta-label">{{
                          $t('profile.accountSummaryEmail')
                        }}</span>
                        <span class="account-meta-value">{{
                          dataSummary?.email || profile.email
                        }}</span>
                      </div>
                    </div>

                    <div v-if="dataSummary" class="account-count-grid">
                      <div
                        v-for="item in dataSummaryItems"
                        :key="item.key"
                        class="account-count-item glass-surface--base"
                      >
                        <span class="account-count-value">{{ item.value }}</span>
                        <span class="account-count-label">{{ item.label }}</span>
                      </div>
                    </div>
                    <p v-else-if="!isDataSummaryLoading" class="field-hint">
                      {{ $t('profile.dataSummaryUnavailable') }}
                    </p>
                  </div>
                </section>
              </div>
            </div>
          </div>
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

    <Dialog
      :is-open="showDeleteAccountDialog"
      :title="$t('profile.deleteAccountConfirmTitle')"
      :description="$t('profile.deleteAccountConfirmDesc')"
      size="sm"
      @update:isOpen="showDeleteAccountDialog = $event"
    >
      <div class="report-form">
        <div class="form-group">
          <label for="delete_account_reason">
            <AnimatedIcon name="explore" :fallback-icon="FileText" size="sm" />
            {{ $t('profile.deleteAccountReasonLabel') }}
          </label>
          <div class="input-wrapper">
            <Textarea
              id="delete_account_reason"
              v-model="deleteAccountReason"
              rows="3"
              :placeholder="$t('profile.deleteAccountReasonPlaceholder')"
            />
          </div>
          <p class="field-hint">{{ $t('profile.deleteAccountHint') }}</p>
        </div>
      </div>

      <template #footer>
        <Button type="button" variant="ghost" size="sm" @click="showDeleteAccountDialog = false">
          {{ $t('common.cancel') }}
        </Button>
        <Button
          type="button"
          variant="danger"
          size="sm"
          :loading="isDeletingAccount"
          @click="confirmDeleteAccount"
        >
          {{ $t('profile.deleteAccountAction') }}
        </Button>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ProfileSettingsPage' })

import { ref, computed, onMounted, onUnmounted, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
// ... icons imports ...
import {
  User,
  Camera,
  FileText,
  AtSign,
  Lock,
  Save,
  RefreshCw,
  Download,
  Trash2,
  Palette,
} from '@lucide/vue'
import { userService, normalizeAvatarUrl, type UserProfile, ApiError } from '@/api'
import { useAuthStore, useToastStore } from '@/stores'
import type { UploadQueueItem } from '@/types'
import { refreshAvatarCache } from '@/composables/useUserAvatar'
import { isVerificationCancelledError } from '@/api/verificationBridge'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Textarea from '@/components/ui/Textarea.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import { defineAsyncComponent } from 'vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import ProfileSubPageHeader from '@/components/profile/ProfileSubPageHeader.vue'
import Dialog from '@/components/ui/Dialog.vue'
import SettingsPanel from '@/components/layout/SettingsPanel.vue'
import SketchDropUploader from '@/components/ui/SketchDropUploader.vue'
import {
  buildDataSummaryItems,
  buildRestoreAccountRouteQuery,
  formatOptionalDateTime,
  resolveAuthSourceSummaryKey,
  resolveIdentityProvider,
  resolveProfileDisplayName,
} from '@/views/profile-settings/profileSettingsModel'

// 动态导入大型组件以减少初始包体积
const ImageCropper = defineAsyncComponent(() => import('@/components/ui/ImageCropper.vue'))

const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const toastStore = useToastStore()
const activeSettingsGroup = ref<'account' | 'appearance' | 'privacy'>('account')

const profile = ref<UserProfile | null>(null)
// ... refs ...
const isLoading = ref(false)
const isSaving = ref(false)
const error = ref<string | null>(null)
const isDeletionStatusLoading = ref(false)
const isExportingData = ref(false)
const isDeletingAccount = ref(false)
const appearanceSettingsCategories: Array<'appearance' | 'experience'> = [
  'appearance',
  'experience',
]
const privacySettingsCategories: Array<'privacy'> = ['privacy']

const showCropper = ref(false)
const cropImageSrc = ref('')
const avatarUploadItems = ref<UploadQueueItem[]>([])
const avatarUploaderRef = useTemplateRef<{ clear: () => void }>('avatarUploaderRef')
let profileFetchController: AbortController | null = null
let profileFetchToken = 0
const profileAvatarPreviewUrl = computed(() => normalizeAvatarUrl(profile.value?.avatar_url))
const showDeleteAccountDialog = ref(false)
const deleteAccountReason = ref('')
type AccountDeletionStatus = Awaited<ReturnType<typeof userService.getDeletionStatus>>
const deletionStatus = ref<AccountDeletionStatus | null>(null)
type AccountDataSummary = Awaited<ReturnType<typeof userService.getDataSummary>> & {
  username?: string
  email?: string
  created_at?: string
  data_counts?: Record<string, number>
}
const dataSummary = ref<AccountDataSummary | null>(null)
const isDataSummaryLoading = ref(false)
const userDisplayName = computed(() =>
  resolveProfileDisplayName({
    fullName: profile.value?.full_name,
    username: profile.value?.username,
  })
)
const settingsDashboardGroups = computed(() => [
  {
    id: 'account' as const,
    title: t('profile.basicInfo'),
    description: t('profile.basicInfoHint'),
    icon: User,
    iconName: 'user',
  },
  {
    id: 'appearance' as const,
    title: t('settings.categoryAppearance'),
    description: t('settings.display'),
    icon: Palette,
    iconName: 'sparkle',
  },
  {
    id: 'privacy' as const,
    title: t('settings.categoryPrivacy'),
    description: t('profile.accountToolsHint'),
    icon: Download,
    iconName: 'explore',
  },
])
const dataSummaryItems = computed(() => {
  return buildDataSummaryItems(dataSummary.value?.data_counts).map((item) => ({
    key: item.key,
    label: t(item.labelKey),
    value: item.value,
  }))
})

const form = ref({
  username: '',
  full_name: '',
  bio: '',
})

const normalizedIdentityProvider = computed(() => {
  return resolveIdentityProvider({
    profileProvider: profile.value?.identity_provider,
    authProvider: authStore.user?.identity_provider,
  })
})

const authSourceSummaryLabel = computed(() => {
  return t(resolveAuthSourceSummaryKey(normalizedIdentityProvider.value))
})

async function fetchProfile() {
  profileFetchController?.abort()
  const controller = new AbortController()
  profileFetchController = controller
  const requestToken = ++profileFetchToken

  isLoading.value = true
  error.value = null

  try {
    const data = await userService.getProfile({
      signal: controller.signal,
      skipErrorToast: true,
    })
    if (controller.signal.aborted || requestToken !== profileFetchToken) return
    profile.value = data
    form.value = {
      username: data.username,
      full_name: data.full_name || '',
      bio: data.bio || '',
    }
  } catch (err) {
    if (controller.signal.aborted || requestToken !== profileFetchToken) return
    if (err instanceof ApiError) {
      error.value = err.message
    } else {
      error.value = t('common.error')
    }
  } finally {
    if (requestToken === profileFetchToken) {
      isLoading.value = false
      if (profileFetchController === controller) {
        profileFetchController = null
      }
    }
  }
}

async function fetchDeletionStatus() {
  isDeletionStatusLoading.value = true
  try {
    deletionStatus.value = await userService.getDeletionStatus()
  } catch {
    deletionStatus.value = null
  } finally {
    isDeletionStatusLoading.value = false
  }
}

async function fetchDataSummary(options: { silent?: boolean } = {}) {
  const { silent = true } = options
  isDataSummaryLoading.value = true

  try {
    const summary = await userService.getDataSummary()
    dataSummary.value = summary as AccountDataSummary
  } catch {
    dataSummary.value = null
    if (!silent) {
      toastStore.error(t('common.error'))
    }
  } finally {
    isDataSummaryLoading.value = false
  }
}

async function refreshAccountDataSummary() {
  await fetchDataSummary({ silent: false })
}

async function refreshSettingsData() {
  await Promise.allSettled([
    fetchProfile(),
    fetchDeletionStatus(),
    fetchDataSummary({ silent: true }),
  ])
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

function openDeleteAccountDialog() {
  deleteAccountReason.value = ''
  showDeleteAccountDialog.value = true
}

function buildRestoreAccountQuery(includeDeletedNotice = false) {
  return buildRestoreAccountRouteQuery({
    email: profile.value?.email,
    username: profile.value?.username,
    includeDeletedNotice,
  })
}

async function openRestoreAccountFlow() {
  await authStore.logout()
  await router.replace({
    name: 'login',
    query: buildRestoreAccountQuery(),
  })
}

async function exportAccountData() {
  if (isExportingData.value) return

  isExportingData.value = true
  try {
    await userService.exportData()
    toastStore.success(t('profile.exportDataSuccess'))
  } catch (err) {
    if (isVerificationCancelledError(err)) return
    if (err instanceof ApiError) {
      toastStore.error(err.message)
    } else {
      toastStore.error(t('common.error'))
    }
  } finally {
    isExportingData.value = false
  }
}

async function confirmDeleteAccount() {
  if (isDeletingAccount.value) return

  isDeletingAccount.value = true
  try {
    await userService.deleteAccount(deleteAccountReason.value.trim() || undefined)
    showDeleteAccountDialog.value = false
    deleteAccountReason.value = ''
    toastStore.success(t('profile.deleteAccountSuccess'))
    await Promise.allSettled([fetchDeletionStatus(), fetchDataSummary({ silent: true })])
  } catch (err) {
    if (isVerificationCancelledError(err)) return
    if (err instanceof ApiError) {
      toastStore.error(err.message)
    } else {
      toastStore.error(t('common.error'))
    }
  } finally {
    isDeletingAccount.value = false
  }
}

function formatDateTime(value?: string | null) {
  return formatOptionalDateTime(value, '—')
}

// 头像上传限制
const AVATAR_LIMITS = {
  MAX_FILE_SIZE_MB: 5,
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
}

function validateAvatarUpload(file: File): string | null {
  if (!AVATAR_LIMITS.ALLOWED_TYPES.includes(file.type)) {
    return t('profile.avatarTypeError')
  }

  const sizeMB = file.size / (1024 * 1024)
  if (sizeMB > AVATAR_LIMITS.MAX_FILE_SIZE_MB) {
    return t('profile.avatarSizeError', { max: AVATAR_LIMITS.MAX_FILE_SIZE_MB })
  }

  return null
}

function openAvatarCropper(file: File) {
  const validationError = validateAvatarUpload(file)
  if (validationError) {
    toastStore.error(validationError)
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    cropImageSrc.value = e.target?.result as string
    showCropper.value = true
  }
  reader.readAsDataURL(file)
}

function handleAvatarQueueSelected(items: UploadQueueItem[]) {
  const selectedItem = items[0]
  if (!selectedItem) return
  openAvatarCropper(selectedItem.file)
  avatarUploaderRef.value?.clear()
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
  void refreshSettingsData()
})

onUnmounted(() => {
  profileFetchController?.abort()
  profileFetchController = null
})
</script>

<style scoped src="../styles/page-systems/profile-settings-page-view.css"></style>
