import { RouterLinkStub, shallowMount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  sendMessage: vi.fn(),
  submitFeedback: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('@/stores', () => ({
  useToastStore: () => ({
    success: mocks.toastSuccess,
    error: mocks.toastError,
  }),
}))

vi.mock('@/api/contactService', () => ({
  contactService: {
    sendMessage: mocks.sendMessage,
  },
}))

vi.mock('@/api/feedbackService', () => ({
  feedbackService: {
    submit: mocks.submitFeedback,
  },
}))

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  missingWarn: false,
  fallbackWarn: false,
  messages: {
    en: {
      nav: {
        community: 'Community',
        about: 'About',
      },
      contact: {
        title: 'Contact Us',
        subtitle: 'We would love to hear from you',
        name: 'Your Name',
        email: 'Your Email',
        subject: 'Subject',
        message: 'Message',
        send: 'Send Message',
        sending: 'Sending...',
        success: 'Message sent successfully!',
        error: 'Failed to send message',
        feedbackTitle: 'Product Feedback',
        feedbackSubtitle: 'Share bugs, ideas, and anything we should improve.',
        feedbackCategory: 'Feedback Type',
        feedbackCategoryGeneral: 'General',
        feedbackCategoryBug: 'Bug',
        feedbackCategoryFeature: 'Feature',
        feedbackCategoryOther: 'Other',
        feedbackContact: 'Contact Info (Optional)',
        feedbackMessage: 'Feedback',
        feedbackSend: 'Send Feedback',
        feedbackSending: 'Submitting...',
        feedbackSuccess: 'Feedback submitted',
        feedbackError: 'Failed to submit feedback',
        securityTitle: 'Security Reporting',
        securitySubtitle: 'Share suspected vulnerabilities privately.',
        securityBody: 'Use this page for security reports that affect the public site.',
        securityAction: 'Open bug report form',
        securityTxtAction: 'View security.txt',
        securitySummaryScopeLabel: 'Best for',
        securitySummaryScopeValue: 'XSS and authentication bugs.',
        securitySummaryChannelLabel: 'Submission path',
        securitySummaryChannelValue: 'Use the bug feedback form below.',
        securitySummaryPreparationLabel: 'Include',
        securitySummaryPreparationValue: 'The affected URL and reproduction steps.',
        securityChecklistPrivate: 'Keep the report private.',
        securityChecklistScope: 'Test only accounts you control.',
        securityChecklistEvidence: 'Describe the smallest reliable reproduction path.',
      },
    },
  },
})

describe('ContactPage', () => {
  it('shows the security reporting section and primes bug feedback from the CTA', async () => {
    const { default: ContactPage } = await import('../ContactPage.vue')
    const wrapper = shallowMount(ContactPage, {
      global: {
        plugins: [i18n],
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
    })

    expect(wrapper.find('#security-reporting').exists()).toBe(true)
    expect(wrapper.find('a[href="/.well-known/security.txt"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Security Reporting')

    const securityAction = wrapper.find('a[href="#security-feedback-form"]')
    expect(securityAction.exists()).toBe(true)

    await securityAction.trigger('click')

    const bugCategoryButton = wrapper
      .findAll('.category-btn')
      .find((button) => button.text().includes('Bug'))

    expect(bugCategoryButton).toBeDefined()
    expect(bugCategoryButton?.classes()).toContain('active')
  })
})
