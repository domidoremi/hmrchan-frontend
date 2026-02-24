<script setup lang="ts">
import { onMounted, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  MapPin,
  Clock,
  AlertTriangle,
  Shield,
  ShieldOff,
  Trash2,
  Edit2,
  Check,
  X,
  Info,
  Calendar,
  Hash,
} from 'lucide-vue-next'
import { useSessionManagement } from '@/composables/useSessionManagement'
import { useDeviceNameEditor } from '@/composables/useDeviceNameEditor'
import { getDeviceIcon, formatRelativeTime } from '@/utils/deviceHelpers'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import type { Device } from '@/api'

const props = defineProps<{
  sessions?: Device[]
  isLoading?: boolean
}>()

const { t } = useI18n()

const ownSession = useSessionManagement()

// If sessions are provided externally, use them; otherwise use own fetch
const sessions = props.sessions !== undefined ? toRef(props, 'sessions') : ownSession.sessions
const isLoading = props.isLoading !== undefined ? toRef(props, 'isLoading') : ownSession.isLoading

const { revokeSession, toggleTrust, updateDeviceName } = ownSession

const { editingSessionId, editingDeviceName, startEditing, cancelEditing } = useDeviceNameEditor()

onMounted(() => {
  // Only fetch if no external sessions provided
  if (props.sessions === undefined) {
    ownSession.fetchSessions()
  }
})

async function saveDeviceName(sessionId: number) {
  const success = await updateDeviceName(sessionId, editingDeviceName.value)
  if (success) {
    cancelEditing()
  }
}

function formatDate(dateString?: string | null): string {
  return formatRelativeTime(dateString, t)
}

function getDeviceDisplayName(session: Device): string {
  if (session.device_name) return session.device_name
  if (session.device_info) return session.device_info
  const browser = session.device_browser ?? session.browser ?? ''
  const os = session.device_os ?? session.os ?? ''
  if (browser && os) return `${browser} on ${os}`
  if (browser) return browser
  if (os) return os
  return t('devices.unknownDevice')
}

function getDeviceDetails(session: Device): string {
  const browser = session.device_browser ?? session.browser ?? ''
  const os = session.device_os ?? session.os ?? ''
  const details = [browser, os].filter(Boolean).join(' · ')
  if (details) return details
  if (session.device_info) return session.device_info
  return t('devices.unknownDevice')
}

function hasDeviceDetails(session: Device): boolean {
  const browser = session.device_browser ?? session.browser ?? ''
  const os = session.device_os ?? session.os ?? ''
  return Boolean(browser || os || session.device_info)
}

function getLastActiveAt(session: Device): string | null | undefined {
  return session.last_active_at ?? session.last_used_at ?? session.last_login_at
}

function getLocationText(session: Device): string {
  const ip = session.ip_address ?? session.last_ip ?? ''
  const location = session.city
    ? `${session.city}${session.country ? `, ${session.country}` : ''}`
    : (session.country ?? '')
  if (ip && location) return `${ip} · ${location}`
  return ip || location
}
</script>

<template>
  <div class="device-management">
    <div v-if="isLoading" class="device-loading">
      <div v-for="i in 3" :key="i" class="skeleton-card" />
    </div>

    <div v-else class="device-list">
      <div
        v-for="session in sessions"
        :key="session.id"
        class="device-card glass-card-enhanced"
        :class="{ 'is-current': session.is_current }"
      >
        <div class="device-icon">
          <AnimatedIcon
            name="explore"
            :fallback-icon="getDeviceIcon(session.device_type)"
            size="xl"
          />
        </div>

        <div class="device-info">
          <div class="device-name-row">
            <div v-if="editingSessionId === session.id" class="device-name-edit">
              <input
                v-model="editingDeviceName"
                type="text"
                class="device-name-input"
                :placeholder="t('devices.namePlaceholder')"
                @keyup.enter="saveDeviceName(session.id)"
                @keyup.esc="cancelEditing"
              />
              <button class="btn-icon" @click="saveDeviceName(session.id)">
                <AnimatedIcon name="sparkle" :fallback-icon="Check" size="sm" />
              </button>
              <button class="btn-icon" @click="cancelEditing">
                <AnimatedIcon name="sparkle" :fallback-icon="X" size="sm" />
              </button>
            </div>
            <div v-else class="device-name-display">
              <h3>
                {{ getDeviceDisplayName(session) }}
                <span v-if="session.is_current" class="badge-current">
                  {{ t('devices.currentDevice') }}
                </span>
                <span v-if="session.is_trusted" class="badge-trusted">
                  <AnimatedIcon name="sparkle" :fallback-icon="Shield" size="sm" />
                  {{ t('devices.trusted') }}
                </span>
              </h3>
              <button class="btn-edit" @click="startEditing(session)">
                <AnimatedIcon name="explore" :fallback-icon="Edit2" size="sm" />
              </button>
            </div>
          </div>

          <p
            class="device-details"
            :class="{ 'device-details--empty': !hasDeviceDetails(session) }"
          >
            {{ getDeviceDetails(session) }}
          </p>

          <div class="device-meta">
            <div v-if="getLocationText(session)" class="meta-item">
              <AnimatedIcon name="explore" :fallback-icon="MapPin" size="sm" />
              <span>{{ getLocationText(session) }}</span>
            </div>
            <div class="meta-item">
              <AnimatedIcon name="explore" :fallback-icon="Clock" size="sm" />
              <span>{{ t('devices.lastActive') }}: {{ formatDate(getLastActiveAt(session)) }}</span>
            </div>
            <div v-if="session.last_login_at" class="meta-item">
              <AnimatedIcon name="explore" :fallback-icon="Clock" size="sm" />
              <span>{{ t('devices.lastLogin') }}: {{ formatDate(session.last_login_at) }}</span>
            </div>
            <div v-if="session.first_seen_at" class="meta-item">
              <AnimatedIcon name="explore" :fallback-icon="Calendar" size="sm" />
              <span>{{ t('devices.firstSeen') }}: {{ formatDate(session.first_seen_at) }}</span>
            </div>
            <div
              v-if="session.login_count !== null && session.login_count !== undefined"
              class="meta-item"
            >
              <AnimatedIcon name="explore" :fallback-icon="Hash" size="sm" />
              <span>{{ t('devices.loginCount') }}: {{ session.login_count }}</span>
            </div>
            <div v-if="session.device_info" class="meta-item">
              <AnimatedIcon name="explore" :fallback-icon="Info" size="sm" />
              <span>{{ t('devices.deviceInfo') }}: {{ session.device_info }}</span>
            </div>
            <div
              v-if="session.ip_change_count && session.ip_change_count > 5"
              class="meta-item warning"
            >
              <AnimatedIcon name="sparkle" :fallback-icon="AlertTriangle" size="sm" />
              <span>
                {{ t('devices.ipChangeWarning', { count: session.ip_change_count }) }}
              </span>
            </div>
          </div>
        </div>

        <div v-if="!session.is_current" class="device-actions">
          <button
            class="btn-trust"
            :class="{ trusted: session.is_trusted }"
            @click="toggleTrust(session)"
          >
            <AnimatedIcon
              name="sparkle"
              :fallback-icon="session.is_trusted ? ShieldOff : Shield"
              size="md"
            />
            {{ session.is_trusted ? t('devices.untrust') : t('devices.trust') }}
          </button>
          <button class="btn-revoke" @click="revokeSession(session.id)">
            <AnimatedIcon name="sparkle" :fallback-icon="Trash2" size="md" />
            {{ t('devices.revoke') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.device-management {
  max-width: 100%;
}

/* Loading Skeleton */
.device-loading {
  display: grid;
  gap: clamp(0.625rem, 1.5vw, 0.875rem);
}

.skeleton-card {
  height: 8rem;
  background: var(--glass-bg-light);
  border-radius: var(--radius-lg);
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
  background: linear-gradient(
    90deg,
    var(--glass-bg-light) 25%,
    var(--glass-bg-medium) 50%,
    var(--glass-bg-light) 75%
  );
  background-size: 200% 100%;
}

@keyframes skeleton-shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

/* Device List */
.device-list {
  display: grid;
  gap: clamp(0.625rem, 1.5vw, 0.875rem);
}

.device-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: clamp(0.75rem, 2vw, 1rem);
  padding: clamp(0.875rem, 2.5vw, 1.25rem);
  border-left: 3px solid transparent;
  transition:
    border-color var(--duration-fast) var(--ease-smooth),
    transform var(--duration-normal) var(--ease-out-smooth),
    box-shadow var(--duration-normal) var(--ease-out-smooth);
}

.device-card.is-current {
  border-left-color: var(--color-primary);
  background: var(--glass-bg-ultra-light);
}

.device-card:not(.is-current):hover {
  border-left-color: var(--glass-border-medium);
}

/* Device Icon */
.device-icon {
  flex-shrink: 0;
  width: 2.75rem;
  height: 2.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--color-primary-rgb), 0.06);
  border-radius: var(--radius-lg);
  color: var(--color-primary);
  transition: transform var(--duration-fast) var(--ease-bounce-soft);
}

.device-card:hover .device-icon {
  transform: scale(1.05);
}

/* Device Info */
.device-info {
  min-width: 0;
}

.device-name-row {
  margin-bottom: var(--spacing-1);
}

.device-name-display {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.device-name-display h3 {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  flex-wrap: wrap;
  margin: 0;
}

.badge-current {
  display: inline-flex;
  align-items: center;
  padding: 0.0625rem 0.375rem;
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-size: 0.625rem;
  font-weight: var(--font-bold);
  border-radius: var(--radius-sm);
  letter-spacing: 0.02em;
}

.badge-trusted {
  display: inline-flex;
  align-items: center;
  gap: 0.125rem;
  padding: 0.0625rem 0.375rem;
  background: rgba(var(--color-success-rgb), 0.1);
  color: var(--color-success);
  font-size: 0.625rem;
  font-weight: var(--font-medium);
  border-radius: var(--radius-sm);
}

.btn-edit {
  padding: var(--spacing-1);
  background: transparent;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  border-radius: var(--radius-md);
  opacity: 0;
  transition:
    opacity var(--duration-fast) var(--ease-smooth),
    color var(--duration-fast) var(--ease-smooth);
}

.device-card:hover .btn-edit {
  opacity: 1;
}

.btn-edit:hover {
  color: var(--color-primary);
}

/* Name Edit */
.device-name-edit {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.device-name-input {
  flex: 1;
  min-width: 0;
  padding: var(--spacing-1) var(--spacing-2);
  background: var(--glass-bg-medium);
  border: 1px solid var(--glass-border-medium);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--text-sm);
  transition: border-color var(--duration-fast) var(--ease-smooth);
}

.device-name-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.btn-icon {
  padding: var(--spacing-1);
  background: transparent;
  border: 1px solid var(--glass-border-medium);
  border-radius: var(--radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  transition:
    background var(--duration-fast) var(--ease-smooth),
    border-color var(--duration-fast) var(--ease-smooth);
}

.btn-icon:hover {
  background: var(--glass-bg-light);
  border-color: var(--color-primary);
}

/* Device Details & Meta */
.device-details {
  color: var(--color-text-secondary);
  font-size: var(--text-xs);
  margin: 0 0 var(--spacing-2);
}

.device-details--empty {
  color: var(--color-text-tertiary);
  font-style: italic;
}

.device-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-1) var(--spacing-3);
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
}

.meta-item.warning {
  color: var(--color-warning);
}

/* Device Actions */
.device-actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  flex-shrink: 0;
  align-self: center;
}

.btn-trust,
.btn-revoke {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-1);
  padding: var(--spacing-1) var(--spacing-3);
  border: 1px solid var(--glass-border-medium);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  cursor: pointer;
  white-space: nowrap;
  transition:
    background var(--duration-fast) var(--ease-smooth),
    border-color var(--duration-fast) var(--ease-smooth),
    color var(--duration-fast) var(--ease-smooth),
    transform var(--duration-fast) var(--ease-bounce-soft);
}

.btn-trust {
  background: transparent;
  color: var(--color-text-secondary);
}

.btn-trust:hover {
  background: rgba(var(--color-success-rgb), 0.08);
  border-color: var(--color-success);
  color: var(--color-success);
  transform: var(--lift-sm);
}

.btn-trust.trusted {
  background: rgba(var(--color-success-rgb), 0.08);
  border-color: var(--color-success);
  color: var(--color-success);
}

.btn-revoke {
  background: transparent;
  color: var(--color-error);
  border-color: rgba(239, 68, 68, 0.2);
}

.btn-revoke:hover {
  background: var(--color-error);
  color: var(--color-white);
  border-color: var(--color-error);
  transform: var(--lift-sm);
}

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .device-card {
    grid-template-columns: auto 1fr;
    grid-template-rows: auto auto;
  }

  .device-icon {
    width: 2.25rem;
    height: 2.25rem;
  }

  .device-actions {
    grid-column: 1 / -1;
    flex-direction: row;
  }

  .btn-trust,
  .btn-revoke {
    flex: 1;
  }

  .device-name-edit {
    flex-wrap: wrap;
  }

  .btn-edit {
    opacity: 1;
  }

  .device-meta {
    gap: var(--spacing-1) var(--spacing-2);
  }

  .meta-item {
    word-break: break-all;
  }
}
</style>

<style>
/* ===== Material 3 Overrides ===== */
#app[data-ui-style='material'] .device-management .device-card {
  border-radius: 12px;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  background: var(--color-surface, #fff);
  box-shadow: var(--shadow-sm);
  border-left-width: 3px;
}

#app[data-ui-style='material'] .device-management .device-card::before {
  display: none;
}

#app[data-ui-style='material'] .device-management .device-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

#app[data-ui-style='material'] .device-management .device-icon {
  border-radius: 8px;
}

#app[data-ui-style='material'] .device-management .badge-current {
  border-radius: 4px;
}

#app[data-ui-style='material'] .device-management .badge-trusted {
  border-radius: 4px;
}

#app[data-ui-style='material'] .device-management .btn-trust,
#app[data-ui-style='material'] .device-management .btn-revoke {
  border-radius: 8px;
}

#app[data-ui-style='material'] .device-management .btn-icon {
  border-radius: 4px;
}

#app[data-ui-style='material'] .device-management .device-name-input {
  border-radius: 4px;
}

#app[data-ui-style='material'] .device-management .skeleton-card {
  border-radius: 12px;
}

/* ===== Dark Theme ===== */
[data-theme='dark'] .device-management .device-card.is-current {
  background: rgba(var(--color-primary-rgb), 0.06);
}

[data-theme='dark'] .device-management .device-icon {
  background: rgba(var(--color-primary-rgb), 0.1);
}

/* ===== Blue Theme ===== */
[data-theme='blue'] .device-management .device-card.is-current {
  border-left-color: #3b82f6;
  background: rgba(59, 130, 246, 0.04);
}

[data-theme='blue'] .device-management .device-icon {
  background: rgba(59, 130, 246, 0.08);
  color: #3b82f6;
}

[data-theme='blue'] .device-management .badge-current {
  background: #3b82f6;
}

/* ===== Material + Dark ===== */
#app[data-ui-style='material'][data-theme='dark'] .device-management .device-card {
  background: var(--md-surface-container, rgba(28, 28, 32, 0.92));
  border-color: rgba(255, 255, 255, 0.06);
  border-left-color: transparent;
}

#app[data-ui-style='material'][data-theme='dark'] .device-management .device-card.is-current {
  border-left-color: var(--color-primary);
  background: var(--md-surface-container-high, rgba(40, 40, 48, 1));
}

/* ===== Material + Blue ===== */
#app[data-ui-style='material'][data-theme='blue'] .device-management .device-card {
  background: #ffffff;
  border-color: rgba(59, 130, 246, 0.08);
  box-shadow: 0 1px 3px rgba(59, 130, 246, 0.06);
}

#app[data-ui-style='material'][data-theme='blue'] .device-management .device-card.is-current {
  border-left-color: #3b82f6;
  background: rgba(59, 130, 246, 0.03);
}
</style>
