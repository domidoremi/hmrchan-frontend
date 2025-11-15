# Button Component

增强的按钮组件，支持多种变体、尺寸、图标和交互效果。

## Props

| Prop           | Type                                                           | Default     | Description                      |
| -------------- | -------------------------------------------------------------- | ----------- | -------------------------------- |
| `variant`      | `'primary' \| 'secondary' \| 'ghost' \| 'danger' \| 'success'` | `'primary'` | 按钮变体样式                     |
| `size`         | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'`                         | `'md'`      | 按钮尺寸                         |
| `disabled`     | `boolean`                                                      | `false`     | 是否禁用                         |
| `loading`      | `boolean`                                                      | `false`     | 是否显示加载状态                 |
| `icon`         | `Component`                                                    | `undefined` | 图标组件（来自 lucide-vue-next） |
| `iconPosition` | `'left' \| 'right'`                                            | `'left'`    | 图标位置                         |
| `fullWidth`    | `boolean`                                                      | `false`     | 是否占满容器宽度                 |
| `rounded`      | `boolean`                                                      | `false`     | 是否使用完全圆角                 |

## Events

| Event   | Payload      | Description                        |
| ------- | ------------ | ---------------------------------- |
| `click` | `MouseEvent` | 按钮点击事件（禁用或加载时不触发） |

## Features

### 1. 多种变体

- **primary**: 主要操作按钮（紫色渐变）
- **secondary**: 次要操作按钮（玻璃态效果）
- **ghost**: 幽灵按钮（透明背景）
- **danger**: 危险操作按钮（红色渐变）
- **success**: 成功操作按钮（绿色渐变）

### 2. 五种尺寸

- **xs**: 28px 高度，适用于紧凑空间
- **sm**: 32px 高度，适用于表格和卡片
- **md**: 40px 高度，默认尺寸
- **lg**: 48px 高度，适用于重要操作
- **xl**: 56px 高度，适用于英雄区域

### 3. 图标支持

- 支持左侧或右侧图标
- 仅图标按钮（无文字时自动调整为方形）
- 图标大小自动适配按钮尺寸

### 4. 涟漪点击效果

- Material Design 风格的涟漪动画
- 点击时从点击位置扩散
- 自动适配深色主题

### 5. 加载状态

- 显示旋转加载动画
- 自动禁用点击事件
- 保持按钮尺寸不变

### 6. 无障碍支持

- 完整的键盘导航支持
- 焦点可见样式
- 禁用状态的正确 ARIA 属性

## Usage Examples

### 基础用法

```vue
<template>
  <Button>Click Me</Button>
  <Button variant="secondary">Secondary</Button>
  <Button variant="danger">Delete</Button>
</template>

<script setup>
import Button from '@/components/base/Button.vue'
</script>
```

### 带图标

```vue
<template>
  <Button :icon="Heart" icon-position="left">Like</Button>
  <Button :icon="Share2" icon-position="right">Share</Button>
  <Button :icon="Download" />
</template>

<script setup>
import Button from '@/components/base/Button.vue'
import { Heart, Share2, Download } from 'lucide-vue-next'
</script>
```

### 不同尺寸

```vue
<template>
  <Button size="xs">Extra Small</Button>
  <Button size="sm">Small</Button>
  <Button size="md">Medium</Button>
  <Button size="lg">Large</Button>
  <Button size="xl">Extra Large</Button>
</template>
```

### 状态

```vue
<template>
  <Button disabled>Disabled</Button>
  <Button loading>Loading</Button>
  <Button :loading="isSubmitting" @click="handleSubmit"> Submit </Button>
</template>

<script setup>
import { ref } from 'vue'

const isSubmitting = ref(false)

const handleSubmit = async () => {
  isSubmitting.value = true
  try {
    await submitForm()
  } finally {
    isSubmitting.value = false
  }
}
</script>
```

### 修饰符

```vue
<template>
  <Button full-width>Full Width Button</Button>
  <Button rounded>Rounded Button</Button>
  <Button rounded :icon="Heart">Rounded with Icon</Button>
</template>
```

## Styling

组件使用 CSS 变量进行样式定制，支持深色主题和响应式设计。

### 自定义样式

```css
/* 覆盖按钮样式 */
.custom-button {
  --color-primary: #your-color;
  --radius-lg: 20px;
}
```

## Accessibility

- 使用语义化的 `<button>` 元素
- 支持键盘导航（Tab、Enter、Space）
- 焦点可见样式（`:focus-visible`）
- 禁用状态正确传递给辅助技术
- 支持屏幕阅读器

## Performance

- 涟漪效果使用 CSS 动画，性能优异
- 自动清理涟漪 DOM 节点
- 响应式设计优化移动端体验

## Browser Support

支持所有现代浏览器：

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- iOS Safari 14+
- Android Chrome 90+

## Related Components

- `Input` - 表单输入组件
- `Card` - 卡片容器组件
- `Modal` - 模态框组件
