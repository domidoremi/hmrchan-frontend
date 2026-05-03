<template>
  <section class="hmr-page-hero">
    <p class="hmr-kicker">{{ t('contact.eyebrow') }}</p>
    <h1>{{ t('contact.title') }}</h1>
    <p>{{ t('contact.body') }}</p>
  </section>

  <section class="hmr-section hmr-section--split">
    <form class="hmr-form" @submit.prevent="submit">
      <label>
        <span>{{ t('contact.name') }}</span>
        <input v-model="form.name" required autocomplete="name" />
      </label>
      <label>
        <span>{{ t('contact.email') }}</span>
        <input v-model="form.email" required type="email" autocomplete="email" />
      </label>
      <label>
        <span>{{ t('contact.message') }}</span>
        <textarea v-model="form.message" required rows="6"></textarea>
      </label>
      <button class="hmr-cta hmr-cta--dark" type="submit" :disabled="submitting">
        {{ sent ? t('contact.sent') : t('contact.send') }}
      </button>
    </form>
    <div class="hmr-contact-aside">
      <p class="hmr-kicker">{{ t('contact.apiEyebrow') }}</p>
      <h2>{{ t('contact.fallbackTitle') }}</h2>
      <p>{{ t('contact.fallbackBody') }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { submitContact } from '@/api/hmrContent'

const { t } = useI18n({ useScope: 'global' })
const submitting = ref(false)
const sent = ref(false)
const form = reactive({
  name: '',
  email: '',
  message: '',
})

async function submit(): Promise<void> {
  submitting.value = true
  try {
    await submitContact({ ...form })
    sent.value = true
  } finally {
    submitting.value = false
  }
}
</script>
