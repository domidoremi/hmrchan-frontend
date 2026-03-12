<template>
  <div class="contact-page">
    <div class="container">
      <section class="page-hero contact-hero">
        <div class="page-hero__content">
          <span class="page-hero__eyebrow">{{ $t('contact.title') }}</span>
          <h1 class="page-title">{{ $t('contact.title') }}</h1>
          <p class="page-subtitle">{{ $t('contact.subtitle') }}</p>
          <div class="page-hero__meta">
            <span class="page-hero__note">{{ $t('contact.feedbackTitle') }}</span>
            <span class="page-hero__note">{{ $t('contact.feedbackSubtitle') }}</span>
          </div>
        </div>
      </section>

      <div class="contact-layout page-grid page-grid--sidebar">
        <div class="page-card-stack">
          <section class="contact-card glass-card">
            <h2 class="section-title">{{ $t('contact.title') }}</h2>
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
          </section>

          <section class="contact-card glass-card">
            <h2 class="section-title">{{ $t('contact.feedbackTitle') }}</h2>
            <p class="page-subtitle">{{ $t('contact.feedbackSubtitle') }}</p>

            <form class="contact-form" @submit.prevent="handleFeedbackSubmit">
              <div class="form-group">
                <label>{{ $t('contact.feedbackCategory') }}</label>
                <div
                  class="category-list"
                  role="radiogroup"
                  :aria-label="$t('contact.feedbackCategory')"
                >
                  <button
                    v-for="option in feedbackCategoryOptions"
                    :key="option.value"
                    type="button"
                    class="category-btn"
                    :class="{ active: feedback.category === option.value }"
                    :aria-pressed="feedback.category === option.value"
                    @click="feedback.category = option.value"
                  >
                    {{ option.label }}
                  </button>
                </div>
              </div>

              <div class="form-group">
                <label for="feedback-contact">{{ $t('contact.feedbackContact') }}</label>
                <Input id="feedback-contact" v-model="feedback.contact" type="email" />
              </div>

              <div class="form-group">
                <label for="feedback-message">{{ $t('contact.feedbackMessage') }}</label>
                <Textarea
                  id="feedback-message"
                  v-model="feedback.message"
                  class="contact-textarea"
                  rows="5"
                  required
                />
              </div>

              <Button type="submit" :loading="isFeedbackSubmitting" full-width>
                {{
                  isFeedbackSubmitting ? $t('contact.feedbackSending') : $t('contact.feedbackSend')
                }}
              </Button>
            </form>
          </section>
        </div>

        <aside class="contact-side glass-card">
          <div class="contact-side__section">
            <h2 class="contact-side__title">{{ $t('contact.feedbackTitle') }}</h2>
            <p class="contact-side__copy">{{ $t('contact.feedbackSubtitle') }}</p>
          </div>

          <div class="contact-side__section">
            <span class="contact-side__label">{{ $t('contact.feedbackCategory') }}</span>
            <div class="contact-side__chips">
              <span
                v-for="option in feedbackCategoryOptions"
                :key="`contact-chip-${option.value}`"
                class="summary-chip"
              >
                {{ option.label }}
              </span>
            </div>
          </div>

          <div class="contact-side__section">
            <span class="contact-side__label">{{ $t('nav.community') }}</span>
            <div class="contact-side__links">
              <RouterLink to="/community" class="glass-button contact-side__link">
                {{ $t('nav.community') }}
              </RouterLink>
              <RouterLink to="/about" class="glass-button contact-side__link">
                {{ $t('nav.about') }}
              </RouterLink>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ContactPage' })

import { computed, ref, reactive } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToastStore } from '@/stores'
import { contactService } from '@/api/contactService'
import { feedbackService } from '@/api/feedbackService'
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
const feedback = reactive({
  category: 'general' as 'general' | 'bug' | 'feature' | 'other',
  contact: '',
  message: '',
})

const isSubmitting = ref(false)
const isFeedbackSubmitting = ref(false)

const feedbackCategoryOptions = computed(() => [
  { value: 'general' as const, label: t('contact.feedbackCategoryGeneral') },
  { value: 'bug' as const, label: t('contact.feedbackCategoryBug') },
  { value: 'feature' as const, label: t('contact.feedbackCategoryFeature') },
  { value: 'other' as const, label: t('contact.feedbackCategoryOther') },
])

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

async function handleFeedbackSubmit() {
  isFeedbackSubmitting.value = true

  try {
    await feedbackService.submit({
      message: feedback.message,
      contact: feedback.contact || undefined,
      category: feedback.category,
    })

    toastStore.success(t('contact.feedbackSuccess'))

    feedback.category = 'general'
    feedback.contact = ''
    feedback.message = ''
  } catch {
    toastStore.error(t('contact.feedbackError'))
  } finally {
    isFeedbackSubmitting.value = false
  }
}
</script>

<style scoped>
.contact-page {
  padding: var(--spacing-4) 0 var(--spacing-8);
}

.container {
  display: grid;
  gap: var(--spacing-4);
}

.contact-card {
  width: 100%;
  padding: var(--spacing-5);
}

.contact-layout {
  align-items: start;
}

.contact-side {
  display: grid;
  gap: var(--spacing-5);
  padding: clamp(1.25rem, 2vw, 1.75rem);
}

.contact-side__section {
  display: grid;
  gap: var(--spacing-3);
}

.contact-side__title {
  margin: 0;
  font-size: var(--text-lg);
}

.contact-side__copy {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.contact-side__label {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.contact-side__chips,
.contact-side__links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

.contact-side__link {
  min-width: 8rem;
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

.section-title {
  font-size: var(--text-lg);
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

.category-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

.category-btn {
  padding: var(--spacing-2) var(--spacing-3);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-full);
  background: var(--glass-bg-light);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  transition: all var(--transition-fast);
}

.category-btn:hover {
  background: var(--glass-bg);
  border-color: var(--glass-border-strong);
}

.category-btn.active {
  background: var(--gradient-primary);
  border-color: transparent;
  color: var(--color-on-primary);
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.22);
}

.contact-textarea {
  resize: vertical;
  min-height: 7.5rem;
}
</style>
