/**
 * 布局组件模块
 *
 * 提供页面布局和结构相关的组件：
 * - MainLayout: 主布局容器，包含导航栏、内容区和页脚
 * - PageShell: 统一页面骨架，提供标准化的页面结构和状态管理
 * - PageHeader: 统一页面头部，提供标题、面包屑、操作区
 * - AppNavbar: 应用导航栏，支持桌面端和移动端布局
 * - AppFooter: 应用页脚，提供导航链接和版权信息
 * - HeroSection: Hero区域，用于页面顶部展示
 * - Grid: 网格布局容器，支持响应式列配置
 * - Stack: 堆叠布局容器，支持垂直和水平排列
 * - Section: 区块容器，提供内边距和背景配置
 */

export { default as MainLayout } from './MainLayout.vue'
export { default as PageShell } from './PageShell.vue'
export { default as PageHeader } from './PageHeader.vue'
export { default as AppNavbar } from './AppNavbar.vue'
export { default as AppFooter } from './AppFooter.vue'
export { default as HeroSection } from './HeroSection.vue'
export { default as Grid } from './Grid.vue'
export { default as Stack } from './Stack.vue'
export { default as Section } from './Section.vue'
