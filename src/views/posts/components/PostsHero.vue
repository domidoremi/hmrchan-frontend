<template>
  <section ref="heroRef" class="posts-hero">
    <div class="hero-bg" aria-hidden="true"></div>
    <div class="hero-content">
      <div class="hero-badge">
        <ImageIcon :size="20" aria-hidden="true" />
        <span>{{ $t('nav.posts') }}</span>
      </div>

      <h1 class="hero-title">{{ $t('post.title') }}</h1>
      <p class="hero-subtitle">{{ $t('posts.subtitle') }}</p>

      <div class="hero-stats">
        <div class="hero-stat">
          <span class="stat-value">{{ formattedTotalPosts }}</span>
          <span class="stat-label">{{ $t('posts.totalPosts') }}</span>
        </div>
        <div class="stat-divider" aria-hidden="true"></div>
        <div class="hero-stat">
          <span class="stat-value">{{ platformCount }}</span>
          <span class="stat-label">{{ $t('posts.platforms') }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ImageIcon } from 'lucide-vue-next'
import { useSettingsStore } from '@/stores'
import { storeToRefs } from 'pinia'
import gsap from 'gsap'

// ============================================================================
// Props
// ============================================================================

interface Props {
  /** 总帖子数 */
  totalPosts: number
  /** 平台数量 */
  platformCount: number
}

const props = withDefaults(defineProps<Props>(), {
  totalPosts: 0,
  platformCount: 0,
})

// ============================================================================
// Refs & Stores
// ============================================================================

const heroRef = ref<HTMLElement | null>(null)
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

// ============================================================================
// Computed
// ============================================================================

/**
 * 格式化的总帖子数
 */
const formattedTotalPosts = computed(() => {
  return new Intl.NumberFormat('en-US', {
    notation: props.totalPosts >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(props.totalPosts)
})

// ============================================================================
// Lifecycle
// ============================================================================

onMounted(() => {
  if (!settings.value.enableAnimations) return

  // 入场动画
  const tl = gsap.timeline()

  tl.from('.hero-badge', {
    y: -20,
    opacity: 0,
    duration: 0.6,
    ease: 'power3.out',
  })
    .from(
      '.hero-title',
      {
        y: 30,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
      },
      '-=0.4',
    )
    .from(
      '.hero-subtitle',
      {
        y: 20,
        opacity: 0,
        duration: 0.6,
        ease: 'power3.out',
      },
      '-=0.4',
    )
    .from(
      '.hero-stats',
      {
        y: 20,
        opacity: 0,
        duration: 0.6,
        ease: 'power3.out',
      },
      '-=0.3',
    )
})

// ============================================================================
// Expose
// ============================================================================

defineExpose({
  heroRef,
})
</script>

<style scoped>
.posts-hero {
  position: relative;
  border-radius: clamp(24px, 3vw, 36px);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  padding: clamp(32px, 5vw, 64px);
  overflow: hidden;
  box-shadow:
    0 24px 60px -32px rgba(76, 29, 149, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.hero-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 20%, rgba(96, 165, 250, 0.18), transparent 55%),
    radial-gradient(circle at 80% 0%, rgba(236, 72, 153, 0.18), transparent 60%);
  opacity: 0.75;
  pointer-events: none;
}

.hero-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: clamp(16px, 2.5vw, 28px);
  color: var(--color-text-primary);
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.22);
  font-size: 0.875rem;
  font-weight: 600;
  width: fit-content;
}

.hero-title {
  font-size: clamp(2.4rem, 5vw, 3.6rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  margin: 0;
}

.hero-subtitle {
  font-size: clamp(1rem, 2.4vw, 1.3rem);
  line-height: 1.65;
  max-width: min(680px, 100%);
  color: var(--color-text-secondary);
  margin: 0;
}

.hero-stats {
  display: flex;
  flex-wrap: wrap;
  gap: clamp(16px, 3vw, 28px);
  align-items: center;
}

.hero-stat {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-value {
  font-size: clamp(1.6rem, 2.6vw, 2.2rem);
  font-weight: 700;
  color: var(--color-primary);
}

.stat-label {
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-tertiary);
}

.stat-divider {
  width: 1px;
  height: 36px;
  background: var(--glass-border);
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .posts-hero {
    padding: clamp(20px, 5vw, 28px);
  }

  .hero-content {
    gap: clamp(12px, 2vw, 16px);
  }

  .hero-badge {
    padding: 6px 12px;
    font-size: 0.8rem;
  }

  .hero-title {
    font-size: clamp(1.8rem, 6vw, 2.2rem);
  }

  .hero-subtitle {
    font-size: 0.95rem;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .hero-stats {
    gap: 12px;
  }

  .hero-stat {
    flex-direction: row;
    align-items: baseline;
    gap: 6px;
  }

  .stat-value {
    font-size: clamp(1.2rem, 4vw, 1.5rem);
  }

  .stat-label {
    font-size: 0.75rem;
  }

  .stat-divider {
    height: 20px;
  }
}

/* ========== 深色模式 ========== */
[data-theme='dark'] .hero-badge {
  background: rgba(63, 63, 70, 0.5);
  border-color: rgba(63, 63, 70, 0.65);
}

[data-theme='dark'] .hero-subtitle {
  color: rgba(226, 232, 240, 0.78);
}
</style>
