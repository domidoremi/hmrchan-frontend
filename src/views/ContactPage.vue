<template>
  <div class="contact-page">
    <div class="container">
      <section class="page-hero contact-hero">
        <div class="page-hero__content contact-hero__content">
          <div class="page-hero__header contact-hero__header">
            <div class="page-hero__heading contact-hero__heading">
              <span class="page-hero__eyebrow">{{ activeTrackMeta.label }}</span>
              <div class="contact-hero__copy">
                <h1 class="page-hero__title">{{ $t('contact.title') }}</h1>
                <p class="page-hero__subtitle">{{ activeTrackMeta.subtitle }}</p>
              </div>
            </div>

            <div class="contact-track-switch" :aria-label="$t('contact.workflowTitle')">
              <button
                v-for="track in trackOptions"
                :key="track.value"
                type="button"
                class="contact-track-switch__item page-control-btn"
                :class="{ active: activeTrack === track.value }"
                :aria-pressed="activeTrack === track.value"
                @click="setTrack(track.value)"
              >
                <span class="contact-track-switch__title">{{ track.label }}</span>
                <span class="contact-track-switch__subtitle">{{ track.subtitle }}</span>
              </button>
            </div>
          </div>

          <div class="contact-hero__summary">
            <article
              v-for="item in heroHighlights"
              :key="item.label"
              class="contact-highlight surface-base"
            >
              <span class="contact-highlight__label">{{ item.label }}</span>
              <p class="contact-highlight__value">{{ item.value }}</p>
            </article>
          </div>

          <div class="contact-hero__links">
            <RouterLink to="/community" class="page-inline-cta">
              {{ $t('nav.community') }}
            </RouterLink>
            <a href="/.well-known/security.txt" class="page-control-btn page-control-btn--compact">
              {{ $t('contact.securityTxtAction') }}
            </a>
            <RouterLink to="/about" class="page-control-btn page-control-btn--compact">
              {{ $t('nav.about') }}
            </RouterLink>
          </div>
        </div>
      </section>

      <section class="contact-workflow surface-editorial" aria-labelledby="contact-workflow-title">
        <div class="contact-workflow__header">
          <div class="contact-workflow__copy">
            <span class="page-section-kicker">{{ activeTrackMeta.label }}</span>
            <h2 id="contact-workflow-title" class="page-section-title contact-workflow__title">
              {{ $t('contact.workflowTitle') }}
            </h2>
            <p class="page-section-subtitle contact-workflow__subtitle">
              {{ $t('contact.workflowSubtitle') }}
            </p>
          </div>

          <div class="contact-stepper">
            <button
              v-for="step in workflowSteps"
              :key="step.value"
              type="button"
              class="contact-stepper__item"
              :class="{ active: activeStep === step.value }"
              :aria-pressed="activeStep === step.value"
              @click="goToStep(step.value)"
            >
              <span class="contact-stepper__index">{{ step.index }}</span>
              <span class="contact-stepper__copy">
                <span class="contact-stepper__label">{{ step.label }}</span>
              </span>
            </button>
          </div>
        </div>

        <Transition name="contact-stage" mode="out-in">
          <section :key="`${activeTrack}-${activeStep}`" class="contact-stage surface-base">
            <template v-if="activeStep === 1">
              <div v-if="activeTrack === 'feedback'" id="security-reporting" class="contact-panel">
                <div class="contact-panel__header">
                  <span class="page-section-kicker">{{ $t('contact.securityTitle') }}</span>
                  <h3 class="contact-panel__title">{{ $t('contact.feedbackGuideTitle') }}</h3>
                  <p class="contact-panel__subtitle">{{ $t('contact.feedbackGuideBody') }}</p>
                </div>

                <div class="contact-panel__grid">
                  <article
                    v-for="item in securitySummaryItems"
                    :key="item.label"
                    class="contact-guide-card surface-base"
                  >
                    <span class="contact-guide-card__label">{{ item.label }}</span>
                    <p class="contact-guide-card__value">{{ item.value }}</p>
                  </article>
                </div>

                <div class="contact-panel__actions">
                  <a
                    href="#security-feedback-form"
                    class="page-inline-cta"
                    @click="prepareSecurityFeedback"
                  >
                    {{ $t('contact.securityAction') }}
                  </a>
                  <a
                    href="/.well-known/security.txt"
                    class="page-control-btn page-control-btn--compact"
                  >
                    {{ $t('contact.securityTxtAction') }}
                  </a>
                </div>
              </div>

              <div v-else id="direct-contact-guide" class="contact-panel">
                <div class="contact-panel__header">
                  <span class="page-section-kicker">{{ $t('contact.directTitle') }}</span>
                  <h3 class="contact-panel__title">{{ $t('contact.messageGuideTitle') }}</h3>
                  <p class="contact-panel__subtitle">{{ $t('contact.messageGuideBody') }}</p>
                </div>

                <div class="contact-panel__grid">
                  <article
                    v-for="item in directGuideItems"
                    :key="item.label"
                    class="contact-guide-card surface-base"
                  >
                    <span class="contact-guide-card__label">{{ item.label }}</span>
                    <p class="contact-guide-card__value">{{ item.value }}</p>
                  </article>
                </div>
              </div>
            </template>

            <template v-else-if="activeStep === 2">
              <div
                v-if="activeTrack === 'feedback'"
                id="feedback-description"
                class="contact-panel"
              >
                <div class="contact-panel__header">
                  <span class="page-section-kicker">{{ $t('contact.stepDescribe') }}</span>
                  <h3 class="contact-panel__title">{{ $t('contact.feedbackTitle') }}</h3>
                  <p class="contact-panel__subtitle">{{ $t('contact.feedbackSubtitle') }}</p>
                </div>

                <div class="form-group">
                  <label>{{ $t('contact.feedbackCategory') }}</label>
                  <div
                    class="category-list page-control-group"
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

                <div class="contact-panel__grid">
                  <article
                    v-for="item in feedbackGuideItems"
                    :key="item.label"
                    class="contact-guide-card surface-base"
                  >
                    <span class="contact-guide-card__label">{{ item.label }}</span>
                    <p class="contact-guide-card__value">{{ item.value }}</p>
                  </article>
                </div>

                <ul class="contact-panel__list">
                  <li v-for="item in securityChecklistItems" :key="item">
                    {{ item }}
                  </li>
                </ul>
              </div>

              <div v-else id="message-description" class="contact-panel">
                <div class="contact-panel__header">
                  <span class="page-section-kicker">{{ $t('contact.stepDescribe') }}</span>
                  <h3 class="contact-panel__title">{{ $t('contact.directTitle') }}</h3>
                  <p class="contact-panel__subtitle">{{ $t('contact.directSubtitle') }}</p>
                </div>

                <div class="contact-panel__grid">
                  <article
                    v-for="item in directGuideItems"
                    :key="item.label"
                    class="contact-guide-card surface-base"
                  >
                    <span class="contact-guide-card__label">{{ item.label }}</span>
                    <p class="contact-guide-card__value">{{ item.value }}</p>
                  </article>
                </div>
              </div>
            </template>

            <template v-else>
              <div
                v-if="activeTrack === 'feedback'"
                id="security-feedback-form"
                class="contact-panel"
              >
                <div class="contact-panel__header">
                  <span class="page-section-kicker">{{ $t('contact.stepSubmit') }}</span>
                  <h3 class="contact-panel__title">{{ $t('contact.feedbackTitle') }}</h3>
                  <p class="contact-panel__subtitle">{{ $t('contact.feedbackSubtitle') }}</p>
                </div>

                <div class="contact-form__meta">
                  <span class="summary-chip">
                    <strong>{{ $t('contact.feedbackCategory') }}</strong>
                    {{ selectedFeedbackCategoryLabel }}
                  </span>
                  <span class="summary-chip">
                    {{ $t('contact.securityTitle') }}
                  </span>
                </div>

                <form class="contact-form" @submit.prevent="handleFeedbackSubmit">
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
                      rows="6"
                      required
                    />
                  </div>

                  <Button type="submit" :loading="isFeedbackSubmitting" full-width>
                    {{
                      isFeedbackSubmitting
                        ? $t('contact.feedbackSending')
                        : $t('contact.feedbackSend')
                    }}
                  </Button>
                </form>
              </div>

              <div v-else id="contact-direct-form" class="contact-panel">
                <div class="contact-panel__header">
                  <span class="page-section-kicker">{{ $t('contact.stepSubmit') }}</span>
                  <h3 class="contact-panel__title">{{ $t('contact.directTitle') }}</h3>
                  <p class="contact-panel__subtitle">{{ $t('contact.subtitle') }}</p>
                </div>

                <div class="contact-form__meta">
                  <span class="summary-chip">
                    <strong>{{ $t('contact.subject') }}</strong>
                    {{ $t('contact.messageGuideSubjectLabel') }}
                  </span>
                  <span class="summary-chip">
                    {{ $t('contact.feedbackContact') }}
                  </span>
                </div>

                <form class="contact-form" @submit.prevent="handleSubmit">
                  <div class="contact-form__split">
                    <div class="form-group">
                      <label for="name">{{ $t('contact.name') }}</label>
                      <Input id="name" v-model="form.name" type="text" required />
                    </div>

                    <div class="form-group">
                      <label for="email">{{ $t('contact.email') }}</label>
                      <Input id="email" v-model="form.email" type="email" required />
                    </div>
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
                      rows="6"
                      required
                    />
                  </div>

                  <Button type="submit" :loading="isSubmitting" full-width>
                    {{ isSubmitting ? $t('contact.sending') : $t('contact.send') }}
                  </Button>
                </form>
              </div>
            </template>
          </section>
        </Transition>

        <div class="contact-workflow__actions">
          <button
            type="button"
            class="page-control-btn page-control-btn--compact"
            :disabled="activeStep === 1"
            @click="previousStep"
          >
            {{ $t('contact.previousStep') }}
          </button>

          <button
            v-if="activeStep < 3"
            type="button"
            class="cta-primary contact-workflow__next"
            @click="nextStep"
          >
            {{ $t('contact.nextStep') }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ContactPage' })

import { computed, nextTick, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToastStore } from '@/stores'
import { contactService } from '@/api/contactService'
import { feedbackService } from '@/api/feedbackService'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Textarea from '@/components/ui/Textarea.vue'

type ContactTrack = 'feedback' | 'message'
type ContactStep = 1 | 2 | 3

const { t } = useI18n()
const toastStore = useToastStore()

const activeTrack = ref<ContactTrack>('feedback')
const activeStep = ref<ContactStep>(1)

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

const workflowSteps = computed(() => [
  { value: 1 as const, index: '01', label: t('contact.stepExplain') },
  { value: 2 as const, index: '02', label: t('contact.stepDescribe') },
  { value: 3 as const, index: '03', label: t('contact.stepSubmit') },
])
const trackOptions = computed(() => [
  {
    value: 'feedback' as const,
    label: t('contact.feedbackTitle'),
    subtitle: t('contact.feedbackSubtitle'),
  },
  {
    value: 'message' as const,
    label: t('contact.directTitle'),
    subtitle: t('contact.directSubtitle'),
  },
])
const activeTrackMeta = computed(
  () => trackOptions.value.find((item) => item.value === activeTrack.value) ?? trackOptions.value[0]
)
const feedbackCategoryOptions = computed(() => [
  { value: 'general' as const, label: t('contact.feedbackCategoryGeneral') },
  { value: 'bug' as const, label: t('contact.feedbackCategoryBug') },
  { value: 'feature' as const, label: t('contact.feedbackCategoryFeature') },
  { value: 'other' as const, label: t('contact.feedbackCategoryOther') },
])
const selectedFeedbackCategoryLabel = computed(
  () =>
    feedbackCategoryOptions.value.find((option) => option.value === feedback.category)?.label ??
    feedbackCategoryOptions.value[0].label
)
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
const directGuideItems = computed(() => [
  {
    label: t('contact.messageGuideSubjectLabel'),
    value: t('contact.messageGuideSubject'),
  },
  {
    label: t('contact.messageGuideMessageLabel'),
    value: t('contact.messageGuideMessage'),
  },
  {
    label: t('contact.messageGuideReplyLabel'),
    value: t('contact.messageGuideReply'),
  },
])
const feedbackGuideItems = computed(() => [
  {
    label: t('contact.feedbackGuideEvidenceLabel'),
    value: t('contact.feedbackGuideEvidence'),
  },
  {
    label: t('contact.feedbackGuideChannelLabel'),
    value: t('contact.feedbackGuideChannel'),
  },
  {
    label: t('contact.feedbackGuideTimingLabel'),
    value: t('contact.feedbackGuideTiming'),
  },
])
const heroHighlights = computed(() =>
  activeTrack.value === 'feedback' ? securitySummaryItems.value : directGuideItems.value
)

function setTrack(track: ContactTrack) {
  activeTrack.value = track
  activeStep.value = 1
}

function resolveStepTargetId(track = activeTrack.value, step = activeStep.value) {
  if (step === 1) {
    return track === 'feedback' ? 'security-reporting' : 'direct-contact-guide'
  }

  if (step === 2) {
    return track === 'feedback' ? 'feedback-description' : 'message-description'
  }

  return track === 'feedback' ? 'security-feedback-form' : 'contact-direct-form'
}

async function focusStep(track = activeTrack.value, step = activeStep.value) {
  await nextTick()

  if (typeof document === 'undefined') return

  const target = document.getElementById(resolveStepTargetId(track, step))

  if (target && typeof target.scrollIntoView === 'function') {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

async function goToStep(step: ContactStep) {
  activeStep.value = step
  await focusStep()
}

function nextStep() {
  if (activeStep.value >= 3) return
  void goToStep((activeStep.value + 1) as ContactStep)
}

function previousStep() {
  if (activeStep.value <= 1) return
  void goToStep((activeStep.value - 1) as ContactStep)
}

async function prepareSecurityFeedback(event?: Event) {
  event?.preventDefault()
  activeTrack.value = 'feedback'
  feedback.category = 'bug'
  activeStep.value = 3
  await focusStep('feedback', 3)
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

    form.name = ''
    form.email = ''
    form.subject = ''
    form.message = ''
    activeStep.value = 1
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
    activeStep.value = 1
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
  gap: var(--spacing-5);
}

.contact-hero__content {
  gap: var(--spacing-4);
}

.contact-hero__header {
  display: grid;
  gap: var(--spacing-4);
}

.contact-hero__heading {
  max-inline-size: min(100%, 48rem);
}

.contact-hero__copy {
  display: grid;
  gap: var(--spacing-2);
}

.contact-track-switch {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr));
  gap: var(--spacing-2);
}

.contact-track-switch__item {
  display: grid;
  justify-items: start;
  gap: var(--spacing-1);
  inline-size: 100%;
  min-inline-size: 0;
  padding: var(--spacing-3);
  border-radius: var(--radius-xl);
  text-align: start;
  white-space: normal;
}

.contact-track-switch__title {
  color: var(--color-text-primary);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  line-height: 1.3;
}

.contact-track-switch__subtitle {
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
  line-height: 1.5;
}

.contact-track-switch__item.active .contact-track-switch__title,
.contact-track-switch__item.active .contact-track-switch__subtitle,
.contact-stepper__item.active .contact-stepper__label {
  color: currentColor;
}

.contact-hero__summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr));
  gap: var(--spacing-3);
}

.contact-highlight {
  display: grid;
  gap: var(--spacing-2);
  min-inline-size: 0;
  padding: clamp(1rem, 2vw, 1.35rem);
}

.contact-highlight__label,
.contact-guide-card__label {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.contact-highlight__value,
.contact-guide-card__value {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.65;
}

.contact-hero__links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

.contact-workflow {
  display: grid;
  gap: var(--spacing-4);
  padding: clamp(1.25rem, 2.5vw, 1.75rem);
}

.contact-workflow__header,
.contact-workflow__copy,
.contact-panel,
.contact-panel__header {
  display: grid;
  gap: var(--spacing-3);
}

.contact-workflow__title,
.contact-panel__title {
  margin: 0;
  max-inline-size: none;
}

.contact-workflow__subtitle,
.contact-panel__subtitle {
  margin: 0;
  max-inline-size: 60ch;
  color: var(--color-text-secondary);
}

.contact-stepper {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--spacing-2);
}

.contact-stepper__item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: var(--spacing-3);
  min-inline-size: 0;
  padding: var(--spacing-3);
  border: 1px solid var(--page-control-border);
  border-radius: var(--radius-xl);
  background: var(--page-control-bg);
  color: var(--page-control-ink);
  text-align: start;
  transition:
    transform 220ms var(--ease-out),
    background 220ms var(--ease-out),
    border-color 220ms var(--ease-out),
    box-shadow 220ms var(--ease-out),
    color 220ms var(--ease-out);
}

.contact-stepper__item:hover,
.contact-stepper__item:focus-visible {
  outline: none;
  transform: translateY(-0.1rem);
  background: var(--page-control-bg-hover);
  border-color: var(--page-control-border-strong);
  box-shadow: var(--page-control-shadow);
}

.contact-stepper__item.active {
  background: var(--page-control-active-bg);
  border-color: var(--page-control-active-border);
  color: var(--page-control-active-ink);
  box-shadow: var(--page-control-shadow);
}

.contact-stepper__index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: 2.25rem;
  block-size: 2.25rem;
  border-radius: var(--radius-full);
  background: rgba(var(--color-primary-rgb), 0.08);
  color: currentColor;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
}

.contact-stepper__copy {
  display: grid;
  min-inline-size: 0;
}

.contact-stepper__label {
  color: var(--color-text-primary);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  line-height: 1.35;
}

.contact-stage {
  display: grid;
  gap: var(--spacing-4);
  padding: clamp(1.25rem, 2.6vw, 1.75rem);
}

.contact-panel__grid,
.contact-form__split,
.category-list {
  display: grid;
  gap: var(--spacing-3);
}

.contact-panel__grid {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr));
}

.contact-guide-card {
  display: grid;
  gap: var(--spacing-2);
  min-inline-size: 0;
  padding: clamp(1rem, 1.8vw, 1.15rem);
}

.contact-panel__list {
  display: grid;
  gap: var(--spacing-2);
  margin: 0;
  padding-inline-start: 1.25rem;
  color: var(--color-text-secondary);
  line-height: 1.65;
}

.contact-panel__actions,
.contact-form__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

.contact-form {
  display: grid;
  gap: var(--spacing-3);
}

.form-group {
  display: grid;
  gap: var(--spacing-2);
}

.form-group label {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.category-list {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 8rem), 1fr));
}

.category-btn {
  inline-size: 100%;
  justify-content: center;
  white-space: normal;
}

.contact-textarea {
  min-height: 8rem;
  resize: vertical;
}

.contact-workflow__actions {
  display: flex;
  justify-content: space-between;
  gap: var(--spacing-2);
}

.contact-workflow__next {
  margin-inline-start: auto;
}

.contact-stage-enter-active,
.contact-stage-leave-active {
  transition:
    opacity 220ms var(--ease-out),
    transform 260ms var(--ease-out);
}

.contact-stage-enter-from,
.contact-stage-leave-to {
  opacity: 0;
  transform: translateY(0.8rem);
}

@media (min-width: 48rem) {
  .contact-form__split {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 48rem) {
  .contact-page {
    padding: var(--spacing-3) 0 var(--spacing-6);
  }

  .container {
    gap: var(--spacing-4);
  }

  .contact-stepper__item {
    grid-template-columns: minmax(0, 1fr);
    justify-items: start;
  }

  .contact-workflow__actions {
    flex-direction: column-reverse;
  }

  .contact-workflow__actions > * {
    inline-size: 100%;
    justify-content: center;
    margin-inline-start: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .contact-stepper__item,
  .contact-stage-enter-active,
  .contact-stage-leave-active {
    transition: none;
  }

  .contact-stepper__item:hover,
  .contact-stepper__item:focus-visible {
    transform: none;
  }
}
</style>
