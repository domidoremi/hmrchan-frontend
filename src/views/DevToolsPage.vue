<template>
  <MainLayout>
    <div class="dev-tools-page">
      <div class="page-header">
        <button class="back-button" @click="router.back()">
          <ArrowLeft :size="20" />
          {{ $t('common.back', 'Back') }}
        </button>
        <h1>🛠️ Developer Tools</h1>
        <p>Toast测试 & 错误监控面板</p>
      </div>

      <!-- Input Component Showcase -->
      <section class="tool-section glass-card">
        <h2>
          <Type :size="24" />
          Input Component Showcase
        </h2>
        <p style="margin-bottom: var(--spacing-4); color: var(--color-text-secondary)">
          Enhanced Input component with label, error, hint, clearable, and character count features
        </p>

        <div class="input-showcase-grid">
          <div class="showcase-item">
            <h3>Basic Input with Label</h3>
            <GlassInput v-model="inputDemos.basic" label="Username" placeholder="Enter your username" :icon="User"
              clearable />
          </div>

          <div class="showcase-item">
            <h3>Input with Error</h3>
            <GlassInput v-model="inputDemos.withError" label="Email Address" type="email" placeholder="your@email.com"
              :icon="Mail" error="Please enter a valid email address" required />
          </div>

          <div class="showcase-item">
            <h3>Input with Hint</h3>
            <GlassInput v-model="inputDemos.withHint" label="Password" type="password" placeholder="Enter password"
              :icon="Lock" hint="Password must be at least 8 characters" clearable />
          </div>

          <div class="showcase-item">
            <h3>Input with Character Count</h3>
            <GlassInput v-model="inputDemos.withCount" label="Bio" placeholder="Tell us about yourself" :maxLength="100"
              :showCount="true" clearable />
          </div>

          <div class="showcase-item">
            <h3>Number Input</h3>
            <GlassInput v-model="inputDemos.number" type="number" label="Age" placeholder="Enter your age" :icon="Hash"
              clearable />
          </div>

          <div class="showcase-item">
            <h3>Tel Input</h3>
            <GlassInput v-model="inputDemos.tel" type="tel" label="Phone Number" placeholder="+1 (555) 000-0000"
              :icon="Phone" clearable />
          </div>

          <div class="showcase-item">
            <h3>URL Input</h3>
            <GlassInput v-model="inputDemos.url" type="url" label="Website" placeholder="https://example.com"
              :icon="Globe" hint="Enter a valid URL starting with http:// or https://" clearable />
          </div>

          <div class="showcase-item">
            <h3>Disabled Input</h3>
            <GlassInput v-model="inputDemos.disabled" label="Disabled Field" placeholder="This field is disabled"
              :disabled="true" />
          </div>

          <div class="showcase-item">
            <h3>Readonly Input</h3>
            <GlassInput v-model="inputDemos.readonly" label="Readonly Field" placeholder="This field is readonly"
              :readonly="true" />
          </div>

          <div class="showcase-item">
            <h3>Input with Prefix</h3>
            <GlassInput v-model="inputDemos.withPrefix" label="Price" placeholder="0.00" prefix="$" clearable />
          </div>

          <div class="showcase-item">
            <h3>Input with Suffix</h3>
            <GlassInput v-model="inputDemos.withSuffix" label="Weight" placeholder="0" suffix="kg" clearable />
          </div>

          <div class="showcase-item">
            <h3>Search Input</h3>
            <GlassInput v-model="inputDemos.search" type="search" label="Search" placeholder="Search..." :icon="Search"
              clearable />
          </div>
        </div>
      </section>

      <!-- Toast测试区域 -->
      <section class="tool-section glass-card">
        <h2>
          <Bell :size="24" />
          Toast 通知测试
        </h2>

        <div class="toast-test-grid">
          <div class="toast-test-card">
            <h3>Success Toast</h3>
            <button class="btn success" @click="testSuccess">
              <CheckCircle :size="18" />
              Test Success
            </button>
          </div>

          <div class="toast-test-card">
            <h3>Error Toast</h3>
            <button class="btn error" @click="testError">
              <XCircle :size="18" />
              Test Error
            </button>
          </div>

          <div class="toast-test-card">
            <h3>Warning Toast</h3>
            <button class="btn warning" @click="testWarning">
              <AlertTriangle :size="18" />
              Test Warning
            </button>
          </div>

          <div class="toast-test-card">
            <h3>Info Toast</h3>
            <button class="btn info" @click="testInfo">
              <Info :size="18" />
              Test Info
            </button>
          </div>
        </div>

        <div class="toast-advanced">
          <h3>Advanced Tests</h3>
          <div class="button-group">
            <button class="btn" @click="testMultiple">Multiple Toasts</button>
            <button class="btn" @click="testLongMessage">Long Message</button>
            <button class="btn" @click="testWithTitle">With Title</button>
            <button class="btn" @click="testCustomDuration">Custom Duration (10s)</button>
          </div>
        </div>
      </section>

      <!-- 错误监控面板 -->
      <section class="tool-section glass-card">
        <div class="section-header">
          <h2>
            <Activity :size="24" />
            错误监控面板
          </h2>
          <div class="header-actions">
            <button class="btn-small" @click="refreshStats">
              <RotateCcw :size="16" />
              Refresh
            </button>
            <button class="btn-small" @click="clearLogs">
              <Trash2 :size="16" />
              Clear
            </button>
            <button class="btn-small" @click="exportLogs">
              <Download :size="16" />
              Export
            </button>
          </div>
        </div>

        <!-- Statistics -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Total Errors</div>
            <div class="stat-value error">{{ stats.total }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Errors</div>
            <div class="stat-value">{{ stats.byType.error || 0 }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Warnings</div>
            <div class="stat-value">{{ stats.byType.warning || 0 }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Info</div>
            <div class="stat-value">{{ stats.byType.info || 0 }}</div>
          </div>
        </div>

        <!-- Error Logs -->
        <div class="logs-container">
          <h3>Recent Errors ({{ stats.recent.length }} / {{ stats.total }})</h3>

          <div v-if="stats.recent.length === 0" class="empty-state">
            <CheckCircle :size="48" />
            <p>No errors logged yet! 🎉</p>
          </div>

          <div v-else class="logs-list">
            <div v-for="log in stats.recent" :key="log.id" :class="['log-item', `log-${log.type}`]">
              <div class="log-header">
                <div class="log-type">
                  <AlertCircle v-if="log.type === 'error'" :size="16" />
                  <AlertTriangle v-else-if="log.type === 'warning'" :size="16" />
                  <Info v-else :size="16" />
                  <span>{{ log.type.toUpperCase() }}</span>
                </div>
                <div class="log-time">{{ formatTime(log.timestamp) }}</div>
              </div>

              <div class="log-content">
                <div class="log-context">
                  <Code :size="14" />
                  {{ log.context }}
                </div>
                <div class="log-message">{{ log.message }}</div>
                <div v-if="log.code" class="log-code">Code: {{ log.code }}</div>
                <div v-if="log.status" class="log-status">HTTP {{ log.status }}</div>
              </div>

              <button class="log-expand" @click="toggleDetails(log.id)">
                <ChevronDown :size="16" :class="{ rotated: expandedLogs.has(log.id) }" />
              </button>

              <div v-if="expandedLogs.has(log.id)" class="log-details">
                <div class="detail-row"><strong>URL:</strong> {{ log.url }}</div>
                <div class="detail-row"><strong>User Agent:</strong> {{ log.userAgent }}</div>
                <div v-if="log.stack" class="detail-row">
                  <strong>Stack:</strong>
                  <pre>{{ log.stack }}</pre>
                </div>
                <div v-if="log.details" class="detail-row">
                  <strong>Details:</strong>
                  <pre>{{ JSON.stringify(log.details, null, 2) }}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Context Breakdown -->
        <div class="context-breakdown">
          <h3>Errors by Context</h3>
          <div class="context-list">
            <div v-for="(count, context) in stats.byContext" :key="context" class="context-item">
              <span class="context-name">{{ context }}</span>
              <span class="context-count">{{ count }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Error Simulator -->
      <section class="tool-section glass-card">
        <h2>
          <Zap :size="24" />
          错误模拟器
        </h2>
        <p>测试错误处理系统</p>

        <div class="simulator-grid">
          <button class="sim-btn" @click="simulateNetworkError">
            <Wifi :size="18" />
            Network Error
          </button>
          <button class="sim-btn" @click="simulate404">
            <FileQuestion :size="18" />
            404 Not Found
          </button>
          <button class="sim-btn" @click="simulate500">
            <Server :size="18" />
            500 Server Error
          </button>
          <button class="sim-btn" @click="simulateJSError">
            <Bug :size="18" />
            JavaScript Error
          </button>
          <button class="sim-btn" @click="simulateUnauthorized">
            <ShieldAlert :size="18" />
            401 Unauthorized
          </button>
          <button class="sim-btn" @click="simulateForbidden">
            <Ban :size="18" />
            403 Forbidden
          </button>
        </div>
      </section>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeft,
  Bell,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Activity,
  RotateCcw,
  Trash2,
  Download,
  ChevronDown,
  Code,
  Zap,
  Wifi,
  FileQuestion,
  Server,
  Bug,
  ShieldAlert,
  Ban,
  Type,
  User,
  Mail,
  Lock,
  Hash,
  Phone,
  Globe,
  Search,
} from 'lucide-vue-next'

import MainLayout from '@/components/layout/MainLayout.vue'
import GlassInput from '@/components/form/Input.vue'
import { useToastStore } from '@/stores/toast'
import { errorMonitor } from '@/utils/errorMonitor'
import { useErrorHandler } from '@/utils/errorHandler'

const router = useRouter()
const toastStore = useToastStore()
const { handleError } = useErrorHandler('DevTools')

// Input component demo data
const inputDemos = ref({
  basic: '',
  withError: 'invalid-email',
  withHint: '',
  withCount: '',
  number: 0,
  tel: '',
  url: '',
  disabled: 'This is disabled',
  readonly: 'This is readonly',
  withPrefix: '',
  withSuffix: '',
  search: '',
})

const stats = ref({
  total: 0,
  byType: {} as Record<string, number>,
  byContext: {} as Record<string, number>,
  recent: [] as Array<{
    id: string
    timestamp: number
    type: string
    context: string
    message: string
    code?: string
    status?: number
    url: string
    userAgent: string
    stack?: string
    details?: unknown
  }>,
})
const expandedLogs = ref(new Set<string>())

// Toast测试
const testSuccess = () => {
  toastStore.success('Operation completed successfully!')
}

const testError = () => {
  toastStore.error('Something went wrong!')
}

const testWarning = () => {
  toastStore.warning('Please check your input')
}

const testInfo = () => {
  toastStore.info('New features are available')
}

const testMultiple = () => {
  toastStore.success('First notification')
  setTimeout(() => toastStore.info('Second notification'), 500)
  setTimeout(() => toastStore.warning('Third notification'), 1000)
}

const testLongMessage = () => {
  toastStore.error(
    'This is a very long error message that demonstrates how the toast component handles lengthy text content. It should wrap properly and remain readable even with lots of information.',
    'Long Message Test',
  )
}

const testWithTitle = () => {
  toastStore.success('Your profile has been updated with the new information', 'Profile Updated')
}

const testCustomDuration = () => {
  toastStore.info('This message will stay for 10 seconds', 'Long Duration', 10000)
}

// 错误监控
const refreshStats = () => {
  stats.value = errorMonitor.getStats()
}

const clearLogs = () => {
  if (confirm('Clear all error logs?')) {
    errorMonitor.clear()
    refreshStats()
    toastStore.success('Error logs cleared')
  }
}

const exportLogs = () => {
  const json = errorMonitor.export()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `error-logs-${new Date().toISOString()}.json`
  a.click()
  URL.revokeObjectURL(url)
  toastStore.success('Logs exported successfully')
}

const toggleDetails = (id: string) => {
  if (expandedLogs.value.has(id)) {
    expandedLogs.value.delete(id)
  } else {
    expandedLogs.value.add(id)
  }
}

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// 错误模拟
const simulateNetworkError = () => {
  const mockError = {
    isAxiosError: true,
    response: null,
  }
  handleError(mockError, { customMessage: 'Simulated network error' })
}

const simulate404 = () => {
  const mockError = {
    isAxiosError: true,
    response: { status: 404, data: {} },
  }
  handleError(mockError)
}

const simulate500 = () => {
  const mockError = {
    isAxiosError: true,
    response: { status: 500, data: { message: 'Internal server error' } },
  }
  handleError(mockError)
}

const simulateJSError = () => {
  handleError(new Error('Simulated JavaScript error'), {
    customMessage: 'A JavaScript error occurred',
  })
}

const simulateUnauthorized = () => {
  const mockError = {
    isAxiosError: true,
    response: { status: 401, data: {} },
  }
  handleError(mockError)
}

const simulateForbidden = () => {
  const mockError = {
    isAxiosError: true,
    response: { status: 403, data: {} },
  }
  handleError(mockError)
}

// 初始化
onMounted(() => {
  refreshStats()

  // 监听新错误
  errorMonitor.addListener(() => {
    refreshStats()
  })
})
</script>

<style scoped>
.dev-tools-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-6);
}

.page-header {
  margin-bottom: var(--spacing-8);
}

.page-header h1 {
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  margin: var(--spacing-4) 0 var(--spacing-2);
}

.page-header p {
  color: var(--color-text-secondary);
  font-size: var(--text-lg);
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-4);
  background: transparent;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  color: var(--color-text-secondary);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.back-button:hover {
  background: rgba(139, 92, 246, 0.1);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.tool-section {
  margin-bottom: var(--spacing-6);
  padding: var(--spacing-6);
}

.tool-section h2 {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-4);
  color: var(--color-text-primary);
}

.input-showcase-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-6);
  margin-top: var(--spacing-4);
}

.showcase-item h3 {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-3);
}

.toast-test-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-6);
}

.toast-test-card {
  text-align: center;
}

.toast-test-card h3 {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-2);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-6);
  border-radius: var(--radius-lg);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: none;
  width: 100%;
}

.btn.success {
  background: var(--color-success);
  color: white;
}

.btn.error {
  background: var(--color-error);
  color: white;
}

.btn.warning {
  background: var(--color-warning);
  color: white;
}

.btn.info {
  background: var(--color-primary);
  color: white;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.toast-advanced {
  padding-top: var(--spacing-4);
  border-top: 1px solid var(--glass-border);
}

.button-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-3);
  margin-top: var(--spacing-3);
}

.button-group .btn {
  width: auto;
  background: var(--glass-bg);
  color: var(--color-text-primary);
  border: 1px solid var(--glass-border);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-4);
}

.header-actions {
  display: flex;
  gap: var(--spacing-2);
}

.btn-small {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-2) var(--spacing-3);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-small:hover {
  background: rgba(139, 92, 246, 0.1);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-6);
}

.stat-card {
  padding: var(--spacing-4);
  background: rgba(0, 0, 0, 0.02);
  border-radius: var(--radius-lg);
  text-align: center;
}

[data-theme='dark'] .stat-card {
  background: rgba(255, 255, 255, 0.02);
}

.stat-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-1);
}

.stat-value {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-primary);
}

.stat-value.error {
  color: var(--color-error);
}

.logs-container {
  margin: var(--spacing-6) 0;
}

.logs-container h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-3);
}

.empty-state {
  text-align: center;
  padding: var(--spacing-8);
  color: var(--color-text-tertiary);
}

.empty-state svg {
  color: var(--color-success);
  margin-bottom: var(--spacing-2);
}

.logs-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.log-item {
  position: relative;
  padding: var(--spacing-4);
  background: rgba(0, 0, 0, 0.02);
  border-left: 4px solid;
  border-radius: var(--radius-md);
}

[data-theme='dark'] .log-item {
  background: rgba(255, 255, 255, 0.02);
}

.log-item.log-error {
  border-left-color: var(--color-error);
}

.log-item.log-warning {
  border-left-color: var(--color-warning);
}

.log-item.log-info {
  border-left-color: var(--color-primary);
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-2);
}

.log-type {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  text-transform: uppercase;
}

.log-time {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.log-content {
  margin-bottom: var(--spacing-2);
}

.log-context {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  margin-bottom: var(--spacing-1);
}

.log-message {
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  margin: var(--spacing-1) 0;
}

.log-code,
.log-status {
  display: inline-block;
  padding: var(--spacing-1) var(--spacing-2);
  background: rgba(0, 0, 0, 0.05);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-family: monospace;
  margin-right: var(--spacing-2);
}

.log-expand {
  position: absolute;
  top: var(--spacing-4);
  right: var(--spacing-4);
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-tertiary);
  transition: transform var(--transition-fast);
}

.log-expand svg.rotated {
  transform: rotate(180deg);
}

.log-details {
  margin-top: var(--spacing-3);
  padding-top: var(--spacing-3);
  border-top: 1px solid var(--glass-border);
}

.detail-row {
  margin-bottom: var(--spacing-2);
  font-size: var(--text-sm);
}

.detail-row strong {
  color: var(--color-text-secondary);
}

.detail-row pre {
  margin-top: var(--spacing-1);
  padding: var(--spacing-2);
  background: rgba(0, 0, 0, 0.05);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  overflow-x: auto;
}

.context-breakdown {
  margin-top: var(--spacing-6);
  padding-top: var(--spacing-6);
  border-top: 1px solid var(--glass-border);
}

.context-breakdown h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-3);
}

.context-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.context-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-2) var(--spacing-3);
  background: rgba(0, 0, 0, 0.02);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
}

.context-count {
  font-weight: var(--font-semibold);
  color: var(--color-primary);
}

.simulator-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--spacing-3);
  margin-top: var(--spacing-4);
}

.sim-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-4);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  font-weight: var(--font-medium);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.sim-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: var(--color-error);
  color: var(--color-error);
  transform: translateY(-2px);
}

@media (max-width: 768px) {
  .dev-tools-page {
    padding: var(--spacing-4);
  }

  .toast-test-grid,
  .simulator-grid {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
