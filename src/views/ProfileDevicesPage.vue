<template>
  <div class="devices-page profile-sub-page">
    <div class="container">
      <ProfileSubPageHeader
        :title="$t('profile.tabs.devices')"
        :subtitle="$t('profile.devicesSubtitle')"
      >
        <template #actions>
          <Button v-if="otherSessionsCount > 0" variant="ghost" size="sm" @click="handleRevokeAll">
            <ShieldAlert :size="14" />
            {{ $t('devices.revokeAll') }}
          </Button>
        </template>
      </ProfileSubPageHeader>

      <!-- Security Overview -->
      <div class="security-strip profile-sub-page__stats">
        <div class="security-card glass-surface--elevated">
          <div class="security-icon security-icon--devices">
            <Monitor :size="16" />
          </div>
          <div class="security-body">
            <span class="security-number">{{ sessionCount }}</span>
            <span class="security-label">{{ $t('devices.activeSessions') }}</span>
          </div>
        </div>
        <div class="security-card glass-surface--elevated">
          <div class="security-icon security-icon--trusted">
            <ShieldCheck :size="16" />
          </div>
          <div class="security-body">
            <span class="security-number">{{ trustedCount }}</span>
            <span class="security-label">{{ $t('devices.trustedDevices') }}</span>
          </div>
        </div>
        <div class="security-card glass-surface--elevated">
          <div class="security-icon security-icon--current">
            <Fingerprint :size="16" />
          </div>
          <div class="security-body">
            <span class="security-number security-number--ok">
              <Check :size="14" />
            </span>
            <span class="security-label">{{ $t('devices.currentDevice') }}</span>
          </div>
        </div>
      </div>

      <!-- Device List -->
      <div class="page-body profile-sub-page__body glass-surface--editorial">
        <DeviceManagement :sessions="sessions" :is-loading="isLoading" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ProfileDevicesPage' })

import { computed, onMounted } from 'vue'
import { Monitor, ShieldCheck, ShieldAlert, Fingerprint, Check } from '@lucide/vue'
import { useSessionManagement } from '@/composables/useSessionManagement'
import DeviceManagement from '@/components/profile/DeviceManagement.vue'
import ProfileSubPageHeader from '@/components/profile/ProfileSubPageHeader.vue'
import Button from '@/components/ui/Button.vue'

const { sessions, isLoading, otherSessionsCount, fetchSessions, revokeAllOthers } =
  useSessionManagement()

const sessionCount = computed(() => sessions.value.length)
const trustedCount = computed(() => sessions.value.filter((s) => s.is_trusted).length)

onMounted(() => {
  fetchSessions()
})

function handleRevokeAll() {
  revokeAllOthers()
}
</script>

<style scoped>
.devices-page {
  min-height: 100dvh;
  min-height: 100svh;
  padding: clamp(1rem, 3vw, 1.5rem) 0;
}

/* ===== Security Strip ===== */
.security-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: clamp(0.5rem, 1.5vw, 0.75rem);
  margin-bottom: clamp(1rem, 2.5vw, 1.5rem);
}

.security-card {
  display: flex;
  align-items: center;
  gap: clamp(0.5rem, 1.5vw, 0.75rem);
  padding: clamp(0.75rem, 2vw, 1rem);
  border-radius: var(--profile-section-radius);
  border: 1px solid var(--profile-surface-border);
  background: var(--profile-surface-bg-soft);
  box-shadow: var(--profile-surface-shadow);
  transition:
    border-color var(--duration-fast) var(--ease-smooth),
    box-shadow var(--duration-fast) var(--ease-smooth),
    transform var(--duration-fast) var(--ease-bounce-soft);
}

.security-card:hover {
  border-color: var(--profile-surface-border-strong);
  box-shadow: var(--profile-surface-shadow-hover);
}

.security-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--profile-muted-border);
  flex-shrink: 0;
  transition: transform var(--duration-fast) var(--ease-bounce-soft);
}

.security-card:hover .security-icon {
  transform: scale(1.1);
}

.security-icon--devices {
  background: rgba(var(--color-primary-rgb), 0.1);
  color: var(--color-primary);
}

.security-icon--trusted {
  background: rgba(var(--color-success-rgb), 0.1);
  color: var(--color-success);
}

.security-icon--current {
  background: rgba(var(--color-primary-rgb), 0.1);
  color: var(--color-primary);
}

.security-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.security-number {
  font-size: clamp(var(--text-lg), 2.5vw, var(--text-xl));
  font-weight: var(--font-bold);
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-primary);
}

.security-number--ok {
  display: inline-flex;
  align-items: center;
  color: var(--color-success);
}

.security-label {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ===== Page Body ===== */
.page-body {
  padding: clamp(1rem, 3vw, 1.5rem);
  border-radius: var(--profile-shell-radius);
  border: 1px solid var(--profile-surface-border);
  background: var(--profile-surface-bg);
  box-shadow: var(--profile-surface-shadow);
}

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .security-icon {
    width: 2rem;
    height: 2rem;
  }

  .security-number {
    font-size: var(--text-base);
  }
}

@media (max-width: 480px) {
  .security-strip {
    grid-template-columns: 1fr;
  }

  .security-card {
    flex-direction: row;
  }
}
</style>

<style>
/* ===== Material 3 Overrides ===== */
#app[data-preset='material-calm'] .devices-page .security-card,
#app[data-preset='sketch-doodle'] .devices-page .security-card {
  border-radius: var(--radius-lg);
}

#app[data-preset='material-calm'] .devices-page .security-icon,
#app[data-preset='sketch-doodle'] .devices-page .security-icon {
  border-radius: var(--radius-md);
}

#app[data-preset='material-calm'] .devices-page .page-body,
#app[data-preset='sketch-doodle'] .devices-page .page-body {
  border-radius: var(--radius-lg);
}

/* ===== Dark Theme ===== */
[data-color-mode='dark'] .devices-page .security-icon--devices {
  background: rgba(var(--color-primary-rgb), 0.15);
}

[data-color-mode='dark'] .devices-page .security-icon--trusted {
  background: rgba(var(--color-success-rgb), 0.15);
}

/* ===== Blue Theme ===== */
#app[data-preset='gradient-narrative'][data-color-mode='light']
  .devices-page
  .security-icon--devices {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

#app[data-preset='gradient-narrative'][data-color-mode='light']
  .devices-page
  .security-icon--current {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

#app[data-preset='gradient-narrative'][data-color-mode='light'] .devices-page .security-number--ok {
  color: #3b82f6;
}

/* ===== Material + Dark ===== */
#app[data-preset='material-calm'][data-color-mode='dark'] .devices-page .security-card,
#app[data-preset='sketch-doodle'][data-color-mode='dark'] .devices-page .security-card {
  background: var(--md-surface-container, rgba(28, 28, 32, 0.92));
  border-color: rgba(255, 255, 255, 0.06);
}

#app[data-preset='material-calm'][data-color-mode='dark'] .devices-page .page-body,
#app[data-preset='sketch-doodle'][data-color-mode='dark'] .devices-page .page-body {
  background: var(--md-surface-container, rgba(28, 28, 32, 0.92));
  border-color: rgba(255, 255, 255, 0.06);
}
</style>
