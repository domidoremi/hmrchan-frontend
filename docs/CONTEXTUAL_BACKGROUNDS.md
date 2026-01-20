# Contextual Background System

A sophisticated 3D background system that morphs based on page context and user interactions, creating an immersive browsing experience.

## Overview

The system provides **6 distinct background states**:

1. **Home** - The Core (crystalline prism)
2. **Explore Default** - Aerogel (floating bubbles)
3. **Explore Instagram** - Optical Glass (prismatic grid)
4. **Explore TikTok** - Liquid Silk (flowing gradients)
5. **Explore YouTube** - Deep Ripples (concentric waves)
6. **Explore Twitter/X** - Fiber Optic Network (connected nodes)

## Architecture

### Core Files

```
src/
├── composables/
│   └── useContextualBackground.ts    # State management
├── components/
│   ├── layout/
│   │   └── ContextualBackground.vue  # 3D background renderer
│   └── business/
│       └── PlatformFilter.vue        # Platform selector with indicators
└── views/
    └── ExplorePageExample.vue        # Usage example
```

## Usage

### 1. Add Background to App.vue

Already integrated! The `<ContextualBackground />` component is mounted in `App.vue`.

### 2. Use Platform Filter in Explore Page

```vue
<script setup lang="ts">
import { ref } from 'vue'
import PlatformFilter from '@/components/business/PlatformFilter.vue'

const selectedPlatform = ref<'all' | 'instagram' | 'tiktok' | 'youtube' | 'twitter'>('all')
</script>

<template>
  <div class="explore-page">
    <PlatformFilter v-model="selectedPlatform" />
    <!-- Your content here -->
  </div>
</template>
```

### 3. Manual Background Control

```typescript
import { useContextualBackground } from '@/composables/useContextualBackground'

const { setState, setExploreFilter } = useContextualBackground()

// Direct state change
setState('home')
setState('explore-instagram')

// Platform-based change (recommended for explore page)
setExploreFilter('tiktok')
```

## Background States

### Home - The Core

**Visual**: Large crystalline dodecahedron rotating slowly
**Effect**: Parallax movement with mouse and scroll
**Color**: Royal blue with transparency
**Metaphor**: The origin, potential energy

### Explore Default - Aerogel

**Visual**: Soft floating bubbles in pale blue
**Effect**: Gentle floating animation
**Color**: Light blue gradients
**Metaphor**: Undefined potential, all possibilities

### Explore Instagram - Optical Glass

**Visual**: Geometric grid of glass prisms
**Effect**: Subtle refraction patterns
**Color**: Structured blue tones
**Metaphor**: Frozen moments, framed memories

### Explore TikTok - Liquid Silk

**Visual**: Flowing metallic gradients
**Effect**: Smooth wave-like motion
**Color**: Glossy blue with highlights
**Metaphor**: Trends flowing, viral movement

### Explore YouTube - Deep Ripples

**Visual**: Concentric circles expanding
**Effect**: Pulsing depth effect
**Color**: Deep navy to royal blue
**Metaphor**: Immersive depth, time investment

### Explore Twitter/X - Fiber Optic Network

**Visual**: Connected nodes with glowing lines
**Effect**: Pulsing network connections
**Color**: Bright blue nodes on white
**Metaphor**: Information flow, connectivity

## Customization

### Adjust Animation Speed

Edit animation durations in `ContextualBackground.vue`:

```css
animation: float 20s ease-in-out infinite; /* Change 20s */
```

### Change Colors

Modify the RGBA values in each background state:

```css
.bg-home-core .background-content::before {
  background: linear-gradient(
    135deg,
    rgba(65, 105, 225, 0.3) 0%,
    /* Adjust these */ rgba(100, 149, 237, 0.2) 50%,
    rgba(135, 206, 250, 0.1) 100%
  );
}
```

### Adjust Overlay Opacity

Control content readability by adjusting the white overlay:

```css
.background-overlay {
  background: rgba(255, 255, 255, 0.9); /* 0.9 = 90% opacity */
}
```

### Add New Platform

1. Add to composable:

```typescript
// src/composables/useContextualBackground.ts
export type BackgroundState =
  | 'home'
  | 'explore-default'
  | 'explore-instagram'
  | 'explore-tiktok'
  | 'explore-youtube'
  | 'explore-twitter'
  | 'explore-linkedin' // New platform

const backgroundConfigs: Record<BackgroundState, BackgroundConfig> = {
  // ... existing configs
  'explore-linkedin': {
    state: 'explore-linkedin',
    className: 'bg-explore-professional',
    label: 'LinkedIn',
    description: 'Professional Network',
  },
}
```

2. Add CSS in `ContextualBackground.vue`:

```css
.bg-explore-professional .background-content {
  /* Your custom background styles */
}
```

3. Add to filter:

```typescript
// src/components/business/PlatformFilter.vue
const platforms = [
  // ... existing platforms
  { id: 'linkedin' as const, label: 'LinkedIn', icon: Linkedin },
]
```

## Performance

### Optimizations Applied

- **CSS-only animations** - No JavaScript animation loops
- **GPU acceleration** - `transform: translate3d()` and `will-change`
- **Lazy transitions** - 800ms debounce on state changes
- **Passive event listeners** - Scroll and mouse events
- **Fixed positioning** - Background doesn't trigger reflows

### Performance Tips

1. **Reduce animation complexity** on low-end devices
2. **Disable parallax** on mobile for better performance
3. **Use `prefers-reduced-motion`** media query for accessibility

```css
@media (prefers-reduced-motion: reduce) {
  .background-layer {
    animation: none !important;
  }
}
```

## Accessibility

- Background is purely decorative (`z-index: -1`)
- Does not interfere with content readability (90% white overlay)
- Respects `prefers-reduced-motion` user preference
- No interactive elements in background layer

## Browser Support

- **Modern browsers**: Full support (Chrome 90+, Firefox 88+, Safari 14+)
- **Older browsers**: Graceful degradation to solid color
- **Mobile**: Optimized animations, reduced parallax

## Troubleshooting

### Background not changing

Check that `useContextualBackground` is properly imported and the route watcher is active.

### Performance issues

1. Reduce animation duration
2. Simplify gradient complexity
3. Disable parallax on scroll/mouse
4. Lower overlay opacity

### Background too prominent

Increase `.background-overlay` opacity from 0.9 to 0.95.

## Future Enhancements

- [ ] WebGL-based 3D backgrounds for high-end devices
- [ ] User preference to disable backgrounds
- [ ] Seasonal theme variations
- [ ] Integration with GSAP for advanced animations
- [ ] Real image/video backgrounds (requires assets)

## Credits

Design concept inspired by modern glassmorphism and contextual UI patterns.
Implementation follows Vue 3 Composition API best practices.
