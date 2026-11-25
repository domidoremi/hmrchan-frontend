import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { nextTick } from 'vue'
import Uploader from '../SketchDropUploader.vue'
import type { UploadQueueItem } from '@/types'

type Upload = (file: File, signal: AbortSignal) => Promise<{ id: string }>
const png = (name: string) => new File(['image'], name + '.png', { type: 'image/png' })
const live: (() => void)[] = []
beforeEach(() => {
  vi.stubGlobal(
    'URL',
    class extends URL {
      static override createObjectURL = () => 'blob:owned'
      static override revokeObjectURL = vi.fn()
    }
  )
})
afterEach(() => {
  for (const unmount of live.splice(0)) unmount()
  vi.unstubAllGlobals()
})

function mountUploader(uploadFn?: Upload) {
  let queue: UploadQueueItem[] = []
  const wrapper = mount(Uploader, {
    props: {
      title: '',
      description: '',
      selectLabel: 'Select',
      autoUpload: Boolean(uploadFn),
      uploadFn,
      onQueueChange: (items: UploadQueueItem[]) => {
        queue = items
      },
    },
    global: {
      plugins: [
        createI18n({ legacy: false, locale: 'en', missingWarn: false, fallbackWarn: false }),
      ],
    },
  })
  live.push(() => wrapper.unmount())
  async function select(...files: File[]) {
    const input = wrapper.get('input[type=file]')
    Object.defineProperty(input.element, 'files', { configurable: true, value: files })
    await input.trigger('change')
    await flushPromises()
  }
  return { wrapper, select, queue: () => queue }
}

it('keeps the IDs of two concurrent uploads when the second finishes first', async () => {
  const a = Promise.withResolvers<{ id: string }>(),
    b = Promise.withResolvers<{ id: string }>()
  const upload = vi.fn<Upload>().mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise)
  const app = mountUploader(upload)
  await app.select(png('first'), png('second'))
  expect(upload).toHaveBeenCalledTimes(2)
  b.resolve({ id: 'second' })
  await flushPromises()
  a.resolve({ id: 'first' })
  await flushPromises()
  expect(app.queue().map((i) => [i.status, i.remoteId])).toEqual([
    ['success', 'first'],
    ['success', 'second'],
  ])
  expect(
    app.wrapper.emitted('uploaded')?.map(([item]) => (item as UploadQueueItem).remoteId)
  ).toEqual(['second', 'first'])
})

it('retries a failed file and ignores a late completion for a canceled file', async () => {
  const late = Promise.withResolvers<{ id: string }>()
  const upload = vi
    .fn<Upload>()
    .mockRejectedValueOnce(new Error('offline'))
    .mockReturnValueOnce(late.promise)
    .mockResolvedValueOnce({ id: 'recovered' })
  const app = mountUploader(upload)
  await app.select(png('retry'), png('cancel'))
  await app.wrapper.get('li.is-error button').trigger('click')
  await app.wrapper.get('li.is-uploading button').trigger('click')
  expect(upload.mock.calls[1]![1].aborted).toBe(true)
  late.resolve({ id: 'late' })
  await flushPromises()
  expect(app.queue().map((i) => [i.status, i.remoteId])).toEqual([
    ['success', 'recovered'],
    ['canceled', null],
  ])
})

it('returns the selected avatar file and clears its local preview without uploading', async () => {
  const app = mountUploader()
  const file = png('crop')
  await app.select(file)
  expect((app.wrapper.emitted('selected')?.[0]?.[0] as UploadQueueItem[])[0]?.file).toBe(file)
  expect(app.queue()[0]?.status).toBe('ready')
  app.wrapper.vm.clear()
  await nextTick()
  expect(app.queue()).toEqual([])
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:owned')
})
