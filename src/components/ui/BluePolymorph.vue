<template>
  <div
    class="blue-polymorph-container"
    :class="morphClassName"
    :style="morphCSSVars"
    aria-hidden="true"
  >
    <!-- 默认状态：液态球体 -->
    <div class="morph-shape morph-sphere-shape">
      <div class="sphere-core" />
      <div class="sphere-ripple sphere-ripple-1" />
      <div class="sphere-ripple sphere-ripple-2" />
      <div class="sphere-ripple sphere-ripple-3" />
    </div>

    <!-- Instagram：晶体方块 -->
    <div class="morph-shape morph-crystal-shape">
      <div v-for="i in 9" :key="`crystal-${i}`" class="crystal-cube" :style="getCrystalStyle(i)" />
    </div>

    <!-- TikTok：律动波流 -->
    <div class="morph-shape morph-wave-shape">
      <div v-for="i in 12" :key="`wave-${i}`" class="wave-band" :style="getWaveStyle(i)" />
    </div>

    <!-- YouTube：播放棱镜 -->
    <div class="morph-shape morph-prism-shape">
      <div class="prism-triangle" />
      <div class="prism-ring prism-ring-1" />
      <div class="prism-ring prism-ring-2" />
    </div>

    <!-- X/Twitter：粒子网络 -->
    <div class="morph-shape morph-particles-shape">
      <svg class="particles-svg" viewBox="0 0 400 400">
        <g class="particles-group">
          <circle
            v-for="(particle, i) in particles"
            :key="`particle-${i}`"
            :cx="particle.x"
            :cy="particle.y"
            :r="particle.r"
            class="particle-dot"
          />
          <line
            v-for="(line, i) in particleLines"
            :key="`line-${i}`"
            :x1="line.x1"
            :y1="line.y1"
            :x2="line.x2"
            :y2="line.y2"
            class="particle-line"
          />
        </g>
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'BluePolymorph' })

import { computed } from 'vue'

interface Props {
  morphClassName: string
  morphCSSVars: Record<string, string | number>
}

defineProps<Props>()

// Instagram 晶体方块位置
function getCrystalStyle(index: number) {
  const positions = [
    { x: 0, y: 0, z: 0, rotate: 0 },
    { x: -60, y: -40, z: 20, rotate: 15 },
    { x: 60, y: -30, z: -10, rotate: -20 },
    { x: -40, y: 50, z: 30, rotate: 25 },
    { x: 50, y: 40, z: -20, rotate: -15 },
    { x: 0, y: -70, z: 40, rotate: 30 },
    { x: -70, y: 20, z: -30, rotate: -25 },
    { x: 70, y: 10, z: 15, rotate: 20 },
    { x: 0, y: 70, z: -40, rotate: -30 },
  ]

  const pos = positions[index - 1]
  if (!pos) {
    return {
      '--crystal-x': '0px',
      '--crystal-y': '0px',
      '--crystal-z': '0px',
      '--crystal-rotate': '0deg',
      '--crystal-delay': `${index * 0.05}s`,
    }
  }
  return {
    '--crystal-x': `${pos.x}px`,
    '--crystal-y': `${pos.y}px`,
    '--crystal-z': `${pos.z}px`,
    '--crystal-rotate': `${pos.rotate}deg`,
    '--crystal-delay': `${index * 0.05}s`,
  }
}

// TikTok 波浪带位置
function getWaveStyle(index: number) {
  return {
    '--wave-index': index,
    '--wave-delay': `${index * 0.03}s`,
    '--wave-offset': `${(index - 6) * 15}px`,
  }
}

// X/Twitter 粒子网络数据
const particles = computed(() => {
  const count = 40
  const result = []
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2
    const radius = 120 + Math.random() * 60
    result.push({
      x: 200 + Math.cos(angle) * radius,
      y: 200 + Math.sin(angle) * radius,
      r: 2 + Math.random() * 2,
    })
  }
  return result
})

const particleLines = computed(() => {
  const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
  const pts = particles.value
  for (let i = 0; i < pts.length; i++) {
    const currentPoint = pts[i]
    if (!currentPoint) continue

    // 连接到最近的 3 个粒子
    const distances = pts
      .map((p, j) => ({
        index: j,
        dist: Math.hypot(p.x - currentPoint.x, p.y - currentPoint.y),
      }))
      .filter((d) => d.index !== i)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3)

    distances.forEach((d) => {
      if (d.index > i) {
        const targetPoint = pts[d.index]
        if (!targetPoint) return
        // 避免重复连线
        lines.push({
          x1: currentPoint.x,
          y1: currentPoint.y,
          x2: targetPoint.x,
          y2: targetPoint.y,
        })
      }
    })
  }
  return lines
})
</script>

<style scoped>
.blue-polymorph-container {
  position: fixed;
  top: 50%;
  right: 10%;
  width: 400px;
  height: 400px;
  transform: translate(0, -50%);
  pointer-events: none;
  z-index: 0;
  perspective: 1200px;
  opacity: 0.85;
}

/* 响应式调整 */
@media (max-width: 1024px) {
  .blue-polymorph-container {
    width: 300px;
    height: 300px;
    right: 5%;
  }
}

@media (max-width: 768px) {
  .blue-polymorph-container {
    width: 200px;
    height: 200px;
    top: 20%;
    right: -50px;
    opacity: 0.6;
  }
}

/* 形态基础样式 */
.morph-shape {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: scale(0.8);
  transition:
    opacity var(--morph-duration, 0.8s) ease-in-out,
    transform var(--morph-duration, 0.8s) ease-in-out;
}

/* 当前激活的形态 */
.morph-sphere .morph-sphere-shape,
.morph-crystal .morph-crystal-shape,
.morph-wave .morph-wave-shape,
.morph-prism .morph-prism-shape,
.morph-particles .morph-particles-shape {
  opacity: 1;
  transform: scale(1);
}

/* ========== 默认状态：液态球体 ========== */
.morph-sphere-shape {
  transform-style: preserve-3d;
}

.sphere-core {
  width: 200px;
  height: 200px;
  background: radial-gradient(
    circle at 30% 30%,
    rgba(var(--morph-color, #4169e1), 0.9),
    var(--morph-color, #4169e1)
  );
  border-radius: 50%;
  box-shadow:
    0 0 60px rgba(var(--morph-color, #4169e1), 0.6),
    inset 0 0 40px rgba(255, 255, 255, 0.2);
  animation: breathe 4s ease-in-out infinite;
}

@keyframes breathe {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.sphere-ripple {
  position: absolute;
  width: 200px;
  height: 200px;
  border: 2px solid var(--morph-color, #4169e1);
  border-radius: 50%;
  opacity: 0;
  animation: ripple 3s ease-out infinite;
}

.sphere-ripple-1 {
  animation-delay: 0s;
}

.sphere-ripple-2 {
  animation-delay: 1s;
}

.sphere-ripple-3 {
  animation-delay: 2s;
}

@keyframes ripple {
  0% {
    transform: scale(1);
    opacity: 0.6;
  }
  100% {
    transform: scale(1.8);
    opacity: 0;
  }
}

/* ========== Instagram：晶体方块 ========== */
.morph-crystal-shape {
  transform-style: preserve-3d;
}

.crystal-cube {
  position: absolute;
  width: 60px;
  height: 60px;
  background: linear-gradient(
    135deg,
    rgba(var(--morph-color, #4169e1), 0.3),
    rgba(var(--morph-color, #4169e1), 0.1)
  );
  border: 1px solid rgba(var(--morph-color, #4169e1), 0.4);
  border-radius: 8px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(var(--morph-color, #4169e1), 0.2);
  transform: translate3d(var(--crystal-x, 0), var(--crystal-y, 0), var(--crystal-z, 0))
    rotateX(var(--crystal-rotate, 0)) rotateY(var(--crystal-rotate, 0));
  animation: crystal-float 4s ease-in-out infinite;
  animation-delay: var(--crystal-delay, 0s);
}

@keyframes crystal-float {
  0%,
  100% {
    transform: translate3d(var(--crystal-x, 0), var(--crystal-y, 0), var(--crystal-z, 0))
      rotateX(var(--crystal-rotate, 0)) rotateY(var(--crystal-rotate, 0));
  }
  50% {
    transform: translate3d(
        var(--crystal-x, 0),
        calc(var(--crystal-y, 0) - 20px),
        var(--crystal-z, 0)
      )
      rotateX(calc(var(--crystal-rotate, 0) + 10deg))
      rotateY(calc(var(--crystal-rotate, 0) + 10deg));
  }
}

/* ========== TikTok：律动波流 ========== */
.morph-wave-shape {
  flex-direction: column;
  gap: 8px;
}

.wave-band {
  width: 200px;
  height: 12px;
  background: linear-gradient(90deg, transparent, var(--morph-color, #00d4ff), transparent);
  border-radius: 6px;
  box-shadow: 0 0 20px rgba(var(--morph-color, #00d4ff), 0.6);
  transform: translateY(var(--wave-offset, 0));
  animation: wave-flow 2s ease-in-out infinite;
  animation-delay: var(--wave-delay, 0s);
}

@keyframes wave-flow {
  0%,
  100% {
    transform: translateY(var(--wave-offset, 0)) scaleX(1);
    opacity: 0.6;
  }
  50% {
    transform: translateY(calc(var(--wave-offset, 0) + 10px)) scaleX(1.2);
    opacity: 1;
  }
}

/* ========== YouTube：播放棱镜 ========== */
.morph-prism-shape {
  transform-style: preserve-3d;
}

.prism-triangle {
  width: 0;
  height: 0;
  border-left: 80px solid transparent;
  border-right: 80px solid transparent;
  border-bottom: 140px solid var(--morph-color, #191970);
  transform: rotate(90deg);
  box-shadow: 0 0 40px rgba(var(--morph-color, #191970), 0.8);
  animation: prism-glow 3s ease-in-out infinite;
}

@keyframes prism-glow {
  0%,
  100% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.3);
  }
}

.prism-ring {
  position: absolute;
  border: 2px solid var(--morph-color, #191970);
  border-radius: 50%;
  opacity: 0.4;
  animation: prism-ring-rotate 8s linear infinite;
}

.prism-ring-1 {
  width: 280px;
  height: 160px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotateX(75deg);
}

.prism-ring-2 {
  width: 320px;
  height: 180px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotateX(75deg);
  animation-delay: -4s;
}

@keyframes prism-ring-rotate {
  from {
    transform: translate(-50%, -50%) rotateX(75deg) rotateZ(0deg);
  }
  to {
    transform: translate(-50%, -50%) rotateX(75deg) rotateZ(360deg);
  }
}

/* ========== X/Twitter：粒子网络 ========== */
.particles-svg {
  width: 100%;
  height: 100%;
}

.particle-dot {
  fill: var(--morph-color, #4169e1);
  filter: drop-shadow(0 0 4px var(--morph-color, #4169e1));
  animation: particle-pulse 3s ease-in-out infinite;
  animation-delay: calc(var(--i, 0) * 0.05s);
}

@keyframes particle-pulse {
  0%,
  100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

.particle-line {
  stroke: var(--morph-color, #4169e1);
  stroke-width: 0.5;
  opacity: 0.3;
  animation: line-fade 4s ease-in-out infinite;
}

@keyframes line-fade {
  0%,
  100% {
    opacity: 0.2;
  }
  50% {
    opacity: 0.5;
  }
}

/* 过渡状态 */
.is-transitioning .morph-shape {
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* 禁用动画 */
.no-animation .morph-shape,
.no-animation .sphere-core,
.no-animation .sphere-ripple,
.no-animation .crystal-cube,
.no-animation .wave-band,
.no-animation .prism-triangle,
.no-animation .prism-ring,
.no-animation .particle-dot,
.no-animation .particle-line {
  animation: none !important;
}

/* 暗色模式调整 */
[data-theme='dark'] .blue-polymorph-container {
  opacity: 0.7;
}

[data-theme='dark'] .sphere-core {
  box-shadow:
    0 0 80px rgba(var(--morph-color, #4169e1), 0.8),
    inset 0 0 40px rgba(255, 255, 255, 0.1);
}

/* 减少动画 */
@media (prefers-reduced-motion: reduce) {
  .blue-polymorph-container {
    animation: none !important;
  }

  .morph-shape,
  .sphere-core,
  .sphere-ripple,
  .crystal-cube,
  .wave-band,
  .prism-triangle,
  .prism-ring,
  .particle-dot,
  .particle-line {
    animation: none !important;
  }
}
</style>
