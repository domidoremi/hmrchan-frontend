<template>
  <div class="user-menu">
    <!-- User Info Header -->
    <div class="user-header">
      <div class="user-avatar-large">
        <img :src="avatarUrl" :alt="username" />
      </div>
      <div class="user-info">
        <div class="user-name">{{ username }}</div>
        <div class="user-email">{{ email }}</div>
      </div>
      <button v-if="showCloseButton" class="close-button" @click="$emit('close')">
        <X :size="24" />
      </button>
    </div>

    <!-- Menu Links -->
    <div class="user-links">
      <RouterLink to="/profile" class="user-link" @click="$emit('navigate')">
        <User :size="18" />
        <span>{{ $t('nav.profile') }}</span>
      </RouterLink>

      <button class="user-link danger" @click="$emit('logout')">
        <LogOut :size="18" />
        <span>{{ $t('nav.logout') }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * NavbarUserMenu - 导航栏用户菜单
 *
 * 显示用户信息和账户操作选项
 * 可在桌面端下拉菜单和移动端模态框中复用
 */

import { RouterLink } from 'vue-router'
import { User, LogOut, X } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    /** 用户名 */
    username?: string
    /** 邮箱 */
    email?: string
    /** 头像URL */
    avatarUrl?: string
    /** 是否显示关闭按钮（移动端） */
    showCloseButton?: boolean
  }>(),
  {
    username: '',
    email: '',
    avatarUrl: '',
    showCloseButton: false,
  },
)

defineEmits<{
  close: []
  navigate: []
  logout: []
}>()
</script>

<style scoped>
.user-menu {
  width: 100%;
}

.user-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  border-bottom: 1px solid var(--glass-border);
}

.user-avatar-large {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  border: 2px solid var(--glass-border);
}

.user-avatar-large img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  font-size: var(--text-base);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-email {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.close-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-standard);
  border: none;
}

.close-button:hover {
  background: var(--glass-bg-light);
  color: var(--color-text-primary);
}

.user-links {
  padding: var(--spacing-2);
}

.user-link {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--text-sm);
  text-decoration: none;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-standard);
  border: none;
  background: transparent;
  width: 100%;
  text-align: left;
}

.user-link:hover {
  background: var(--glass-bg-light);
}

.user-link.danger {
  color: var(--color-error);
}

.user-link.danger:hover {
  background: rgba(239, 68, 68, 0.1);
}
</style>
