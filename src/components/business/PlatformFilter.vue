<script setup lang="ts">
import { ref } from 'vue'
import { Video, X } from 'lucide-vue-next'
import { useContextualBackground } from '@/composables/useContextualBackground'

type Platform = 'all' | 'instagram' | 'tiktok' | 'youtube' | 'twitter'

interface Props {
  modelValue?: Platform
}

const { modelValue = 'all' } = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: Platform]
}>()

const { setExploreFilter } = useContextualBackground()

const platforms = [
  { id: 'all' as const, label: 'All', icon: null },
  { id: 'instagram' as const, label: 'Instagram', icon: null },
  { id: 'tiktok' as const, label: 'TikTok', icon: Video },
  { id: 'youtube' as const, label: 'YouTube', icon: null },
  { id: 'twitter' as const, label: 'X', icon: X },
]

const selected = ref<Platform>(modelValue)

const selectPlatform = (platform: Platform) => {
  selected.value = platform
  emit('update:modelValue', platform)
  setExploreFilter(platform)
}
</script>

<template>
  <div class="platform-filter">
    <button
      v-for="platform in platforms"
      :key="platform.id"
      class="platform-btn"
      :class="{ 'is-active': selected === platform.id, [`platform-${platform.id}`]: true }"
      @click="selectPlatform(platform.id)"
    >
      <component :is="platform.icon" v-if="platform.icon" class="platform-icon" :size="20" />
      <span class="platform-label">{{ platform.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.platform-filter {
  display: flex;
  gap: 0.5rem;
  padding: 1rem;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border-radius: 12px;
  border: 1px solid var(--glass-border);
  flex-wrap: wrap;
  transition: all 0.3s ease;
}

.platform-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: transparent;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  position: relative;
  overflow: hidden;
}

.platform-btn::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 0;
  height: 2px;
  background: currentColor;
  transform: translateX(-50%);
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.platform-btn:hover {
  background: var(--color-primary-alpha);
}

.platform-btn.is-active {
  color: var(--color-primary);
  background: var(--color-primary-alpha);
}

.platform-btn.is-active::before {
  width: 80%;
}

/* Platform-specific indicator styles */
.platform-btn.platform-instagram.is-active::before {
  background: linear-gradient(
    45deg,
    #f09433 0%,
    #e6683c 25%,
    #dc2743 50%,
    #cc2366 75%,
    #bc1888 100%
  );
  height: 3px;
  box-shadow: 0 2px 8px rgba(225, 48, 108, 0.3);
}

.platform-btn.platform-tiktok.is-active::before {
  background: linear-gradient(90deg, #00f2ea 0%, #ff0050 100%);
  height: 3px;
  animation: wave-line 2s ease-in-out infinite;
}

.platform-btn.platform-youtube.is-active::before {
  background: #ff0000;
  height: 4px;
  box-shadow: 0 0 12px rgba(255, 0, 0, 0.4);
}

.platform-btn.platform-twitter.is-active::before {
  background: #1da1f2;
  height: 2px;
  animation: pulse-line 1.5s ease-in-out infinite;
}

.platform-icon {
  flex-shrink: 0;
}

.platform-label {
  white-space: nowrap;
}

@keyframes wave-line {
  0%,
  100% {
    transform: translateX(-50%) scaleX(1);
  }
  50% {
    transform: translateX(-50%) scaleX(1.2);
  }
}

@keyframes pulse-line {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

/* Responsive */
@media (max-width: 640px) {
  .platform-filter {
    gap: 0.25rem;
    padding: 0.75rem;
  }

  .platform-btn {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
  }

  .platform-icon {
    width: 16px;
    height: 16px;
  }
}
</style>
