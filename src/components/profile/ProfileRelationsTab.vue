<template>
  <div
    class="relations-tab"
    data-testid="profile-relations-tab"
    :data-profile-relations-mode="props.mode"
  >
    <ProfileTabHeader v-if="props.showHeader" :title="tabTitle" :count="displayTotal" />

    <StateIndicator
      v-if="error"
      variant="error"
      :description="error"
      @action="() => fetchRelations(true)"
    />

    <div v-else-if="isLoading && users.length === 0" class="relations-skeleton">
      <div v-for="i in 4" :key="i" class="skeleton-card">
        <Skeleton variant="avatar" width="3rem" height="3rem" />
        <div class="skeleton-copy">
          <Skeleton width="45%" height="1rem" />
          <Skeleton width="70%" height="0.875rem" />
          <Skeleton width="55%" height="0.875rem" />
        </div>
      </div>
    </div>

    <template v-else>
      <StateIndicator v-if="users.length === 0" variant="empty" :description="emptyDescription" />

      <div v-else class="relations-list">
        <article v-for="item in users" :key="item.id" class="relation-card glass-surface--elevated">
          <div class="relation-main">
            <Avatar
              :src="resolveAvatarSrc(item.avatar_url)"
              :alt="item.username"
              size="lg"
              :fallback="getAvatarFallbackLabel(item.username)"
            />

            <div class="relation-copy">
              <div class="relation-name-row">
                <h3 class="relation-name">{{ item.username }}</h3>
                <span v-if="item.id === currentUserId" class="self-badge">
                  {{ $t('profile.you') }}
                </span>
              </div>

              <p class="relation-bio">
                {{ item.bio || $t('common.noDescription') }}
              </p>

              <div class="relation-meta">
                <span>{{ $t('profile.followerCount', { count: item.follower_count ?? 0 }) }}</span>
                <span>{{
                  $t('profile.followingCount', { count: item.following_count ?? 0 })
                }}</span>
              </div>
            </div>
          </div>

          <div class="relation-actions">
            <Button type="button" variant="ghost" size="sm" @click="openUserProfile(item.id)">
              {{ $t('profile.viewPublicProfile') }}
            </Button>
            <Button
              v-if="actionLabel && item.id !== currentUserId"
              type="button"
              :variant="props.mode === 'blocked' ? 'secondary' : 'ghost'"
              size="sm"
              :loading="actionUserId === item.id"
              @click="handleRelationAction(item)"
            >
              {{ actionLabel }}
            </Button>
          </div>
        </article>
      </div>

      <LoadMoreSection
        v-if="hasMore"
        :count="users.length"
        :total="displayTotal"
        :has-more="hasMore"
        :loading="isLoadingMore"
        @load-more="loadMore"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { ApiError, userRelationsService, type UserListItem } from '@/api'
import { normalizeRelationsSummaryCounts } from '@/api/summaryCounts'
import { usePreferredPageSize } from '@/composables/usePreferredPageSize'
import { getAvatarFallbackLabel, resolveAvatarSrc } from '@/utils/avatarPresentation'
import { useAuthStore, useToastStore } from '@/stores'
import ProfileTabHeader from '@/components/profile/ProfileTabHeader.vue'
import Avatar from '@/components/ui/Avatar.vue'
import Button from '@/components/ui/Button.vue'
import LoadMoreSection from '@/components/ui/LoadMoreSection.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'

type RelationMode = 'followers' | 'following' | 'blocked'

const props = withDefaults(
  defineProps<{
    mode: RelationMode
    showHeader?: boolean
  }>(),
  {
    showHeader: true,
  }
)

const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const toastStore = useToastStore()
const { user } = storeToRefs(authStore)

const users = ref<UserListItem[]>([])
const nextCursor = ref<string | null>(null)
const total = ref<number | null>(null)
const isLoading = ref(false)
const isLoadingMore = ref(false)
const error = ref<string | null>(null)
const actionUserId = ref<string | null>(null)

const pageSize = usePreferredPageSize({ fallback: 20, min: 10, max: 50 })
const currentUserId = computed(() => user.value?.id ?? '')
const hasMoreState = ref(false)
const hasMore = computed(() => hasMoreState.value)
const displayTotal = computed(() => total.value ?? (users.value.length || undefined))

const tabTitle = computed(() => {
  switch (props.mode) {
    case 'followers':
      return t('profile.tabs.followers')
    case 'following':
      return t('profile.tabs.following')
    case 'blocked':
      return t('profile.tabs.blocked')
    default:
      return ''
  }
})

const emptyDescription = computed(() => {
  switch (props.mode) {
    case 'followers':
      return t('profile.noFollowers')
    case 'following':
      return t('profile.noFollowing')
    case 'blocked':
      return t('profile.noBlockedUsers')
    default:
      return ''
  }
})

const actionLabel = computed(() => {
  switch (props.mode) {
    case 'following':
      return t('profile.unfollowAction')
    case 'blocked':
      return t('profile.unblockAction')
    default:
      return ''
  }
})

async function fetchRelations(reset = true): Promise<boolean> {
  if (reset) {
    isLoading.value = true
    nextCursor.value = null
  } else {
    if (isLoading.value || isLoadingMore.value) return false
    isLoadingMore.value = true
  }

  error.value = null

  try {
    const response =
      props.mode === 'followers'
        ? await userRelationsService.getFollowers({
            limit: pageSize.value,
            cursor: reset ? null : nextCursor.value,
          })
        : props.mode === 'following'
          ? await userRelationsService.getFollowing({
              limit: pageSize.value,
              cursor: reset ? null : nextCursor.value,
            })
          : await userRelationsService.getBlockedUsers({
              limit: pageSize.value,
              cursor: reset ? null : nextCursor.value,
            })
    const nextItems = Array.isArray(response.items) ? response.items : []

    if (reset) {
      users.value = nextItems
    } else {
      const existingIds = new Set(users.value.map((item) => item.id))
      users.value.push(...nextItems.filter((item) => !existingIds.has(item.id)))
    }
    nextCursor.value = response.next_cursor ?? null
    hasMoreState.value = Boolean(response.has_more && response.next_cursor)
    if (reset) {
      void refreshRelationsSummary()
    }
    return true
  } catch (err) {
    if (users.value.length === 0) {
      error.value = err instanceof ApiError ? err.message : t('common.error')
    }
    return false
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

async function loadMore() {
  if (!hasMore.value || isLoading.value || isLoadingMore.value) return
  await fetchRelations(false)
}

async function refreshRelationsSummary() {
  try {
    const summary = await userRelationsService.getSummary()
    const counts = normalizeRelationsSummaryCounts(summary)
    total.value =
      props.mode === 'followers'
        ? counts.followers
        : props.mode === 'following'
          ? counts.following
          : counts.blocked
  } catch {
    total.value = users.value.length > 0 ? users.value.length : null
  }
}

function openUserProfile(userId: string) {
  if (userId === currentUserId.value) {
    void router.push('/profile')
    return
  }
  void router.push({ name: 'user-public-profile', params: { id: userId } })
}

async function handleRelationAction(target: UserListItem) {
  if (actionUserId.value || target.id === currentUserId.value) return

  actionUserId.value = target.id
  try {
    if (props.mode === 'following') {
      await userRelationsService.unfollowUser(target.id)
      users.value = users.value.filter((item) => item.id !== target.id)
      if (typeof total.value === 'number') {
        total.value = Math.max(0, total.value - 1)
      }
      toastStore.success(t('profile.unfollowSuccess'))
    } else if (props.mode === 'blocked') {
      await userRelationsService.unblockUser(target.id)
      users.value = users.value.filter((item) => item.id !== target.id)
      if (typeof total.value === 'number') {
        total.value = Math.max(0, total.value - 1)
      }
      toastStore.success(t('profile.unblockSuccess'))
    }
  } catch (err) {
    toastStore.error(err instanceof ApiError ? err.message : t('common.error'))
  } finally {
    actionUserId.value = null
  }
}

onMounted(() => {
  void fetchRelations(true)
})

watch(pageSize, () => {
  if (users.value.length === 0 && !isLoading.value) return
  void fetchRelations(true)
})
</script>

<style scoped>
.relations-tab {
  min-height: 20rem;
  --profile-tab-header-count-bg: rgba(var(--color-primary-rgb), 0.08);
  --profile-tab-header-count-border: transparent;
}

.relations-skeleton,
.relations-list {
  display: grid;
  gap: clamp(0.75rem, 2vw, 1rem);
}

.skeleton-card,
.relation-card {
  display: grid;
  gap: var(--spacing-3);
  padding: clamp(0.875rem, 2.5vw, 1.125rem);
}

.skeleton-card {
  grid-template-columns: auto 1fr;
  align-items: center;
}

.skeleton-copy {
  display: grid;
  gap: var(--spacing-2);
}

.relation-card {
  align-items: center;
}

.relation-main {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--spacing-3);
  align-items: start;
}

.relation-copy {
  display: grid;
  gap: var(--spacing-2);
  min-width: 0;
}

.relation-name-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  flex-wrap: wrap;
}

.relation-name {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.self-badge {
  display: inline-flex;
  align-items: center;
  min-block-size: calc(var(--appearance-chip-min-block-size) - 0.75rem);
  padding-block: 0.1875rem;
  padding-inline: max(0.6875rem, calc(var(--appearance-chip-padding-inline) * 0.68));
  border-radius: var(--radius-full);
  background: rgba(var(--color-primary-rgb), 0.08);
  color: var(--color-primary);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  line-height: var(--appearance-ui-line-height);
}

.relation-bio {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  line-height: 1.5;
}

.relation-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem 0.75rem;
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
}

.relation-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
  justify-content: flex-end;
}

@media (max-width: 640px) {
  .relation-card {
    justify-items: start;
  }

  .relation-actions {
    justify-content: flex-start;
  }
}
</style>
