import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import vClickOutside from '../clickOutside'

const wrappers: VueWrapper[] = []

function mountWithDirective(component: ReturnType<typeof defineComponent>) {
  const wrapper = mount(component, {
    attachTo: document.body,
    global: {
      directives: {
        'click-outside': vClickOutside,
      },
    },
  })

  wrappers.push(wrapper)
  return wrapper
}

afterEach(() => {
  while (wrappers.length > 0) {
    wrappers.pop()?.unmount()
  }

  document.body.innerHTML = ''
})

describe('v-click-outside', () => {
  it('calls the handler when clicking outside the bound element', async () => {
    const onOutside = vi.fn()

    const wrapper = mountWithDirective(
      defineComponent({
        setup() {
          return { onOutside }
        },
        template: `
          <div>
            <div class="panel" v-click-outside="onOutside">panel</div>
            <button type="button" class="outside">outside</button>
          </div>
        `,
      })
    )

    await wrapper.find('.outside').trigger('click')

    expect(onOutside).toHaveBeenCalledTimes(1)
  })

  it('ignores clicks inside included elements', async () => {
    const onOutside = vi.fn()

    const wrapper = mountWithDirective(
      defineComponent({
        setup() {
          const trigger = ref<HTMLElement | null>(null)
          return { onOutside, trigger }
        },
        template: `
          <div>
            <button ref="trigger" type="button" class="trigger">trigger</button>
            <div
              class="panel"
              v-click-outside="{ handler: onOutside, include: [trigger] }"
            >
              panel
            </div>
            <button type="button" class="outside">outside</button>
          </div>
        `,
      })
    )

    await wrapper.find('.panel').trigger('click')
    await wrapper.find('.trigger').trigger('click')

    expect(onOutside).not.toHaveBeenCalled()

    await wrapper.find('.outside').trigger('click')

    expect(onOutside).toHaveBeenCalledTimes(1)
  })

  it('detaches the listener when disabled', async () => {
    const onOutside = vi.fn()

    const wrapper = mountWithDirective(
      defineComponent({
        setup() {
          const enabled = ref(true)
          return { enabled, onOutside }
        },
        template: `
          <div>
            <div
              class="panel"
              v-click-outside="{ handler: onOutside, enabled }"
            >
              panel
            </div>
            <button type="button" class="outside">outside</button>
          </div>
        `,
      })
    )

    await wrapper.find('.outside').trigger('click')
    expect(onOutside).toHaveBeenCalledTimes(1)
    ;(wrapper.vm as { enabled: boolean }).enabled = false
    await nextTick()

    await wrapper.find('.outside').trigger('click')
    expect(onOutside).toHaveBeenCalledTimes(1)
  })
})
