# 🎨 动画系统完整使用指南

## 📚 目录

1. [首页创新动画](#首页创新动画)
2. [PostCard动画增强](#postcard动画增强)
3. [页面过渡动画](#页面过渡动画)
4. [自定义动画](#自定义动画)
5. [性能优化建议](#性能优化建议)

---

## 🏠 首页创新动画

### 新增效果

#### 1. **分层渐进式进入动画**

页面加载时，元素按层次依次出现：

- 第1层：背景元素淡入
- 第2层：统计卡片从四周汇聚
- 第3层：帖子卡片瀑布流式出现

#### 2. **3D卡片悬停**

鼠标悬停时，卡片呈现3D倾斜效果

#### 3. **滚动视差**

不同层级的元素以不同速度滚动，创造深度感

### 使用方法

```vue
<script setup>
import { useHomePageAnimation } from '@/composables/animation/useHomePageAnimation'

// 在组件中使用
const { container: homeContainer } = useHomePageAnimation()
</script>

<template>
  <div ref="homeContainer" class="home-page">
    <!-- 你的内容 -->
  </div>
</template>
```

### CSS类名说明

为元素添加以下类名以启用特定动画：

- `.stat-card` - 统计卡片（从四周汇聚动画）
- `.post-card` - 帖子卡片（滚动出现动画 + 3D悬停）
- `.section-header h2` - Section标题（滚动渐显）
- `.parallax-slow` - 慢速视差元素
- `.parallax-medium` - 中速视差元素
- `.parallax-fast` - 快速视差元素

---

## 🎴 PostCard动画增强

### 新功能

#### 1. **滚动进入动画**

- 卡片进入视口时淡入并上移
- 支持每行交错延迟
- 3D旋转效果

#### 2. **鼠标悬停动画**

- 卡片抬升 + 放大
- 跟随鼠标的3D倾斜
- 内部图片放大
- 阴影增强

### 使用方法

```vue
<script setup>
import { ref } from 'vue'
import { usePostCardAnimation } from '@/composables/animation/usePostCardAnimation'

const cardRef = ref<HTMLElement>()
const { isHovered } = usePostCardAnimation(cardRef, 0) // 第二个参数是索引，用于交错
</script>

<template>
  <div ref="cardRef" class="post-card" :class="{ hovered: isHovered }">
    <img src="..." />
    <h3>Title</h3>
  </div>
</template>

<style>
.post-card {
  /* 确保启用3D */
  transform-style: preserve-3d;
  perspective: 1000px;
}

.post-card img {
  transition: transform 0.3s;
}
</style>
```

---

## 🔄 页面过渡动画

### 支持的过渡类型

1. **fade** - 淡入淡出（默认）
2. **slide** - 滑动切换
3. **scale** - 缩放切换
4. **flip** - 翻转切换

### 使用方法

```vue
<script setup>
import { usePageTransition } from '@/composables/animation/usePageTransition'

const { isTransitioning, createTransition } = usePageTransition()

// 在路由切换时调用
const handleRouteChange = (fromEl: HTMLElement, toEl: HTMLElement) => {
  createTransition(fromEl, toEl, 'slide')
}
</script>
```

### 在Router中集成

```typescript
// router/index.ts
import { usePageTransition } from '@/composables/animation/usePageTransition'

router.beforeEach((to, from, next) => {
  const { createTransition } = usePageTransition()
  // 执行过渡动画
  next()
})
```

---

## 🛠️ 自定义动画

### 可用的页面级动画函数

```typescript
import {
  animateHomePageEntrance, // 首页进入动画
  createCard3DHoverAnimation, // 3D卡片悬停
  createScrollParallax, // 滚动视差
  createPostCardScrollAnimation, // 帖子滚动动画
  animateCountUp, // 数字递增
  createPageTransition, // 页面切换
  createMouseFollowAnimation, // 鼠标跟随
  createGlowPulse, // 光晕脉冲
  animateSectionTitle, // Section标题
} from '@/utils/animation/page-animations'
```

### 创建自定义动画示例

```typescript
import { gsap } from 'gsap'
import { ANIMATION_DURATION, ANIMATION_EASE } from '@/utils/animation'

// 1. 简单淡入
gsap.fromTo(
  '.my-element',
  { opacity: 0 },
  {
    opacity: 1,
    duration: ANIMATION_DURATION.normal,
    ease: ANIMATION_EASE.default,
  },
)

// 2. 复杂时间线
const tl = gsap.timeline()
tl.fromTo('.title', { y: -50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 })
  .fromTo('.content', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, '-=0.3')
  .fromTo('.button', { scale: 0 }, { scale: 1, duration: 0.3, ease: 'back.out(1.7)' })
```

---

## ⚡ 性能优化建议

### 1. **使用GPU加速的属性**

✅ **推荐**：

- `transform` (translate, scale, rotate)
- `opacity`

❌ **避免**：

- `width`, `height`
- `top`, `left`, `right`, `bottom`
- `margin`, `padding`

### 2. **减少动画复杂度**

```css
/* 启用GPU加速 */
.animated-element {
  will-change: transform, opacity;
  transform: translateZ(0);
  backface-visibility: hidden;
}
```

### 3. **使用 `prefersReducedMotion`**

所有动画函数都已自动集成减少动画检测：

```typescript
import { prefersReducedMotion } from '@/utils/animation'

if (prefersReducedMotion()) {
  // 跳过动画或使用简化版本
  element.style.opacity = '1'
} else {
  // 正常动画
  gsap.to(element, { opacity: 1, duration: 0.5 })
}
```

### 4. **清理动画**

**重要**：在组件卸载时清理所有动画

```vue
<script setup>
import { onBeforeUnmount } from 'vue'
import gsap from 'gsap'

const ctx = gsap.context(() => {
  // 所有动画
})

onBeforeUnmount(() => {
  ctx.revert() // 清理所有动画
})
</script>
```

### 5. **滚动触发器性能**

```typescript
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// 限制刷新频率
ScrollTrigger.config({
  limitCallbacks: true,
  syncInterval: 150,
})

// 清理ScrollTrigger
onBeforeUnmount(() => {
  ScrollTrigger.getAll().forEach((t) => t.kill())
})
```

---

## 📊 动画性能指标

### 目标指标

- **帧率**: 稳定 60 FPS
- **动画时长**:
  - 微交互: 0.15s
  - 标准动画: 0.3-0.5s
  - 复杂场景: ≤1.2s
- **CPU占用**: <5%
- **内存增长**: <10MB

### 性能监控

```javascript
// 开发时监控FPS
const stats = new Stats()
document.body.appendChild(stats.dom)

requestAnimationFrame(function loop() {
  stats.update()
  requestAnimationFrame(loop)
})
```

---

## 🎯 实战案例

### 案例1：创新的卡片Grid进入动画

```vue
<template>
  <div class="card-grid">
    <div v-for="(card, index) in cards" :key="card.id" class="card" :data-index="index">
      {{ card.title }}
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import gsap from 'gsap'

onMounted(() => {
  const cards = document.querySelectorAll('.card')

  gsap.fromTo(
    cards,
    {
      opacity: 0,
      scale: 0.8,
      rotateY: -90,
    },
    {
      opacity: 1,
      scale: 1,
      rotateY: 0,
      duration: 0.6,
      stagger: {
        each: 0.1,
        from: 'center',
        grid: 'auto',
      },
      ease: 'back.out(1.7)',
    },
  )
})
</script>
```

### 案例2：鼠标跟随动画背景

```vue
<template>
  <div ref="bg" class="animated-bg"></div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { createMouseFollowAnimation } from '@/utils/animation/page-animations'

const bg = ref<HTMLElement>()

onMounted(() => {
  if (bg.value) {
    createMouseFollowAnimation(bg.value, 0.15)
  }
})
</script>
```

### 案例3：数字滚动计数器

```vue
<template>
  <div ref="counter" class="counter">0</div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { animateCountUp } from '@/utils/animation/page-animations'

const counter = ref<HTMLElement>()

onMounted(() => {
  if (counter.value) {
    animateCountUp(counter.value, 0, 1000, 2)
  }
})
</script>
```

---

## 🚀 下一步

1. **探索更多动画效果**
   - 查看 `/src/utils/animation/` 中的所有可用函数
   - 参考 `ANIMATION_SYSTEM.md` 了解基础API

2. **创建自己的动画**
   - 使用现有配置常量 (`ANIMATION_DURATION`, `ANIMATION_EASE`)
   - 遵循性能最佳实践

3. **贡献动画**
   - 在 `/src/utils/animation/` 中添加新的动画函数
   - 更新本文档添加使用示例

---

## 🆘 常见问题

### Q: 动画不流畅怎么办？

A: 检查以下几点：

1. 是否使用GPU加速属性 (`transform`, `opacity`)
2. 是否添加了 `will-change`
3. 动画元素数量是否过多
4. 是否在滚动事件中频繁触发动画

### Q: 如何禁用某个元素的动画？

A: 添加 `reduce-motion` 类或使用内联样式：

```html
<div class="reduce-motion">不会有动画</div>
```

### Q: 动画与路由切换冲突？

A: 确保在路由切换前清理所有ScrollTrigger：

```typescript
router.beforeEach(() => {
  ScrollTrigger.getAll().forEach((t) => t.kill())
})
```

---

**创建时间**: 2024-11-20  
**作者**: Cascade AI  
**版本**: 2.0 - 创新增强版
