# HTML5/CSS/JavaScript 新特性评估报告

本文档评估了可引入项目的现代 Web API 和特性，包括浏览器支持情况和实施建议。

---

## 1. `<search>` 元素 ✅ 建议引入

### 描述

HTML5 的 `<search>` 元素用于标识包含搜索功能的页面区域，提供语义化标记。

### 浏览器支持

- Chrome 118+ ✅
- Firefox 118+ ✅
- Safari 17+ ✅
- Edge 118+ ✅

### 适用场景

- `SearchBar.vue` - 搜索栏组件
- `SearchPage.vue` - 搜索页面
- `AppNavbar.vue` - 导航栏搜索

### 实施示例

```vue
<!-- Before -->
<div class="search-bar">
  <input type="search" />
</div>

<!-- After -->
<search class="search-bar" role="search">
  <input type="search" />
</search>
```

### 优点

- 增强语义化和可访问性
- 屏幕阅读器自动识别搜索区域
- SEO 友好

---

## 2. CSS 容器查询 (Container Queries) ✅ 建议引入

### 描述

允许组件根据其容器大小而非视口大小进行响应式调整。

### 浏览器支持

- Chrome 105+ ✅
- Firefox 110+ ✅
- Safari 16+ ✅

### 适用场景

- `PostCard.vue` - 卡片在不同容器宽度下的布局
- `EmptyState.vue` - 空状态组件自适应
- 侧边栏/主内容区布局

### 实施示例

```css
.post-grid {
  container-type: inline-size;
  container-name: post-grid;
}

@container post-grid (max-width: 400px) {
  .post-card {
    /* 紧凑布局 */
  }
}
```

---

## 3. CSS 嵌套 (CSS Nesting) ✅ 建议引入

### 描述

原生 CSS 支持类似 SCSS 的嵌套语法。

### 浏览器支持

- Chrome 112+ ✅
- Firefox 117+ ✅
- Safari 17.2+ ✅

### 优点

- 减少重复选择器
- 代码更易维护
- 无需预处理器

### 实施建议

- 可逐步引入，新组件优先使用
- 与 Vue SFC 的 `<style scoped>` 兼容

---

## 4. `:has()` 选择器 ✅ 建议引入

### 描述

父级选择器，可以基于子元素状态选择父元素。

### 浏览器支持

- Chrome 105+ ✅
- Firefox 121+ ✅
- Safari 15.4+ ✅

### 适用场景

```css
/* 当输入框聚焦时高亮容器 */
.search-bar:has(input:focus) {
  border-color: var(--color-primary);
}

/* 当表单有错误时显示错误样式 */
.form-group:has(.input-error) {
  /* 错误样式 */
}
```

---

## 5. Popover API ✅ 已部分引入

### 当前状态

项目已引入原生 Popover API，用于下拉菜单和设置面板。

### 改进建议

- 统一使用 `popover="manual"` 获得更好的控制
- 考虑使用 CSS Anchor Positioning（Chrome 125+）进行定位

---

## 6. View Transitions API ⚠️ 实验性

### 描述

提供页面/组件切换时的平滑过渡动画。

### 浏览器支持

- Chrome 111+ ✅
- Firefox ❌ (Flag only)
- Safari 18+ ✅

### 实施建议

- 可作为渐进增强功能
- 用于路由切换动画
- 需要特性检测降级

```javascript
if (document.startViewTransition) {
  document.startViewTransition(() => {
    // 更新 DOM
  })
}
```

---

## 7. `<dialog>` 元素 ✅ 建议引入

### 描述

原生模态对话框元素，内置焦点管理和键盘交互。

### 浏览器支持

- 所有现代浏览器 ✅

### 适用场景

- 移动端用户菜单模态框
- 确认对话框
- 设置面板（移动端）

### 实施示例

```vue
<dialog ref="dialogRef" class="mobile-dialog">
  <form method="dialog">
    <!-- 内容 -->
    <button value="cancel">取消</button>
    <button value="confirm">确认</button>
  </form>
</dialog>

<script setup>
const dialogRef = ref<HTMLDialogElement>()
const openDialog = () => dialogRef.value?.showModal()
const closeDialog = () => dialogRef.value?.close()
</script>
```

### 优点

- 自动焦点捕获（focus trap）
- ESC 键自动关闭
- 原生 `::backdrop` 伪元素
- 更好的可访问性

---

## 8. Scroll-driven Animations ⚠️ 较新

### 描述

基于滚动位置驱动的 CSS 动画。

### 浏览器支持

- Chrome 115+ ✅
- Firefox 🚧 (开发中)
- Safari 🚧 (开发中)

### 适用场景

- 导航栏滚动时的变化
- 卡片进入视口的动画
- 进度指示器

### 实施建议

- 可作为渐进增强
- 需要特性检测
- 降级到 Intersection Observer

---

## 9. `inert` 属性 ✅ 建议引入

### 描述

使元素及其子元素不可交互和不可聚焦。

### 浏览器支持

- 所有现代浏览器 ✅

### 适用场景

- 模态框打开时禁用背景内容
- 加载状态时禁用表单

```html
<main :inert="isModalOpen">
  <!-- 内容 -->
</main>
<dialog ref="modal">...</dialog>
```

---

## 10. CSS `@layer` ⚠️ 可选

### 描述

CSS 层叠层，控制样式优先级。

### 浏览器支持

- 所有现代浏览器 ✅

### 实施建议

- 可用于组织全局样式
- 不是必须的，当前结构已足够清晰

---

## 实施优先级建议

### 高优先级（立即可实施）

1. **`<search>` 元素** - 简单改动，提升语义化
2. **`<dialog>` 元素** - 替换移动端模态框实现
3. **`:has()` 选择器** - 简化现有 CSS
4. **`inert` 属性** - 提升模态框可访问性

### 中优先级（短期计划）

5. **CSS 容器查询** - 优化组件响应式
6. **CSS 嵌套** - 新组件优先使用

### 低优先级（长期观察）

7. **View Transitions API** - 等待更广泛支持
8. **Scroll-driven Animations** - 等待 Firefox/Safari 支持

---

## 浏览器兼容性策略

项目目标浏览器：

- Chrome/Edge 105+
- Firefox 115+
- Safari 16+

对于较新特性，使用渐进增强策略：

```javascript
// 特性检测示例
const supportsSearch = 'HTMLSearchElement' in window
const supportsContainerQueries = CSS.supports('container-type', 'inline-size')
const supportsViewTransitions = 'startViewTransition' in document
```

---

## 下一步行动

1. 创建 `search` 元素包装组件
2. 将移动端模态框迁移到 `<dialog>`
3. 在新组件中尝试 CSS 容器查询
4. 添加 `:has()` 选择器优化现有样式
