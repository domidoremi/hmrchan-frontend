<template>
  <RouterView />
  <ClientChallengeDialog v-if="shouldMountClientChallengeDialog" />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { RouterView } from 'vue-router'
import { clientChallengeState } from '@/api/clientChallengeBridge'

const ClientChallengeDialog = defineAsyncComponent(
  () => import('@/components/ClientChallengeDialog.vue')
)
const shouldMountClientChallengeDialog = computed(() => clientChallengeState.isOpen.value)
</script>
