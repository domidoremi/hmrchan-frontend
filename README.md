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

## 主要功能

- 🖼️ 瀑布流布局 + 图片懒加载
- 🎬 视频播放 + 播放进度记忆
- 🔍 搜索筛选 + 标签分类
- 🌙 亮色/暗色主题切换
- 📱 响应式设计（桌面/平板/移动端）
- ⚡ Service Worker 离线缓存

## 浏览器支持

Chrome 90+ / Firefox 88+ / Safari 14+ / Edge 90+

## License

本项目仅用于个人学习和技术交流，未经许可不得用于商业用途。

---

[@domi](https://github.com/domidoremi) · qiubai1004@gmail.com
