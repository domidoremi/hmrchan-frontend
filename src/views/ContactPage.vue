<template>
  <div class="contact-page">
    <div class="container">
      <PageHeroShell tag="section" class="contact-hero">
        <template #heading>
          <span class="page-hero-shell__eyebrow">{{ $t('contact.title') }}</span>
          <div class="contact-hero__copy">
            <h1 class="page-hero-shell__title">{{ $t('contact.title') }}</h1>
            <p class="page-hero-shell__subtitle">{{ $t('contact.subtitle') }}</p>
          </div>
        </template>

        <template #actions>
          <div class="contact-hero__links">
            <RouterLink to="/community" class="page-inline-cta">
              {{ $t('nav.community') }}
            </RouterLink>
            <ControlButton :tag="RouterLink" size="compact" to="/about">
              {{ $t('nav.about') }}
            </ControlButton>
          </div>
        </template>

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
      </PageHeroShell>

      <section class="contact-workflow surface-editorial" aria-labelledby="contact-workflow-title">
        <div class="contact-workflow__header">
          <div class="contact-workflow__copy">
            <span class="page-section-kicker">{{ $t('contact.workflowTitle') }}</span>
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
              <span class="contact-stepper__label">{{ step.label }}</span>
            </button>
          </div>
        </div>

        <Transition name="contact-stage" mode="out-in">
          <section :key="activeStep" class="contact-stage surface-base">
            <template v-if="activeStep === 1">
              <div id="contact-step-topic" class="contact-panel">
                <div class="contact-panel__header">
                  <span class="page-section-kicker">{{ $t('contact.stepExplain') }}</span>
                  <h3 class="contact-panel__title">{{ $t('contact.topicTitle') }}</h3>
                  <p class="contact-panel__subtitle">{{ $t('contact.topicSubtitle') }}</p>
                </div>

                <div class="contact-topic-grid">
                  <ControlButton
                    v-for="topic in contactTopicOptions"
                    :key="topic.value"
                    class="contact-topic-card"
                    :pressed="selectedTopic === topic.value"
                    @click="selectedTopic = topic.value"
                  >
                    <span class="contact-topic-card__title">{{ topic.label }}</span>
                    <span class="contact-topic-card__hint">{{ topic.hint }}</span>
                  </ControlButton>
                </div>

                <p class="contact-panel__note">
                  {{ $t('contact.topicNote') }}
                </p>
              </div>
            </template>

            <template v-else-if="activeStep === 2">
              <div id="contact-step-details" class="contact-panel">
                <div class="contact-panel__header">
                  <span class="page-section-kicker">{{ selectedTopicMeta.label }}</span>
                  <h3 class="contact-panel__title">{{ $t('contact.detailTitle') }}</h3>
                  <p class="contact-panel__subtitle">{{ selectedTopicMeta.hint }}</p>
                </div>

                <div class="contact-panel__grid">
                  <article
                    v-for="item in detailGuideItems"
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
              <div id="contact-step-send" class="contact-panel">
                <div class="contact-panel__header">
                  <span class="page-section-kicker">{{ $t('contact.stepSubmit') }}</span>
                  <h3 class="contact-panel__title">{{ $t('contact.sendTitle') }}</h3>
                  <p class="contact-panel__subtitle">{{ $t('contact.sendSubtitle') }}</p>
                </div>

                <div class="contact-form__meta">
                  <span class="summary-chip">
                    <strong>{{ $t('contact.topicBadgeLabel') }}</strong>
                    {{ selectedTopicMeta.label }}
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
          <ControlButton size="compact" :disabled="activeStep === 1" @click="previousStep">
            {{ $t('contact.previousStep') }}
          </ControlButton>

          <ControlButton
            v-if="activeStep < 3"
            class="contact-workflow__next"
            size="compact"
            active
            @click="nextStep"
          >
            {{ $t('contact.nextStep') }}
          </ControlButton>
        </div>
      </section>

      <section
        class="contact-private-note surface-base"
        aria-labelledby="contact-private-note-title"
      >
        <div class="contact-private-note__copy">
          <span class="page-section-kicker">{{ $t('contact.privateTitle') }}</span>
          <h2 id="contact-private-note-title" class="contact-private-note__title">
            {{ $t('contact.privateTitle') }}
          </h2>
          <p class="contact-private-note__body">{{ $t('contact.privateBody') }}</p>
        </div>

        <a href="/.well-known/security.txt" class="page-inline-cta">
          {{ $t('contact.privateAction') }}
        </a>
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
import ControlButton from '@/components/appearance/ControlButton.vue'
import PageHeroShell from '@/components/appearance/PageHeroShell.vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Textarea from '@/components/ui/Textarea.vue'

type ContactStep = 1 | 2 | 3
type ContactTopic = 'general' | 'bug' | 'feature' | 'other'

const { t } = useI18n()
const toastStore = useToastStore()

const activeStep = ref<ContactStep>(1)
const selectedTopic = ref<ContactTopic>('general')

const form = reactive({
  name: '',
  email: '',
  subject: '',
  message: '',
})

const isSubmitting = ref(false)

const workflowSteps = computed(() => [
  { value: 1 as const, index: '01', label: t('contact.stepExplain') },
  { value: 2 as const, index: '02', label: t('contact.stepDescribe') },
  { value: 3 as const, index: '03', label: t('contact.stepSubmit') },
])

const contactTopicOptions = computed(() => [
  {
    value: 'general' as const,
    label: t('contact.topicGeneral'),
    hint: t('contact.topicGeneralHint'),
  },
  {
    value: 'bug' as const,
    label: t('contact.topicIssue'),
    hint: t('contact.topicIssueHint'),
  },
  {
    value: 'feature' as const,
    label: t('contact.topicSuggestion'),
    hint: t('contact.topicSuggestionHint'),
  },
  {
    value: 'other' as const,
    label: t('contact.topicOther'),
    hint: t('contact.topicOtherHint'),
  },
])

const selectedTopicMeta = computed(
  () =>
    contactTopicOptions.value.find((topic) => topic.value === selectedTopic.value) ??
    contactTopicOptions.value[0]
)

const heroHighlights = computed(() => [
  {
    label: t('contact.heroSummaryTopicLabel'),
    value: t('contact.heroSummaryTopicValue'),
  },
  {
    label: t('contact.heroSummaryReplyLabel'),
    value: t('contact.heroSummaryReplyValue'),
  },
  {
    label: t('contact.heroSummaryClarityLabel'),
    value: t('contact.heroSummaryClarityValue'),
  },
])

const detailGuideItems = computed(() => [
  {
    label: t('contact.detailContextLabel'),
    value: t('contact.detailContextValue'),
  },
  {
    label: t('contact.detailNeedLabel'),
    value: t('contact.detailNeedValue'),
  },
  {
    label: t('contact.detailReplyLabel'),
    value: t('contact.detailReplyValue'),
  },
])

function resolveStepTargetId(step = activeStep.value) {
  if (step === 1) return 'contact-step-topic'
  if (step === 2) return 'contact-step-details'
  return 'contact-step-send'
}

async function focusStep(step = activeStep.value) {
  await nextTick()

  if (typeof document === 'undefined') return

  const target = document.getElementById(resolveStepTargetId(step))

  if (target && typeof target.scrollIntoView === 'function') {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

async function goToStep(step: ContactStep) {
  activeStep.value = step
  await focusStep(step)
}

function nextStep() {
  if (activeStep.value >= 3) return
  void goToStep((activeStep.value + 1) as ContactStep)
}

function previousStep() {
  if (activeStep.value <= 1) return
  void goToStep((activeStep.value - 1) as ContactStep)
}

async function handleSubmit() {
  isSubmitting.value = true

  try {
    await contactService.sendMessage({
      name: form.name,
      email: form.email,
      subject: `${selectedTopicMeta.value.label}｜${form.subject}`,
      message: form.message,
    })

    toastStore.success(t('contact.success'))

    form.name = ''
    form.email = ''
    form.subject = ''
    form.message = ''
    selectedTopic.value = 'general'
    activeStep.value = 1
  } catch {
    toastStore.error(t('contact.error'))
  } finally {
    isSubmitting.value = false
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

.contact-hero__content,
.contact-workflow,
.contact-workflow__header,
.contact-workflow__copy,
.contact-panel,
.contact-panel__header,
.contact-private-note,
.contact-private-note__copy {
  display: grid;
  gap: var(--spacing-3);
}

.contact-hero__header {
  display: grid;
  gap: var(--spacing-3);
}

.contact-hero__heading {
  max-inline-size: min(100%, 46rem);
}

.contact-hero__copy {
  display: grid;
  gap: var(--spacing-2);
}

.contact-hero__links,
.contact-form__meta,
.contact-workflow__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

.contact-hero__summary,
.contact-topic-grid,
.contact-panel__grid {
  display: grid;
  gap: var(--spacing-3);
}

.contact-hero__summary,
.contact-panel__grid {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr));
}

.contact-highlight,
.contact-guide-card {
  display: grid;
  gap: var(--spacing-2);
  min-inline-size: 0;
  padding: clamp(1rem, 2vw, 1.3rem);
}

.contact-highlight__label,
.contact-guide-card__label {
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.contact-highlight__value,
.contact-guide-card__value,
.contact-panel__subtitle,
.contact-panel__note,
.contact-private-note__body {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.65;
}

.contact-workflow {
  padding: clamp(1.25rem, 2.5vw, 1.75rem);
}

.contact-workflow__title,
.contact-panel__title,
.contact-private-note__title {
  margin: 0;
}

.contact-workflow__subtitle {
  margin: 0;
  max-inline-size: 58ch;
}

.contact-stepper {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--spacing-2);
}

.contact-stepper__item,
.contact-topic-card {
  min-inline-size: 0;
  transition:
    transform 220ms var(--ease-out),
    background 220ms var(--ease-out),
    border-color 220ms var(--ease-out),
    box-shadow 220ms var(--ease-out),
    color 220ms var(--ease-out);
}

.contact-stepper__item {
  display: grid;
  justify-items: start;
  gap: var(--spacing-2);
  padding: var(--spacing-3);
  border: 1px solid var(--page-control-border);
  border-radius: var(--radius-xl);
  background: var(--page-control-bg);
  color: var(--page-control-ink);
  text-align: start;
}

.contact-stepper__item:hover,
.contact-stepper__item:focus-visible,
.contact-topic-card:hover,
.contact-topic-card:focus-visible {
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
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
}

.contact-stepper__label,
.contact-topic-card__title {
  color: var(--color-text-primary);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  line-height: 1.35;
}

.contact-topic-grid {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
}

.contact-topic-card {
  display: grid;
  justify-items: start;
  gap: var(--spacing-2);
  inline-size: 100%;
  padding: var(--spacing-3);
  border-radius: var(--radius-xl);
  text-align: start;
  white-space: normal;
}

.contact-topic-card__hint {
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
  line-height: 1.6;
}

.contact-topic-card.page-control--active,
.contact-topic-card.page-control--active .contact-topic-card__title,
.contact-topic-card.page-control--active .contact-topic-card__hint,
.contact-stepper__item.active .contact-stepper__label {
  color: currentColor;
}

.contact-stage {
  display: grid;
  gap: var(--spacing-4);
  padding: clamp(1.25rem, 2.6vw, 1.75rem);
}

.contact-form,
.contact-form__split,
.form-group {
  display: grid;
  gap: var(--spacing-3);
}

.form-group label {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.contact-textarea {
  min-height: 8rem;
  resize: vertical;
}

.contact-workflow__actions {
  justify-content: space-between;
}

.contact-workflow__next {
  margin-inline-start: auto;
}

.contact-private-note {
  align-items: center;
  padding: clamp(1rem, 2vw, 1.35rem);
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

  .contact-private-note {
    grid-template-columns: minmax(0, 1fr) auto;
  }
}

@media (max-width: 48rem) {
  .contact-page {
    padding: var(--spacing-3) 0 var(--spacing-6);
  }

  .contact-stepper {
    grid-template-columns: repeat(3, minmax(0, 1fr));
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
  .contact-topic-card,
  .contact-stage-enter-active,
  .contact-stage-leave-active {
    transition: none;
  }

  .contact-stepper__item:hover,
  .contact-stepper__item:focus-visible,
  .contact-topic-card:hover,
  .contact-topic-card:focus-visible {
    transform: none;
  }
}
</style>
