# 动画系统使用文档

## 概述

本项目使用 **GSAP (GreenSock Animation Platform)** 构建了一套完整的动画系统，提供高性能、可复用的动画解决方案。

### 核心特性

✅ **高性能**: 60fps 流畅动画，GPU 加速  
✅ **响应式**: 自动适配不同设备和屏幕尺寸  
✅ **无障碍**: 自动检测 `prefers-reduced-motion` 偏好  
✅ **可复用**: 丰富的预置动画函数和组合  
✅ **类型安全**: 完整的 TypeScript 类型定义  
✅ **易维护**: 统一的配置管理和清晰的API

## 目录结构

```
src/utils/animation/
├── config.ts              # 全局动画配置
├── gsap-utils.ts          # GSAP 工具函数
├── hero-animations.ts     # Hero 专用动画
└── index.ts               # 统一导出
```

## 快速开始

### 1. 基础用法

```typescript
import { fadeInUp, scaleIn } from '@/utils/animation'

// 在组件中使用
onMounted(() => {
  // 简单的淡入上移动画
  fadeInUp('.my-element', {
    duration: 0.5,
    delay: 0.2,
  })

  // 缩放进入动画
  scaleIn('.my-button')
})
```

### 2. Vue 组件中使用

```vue
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import gsap from 'gsap'
import { fadeInUp, createAnimationContext, cleanupAnimationContext } from '@/utils/animation'
import type { GSAPContext } from '@/utils/animation/gsap-utils'

const elementRef = ref<HTMLElement>()
let ctx: GSAPContext = null

onMounted(() => {
  if (!elementRef.value) return

  // 创建动画上下文（推荐方式，便于清理）
  ctx = gsap.context(() => {
    fadeInUp(elementRef.value!, {
      duration: 0.6,
      ease: 'power2.out',
    })
  })
})

onBeforeUnmount(() => {
  // 清理动画
  cleanupAnimationContext(ctx)
})
</script>

<template>
  <div ref="elementRef">我会淡入并上移！</div>
</template>
```

### 3. 时间线动画（Timeline）

```typescript
import gsap from 'gsap'
import { fadeInUp, scaleIn, ANIMATION_DURATION, ANIMATION_EASE } from '@/utils/animation'

onMounted(() => {
  // 创建时间线
  const tl = gsap.timeline()

  // 编排动画序列
  tl.add(fadeInUp('.title', { duration: 0.6 }), 0) // 0秒开始
    .add(scaleIn('.badge', { duration: 0.4 }), 0.2) // 0.2秒开始
    .add(fadeInUp('.description', { duration: 0.5 }), 0.4) // 0.4秒开始
})
```

## 动画配置

### 预置配置

```typescript
import {
  ANIMATION_DURATION, // 时长配置
  ANIMATION_EASE, // 缓动函数
  STAGGER_CONFIG, // 交错配置
  ANIMATION_DELAY, // 延迟配置
} from '@/utils/animation'

// 使用示例
fadeInUp('.element', {
  duration: ANIMATION_DURATION.normal, // 0.5s
  ease: ANIMATION_EASE.default, // 'power2.out'
  delay: ANIMATION_DELAY.short, // 0.1s
})
```

### 动画时长 (ANIMATION_DURATION)

| 配置        | 值 (秒) | 用途         |
| ----------- | ------- | ------------ |
| `ultraFast` | 0.15    | 微交互       |
| `fast`      | 0.3     | 反馈和小元素 |
| `normal`    | 0.5     | 默认动画     |
| `slow`      | 0.8     | 重要元素出场 |
| `ultraSlow` | 1.2     | 复杂场景     |

### 缓动函数 (ANIMATION_EASE)

| 配置          | 值                    | 效果     |
| ------------- | --------------------- | -------- |
| `default`     | `power2.out`          | 标准缓动 |
| `bounce`      | `back.out(1.7)`       | 弹性效果 |
| `bounceLight` | `back.out(1.2)`       | 轻微弹性 |
| `elastic`     | `elastic.out(1, 0.5)` | 弹力效果 |
| `smooth`      | `power1.inOut`        | 平滑进出 |

## 预置动画函数

### 淡入动画

```typescript
// 简单淡入
fadeIn('.element')

// 淡入上移
fadeInUp('.element')

// 淡入下移
fadeInDown('.element')

// 淡入左移
fadeInLeft('.element')

// 淡入右移
fadeInRight('.element')
```

### 缩放和旋转

```typescript
// 缩放进入
scaleIn('.element', {
  duration: 0.5,
  ease: 'back.out(1.2)',
})

// 旋转进入
rotateIn('.element')

// 弹跳进入
bounceIn('.element')
```

### 循环动画

```typescript
// 呼吸动画
createBreathingAnimation('.badge')

// 脉冲动画
createPulseAnimation('.notification-dot')

// 浮动动画
createFloatingAnimation('.cloud')

// 摇摆动画
createSwingAnimation('.bell')
```

### 交错动画

```typescript
// 列表项交错显示
const items = document.querySelectorAll('.list-item')
gsap.fromTo(
  items,
  { opacity: 0, y: 20 },
  {
    opacity: 1,
    y: 0,
    duration: ANIMATION_DURATION.fast,
    stagger: STAGGER_CONFIG.normal, // 0.1s间隔
  },
)
```

### 视差滚动

```typescript
import { createParallax } from '@/utils/animation'

// 创建视差效果
createParallax('.background', 0.5) // 0.5x速度
```

## 响应式动画

### 自动适配

```typescript
import { getResponsiveConfig } from '@/utils/animation'

onMounted(() => {
  const config = getResponsiveConfig()
  // config 会根据屏幕宽度自动调整
  // 移动端: 更快的duration，简单的ease
  // 桌面端: 标准配置

  fadeInUp('.element', {
    duration: config.duration,
    ease: config.ease,
  })
})
```

### 断点配置

```typescript
import { BREAKPOINTS } from '@/utils/animation'

const isMobile = window.innerWidth <= BREAKPOINTS.mobile // 480px
const isTablet = window.innerWidth <= BREAKPOINTS.tablet // 768px
const isLaptop = window.innerWidth <= BREAKPOINTS.laptop // 1024px
const isDesktop = window.innerWidth > BREAKPOINTS.desktop // 1440px
```

## 无障碍支持

### 自动检测减少动画偏好

```typescript
import { prefersReducedMotion } from '@/utils/animation'

onMounted(() => {
  if (prefersReducedMotion()) {
    // 用户偏好减少动画，直接显示内容
    gsap.set('.element', { opacity: 1, y: 0 })
  } else {
    // 正常播放动画
    fadeInUp('.element')
  }
})
```

**注意**: 所有预置动画函数都已内置此检查，无需手动处理。

## Hero Section 实例

Hero Section 是一个完整的动画编排示例：

```vue
<template>
  <HeroSection
    :visible="true"
    title="欢迎来到我的网站"
    description="探索精彩内容"
    :stats="[
      { value: 1000, label: '用户' },
      { value: 50, label: '文章' },
    ]"
    @close="handleClose"
    @explore="handleExplore"
  />
</template>

<script setup lang="ts">
import HeroSection from '@/components/layout/HeroSection.vue'

const handleClose = () => {
  console.log('Hero closed')
}

const handleExplore = () => {
  console.log('Explore clicked')
}
</script>
```

### Hero 动画包含

1. **背景动画**: 渐变流动 + 网格漂浮
2. **内容序列**: Badge → Title → Description → Actions → Stats
3. **交互动画**: 按钮悬停、关闭按钮旋转
4. **退场动画**: 平滑淡出上移

## 性能优化

### 1. GPU 加速

```css
.animated-element {
  will-change: transform, opacity;
  transform: translateZ(0);
  backface-visibility: hidden;
}
```

### 2. 避免重绘

```typescript
// ✅ 优先使用 transform 和 opacity
gsap.to('.element', { x: 100, opacity: 0.5 })

// ❌ 避免使用 width, height, left, top
gsap.to('.element', { width: '200px' }) // 会触发重排
```

### 3. 清理动画

```typescript
onBeforeUnmount(() => {
  // 方法1: 使用上下文清理
  ctx?.revert()

  // 方法2: Kill特定动画
  gsap.killTweensOf('.element')

  // 方法3: Kill所有动画
  killAllAnimations()
})
```

## 高级用法

### ScrollTrigger 集成

```typescript
import { fadeInUp } from '@/utils/animation'

fadeInUp('.section', {
  scrollTrigger: {
    trigger: '.section',
    start: 'top 80%', // 元素顶部距视口底部80%时触发
    end: 'top 20%',
    scrub: true, // 滚动关联动画进度
    markers: true, // 调试用，显示触发点
  },
})
```

### 自定义缓动

```typescript
gsap.to('.element', {
  x: 100,
  duration: 1,
  ease: 'elastic.out(1, 0.3)', // 自定义弹性参数
})

// 或使用三次贝塞尔曲线
gsap.to('.element', {
  x: 100,
  duration: 1,
  ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
})
```

### Stagger 高级用法

```typescript
gsap.fromTo(
  '.grid-item',
  { opacity: 0, scale: 0.8 },
  {
    opacity: 1,
    scale: 1,
    duration: 0.5,
    stagger: {
      each: 0.1, // 每项间隔0.1s
      from: 'center', // 从中心开始
      grid: [4, 6], // 4行6列网格
      axis: 'both', // 同时考虑x和y轴
    },
  },
)
```

## 调试技巧

### 1. 慢动作播放

```typescript
// 全局慢放（开发时）
gsap.globalTimeline.timeScale(0.5) // 50%速度
```

### 2. 查看动画进度

```typescript
const animation = fadeInUp('.element')
console.log(animation.progress()) // 0 到 1
animation.progress(0.5) // 跳到50%
```

### 3. 暂停/播放/反转

```typescript
const animation = fadeInUp('.element')
animation.pause() // 暂停
animation.play() // 播放
animation.reverse() // 反转
animation.restart() // 重启
```

## 最佳实践

### ✅ 推荐做法

1. **使用动画上下文**: 便于统一清理
2. **优先使用预置函数**: 保持一致性
3. **响应式配置**: 使用 `getResponsiveConfig()`
4. **GPU 加速**: 使用 `transform` 和 `opacity`
5. **清理动画**: `onBeforeUnmount` 中清理

### ❌ 避免做法

1. **避免过度动画**: 不要让用户感到眩晕
2. **避免阻塞交互**: 使用合适的 duration
3. **避免忘记清理**: 防止内存泄漏
4. **避免硬编码值**: 使用配置常量
5. **避免忽略无障碍**: 尊重用户偏好

## 示例项目

查看以下文件了解完整实现：

- 📄 `src/components/layout/HeroSection.vue` - Hero区域完整示例
- 📄 `src/utils/animation/hero-animations.ts` - 动画编排
- 📄 `src/views/HomePage.vue` - Hero使用示例

## 参考资源

- [GSAP 官方文档](https://greensock.com/docs/)
- [GSAP Showcase](https://greensock.com/showcase/)
- [GSAP Easing Visualizer](https://greensock.com/ease-visualizer/)
- [ScrollTrigger 文档](https://greensock.com/docs/v3/Plugins/ScrollTrigger)

## 常见问题

### Q: 动画不播放？

A: 检查元素是否存在、是否使用了正确的选择器、是否在 DOM 加载后执行。

### Q: 动画卡顿？

A: 使用 GPU 加速属性（transform, opacity），避免触发重排的属性。

### Q: 如何调试动画？

A: 使用 `gsap.globalTimeline.timeScale(0.5)` 慢放，或使用 ScrollTrigger markers。

### Q: 支持哪些浏览器？

A: GSAP 支持 IE 11+ 和所有现代浏览器。

## 更新日志

### v1.0.0 (2024-11-20)

- ✨ 初始版本发布
- ✅ 完整的 GSAP 动画系统
- ✅ Hero Section 动画重构
- ✅ 响应式和无障碍支持
- ✅ 完整的 TypeScript 类型定义

---

**作者**: Cascade AI  
**最后更新**: 2024-11-20
