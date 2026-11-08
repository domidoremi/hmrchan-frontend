<template>
  <div class="contact-page">
    <PageHeroShell
      class="contact-hero"
      :title="$t('contact.title')"
      :subtitle="$t('contact.subtitle')"
    >
      <template #actions
        ><RouterLink to="/community" class="page-inline-cta"
          >{{ $t('nav.community') }} ↗</RouterLink
        ></template
      >
    </PageHeroShell>
    <form class="contact-workflow" @submit.prevent="handleSubmit">
      <fieldset class="contact-topics" :disabled="isSubmitting">
        <legend>{{ $t('contact.topicTitle') }}</legend>
        <div class="contact-topic-grid">
          <label
            v-for="(topic, index) in topics"
            :key="topic.value"
            class="contact-choice"
            :class="{ 'is-selected': selectedTopic === topic.value }"
          >
            <input v-model="selectedTopic" type="radio" name="contact-topic" :value="topic.value" />
            <small>0{{ index + 1 }}</small
            ><span>{{ topic.label }}</span
            ><Check :size="16" />
          </label>
        </div>
      </fieldset>
      <fieldset class="contact-fields" :disabled="isSubmitting">
        <legend class="sr-only">{{ $t('contact.message') }}</legend>
        <div class="contact-form__split">
          <div class="form-group">
            <label for="contact-name">{{ $t('contact.name') }}</label
            ><Input
              id="contact-name"
              v-model="form.name"
              autocomplete="name"
              maxlength="100"
              required
            />
          </div>
          <div class="form-group">
            <label for="contact-email">{{ $t('contact.email') }}</label
            ><Input
              id="contact-email"
              v-model="form.email"
              type="email"
              autocomplete="email"
              required
            />
          </div>
        </div>
        <div class="form-group">
          <label for="contact-subject">{{ $t('contact.subject') }}</label
          ><Input id="contact-subject" v-model="form.subject" maxlength="200" required />
        </div>
        <div class="form-group">
          <label for="contact-message">{{ $t('contact.message') }}</label
          ><Textarea
            id="contact-message"
            v-model="form.message"
            :rows="7"
            maxlength="10000"
            required
          />
        </div>
        <p v-if="error" class="contact-result contact-result--error" role="alert">{{ error }}</p>
        <p v-else-if="submitted" class="contact-result" role="status">
          {{ $t('contact.success') }}
        </p>
        <div class="contact-submit">
          <Button type="submit" :loading="isSubmitting" :disabled="isSubmitting"
            >{{ isSubmitting ? $t('contact.sending') : $t('contact.send')
            }}<ArrowUpRight :size="18"
          /></Button>
        </div>
      </fieldset>
    </form>
    <aside class="contact-private-note">
      <div>
        <h2>{{ $t('contact.privateTitle') }}</h2>
        <p>{{ $t('contact.privateBody') }}</p>
      </div>
      <a href="/.well-known/security.txt" class="page-inline-cta"
        >{{ $t('contact.privateAction') }} ↗</a
      >
    </aside>
  </div>
</template>
<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowUpRight, Check } from '@lucide/vue'
import { contactService } from '@/api/contactService'
import { PageHeroShell } from '@/components/appearance'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Textarea from '@/components/ui/Textarea.vue'
const { t } = useI18n()
const selectedTopic = ref('general')
const topics = computed(() => [
  { value: 'general', label: t('contact.topicGeneral') },
  { value: 'bug', label: t('contact.topicIssue') },
  { value: 'feature', label: t('contact.topicSuggestion') },
  { value: 'other', label: t('contact.topicOther') },
])
const form = reactive({ name: '', email: '', subject: '', message: '' })
const isSubmitting = ref(false),
  submitted = ref(false),
  error = ref('')
async function handleSubmit() {
  if (isSubmitting.value) return
  isSubmitting.value = true
  submitted.value = false
  error.value = ''
  try {
    const topic = topics.value.find((item) => item.value === selectedTopic.value)?.label || ''
    const response = await contactService.sendMessage({
      ...form,
      subject: topic + '｜' + form.subject,
    })
    if (!response.success) throw new Error('Contact submission failed')
    submitted.value = true
    Object.assign(form, { name: '', email: '', subject: '', message: '' })
  } catch {
    error.value = t('contact.error')
  } finally {
    isSubmitting.value = false
  }
}
</script>
