import { computed, effectScope, nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { sourceGroups, timelineGroups, usePostSelection } from '../presentation'
import type { JournalPost } from '../models'
vi.mock('../models', () => ({ platforms: { x: 'X', instagram: 'Instagram' } }))
const post = (id: string, title = id, platform = 'x'): JournalPost => ({
  id,
  title,
  text: '',
  image: null,
  author: '',
  authorId: null,
  avatar: '',
  time: '',
  likes: null,
  platform,
  type: '文字',
  tags: [],
})
describe('live presentation selection', () => {
  it('updates the complete selected object when the backend replaces data for the same id', async () => {
    const scope = effectScope(),
      posts = ref([post('one'), post('two')])
    const selection = scope.run(() => usePostSelection(computed(() => posts.value)))!
    selection.step(1)
    posts.value = [
      {
        ...post('two', 'Updated title', 'instagram'),
        image: '/new-image.jpg',
        author: 'New author',
      },
    ]
    await nextTick()
    expect(selection.selected.value).toMatchObject({
      id: 'two',
      title: 'Updated title',
      author: 'New author',
      image: '/new-image.jpg',
    })
    expect(selection.index.value).toBe(0)
    scope.stop()
  })
  it('drops stale ids on filtering, handles empty data and resumes when new data arrives', async () => {
    const scope = effectScope(),
      posts = ref([post('one'), post('two')])
    const selection = scope.run(() => usePostSelection(computed(() => posts.value)))!
    selection.step(-1)
    expect(selection.selectedId.value).toBe('two')
    posts.value = [post('three')]
    await nextTick()
    expect(selection.selectedId.value).toBe('three')
    selection.step(1)
    expect(selection.selectedId.value).toBe('three')
    posts.value = []
    await nextTick()
    selection.step(1)
    expect(selection.selectedId.value).toBe('')
    expect(selection.selected.value).toBeUndefined()
    posts.value = [post('four')]
    await nextTick()
    expect(selection.selected.value?.id).toBe('four')
    scope.stop()
  })
  it('derives counts and unknown source labels entirely from the returned posts', () => {
    expect(sourceGroups([post('one'), post('two'), post('three', 'third', 'new-source')])).toEqual([
      { key: 'x', label: 'X', count: 2 },
      { key: 'new-source', label: 'new-source', count: 1 },
    ])
    expect(sourceGroups([])).toEqual([])
  })
  it('groups the actual publication date in Taipei time and never invents dates', () => {
    const groups = timelineGroups([
      { ...post('one'), publishedAt: '2026-11-08T20:30:00Z' },
      { ...post('two'), publishedAt: '2026-11-09T01:00:00Z' },
      post('three'),
    ])
    expect(groups).toHaveLength(2)
    expect(groups[0]?.items.map((item) => item.id)).toEqual(['one', 'two'])
    expect(groups[1]?.label).toBe('动态')
  })
})
