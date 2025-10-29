<template>
  <MainLayout>
    <div class="preferences-page">
      <div class="preferences-header glass-card">
        <button class="back-button glass-button" @click="goBack">
          <ArrowLeft :size="20" />
          {{ $t('common.back') }}
        </button>
        
        <h1>{{ $t('preferences.title') }}</h1>
        <p class="subtitle">{{ $t('preferences.subtitle') }}</p>
      </div>

      <div class="preferences-content">
        <!-- 显示设置 -->
        <section class="preference-section glass-card">
          <h2>
            <Monitor :size="24" />
            {{ $t('preferences.display') }}
          </h2>
          
          <div class="preference-item">
            <div class="item-info">
              <label>{{ $t('preferences.showHeroSection') }}</label>
              <p class="item-description">{{ $t('preferences.showHeroSectionDesc') }}</p>
            </div>
            <label class="toggle-switch">
              <input 
                type="checkbox" 
                :checked="settings.showHeroSection"
                @change="toggleSetting('showHeroSection')"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="preference-item">
            <div class="item-info">
              <label>{{ $t('preferences.enableAnimations') }}</label>
              <p class="item-description">{{ $t('preferences.enableAnimationsDesc') }}</p>
            </div>
            <label class="toggle-switch">
              <input 
                type="checkbox" 
                :checked="settings.enableAnimations"
                @change="toggleSetting('enableAnimations')"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="preference-item">
            <div class="item-info">
              <label>{{ $t('preferences.postsPerPage') }}</label>
              <p class="item-description">{{ $t('preferences.postsPerPageDesc') }}</p>
            </div>
            <select 
              class="select-input"
              :value="settings.postsPerPage"
              @change="updateSetting('postsPerPage', parseInt(($event.target as HTMLSelectElement).value))"
            >
              <option :value="10">10</option>
              <option :value="20">20</option>
              <option :value="30">30</option>
              <option :value="50">50</option>
            </select>
          </div>
        </section>

        <!-- 媒体设置 -->
        <section class="preference-section glass-card">
          <h2>
            <PlayCircle :size="24" />
            {{ $t('preferences.media') }}
          </h2>
          
          <div class="preference-item">
            <div class="item-info">
              <label>{{ $t('preferences.autoPlayVideos') }}</label>
              <p class="item-description">{{ $t('preferences.autoPlayVideosDesc') }}</p>
            </div>
            <label class="toggle-switch">
              <input 
                type="checkbox" 
                :checked="settings.autoPlayVideos"
                @change="toggleSetting('autoPlayVideos')"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="preference-item">
            <div class="item-info">
              <label>{{ $t('preferences.showImagePreviews') }}</label>
              <p class="item-description">{{ $t('preferences.showImagePreviewsDesc') }}</p>
            </div>
            <label class="toggle-switch">
              <input 
                type="checkbox" 
                :checked="settings.showImagePreviews"
                @change="toggleSetting('showImagePreviews')"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </section>

        <!-- 隐私和数据 -->
        <section class="preference-section glass-card">
          <h2>
            <Shield :size="24" />
            {{ $t('preferences.privacy') }}
          </h2>
          
          <div class="preference-item">
            <div class="item-info">
              <label>{{ $t('preferences.analyticsEnabled') }}</label>
              <p class="item-description">{{ $t('preferences.analyticsEnabledDesc') }}</p>
            </div>
            <label class="toggle-switch">
              <input 
                type="checkbox" 
                :checked="settings.analyticsEnabled"
                @change="toggleSetting('analyticsEnabled')"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="preference-item">
            <div class="item-info">
              <label>{{ $t('preferences.performanceCookies') }}</label>
              <p class="item-description">{{ $t('preferences.performanceCookiesDesc') }}</p>
            </div>
            <label class="toggle-switch">
              <input 
                type="checkbox" 
                :checked="settings.performanceCookiesEnabled"
                @change="toggleSetting('performanceCookiesEnabled')"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="preference-item">
            <div class="item-info">
              <label>{{ $t('preferences.personalizedContent') }}</label>
              <p class="item-description">{{ $t('preferences.personalizedContentDesc') }}</p>
            </div>
            <label class="toggle-switch">
              <input 
                type="checkbox" 
                :checked="settings.personalizedContent"
                @change="toggleSetting('personalizedContent')"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="preference-item">
            <div class="item-info">
              <label>{{ $t('preferences.dataCollection') }}</label>
              <p class="item-description">{{ $t('preferences.dataCollectionDesc') }}</p>
            </div>
            <label class="toggle-switch">
              <input 
                type="checkbox" 
                :checked="settings.dataCollection"
                @change="toggleSetting('dataCollection')"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="privacy-note">
            <Info :size="16" />
            <p>
              {{ $t('preferences.privacyNote') }}
              <router-link to="/privacy" class="privacy-link">
                {{ $t('preferences.readPrivacyPolicy') }}
              </router-link>
            </p>
          </div>
        </section>

        <!-- 数据管理 -->
        <section class="preference-section glass-card">
          <h2>
            <Database :size="24" />
            {{ $t('preferences.dataManagement') }}
          </h2>
          
          <div class="data-actions">
            <button @click="exportPreferences" class="action-button">
              <Download :size="18" />
              {{ $t('preferences.exportData') }}
            </button>
            <button @click="showImportDialog" class="action-button">
              <Upload :size="18" />
              {{ $t('preferences.importData') }}
            </button>
            <button @click="resetPreferences" class="action-button danger">
              <RefreshCw :size="18" />
              {{ $t('preferences.resetDefaults') }}
            </button>
          </div>
        </section>
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/stores/settings'
import MainLayout from '@/components/layout/MainLayout.vue'
import {
  ArrowLeft,
  Monitor,
  PlayCircle,
  Shield,
  Database,
  Download,
  Upload,
  RefreshCw,
  Info,
} from 'lucide-vue-next'
import toast from '@/utils/toast'

const router = useRouter()
const { t } = useI18n()
const settingsStore = useSettingsStore()

const settings = computed(() => settingsStore.settings)

const goBack = () => {
  router.back()
}

const toggleSetting = (key: keyof typeof settingsStore.settings) => {
  settingsStore.toggleSetting(key)
  toast.success(t('preferences.settingsSaved'))
}

const updateSetting = (key: keyof typeof settingsStore.settings, value: any) => {
  settingsStore.updateSetting(key, value)
  toast.success(t('preferences.settingsSaved'))
}

const exportPreferences = () => {
  const data = settingsStore.exportSettings()
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'himeri-chan-preferences.json'
  a.click()
  URL.revokeObjectURL(url)
  toast.success(t('preferences.exportSuccess'))
}

const showImportDialog = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'application/json'
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const data = e.target?.result as string
        if (settingsStore.importSettings(data)) {
          toast.success(t('preferences.importSuccess'))
        } else {
          toast.error(t('preferences.importFailed'))
        }
      }
      reader.readAsText(file)
    }
  }
  input.click()
}

const resetPreferences = () => {
  if (confirm(t('preferences.resetConfirm'))) {
    settingsStore.resetSettings()
    toast.success(t('preferences.resetSuccess'))
  }
}
</script>

<style scoped>
.preferences-page {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--spacing-xl);
}

.preferences-header {
  padding: var(--spacing-xl);
  margin-bottom: var(--spacing-xl);
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-md);
  padding: 0.5rem 1rem;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--text-primary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
}

.back-button:hover {
  background: rgba(255, 255, 255, 0.1);
}

.preferences-header h1 {
  font-size: var(--text-3xl);
  font-weight: 700;
  margin-bottom: var(--spacing-xs);
  color: var(--text-primary);
}

.subtitle {
  font-size: var(--text-md);
  color: var(--text-secondary);
}

.preferences-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.preference-section {
  padding: var(--spacing-xl);
}

.preference-section h2 {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--text-xl);
  font-weight: 600;
  margin-bottom: var(--spacing-lg);
  color: var(--text-primary);
}

.preference-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) 0;
  border-bottom: 1px solid var(--glass-border);
}

.preference-item:last-child {
  border-bottom: none;
}

.item-info {
  flex: 1;
  margin-right: var(--spacing-lg);
}

.item-info label {
  display: block;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
}

.item-description {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.5;
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 52px;
  height: 28px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--glass-border);
  transition: 0.3s;
  border-radius: 28px;
}

.toggle-slider:before {
  position: absolute;
  content: '';
  height: 20px;
  width: 20px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: var(--primary-color);
}

input:checked + .toggle-slider:before {
  transform: translateX(24px);
}

/* Select Input */
.select-input {
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--text-primary);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all 0.2s;
}

.select-input:hover {
  border-color: var(--primary-color);
}

.select-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
}

/* Privacy Note */
.privacy-note {
  display: flex;
  gap: var(--spacing-sm);
  align-items: flex-start;
  padding: var(--spacing-md);
  background: rgba(139, 92, 246, 0.1);
  border-radius: var(--radius-md);
  margin-top: var(--spacing-md);
}

.privacy-note p {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.5;
}

.privacy-link {
  color: var(--primary-color);
  text-decoration: underline;
}

.privacy-link:hover {
  color: var(--primary-dark);
}

/* Data Actions */
.data-actions {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.action-button {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: 0.75rem 1.25rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--text-primary);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: var(--text-sm);
}

.action-button:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.action-button.danger {
  color: #ff6b6b;
  border-color: #ff6b6b;
}

.action-button.danger:hover {
  background: rgba(255, 107, 107, 0.1);
}

/* 响应式 */
@media (max-width: 768px) {
  .preferences-page {
    padding: var(--spacing-md);
  }

  .preferences-header {
    padding: var(--spacing-md);
  }

  .preferences-header h1 {
    font-size: var(--text-2xl);
  }

  .preference-section {
    padding: var(--spacing-md);
  }

  .preference-item {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }

  .item-info {
    margin-right: 0;
  }

  .data-actions {
    flex-direction: column;
  }

  .action-button {
    width: 100%;
    justify-content: center;
  }
}
</style>
