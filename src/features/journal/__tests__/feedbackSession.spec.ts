import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia'
import { defineComponent, h, onBeforeUnmount, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetPrivateSessionState } from '@/services/privateSessionState'
import { useToastStore } from '@/stores/toast'
import { createJournalFeedbackAdapter, useJournalFeedbackScope } from '../feedback'

let pinia: Pinia
let wrapper: VueWrapper | undefined

beforeEach(() => {
  vi.useFakeTimers()
  pinia = createPinia()
  setActivePinia(pinia)
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  disposePinia(pinia)
  vi.useRealTimers()
})

function mountFeedback(principal?: string) {
  const identity = ref<string | undefined>(principal)
  const store = useToastStore()
  const feedback = createJournalFeedbackAdapter(store)
  let capture!: () => () => boolean
  wrapper = mount(
    defineComponent({
      setup() {
        capture = useJournalFeedbackScope(() => identity.value, feedback).capture
        onBeforeUnmount(() => feedback.dispose())
        return () => h('div')
      },
    }),
    { global: { plugins: [pinia] } }
  )
  return { identity, store, feedback, capture }
}

describe('期刊消息的会话边界', () => {
  it('访客初始化保留失焦期间的提醒队列，同时使旧异步操作失效', () => {
    const { store, feedback, capture } = mountFeedback()
    const action = vi.fn()
    const operation = capture()
    feedback.show('已记下', { label: '查看', run: action })
    for (let index = 0; index < 4; index++) feedback.show(`后续提醒 ${index}`)
    const ids = store.toasts.map((toast) => toast.id)
    store.setVisibleToasts([ids[0]!])
    store.setPageHidden(true)
    store.setWindowFocused(false)

    resetPrivateSessionState()
    resetPrivateSessionState()
    vi.advanceTimersByTime(8000)

    expect(operation()).toBe(false)
    expect(store.toasts.map((toast) => toast.id)).toEqual(ids)
    expect(store.timings.get(ids[0]!)?.paused).toBe(true)
    store.toasts[0]!.action!.onClick()
    expect(action).toHaveBeenCalledOnce()
  })

  it('访客登录后清除原提醒及其动作', () => {
    const { identity, store, feedback } = mountFeedback()
    const action = vi.fn()
    feedback.show('访客提醒', { label: '查看', run: action })
    const previousAction = store.toasts[0]!.action!
    resetPrivateSessionState()
    expect(store.toasts).toHaveLength(1)

    identity.value = 'account-a'

    expect(store.toasts).toHaveLength(0)
    previousAction.onClick()
    expect(action).not.toHaveBeenCalled()
    feedback.show('账号提醒')
    expect(store.toasts.map((toast) => toast.message)).toEqual(['账号提醒'])
  })

  it('退出时在用户快照更新之前清除账号消息，重新登录也不恢复旧动作', () => {
    const { identity, store, feedback, capture } = mountFeedback('account-a')
    const action = vi.fn()
    const operation = capture()
    feedback.show('账号消息', { label: '重试', run: action })
    const previousAction = store.toasts[0]!.action!

    resetPrivateSessionState()
    expect(store.toasts).toHaveLength(0)
    expect(operation()).toBe(false)
    identity.value = undefined
    identity.value = 'account-a'
    feedback.show('新会话消息')
    previousAction.onClick()

    expect(action).not.toHaveBeenCalled()
    expect(store.toasts.map((toast) => toast.message)).toEqual(['新会话消息'])
  })

  it('账号直接切换时移除之前的消息和待执行动作', () => {
    const { identity, store, feedback } = mountFeedback('account-a')
    const action = vi.fn()
    feedback.show('甲账号消息', { label: '撤销', run: action })
    const previousAction = store.toasts[0]!.action!

    identity.value = 'account-b'
    previousAction.onClick()

    expect(store.toasts).toHaveLength(0)
    expect(action).not.toHaveBeenCalled()
  })

  it('期刊所有者卸载后移除访客提示并禁用其动作', () => {
    const { store, feedback } = mountFeedback()
    const action = vi.fn()
    feedback.show('访客提醒', { label: '查看', run: action })
    const previousAction = store.toasts[0]!.action!

    wrapper!.unmount()
    wrapper = undefined
    previousAction.onClick()
    feedback.show('卸载后的提示')

    expect(store.toasts).toHaveLength(0)
    expect(action).not.toHaveBeenCalled()
  })
})
