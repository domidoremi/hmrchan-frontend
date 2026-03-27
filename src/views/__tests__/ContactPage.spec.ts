import { RouterLinkStub, shallowMount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  sendMessage: vi.fn(),
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
        directTitle: 'Direct Message',
        directSubtitle: 'Use this route for general contact and private context.',
        workflowTitle: 'Three-step submission flow',
        workflowSubtitle: 'Follow explanation, details, and submission in order.',
        stepExplain: 'Explain',
        stepDescribe: 'Describe',
        stepSubmit: 'Submit',
        nextStep: 'Next step',
        previousStep: 'Previous step',
        topicTitle: 'Start by choosing the topic',
        topicSubtitle: 'Pick the closest option so the message can be routed faster.',
        topicNote: 'Choose the closest option and we will sort it out on our side.',
        topicGeneral: 'General message',
        topicGeneralHint: 'For everyday contact.',
        topicIssue: 'Usage issue',
        topicIssueHint: 'For broken pages and similar issues.',
        topicSuggestion: 'Suggestion',
        topicSuggestionHint: 'For ideas and improvements.',
        topicOther: 'Other',
        topicOtherHint: 'Use this when nothing else fits.',
        heroSummaryTopicLabel: 'Topic first',
        heroSummaryTopicValue: 'Choose the topic early.',
        heroSummaryReplyLabel: 'Reply path',
        heroSummaryReplyValue: 'Leave a reachable email address.',
        heroSummaryClarityLabel: 'Clarity',
        heroSummaryClarityValue: 'Keep the subject and message clear.',
        detailTitle: 'Write the situation clearly',
        detailContextLabel: 'Context',
        detailContextValue: 'Describe what happened.',
        detailNeedLabel: 'Need',
        detailNeedValue: 'Describe what you need help with.',
        detailReplyLabel: 'Reply',
        detailReplyValue: 'Use an email address you can receive replies on.',
        sendTitle: 'Last step: send the message',
        sendSubtitle: 'You can send everything from one place.',
        topicBadgeLabel: 'Current topic',
        privateTitle: 'If this involves account safety or privacy',
        privateBody: 'Use the private reporting route instead.',
        privateAction: 'Open private reporting route',
        feedbackContact: 'Contact Info (Optional)',
        feedbackMessage: 'Feedback',
        feedbackSend: 'Send Feedback',
        feedbackSending: 'Submitting...',
        feedbackSuccess: 'Feedback submitted',
        feedbackError: 'Failed to submit feedback',
      },
    },
  },
})

describe('ContactPage', () => {
  it('uses a single contact flow with neutral workflow actions', async () => {
    const { default: ContactPage } = await import('../ContactPage.vue')
    const wrapper = shallowMount(ContactPage, {
      global: {
        plugins: [i18n],
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
    })

    expect(wrapper.find('#contact-step-topic').exists()).toBe(true)
    expect(wrapper.findAll('.contact-stepper__item')).toHaveLength(3)
    expect(wrapper.findAll('.contact-topic-card')).toHaveLength(4)
    expect(wrapper.text()).toContain('General message')

    const nextButton = wrapper.find('.contact-workflow__next')
    expect(nextButton.exists()).toBe(true)
    expect(nextButton.classes()).toContain('page-control-btn')

    const issueTopic = wrapper
      .findAll('.contact-topic-card')
      .find((button) => button.text().includes('Usage issue'))

    expect(issueTopic).toBeDefined()

    await issueTopic?.trigger('click')
    await nextButton.trigger('click')
    await wrapper.find('.contact-workflow__next').trigger('click')

    expect(wrapper.find('#contact-step-send').exists()).toBe(true)
    expect(wrapper.text()).toContain('Usage issue')
    expect(wrapper.findAll('.contact-stepper__item')[2]?.classes()).toContain('active')
    expect(wrapper.find('.contact-private-note').exists()).toBe(true)
  })
})
