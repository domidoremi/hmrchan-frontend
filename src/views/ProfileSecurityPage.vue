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
            <RefreshCw :size="14" />
            {{ $t('common.refresh') }}
          </Button>
        </template>
      </ProfileSubPageHeader>

      <StateIndicator
        v-if="profileError"
        variant="error"
        :description="profileError"
        @action="refreshSecurityCenter"
      />

      <template v-else-if="isProfileLoading">
        <section class="security-command security-command--loading glass-surface--editorial">
          <div class="security-command__copy">
            <div class="security-skeleton security-skeleton--line security-skeleton--eyebrow" />
            <div class="security-skeleton security-skeleton--line security-skeleton--title" />
            <div class="security-skeleton security-skeleton--line security-skeleton--body" />
          </div>
          <div class="security-command__stats">
            <div
              v-for="item in 3"
              :key="item"
              class="security-skeleton security-skeleton--metric"
            />
          </div>
        </section>
      </template>

      <template v-else-if="profile">
        <section class="security-command glass-surface--editorial">
          <div class="security-command__copy">
            <div class="security-command__badge">
              <AnimatedIcon name="sparkle" :fallback-icon="Shield" size="sm" />
              <span>{{ $t('profile.insights.securityValue') }}</span>
            </div>
            <div class="security-command__headline">
              <p class="security-command__eyebrow">{{ $t('profile.securityHubTitle') }}</p>
              <h1>{{ securityHeadline }}</h1>
              <p>{{ $t('profile.securityHubHint') }}</p>
            </div>
          </div>

          <div class="security-command__stats">
            <article class="security-stat">
              <span class="security-stat__label">{{ $t('profile.authSourceLabel') }}</span>
              <strong class="security-stat__value">{{ authSourceSummaryLabel }}</strong>
              <span class="security-stat__hint">{{ $t('profile.loginMethodHint') }}</span>
            </article>
            <article class="security-stat">
              <span class="security-stat__label">{{ $t('profile.tabs.devices') }}</span>
              <strong class="security-stat__value">{{ sessionCountLabel }}</strong>
              <span class="security-stat__hint">{{ $t('devices.description') }}</span>
            </article>
            <article class="security-stat" :class="{ 'security-stat--warning': hasRiskSignals }">
              <span class="security-stat__label">{{ $t('profile.securityFailedLogins') }}</span>
              <strong class="security-stat__value">{{ failedLoginCount }}</strong>
              <span class="security-stat__hint">
                {{ securitySummaryError ? securitySummaryError : lastLoginLabel }}
              </span>
            </article>
          </div>
        </section>

        <section class="security-console">
          <div class="security-console__overview">
            <button
              v-for="panel in panelCards"
              :key="panel.id"
              type="button"
              class="security-entry glass-surface--editorial"
              :class="{ 'security-entry--active': activePanel === panel.id }"
              :aria-pressed="activePanel === panel.id"
              :aria-controls="panel.panelId"
              @click="selectPanel(panel.id)"
            >
              <div class="security-entry__media">
                <AnimatedIcon name="explore" :fallback-icon="panel.icon" size="lg" />
              </div>

              <div class="security-entry__copy">
                <p class="security-entry__eyebrow">{{ panel.kicker }}</p>
                <h2>{{ panel.title }}</h2>
                <p>{{ panel.description }}</p>
              </div>

              <div class="security-entry__footer">
                <div class="security-entry__meta">
                  <span class="security-entry__meta-label">{{ panel.metaLabel }}</span>
                  <strong class="security-entry__meta-value">{{ panel.metaValue }}</strong>
                </div>
                <span class="security-entry__cta">
                  {{ $t('profile.viewSection') }}
                  <ChevronRight :size="16" />
                </span>
              </div>
            </button>
          </div>

          <section
            class="security-workspace glass-surface--editorial"
            data-testid="profile-security-workspace"
          >
            <div class="security-workspace__toolbar">
              <div class="security-workspace__summary">
                <p class="security-workspace__eyebrow">{{ activePanelCard.kicker }}</p>
                <h2>{{ activePanelCard.title }}</h2>
                <p>{{ activePanelCard.description }}</p>
              </div>

              <div
                class="security-workspace__chips"
                role="tablist"
                :aria-label="$t('profile.securityHubTitle')"
              >
                <button
                  v-for="panel in panelCards"
                  :key="panel.id"
                  :id="`security-workspace-tab-${panel.id}`"
                  type="button"
                  class="security-workspace__chip"
                  :class="{ 'security-workspace__chip--active': activePanel === panel.id }"
                  :aria-selected="activePanel === panel.id"
                  :tabindex="activePanel === panel.id ? 0 : -1"
                  role="tab"
                  @click="selectPanel(panel.id)"
                >
                  <AnimatedIcon name="explore" :fallback-icon="panel.icon" size="sm" />
                  <span>{{ panel.title }}</span>
                </button>
              </div>
            </div>

            <div class="security-workspace__body">
              <section
                id="credentials"
                ref="credentialsPanelRef"
                v-show="activePanel === 'credentials'"
                class="security-panel"
                data-panel="credentials"
                data-testid="profile-security-credentials-panel"
                role="tabpanel"
                :aria-labelledby="'security-workspace-tab-credentials'"
              >
                <ProfileSecurityCredentialsSection
                  :profile="profile"
                  :auth-user="authStore.user"
                  @refreshed="fetchProfile"
                />
              </section>

              <section
                id="mfa"
                ref="mfaPanelRef"
                v-show="activePanel === 'mfa'"
                class="security-panel"
                data-panel="mfa"
                data-testid="profile-security-mfa-panel"
                role="tabpanel"
                :aria-labelledby="'security-workspace-tab-mfa'"
              >
                <ProfileSecurityMfaSection :profile="profile" :auth-user="authStore.user" />
              </section>

              <section
                id="devices"
                ref="devicesPanelRef"
                v-show="activePanel === 'devices'"
                class="security-panel settings-section glass-surface--editorial"
                data-panel="devices"
                data-testid="profile-security-devices-section"
                role="tabpanel"
                :aria-labelledby="'security-workspace-tab-devices'"
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

                <div class="security-section-actions">
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
                ref="activityPanelRef"
                v-show="activePanel === 'activity'"
                class="security-panel settings-section glass-surface--editorial"
                data-panel="activity"
                data-testid="profile-security-activity-section"
                role="tabpanel"
                :aria-labelledby="'security-workspace-tab-activity'"
              >
                <div class="settings-section-head">
                  <div class="settings-section-icon settings-section-icon--warning">
                    <AnimatedIcon name="sparkle" :fallback-icon="History" size="sm" />
                  </div>
                  <div>
                    <h2 class="settings-section-title">
                      {{ $t('profile.securityActivityTitle') }}
                    </h2>
                    <p class="settings-section-desc">{{ $t('profile.securityActivityHint') }}</p>
                  </div>
                </div>

                <ProfileSecurityTab :show-header="false" />
              </section>
            </div>
          </section>
        </section>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ChevronRight, Fingerprint, History, Mail, Monitor, RefreshCw, Shield } from '@lucide/vue'
import { ApiError, auditService, userService, type SecuritySummary, type UserProfile } from '@/api'
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

type SecurityPanelId = 'credentials' | 'mfa' | 'devices' | 'activity'

const PANEL_HASH_TO_ID: Record<string, SecurityPanelId> = {
  '#credentials': 'credentials',
  '#email': 'credentials',
  '#mfa': 'mfa',
  '#devices': 'devices',
  '#activity': 'activity',
}

const PANEL_ID_TO_HASH: Record<SecurityPanelId, string> = {
  credentials: '#credentials',
  mfa: '#mfa',
  devices: '#devices',
  activity: '#activity',
}

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const profile = ref<UserProfile | null>(null)
const profileError = ref<string | null>(null)
const isProfileLoading = ref(false)
const securitySummary = ref<SecuritySummary | null>(null)
const securitySummaryError = ref<string | null>(null)
const activePanel = ref<SecurityPanelId>('credentials')

const credentialsPanelRef = ref<HTMLElement | null>(null)
const mfaPanelRef = ref<HTMLElement | null>(null)
const devicesPanelRef = ref<HTMLElement | null>(null)
const activityPanelRef = ref<HTMLElement | null>(null)

const { sessions, isLoading, otherSessionsCount, fetchSessions, revokeAllOthers } =
  useSessionManagement()

const normalizedIdentityProvider = computed(() => {
  const provider = profile.value?.identity_provider ?? authStore.user?.identity_provider
  return provider?.trim().toLowerCase() || 'local'
})

const authSourceSummaryLabel = computed(() => {
  if (normalizedIdentityProvider.value === 'google') {
    return t('profile.authSourceGoogle')
  }
  if (normalizedIdentityProvider.value !== 'local') {
    return authStore.user?.identity_provider?.trim() || t('profile.authSourceThirdParty')
  }
  return t('profile.authSourceEmail')
})

const securityHeadline = computed(() => {
  const displayName = profile.value?.full_name?.trim() || profile.value?.username?.trim()
  return displayName || t('profile.securityHubTitle')
})

const failedLoginCount = computed(() => String(securitySummary.value?.failed_logins ?? 0))
const hasRiskSignals = computed(() => (securitySummary.value?.failed_logins ?? 0) > 0)

const sessionCountLabel = computed(() => {
  const count = sessions.value?.length ?? 0
  return String(count)
})

const lastLoginLabel = computed(() => {
  const value = securitySummary.value?.last_login
  if (!value) return '—'
  return formatDateTime(value)
})

const panelCards = computed(() => [
  {
    id: 'credentials' as const,
    panelId: 'credentials',
    hash: PANEL_ID_TO_HASH.credentials,
    icon: Mail,
    kicker: authSourceSummaryLabel.value,
    title: t('profile.securityConsoleCredentialsTitle'),
    description: t('profile.securityConsoleCredentialsHint'),
    metaLabel: t('profile.accountSummaryEmail'),
    metaValue: profile.value?.email || t('common.notFound'),
  },
  {
    id: 'mfa' as const,
    panelId: 'mfa',
    hash: PANEL_ID_TO_HASH.mfa,
    icon: Fingerprint,
    kicker: t('profile.securityConsoleVerificationKicker'),
    title: t('profile.securityConsoleMfaTitle'),
    description: t('profile.securityConsoleMfaHint'),
    metaLabel: t('profile.twoFactorSummaryLabel'),
    metaValue: authSourceSummaryLabel.value,
  },
  {
    id: 'devices' as const,
    panelId: 'devices',
    hash: PANEL_ID_TO_HASH.devices,
    icon: Monitor,
    kicker: t('profile.securityConsoleSessionsKicker'),
    title: t('profile.securityConsoleDevicesTitle'),
    description: t('profile.securityConsoleDevicesHint'),
    metaLabel: t('profile.securityConsoleActiveSessionsLabel'),
    metaValue: sessionCountLabel.value,
  },
  {
    id: 'activity' as const,
    panelId: 'activity',
    hash: PANEL_ID_TO_HASH.activity,
    icon: History,
    kicker: t('profile.securityConsoleSignalsKicker'),
    title: t('profile.securityConsoleActivityTitle'),
    description: t('profile.securityConsoleActivityHint'),
    metaLabel: t('profile.securityEvents'),
    metaValue: String(securitySummary.value?.security_events ?? 0),
  },
])

const activePanelCard = computed(
  () => panelCards.value.find((panel) => panel.id === activePanel.value) ?? panelCards.value[0]
)

function formatDateTime(value?: string | null): string {
  if (!value) return '—'

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return value
  }
}

function resolvePanelFromHash(hash: string): SecurityPanelId {
  return PANEL_HASH_TO_ID[hash] ?? 'credentials'
}

function currentPanelElement(): HTMLElement | null {
  switch (activePanel.value) {
    case 'mfa':
      return mfaPanelRef.value
    case 'devices':
      return devicesPanelRef.value
    case 'activity':
      return activityPanelRef.value
    case 'credentials':
    default:
      return credentialsPanelRef.value
  }
}

async function syncPanelFromHash(hash: string, shouldScroll = false) {
  activePanel.value = resolvePanelFromHash(hash)
  if (!shouldScroll) return

  await nextTick()
  currentPanelElement()?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function selectPanel(panelId: SecurityPanelId) {
  if (activePanel.value !== panelId) {
    activePanel.value = panelId
  }

  const nextHash = PANEL_ID_TO_HASH[panelId]
  if (route.hash !== nextHash) {
    await router.replace({ hash: nextHash })
  }

  await nextTick()
  currentPanelElement()?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function fetchProfile() {
  isProfileLoading.value = true
  profileError.value = null

  try {
    profile.value = await userService.getProfile({ skipErrorToast: true })
  } catch (err) {
    profile.value = null
    profileError.value = err instanceof ApiError ? err.message : 'common.error'
  } finally {
    isProfileLoading.value = false
  }
}

async function fetchSecuritySummary() {
  securitySummaryError.value = null

  try {
    securitySummary.value = await auditService.getMySecuritySummary(30)
  } catch (err) {
    securitySummary.value = null
    securitySummaryError.value = err instanceof ApiError ? err.message : t('common.error')
  }
}

async function refreshSecurityCenter() {
  await Promise.allSettled([fetchProfile(), fetchSessions(), fetchSecuritySummary()])
}

watch(
  () => route.hash,
  (hash, previousHash) => {
    void syncPanelFromHash(hash, Boolean(previousHash && previousHash !== hash))
  },
  { immediate: true }
)

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

.security-command {
  display: grid;
  gap: clamp(1rem, 2.8vw, 1.5rem);
  padding: clamp(1rem, 3vw, 1.5rem);
  border-radius: var(--profile-shell-radius);
  border: 1px solid var(--profile-surface-border);
  background:
    radial-gradient(circle at 10% 12%, rgba(var(--color-primary-rgb), 0.14), transparent 34%),
    linear-gradient(140deg, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0.86)),
    var(--profile-surface-bg);
  box-shadow: var(--profile-surface-shadow);
}

.security-command__copy {
  display: grid;
  gap: clamp(0.75rem, 2vw, 1rem);
}

.security-command__badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  width: fit-content;
  padding: 0.5rem 0.75rem;
  border-radius: 999px;
  border: 1px solid rgba(var(--color-primary-rgb), 0.16);
  background: rgba(var(--color-primary-rgb), 0.08);
  color: var(--color-primary);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.security-command__headline {
  display: grid;
  gap: 0.5rem;
}

.security-command__headline h1,
.security-command__headline p,
.security-command__eyebrow {
  margin: 0;
}

.security-command__eyebrow {
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.security-command__headline h1 {
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  line-height: 1.05;
  color: var(--color-text-primary);
}

.security-command__headline p {
  max-width: 60ch;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  line-height: 1.7;
}

.security-command__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(0.75rem, 2vw, 1rem);
}

.security-stat {
  display: grid;
  gap: 0.35rem;
  padding: clamp(0.875rem, 2.2vw, 1rem);
  border-radius: 1.1rem;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.72);
}

.security-stat--warning {
  border-color: rgba(217, 119, 6, 0.18);
  background: linear-gradient(135deg, rgba(255, 247, 237, 0.95), rgba(255, 255, 255, 0.82));
}

.security-stat__label,
.security-entry__eyebrow,
.security-entry__meta-label,
.security-workspace__eyebrow {
  margin: 0;
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.security-stat__value {
  color: var(--color-text-primary);
  font-size: clamp(1.125rem, 2vw, 1.45rem);
  font-weight: var(--font-bold);
}

.security-stat__hint {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  line-height: 1.5;
}

.security-command--loading {
  min-height: 14rem;
}

.security-skeleton {
  border-radius: 1rem;
  background: linear-gradient(
    90deg,
    rgba(226, 232, 240, 0.6) 25%,
    rgba(255, 255, 255, 0.92) 50%,
    rgba(226, 232, 240, 0.6) 75%
  );
  background-size: 200% 100%;
  animation: security-skeleton-shimmer 1.5s ease-in-out infinite;
}

.security-skeleton--line {
  block-size: 1rem;
}

.security-skeleton--eyebrow {
  inline-size: 7rem;
}

.security-skeleton--title {
  inline-size: min(26rem, 100%);
  block-size: 2.5rem;
}

.security-skeleton--body {
  inline-size: min(40rem, 100%);
}

.security-skeleton--metric {
  min-block-size: 6rem;
}

@keyframes security-skeleton-shimmer {
  0% {
    background-position: -200% 0;
  }

  100% {
    background-position: 200% 0;
  }
}

.security-console {
  display: grid;
  gap: clamp(1rem, 2.6vw, 1.5rem);
  min-inline-size: 0;
}

.security-console__overview {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(0.875rem, 2vw, 1rem);
}

.security-entry {
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 1rem;
  min-inline-size: 0;
  padding: clamp(1rem, 2.5vw, 1.25rem);
  border-radius: var(--profile-section-radius);
  border: 1px solid var(--profile-surface-border);
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.84)),
    var(--profile-surface-bg);
  box-shadow: var(--profile-surface-shadow);
  text-align: start;
  transition:
    transform var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out);
}

.security-entry:hover,
.security-entry:focus-visible,
.security-entry--active {
  border-color: rgba(var(--color-primary-rgb), 0.28);
  box-shadow: 0 1.25rem 2.8rem -2rem rgba(15, 23, 42, 0.22);
  transform: translateY(-0.125rem);
}

.security-entry:focus-visible {
  outline: none;
}

.security-entry__media {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: 3rem;
  block-size: 3rem;
  border-radius: 1rem;
  border: 1px solid rgba(var(--color-primary-rgb), 0.14);
  background: rgba(var(--color-primary-rgb), 0.08);
  color: var(--color-primary);
}

.security-entry__copy {
  display: grid;
  gap: 0.5rem;
  min-inline-size: 0;
}

.security-entry__copy h2,
.security-entry__copy p {
  margin: 0;
}

.security-entry__copy h2 {
  font-size: clamp(1rem, 2vw, 1.15rem);
  color: var(--color-text-primary);
}

.security-entry__copy p {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  line-height: 1.65;
  overflow-wrap: anywhere;
}

.security-entry__footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.75rem;
  min-inline-size: 0;
  flex-wrap: wrap;
}

.security-entry__meta {
  display: grid;
  gap: 0.2rem;
  min-inline-size: 0;
}

.security-entry__meta-value {
  color: var(--color-text-primary);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  overflow-wrap: anywhere;
}

.security-entry__cta {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--color-primary);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
}

.security-workspace {
  display: grid;
  gap: clamp(1rem, 2.4vw, 1.5rem);
  min-inline-size: 0;
  padding: clamp(1rem, 3vw, 1.5rem);
  border-radius: var(--profile-section-radius);
  border: 1px solid var(--profile-surface-border);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.84)),
    var(--profile-surface-bg);
  box-shadow: var(--profile-surface-shadow);
}

.security-workspace__toolbar {
  display: grid;
  gap: 1rem;
  min-inline-size: 0;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--profile-muted-border);
}

.security-workspace__summary {
  display: grid;
  gap: 0.35rem;
  min-inline-size: 0;
}

.security-workspace__summary h2,
.security-workspace__summary p {
  margin: 0;
}

.security-workspace__summary h2 {
  font-size: clamp(1.2rem, 2.5vw, 1.5rem);
  color: var(--color-text-primary);
}

.security-workspace__summary p {
  max-width: 64ch;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  line-height: 1.65;
  overflow-wrap: anywhere;
}

.security-workspace__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  min-inline-size: 0;
}

.security-workspace__chip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-inline-size: 0;
  max-inline-size: 100%;
  padding: 0.625rem 0.875rem;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.8);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  transition:
    background var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out);
}

.security-workspace__chip--active,
.security-workspace__chip:hover,
.security-workspace__chip:focus-visible {
  border-color: rgba(var(--color-primary-rgb), 0.22);
  background: rgba(var(--color-primary-rgb), 0.08);
  color: var(--color-primary);
  outline: none;
}

.security-workspace__body {
  display: grid;
  gap: 1rem;
  min-inline-size: 0;
}

.security-panel {
  display: grid;
  gap: 1rem;
  min-inline-size: 0;
}

.security-section-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  margin-block-end: var(--spacing-4);
}

.settings-section {
  position: relative;
  z-index: 1;
  min-inline-size: 0;
  padding: clamp(1rem, 3vw, 1.5rem);
  border-radius: var(--profile-section-radius);
  border: 1px solid var(--profile-surface-border);
  border-inline-start-width: 0.1875rem;
  background: var(--profile-surface-bg);
  box-shadow: var(--profile-surface-shadow);
}

.settings-section-head {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  min-inline-size: 0;
  flex-wrap: wrap;
  margin-bottom: var(--spacing-5);
  padding-bottom: var(--spacing-3);
  border-bottom: 1px solid var(--profile-muted-border);
}

.settings-section-icon {
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

.settings-section-icon--warning {
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
}

.settings-section-title {
  margin: 0;
  font-size: clamp(var(--text-base), 2vw, var(--text-lg));
  font-weight: var(--font-semibold);
  overflow-wrap: anywhere;
}

.settings-section-desc {
  margin: 0;
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
  overflow-wrap: anywhere;
}

@media (max-width: 1100px) {
  .security-console__overview {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .security-command__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .security-command__stats,
  .security-console__overview {
    grid-template-columns: 1fr;
  }

  .security-entry__footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .security-workspace__chip {
    flex: 1 1 calc(50% - 0.75rem);
    justify-content: center;
  }

  .security-entry__cta,
  .security-entry__meta-value {
    overflow-wrap: anywhere;
  }

  .security-section-actions {
    justify-content: stretch;
  }

  .security-section-actions :deep(.btn) {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .security-workspace__chip {
    flex-basis: 100%;
  }
}
</style>
