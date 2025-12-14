<template>
  <div class="contact-page">
    <div class="container">
      <div class="contact-card glass-card">
        <h1 class="page-title">{{ $t('contact.title') }}</h1>
        <p class="page-subtitle">{{ $t('contact.subtitle') }}</p>

        <form class="contact-form" @submit.prevent="handleSubmit">
          <div class="form-group">
            <label for="name">{{ $t('contact.name') }}</label>
            <input id="name" v-model="form.name" type="text" class="glass-input" required />
          </div>

          <div class="form-group">
            <label for="email">{{ $t('contact.email') }}</label>
            <input id="email" v-model="form.email" type="email" class="glass-input" required />
          </div>

          <div class="form-group">
            <label for="subject">{{ $t('contact.subject') }}</label>
            <input id="subject" v-model="form.subject" type="text" class="glass-input" required />
          </div>

          <div class="form-group">
            <label for="message">{{ $t('contact.message') }}</label>
            <textarea
              id="message"
              v-model="form.message"
              class="glass-input"
              rows="5"
              required
            />
          </div>

          <Button type="submit" :loading="isSubmitting" full-width>
            {{ isSubmitting ? $t('contact.sending') : $t('contact.send') }}
          </Button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToastStore } from '@/stores'
import Button from '@/components/ui/Button.vue'

const { t } = useI18n()
const toastStore = useToastStore()

const form = reactive({
  name: '',
  email: '',
  subject: '',
  message: '',
})

const isSubmitting = ref(false)

async function handleSubmit() {
  isSubmitting.value = true

  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000))

  isSubmitting.value = false
  toastStore.success(t('contact.success'))

  // Reset form
  form.name = ''
  form.email = ''
  form.subject = ''
  form.message = ''
}
</script>

<style scoped>
.contact-page {
  padding: var(--spacing-8) 0;
  display: flex;
  justify-content: center;
}

.contact-card {
  width: 100%;
  max-width: 500px;
  padding: var(--spacing-8);
}

.page-title {
  font-size: var(--text-2xl);
  text-align: center;
  margin-bottom: var(--spacing-2);
}

.page-subtitle {
  text-align: center;
  color: var(--color-text-tertiary);
  margin-bottom: var(--spacing-6);
}

.contact-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.form-group label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
}

textarea.glass-input {
  resize: vertical;
  min-height: 120px;
}
</style>
