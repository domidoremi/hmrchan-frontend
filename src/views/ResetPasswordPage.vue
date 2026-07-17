<template>
  <section class="hmr-auth-page auth-page auth-page--reset">
    <div class="hmr-auth-layout hmr-form-layout--wide">
      <aside class="hmr-auth-story" data-hmr-reveal>
        <p class="hmr-kicker">账号恢复</p>
        <h1 class="hmr-page-title" data-hmr-text-reveal>设置新密码</h1>
        <p class="hmr-body">输入邮件中的六位验证码，并为账号设置一个符合安全要求的新密码。</p>
        <div class="hmr-auth-orbit" aria-hidden="true">
          <span>验证</span>
          <span>更新</span>
          <span>登录</span>
        </div>
      </aside>

      <form
        v-if="!completed"
        class="hmr-form hmr-auth-card"
        data-hmr-reveal
        @submit.prevent="submit"
      >
        <p class="hmr-kicker">验证并更新</p>
        <label for="reset_token">
          <span>重置验证码</span>
          <input
            id="reset_token"
            v-model="token"
            required
            autocomplete="one-time-code"
            inputmode="numeric"
            pattern="[0-9]{6}"
            maxlength="6"
          />
        </label>
        <label for="new_password">
          <span>新密码</span>
          <input
            id="new_password"
            v-model="newPassword"
            required
            type="password"
            autocomplete="new-password"
          />
        </label>
        <label for="confirm_password">
          <span>确认新密码</span>
          <input
            id="confirm_password"
            v-model="confirmPassword"
            required
            type="password"
            autocomplete="new-password"
          />
        </label>
        <p class="hmr-auth-status">
          {{ isLoading ? '正在更新密码...' : '请使用近期密码之外的新组合。' }}
        </p>
        <p v-if="error" class="hmr-form-error" role="alert">{{ error }}</p>
        <button class="hmr-cta" type="submit" :disabled="isLoading">更新密码</button>
        <RouterLink class="hmr-text-link" to="/forgot-password">重新发送验证码</RouterLink>
      </form>

      <div v-else class="hmr-form hmr-auth-card" data-hmr-reveal>
        <p class="hmr-kicker">密码已更新</p>
        <p class="hmr-form-success" role="status">
          <CircleCheck class="status-icon--success" :size="20" aria-hidden="true" />
          现在可以使用新密码登录。
        </p>
        <button class="hmr-cta" type="button" @click="goToLogin">回到登录</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { CircleCheck } from '@lucide/vue'

import { resetPassword } from '@/api/authService'

const route = useRoute()
const router = useRouter()
const tokenQuery = route.query['token'] ?? route.query['code']
const token = ref(typeof tokenQuery === 'string' ? tokenQuery.trim() : '')
const newPassword = ref('')
const confirmPassword = ref('')
const completed = ref(false)
const error = ref<string | null>(null)
const isLoading = ref(false)

async function submit(): Promise<void> {
  error.value = null
  if (newPassword.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致。'
    return
  }

  isLoading.value = true
  try {
    await resetPassword({ token: token.value, newPassword: newPassword.value })
    completed.value = true
  } catch (submitError) {
    error.value =
      submitError instanceof Error ? submitError.message : '无法更新密码，请重新检查验证码。'
  } finally {
    isLoading.value = false
  }
}

async function goToLogin(): Promise<void> {
  await router.push('/login')
}
</script>
