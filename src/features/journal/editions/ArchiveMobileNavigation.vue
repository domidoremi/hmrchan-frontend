<template>
  <div class="idol-mobile-chrome">
    <nav class="mobile-navigation idol-dock" :aria-label="t('common.primaryNavigation')">
      <RouterLink
        v-for="item in items"
        :key="item.path"
        :to="item.path"
        :aria-current="current(item) ? 'page' : undefined"
      >
        <JournalIcon :name="item.icon" /><span>{{ t(item.archiveKey) }}</span>
      </RouterLink>
      <button
        :ref="setMenuButton"
        type="button"
        class="mobile-menu-button"
        :aria-expanded="open"
        :aria-controls="open ? 'edition-mobile-menu' : undefined"
        @click="open = !open"
      >
        <JournalIcon :name="open ? 'x' : 'menu'" /><span>{{
          t(open ? 'common.close' : 'journal.nav.more')
        }}</span>
      </button>
    </nav>
    <Transition name="idol-sheet">
      <nav
        v-if="open"
        id="edition-mobile-menu"
        :ref="setDirectory"
        class="idol-menu"
        :aria-label="t('journal.nav.more')"
      >
        <RouterLink
          v-for="item in additionalItems"
          :key="item.path"
          :to="item.path"
          :aria-current="current(item) ? 'page' : undefined"
          @click="closeMenu"
        >
          <JournalIcon :name="item.icon" /><span>{{ t(item.archiveKey) }}</span>
        </RouterLink>
        <button type="button" data-action="search" @click="closeMenu">
          <JournalIcon name="search" /><span>{{ t('common.search') }}</span>
        </button>
        <button type="button" data-action="notifications" @click="closeMenu">
          <JournalIcon name="bell" /><span>{{ t('journal.nav.savedSchedule') }}</span>
        </button>
        <button type="button" class="appearance-trigger" @click="openAppearance">
          <JournalIcon name="sliders" /><span>{{ t('journal.appearance.title') }}</span>
        </button>
        <RouterLink to="/profile" @click="closeMenu">
          <JournalIcon name="users" /><span>{{
            t(authenticated ? 'journal.nav.myAccount' : 'nav.login')
          }}</span>
        </RouterLink>
      </nav>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, type ComponentPublicInstance } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import JournalIcon from '../JournalIcon.vue'

type Destination = { path: string; key: string; archiveKey: string; icon: string }
defineProps<{
  items: Destination[]
  additionalItems: Destination[]
  current: (item: Destination) => boolean
  authenticated: boolean
}>()
const emit = defineEmits<{
  menuButton: [element: HTMLButtonElement | null]
  directory: [element: HTMLElement | null]
  appearance: []
}>()
const open = defineModel<boolean>('open', { required: true })
const { t } = useI18n({ useScope: 'global' })
const trigger = ref<HTMLButtonElement | null>(null)

function setMenuButton(element: Element | ComponentPublicInstance | null) {
  trigger.value = element instanceof HTMLButtonElement ? element : null
  emit('menuButton', trigger.value)
}
function setDirectory(element: Element | ComponentPublicInstance | null) {
  emit('directory', element instanceof HTMLElement ? element : null)
}
function closeMenu() {
  trigger.value?.focus({ preventScroll: true })
  open.value = false
}
function openAppearance() {
  closeMenu()
  emit('appearance')
}
</script>
