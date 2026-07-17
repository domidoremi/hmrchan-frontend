<template>
  <section class="hmr-auth-page auth-page auth-page--forgot">
    <div class="hmr-auth-layout hmr-form-layout--wide">
      <aside class="hmr-auth-story" data-hmr-reveal>
        <p class="hmr-kicker">账号恢复</p>
        <h1 class="hmr-page-title" data-hmr-text-reveal>重置密码</h1>
        <p class="hmr-body">输入账号邮箱，我们会发送一个十分钟内有效的重置验证码。</p>
        <div class="hmr-auth-orbit" aria-hidden="true">
          <span>邮箱</span>
          <span>验证码</span>
          <span>新密码</span>
        </div>
        <div class="hmr-story-stack" role="list" aria-label="Password reset steps">
          <article class="hmr-story-block" role="listitem">
            <p class="hmr-kicker">01 / 请求</p>
            <strong>接收验证码</strong>
            <span>页面会为所有邮箱显示相同结果，保护账号隐私。</span>
          </article>
          <article class="hmr-story-block" role="listitem">
            <p class="hmr-kicker">02 / 重置</p>
            <strong>设置新密码</strong>
            <span>输入邮件中的六位验证码并设置一个未使用过的新密码。</span>
          </article>
        </div>
      </aside>

      <form
        v-if="!submitted"
        class="hmr-form hmr-auth-card"
        data-hmr-reveal
        @submit.prevent="submit"
      >
        <p class="hmr-kicker">发送验证码</p>
        <label for="email">
          <span>邮箱</span>
          <input id="email" v-model="email" required type="email" autocomplete="email" />
        </label>
        <p class="hmr-auth-status">
          {{ isLoading ? '正在发送...' : '提交后会显示统一结果，账号状态保持私密。' }}
        </p>
        <p v-if="error" class="hmr-form-error" role="alert">{{ error }}</p>
        <button class="hmr-cta" type="submit" :disabled="isLoading">发送重置验证码</button>
        <RouterLink class="hmr-text-link" to="/login">回到登录</RouterLink>
      </form>

      <div v-else class="hmr-form hmr-auth-card" data-hmr-reveal>
        <p class="hmr-kicker">检查邮箱</p>
        <p class="hmr-form-success" role="status">
          <CircleCheck class="status-icon--success" :size="20" aria-hidden="true" />
          如果该邮箱存在，重置验证码已经发送。
        </p>
        <RouterLink class="hmr-cta" to="/reset-password">输入验证码</RouterLink>
        <button class="hmr-auth-provider" type="button" @click="submitted = false">
          重新输入邮箱
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { CircleCheck } from '@lucide/vue'

import { requestPasswordReset } from '@/api/authService'

const email = ref('')
const error = ref<string | null>(null)
const isLoading = ref(false)
const submitted = ref(false)

async function submit(): Promise<void> {
  error.value = null
  isLoading.value = true
  try {
    await requestPasswordReset({ email: email.value })
    submitted.value = true
  } catch (submitError) {
    error.value =
      submitError instanceof Error ? submitError.message : '无法发送验证码，请稍后重试。'
  } finally {
    isLoading.value = false
  }
}
</script>
