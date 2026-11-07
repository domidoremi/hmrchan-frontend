<template>
  <div
    id="app"
    :data-edition="designEdition"
    :data-preset="activePreset"
    :data-color-mode="resolvedColorMode"
    :data-animation-intensity="animationIntensity"
    :data-motion="motionMode"
    :data-locale="currentLocale"
    :data-locale-density="localeDensity"
    :data-locale-animation="localeAnimation"
    :data-scene-role="routeSceneRole"
  >
    <a href="#main-content" class="skip-link">{{ $t('common.skipToContent') }}</a>
    <JournalShell>
      <ErrorBoundary @retry="handleRetry">
        <RouterView v-slot="{ Component, route: viewRoute }">
          <Suspense>
            <template #default>
              <KeepAlive :max="10" :exclude="authKeepAliveExclude">
                <component :is="Component" :key="resolveRouteKey(viewRoute)" />
              </KeepAlive>
            </template>
            <template #fallback><PageLoading /></template>
          </Suspense>
        </RouterView>
      </ErrorBoundary>
    </JournalShell>
    <Teleport to="body"><ToastContainer position="bottom-center" /></Teleport>
    <ClientChallengeDialog v-if="shouldMountClientChallengeDialog" />
    <VerificationDialog v-if="shouldMountVerificationDialog" />
  </div>
</template>
<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { designEdition } from '@/config/designEdition'
import { useRoute, useRouter, type RouteLocationNormalizedLoaded } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '@/stores'
import { useAppearanceRuntime } from '@/composables/useAppearanceRuntime'
import { useLocaleConfig } from '@/composables/useLocaleConfig'
import { usePreferencesSync } from '@/composables/usePreferencesSync'
const JournalShell = defineAsyncComponent(() => import('@/features/journal/JournalShell.vue'))
import PageLoading from '@/components/ui/PageLoading.vue'
import ErrorBoundary from '@/components/ui/ErrorBoundary.vue'
import { clientChallengeState } from '@/api/clientChallengeBridge'
import { verificationDialogState } from '@/api/verificationState'

const ToastContainer = defineAsyncComponent(() => import('@/components/ui/ToastContainer.vue'))
const ClientChallengeDialog = defineAsyncComponent(
  () => import('@/components/ui/ClientChallengeDialog.vue')
)
const VerificationDialog = defineAsyncComponent(
  () => import('@/components/ui/VerificationDialog.vue')
)
const route = useRoute(),
  router = useRouter(),
  settingsStore = useSettingsStore()
usePreferencesSync()
const { settings } = storeToRefs(settingsStore)
const { activePreset, routeSceneRole, resolvedColorMode, motionMode } = useAppearanceRuntime(route)
const { currentLocale, layout: localeLayout, interaction: localeInteraction } = useLocaleConfig()
const localeDensity = computed(() => localeLayout.value.density)
const localeAnimation = computed(() => localeInteraction.value.animationStyle)
const animationIntensity = computed(() =>
  settings.value.enableAnimations ? settings.value.animationIntensity : 'none'
)
const shouldMountClientChallengeDialog = computed(() => clientChallengeState.isOpen.value)
const shouldMountVerificationDialog = computed(
  () =>
    verificationDialogState.isOpen.value || Boolean(verificationDialogState.currentRequest.value)
)
const authKeepAliveExclude = ['AuthCallbackPage', 'JournalPage', 'CommunityLayout', 'ProfileLayout']
function resolveRouteKey(routeRecord: RouteLocationNormalizedLoaded): string {
  const viewKey = typeof routeRecord.meta.viewKey === 'string' ? routeRecord.meta.viewKey : ''
  return (
    (viewKey ? 'view:' + viewKey : (routeRecord.matched[0]?.path ?? routeRecord.path)) +
    ':' +
    currentLocale.value
  )
}
function handleRetry() {
  router.go(0)
}
</script>
