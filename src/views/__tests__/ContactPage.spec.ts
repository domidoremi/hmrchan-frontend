import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import messages from '@/i18n/locales/zh-CN.json'
import ContactPage from '../ContactPage.vue'

const mocks = vi.hoisted(() => ({ sendMessage: vi.fn() }))
vi.mock('@/api/contactService', () => ({ contactService: { sendMessage: mocks.sendMessage } }))
const setup = () =>
  mount(ContactPage, {
    global: {
      plugins: [createI18n({ legacy: false, locale: 'zh-CN', messages: { 'zh-CN': messages } })],
      stubs: { RouterLink: RouterLinkStub },
    },
  })
async function fill(wrapper: ReturnType<typeof setup>) {
  await wrapper.get('#contact-name').setValue('Test reader')
  await wrapper.get('#contact-email').setValue('reader@example.invalid')
  await wrapper.get('#contact-subject').setValue('Image display')
  await wrapper.get('#contact-message').setValue('A photo does not load.')
  await wrapper.get('input[value="bug"]').setValue(true)
}
beforeEach(() => vi.clearAllMocks())
describe('ContactPage', () => {
  it('submits the selected category and message, then confirms success', async () => {
    mocks.sendMessage.mockResolvedValue({ success: true })
    const wrapper = setup()
    await fill(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.sendMessage).toHaveBeenCalledWith({
      name: 'Test reader',
      email: 'reader@example.invalid',
      subject: '问题反馈｜Image display',
      message: 'A photo does not load.',
    })
    expect(wrapper.get('[role="status"]').text()).toBe(messages.contact.success)
    expect((wrapper.get('#contact-message').element as HTMLTextAreaElement).value).toBe('')
    wrapper.unmount()
  })
  it('retains the message and exposes a retryable error when submission fails', async () => {
    mocks.sendMessage.mockRejectedValue(new Error('unavailable'))
    const wrapper = setup()
    await fill(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toBe(messages.contact.error)
    expect((wrapper.get('#contact-message').element as HTMLTextAreaElement).value).toBe(
      'A photo does not load.'
    )
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    wrapper.unmount()
  })
  it('keeps the message when the server declines submission', async () => {
    mocks.sendMessage.mockResolvedValue({ success: false })
    const wrapper = setup()
    await fill(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    expect(wrapper.get('[role="alert"]').text()).toBe(messages.contact.error)
    expect((wrapper.get('#contact-message').element as HTMLTextAreaElement).value).toBe(
      'A photo does not load.'
    )
    wrapper.unmount()
  })
  it('prevents duplicate requests while a submission is pending', async () => {
    let finish: ((value: { success: boolean }) => void) | undefined
    mocks.sendMessage.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    const wrapper = setup()
    await fill(wrapper)
    await wrapper.get('form').trigger('submit')
    await wrapper.get('form').trigger('submit')
    expect(mocks.sendMessage).toHaveBeenCalledTimes(1)
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    finish?.({ success: true })
    await flushPromises()
    wrapper.unmount()
  })
})
