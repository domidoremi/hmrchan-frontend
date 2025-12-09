<template>
  <!-- 应用页脚组件 -->
  <footer class="app-footer">
    <div class="container">
      <!-- 桌面端布局 -->
      <div class="footer-content footer-desktop">
        <div class="footer-section">
          <h2>{{ $t('app.name') }}</h2>
          <p>{{ $t('app.description') }}</p>
        </div>

        <div class="footer-section">
          <h2>{{ $t('nav.explore') }}</h2>
          <ul class="footer-links">
            <li>
              <RouterLink to="/explore?platform=youtube">YouTube</RouterLink>
            </li>
            <li>
              <RouterLink to="/explore?platform=twitter">Twitter</RouterLink>
            </li>
            <li>
              <RouterLink to="/explore?platform=tiktok">TikTok</RouterLink>
            </li>
            <li>
              <RouterLink to="/explore?platform=instagram">Instagram</RouterLink>
            </li>
          </ul>
        </div>

        <div class="footer-section">
          <h2>{{ $t('common.more') }}</h2>
          <ul class="footer-links">
            <li>
              <RouterLink to="/authors">{{ $t('nav.authors') }}</RouterLink>
            </li>
            <li>
              <RouterLink to="/settings">{{ $t('nav.settings') }}</RouterLink>
            </li>
          </ul>
        </div>
      </div>

      <!-- 移动端布局 -->
      <div class="footer-content footer-mobile">
        <!-- 快捷链接 -->
        <div class="footer-mobile-links">
          <RouterLink to="/explore" class="footer-mobile-link">
            {{ $t('nav.explore') }}
          </RouterLink>
          <RouterLink to="/authors" class="footer-mobile-link">
            {{ $t('nav.authors') }}
          </RouterLink>
          <RouterLink to="/settings" class="footer-mobile-link">
            {{ $t('nav.settings') }}
          </RouterLink>
          <RouterLink to="/privacy" class="footer-mobile-link">
            {{ $t('nav.privacy') }}
          </RouterLink>
        </div>

        <!-- 分隔线 -->
        <div class="footer-divider"></div>

        <!-- 平台链接 -->
        <div class="footer-platforms">
          <RouterLink
            v-for="platform in platforms"
            :key="platform.name"
            :to="`/explore?platform=${platform.name}`"
            class="platform-chip"
          >
            {{ platform.label }}
          </RouterLink>
        </div>
      </div>

      <!-- 版权信息（通用） -->
      <div class="footer-bottom">
        <p class="footer-copyright">&copy; 2025 HMRChan</p>
        <p class="footer-text">{{ $t('app.description') }}</p>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
/**
 * 应用页脚组件
 *
 * 功能描述：
 * - 提供应用底部导航和信息展示
 * - 支持桌面端和移动端不同布局
 * - 显示快捷链接、平台链接和版权信息
 *
 * 布局结构：
 * - 桌面端：多列网格布局，展示详细导航分组
 * - 移动端：垂直堆叠布局，优化触摸交互
 *
 * 职责：
 * - 提供全站导航快捷入口
 * - 展示平台链接
 * - 显示版权和应用描述信息
 */

/** 支持的社交媒体平台列表 */
const platforms = [
  { name: 'youtube', label: 'YouTube' },
  { name: 'twitter', label: 'Twitter' },
  { name: 'tiktok', label: 'TikTok' },
  { name: 'instagram', label: 'Instagram' },
]
</script>

<style scoped>
/* 页脚容器样式 */
.app-footer {
  margin-top: auto;
  background: var(--color-background);
  border-top: 1px solid var(--glass-border);
  position: relative;
  z-index: 1;
  min-height: var(--footer-min-height);
}

/* 桌面端布局 */
.footer-desktop {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-xl);
  padding: var(--spacing-2xl) 0;
}

.footer-section h2 {
  color: var(--color-text-primary);
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-md);
  margin-top: 0;
}

.footer-section p {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  line-height: var(--line-relaxed);
  max-width: 300px;
}

.footer-links {
  list-style: none;
  padding: 0;
  margin: 0;
}

.footer-links li {
  margin-bottom: var(--spacing-sm);
}

.footer-links a {
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: var(--text-sm);
  transition: color var(--transition-fast);
  display: inline-block;
}

.footer-links a:hover {
  color: var(--color-primary);
}

/* 移动端布局 */
.footer-mobile {
  display: none;
}

/* 版权信息 */
.footer-bottom {
  border-top: 1px solid var(--glass-border);
  padding: var(--spacing-lg) 0;
  text-align: center;
}

.footer-copyright {
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
  margin: 0 0 var(--spacing-xs) 0;
  font-weight: var(--font-medium);
}

.footer-text {
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
  margin: 0;
  opacity: 0.8;
}

/* 移动端样式（768px及以下） */
@media (max-width: 768px) {
  .app-footer {
    /* 确保页脚始终在底部 */
    position: relative;
    background: var(--color-surface);
  }

  /* 隐藏桌面端布局 */
  .footer-desktop {
    display: none;
  }

  /* 显示移动端布局 */
  .footer-mobile {
    display: block;
    padding: var(--spacing-xl) 0 var(--spacing-md);
  }

  /* 移动端快捷链接 */
  .footer-mobile-links {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--spacing-sm) var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
  }

  .footer-mobile-link {
    color: var(--color-text-secondary);
    text-decoration: none;
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    transition: all var(--transition-fast);
    padding: var(--spacing-xs) 0;
    position: relative;
  }

  .footer-mobile-link::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 2px;
    background: var(--color-primary);
    transition: width var(--transition-fast);
  }

  .footer-mobile-link:active {
    color: var(--color-primary);
  }

  .footer-mobile-link:active::after {
    width: 100%;
  }

  /* 分隔线 */
  .footer-divider {
    height: 1px;
    background: linear-gradient(
      to right,
      transparent,
      var(--glass-border) 20%,
      var(--glass-border) 80%,
      transparent
    );
    margin: var(--spacing-md) 0;
  }

  /* 平台标签 */
  .footer-platforms {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-lg);
  }

  .platform-chip {
    display: inline-flex;
    align-items: center;
    padding: var(--spacing-xs) var(--spacing-md);
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-full);
    color: var(--color-text-secondary);
    text-decoration: none;
    font-size: var(--text-xs);
    font-weight: var(--font-medium);
    transition: all var(--transition-fast);
    backdrop-filter: blur(10px);
  }

  .platform-chip:active {
    background: var(--glass-bg-light);
    border-color: var(--color-primary);
    color: var(--color-primary);
    transform: scale(0.95);
  }

  /* 移动端版权信息 */
  .footer-bottom {
    padding: var(--spacing-md) 0;
    border-top: 1px solid var(--glass-border);
  }

  .footer-copyright {
    font-size: 11px;
    margin-bottom: var(--spacing-xs);
  }

  .footer-text {
    font-size: 10px;
    line-height: 1.4;
    max-width: 280px;
    margin: 0 auto;
  }
}

/* 极小屏幕优化（480px及以下） */
@media (max-width: 480px) {
  .footer-mobile {
    padding: var(--spacing-lg) 0 var(--spacing-sm);
  }

  .footer-mobile-links {
    gap: var(--spacing-xs) var(--spacing-md);
  }

  .footer-mobile-link {
    font-size: 13px;
  }

  .platform-chip {
    font-size: 11px;
    padding: 6px 12px;
  }

  .footer-bottom {
    padding: var(--spacing-sm) 0;
  }
}
</style>
