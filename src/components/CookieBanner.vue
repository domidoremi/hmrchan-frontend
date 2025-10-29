<template>
  <Transition name="slide-up">
    <div v-if="showBanner" class="cookie-banner glass-card">
      <div class="cookie-content">
        <div class="cookie-icon">🍪</div>

        <div class="cookie-text">
          <h3 class="cookie-title">{{ $t('cookies.title') }}</h3>
          <p class="cookie-description">
            {{ $t('cookies.description') }}
            <router-link to="/privacy" class="privacy-link">
              {{ $t('cookies.learnMore') }}
            </router-link>
          </p>
        </div>

        <div class="cookie-actions">
          <button
            @click="handleCustomize"
            class="btn-customize"
            :aria-label="$t('cookies.customize')"
          >
            {{ $t('cookies.customize') }}
          </button>
          <button @click="handleReject" class="btn-reject" :aria-label="$t('cookies.rejectAll')">
            {{ $t('cookies.rejectAll') }}
          </button>
          <button @click="handleAccept" class="btn-accept" :aria-label="$t('cookies.acceptAll')">
            {{ $t('cookies.acceptAll') }}
          </button>
        </div>
      </div>

      <!-- 自定义设置面板 -->
      <Transition name="fade">
        <div v-if="showCustomize" class="cookie-customize">
          <h4>{{ $t('cookies.customizeTitle') }}</h4>

          <div class="cookie-options">
            <div class="cookie-option">
              <div class="option-header">
                <label class="option-label">
                  <input type="checkbox" :checked="true" disabled />
                  <span class="option-name">{{ $t('cookies.essential') }}</span>
                  <span class="option-badge required">{{ $t('cookies.required') }}</span>
                </label>
              </div>
              <p class="option-description">{{ $t('cookies.essentialDesc') }}</p>
            </div>

            <div class="cookie-option">
              <div class="option-header">
                <label class="option-label">
                  <input type="checkbox" v-model="customPreferences.analyticsEnabled" />
                  <span class="option-name">{{ $t('cookies.analytics') }}</span>
                </label>
              </div>
              <p class="option-description">{{ $t('cookies.analyticsDesc') }}</p>
            </div>

            <div class="cookie-option">
              <div class="option-header">
                <label class="option-label">
                  <input type="checkbox" v-model="customPreferences.performanceCookiesEnabled" />
                  <span class="option-name">{{ $t('cookies.performance') }}</span>
                </label>
              </div>
              <p class="option-description">{{ $t('cookies.performanceDesc') }}</p>
            </div>

            <div class="cookie-option">
              <div class="option-header">
                <label class="option-label">
                  <input type="checkbox" v-model="customPreferences.personalizedContent" />
                  <span class="option-name">{{ $t('cookies.personalization') }}</span>
                </label>
              </div>
              <p class="option-description">{{ $t('cookies.personalizationDesc') }}</p>
            </div>
          </div>

          <div class="customize-actions">
            <button @click="showCustomize = false" class="btn-cancel">
              {{ $t('common.cancel') }}
            </button>
            <button @click="handleSaveCustom" class="btn-save">
              {{ $t('common.save') }}
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'

const settingsStore = useSettingsStore()

const showCustomize = ref(false)
const customPreferences = ref({
  analyticsEnabled: false,
  performanceCookiesEnabled: false,
  personalizedContent: false,
})

const showBanner = computed(() => {
  return settingsStore.settings.cookieConsent === null
})

onMounted(() => {
  settingsStore.initSettings()
})

const handleAccept = () => {
  settingsStore.updateSetting('cookieConsent', true)
  settingsStore.updateSetting('analyticsEnabled', true)
  settingsStore.updateSetting('performanceCookiesEnabled', true)
  settingsStore.updateSetting('personalizedContent', true)
  settingsStore.updateSetting('dataCollection', true)
}

const handleReject = () => {
  settingsStore.updateSetting('cookieConsent', false)
  settingsStore.updateSetting('analyticsEnabled', false)
  settingsStore.updateSetting('performanceCookiesEnabled', false)
  settingsStore.updateSetting('personalizedContent', false)
  settingsStore.updateSetting('dataCollection', false)
}

const handleCustomize = () => {
  showCustomize.value = !showCustomize.value
  // 加载当前设置
  customPreferences.value = {
    analyticsEnabled: settingsStore.settings.analyticsEnabled,
    performanceCookiesEnabled: settingsStore.settings.performanceCookiesEnabled,
    personalizedContent: settingsStore.settings.personalizedContent,
  }
}

const handleSaveCustom = () => {
  settingsStore.updateSetting('cookieConsent', true)
  settingsStore.updateSetting('analyticsEnabled', customPreferences.value.analyticsEnabled)
  settingsStore.updateSetting(
    'performanceCookiesEnabled',
    customPreferences.value.performanceCookiesEnabled,
  )
  settingsStore.updateSetting('personalizedContent', customPreferences.value.personalizedContent)
  settingsStore.updateSetting('dataCollection', customPreferences.value.analyticsEnabled)
  showCustomize.value = false
}
</script>

<style scoped>
.cookie-banner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border-top: 1px solid var(--glass-border);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
  padding: var(--spacing-lg);
  max-width: 100%;
}

.cookie-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  flex-wrap: wrap;
}

.cookie-icon {
  font-size: 2.5rem;
  flex-shrink: 0;
}

.cookie-text {
  flex: 1;
  min-width: 300px;
}

.cookie-title {
  font-size: var(--text-lg);
  font-weight: 600;
  margin-bottom: var(--spacing-xs);
  color: var(--text-primary);
}

.cookie-description {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.5;
}

.privacy-link {
  color: var(--primary-color);
  text-decoration: underline;
  margin-left: 4px;
}

.privacy-link:hover {
  color: var(--primary-dark);
}

.cookie-actions {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.cookie-actions button {
  padding: 0.625rem 1.25rem;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  font-size: var(--text-sm);
}

.btn-customize {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  border: 2px solid var(--text-secondary);
}

.btn-customize:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: var(--text-primary);
}

.btn-reject {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  border: 2px solid var(--text-secondary);
}

.btn-reject:hover {
  background: rgba(255, 0, 0, 0.15);
  border-color: #ff6b6b;
  color: #ff6b6b;
}

.btn-accept {
  background: var(--primary-color);
  color: white;
}

.btn-accept:hover {
  background: var(--primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

/* 自定义设置面板 */
.cookie-customize {
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--glass-border);
}

.cookie-customize h4 {
  font-size: var(--text-md);
  font-weight: 600;
  margin-bottom: var(--spacing-md);
  color: var(--text-primary);
}

.cookie-options {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.cookie-option {
  padding: var(--spacing-md);
  background: rgba(255, 255, 255, 0.05);
  border-radius: var(--radius-md);
  border: 1px solid var(--glass-border);
}

.option-header {
  margin-bottom: var(--spacing-xs);
}

.option-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
  user-select: none;
}

.option-label input[type='checkbox'] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.option-label input[type='checkbox']:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.option-name {
  font-weight: 600;
  color: var(--text-primary);
}

.option-badge {
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: 600;
}

.option-badge.required {
  background: rgba(139, 92, 246, 0.2);
  color: var(--primary-color);
}

.option-description {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  line-height: 1.5;
  margin-left: 26px;
}

.customize-actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
}

.customize-actions button {
  padding: 0.625rem 1.25rem;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  font-size: var(--text-sm);
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  border: 2px solid var(--text-secondary);
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: var(--text-primary);
}

.btn-save {
  background: var(--primary-color);
  color: white;
}

.btn-save:hover {
  background: var(--primary-dark);
}

/* 动画 */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from {
  transform: translateY(100%);
  opacity: 0;
}

.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 响应式 */
@media (max-width: 768px) {
  .cookie-banner {
    padding: var(--spacing-md);
  }

  .cookie-content {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-md);
  }

  .cookie-icon {
    font-size: 2rem;
  }

  .cookie-text {
    min-width: 100%;
  }

  .cookie-actions {
    width: 100%;
    flex-direction: column;
  }

  .cookie-actions button {
    width: 100%;
  }

  .customize-actions {
    flex-direction: column;
  }

  .customize-actions button {
    width: 100%;
  }
}
</style>
