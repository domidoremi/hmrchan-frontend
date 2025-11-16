# 语义化 HTML 和替代文本审查报告

## 审查日期

2025-01-16

## 审查范围

- 语义化 HTML 标签使用
- 图片替代文本
- 图标按钮标签
- Heading 层级结构

---

## 1. 语义化 HTML 标签

### 1.1 已正确使用的语义化标签

#### 导航元素

```vue
<!-- AppNavbar.vue -->
<nav class="app-navbar desktop-nav">
  <!-- 导航内容 -->
</nav>

<nav class="mobile-bottom-nav">
  <!-- 移动端导航 -->
</nav>
```

✅ **正确使用 `<nav>` 标签**

- 用于主要导航区域
- 桌面端和移动端分别使用独立的 nav 元素

#### 按钮元素

```vue
<!-- 所有交互按钮都使用 <button> 标签 -->
<button class="action-button" @click="handleClick">
  <Search :size="24" />
</button>
```

✅ **正确使用 `<button>` 而非 `<div>`**

- 所有可点击的交互元素都使用 button
- 提供原生键盘支持和无障碍功能

#### 表单标签

```vue
<!-- Input.vue -->
<label :for="inputId" class="input-label">
  {{ label }}
</label>
<input :id="inputId" type="text" />
```

✅ **正确使用 `<label>` 关联表单字段**

- 使用 for 属性关联 input
- 提供点击标签聚焦输入框的功能

#### 列表元素

```vue
<!-- 下拉菜单选项 -->
<div class="select-options">
  <div v-for="option in options" class="select-option">
    {{ option.label }}
  </div>
</div>
```

⚠️ **建议改进**

- 考虑使用 `<ul>` 和 `<li>` 标签
- 或添加 `role="listbox"` 和 `role="option"`

### 1.2 需要确认的语义化标签

#### Main 标签

**状态：** 需要审查所有页面组件

**建议：**

```vue
<!-- MainLayout.vue 或各页面组件 -->
<main id="main-content">
  <router-view />
</main>
```

**要求：**

- 每个页面有且仅有一个 `<main>` 标签
- 包含页面的主要内容
- 配合跳过导航链接使用（#main-content）

#### Header 和 Footer 标签

**当前状态：** 使用 AppNavbar 和 AppFooter 组件

**建议：**

```vue
<!-- AppNavbar.vue -->
<header>
  <nav class="app-navbar">
    <!-- 导航内容 -->
  </nav>
</header>

<!-- AppFooter.vue -->
<footer class="app-footer">
  <!-- 页脚内容 -->
</footer>
```

#### Article 标签

**使用场景：** PostCard 组件

**建议：**

```vue
<!-- PostCard.vue -->
<article class="post-card">
  <header class="post-header">
    <h2 class="post-title">{{ post.title }}</h2>
  </header>
  <div class="post-content">
    {{ post.content }}
  </div>
  <footer class="post-footer">
    <!-- 元数据 -->
  </footer>
</article>
```

#### Section 标签

**当前状态：** 已有 Section 组件

**使用情况：** 需要审查是否正确使用

**正确使用示例：**

```vue
<section aria-labelledby="section-title">
  <h2 id="section-title">Section Title</h2>
  <!-- 内容 -->
</section>
```

---

## 2. 图片替代文本

### 2.1 用户头像

#### AppNavbar.vue

```vue
<!-- 桌面端用户头像 -->
<img :src="userAvatarUrl" :alt="user?.username || 'User'" />

<!-- 移动端用户头像 -->
<img :src="userAvatarUrl" :alt="user?.username" class="mobile-avatar" />
```

✅ **正确提供 alt 属性**

- 使用用户名作为替代文本
- 提供默认值 'User'

**建议改进：**

```vue
<!-- 更描述性的 alt 文本 -->
<img :src="userAvatarUrl" :alt="`${user?.username || 'User'} avatar`" />
```

### 2.2 OptimizedImage 组件

```vue
<!-- OptimizedImage.vue -->
<img :src="currentSrc" :alt="alt" :width="width" :height="height" />
```

✅ **正确传递 alt 属性**

- 组件接受 alt prop
- 正确传递给 img 元素

**使用指南：**

```vue
<!-- 内容图片 - 必须提供描述性 alt -->
<OptimizedImage src="/photo.jpg" alt="A person coding on a laptop in a modern office" />

<!-- 装饰性图片 - 使用空 alt -->
<OptimizedImage src="/decoration.jpg" alt="" />

<!-- 功能性图片 - 描述功能 -->
<OptimizedImage src="/icon-search.svg" alt="Search" />
```

### 2.3 PostCard 图片

**需要审查：** PostCard 组件中的图片是否有 alt 属性

**建议：**

```vue
<!-- PostCard.vue -->
<OptimizedImage :src="post.image_url" :alt="post.title || 'Post image'" />
```

### 2.4 MediaViewer 组件

**需要审查：** 图片查看器中的图片 alt 属性

**建议：**

```vue
<!-- MediaViewer.vue -->
<img :src="media.url" :alt="media.alt || media.title || 'Media content'" />
```

---

## 3. 图标按钮标签

### 3.1 已正确标记的图标按钮

#### 搜索按钮

```vue
<button
  class="action-button search-button"
  @click="goToSearch"
  :aria-label="$t('search.placeholder')"
>
  <Search :size="24" />
</button>
```

✅ **正确使用 aria-label**

- 提供可读的按钮标签
- 使用国际化文本

#### 队列按钮

```vue
<button
  class="action-button queue-button"
  type="button"
  @click="toggleQueuePanel"
  :aria-label="$t('offline.actionsQueued')"
>
  <CloudOff :size="20" />
  <span v-if="queueStatus.pending > 0" class="queue-badge">
    {{ queueStatus.pending }}
  </span>
</button>
```

✅ **正确使用 aria-label**

- 提供可读的按钮标签
- 徽章数字会被屏幕阅读器读取

#### 设置按钮

```vue
<button
  class="action-button"
  type="button"
  @click="toggleSettingsPanel"
  :aria-label="$t('nav.settings')"
>
  <Settings :size="20" />
</button>
```

✅ **正确使用 aria-label**

#### Modal 关闭按钮

```vue
<button class="modal-close" @click="close" aria-label="Close dialog">
  <X :size="20" aria-hidden="true" />
</button>
```

✅ **正确使用 aria-label 和 aria-hidden**

- 按钮有可读标签
- 装饰性图标使用 aria-hidden="true"

#### Toast 关闭按钮

```vue
<button
  class="toast-close"
  @click="removeToast(toast.id)"
  :aria-label="$t('common.close', 'Close')"
>
  <X :size="16" />
</button>
```

✅ **正确使用 aria-label**

### 3.2 装饰性图标

**规则：** 有文字标签的按钮中的图标应该使用 `aria-hidden="true"`

**示例：**

```vue
<!-- 正确 -->
<button>
  <Search :size="20" aria-hidden="true" />
  <span>Search</span>
</button>

<!-- 错误 -->
<button>
  <Search :size="20" />
  <span>Search</span>
</button>
```

**需要审查：** 所有带文字的按钮，确保图标有 aria-hidden

---

## 4. Heading 层级结构

### 4.1 Heading 层级规则

**WCAG 要求：**

- 每个页面应该有一个 `<h1>` 标签
- Heading 应该按层级顺序使用（h1 -> h2 -> h3）
- 不应该跳过层级（如 h1 -> h3）

### 4.2 需要审查的页面

**HomePage：**

```vue
<!-- 建议结构 -->
<h1>HMRChan - Home</h1>
<section>
  <h2>Platform Statistics</h2>
  <!-- 统计卡片 -->
</section>
<section>
  <h2>Recent Posts</h2>
  <!-- 帖子列表 -->
</section>
```

**ExplorePage：**

```vue
<h1>Explore</h1>
<section>
  <h2>Filters</h2>
  <!-- 筛选器 -->
</section>
<section>
  <h2>Posts</h2>
  <!-- 帖子网格 -->
</section>
```

**ProfilePage：**

```vue
<h1>{{ user.username }}'s Profile</h1>
<section>
  <h2>User Statistics</h2>
  <!-- 统计信息 -->
</section>
<section>
  <h2>User Posts</h2>
  <!-- 用户帖子 -->
</section>
```

### 4.3 Modal 标题

```vue
<!-- Modal.vue -->
<h3 :id="titleId" class="modal-title">{{ title }}</h3>
```

✅ **正确使用 h3 标签**

- Modal 标题通常是 h3 或 h2
- 取决于页面的 heading 层级

**建议：** 允许自定义 heading 级别

```vue
<component :is="headingLevel" :id="titleId" class="modal-title">
  {{ title }}
</component>

// Props headingLevel?: 'h2' | 'h3' | 'h4' = 'h3'
```

---

## 5. 其他语义化元素

### 5.1 对话框（Dialog）

```vue
<!-- Modal.vue -->
<div role="dialog" aria-modal="true" :aria-labelledby="titleId" :aria-describedby="bodyId">
  <!-- 内容 -->
</div>
```

✅ **正确使用 role="dialog"**

### 5.2 警告（Alert）

```vue
<!-- 错误消息 -->
<div role="alert">
  {{ errorMessage }}
</div>
```

✅ **正确使用 role="alert"**

### 5.3 状态（Status）

```vue
<!-- Toast.vue -->
<div role="alert" :aria-live="toast.type === 'error' ? 'assertive' : 'polite'">
  {{ toast.message }}
</div>
```

✅ **正确使用 role="alert" 和 aria-live**

### 5.4 菜单（Menu）

**当前状态：** 下拉菜单未使用 menu 角色

**建议改进：**

```vue
<!-- 用户下拉菜单 -->
<div role="menu" aria-labelledby="user-menu-button">
  <a role="menuitem" href="/profile">Profile</a>
  <a role="menuitem" href="/settings">Settings</a>
  <button role="menuitem" @click="logout">Logout</button>
</div>
```

**注意：** 使用 menu 角色需要实现完整的键盘导航（上下箭头、Enter、Escape）

---

## 6. 改进建议

### 6.1 优先级 1（高）

1. **确保所有页面有 main 标签**

   ```vue
   <main id="main-content">
     <router-view />
   </main>
   ```

2. **审查所有图片的 alt 属性**
   - PostCard 中的图片
   - MediaViewer 中的图片
   - 其他组件中的图片

3. **审查 Heading 层级**
   - 确保每个页面有 h1
   - 确保层级顺序正确
   - 不跳过层级

### 6.2 优先级 2（中）

1. **添加 header 和 footer 标签**

   ```vue
   <header>
     <AppNavbar />
   </header>

   <main id="main-content">
     <router-view />
   </main>

   <footer>
     <AppFooter />
   </footer>
   ```

2. **PostCard 使用 article 标签**

   ```vue
   <article class="post-card">
     <header>
       <h2>{{ post.title }}</h2>
     </header>
     <div class="post-content">
       {{ post.content }}
     </div>
   </article>
   ```

3. **装饰性图标添加 aria-hidden**
   - 审查所有带文字的按钮
   - 为图标添加 aria-hidden="true"

### 6.3 优先级 3（低）

1. **下拉菜单使用 menu 角色**
   - 添加 role="menu" 和 role="menuitem"
   - 实现完整的键盘导航

2. **Select 组件使用 listbox 角色**
   ```vue
   <div role="listbox" aria-labelledby="select-label">
     <div role="option" :aria-selected="isSelected">
       {{ option.label }}
     </div>
   </div>
   ```

---

## 7. 测试清单

### 7.1 自动化测试

- [ ] 使用 axe DevTools 扫描所有页面
- [ ] 检查 Lighthouse 无障碍评分
- [ ] 使用 WAVE 工具检查

### 7.2 手动测试

**图片替代文本：**

- [ ] 所有内容图片有描述性 alt
- [ ] 装饰性图片有空 alt
- [ ] 功能性图片描述功能

**图标按钮：**

- [ ] 所有图标按钮有 aria-label
- [ ] 装饰性图标有 aria-hidden

**语义化 HTML：**

- [ ] 每个页面有 main 标签
- [ ] 使用 nav 标签
- [ ] 使用 button 而非 div
- [ ] 表单字段有 label

**Heading 层级：**

- [ ] 每个页面有 h1
- [ ] Heading 层级正确
- [ ] 不跳过层级

### 7.3 屏幕阅读器测试

- [ ] 使用 NVDA/JAWS/VoiceOver 测试
- [ ] 所有图片可被正确读取
- [ ] 所有按钮可被正确读取
- [ ] Heading 导航正常工作

---

## 8. 文档和指南

### 8.1 开发者指南

**图片替代文本规则：**

1. **内容图片**
   - 提供描述性 alt 文本
   - 描述图片内容和上下文

   ```vue
   <OptimizedImage src="/photo.jpg" alt="A person coding on a laptop in a modern office" />
   ```

2. **装饰性图片**
   - 使用空 alt

   ```vue
   <OptimizedImage src="/decoration.jpg" alt="" />
   ```

3. **功能性图片**
   - 描述功能而非外观

   ```vue
   <OptimizedImage src="/icon-search.svg" alt="Search" />
   ```

4. **复杂图片**
   - 使用 alt 提供简短描述
   - 使用 aria-describedby 提供详细描述
   ```vue
   <img src="/chart.png" alt="Sales chart" aria-describedby="chart-description" />
   <div id="chart-description" class="sr-only">
     Detailed description of the chart...
   </div>
   ```

**图标按钮规则：**

1. **仅图标按钮**
   - 必须有 aria-label

   ```vue
   <button aria-label="Search">
     <Search :size="24" />
   </button>
   ```

2. **图标+文字按钮**
   - 图标使用 aria-hidden="true"
   ```vue
   <button>
     <Search :size="20" aria-hidden="true" />
     <span>Search</span>
   </button>
   ```

**Heading 层级规则：**

1. **每个页面一个 h1**

   ```vue
   <h1>Page Title</h1>
   ```

2. **按顺序使用 heading**

   ```vue
   <h1>Main Title</h1>
   <h2>Section Title</h2>
   <h3>Subsection Title</h3>
   ```

3. **不跳过层级**

   ```vue
   <!-- 错误 -->
   <h1>Title</h1>
   <h3>Subtitle</h3>

   <!-- 正确 -->
   <h1>Title</h1>
   <h2>Subtitle</h2>
   ```

---

## 9. 总结

### 9.1 当前状态

**已正确实现：**

- ✅ 使用 nav 标签
- ✅ 使用 button 标签
- ✅ 表单字段有 label
- ✅ 图标按钮有 aria-label
- ✅ 用户头像有 alt 属性
- ✅ OptimizedImage 组件支持 alt

**需要改进：**

- ⏳ 确保所有页面有 main 标签
- ⏳ 审查所有图片的 alt 属性
- ⏳ 审查 Heading 层级结构
- ⏳ 添加 header 和 footer 标签
- ⏳ PostCard 使用 article 标签
- ⏳ 装饰性图标添加 aria-hidden

### 9.2 预期改进

实施所有改进后：

- 所有图片有适当的 alt 文本
- 所有图标按钮有可读标签
- 语义化 HTML 标签正确使用
- Heading 层级结构正确
- Lighthouse 无障碍评分 > 95

### 9.3 下一步行动

1. 审查所有页面组件，添加 main 标签
2. 审查所有图片，确保有 alt 属性
3. 审查 Heading 层级，确保正确
4. 添加 header 和 footer 标签
5. 使用屏幕阅读器测试
6. 更新开发者文档
