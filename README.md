# himeri chan - Frontend

社交媒体内容聚合系统前端应用

基于 Vue 3 + TypeScript + Vite 构建的现代化 Web 应用。

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd) 
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## ✨ 特性

- 🌍 **完全国际化** - 支持中文、英文、日文
- 🎨 **现代化 UI** - Glass morphism 设计风格
- 🌓 **深色模式** - 自动切换主题
- ♿ **可访问性** - ARIA 标签支持
- 📱 **响应式设计** - 完美支持移动端
- ⚡ **性能优化** - 智能预加载、虚拟滚动
- 🛡️ **错误处理** - 全局错误边界
- 🔒 **类型安全** - 完整的 TypeScript 支持

## 📋 技术栈

- **框架**: Vue 3 (Composition API)
- **构建工具**: Vite
- **语言**: TypeScript
- **状态管理**: Pinia
- **路由**: Vue Router
- **国际化**: Vue I18n
- **图标**: Lucide Vue
- **HTTP**: Axios
- **日期处理**: Day.js
- **样式**: CSS Variables + Glass morphism

## 🚀 快速开始

### 安装依赖

```bash
bun install
```

### 开发环境

```bash
bun run dev
```

访问: http://localhost:5173

### 生产构建

```bash
bun run build
```

### 预览构建

```bash
bun run preview
```

### 代码检查

```bash
# ESLint
bun run lint

# TypeScript 类型检查
bun run type-check

# 格式化代码
bun run format
```

### 测试

```bash
bun run test:unit
```

## 📁 项目结构

```
src/
├── api/              # API 客户端和服务
├── components/       # Vue 组件
│   ├── features/    # 业务组件
│   ├── layout/      # 布局组件
│   └── ui/          # UI 组件
├── composables/      # 组合式函数
├── directives/       # 自定义指令
├── i18n/            # 国际化配置
├── router/          # 路由配置
├── stores/          # Pinia 状态管理
├── styles/          # 全局样式
├── types/           # TypeScript 类型定义
├── utils/           # 工具函数
└── views/           # 页面组件
```

## 🔧 环境变量

创建 `.env` 文件:

```env
VITE_API_URL=/api
VITE_APP_NAME=himeri chan
VITE_APP_DESCRIPTION=Social Media Content Aggregation System
```

## 📚 文档

- **开发文档**: [DEVELOPMENT.md](./DEVELOPMENT.md)
- **更新日志**: [CHANGELOG.md](./CHANGELOG.md)
- **修复记录**: [FIXES_COMPLETED.md](./FIXES_COMPLETED.md)

## 🎯 代码规范

- 使用 ESLint + Prettier 进行代码格式化
- 遵循 Vue 3 Composition API 最佳实践
- TypeScript 严格模式
- 所有用户可见文本必须国际化
- 使用条件日志工具 (logger) 而非 console

## 🤝 贡献

欢迎提交 Pull Request！

## 📄 许可证

MIT License
