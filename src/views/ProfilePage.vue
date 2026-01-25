<template>
  <div class="profile-page">
    <div class="container">
      <div class="profile-header">
        <div class="user-info">
          <Avatar :src="userAvatar" :alt="user?.username" size="xl" class="user-avatar" />
          <div class="user-details">
            <h1 class="user-name">{{ user?.full_name || user?.username }}</h1>
            <p class="user-username">@{{ user?.username }}</p>
            <p v-if="user?.bio" class="user-bio">{{ user.bio }}</p>
            <div class="user-meta">
              <span>{{ $t('profile.summary') }}</span>
              <span class="meta-dot" />
              <span>{{ $t('profile.tabs.favorites') }}</span>
            </div>
          </div>
        </div>
        <div class="profile-actions">
          <Button variant="ghost" size="sm" @click="goToSettings">
            <Settings :size="16" />
            {{ $t('nav.profileSettings') }}
          </Button>
          <Button variant="secondary" size="sm" @click="editProfile">
            <Pencil :size="16" />
            {{ $t('profile.editProfile') }}
          </Button>
        </div>
      </div>
      <div class="profile-insights">
        <div class="insight-card glass-card">
          <div class="insight-label">{{ $t('profile.insights.activity') }}</div>
          <div class="insight-value">{{ $t('profile.insights.activityValue') }}</div>
          <div class="insight-hint">{{ $t('profile.insights.activityHint') }}</div>
        </div>
        <div class="insight-card glass-card">
          <div class="insight-label">{{ $t('profile.insights.favorites') }}</div>
          <div class="insight-value">{{ $t('profile.insights.favoritesValue') }}</div>
          <div class="insight-hint">{{ $t('profile.insights.favoritesHint') }}</div>
        </div>
        <div class="insight-card glass-card">
          <div class="insight-label">{{ $t('profile.insights.security') }}</div>
          <div class="insight-value">{{ $t('profile.insights.securityValue') }}</div>
          <div class="insight-hint">{{ $t('profile.insights.securityHint') }}</div>
        </div>
      </div>

      <Card class="profile-tabs" variant="subtle">
        <template #header>
          <div class="tabs-header">
            <div class="tabs-title">
              <h2>{{ $t('profile.activity') }}</h2>
              <p>{{ $t('profile.activityHint') }}</p>
            </div>
            <Tabs v-model="activeTab" :tabs="tabs" />
          </div>
        </template>
        <div class="tab-content">
          <KeepAlive>
            <component :is="currentTabComponent" />
          </KeepAlive>
        </div>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ProfilePage' })

import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Heart, MessageSquare, ThumbsUp, Clock, Settings, Pencil } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores'
import { getUserAvatarUrl } from '@/composables/useUserAvatar'
import Button from '@/components/ui/Button.vue'
import Avatar from '@/components/ui/Avatar.vue'
import Card from '@/components/ui/Card.vue'
import Tabs from '@/components/ui/Tabs.vue'
import ProfileFavoritesTab from '@/components/profile/ProfileFavoritesTab.vue'
import ProfileCommentsTab from '@/components/profile/ProfileCommentsTab.vue'
import ProfileLikesTab from '@/components/profile/ProfileLikesTab.vue'
import ProfileHistoryTab from '@/components/profile/ProfileHistoryTab.vue'

const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const { user, isAuthenticated } = storeToRefs(authStore)

const activeTab = ref<'favorites' | 'comments' | 'likes' | 'history'>('favorites')

const tabs = computed(() => [
  { value: 'favorites', label: t('profile.tabs.favorites'), icon: Heart },
  { value: 'comments', label: t('profile.tabs.comments'), icon: MessageSquare },
  { value: 'likes', label: t('profile.tabs.likes'), icon: ThumbsUp },
  { value: 'history', label: t('profile.tabs.history'), icon: Clock },
])

const currentTabComponent = computed(() => {
  const components = {
    favorites: ProfileFavoritesTab,
    comments: ProfileCommentsTab,
    likes: ProfileLikesTab,
    history: ProfileHistoryTab,
  }
  return components[activeTab.value]
})

const userAvatar = computed(() => {
  return getUserAvatarUrl(user.value?.avatar_url, user.value?.username)
})

const profileRoute = '/profile/settings'

function goToSettings() {
  router.push(profileRoute)
}

function editProfile() {
  router.push(profileRoute)
}

onMounted(() => {
  if (!isAuthenticated.value) {
    router.push('/login')
  }
})
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  padding: var(--spacing-4) 0;
}

.profile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-4);
  padding: var(--spacing-4);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(10px);
}

.profile-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.user-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.user-avatar {
  border: 2px solid var(--color-primary);
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-name {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  margin: 0;
}

.user-username {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  margin: 0;
}

.user-bio {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  margin: 0;
}

.user-meta {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--spacing-1);
}

.meta-dot {
  width: 4px;
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--color-text-tertiary);
}

.profile-tabs {
  overflow: hidden;
}

.profile-insights {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-4);
}

.insight-card {
  padding: var(--spacing-3);
  border-radius: var(--radius-lg);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.insight-label {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.insight-value {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.insight-hint {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.tabs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-4);
}

.tabs-title h2 {
  margin: 0;
  font-size: var(--text-lg);
}

.tabs-title p {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.tab-content {
  min-height: 300px;
}

@media (max-width: 768px) {
  .profile-header {
    flex-direction: column;
    align-items: flex-start;
    padding: var(--spacing-3);
  }

  .user-avatar {
    width: 52px;
    height: 52px;
  }

  .user-name {
    font-size: var(--text-lg);
  }

  .profile-actions {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .tabs-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .profile-insights {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 1200px) {
  .profile-header {
    padding: var(--spacing-5);
  }

  .user-avatar {
    width: 72px;
    height: 72px;
  }
}
</style>
