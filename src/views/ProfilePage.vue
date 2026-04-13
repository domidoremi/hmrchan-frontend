<template>
  <div class="profile-page">
    <div class="profile-banner" />

    <div class="container">
      <section class="profile-overview glass-card--editorial">
        <div class="profile-overview__hero">
          <div class="profile-overview__identity">
            <Avatar :src="userAvatar" :alt="username" size="xl" class="profile-avatar" />
            <div class="profile-overview__copy">
              <p class="profile-overview__eyebrow">{{ $t('nav.profile') }}</p>
              <div class="profile-overview__name-row">
                <h1 class="profile-overview__name">{{ displayName }}</h1>
                <ControlButton
                  class="profile-overview__edit"
                  size="square"
                  icon-only
                  :aria-label="$t('profile.editProfile')"
                  @click="editProfile"
                >
                  <template #start>
                    <Pencil :size="14" />
                  </template>
                </ControlButton>
              </div>
              <p class="profile-overview__handle">@{{ username }}</p>
              <p class="profile-overview__hint">{{ $t('profile.overviewHint') }}</p>
            </div>
          </div>

          <div class="profile-overview__summary">
            <article v-for="item in summaryItems" :key="item.key" class="summary-card">
              <span class="summary-card__label">{{ item.label }}</span>
              <strong class="summary-card__value">{{ item.value }}</strong>
            </article>
          </div>
        </div>

        <div class="profile-groups">
          <section v-for="group in groupedSections" :key="group.id" class="profile-group">
            <div class="profile-group__head">
              <h2 class="profile-group__title">{{ group.title }}</h2>
            </div>

            <div class="profile-group__grid">
              <RouterLink
                v-for="section in group.sections"
                :key="section.id"
                :to="section.route"
                class="profile-nav-card"
              >
                <div class="profile-nav-card__icon">
                  <component :is="section.icon" :size="18" />
                </div>
                <div class="profile-nav-card__body">
                  <div class="profile-nav-card__top">
                    <h3 class="profile-nav-card__title">{{ $t(section.labelKey) }}</h3>
                    <span v-if="resolveCount(section) !== null" class="profile-nav-card__count">
                      {{ resolveCount(section) }}
                    </span>
                  </div>
                  <p class="profile-nav-card__hint">
                    {{ section.hintKey ? $t(section.hintKey) : $t('profile.manageSection') }}
                  </p>
                </div>
                <span class="profile-nav-card__cta">{{ $t('profile.viewSection') }}</span>
              </RouterLink>
            </div>
          </section>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ProfilePage' })

import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Pencil } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore, useNotificationsStore } from '@/stores'
import { getUserAvatarUrl } from '@/composables/useUserAvatar'
import { ensureProtectedPageReady } from '@/composables/useProtectedPageBootstrap'
import { profileSections, type ProfileSectionDefinition } from '@/config/profileSections'
import { userService } from '@/api/userService'
import Avatar from '@/components/ui/Avatar.vue'
import ControlButton from '@/components/appearance/ControlButton.vue'

type AccountDataSummary = Awaited<ReturnType<typeof userService.getDataSummary>> & {
  data_counts?: Record<string, number | null | undefined>
}

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const notifStore = useNotificationsStore()
const { user } = storeToRefs(authStore)

const dataSummary = ref<AccountDataSummary | null>(null)

const username = computed(() => user.value?.username ?? '')
const displayName = computed(() => {
  const fullName = (user.value as { full_name?: string } | null)?.full_name
  return fullName || user.value?.username || ''
})
const userAvatar = computed(() => getUserAvatarUrl(user.value?.avatar_url, user.value?.username))

const summaryItems = computed(() => {
  const counts = (dataSummary.value?.data_counts ?? {}) as Record<string, number | null | undefined>
  return [
    {
      key: 'favorites',
      label: t('profile.tabs.favorites'),
      value: counts['favorites'] ?? 0,
    },
    {
      key: 'comments',
      label: t('profile.tabs.comments'),
      value: counts['comments'] ?? 0,
    },
    {
      key: 'followers',
      label: t('profile.tabs.followers'),
      value: counts['followers'] ?? 0,
    },
    {
      key: 'following',
      label: t('profile.tabs.following'),
      value: counts['following'] ?? 0,
    },
  ]
})

const groupedSections = computed(() => {
  const groups: Array<{
    id: 'content' | 'activity' | 'network' | 'account'
    title: string
    sections: ProfileSectionDefinition[]
  }> = [
    {
      id: 'content',
      title: t('profile.groups.content'),
      sections: profileSections.filter((section) => section.group === 'content'),
    },
    {
      id: 'activity',
      title: t('profile.groups.activity'),
      sections: profileSections.filter((section) => section.group === 'activity'),
    },
    {
      id: 'network',
      title: t('profile.groups.network'),
      sections: profileSections.filter((section) => section.group === 'network'),
    },
    {
      id: 'account',
      title: t('profile.groups.account'),
      sections: profileSections.filter((section) => section.group === 'account'),
    },
  ]

  return groups.filter((group) => group.sections.length > 0)
})

function resolveCount(section: ProfileSectionDefinition): number | null {
  if (section.id === 'notifications') {
    return notifStore.unreadDisplayCount ?? 0
  }

  const counts = (dataSummary.value?.data_counts ?? {}) as Record<string, number | null | undefined>
  if (!section.countKey) return null
  const value = counts[section.countKey]
  return typeof value === 'number' ? value : null
}

function editProfile() {
  router.push('/profile/settings#basic-info')
}

async function loadProfileOverview() {
  const ready = await ensureProtectedPageReady(authStore, 'authenticated')
  if (!ready) {
    router.push('/login')
    return
  }

  const [summaryResult] = await Promise.allSettled([
    userService.getDataSummary(),
    notifStore.fetchSummary(),
  ])

  if (summaryResult.status === 'fulfilled') {
    dataSummary.value = summaryResult.value as AccountDataSummary
  } else {
    dataSummary.value = null
  }
}

onMounted(() => {
  void loadProfileOverview()
})
</script>

<style scoped>
.profile-page {
  padding-bottom: var(--spacing-8);
}

.profile-banner {
  block-size: clamp(8rem, 18vw, 13rem);
}

.container {
  display: grid;
  gap: var(--spacing-4);
}

.profile-overview {
  display: grid;
  gap: clamp(1.25rem, 3vw, 1.75rem);
  margin-top: clamp(-3rem, -5vw, -4rem);
  padding: clamp(1.25rem, 3vw, 1.75rem);
  border-radius: var(--profile-shell-radius);
  border: 1px solid var(--profile-surface-border);
  background: var(--profile-surface-bg);
  box-shadow: var(--profile-surface-shadow);
}

.profile-overview__hero {
  display: grid;
  gap: clamp(1rem, 2vw, 1.5rem);
}

.profile-overview__identity {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: clamp(1rem, 2vw, 1.25rem);
  align-items: center;
}

.profile-avatar {
  border: 0.1875rem solid var(--color-background);
  box-shadow: var(--glass-shadow-md);
}

.profile-overview__copy {
  display: grid;
  gap: 0.35rem;
  min-inline-size: 0;
}

.profile-overview__eyebrow {
  margin: 0;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.profile-overview__name-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  min-inline-size: 0;
}

.profile-overview__name {
  margin: 0;
  min-inline-size: 0;
  font-size: clamp(1.5rem, 2vw + 1rem, 2.1rem);
  line-height: 1.2;
  color: var(--color-text-primary);
}

.profile-overview__edit.page-control {
  flex-shrink: 0;
}

.profile-overview__handle,
.profile-overview__hint {
  margin: 0;
  font-size: var(--text-sm);
}

.profile-overview__handle {
  color: var(--color-text-tertiary);
}

.profile-overview__hint {
  color: var(--color-text-secondary);
  max-inline-size: 52ch;
}

.profile-overview__summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
  gap: var(--spacing-3);
}

.summary-card {
  display: grid;
  gap: 0.35rem;
  padding: 0.875rem 1rem;
  border-radius: 1rem;
  border: 1px solid var(--profile-surface-border);
  background: color-mix(in srgb, var(--profile-surface-bg-soft) 92%, transparent);
}

.summary-card__label {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.summary-card__value {
  font-size: clamp(1.125rem, 1vw + 0.875rem, 1.5rem);
  color: var(--color-text-primary);
}

.profile-groups {
  display: grid;
  gap: clamp(1rem, 2.2vw, 1.5rem);
}

.profile-group {
  display: grid;
  gap: var(--spacing-3);
}

.profile-group__title {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.profile-group__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
  gap: var(--spacing-3);
}

.profile-nav-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.875rem;
  align-items: start;
  padding: 1rem;
  border-radius: 1rem;
  border: 1px solid var(--profile-surface-border);
  background: color-mix(in srgb, var(--profile-surface-bg-soft) 94%, transparent);
  color: inherit;
  text-decoration: none;
  transition:
    transform var(--duration-fast) var(--ease-out-smooth),
    border-color var(--duration-fast) var(--ease-smooth),
    box-shadow var(--duration-fast) var(--ease-smooth);
}

.profile-nav-card:hover,
.profile-nav-card:focus-visible {
  outline: none;
  transform: translateY(-0.125rem);
  border-color: var(--profile-surface-border-strong);
  box-shadow: var(--profile-surface-shadow-hover);
}

.profile-nav-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: 2.5rem;
  block-size: 2.5rem;
  border-radius: 0.875rem;
  background: rgba(var(--color-primary-rgb), 0.08);
  color: var(--color-primary);
}

.profile-nav-card__body {
  display: grid;
  gap: 0.35rem;
  min-inline-size: 0;
}

.profile-nav-card__top {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.profile-nav-card__title {
  margin: 0;
  min-inline-size: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.profile-nav-card__count {
  display: inline-flex;
  align-items: center;
  min-block-size: 1.5rem;
  padding-inline: 0.5rem;
  border-radius: 999rem;
  background: rgba(var(--color-primary-rgb), 0.1);
  color: var(--color-primary);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.profile-nav-card__hint {
  margin: 0;
  font-size: var(--text-xs);
  line-height: 1.5;
  color: var(--color-text-tertiary);
}

.profile-nav-card__cta {
  align-self: center;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-primary);
}

@media (max-width: 768px) {
  .profile-overview {
    margin-top: -2rem;
    padding: 1rem;
  }

  .profile-overview__identity {
    grid-template-columns: 1fr;
  }

  .profile-nav-card {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .profile-nav-card__cta {
    grid-column: 2;
    justify-self: start;
  }
}
</style>
