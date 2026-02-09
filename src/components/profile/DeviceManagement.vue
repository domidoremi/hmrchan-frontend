<script setup lang="ts">
import { onMounted } from 'vue'
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

const { t } = useI18n()

// Session management
const {
  sessions,
  isLoading,
  isRevoking,
  otherSessionsCount,
  fetchSessions,
  revokeSession,
  revokeAllOthers,
  toggleTrust,
  updateDeviceName,
} = useSessionManagement()

// Device name editing
const { editingSessionId, editingDeviceName, startEditing, cancelEditing } = useDeviceNameEditor()

onMounted(() => {
  fetchSessions()
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
    <div class="device-header">
      <h2>{{ t('devices.title') }}</h2>
      <p class="device-description">{{ t('devices.description') }}</p>
    </div>

    <div v-if="otherSessionsCount > 0" class="revoke-all-section">
      <button class="btn-revoke-all" :disabled="isRevoking" @click="revokeAllOthers">
        <AnimatedIcon name="sparkle" :fallback-icon="Trash2" size="md" />
        {{ t('devices.revokeAll') }}
      </button>
    </div>

    <div v-if="isLoading" class="device-loading">
      <div class="skeleton-card" v-for="i in 3" :key="i"></div>
    </div>

    <div v-else class="device-list">
      <div
        v-for="session in sessions"
        :key="session.id"
        class="device-card"
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
  margin: 0;
  padding: 2rem;
}

.device-header {
  margin-bottom: 2rem;
}

.device-header h2 {
  font-size: 1.75rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--color-text-primary);
}

.device-description {
  color: var(--color-text-secondary);
  font-size: 0.95rem;
}

.revoke-all-section {
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: flex-end;
}

.btn-revoke-all {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: var(--color-error);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-revoke-all:hover:not(:disabled) {
  background: var(--color-error-hover);
  transform: translateY(-1px);
}

.btn-revoke-all:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.device-loading {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.skeleton-card {
  height: 150px;
  background: var(--glass-bg-light);
  border-radius: 12px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.device-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.device-card {
  display: flex;
  gap: 1.25rem;
  padding: 1.5rem;
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  transition: all 0.2s;
}

.device-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.device-card.is-current {
  border-color: var(--color-primary);
  background: var(--glass-bg-strong);
}

.device-icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary-alpha);
  border-radius: 10px;
  color: var(--color-primary);
}

.device-info {
  flex: 1;
  min-width: 0;
}

.device-name-row {
  margin-bottom: 0.5rem;
}

.device-name-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.device-name-display h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.badge-current {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 4px;
}

.badge-trusted {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: rgba(var(--color-success-rgb), 0.1);
  color: var(--color-success);
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 4px;
}

.btn-edit {
  padding: 0.25rem;
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-edit:hover {
  background: var(--glass-bg-light);
  color: var(--color-primary);
}

.device-name-edit {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.device-name-input {
  flex: 1;
  padding: 0.5rem;
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
  border-radius: 6px;
  color: var(--color-text-primary);
  font-size: 0.95rem;
}

.device-name-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.btn-icon {
  padding: 0.5rem;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background: var(--color-glass-bg-hover);
  border-color: var(--color-primary);
}

.device-details {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
}

.device-details--empty {
  color: var(--color-text-tertiary);
  font-style: italic;
}

.device-meta {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
}

.meta-item.warning {
  color: var(--color-warning);
}

.device-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex-shrink: 0;
}

.btn-trust,
.btn-revoke {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-trust {
  background: transparent;
  color: var(--color-text-primary);
}

.btn-trust:hover {
  background: rgba(var(--color-success-rgb), 0.1);
  border-color: var(--color-success);
  color: var(--color-success);
}

.btn-trust.trusted {
  background: rgba(var(--color-success-rgb), 0.1);
  border-color: var(--color-success);
  color: var(--color-success);
}

.btn-revoke {
  background: transparent;
  color: var(--color-error);
  border-color: rgba(var(--color-error-rgb), 0.3);
}

.btn-revoke:hover {
  background: var(--color-error);
  color: white;
}

@media (max-width: 768px) {
  .device-management {
    padding: 1rem;
  }

  .device-card {
    flex-direction: column;
    gap: 1rem;
  }

  .device-actions {
    flex-direction: row;
  }

  .btn-trust,
  .btn-revoke {
    flex: 1;
  }
}
</style>
