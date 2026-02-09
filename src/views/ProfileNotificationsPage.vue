<template>
  <div class="profile-page">
    <div class="container">
      <ProfileSubPageHeader
        :title="$t('profile.tabs.notifications')"
        :subtitle="$t('profile.notificationsSubtitle')"
      />

      <Card class="profile-page-card" variant="subtle">
        <ProfileNotificationsTab />
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ProfileNotificationsPage' })

import Card from '@/components/ui/Card.vue'
import ProfileNotificationsTab from '@/components/profile/ProfileNotificationsTab.vue'
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
