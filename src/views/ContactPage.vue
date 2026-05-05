<template>
  <div class="hmr-route-page hmr-route-page--contact">
    <header class="hmr-contact-hero">
      <div class="hmr-contact-hero-copy">
        <p class="hmr-kicker">联系</p>
        <h1 class="hmr-contact-title" data-hmr-text-reveal>把想法发给我们。</h1>
        <p class="hmr-body">反馈、合作、账号问题和产品建议都可以从这里进入。</p>
      </div>
      <form class="hmr-form hmr-contact-hero-form" data-hmr-reveal @submit.prevent="submit">
        <p class="hmr-kicker">联系表单</p>
        <label>
          <span>称呼</span>
          <input v-model="form.name" required autocomplete="name" />
        </label>
        <label>
          <span>邮箱</span>
          <input v-model="form.email" required type="email" autocomplete="email" />
        </label>
        <label>
          <span>内容</span>
          <textarea v-model="form.message" required rows="5"></textarea>
        </label>
        <label>
          <span>类型</span>
          <input v-model="form.topic" placeholder="反馈 / 合作 / 账号 / 社区" />
        </label>
        <p v-if="submitError" class="hmr-form-error">{{ submitError }}</p>
        <button class="hmr-cta" type="submit" :disabled="submitting">
          {{ sent ? '已提交' : '发送反馈' }}
        </button>
      </form>
    </header>

    <section class="hmr-section hmr-section--tight hmr-contact-followup" data-hmr-reveal>
      <div class="hmr-form-layout hmr-form-layout--wide">
        <aside class="hmr-contact-aside hmr-contact-aside--sticky">
          <p class="hmr-kicker">处理流程</p>
          <h2 class="hmr-section-title">24 小时内给你回应。</h2>
          <p class="hmr-body">提交后会进入感谢页，消息会继续留在处理队列里。</p>
          <div class="hmr-auth-timeline" aria-label="Contact flow">
            <span
              v-for="(item, index) in support.flows"
              :key="item.id"
              :class="{ 'is-active': index === 0 }"
            >
              {{ item.metric }}
            </span>
          </div>
        </aside>

        <div class="hmr-story-stack">
          <article v-for="item in support.flows" :key="item.id" class="hmr-story-block">
            <p class="hmr-kicker">{{ item.metric }}</p>
            <strong>{{ item.title }}</strong>
            <span>{{ item.excerpt }}</span>
          </article>
        </div>
      </div>
    </section>

    <section class="hmr-section" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-section-head">
          <p class="hmr-kicker">FAQ</p>
          <h2 class="hmr-section-title">提交前你可能想知道。</h2>
        </div>
        <div class="hmr-faq">
          <details v-for="item in support.faqs" :key="item.id">
            <summary>{{ item.title }}</summary>
            <p>{{ item.excerpt }}</p>
          </details>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  seedCommunity,
  loadSupportContent,
  submitContactResource,
  type HmrSupportContent,
} from '@/api/hmrContent'

const router = useRouter()
const submitting = ref(false)
const sent = ref(false)
const submitError = ref('')
const form = reactive({
  name: '',
  email: '',
  message: '',
  topic: '',
})
const support = ref<HmrSupportContent>({
  faqs: seedCommunity,
  flows: seedCommunity,
})

async function submit(): Promise<void> {
  submitting.value = true
  submitError.value = ''
  try {
    const resource = await submitContactResource({ ...form })
    if (!resource.data.delivered) {
      submitError.value = '提交失败，请稍后重试。'
      return
    }
    sent.value = true
    await router.push('/thank-you')
  } catch (error) {
    submitError.value = error instanceof Error ? error.message : '提交失败，请稍后重试。'
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  support.value = await loadSupportContent()
})
</script>
