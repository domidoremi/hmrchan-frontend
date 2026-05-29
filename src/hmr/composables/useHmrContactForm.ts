import { reactive, ref } from 'vue'

import {
  loadSupportContentResource,
  seedCommunity,
  submitContactResource,
  type HmrSupportContent,
} from '@/api/hmrContent'
import { useHmrPublicContentResource } from '@/hmr/composables/useHmrPublicContentResource'

export interface HmrContactFormFields {
  name: string
  email: string
  message: string
  topic: string
}

export interface HmrContactSubmitResult {
  delivered: boolean
}

export interface HmrContactFormOptions {
  onDelivered?: () => Promise<void> | void
}

const SUPPORT_CONTENT_PATHS = ['/contact/send', '/feedback']
const CONTACT_SUBMIT_FAILURE = '提交失败，请稍后重试。'

function createEmptyForm(): HmrContactFormFields {
  return {
    name: '',
    email: '',
    message: '',
    topic: '',
  }
}

export function useHmrContactForm(options: HmrContactFormOptions = {}) {
  const form = reactive<HmrContactFormFields>(createEmptyForm())
  const submitting = ref(false)
  const sent = ref(false)
  const submitError = ref('')
  const supportResource = useHmrPublicContentResource<HmrSupportContent>({
    initialData: {
      faqs: seedCommunity,
      flows: seedCommunity,
    },
    paths: SUPPORT_CONTENT_PATHS,
    cacheKey: 'hmr:support',
    scope: 'support',
    loader: loadSupportContentResource,
  })

  async function refreshSupport(): Promise<void> {
    await supportResource.refresh()
  }

  async function submit(): Promise<HmrContactSubmitResult> {
    submitting.value = true
    submitError.value = ''

    try {
      const resource = await submitContactResource({ ...form })
      if (!resource.data.delivered) {
        submitError.value = resource.error?.message ?? CONTACT_SUBMIT_FAILURE
        return { delivered: false }
      }

      sent.value = true
      await options.onDelivered?.()
      return { delivered: true }
    } catch (error) {
      submitError.value = error instanceof Error ? error.message : CONTACT_SUBMIT_FAILURE
      return { delivered: false }
    } finally {
      submitting.value = false
    }
  }

  return {
    form,
    sent,
    submit,
    submitError,
    submitting,
    support: supportResource.content,
    supportPageState: supportResource.pageState,
    supportResource: supportResource.resource,
    refreshSupport,
  }
}
