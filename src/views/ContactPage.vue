<template>
  <div class="contact-page">
    <div class="container">
      <section class="page-hero contact-hero">
        <div class="page-hero__content">
          <div class="page-hero__header">
            <div class="page-hero__heading">
              <span class="page-hero__eyebrow">{{ $t('contact.title') }}</span>
              <div>
                <h1 class="page-hero__title">{{ $t('contact.title') }}</h1>
                <p class="page-hero__subtitle">{{ $t('contact.subtitle') }}</p>
              </div>
            </div>
            <div class="page-hero__actions contact-hero__actions">
              <RouterLink to="/community" class="page-inline-cta">
                {{ $t('nav.community') }}
              </RouterLink>
              <RouterLink to="/about" class="page-control-btn page-control-btn--compact">
                {{ $t('nav.about') }}
              </RouterLink>
            </div>
          </div>
          <div class="page-hero__meta">
            <span class="page-hero__note">{{ $t('contact.feedbackTitle') }}</span>
            <span class="page-hero__note">{{ $t('contact.feedbackSubtitle') }}</span>
            <span class="page-hero__note">{{ $t('contact.securityTitle') }}</span>
          </div>
        </div>
      </section>

      <div class="contact-layout page-grid page-grid--sidebar">
        <div class="page-card-stack">
          <section id="security-reporting" class="contact-card contact-security empty-surface">
            <div class="contact-security__header">
              <span class="page-hero__eyebrow">{{ $t('contact.securityTitle') }}</span>
              <div>
                <h2 class="contact-section-title contact-card__title">
                  {{ $t('contact.securityTitle') }}
                </h2>
                <p class="card-subtitle">{{ $t('contact.securitySubtitle') }}</p>
              </div>
            </div>

            <p class="contact-security__body">{{ $t('contact.securityBody') }}</p>

            <div class="contact-security__summary">
              <article
                v-for="item in securitySummaryItems"
                :key="item.label"
                class="contact-security__summary-item"
              >
                <span class="contact-security__summary-label">{{ item.label }}</span>
                <p class="contact-security__summary-value">{{ item.value }}</p>
              </article>
            </div>

            <ul class="contact-security__checklist">
              <li v-for="item in securityChecklistItems" :key="item" class="contact-security__item">
                {{ item }}
              </li>
            </ul>

            <div class="contact-security__actions">
              <a
                href="#security-feedback-form"
                class="page-inline-cta contact-security__link"
                @click="prepareSecurityFeedback"
              >
                {{ $t('contact.securityAction') }}
              </a>
              <a
                href="/.well-known/security.txt"
                class="page-control-btn page-control-btn--compact contact-security__link"
              >
                {{ $t('contact.securityTxtAction') }}
              </a>
            </div>
          </section>

          <section class="contact-card empty-surface">
            <h2 class="contact-section-title contact-card__title">{{ $t('contact.title') }}</h2>
            <p class="card-subtitle">{{ $t('contact.subtitle') }}</p>

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

          <section id="security-feedback-form" class="contact-card empty-surface">
            <h2 class="contact-section-title contact-card__title">
              {{ $t('contact.feedbackTitle') }}
            </h2>
            <p class="card-subtitle">{{ $t('contact.feedbackSubtitle') }}</p>

            <form class="contact-form" @submit.prevent="handleFeedbackSubmit">
              <div class="form-group">
                <label>{{ $t('contact.feedbackCategory') }}</label>
                <div
                  class="category-list page-control-group"
                  role="radiogroup"
                  :aria-label="$t('contact.feedbackCategory')"
                >
                  <button
                    v-for="option in feedbackCategoryOptions"
                    :key="option.value"
                    type="button"
                    class="category-btn page-control-btn page-control-btn--compact"
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

        <aside class="contact-side empty-surface">
          <div class="contact-side__section">
            <h2 class="contact-side__title">{{ $t('contact.securityTitle') }}</h2>
            <p class="contact-side__copy">{{ $t('contact.securitySubtitle') }}</p>
            <div class="contact-side__links">
              <a href="#security-reporting" class="page-control-btn contact-side__link">
                {{ $t('contact.securityAction') }}
              </a>
              <a href="/.well-known/security.txt" class="page-control-btn contact-side__link">
                {{ $t('contact.securityTxtAction') }}
              </a>
            </div>
          </div>

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
              <RouterLink to="/community" class="page-control-btn contact-side__link">
                {{ $t('nav.community') }}
              </RouterLink>
              <RouterLink to="/about" class="page-control-btn contact-side__link">
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
const securitySummaryItems = computed(() => [
  {
    label: t('contact.securitySummaryScopeLabel'),
    value: t('contact.securitySummaryScopeValue'),
  },
  {
    label: t('contact.securitySummaryChannelLabel'),
    value: t('contact.securitySummaryChannelValue'),
  },
  {
    label: t('contact.securitySummaryPreparationLabel'),
    value: t('contact.securitySummaryPreparationValue'),
  },
])
const securityChecklistItems = computed(() => [
  t('contact.securityChecklistPrivate'),
  t('contact.securityChecklistScope'),
  t('contact.securityChecklistEvidence'),
])

function prepareSecurityFeedback() {
  feedback.category = 'bug'
}

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

.contact-hero .page-hero__content {
  align-items: stretch;
}

.contact-hero__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  inline-size: min(100%, 18rem);
  justify-content: flex-end;
}

@media (max-width: 48rem) {
  .contact-hero__actions {
    grid-template-columns: minmax(0, 1fr);
    inline-size: 100%;
    justify-content: flex-start;
  }
}

.contact-card {
  inline-size: 100%;
  display: grid;
  gap: var(--spacing-4);
}

.contact-security__header {
  display: grid;
  gap: var(--spacing-3);
}

.contact-security__body,
.contact-security__summary-value {
  margin: 0;
  color: var(--color-text-secondary);
}

.contact-security__body {
  max-inline-size: 72ch;
}

.contact-security__summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
  gap: var(--spacing-3);
}

.contact-security__summary-item {
  display: grid;
  gap: var(--spacing-2);
  padding: var(--spacing-3);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg, 1rem);
  background: var(--glass-bg-subtle);
}

.contact-security__summary-label {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.contact-security__checklist {
  display: grid;
  gap: var(--spacing-2);
  margin: 0;
  padding-inline-start: 1.25rem;
  color: var(--color-text-secondary);
}

.contact-security__item {
  line-height: 1.6;
}

.contact-security__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

.contact-security__link {
  text-decoration: none;
}

.contact-layout {
  align-items: start;
}

.contact-side {
  display: grid;
  gap: var(--spacing-5);
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
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 8rem), 1fr));
  gap: var(--spacing-2);
  min-inline-size: 0;
}

.contact-side__link {
  min-inline-size: 0;
  text-decoration: none;
}

@media (min-width: 768px) {
  .contact-page {
    padding: var(--spacing-6) 0;
  }
}

.contact-section-title {
  font-size: var(--text-lg);
  margin: 0;
}

.contact-card__title {
  text-align: start;
}

.card-subtitle {
  margin: 0;
  text-align: start;
  color: var(--color-text-tertiary);
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
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 8rem), 1fr));
  gap: var(--spacing-2);
}

.category-btn {
  inline-size: 100%;
  justify-content: center;
  white-space: nowrap;
}

.contact-textarea {
  resize: vertical;
  min-height: 7.5rem;
}

@media (max-width: 48rem) {
  .contact-side__link {
    inline-size: 100%;
  }
}
</style>
