# 关于 MomiChan Frontend

> 现代化的图片/视频内容社区前端应用

## 📋 项目概述

**MomiChan Frontend** 是一个基于 Vue 3 + TypeScript 构建的单页应用（SPA），专注于提供流畅的内容浏览和社交互动体验。项目采用现代化的前端技术栈，部署在 Cloudflare Pages 上，享受全球 CDN 加速和边缘计算能力。

### 核心特性

- 🎨 **现代化 UI** - Glass morphism 设计风格，支持明暗主题
- 🌍 **国际化** - 支持简体中文、English、日本語
- 📱 **响应式设计** - 完美适配桌面、平板、移动设备
- ⚡ **高性能** - 代码分割、懒加载、智能缓存
- 🔐 **安全认证** - JWT + 设备指纹绑定
- ♿ **无障碍** - 支持键盘导航和屏幕阅读器

## 🏗️ 技术架构

### 前端技术栈

```
Vue 3.5 (Composition API)
├── TypeScript 5.9 (严格模式)
├── Vite 7 (Rolldown 构建引擎)
├── Pinia 3 (状态管理)
├── Vue Router 4 (路由)
├── Vue I18n 11 (国际化)
└── GSAP 3 (动画引擎)
```

### 部署架构

```
Cloudflare Pages
├── 全球 CDN 加速
├── 边缘函数 (Functions)
├── 自动 HTTPS
└── 分支预览环境
```

## 🚀 Cloudflare Pages 部署

### 构建配置

**构建命令：**

```bash
bun install && VITE_GIT_COMMIT=$CF_PAGES_COMMIT_SHA bun run build
```

**构建输出目录：**

```
dist
```

**环境变量：**
| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `VITE_API_BASE_URL` | API 基础 URL | `https://api.momichan.xyz` |
| `VITE_API_ENDPOINT` | API 完整端点 | `https://api.momichan.xyz/api/v1` |
| `VITE_API_URL` | API 代理路径 | `/api` |
| `VITE_APP_NAME` | 应用名称 | `himeri chan` |
| `VITE_APP_DESCRIPTION` | 应用描述 | `Social Media Content Aggregation System` |
| `VITE_TURNSTILE_SITE_KEY` | Cloudflare 人机验证密钥 | `0x4AAAA...` |
| `VITE_GIT_COMMIT` | Git 提交哈希（自动注入） | `$CF_PAGES_COMMIT_SHA` |

### 部署流程

1. **自动部署（推荐）**
   - 推送代码到 GitHub/GitLab
   - Cloudflare Pages 自动检测并构建
   - 构建成功后自动发布到生产环境

2. **手动部署**

   ```bash
   # 本地构建
   bun run build

   # 使用 Wrangler CLI 部署
   bunx wrangler pages deploy dist --project-name=hmrchan-frontend
   ```

3. **分支预览**
   - 每个分支自动创建预览环境
   - 预览 URL: `https://<branch>.<project>.pages.dev`
   - 适合测试和代码审查

### Cloudflare Functions

项目使用 Cloudflare Functions 作为 API 代理层：

```
functions/
└── api/
    └── [[path]].ts  # 通配符路由，代理所有 /api/* 请求
```

**功能：**

- 隐藏真实 API 地址
- 添加 CORS 头
- 请求日志和监控
- 边缘缓存优化

## 📦 Git 工作流程

### 分支策略

```
main (生产环境)
├── develop (开发环境)
├── feature/* (功能分支)
├── fix/* (修复分支)
└── hotfix/* (紧急修复)
```

### 提交规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```bash
# 功能开发
git commit -m "feat: 添加用户收藏功能"
git commit -m "feat(search): 支持按作者筛选"

# Bug 修复
git commit -m "fix: 修复移动端布局错位问题"
git commit -m "fix(auth): 解决 token 刷新失败"

# 文档更新
git commit -m "docs: 更新部署指南"

# 样式调整
git commit -m "style: 统一按钮圆角样式"

# 代码重构
git commit -m "refactor: 优化图片加载逻辑"

# 性能优化
git commit -m "perf: 减少首屏加载时间"

# 测试相关
git commit -m "test: 添加搜索组件单元测试"

# 构建工具
git commit -m "chore: 升级 Vite 到 7.2 版本"
```

### 推送检查清单

在推送代码前，确保通过以下检查：

```bash
# 1. 类型检查
bun run type-check

# 2. 代码规范检查
bun run lint:strict

# 3. 代码格式检查
bun run format:check

# 4. 单元测试
bun run test:unit

# 5. 构建测试
bun run build
```

### Git Hooks

项目使用 Husky 配置了以下 Git hooks：

**pre-commit:**

```bash
# 自动运行 lint-staged
# - ESLint 检查并修复
# - Prettier 格式化
# - 仅检查暂存的文件
```

**commit-msg:**

```bash
# 验证提交信息格式
# 确保符合 Conventional Commits 规范
```

## 📝 推送清单

### 日常开发推送

- [ ] 代码已通过 `bun run type-check`
- [ ] 代码已通过 `bun run lint:strict`
- [ ] 代码已格式化 `bun run format`
- [ ] 相关测试已通过
- [ ] 提交信息符合规范
- [ ] 已更新相关文档（如有必要）

### 功能分支推送

- [ ] 功能已完整实现
- [ ] 已添加必要的单元测试
- [ ] 已测试多种屏幕尺寸
- [ ] 已测试明暗主题
- [ ] 已测试多语言切换
- [ ] 性能指标符合要求
- [ ] 已更新 CHANGELOG（如有必要）

### 生产环境推送

- [ ] 所有测试通过
- [ ] 代码已经过 Code Review
- [ ] 已在预览环境验证
- [ ] 已更新版本号
- [ ] 已更新 CHANGELOG
- [ ] 已备份数据库（如涉及）
- [ ] 已通知相关人员

## 🔄 版本发布流程

### 1. 准备发布

```bash
# 切换到 develop 分支
git checkout develop
git pull origin develop

# 创建发布分支
git checkout -b release/v1.x.x

# 更新版本号
# 编辑 package.json 中的 version 字段

# 更新 CHANGELOG
# 记录本次发布的所有变更
```

### 2. 测试验证

```bash
# 完整测试
bun run type-check
bun run lint:strict
bun run test:unit
bun run build

# 本地预览
bun run preview
```

### 3. 合并发布

```bash
# 合并到 main
git checkout main
git merge --no-ff release/v1.x.x

# 打标签
git tag -a v1.x.x -m "Release version 1.x.x"

# 推送
git push origin main
git push origin v1.x.x

# 合并回 develop
git checkout develop
git merge --no-ff release/v1.x.x
git push origin develop

# 删除发布分支
git branch -d release/v1.x.x
```

### 4. 部署验证

- 等待 Cloudflare Pages 自动部署
- 访问生产环境验证功能
- 监控错误日志和性能指标

## 🛠️ 开发工具

### 推荐 IDE

- **Visual Studio Code** (推荐)
  - 扩展: Vue - Official
  - 扩展: ESLint
  - 扩展: Prettier
  - 扩展: TypeScript Vue Plugin (Volar)

### 推荐浏览器扩展

- **Vue DevTools** - Vue 组件调试
- **React DevTools** - Pinia 状态调试
- **Lighthouse** - 性能审计

### 命令行工具

```bash
# Bun (包管理器)
curl -fsSL https://bun.sh/install | bash

# Wrangler (Cloudflare CLI)
bun add -g wrangler

# 其他工具
bun add -g serve          # 静态文件服务器
bun add -g lighthouse     # 性能审计
```

## 📊 性能指标

### 目标指标

| 指标                               | 目标值  | 当前值 |
| ---------------------------------- | ------- | ------ |
| **LCP** (Largest Contentful Paint) | < 2.5s  | ~1.8s  |
| **FID** (First Input Delay)        | < 100ms | ~50ms  |
| **CLS** (Cumulative Layout Shift)  | < 0.1   | ~0.05  |
| **TTI** (Time to Interactive)      | < 3.5s  | ~2.5s  |
| **Bundle Size** (gzipped)          | < 200KB | ~150KB |

### 优化策略

1. **代码分割**
   - 路由级别懒加载
   - 组件按需加载
   - 第三方库动态导入

2. **资源优化**
   - 图片懒加载
   - WebP 格式转换
   - 响应式图片 (srcset)
   - 缩略图质量自适应

3. **缓存策略**
   - 内存缓存 (50MB/30min)
   - Service Worker 缓存
   - CDN 边缘缓存

4. **渲染优化**
   - 虚拟滚动
   - 防抖节流
   - requestAnimationFrame
   - CSS containment

## 🔐 安全措施

### 认证安全

- JWT Token 加密存储
- 设备指纹绑定
- Token 自动刷新
- 跨设备检测

### 数据安全

- HTTPS 强制加密
- CSP (Content Security Policy)
- XSS 防护
- CSRF 防护

### API 安全

- 请求签名验证
- 速率限制
- Cloudflare Turnstile 人机验证
- API 代理隐藏真实地址

## 📚 相关文档

- [README.md](./README.md) - 项目介绍和快速开始
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - 测试指南
- [.kiro/steering/](./kiro/steering/) - 项目规范和最佳实践
  - `tech.md` - 技术栈说明
  - `structure.md` - 项目结构
  - `product.md` - 产品指南

## 🤝 贡献者

感谢所有为本项目做出贡献的开发者！

## 📄 许可证

本项目仅用于个人学习和技术交流，未经许可不得用于商业用途。

## 📞 联系方式

- **作者**: [@domi](https://github.com/domidoremi)
- **邮箱**: qiubai1004@gmail.com
- **项目主页**: [GitHub Repository](https://github.com/domidoremi/hmrchan-frontend)

---

**最后更新**: 2025-01-18  
**文档版本**: 1.0.0
