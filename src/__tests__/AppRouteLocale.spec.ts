import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { defineComponent, h, nextTick, onBeforeUnmount, onMounted, ref, type Component } from 'vue'
import { createI18n, useI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App.vue'
import ContactPage from '@/views/ContactPage.vue'
import { getLocaleConfig } from '@/config/locale'
import en from '@/i18n/locales/en.json'
import ja from '@/i18n/locales/ja.json'
import zhCN from '@/i18n/locales/zh-CN.json'
import zhTW from '@/i18n/locales/zh-TW.json'

// Keep the actual App RouterView / Suspense / KeepAlive and locale composable.
// Only unrelated global appearance, preference synchronization, and auth surfaces
// are isolated; no route component, Router, I18n, Input, or Textarea is stubbed.
const mocks = vi.hoisted(() => ({ sendMessage: vi.fn() }))
vi.mock('@/api/contactService', () => ({
  contactService: { sendMessage: mocks.sendMessage },
}))
vi.mock('@/stores', async () => {
  const { defineStore } = await import('pinia')
  return {
    useSettingsStore: defineStore('app-route-locale-test-settings', {
      state: () => ({
        settings: { enableAnimations: true, animationIntensity: 'normal' },
      }),
    }),
  }
})
vi.mock('@/composables/useAppearanceRuntime', async () => {
  const { ref } = await import('vue')
  return {
    useAppearanceRuntime: () => ({
      activePreset: ref('paper'),
      routeSceneRole: ref('content'),
      resolvedColorMode: ref('light'),
      motionMode: ref('normal'),
    }),
  }
})
vi.mock('@/composables/usePreferencesSync', () => ({
  usePreferencesSync: () => undefined,
}))
vi.mock('@/api/clientChallengeBridge', async () => {
  const { ref } = await import('vue')
  return { clientChallengeState: { isOpen: ref(false) } }
})
vi.mock('@/api/verificationState', async () => {
  const { ref } = await import('vue')
  return { verificationDialogState: { isOpen: ref(false), currentRequest: ref(null) } }
})
vi.mock('@/features/journal/JournalShell.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    __esModule: true,
    default: defineComponent({
      name: 'JournalShell',
      setup(_, { slots }) {
        return () => h('main', { id: 'main-content' }, slots.default?.())
      },
    }),
  }
})
vi.mock('@/components/ui/ErrorBoundary.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    __esModule: true,
    default: defineComponent({
      name: 'ErrorBoundary',
      emits: ['retry'],
      setup(_, { slots }) {
        return () => slots.default?.()
      },
    }),
  }
})
vi.mock('@/components/ui/ToastContainer.vue', () => ({
  __esModule: true,
  default: { name: 'ToastContainer', render: () => null },
}))
vi.mock('@/components/ui/PageLoading.vue', () => ({
  __esModule: true,
  default: { name: 'PageLoading', render: () => null },
}))
// Import the actual hero without evaluating unrelated barrel exports.
vi.mock('@/components/appearance', async () => ({
  PageHeroShell: (await import('@/components/appearance/PageHeroShell.vue')).default,
}))

type TestLocale = 'en' | 'ja' | 'zh-CN' | 'zh-TW'
const localeSequence: TestLocale[] = ['zh-CN', 'zh-TW', 'en', 'ja']
const wrappers: VueWrapper[] = []
let originalRootAttributes: Array<[string, string]> = []

beforeEach(() => {
  mocks.sendMessage.mockReset()
  originalRootAttributes = [...document.documentElement.attributes].map((attribute) => [
    attribute.name,
    attribute.value,
  ])
})
afterEach(async () => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  await flushPromises()
  document.body.replaceChildren()
  for (const attribute of [...document.documentElement.attributes]) {
    document.documentElement.removeAttribute(attribute.name)
  }
  for (const [name, value] of originalRootAttributes) {
    document.documentElement.setAttribute(name, value)
  }
})

const AwayPage = defineComponent({
  name: 'AppLocaleAwayPage',
  setup: () => () => h('div', { 'data-testid': 'away-page' }, 'Away'),
})

async function mountApp(routes: RouteRecordRaw[], initialPath = '/') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      ...routes,
      ...['/away', '/community']
        .filter((path) => !routes.some((route) => route.path === path))
        .map((path) => ({ path, component: AwayPage })),
    ],
  })
  await router.push(initialPath)
  await router.isReady()
  const i18n = createI18n({
    legacy: false,
    locale: 'en',
    fallbackLocale: 'en',
    messages: { en, ja, 'zh-CN': zhCN, 'zh-TW': zhTW },
  })
  const wrapper = mount(App, {
    attachTo: document.body,
    global: { plugins: [createPinia(), router, i18n] },
  })
  wrappers.push(wrapper)
  await flushPromises()
  await nextTick()
  return { wrapper, router, i18n }
}

async function navigate(router: Awaited<ReturnType<typeof mountApp>>['router'], path: string) {
  await router.push(path)
  await flushPromises()
  await nextTick()
}

async function changeLocale(context: Awaited<ReturnType<typeof mountApp>>, locale: TestLocale) {
  context.i18n.global.locale.value = locale
  await nextTick()
  await flushPromises()
  const config = getLocaleConfig(locale)
  expect(context.wrapper.attributes('data-locale')).toBe(locale)
  expect(context.wrapper.attributes('data-locale-density')).toBe(config.layout.density)
  expect(context.wrapper.attributes('data-locale-animation')).toBe(
    config.interaction.animationStyle
  )
  expect(document.documentElement.getAttribute('data-locale')).toBe(locale)
  expect(document.documentElement.style.getPropertyValue('--locale-accent')).toBe(
    config.colors.accent
  )
  expect(context.wrapper.get('.skip-link').text()).toBe(
    context.i18n.global.t('common.skipToContent')
  )
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((finish, fail) => {
    resolve = finish
    reject = fail
  })
  return { promise, resolve, reject }
}

// This is a controlled routed component named JournalPage, not the product
// JournalPage. It tests the actual App exclusion policy and observable lifecycle,
// draft, and cancellable request ownership. It is not browser or API evidence.
function requestPage(name = 'JournalPage') {
  const mounts = vi.fn()
  const unmounts = vi.fn()
  const aborts = vi.fn()
  const operations: Array<ReturnType<typeof deferred<string>> & { signal: AbortSignal }> = []
  const request = vi.fn((signal: AbortSignal) => {
    const operation = { ...deferred<string>(), signal }
    operations.push(operation)
    signal.addEventListener(
      'abort',
      () => {
        aborts()
        operation.reject(new DOMException('Route disposed', 'AbortError'))
      },
      { once: true }
    )
    return operation.promise
  })
  const component = defineComponent({
    name,
    setup() {
      const { t } = useI18n({ useScope: 'global' })
      const draft = ref('')
      const status = ref('pending')
      const controller = new AbortController()
      let alive = true
      let pending = true
      onMounted(() => {
        mounts()
        void request(controller.signal)
          .then((value) => {
            if (alive) status.value = value
          })
          .catch(() => {
            if (alive) status.value = 'failed'
          })
          .finally(() => {
            pending = false
          })
      })
      onBeforeUnmount(() => {
        alive = false
        unmounts()
        if (pending) controller.abort()
      })
      return () =>
        h('section', { 'data-testid': 'draft-page' }, [
          h('label', { for: 'route-draft' }, t('contact.message')),
          h('textarea', {
            id: 'route-draft',
            value: draft.value,
            onInput: (event: Event) => {
              draft.value = (event.target as HTMLTextAreaElement).value
            },
          }),
          h('p', { 'data-testid': 'request-state' }, status.value),
        ])
    },
  })
  return { component, mounts, unmounts, aborts, request, operations }
}

function route(path: string, component: Component, viewKey?: string): RouteRecordRaw {
  return { path, component, ...(viewKey === undefined ? {} : { meta: { viewKey } }) }
}

const contactDraft = {
  name: 'Reader 日本語',
  email: 'reader@example.invalid',
  subject: '原稿 / image issue',
  message: '保留这段草稿\nKeep this exact draft.',
}
async function fillContact(wrapper: VueWrapper) {
  await wrapper.get('#contact-name').setValue(contactDraft.name)
  await wrapper.get('#contact-email').setValue(contactDraft.email)
  await wrapper.get('#contact-subject').setValue(contactDraft.subject)
  await wrapper.get('#contact-message').setValue(contactDraft.message)
  await wrapper.get('input[value="bug"]').setValue(true)
}
function expectContactDraft(wrapper: VueWrapper) {
  for (const [field, value] of Object.entries(contactDraft)) {
    expect(
      wrapper.get<HTMLInputElement | HTMLTextAreaElement>(`#contact-${field}`).element.value
    ).toBe(value)
  }
  expect(wrapper.get<HTMLInputElement>('input[value="bug"]').element.checked).toBe(true)
}

describe('App route instance language changes', () => {
  it('retains the actual ContactPage draft, component, DOM, focus, and caret in four languages', async () => {
    const context = await mountApp([route('/contact', ContactPage)], '/contact')
    await fillContact(context.wrapper)
    const page = context.wrapper.getComponent(ContactPage).vm.$.uid
    const form = context.wrapper.get('.contact-workflow').element
    const message = context.wrapper.get<HTMLTextAreaElement>('#contact-message').element
    const topic = context.wrapper.get<HTMLInputElement>('input[value="bug"]').element
    message.focus()
    message.setSelectionRange(3, 11, 'backward')
    for (const locale of localeSequence) {
      await changeLocale(context, locale)
      expect(context.wrapper.getComponent(ContactPage).vm.$.uid).toBe(page)
      expect(context.wrapper.get('.contact-workflow').element).toBe(form)
      expect(context.wrapper.get('#contact-message').element).toBe(message)
      expect(context.wrapper.get('input[value="bug"]').element).toBe(topic)
      expectContactDraft(context.wrapper)
      expect(document.activeElement).toBe(message)
      expect(message.selectionStart).toBe(3)
      expect(message.selectionEnd).toBe(11)
      expect(message.selectionDirection).toBe('backward')
      expect(context.wrapper.get('label[for="contact-message"]').text()).toBe(
        context.i18n.global.t('contact.message')
      )
      expect(context.wrapper.get('.contact-choice.is-selected span').text()).toBe(
        context.i18n.global.t('contact.topicIssue')
      )
      expect(context.router.currentRoute.value.fullPath).toBe('/contact')
      expect(mocks.sendMessage).not.toHaveBeenCalled()
    }
  })

  it('keeps the actual ContactPage pending submission and its late result owned by the same form', async () => {
    const pending = deferred<{ success: boolean }>()
    mocks.sendMessage.mockReturnValue(pending.promise)
    const context = await mountApp([route('/contact', ContactPage)], '/contact')
    await fillContact(context.wrapper)
    const page = context.wrapper.getComponent(ContactPage).vm.$.uid
    const form = context.wrapper.get('.contact-workflow').element
    const message = context.wrapper.get<HTMLTextAreaElement>('#contact-message').element
    const submit = context.wrapper.get<HTMLButtonElement>('button[type="submit"]').element
    message.setSelectionRange(2, 9)
    await context.wrapper.get('form').trigger('submit')
    const focusWhilePending = document.activeElement
    const payload = mocks.sendMessage.mock.calls[0]?.[0]
    expect(payload).toEqual({
      ...contactDraft,
      subject: context.i18n.global.t('contact.topicIssue') + '｜' + contactDraft.subject,
    })
    for (const locale of localeSequence) {
      await changeLocale(context, locale)
      expect(context.wrapper.getComponent(ContactPage).vm.$.uid).toBe(page)
      expect(context.wrapper.get('.contact-workflow').element).toBe(form)
      expect(context.wrapper.get('#contact-message').element).toBe(message)
      expect(context.wrapper.get('button[type="submit"]').element).toBe(submit)
      expectContactDraft(context.wrapper)
      expect(message.selectionStart).toBe(2)
      expect(message.selectionEnd).toBe(9)
      expect(document.activeElement).toBe(focusWhilePending)
      expect(submit.disabled).toBe(true)
      expect(submit.textContent).toContain(context.i18n.global.t('contact.sending'))
      await context.wrapper.get('form').trigger('submit')
      expect(mocks.sendMessage).toHaveBeenCalledTimes(1)
      expect(mocks.sendMessage.mock.calls[0]?.[0]).toBe(payload)
      expect(context.wrapper.find('[role="alert"]').exists()).toBe(false)
    }
    pending.reject(new Error('late unavailable response'))
    await flushPromises()
    expect(context.wrapper.getComponent(ContactPage).vm.$.uid).toBe(page)
    expectContactDraft(context.wrapper)
    expect(context.wrapper.get('[role="alert"]').text()).toBe(
      context.i18n.global.t('contact.error')
    )
    expect(submit.disabled).toBe(false)
    expect(mocks.sendMessage).toHaveBeenCalledTimes(1)
  })

  it('preserves a noncached JournalPage-named draft and cancellable pending request across locale changes', async () => {
    const page = requestPage()
    const context = await mountApp([route('/', page.component, 'home')])
    const instance = context.wrapper.getComponent(page.component).vm.$.uid
    const element = context.wrapper.get<HTMLTextAreaElement>('#route-draft').element
    const status = context.wrapper.get('[data-testid="request-state"]').element
    await context.wrapper.get('#route-draft').setValue('保留 pending 草稿 / same request')
    element.focus()
    element.setSelectionRange(4, 13, 'backward')
    const operation = page.operations[0]!
    for (const locale of localeSequence) {
      await changeLocale(context, locale)
      expect(context.wrapper.getComponent(page.component).vm.$.uid).toBe(instance)
      expect(context.wrapper.get('#route-draft').element).toBe(element)
      expect(context.wrapper.get('[data-testid="request-state"]').element).toBe(status)
      expect(element.value).toBe('保留 pending 草稿 / same request')
      expect(document.activeElement).toBe(element)
      expect(element.selectionStart).toBe(4)
      expect(element.selectionEnd).toBe(13)
      expect(element.selectionDirection).toBe('backward')
      expect(page.mounts).toHaveBeenCalledTimes(1)
      expect(page.unmounts).not.toHaveBeenCalled()
      expect(page.request).toHaveBeenCalledTimes(1)
      expect(page.aborts).not.toHaveBeenCalled()
      expect(operation.signal.aborted).toBe(false)
      expect(status.textContent).toBe('pending')
      expect(context.router.currentRoute.value.fullPath).toBe('/')
    }
    operation.resolve('completed')
    await flushPromises()
    expect(context.wrapper.getComponent(page.component).vm.$.uid).toBe(instance)
    expect(context.wrapper.get('[data-testid="request-state"]').element).toBe(status)
    expect(status.textContent).toBe('completed')
  })

  it('retains the same stable view across its URL, query, and hash changes', async () => {
    const page = requestPage()
    const context = await mountApp([
      route('/', page.component, 'home'),
      route('/home-overlay', page.component, 'home'),
    ])
    const instance = context.wrapper.getComponent(page.component).vm.$.uid
    const element = context.wrapper.get<HTMLTextAreaElement>('#route-draft').element
    await context.wrapper.get('#route-draft').setValue('same home view')
    for (const path of ['/?q=one#section', '/home-overlay?id=two', '/']) {
      await navigate(context.router, path)
      expect(context.wrapper.getComponent(page.component).vm.$.uid).toBe(instance)
      expect(context.wrapper.get('#route-draft').element).toBe(element)
      expect(element.value).toBe('same home view')
      expect(page.request).toHaveBeenCalledTimes(1)
      expect(page.unmounts).not.toHaveBeenCalled()
    }
  })

  it('switches instances when the same component moves to a different explicit viewKey', async () => {
    const page = requestPage()
    const context = await mountApp(
      [route('/one', page.component, 'one'), route('/two', page.component, 'two')],
      '/one'
    )
    const first = context.wrapper.getComponent(page.component).vm.$.uid
    await context.wrapper.get('#route-draft').setValue('first view')
    await navigate(context.router, '/two')
    expect(context.wrapper.getComponent(page.component).vm.$.uid).not.toBe(first)
    expect(context.wrapper.get<HTMLTextAreaElement>('#route-draft').element.value).toBe('')
    expect(context.router.currentRoute.value.fullPath).toBe('/two')
    expect(page.mounts).toHaveBeenCalledTimes(2)
    expect(page.unmounts).toHaveBeenCalledTimes(1)
    expect(page.aborts).toHaveBeenCalledTimes(1)
    expect(page.request).toHaveBeenCalledTimes(2)
  })

  it('preserves the first matched route path rule when only params, query, and hash change', async () => {
    const page = requestPage()
    const context = await mountApp([route('/draft/:id', page.component)], '/draft/one')
    const instance = context.wrapper.getComponent(page.component).vm.$.uid
    await context.wrapper.get('#route-draft').setValue('matched route draft')
    await navigate(context.router, '/draft/two?tab=notes#message')
    expect(context.wrapper.getComponent(page.component).vm.$.uid).toBe(instance)
    expect(context.wrapper.get<HTMLTextAreaElement>('#route-draft').element.value).toBe(
      'matched route draft'
    )
    expect(context.router.currentRoute.value.params.id).toBe('two')
    expect(page.request).toHaveBeenCalledTimes(1)
    expect(page.aborts).not.toHaveBeenCalled()
  })

  it('switches instances on a different matched path without an explicit viewKey', async () => {
    const page = requestPage()
    const context = await mountApp(
      [route('/first', page.component), route('/second', page.component)],
      '/first'
    )
    const first = context.wrapper.getComponent(page.component).vm.$.uid
    await context.wrapper.get('#route-draft').setValue('first route')
    await navigate(context.router, '/second')
    expect(context.wrapper.getComponent(page.component).vm.$.uid).not.toBe(first)
    expect(context.wrapper.get<HTMLTextAreaElement>('#route-draft').element.value).toBe('')
    expect(page.mounts).toHaveBeenCalledTimes(2)
    expect(page.unmounts).toHaveBeenCalledTimes(1)
    expect(page.aborts).toHaveBeenCalledTimes(1)
  })

  it('reactivates a cacheable public page with its draft after language changes while away', async () => {
    const page = requestPage('AppLocaleCachedPublicPage')
    const context = await mountApp([route('/', page.component)])
    const first = context.wrapper.getComponent(page.component).vm.$.uid
    await context.wrapper.get('#route-draft').setValue('cached public draft')
    await navigate(context.router, '/away')
    await changeLocale(context, 'ja')
    await navigate(context.router, '/')
    expect(context.wrapper.getComponent(page.component).vm.$.uid).toBe(first)
    expect(context.wrapper.get<HTMLTextAreaElement>('#route-draft').element.value).toBe(
      'cached public draft'
    )
    expect(page.mounts).toHaveBeenCalledTimes(1)
    expect(page.unmounts).not.toHaveBeenCalled()
    expect(page.request).toHaveBeenCalledTimes(1)
    expect(page.aborts).not.toHaveBeenCalled()
  })

  it.each([
    'AuthCallbackPage',
    'LoginPage',
    'RegisterPage',
    'ResetPasswordPage',
    'ForgotPasswordPage',
    'VerifyEmailPage',
    'PasskeyRecoveryPage',
    'PasskeyRecoveryStatusPage',
    'JournalPage',
    'CommunityLayout',
    'ProfileLayout',
  ])('keeps the existing %s cache exclusion on a genuine route leave', async (name) => {
    const page = requestPage(name)
    const context = await mountApp([route('/', page.component)])
    const first = context.wrapper.getComponent(page.component).vm.$.uid
    await context.wrapper.get('#route-draft').setValue('excluded page draft')
    await navigate(context.router, '/away')
    expect(page.unmounts).toHaveBeenCalledTimes(1)
    expect(page.aborts).toHaveBeenCalledTimes(1)
    await navigate(context.router, '/')
    expect(context.wrapper.getComponent(page.component).vm.$.uid).not.toBe(first)
    expect(context.wrapper.get<HTMLTextAreaElement>('#route-draft').element.value).toBe('')
    expect(page.mounts).toHaveBeenCalledTimes(2)
    expect(page.request).toHaveBeenCalledTimes(2)
  })
})
