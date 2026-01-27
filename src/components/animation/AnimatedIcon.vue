<template>
  <div
    class="animated-icon"
    :class="[
      `animated-icon--${size}`,
      { 'animated-icon--active': isActive, 'animated-icon--reduced': reducedMotion },
    ]"
  >
    <!-- Lottie 动画模式 -->
    <div
      v-if="hasLottieAnimation && !reducedMotion"
      ref="lottieRef"
      class="animated-icon__lottie"
    />

    <!-- 静态图标降级模式 -->
    <slot v-else>
      <component :is="fallbackIcon" :size="iconSize" class="animated-icon__fallback" />
    </slot>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, type Component } from 'vue'
import { useLottie } from '@/composables/useLottie'

// 内置动画数据 - 使用简单的 CSS 动画替代 Lottie JSON
// 实际项目中可以导入真正的 Lottie JSON 文件
const builtInAnimations: Record<string, object | null> = {
  home: null, // 将在实际使用时加载
  explore: null,
  heart: null,
  user: null,
  search: null,
  loading: null,
}

interface Props {
  /** 动画名称 (内置: home, explore, heart, user, search, loading) */
  name?: keyof typeof builtInAnimations | string
  /** 自定义 Lottie JSON 数据 */
  animationData?: object
  /** 是否激活状态 */
  active?: boolean
  /** 是否在悬停时播放 */
  playOnHover?: boolean
  /** 是否循环 */
  loop?: boolean
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** 降级使用的静态图标 */
  fallbackIcon?: Component
}

const props = withDefaults(defineProps<Props>(), {
  active: false,
  playOnHover: false,
  loop: false,
  size: 'md',
})

const lottieRef = ref<HTMLElement | null>(null)

// 检测是否偏好减少动画
const reducedMotion = ref(false)
onMounted(() => {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }
})

// 计算是否有 Lottie 动画可用
const hasLottieAnimation = computed(() => {
  if (props.animationData) return true
  if (props.name && builtInAnimations[props.name] !== undefined) {
    return builtInAnimations[props.name] !== null
  }
  return false
})

// 获取动画数据
const animationData = computed(() => {
  if (props.animationData) return props.animationData
  if (props.name && builtInAnimations[props.name]) {
    return builtInAnimations[props.name]
  }
  return undefined
})

// 图标尺寸映射
const iconSizeMap = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
}

const iconSize = computed(() => iconSizeMap[props.size])

// 是否激活
const isActive = computed(() => props.active)

// 初始化 Lottie（如果有动画数据）
const lottieInstance =
  hasLottieAnimation.value && animationData.value
    ? useLottie(lottieRef, {
        animationData: animationData.value,
        loop: props.loop,
        autoplay: false,
      })
    : null

// 监听激活状态
watch(
  () => props.active,
  (active) => {
    if (!lottieInstance || reducedMotion.value) return
    if (active) {
      lottieInstance.play()
    } else {
      lottieInstance.stop()
    }
  },
  { immediate: true }
)

// 暴露方法
defineExpose({
  play: () => lottieInstance?.play(),
  pause: () => lottieInstance?.pause(),
  stop: () => lottieInstance?.stop(),
})
</script>

<style scoped>
.animated-icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.animated-icon--sm {
  width: 16px;
  height: 16px;
}

.animated-icon--md {
  width: 20px;
  height: 20px;
}

.animated-icon--lg {
  width: 24px;
  height: 24px;
}

.animated-icon--xl {
  width: 32px;
  height: 32px;
}

.animated-icon__lottie {
  width: 100%;
  height: 100%;
}

.animated-icon__fallback {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* 激活状态动画 - 当没有 Lottie 时使用 CSS */
.animated-icon--active:not(.animated-icon--reduced) .animated-icon__fallback {
  animation: icon-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes icon-pop {
  0% {
    transform: scale(0.8);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

/* Reduced motion 模式 */
.animated-icon--reduced .animated-icon__fallback {
  transition: none;
  animation: none;
}
</style>
