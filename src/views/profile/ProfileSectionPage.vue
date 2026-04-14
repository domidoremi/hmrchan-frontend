<template>
  <section
    class="profile-section-page"
    data-testid="profile-section-shell"
    :data-profile-section="props.sectionId"
  >
    <ProfileSubPageHeader :title="title" :hint="hint" />
    <div data-testid="profile-section-content">
      <component :is="resolvedComponent" v-bind="resolvedProps" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { profileSectionMap, type ProfileSectionId } from '@/config/profileSections'
import ProfileSubPageHeader from '@/components/profile/ProfileSubPageHeader.vue'
import ProfileCommentFavoritesTab from '@/components/profile/ProfileCommentFavoritesTab.vue'
import ProfileCommentsTab from '@/components/profile/ProfileCommentsTab.vue'
import ProfileFavoritesTab from '@/components/profile/ProfileFavoritesTab.vue'
import ProfileHistoryTab from '@/components/profile/ProfileHistoryTab.vue'
import ProfileLikesTab from '@/components/profile/ProfileLikesTab.vue'
import ProfileRelationsTab from '@/components/profile/ProfileRelationsTab.vue'
import ProfileReportsTab from '@/components/profile/ProfileReportsTab.vue'
import ProfileSecurityTab from '@/components/profile/ProfileSecurityTab.vue'

type RoutedProfileSectionId = Extract<
  ProfileSectionId,
  | 'favorites'
  | 'comments'
  | 'likes'
  | 'comment-favorites'
  | 'history'
  | 'reports'
  | 'security-activity'
  | 'followers'
  | 'following'
  | 'blocked'
>

const props = defineProps<{
  sectionId: RoutedProfileSectionId
}>()

const { t } = useI18n()

const section = computed(() => profileSectionMap[props.sectionId])
const title = computed(() => t(section.value.labelKey))
const hint = computed(() => (section.value.hintKey ? t(section.value.hintKey) : undefined))

const resolvedComponent = computed(() => {
  switch (props.sectionId) {
    case 'favorites':
      return ProfileFavoritesTab
    case 'comments':
      return ProfileCommentsTab
    case 'likes':
      return ProfileLikesTab
    case 'comment-favorites':
      return ProfileCommentFavoritesTab
    case 'history':
      return ProfileHistoryTab
    case 'reports':
      return ProfileReportsTab
    case 'security-activity':
      return ProfileSecurityTab
    case 'followers':
    case 'following':
    case 'blocked':
      return ProfileRelationsTab
    default:
      return ProfileFavoritesTab
  }
})

const resolvedProps = computed(() => {
  if (
    props.sectionId === 'followers' ||
    props.sectionId === 'following' ||
    props.sectionId === 'blocked'
  ) {
    return {
      mode: props.sectionId,
      showHeader: false,
    }
  }

  if (props.sectionId === 'comments') {
    return {}
  }

  return {
    showHeader: false,
  }
})
</script>

<style scoped>
.profile-section-page {
  display: grid;
  gap: clamp(1rem, 2.4vw, 1.5rem);
  padding: var(--spacing-4) 0 var(--spacing-8);
}
</style>
