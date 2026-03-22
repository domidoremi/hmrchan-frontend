<template>
  <button
    type="button"
    class="author-card page-list-card content-auto-sm"
    :class="{
      'author-card--compact': compact,
      'author-card--has-prefetch-intent': prefetchOnHover,
    }"
    :aria-label="cardAriaLabel"
    :data-prefetch-on-hover="prefetchOnHover ? 'true' : undefined"
    @click="emit('click', author.id)"
  >
    <div class="author-card__head">
      <img
        v-if="hasAuthorAvatar"
        class="author-avatar"
        :src="resolvedAvatarSrc"
        :alt="displayName"
        width="72"
        height="72"
        loading="lazy"
        decoding="async"
        @error="markAvatarFailed"
      />
      <div v-else class="author-avatar author-avatar--fallback">
        {{ fallbackLabel }}
      </div>
      <span v-if="author.is_verified" class="author-verified">
        <BadgeCheck :size="14" />
      </span>
    </div>

    <div class="author-info">
      <div class="author-topline">
        <h3 class="author-name">{{ displayName }}</h3>
        <span class="author-platform">{{ author.platform }}</span>
      </div>
      <p class="author-username">@{{ author.username }}</p>
      <p v-if="author.description" class="author-description">{{ author.description }}</p>
      <div class="author-meta">
        <span v-if="hasFollowerCount" class="author-metric">
          <Users :size="14" />
          {{ formatCompactCount(author.follower_count as number) }}
        </span>
        <span v-if="hasPostCount" class="author-metric">
          <FileText :size="14" />
          {{ formatCompactCount(author.post_count as number) }}
        </span>
      </div>
    </div>

    <span class="author-card__cta">
      <ArrowRight :size="16" />
    </span>
  </button>
</template>

<script setup lang="ts" vapor>
import { computed, ref } from 'vue'
import { ArrowRight, BadgeCheck, FileText, Users } from 'lucide-vue-next'
import { normalizeAvatarUrl } from '@/api/userService'
import type { AuthorListItem } from '@/api'

defineOptions({ name: 'AuthorCard' })

export type AuthorCardAuthor = Pick<
  AuthorListItem,
  | 'id'
  | 'platform'
  | 'username'
  | 'display_name'
  | 'avatar_url'
  | 'follower_count'
  | 'post_count'
  | 'is_verified'
  | 'name'
  | 'description'
>

export interface AuthorCardProps {
  author: AuthorCardAuthor
  prefetchOnHover?: boolean
  compact?: boolean
}

const props = withDefaults(defineProps<AuthorCardProps>(), {
  prefetchOnHover: false,
  compact: false,
})

const emit = defineEmits<{
  click: [authorId: string]
}>()

const avatarFailed = ref(false)

const displayName = computed(
  () => props.author.display_name || props.author.name || props.author.username || 'Unknown'
)

const cardAriaLabel = computed(() => {
  const name = displayName.value.trim()
  const username = props.author.username.trim()
  return username && username !== name ? `${name} @${username}` : name
})

const resolvedAvatarSrc = computed(
  () => normalizeAvatarUrl(props.author.avatar_url) || props.author.avatar_url || undefined
)

const hasAuthorAvatar = computed(() => Boolean(props.author.avatar_url) && !avatarFailed.value)

const fallbackLabel = computed(() => {
  const source = displayName.value.trim().slice(0, 1).toUpperCase()
  return source || '?'
})

const hasFollowerCount = computed(
  () => typeof props.author.follower_count === 'number' && props.author.follower_count > 0
)

const hasPostCount = computed(
  () => typeof props.author.post_count === 'number' && props.author.post_count > 0
)

function markAvatarFailed() {
  avatarFailed.value = true
}

function formatCompactCount(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`
  return String(value)
}
</script>

<style scoped>
.author-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-4);
  padding: var(--spacing-4);
  inline-size: 100%;
  min-inline-size: 0;
  text-align: left;
  cursor: pointer;
  appearance: none;
}

.author-card--compact {
  gap: var(--spacing-3);
  padding: var(--spacing-3);
}

.author-card__head {
  position: relative;
  isolation: isolate;
}

.author-avatar {
  inline-size: 4rem;
  block-size: 4rem;
  border-radius: 1.4rem;
  flex-shrink: 0;
  object-fit: cover;
  box-shadow: 0 1rem 1.8rem -1.3rem rgba(15, 23, 42, 0.45);
}

.author-avatar--fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: var(--font-semibold);
  color: var(--page-control-ink-strong);
  background:
    radial-gradient(circle at 30% 20%, rgba(var(--color-accent-rgb), 0.22), transparent 55%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.92), rgba(226, 232, 240, 0.9));
  border: 1px solid var(--page-control-border);
}

@media (min-width: 768px) {
  .author-avatar {
    inline-size: 4.5rem;
    block-size: 4.5rem;
  }

  .author-card--compact .author-avatar {
    inline-size: 4rem;
    block-size: 4rem;
  }
}

.author-verified {
  position: absolute;
  inset-inline-end: -0.25rem;
  inset-block-end: -0.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: 1.75rem;
  block-size: 1.75rem;
  border-radius: var(--radius-full);
  background: rgba(var(--color-accent-rgb), 0.18);
  color: var(--color-accent-dark);
  border: 1px solid rgba(var(--color-accent-rgb), 0.22);
}

.author-info {
  flex: 1;
  display: grid;
  gap: var(--spacing-2);
  min-inline-size: 0;
}

.author-topline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-2);
}

.author-name {
  margin: 0;
  overflow: hidden;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.author-platform {
  display: inline-flex;
  align-items: center;
  min-block-size: 1.75rem;
  padding-inline: 0.75rem;
  border-radius: var(--radius-full);
  border: 1px solid var(--page-control-border);
  background: var(--page-control-bg);
  color: var(--page-control-ink);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  text-transform: capitalize;
}

.author-username {
  margin: 0;
  overflow: hidden;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.author-description {
  margin: 0;
  overflow: hidden;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.author-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

.author-metric {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-block-size: 2rem;
  padding-inline: 0.8rem;
  border-radius: var(--radius-full);
  border: 1px solid var(--page-control-border);
  background: var(--page-control-bg);
  color: var(--page-control-ink);
  box-shadow: 0 0.8rem 1.5rem -1.45rem rgba(15, 23, 42, 0.22);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.author-card__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: auto;
  align-self: flex-end;
  inline-size: 2rem;
  block-size: 2rem;
  border-radius: var(--radius-full);
  border: 1px solid var(--page-control-border);
  background: var(--page-control-bg);
  color: var(--page-control-ink);
  box-shadow: 0 0.8rem 1.5rem -1.45rem rgba(15, 23, 42, 0.22);
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.author-card:hover .author-card__cta,
.author-card:focus-visible .author-card__cta {
  background: var(--page-control-bg-hover);
  border-color: var(--page-control-border-strong);
  color: var(--page-control-ink-strong);
  box-shadow: 0 1rem 1.85rem -1.45rem rgba(15, 23, 42, 0.28);
}
</style>
