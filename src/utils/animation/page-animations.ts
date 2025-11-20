/**
 * 页面级动画组合
 *
 * 为不同页面提供统一且富有创意的进入、退出和交互动画
 */

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ANIMATION_DURATION, ANIMATION_EASE, prefersReducedMotion } from './config'

/**
 * 首页进入动画 - 分层渐进式
 * 创造深度感和层次感
 */
export function animateHomePageEntrance(container: HTMLElement) {
  if (prefersReducedMotion()) {
    gsap.set(container.querySelectorAll('.animate-on-enter'), { opacity: 1, y: 0 })
    return gsap.timeline()
  }

  const tl = gsap.timeline({ defaults: { ease: ANIMATION_EASE.default } })

  // 第一层：背景元素淡入（如果存在）
  const bgElements = container.querySelectorAll('.home-bg, .home-gradient')
  if (bgElements.length) {
    tl.fromTo(
      bgElements,
      { opacity: 0, scale: 1.1 },
      { opacity: 1, scale: 1, duration: ANIMATION_DURATION.slow },
      0,
    )
  }

  // 第二层：统计卡片 - 从四周汇聚
  const statCards = container.querySelectorAll('.stat-card')
  if (statCards.length) {
    statCards.forEach((card, index) => {
      const angle = (index * 360) / statCards.length
      const distance = 100
      const x = Math.cos((angle * Math.PI) / 180) * distance
      const y = Math.sin((angle * Math.PI) / 180) * distance

      tl.fromTo(
        card,
        {
          opacity: 0,
          x,
          y,
          scale: 0.8,
          rotateZ: 10,
        },
        {
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          rotateZ: 0,
          duration: ANIMATION_DURATION.normal,
          ease: ANIMATION_EASE.bounce,
        },
        0.3 + index * 0.1,
      )
    })
  }

  // 第三层：帖子卡片 - 瀑布流式出现
  const postCards = container.querySelectorAll('.post-card')
  if (postCards.length) {
    tl.fromTo(
      postCards,
      {
        opacity: 0,
        y: 60,
        scale: 0.9,
        rotateX: -15,
      },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        rotateX: 0,
        duration: ANIMATION_DURATION.normal,
        stagger: {
          each: 0.08,
          from: 'start',
          grid: 'auto',
          ease: ANIMATION_EASE.default,
        },
      },
      0.6,
    )
  }

  return tl
}

/**
 * 卡片悬停动画 - 3D 翻转效果
 */
export function createCard3DHoverAnimation(card: HTMLElement) {
  if (prefersReducedMotion()) return null

  const handleMouseEnter = () => {
    gsap.to(card, {
      scale: 1.05,
      rotateY: 5,
      rotateX: 5,
      z: 50,
      duration: ANIMATION_DURATION.fast,
      ease: ANIMATION_EASE.default,
    })
  }

  const handleMouseLeave = () => {
    gsap.to(card, {
      scale: 1,
      rotateY: 0,
      rotateX: 0,
      z: 0,
      duration: ANIMATION_DURATION.fast,
      ease: ANIMATION_EASE.default,
    })
  }

  const handleMouseMove = (e: MouseEvent) => {
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const rotateX = ((y - centerY) / centerY) * -10
    const rotateY = ((x - centerX) / centerX) * 10

    gsap.to(card, {
      rotateX,
      rotateY,
      duration: 0.3,
      ease: 'power2.out',
    })
  }

  card.addEventListener('mouseenter', handleMouseEnter)
  card.addEventListener('mouseleave', handleMouseLeave)
  card.addEventListener('mousemove', handleMouseMove)

  // 返回清理函数
  return () => {
    card.removeEventListener('mouseenter', handleMouseEnter)
    card.removeEventListener('mouseleave', handleMouseLeave)
    card.removeEventListener('mousemove', handleMouseMove)
  }
}

/**
 * 滚动视差动画 - 多层深度
 */
export function createScrollParallax(container: HTMLElement) {
  if (prefersReducedMotion()) return () => {}

  const layers = [
    { selector: '.parallax-slow', speed: 0.3 },
    { selector: '.parallax-medium', speed: 0.5 },
    { selector: '.parallax-fast', speed: 0.7 },
  ]

  const triggers: ScrollTrigger[] = []

  layers.forEach(({ selector, speed }) => {
    const elements = container.querySelectorAll(selector)
    elements.forEach((element) => {
      const trigger = ScrollTrigger.create({
        trigger: element as Element,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
        onUpdate: (self) => {
          const y = self.progress * 100 * speed
          gsap.set(element, { y: -y })
        },
      })
      triggers.push(trigger)
    })
  })

  return () => {
    triggers.forEach((t) => t.kill())
  }
}

/**
 * 帖子卡片滚动出现动画
 */
export function createPostCardScrollAnimation(cards: NodeListOf<Element> | Element[]) {
  if (prefersReducedMotion()) {
    gsap.set(cards, { opacity: 1, y: 0 })
    return () => {}
  }

  const triggers: ScrollTrigger[] = []

  Array.from(cards).forEach((card, index) => {
    // 为每张卡片设置初始状态
    gsap.set(card, {
      opacity: 0,
      y: 50,
      scale: 0.95,
    })

    // 创建滚动触发器
    const trigger = ScrollTrigger.create({
      trigger: card as Element,
      start: 'top 90%',
      end: 'top 60%',
      toggleActions: 'play none none reverse',
      onEnter: () => {
        gsap.to(card, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: ANIMATION_DURATION.normal,
          delay: (index % 3) * 0.1, // 每行交错
          ease: ANIMATION_EASE.default,
        })
      },
    })

    triggers.push(trigger)
  })

  return () => {
    triggers.forEach((t) => t.kill())
  }
}

/**
 * 统计数字递增动画
 */
export function animateCountUp(
  element: HTMLElement,
  start: number,
  end: number,
  duration: number = ANIMATION_DURATION.slow,
) {
  if (prefersReducedMotion()) {
    element.textContent = end.toString()
    return gsap.timeline()
  }

  const obj = { value: start }

  return gsap.to(obj, {
    value: end,
    duration,
    ease: ANIMATION_EASE.default,
    onUpdate: () => {
      element.textContent = Math.round(obj.value).toString()
    },
  })
}

/**
 * 页面切换动画 - 滑动淡出
 */
export function createPageTransition(
  from: HTMLElement,
  to: HTMLElement,
  direction: 'left' | 'right' | 'up' | 'down' = 'left',
) {
  if (prefersReducedMotion()) {
    gsap.set(from, { opacity: 0 })
    gsap.set(to, { opacity: 1 })
    return gsap.timeline()
  }

  const tl = gsap.timeline()
  const distance = 100

  const directions = {
    left: { x: -distance, y: 0 },
    right: { x: distance, y: 0 },
    up: { x: 0, y: -distance },
    down: { x: 0, y: distance },
  }

  const dir = directions[direction]

  // 退出动画
  tl.to(from, {
    opacity: 0,
    x: dir.x,
    y: dir.y,
    duration: ANIMATION_DURATION.fast,
    ease: ANIMATION_EASE.default,
  })

  // 进入动画
  tl.fromTo(
    to,
    {
      opacity: 0,
      x: -dir.x,
      y: -dir.y,
    },
    {
      opacity: 1,
      x: 0,
      y: 0,
      duration: ANIMATION_DURATION.fast,
      ease: ANIMATION_EASE.default,
    },
    '-=0.2',
  )

  return tl
}

/**
 * 创建鼠标跟随动画
 */
export function createMouseFollowAnimation(element: HTMLElement, intensity: number = 0.1) {
  if (prefersReducedMotion()) return () => {}

  const handleMouseMove = (e: MouseEvent) => {
    const { clientX, clientY } = e
    const { innerWidth, innerHeight } = window

    const x = (clientX / innerWidth - 0.5) * 100 * intensity
    const y = (clientY / innerHeight - 0.5) * 100 * intensity

    gsap.to(element, {
      x,
      y,
      duration: 1,
      ease: 'power2.out',
    })
  }

  window.addEventListener('mousemove', handleMouseMove)

  return () => {
    window.removeEventListener('mousemove', handleMouseMove)
  }
}

/**
 * 创建呼吸光晕效果
 */
export function createGlowPulse(element: HTMLElement, color: string = '#8b5cf6') {
  if (prefersReducedMotion()) return gsap.timeline()

  return gsap.to(element, {
    boxShadow: `0 0 20px ${color}, 0 0 40px ${color}`,
    duration: 2,
    ease: 'power1.inOut',
    repeat: -1,
    yoyo: true,
  })
}

/**
 * Section 标题渐显动画
 */
export function animateSectionTitle(title: HTMLElement) {
  if (prefersReducedMotion()) {
    gsap.set(title, { opacity: 1, y: 0 })
    return gsap.timeline()
  }

  return gsap.fromTo(
    title,
    {
      opacity: 0,
      y: 30,
      scale: 0.95,
    },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: ANIMATION_DURATION.normal,
      ease: ANIMATION_EASE.default,
      scrollTrigger: {
        trigger: title,
        start: 'top 85%',
        toggleActions: 'play none none reverse',
      },
    },
  )
}
