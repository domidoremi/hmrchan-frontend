<template>
  <div class="user-public-profile-page">
    <div class="container">
      <div class="page-actions">
        <Button type="button" variant="ghost" size="sm" @click="goBack">
          {{ $t('common.back') }}
        </Button>
      </div>

      <StateIndicator v-if="error" variant="error" :description="error" @action="loadProfile" />

      <template v-else>
        <section class="profile-card glass-card-enhanced">
          <template v-if="isLoading">
            <div class="profile-skeleton">
              <Skeleton variant="avatar" width="5rem" height="5rem" />
              <div class="profile-skeleton-copy">
                <Skeleton width="12rem" height="1.5rem" />
                <Skeleton width="7rem" height="1rem" />
                <Skeleton width="100%" height="1rem" />
                <Skeleton width="70%" height="1rem" />
              </div>
            </div>
          </template>

          <template v-else-if="profile">
            <div class="profile-hero">
              <Avatar
                :src="
                  normalizeAvatarUrl(profile.avatar_url || undefined) ||
                  profile.avatar_url ||
                  undefined
                "
                :alt="profile.username"
                size="xl"
              />

              <div class="profile-copy">
                <div class="profile-name-row">
                  <h1 class="profile-name">{{ profile.username }}</h1>
                  <span v-if="isCurrentUser" class="profile-badge">{{ $t('profile.you') }}</span>
                </div>
                <p class="profile-handle">@{{ profile.username }}</p>
                <p class="profile-bio">{{ profile.bio || $t('common.noDescription') }}</p>

                <div class="profile-stats">
                  <div class="stat-item">
                    <span class="stat-label">{{ $t('profile.tabs.followers') }}</span>
                    <strong class="stat-value">{{ profile.follower_count ?? 0 }}</strong>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">{{ $t('profile.tabs.following') }}</span>
                    <strong class="stat-value">{{ profile.following_count ?? 0 }}</strong>
                  </div>
                </div>

                <div class="relation-badges">
                  <span v-if="relationState.is_followed_by" class="relation-badge">
                    {{ $t('profile.relationFollowsYou') }}
                  </span>
                  <span
                    v-if="relationState.is_blocked_by"
                    class="relation-badge relation-badge--warning"
                  >
                    {{ $t('profile.relationBlockedYou') }}
                  </span>
                  <span
                    v-if="relationState.is_blocking"
                    class="relation-badge relation-badge--warning"
                  >
                    {{ $t('profile.relationshipBlocked') }}
                  </span>
                </div>
              </div>
            </div>
          </template>
        </section>

        <section v-if="profile && !isLoading" class="profile-card glass-card">
          <div class="action-header">
            <div>
              <h2 class="action-title">{{ $t('profile.publicProfileTitle') }}</h2>
              <p class="action-desc">{{ $t('profile.publicProfileHint') }}</p>
            </div>
          </div>

          <div class="action-list">
            <Button v-if="isCurrentUser" type="button" size="sm" @click="goToOwnProfile">
              {{ $t('nav.profile') }}
            </Button>

            <template v-else>
              <Button
                type="button"
                size="sm"
                :loading="actionType === 'follow'"
                :disabled="relationState.is_blocked_by"
                @click="toggleFollow"
              >
                {{
                  relationState.is_following
                    ? $t('profile.unfollowAction')
                    : $t('profile.followAction')
                }}
              </Button>

              <Button
                type="button"
                :variant="relationState.is_blocking ? 'secondary' : 'danger'"
                size="sm"
                :loading="actionType === 'block'"
                @click="toggleBlock"
              >
                {{
                  relationState.is_blocking
                    ? $t('profile.unblockAction')
                    : $t('profile.blockAction')
                }}
              </Button>
            </template>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'UserPublicProfilePage' })

import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import {
  ApiError,
  normalizeAvatarUrl,
  userRelationsService,
  type UserPublicProfile,
  type UserRelation,
} from '@/api'
import { useAuthStore, useToastStore } from '@/stores'
import Avatar from '@/components/ui/Avatar.vue'
import Button from '@/components/ui/Button.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const toastStore = useToastStore()
const { user } = storeToRefs(authStore)

const userId = computed(() => String(route.params['id'] ?? ''))
const currentUserId = computed(() => user.value?.id ?? '')
const isCurrentUser = computed(() => userId.value === currentUserId.value)

const profile = ref<UserPublicProfile | null>(null)
const relation = ref<UserRelation | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)
const actionType = ref<'follow' | 'block' | null>(null)
let requestToken = 0

const relationState = computed<UserRelation>(() => {
  if (relation.value) return relation.value
  return {
    is_following: profile.value?.is_following ?? false,
    is_followed_by: profile.value?.is_followed_by ?? false,
    is_blocking: profile.value?.is_blocking ?? false,
    is_blocked_by: profile.value?.is_blocked_by ?? false,
  }
})

async function loadProfile() {
  if (!userId.value) return
  if (isCurrentUser.value) {
    await router.replace('/profile')
    return
  }

  const currentRequestToken = ++requestToken
  isLoading.value = true
  error.value = null

  try {
    const [profileResponse, relationResponse] = await Promise.all([
      userRelationsService.getUserProfile(userId.value),
      userRelationsService.getRelation(userId.value),
    ])

    if (currentRequestToken !== requestToken) return

    profile.value = profileResponse
    relation.value = relationResponse
  } catch (err) {
    if (currentRequestToken !== requestToken) return
    error.value = err instanceof ApiError ? err.message : t('common.error')
  } finally {
    if (currentRequestToken === requestToken) {
      isLoading.value = false
    }
  }
}

async function toggleFollow() {
  if (!profile.value || actionType.value) return

  actionType.value = 'follow'
  try {
    if (relationState.value.is_following) {
      await userRelationsService.unfollowUser(profile.value.id)
      toastStore.success(t('profile.unfollowSuccess'))
    } else {
      await userRelationsService.followUser(profile.value.id)
      toastStore.success(t('profile.followSuccess'))
    }
    await loadProfile()
  } catch (err) {
    toastStore.error(err instanceof ApiError ? err.message : t('common.error'))
  } finally {
    actionType.value = null
  }
}

async function toggleBlock() {
  if (!profile.value || actionType.value) return

  actionType.value = 'block'
  try {
    if (relationState.value.is_blocking) {
      await userRelationsService.unblockUser(profile.value.id)
      toastStore.success(t('profile.unblockSuccess'))
    } else {
      await userRelationsService.blockUser(profile.value.id)
      toastStore.success(t('profile.blockSuccess'))
    }
    await loadProfile()
  } catch (err) {
    toastStore.error(err instanceof ApiError ? err.message : t('common.error'))
  } finally {
    actionType.value = null
  }
}

function goBack() {
  router.back()
}

function goToOwnProfile() {
  void router.push('/profile')
}

watch(
  userId,
  () => {
    void loadProfile()
  },
  { immediate: true }
)
</script>

<style scoped>
.user-public-profile-page {
  padding-block: var(--spacing-4);
}

.container {
  display: grid;
  gap: clamp(0.875rem, 2.5vw, 1.25rem);
}

.page-actions {
  display: flex;
  justify-content: flex-start;
}

.profile-card {
  padding: clamp(1rem, 3vw, 1.5rem);
}

.profile-skeleton,
.profile-hero {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: clamp(1rem, 3vw, 1.5rem);
  align-items: start;
}

.profile-skeleton-copy,
.profile-copy {
  display: grid;
  gap: var(--spacing-3);
}

.profile-name-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  flex-wrap: wrap;
}

.profile-name {
  margin: 0;
  font-size: clamp(1.5rem, 3.5vw, 2rem);
  font-weight: var(--font-bold);
}

.profile-badge,
.relation-badge {
  padding: 0.125rem 0.625rem;
  border-radius: var(--radius-full);
  background: rgba(var(--color-primary-rgb), 0.08);
  color: var(--color-primary);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.relation-badge--warning {
  background: rgba(var(--color-warning-rgb), 0.12);
  color: var(--color-warning);
}

.profile-handle {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.profile-bio {
  margin: 0;
  color: var(--color-text-primary);
  line-height: 1.7;
}

.profile-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
  gap: var(--spacing-3);
}

.stat-item {
  display: grid;
  gap: var(--spacing-1);
  padding: var(--spacing-3);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  background: var(--glass-bg-light);
}

.stat-label {
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
}

.stat-value {
  color: var(--color-text-primary);
  font-size: clamp(1.125rem, 2vw, 1.5rem);
}

.relation-badges,
.action-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

.action-header {
  margin-block-end: var(--spacing-3);
}

.action-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
}

.action-desc {
  margin: var(--spacing-1) 0 0;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

@media (max-width: 640px) {
  .profile-skeleton,
  .profile-hero {
    grid-template-columns: 1fr;
  }
}
</style>
