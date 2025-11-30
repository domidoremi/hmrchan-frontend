/**
 * 动画系统统一导出
 *
 * 提供全局可用的动画配置、工具函数和组合
 */

export * from './config'
// 从 gsap-utils 导出除 AnimationConfig 外的所有内容（避免与 config.ts 重复）
export {
  type GSAPContext,
  createAnimationContext,
  cleanupAnimationContext,
  fadeIn,
  fadeInUp,
  fadeInDown,
  fadeInLeft,
  fadeInRight,
  scaleIn,
  rotateIn,
  bounceIn,
  createStaggerTimeline,
  createParallax,
  typewriterEffect,
  createBreathingAnimation,
  createPulseAnimation,
  createSwingAnimation,
  createFloatingAnimation,
  killAllAnimations,
  refreshScrollTriggers,
} from './gsap-utils'
export * from './page-animations'
