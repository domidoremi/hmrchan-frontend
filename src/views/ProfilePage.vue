<template>
  <div class="profile-page">
    <div class="container">
      <div class="profile-header">
        <div class="user-info">
          <img :src="userAvatar" :alt="user?.username" class="user-avatar" />
          <div class="user-details">
            <h1 class="user-name">{{ user?.full_name || user?.username }}</h1>
            <p class="user-username">@{{ user?.username }}</p>
            <p v-if="user?.bio" class="user-bio">{{ user.bio }}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" @click="goToSettings">
          <Settings :size="16" />
          {{ $t('nav.profileSettings') }}
        </Button>
      </div>

      <div class="profile-tabs glass-card">
        <nav class="tabs-nav">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="tab-btn"
            :class="{ active: activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            <component :is="tab.icon" :size="18" />
            <span>{{ $t(tab.label) }}</span>
            <span v-if="tab.count !== undefined" class="tab-count">{{ tab.count }}</span>
          </button>
        </nav>

        <div class="tab-content">
          <KeepAlive>
            <component :is="currentTabComponent" />
          </KeepAlive>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ProfilePage' })

import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Heart, MessageSquare, ThumbsUp, Clock, Bell, Settings } from 'lucide-vue-next'
import { useAuthStore } from '@/stores'
import { normalizeAvatarUrl } from '@/api/userService'
import Button from '@/components/ui/Button.vue'
import ProfileFavoritesTab from '@/components/profile/ProfileFavoritesTab.vue'
import ProfileCommentsTab from '@/components/profile/ProfileCommentsTab.vue'
import ProfileLikesTab from '@/components/profile/ProfileLikesTab.vue'
import ProfileHistoryTab from '@/components/profile/ProfileHistoryTab.vue'
import ProfileNotificationsTab from '@/components/profile/ProfileNotificationsTab.vue'

const router = useRouter()
const authStore = useAuthStore()
const { user, isAuthenticated } = storeToRefs(authStore)

const activeTab = ref<'favorites' | 'comments' | 'likes' | 'history' | 'notifications'>('favorites')

const tabs = [
  { id: 'favorites' as const, label: 'profile.tabs.favorites', icon: Heart, count: undefined },
  {
    id: 'comments' as const,
    label: 'profile.tabs.comments',
    icon: MessageSquare,
    count: undefined,
  },
  { id: 'likes' as const, label: 'profile.tabs.likes', icon: ThumbsUp, count: undefined },
  { id: 'history' as const, label: 'profile.tabs.history', icon: Clock, count: undefined },
  {
    id: 'notifications' as const,
    label: 'profile.tabs.notifications',
    icon: Bell,
    count: undefined,
  },
]

const currentTabComponent = computed(() => {
  const components = {
    favorites: ProfileFavoritesTab,
    comments: ProfileCommentsTab,
    likes: ProfileLikesTab,
    history: ProfileHistoryTab,
    notifications: ProfileNotificationsTab,
  }
  return components[activeTab.value]
})

const userAvatar = computed(() => {
  const url = normalizeAvatarUrl(user.value?.avatar_url)
  if (url) return url
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.value?.username || 'default'}`
})

function goToSettings() {
  router.push('/settings/profile')
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
  padding: var(--spacing-8) 0;
}

.profile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-8);
  padding: var(--spacing-6);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(10px);
}

.user-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
}

.user-avatar {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-full);
  border: 3px solid var(--color-primary);
  object-fit: cover;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.user-name {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  margin: 0;
}

.user-email {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  margin: 0;
}

.profile-tabs {
  overflow: hidden;
}

.tabs-nav {
  display: flex;
  gap: var(--spacing-1);
  padding: var(--spacing-2);
  border-bottom: 1px solid var(--glass-border);
  overflow-x: auto;
  scrollbar-width: none;
}

.tabs-nav::-webkit-scrollbar {
  display: none;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-4);
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.tab-btn:hover {
  background: var(--glass-bg-light);
  color: var(--color-text);
}

.tab-btn.active {
  background: var(--color-primary);
  color: var(--color-white);
}

.tab-count {
  padding: 2px 8px;
  background: var(--glass-bg-light);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
}

.tab-btn.active .tab-count {
  background: rgba(255, 255, 255, 0.2);
}

.tab-content {
  padding: var(--spacing-6);
  min-height: 400px;
}

@media (max-width: 768px) {
  .profile-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .user-avatar {
    width: 60px;
    height: 60px;
  }

  .user-name {
    font-size: var(--text-xl);
  }

  .tab-btn span {
    display: none;
  }

  .tab-btn {
    padding: var(--spacing-3);
  }

  .tab-content {
    padding: var(--spacing-4);
  }
}
</style>
