<template>
  <div class="profile-security-page profile-sub-page" data-testid="profile-security-page">
    <div class="container">
      <ProfileSubPageHeader
        :title="$t('profile.securityHubTitle')"
        :subtitle="$t('profile.securityHubSubtitle')"
        :hint="$t('profile.securityHubHint')"
      >
        <template #actions>
          <Button variant="ghost" size="sm" type="button" @click="refreshSecurityCenter">
            {{ $t('common.refresh') }}
          </Button>
        </template>
      </ProfileSubPageHeader>

      <StateIndicator
        v-if="profileError"
        variant="error"
        :description="profileError"
        @action="fetchProfile"
      />

      <template v-else>
        <section class="security-center-hero glass-surface--editorial">
          <div class="security-center-hero__icon">
            <AnimatedIcon name="sparkle" :fallback-icon="Shield" size="lg" />
          </div>
          <div class="security-center-hero__copy">
            <p class="security-center-hero__eyebrow">{{ $t('profile.securityHubTitle') }}</p>
            <h1>{{ $t('profile.securityHubTitle') }}</h1>
            <p>{{ $t('profile.securityHubHint') }}</p>
          </div>
        </section>

        <ProfileSecurityCredentialsSection
          v-if="profile"
          :profile="profile"
          :auth-user="authStore.user"
          @refreshed="fetchProfile"
        />

        <ProfileSecurityMfaSection
          v-if="profile"
          id="mfa"
          :profile="profile"
          :auth-user="authStore.user"
        />

        <section
          id="devices"
          class="settings-section glass-surface--editorial"
          data-testid="profile-security-devices-section"
        >
          <div class="settings-section-head">
            <div class="settings-section-icon">
              <AnimatedIcon name="explore" :fallback-icon="Monitor" size="sm" />
            </div>
            <div>
              <h2 class="settings-section-title">{{ $t('profile.tabs.devices') }}</h2>
              <p class="settings-section-desc">{{ $t('devices.description') }}</p>
            </div>
          </div>

          <div class="security-center-actions">
            <Button
              type="button"
              variant="danger"
              size="sm"
              :disabled="otherSessionsCount === 0"
              @click="revokeAllOthers"
            >
              {{ $t('devices.revokeAll') }}
            </Button>
          </div>

          <DeviceManagement :sessions="sessions" :is-loading="isLoading" />
        </section>

        <section
          id="activity"
          class="settings-section glass-surface--editorial"
          data-testid="profile-security-activity-section"
        >
          <div class="settings-section-head">
            <div class="settings-section-icon">
              <AnimatedIcon name="explore" :fallback-icon="History" size="sm" />
            </div>
            <div>
              <h2 class="settings-section-title">{{ $t('profile.securityActivityTitle') }}</h2>
              <p class="settings-section-desc">{{ $t('profile.securityActivityHint') }}</p>
            </div>
          </div>

          <ProfileSecurityTab :show-header="false" />
        </section>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { History, Monitor, Shield } from '@lucide/vue'
import { ApiError, userService, type UserProfile } from '@/api'
import { useSessionManagement } from '@/composables/useSessionManagement'
import { useAuthStore } from '@/stores'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import Button from '@/components/ui/Button.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import DeviceManagement from '@/components/profile/DeviceManagement.vue'
import ProfileSecurityCredentialsSection from '@/components/profile/ProfileSecurityCredentialsSection.vue'
import ProfileSecurityMfaSection from '@/components/profile/ProfileSecurityMfaSection.vue'
import ProfileSecurityTab from '@/components/profile/ProfileSecurityTab.vue'
import ProfileSubPageHeader from '@/components/profile/ProfileSubPageHeader.vue'

defineOptions({ name: 'ProfileSecurityPage' })

const authStore = useAuthStore()
const profile = ref<UserProfile | null>(null)
const profileError = ref<string | null>(null)
const { sessions, isLoading, otherSessionsCount, fetchSessions, revokeAllOthers } =
  useSessionManagement()

async function fetchProfile() {
  profileError.value = null
  try {
    profile.value = await userService.getProfile({ skipErrorToast: true })
  } catch (err) {
    profile.value = null
    profileError.value = err instanceof ApiError ? err.message : 'common.error'
  }
}

async function refreshSecurityCenter() {
  await Promise.allSettled([fetchProfile(), fetchSessions()])
}

onMounted(() => {
  void refreshSecurityCenter()
})
</script>

<style scoped>
.profile-security-page {
  min-height: 100dvh;
  padding: clamp(1rem, 3vw, 1.5rem) 0 var(--spacing-8);
}

.container,
.profile-security-page :deep(.container) {
  display: grid;
  gap: clamp(1rem, 2.4vw, 1.5rem);
}

.security-center-hero {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: clamp(1rem, 2.4vw, 1.35rem);
  align-items: center;
  padding: clamp(1rem, 3vw, 1.5rem);
  border-radius: var(--profile-shell-radius);
  border: 1px solid var(--profile-surface-border);
  background:
    radial-gradient(circle at 12% 18%, rgba(var(--color-primary-rgb), 0.16), transparent 32%),
    var(--profile-surface-bg);
  box-shadow: var(--profile-surface-shadow);
}

.security-center-hero__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: clamp(3rem, 8vw, 4.25rem);
  height: clamp(3rem, 8vw, 4.25rem);
  border-radius: 1.35rem;
  border: 1px solid var(--ui-compat-border);
  background: var(--ui-compat-surface-interactive);
  color: var(--color-primary);
}

.security-center-hero__copy {
  display: grid;
  gap: 0.35rem;
}

.security-center-hero__copy h1,
.security-center-hero__copy p {
  margin: 0;
}

.security-center-hero__eyebrow {
  margin: 0;
  color: var(--ui-compat-text-muted);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.security-center-actions {
  display: flex;
  justify-content: flex-end;
  margin-block-end: var(--spacing-4);
}

.settings-section,
.profile-security-page :deep(.settings-section) {
  position: relative;
  z-index: 1;
  padding: clamp(1rem, 3vw, 1.5rem);
  border-radius: var(--profile-section-radius);
  border: 1px solid var(--profile-surface-border);
  border-inline-start-width: 0.1875rem;
  background: var(--profile-surface-bg);
  box-shadow: var(--profile-surface-shadow);
}

.settings-section-head,
.profile-security-page :deep(.settings-section-head) {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-5);
  padding-bottom: var(--spacing-3);
  border-bottom: 1px solid var(--profile-muted-border);
}

.settings-section-icon,
.profile-security-page :deep(.settings-section-icon) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--profile-muted-border-strong);
  background: var(--profile-muted-bg-strong);
  color: var(--color-primary);
}

.settings-section-title,
.profile-security-page :deep(.settings-section-title) {
  margin: 0;
  font-size: clamp(var(--text-base), 2vw, var(--text-lg));
  font-weight: var(--font-semibold);
}

.settings-section-desc,
.profile-security-page :deep(.settings-section-desc) {
  margin: 0;
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
}

@media (max-width: 640px) {
  .security-center-hero {
    grid-template-columns: 1fr;
  }

  .security-center-actions {
    justify-content: stretch;
  }
}
</style>
