<template>
  <div class="auth-page auth-page--login">
    <div class="auth-book">
      <section class="auth-visual" aria-hidden="true">
        <AuthVisualScene
          :title="$t('auth.loginTitle')"
          :subtitle="$t('auth.loginSubtitle')"
          :mood="visualMood"
          :show-copy="false"
          scene-kind="login"
        />
      </section>

      <section class="auth-panel">
        <div class="auth-panel-inner">
          <div class="auth-topline">
            <div class="auth-header">
              <button
                type="button"
                class="back-btn page-control-btn page-control-btn--square"
                :aria-label="$t('common.back')"
                @click="handleBackWithMood"
              >
                <AnimatedIcon name="explore" :fallback-icon="ArrowLeft" size="sm" />
              </button>
            </div>
            <div class="auth-headings">
              <h1 class="auth-title">{{ $t('auth.loginTitle') }}</h1>
              <p class="auth-subtitle">{{ $t('auth.loginSubtitle') }}</p>
            </div>
          </div>

          <nav class="auth-switcher" :aria-label="$t('auth.loginTitle')">
            <RouterLink
              to="/login"
              class="auth-switcher__item auth-switcher__item--active"
              aria-current="page"
            >
              {{ $t('nav.login') }}
            </RouterLink>
            <RouterLink to="/register" class="auth-switcher__item" @click="handleNavigateLink">
              {{ $t('nav.register') }}
            </RouterLink>
          </nav>

          <div class="auth-login-card glass-surface--elevated">
            <div class="auth-login-card__copy">
              <p class="auth-login-card__eyebrow">{{ $t('auth.secureBadge') }}</p>
              <h2 class="auth-login-card__title">{{ $t('auth.oidc.loginButton') }}</h2>
              <p class="auth-login-card__hint">{{ $t('auth.oidc.loginHint') }}</p>
            </div>

            <Button type="button" :loading="isLoading" full-width @click="handleOIDCLogin">
              {{ $t('auth.oidc.loginButton') }}
            </Button>

            <p v-if="formError" class="field-error">{{ formError }}</p>
          </div>

          <div class="auth-support-copy">
            <p class="auth-support-copy__text">{{ $t('auth.loginHint') }}</p>
            <p class="auth-support-copy__text">{{ $t('auth.registerHint') }}</p>
          </div>

          <section v-if="showRestorePanel" class="auth-restore glass-surface--base">
            <div class="auth-restore__copy">
              <p class="auth-restore__title">{{ $t('auth.restoreTitle') }}</p>
              <p class="auth-restore__hint">{{ restoreNotice }}</p>
            </div>

            <div class="form-group">
              <label for="restore-identifier">{{ $t('auth.usernameOrEmail') }}</label>
              <Input
                id="restore-identifier"
                v-model="usernameOrEmail"
                type="text"
                :placeholder="$t('auth.usernameOrEmailPlaceholder')"
                autocomplete="username"
                required
                @focus="handleTypingFocus"
                @blur="handleFieldBlur"
              />
            </div>

            <div class="form-group">
              <label for="restore-password">{{ $t('auth.password') }}</label>
              <div class="password-field">
                <Input
                  id="restore-password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  class="password-input"
                  autocomplete="current-password"
                  required
                  @focus="handlePasswordFocus"
                  @blur="handleFieldBlur"
                />
                <button
                  type="button"
                  class="password-toggle"
                  :aria-label="showPassword ? $t('common.hide') : $t('common.show')"
                  @click="handlePasswordToggle"
                >
                  <AnimatedIcon
                    v-if="showPassword"
                    name="explore"
                    :fallback-icon="EyeOff"
                    size="sm"
                  />
                  <AnimatedIcon v-else name="explore" :fallback-icon="Eye" size="sm" />
                </button>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              :loading="isRestoringAccount"
              :disabled="!canRestoreAccount"
              full-width
              @click="handleRestoreAccount"
            >
              {{ $t('auth.restoreButton') }}
            </Button>
          </section>

          <p class="auth-forgot">
            <RouterLink to="/forgot-password" @click="handleNavigateLink">{{
              $t('auth.forgotPassword')
            }}</RouterLink>
          </p>

          <p class="auth-footer">
            {{ $t('auth.noAccount') }}
            <RouterLink to="/register" @click="handleNavigateLink">{{
              $t('nav.register')
            }}</RouterLink>
          </p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'LoginPage' })

import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ArrowLeft, Eye, EyeOff } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { userService, ApiError } from '@/api'
import { useAuthStore, useToastStore } from '@/stores'
import { isSafeRedirect } from '@/utils/security'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import AuthVisualScene from '@/components/auth/AuthVisualScene.vue'

type VisualMood = 'idle' | 'typing' | 'dodge' | 'submitting' | 'success'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toastStore = useToastStore()
const { t } = useI18n()

const { isAuthenticated, isLoading } = storeToRefs(authStore)

const usernameOrEmail = ref('')
const password = ref('')
const showPassword = ref(false)
const formError = ref('')
const isRestoringAccount = ref(false)
const showRestorePanel = ref(false)
const visualMood = ref<VisualMood>('idle')

let moodTimer: ReturnType<typeof setTimeout> | null = null

const redirectTo = computed(() => {
  const redirect = route.query['redirect']
  if (typeof redirect !== 'string' || !redirect) return '/'
  return isSafeRedirect(redirect) ? redirect : '/'
})

const canRestoreAccount = computed(() => {
  return !!usernameOrEmail.value.trim() && !!password.value
})

const restoreNotice = computed(() => {
  return route.query['restore_notice'] === 'deleted'
    ? t('auth.restoreAfterDeleteNotice')
    : t('auth.restoreHint')
})

function setVisualMood(next: VisualMood, holdMs = 0) {
  if (moodTimer) {
    clearTimeout(moodTimer)
    moodTimer = null
  }

  visualMood.value = next

  if (holdMs > 0) {
    moodTimer = setTimeout(() => {
      visualMood.value = 'idle'
      moodTimer = null
    }, holdMs)
  }
}

function handleTypingFocus() {
  if (visualMood.value === 'submitting') return
  setVisualMood('typing')
}

function handlePasswordFocus() {
  if (visualMood.value === 'submitting') return
  setVisualMood('dodge')
}

function handleFieldBlur() {
  if (visualMood.value === 'submitting') return
  setVisualMood('idle')
}

function handlePasswordToggle() {
  showPassword.value = !showPassword.value
  setVisualMood('dodge', 520)
}

function handleNavigateLink() {
  setVisualMood('submitting', 580)
}

function buildLoginQueryWithoutRestore() {
  const nextQuery = { ...route.query }
  delete nextQuery['mode']
  delete nextQuery['identifier']
  delete nextQuery['restore_notice']
  return nextQuery
}

function handleBack() {
  const redirect = route.query['redirect']
  if (typeof redirect === 'string' && redirect) {
    router.replace('/')
    return
  }

  if (window.history.length > 1) {
    router.back()
    return
  }

  router.replace(redirectTo.value)
}

function handleBackWithMood() {
  setVisualMood('dodge', 460)
  handleBack()
}

async function handleOIDCLogin() {
  setVisualMood('submitting')
  formError.value = ''

  const result = await authStore.loginWithOIDC('web', redirectTo.value)
  if (result.success) {
    return
  }

  formError.value = t(result.error || 'auth.error.oidcLoginFailed')
  toastStore.error(formError.value)
  setVisualMood('dodge', 1200)
}

async function handleRestoreAccount() {
  if (isRestoringAccount.value) return

  setVisualMood('submitting')
  formError.value = ''

  if (!canRestoreAccount.value) {
    formError.value = t('auth.error.fieldsRequired')
    setVisualMood('typing', 900)
    return
  }

  isRestoringAccount.value = true
  try {
    await userService.restoreAccount({
      identifier: usernameOrEmail.value.trim(),
      password: password.value,
    })
    password.value = ''
    formError.value = ''
    toastStore.success(t('profile.restoreAccountSuccess'))
    await router.replace({
      name: 'login',
      query: buildLoginQueryWithoutRestore(),
    })
    setVisualMood('success', 900)
  } catch (error) {
    formError.value = error instanceof ApiError ? error.message : t('common.error')
    toastStore.error(formError.value)
    setVisualMood('dodge', 1200)
  } finally {
    isRestoringAccount.value = false
  }
}

watch(
  () => route.query['mode'],
  (mode) => {
    showRestorePanel.value = mode === 'restore'
  },
  { immediate: true }
)

watch(
  () => route.query['identifier'],
  (identifier) => {
    if (typeof identifier === 'string' && identifier.trim()) {
      usernameOrEmail.value = identifier.trim()
    }
  },
  { immediate: true }
)

if (isAuthenticated.value) {
  router.replace(redirectTo.value)
}

onMounted(() => {
  void import('@/views/RegisterPage.vue').catch(() => {})
  void import('@/views/ForgotPasswordPage.vue').catch(() => {})
})

onUnmounted(() => {
  if (moodTimer) {
    clearTimeout(moodTimer)
    moodTimer = null
  }
})
</script>

<style scoped>
.auth-login-card,
.auth-support-copy,
.auth-restore {
  display: grid;
  gap: 1rem;
}

.auth-login-card {
  padding: 1.25rem;
  border-radius: 1.25rem;
}

.auth-login-card__copy,
.auth-restore__copy {
  display: grid;
  gap: 0.5rem;
}

.auth-login-card__eyebrow {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(15, 23, 42, 0.62);
}

.auth-login-card__title,
.auth-restore__title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: rgba(15, 23, 42, 0.96);
}

.auth-login-card__hint,
.auth-restore__hint,
.auth-support-copy__text {
  margin: 0;
  color: rgba(15, 23, 42, 0.72);
  line-height: 1.6;
}

.auth-restore {
  padding: 1rem;
  border-radius: 1rem;
}
</style>
