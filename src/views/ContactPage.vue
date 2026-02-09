<template>
  <div class="contact-page">
    <div class="container">
      <div class="contact-card glass-card">
        <h1 class="page-title">{{ $t('contact.title') }}</h1>
        <p class="page-subtitle">{{ $t('contact.subtitle') }}</p>

        <form class="contact-form" @submit.prevent="handleSubmit">
          <div class="form-group">
            <label for="name">{{ $t('contact.name') }}</label>
            <Input id="name" v-model="form.name" type="text" required />
          </div>

          <div class="form-group">
            <label for="email">{{ $t('contact.email') }}</label>
            <Input id="email" v-model="form.email" type="email" required />
          </div>

          <div class="form-group">
            <label for="subject">{{ $t('contact.subject') }}</label>
            <Input id="subject" v-model="form.subject" type="text" required />
          </div>

          <div class="form-group">
            <label for="message">{{ $t('contact.message') }}</label>
            <Textarea
              id="message"
              v-model="form.message"
              class="contact-textarea"
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
import { contactService } from '@/api/contactService'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Textarea from '@/components/ui/Textarea.vue'

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

  try {
    await contactService.sendMessage({
      name: form.name,
      email: form.email,
      subject: form.subject,
      message: form.message,
    })

    toastStore.success(t('contact.success'))

    // Reset form
    form.name = ''
    form.email = ''
    form.subject = ''
    form.message = ''
  } catch {
    toastStore.error(t('contact.error'))
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.contact-page {
  padding: var(--spacing-4) 0;
}

.container {
  display: flex;
  justify-content: center;
}

.contact-card {
  width: 100%;
  max-width: min(90vw, 32.5rem);
  padding: var(--spacing-5);
}

@media (min-width: 768px) {
  .contact-page {
    padding: var(--spacing-6) 0;
  }

  .contact-card {
    padding: var(--spacing-6);
  }
}

.page-title {
  font-size: var(--text-xl);
  text-align: center;
  margin-bottom: var(--spacing-1);
}

@media (min-width: 640px) {
  .page-title {
    font-size: var(--text-2xl);
  }
}

.page-subtitle {
  text-align: center;
  color: var(--color-text-tertiary);
  margin-bottom: var(--spacing-4);
  font-size: var(--text-sm);
}

.contact-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
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

.contact-textarea {
  resize: vertical;
  min-height: 7.5rem;
}
</style>
