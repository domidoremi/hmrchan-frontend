<template>
  <Transition name="hero-fade" @after-enter="onHeroEnter">
    <section v-if="visible" ref="heroRef" class="hero-section">
      <!-- 动态背景 -->
      <div class="hero-background">
        <div ref="gradientRef" class="hero-gradient"></div>
        <div ref="meshRef" class="hero-mesh"></div>
        <div class="hero-particles"></div>
      </div>

      <!-- 内容容器 -->
      <div class="hero-container">
        <!-- 关闭按钮 -->
        <button
          ref="closeButtonRef"
          class="hero-close"
          @click="$emit('close')"
          :aria-label="$t('common.close')"
        >
          <X :size="24" />
        </button>

        <!-- Hero内容 -->
        <div ref="contentRef" class="hero-content">
          <!-- 徽章 -->
          <div class="hero-badge">
            <span ref="badgeDotRef" class="badge-dot"></span>
            <span>{{ badgeText }}</span>
          </div>

          <!-- 标题 -->
          <h1 class="hero-title">
            {{ title }}
          </h1>

          <!-- 描述 -->
          <p class="hero-description">
            {{ description }}
          </p>

          <!-- 操作按钮 -->
          <div class="hero-actions">
            <button ref="primaryBtnRef" class="btn-primary" @click="$emit('explore')">
              <Compass :size="20" />
              <span>{{ primaryButtonText }}</span>
              <ArrowRight :size="18" class="btn-icon" />
            </button>
            <button
              v-if="showSecondaryButton"
              ref="secondaryBtnRef"
              class="btn-secondary"
              @click="$emit('secondary-action')"
            >
              <span>{{ secondaryButtonText }}</span>
            </button>
          </div>

          <!-- 统计信息 -->
          <div v-if="stats" class="hero-stats">
            <template v-for="(stat, index) in stats" :key="index">
              <div class="stat-item">
                <span class="stat-value">{{ stat.value }}</span>
                <span class="stat-label">{{ stat.label }}</span>
              </div>
              <div v-if="index < stats.length - 1" class="stat-divider"></div>
            </template>
          </div>
        </div>
      </div>
    </section>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount, watch } from 'vue'
import { X, Compass, ArrowRight } from 'lucide-vue-next'
import { orchestrateHeroAnimations, animateHeroExit } from '@/utils/animation/hero-animations'
import type { GSAPContext } from '@/utils/animation/gsap-utils'
import gsap from 'gsap'
import { useAnimation } from '@/composables'

/**
 * Hero Section 组件
 *
 * 使用 GSAP 实现的高性能 Hero 区域动画
 *
 * Props:
 * @property {boolean} visible - 是否显示Hero区域
 * @property {string} title - 主标题
 * @property {string} description - 描述文本
 * @property {string} badgeText - 徽章文本
 * @property {string} primaryButtonText - 主按钮文本
 * @property {string} secondaryButtonText - 副按钮文本
 * @property {boolean} showSecondaryButton - 是否显示副按钮
 * @property {Array} stats - 统计数据数组
 *
 * Emits:
 * @event close - 关闭Hero区域
 * @event explore - 点击主按钮
 * @event secondary-action - 点击副按钮
 */

/** Props 定义 */
interface Props {
  /** 是否显示Hero区域 */
  visible?: boolean
  /** 主标题 */
  title: string
  /** 描述文本 */
  description: string
  /** 徽章文本 */
  badgeText?: string
  /** 主按钮文本 */
  primaryButtonText?: string
  /** 副按钮文本 */
  secondaryButtonText?: string
  /** 是否显示副按钮 */
  showSecondaryButton?: boolean
  /** 统计数据 */
  stats?: Array<{ value: string | number; label: string }>
}

const props = withDefaults(defineProps<Props>(), {
  visible: true,
  badgeText: 'Discover Amazing Content',
  primaryButtonText: 'Explore',
  secondaryButtonText: 'Learn More',
  showSecondaryButton: true,
})

/** Emits 定义 - 模板中通过 $emit 使用 */
defineEmits<{
  close: []
  explore: []
  'secondary-action': []
}>()

/** DOM引用 */
const heroRef = ref<HTMLElement>()
const gradientRef = ref<HTMLElement>()
const meshRef = ref<HTMLElement>()
const contentRef = ref<HTMLElement>()
const badgeDotRef = ref<HTMLElement>()
const closeButtonRef = ref<HTMLElement>()
const primaryBtnRef = ref<HTMLElement>()
const secondaryBtnRef = ref<HTMLElement>()

/** GSAP 动画上下文 */
let animationContext: GSAPContext = null
let masterTimeline: gsap.core.Timeline | null = null

const { shouldAnimate } = useAnimation()

/**
 * Hero进场后触发动画
 */
const onHeroEnter = () => {
  if (!heroRef.value || !shouldAnimate.value) return

  // 创建GSAP上下文
  animationContext = gsap.context(() => {
    // 执行完整的Hero动画编排
    masterTimeline = orchestrateHeroAnimations(heroRef.value!)
  })
}

/**
 * 监听visible变化，处理退场动画
 */
watch(
  () => props.visible,
  (newVal, oldVal) => {
    if (!shouldAnimate.value) return

    if (!newVal && oldVal && heroRef.value) {
      // 执行退场动画
      animateHeroExit(heroRef.value)
    }
  },
)

/** 组件卸载时清理动画 */
onBeforeUnmount(() => {
  if (animationContext) {
    animationContext.revert()
  }
  if (masterTimeline) {
    masterTimeline.kill()
  }
})
</script>

<style scoped>
/* 导入样式 */
@import '@/styles/pages/home.css';

/* Hero Section基础样式已在home.css中定义 */

/* Vue Transition */
.hero-fade-enter-active {
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.hero-fade-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.6, 1);
}

.hero-fade-enter-from {
  opacity: 0;
  transform: translateY(-20px) scale(0.98);
}

.hero-fade-leave-to {
  opacity: 0;
  transform: translateY(-30px) scale(0.95);
}

/* 粒子背景效果 */
.hero-particles {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle at 10% 20%, rgba(139, 92, 246, 0.05) 0%, transparent 40%),
    radial-gradient(circle at 90% 80%, rgba(6, 182, 212, 0.05) 0%, transparent 40%),
    radial-gradient(circle at 50% 50%, rgba(244, 114, 182, 0.03) 0%, transparent 50%);
  animation: particlesFloat 25s ease-in-out infinite;
}

@keyframes particlesFloat {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }
  25% {
    transform: translate(20px, -15px) rotate(1deg);
  }
  50% {
    transform: translate(-15px, 20px) rotate(-1deg);
  }
  75% {
    transform: translate(15px, 15px) rotate(0.5deg);
  }
}

/* 性能优化 */
.hero-gradient,
.hero-mesh,
.hero-particles {
  will-change: transform;
  transform: translateZ(0);
  backface-visibility: hidden;
}

/* GPU加速 */
.hero-badge,
.hero-title,
.hero-description,
.hero-actions,
.hero-stats {
  will-change: opacity, transform;
  transform: translateZ(0);
}

/* 移动端优化 */
@media (max-width: 768px) {
  .hero-particles {
    opacity: 0.5;
  }
}

/* 减少动画偏好 */
@media (prefers-reduced-motion: reduce) {
  .hero-fade-enter-active,
  .hero-fade-leave-active {
    transition: opacity 0.2s;
  }

  .hero-fade-enter-from,
  .hero-fade-leave-to {
    transform: none;
  }

  .hero-particles,
  .hero-mesh {
    animation: none;
  }
}
</style>
