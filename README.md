# HmrChan Frontend

> ⚠️ **仅供学习交流使用，禁止商业用途**

基于 Vue 3 的图片/视频社区前端

## 技术栈

- **Vue 3.5** + TypeScript 5.9 + Vite 7.2
- **Pinia 3.0** 状态管理
- **Vue I18n** 国际化 (中/英/日)
- **PhotoSwipe** 图片查看 + **GSAP** 动画

## 快速开始

```bash
# 安装依赖
bun install

# 开发
bun run dev

# 构建
bun run build
```

## 项目结构

```
src/
├── api/           # API 接口
├── components/    # 组件 (business/layout/ui)
├── composables/   # 组合式函数
├── stores/        # Pinia 状态
├── views/         # 页面
└── utils/         # 工具函数
```

## 功能介绍

| 模块     | 功能                                        |
| -------- | ------------------------------------------- |
| 内容浏览 | 瀑布流布局、图片查看器、视频播放、点赞收藏  |
| 内容发布 | 多图上传、拖拽上传、Markdown 编辑、草稿保存 |
| 搜索发现 | 关键词搜索、标签筛选、作者筛选、热门推荐    |
| 用户体验 | 主题切换、个性化设置、离线支持、国际化      |

## 性能优化

- **构建优化** - 代码分割、Tree Shaking、资源压缩、WebP 转换
- **运行时优化** - 图片懒加载、虚拟滚动、防抖节流、请求缓存
- **缓存策略** - 内存缓存 (50MB/30min) + Service Worker 离线缓存

## 贡献指南

```bash
# 1. Fork & Clone
# 2. 创建分支
git checkout -b feature/xxx

# 3. 提交前检查
bun run lint && bun run type-check

# 4. 提交 PR
```

## 浏览器支持

Chrome 90+ / Firefox 88+ / Safari 14+ / Edge 90+

## License

本项目仅用于个人学习和技术交流，未经许可不得用于商业用途。

---

[@domi](https://github.com/domidoremi) · qiubai1004@gmail.com
