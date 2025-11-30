/**
 * Hero Section 专用动画组合
 *
 * 为Hero区域提供完整的进场动画编排
 */

import gsap from 'gsap'
import { fadeInUp, scaleIn, createPulseAnimation, getResponsiveConfig } from './gsap-utils'
import { prefersReducedMotion } from './config'
import { ANIMATION_DURATION, ANIMATION_EASE, STAGGER_CONFIG } from './config'

/**
 * Hero背景动画
 * 创建渐变和网格的流动效果
 */
export function animateHeroBackground(
  gradient: HTMLElement,
  mesh: HTMLElement,
): gsap.core.Timeline {
  if (prefersReducedMotion()) {
    return gsap.timeline()
  }

  const tl = gsap.timeline()

  // 渐变流动动画
  tl.to(gradient, {
    backgroundPosition: '200% 200%',
    duration: 15,
    ease: 'none',
    repeat: -1,
    yoyo: true,
  })

  // 网格漂浮动画
  tl.to(
    mesh,
    {
      x: 30,
      y: -20,
      duration: 20,
      ease: 'power1.inOut',
      repeat: -1,
      yoyo: true,
    },
    0,
  )

  return tl
}

/**
 * Hero内容区进场动画
 * 完整的交错动画序列
 */
export function animateHeroContent(container: HTMLElement): gsap.core.Timeline {
  if (prefersReducedMotion()) {
    // 无动画偏好：立即显示所有内容
    gsap.set(
      container.querySelectorAll(
        '.hero-badge, .hero-title, .hero-description, .hero-actions, .hero-stats',
      ),
      {
        opacity: 1,
        y: 0,
        scale: 1,
      },
    )
    return gsap.timeline()
  }

  const tl = gsap.timeline({ delay: 0.2 })
  const responsive = getResponsiveConfig()

  // 1. Badge 缩放进入
  const badge = container.querySelector('.hero-badge')
  if (badge) {
    tl.add(
      scaleIn(badge, {
        duration: responsive.duration,
        ease: ANIMATION_EASE.bounceLight,
      }),
      0,
    )
  }

  // 2. Title 淡入上移
  const title = container.querySelector('.hero-title')
  if (title) {
    tl.add(
      fadeInUp(title, {
        duration: ANIMATION_DURATION.slow,
        ease: ANIMATION_EASE.default,
      }),
      0.15,
    )
  }

  // 3. Description 淡入上移
  const description = container.querySelector('.hero-description')
  if (description) {
    tl.add(
      fadeInUp(description, {
        duration: responsive.duration,
        ease: ANIMATION_EASE.default,
      }),
      0.3,
    )
  }

  // 4. Actions 淡入上移
  const actions = container.querySelector('.hero-actions')
  if (actions) {
    // 先淡入容器
    tl.add(
      fadeInUp(actions, {
        duration: responsive.duration,
        ease: ANIMATION_EASE.default,
      }),
      0.45,
    )

    // 然后交错显示按钮
    const buttons = actions.querySelectorAll('.btn-primary, .btn-secondary')
    if (buttons.length > 0) {
      tl.fromTo(
        buttons,
        {
          opacity: 0,
          scale: 0.9,
        },
        {
          opacity: 1,
          scale: 1,
          duration: ANIMATION_DURATION.fast,
          ease: ANIMATION_EASE.bounceLight,
          stagger: STAGGER_CONFIG.fast,
        },
        0.6,
      )
    }
  }

  // 5. Stats 淡入上移
  const stats = container.querySelector('.hero-stats')
  if (stats) {
    tl.add(
      fadeInUp(stats, {
        duration: responsive.duration,
        ease: ANIMATION_EASE.default,
      }),
      0.7,
    )

    // 统计项交错动画
    const statItems = stats.querySelectorAll('.stat-item')
    if (statItems.length > 0) {
      tl.fromTo(
        statItems,
        {
          opacity: 0,
          y: 20,
        },
        {
          opacity: 1,
          y: 0,
          duration: ANIMATION_DURATION.fast,
          ease: ANIMATION_EASE.default,
          stagger: STAGGER_CONFIG.fast,
        },
        0.85,
      )
    }
  }

  return tl
}

/**
 * Hero徽章点动画（Badge Dot）
 */
export function animateHeroBadgeDot(dot: HTMLElement): gsap.core.Tween | gsap.core.Timeline {
  if (prefersReducedMotion()) {
    return gsap.timeline()
  }

  return createPulseAnimation(dot, {
    duration: ANIMATION_DURATION.ultraSlow,
  })
}

/**
 * Hero按钮悬停动画
 */
export function createHeroButtonHoverAnimation(button: HTMLElement): void {
  if (prefersReducedMotion()) {
    return
  }

  const icon = button.querySelector('.btn-icon')

  button.addEventListener('mouseenter', () => {
    gsap.to(button, {
      y: -2,
      duration: ANIMATION_DURATION.fast,
      ease: ANIMATION_EASE.default,
    })

    if (icon) {
      gsap.to(icon, {
        x: 4,
        duration: ANIMATION_DURATION.fast,
        ease: ANIMATION_EASE.default,
      })
    }
  })

  button.addEventListener('mouseleave', () => {
    gsap.to(button, {
      y: 0,
      duration: ANIMATION_DURATION.fast,
      ease: ANIMATION_EASE.default,
    })

    if (icon) {
      gsap.to(icon, {
        x: 0,
        duration: ANIMATION_DURATION.fast,
        ease: ANIMATION_EASE.default,
      })
    }
  })
}

/**
 * Hero关闭按钮动画
 */
export function createHeroCloseButtonAnimation(button: HTMLElement): void {
  if (prefersReducedMotion()) {
    return
  }

  button.addEventListener('mouseenter', () => {
    gsap.to(button, {
      rotation: 90,
      scale: 1.1,
      duration: ANIMATION_DURATION.fast,
      ease: ANIMATION_EASE.bounceLight,
    })
  })

  button.addEventListener('mouseleave', () => {
    gsap.to(button, {
      rotation: 0,
      scale: 1,
      duration: ANIMATION_DURATION.fast,
      ease: ANIMATION_EASE.default,
    })
  })
}

/**
 * Hero退场动画
 */
export function animateHeroExit(container: HTMLElement): gsap.core.Timeline {
  if (prefersReducedMotion()) {
    gsap.set(container, { opacity: 0 })
    return gsap.timeline()
  }

  const tl = gsap.timeline()

  tl.to(container, {
    opacity: 0,
    y: -30,
    duration: ANIMATION_DURATION.normal,
    ease: ANIMATION_EASE.power,
  })

  return tl
}

/**
 * Hero完整进场动画编排
 * 协调所有子元素的动画
 */
export function orchestrateHeroAnimations(heroSection: HTMLElement): gsap.core.Timeline {
  const masterTimeline = gsap.timeline()

  // 背景动画（持续循环）
  const gradientEl = heroSection.querySelector('.hero-gradient') as HTMLElement
  const meshEl = heroSection.querySelector('.hero-mesh') as HTMLElement
  if (gradientEl && meshEl) {
    animateHeroBackground(gradientEl, meshEl)
  }

  // 内容进场动画
  const contentEl = heroSection.querySelector('.hero-content') as HTMLElement
  if (contentEl) {
    masterTimeline.add(animateHeroContent(contentEl))
  }

  // Badge点动画
  const dotEl = heroSection.querySelector('.badge-dot') as HTMLElement
  if (dotEl) {
    animateHeroBadgeDot(dotEl)
  }

  // 按钮悬停动画
  const buttons = heroSection.querySelectorAll('.btn-primary, .btn-secondary')
  buttons.forEach((button) => {
    createHeroButtonHoverAnimation(button as HTMLElement)
  })

  // 关闭按钮动画
  const closeButton = heroSection.querySelector('.hero-close') as HTMLElement
  if (closeButton) {
    createHeroCloseButtonAnimation(closeButton)
  }

  return masterTimeline
}
