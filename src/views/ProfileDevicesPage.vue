<template>
  <div class="profile-page">
    <div class="container">
      <ProfileSubPageHeader
        :title="$t('profile.tabs.devices')"
        :subtitle="$t('profile.devicesSubtitle')"
      />

      <Card class="profile-page-card" variant="subtle">
        <DeviceManagement />
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ProfileDevicesPage' })

import Card from '@/components/ui/Card.vue'
import DeviceManagement from '@/components/profile/DeviceManagement.vue'
import ProfileSubPageHeader from '@/components/profile/ProfileSubPageHeader.vue'
</script>

<style scoped>
.profile-page {
  min-height: 100svh;
  min-height: 100dvh;
  padding: var(--spacing-4) 0;
}

.profile-page-card {
  padding: var(--spacing-4);
}
</style>
