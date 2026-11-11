import { createJournalTestI18n } from './journalTestI18n'
import { shallowMount } from '@vue/test-utils'
import { toRaw } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { FavoriteResponse } from '@/api/favoriteService'
import type { PostDetailResponse } from '@/api/postService'
import JournalPostCard from '../JournalPostCard.vue'
import { favoriteModel, type JournalPost } from '../models'

vi.mock('@/i18n', () => ({ default: { global: { t: (key: string) => key } } }))

const basePost: JournalPost = {
  id: '01a1b5a5-0c10-7d5d-9ba8-39318248b255',
  title: 'Original title',
  text: 'Original body',
  textOrigin: 'post',
  image: null,
  author: 'Sample author',
  authorId: '01a1b5a5-0c10-7d5d-9ba8-39318248b252',
  avatar: '/journal/mascot.webp',
  time: 'Today',
  likes: 0,
  platform: 'x',
  type: '文字',
  tags: [],
}

const baseDetail: PostDetailResponse = {
  id: basePost.id,
  platform: 'twitter',
  title: 'Original title',
  description: 'Original body',
  view_count: 0,
  like_count: 0,
  comment_count: 0,
  media_count: 0,
  created_at: '2026-11-07T12:00:00Z',
  external_links: [],
}
const baseFavorite: FavoriteResponse = {
  id: '01a1b5a5-0c10-7d5d-9ba8-39318248b251',
  post_id: basePost.id,
  created_at: baseDetail.created_at,
}

function render(post: JournalPost, saved = false) {
  return shallowMount(JournalPostCard, {
    props: { post, saved },
    global: {
      plugins: [createJournalTestI18n()],
      stubs: { JournalIcon: true, JournalImage: true },
    },
  })
}

describe('journal post card copy and controls', () => {
  it('keeps complete paragraphs, blank lines and the existing primary detail entry', () => {
    const middle = '完整正文🙂'.repeat(40)
    const text = `First paragraph\n\n${middle}\nLast paragraph`
    const post: JournalPost = {
      ...basePost,
      title: text.slice(0, 100),
      titleOrigin: 'fallback',
      text,
    }
    const wrapper = render(post)
    expect(wrapper.classes()).toContain('post-card--text')
    expect(wrapper.attributes('data-post')).toBe(post.id)
    expect(wrapper.get('.text-post').attributes('data-open')).toBe(post.id)
    expect(wrapper.get('.text-post p').element.textContent).toBe(
      `First paragraph${middle}Last paragraph`
    )
    expect(wrapper.get('.text-post p').findAll('br')).toHaveLength(3)
    expect(wrapper.find('.post-title').exists()).toBe(false)
    expect(wrapper.find('.post-media').exists()).toBe(false)
    wrapper.unmount()
  })

  it('preserves a short independent title and the author entry', () => {
    const post = { ...basePost, title: 'A real title', text: 'A real title\nMore body' }
    const wrapper = render(post)
    expect(wrapper.get('.post-title').text()).toBe(post.title)
    expect(wrapper.get('.post-title').attributes('data-open')).toBe(post.id)
    expect(wrapper.get('.post-author').attributes('data-author-id')).toBe(post.authorId)
    expect(wrapper.get('.post-author').attributes('data-author-query')).toBe(post.author)
    wrapper.unmount()
  })

  it('keeps fallback titles alongside complete notes through the real favorite model', () => {
    const notes = 'My note\n\nA separate personal thought'
    const post = favoriteModel({ ...baseFavorite, notes }, { ...baseDetail, title: undefined })
    const wrapper = render(post, true)
    expect(wrapper.get('.post-title').text()).toBe(baseDetail.description)
    expect(wrapper.get('.post-title').attributes('data-open')).toBe(post.id)
    expect(wrapper.get('.text-post').attributes('data-open')).toBe(post.id)
    expect(wrapper.get('.text-post p').element.textContent).toBe(notes.replace(/\n/g, ''))
    expect(wrapper.get('.text-post p').findAll('br')).toHaveLength(2)
    expect(post.text).toBe(notes)
    wrapper.unmount()
  })

  it('keeps a summary-shaped original title when personal notes repeat its long prefix', () => {
    const prefix = '文'.repeat(80)
    const title = prefix + '...'
    const notes = prefix + '\n\n' + '个人笔记🙂'.repeat(12)
    const post = favoriteModel(
      { ...baseFavorite, notes },
      { ...baseDetail, title, description: prefix + '原文'.repeat(24) }
    )
    const wrapper = render(post, true)
    expect(wrapper.get('.post-title').text()).toBe(title)
    expect(wrapper.get('.post-title').attributes('data-open')).toBe(post.id)
    expect(wrapper.get('.text-post').attributes('data-open')).toBe(post.id)
    expect(wrapper.get('.text-post p').element.textContent).toBe(notes.replace(/\n/g, ''))
    expect(wrapper.get('.text-post p').findAll('br')).toHaveLength(2)
    expect(post.title).toBe(title)
    expect(post.text).toBe(notes)
    wrapper.unmount()
  })

  it('keeps titles generated from content when favorites display separate descriptions', () => {
    const detail: PostDetailResponse & { content: string } = {
      ...baseDetail,
      title: undefined,
      content: 'Original long body',
      description: 'Separate summary',
    }
    const post = favoriteModel(baseFavorite, detail)
    const wrapper = render(post, true)
    expect(wrapper.get('.post-title').text()).toBe(detail.content)
    expect(wrapper.get('.post-title').attributes('data-open')).toBe(post.id)
    expect(wrapper.get('.text-post').attributes('data-open')).toBe(post.id)
    expect(wrapper.get('.text-post p').element.textContent).toBe(detail.description)
    expect(post.title).toBe(detail.content)
    expect(post.text).toBe(detail.description)
    wrapper.unmount()
  })

  it('emits the original post and mouse event from the separate saved control', () => {
    const wrapper = render(basePost, true)
    const save = wrapper.get('.post-save')
    const event = new MouseEvent('click', { bubbles: true })
    save.element.dispatchEvent(event)
    expect(wrapper.emitted('save')).toHaveLength(1)
    const emittedPost = wrapper.emitted('save')?.[0]?.[0] as JournalPost
    expect(emittedPost).toBe(wrapper.props('post'))
    expect(toRaw(emittedPost)).toBe(basePost)
    expect(wrapper.emitted('save')?.[0]?.[1]).toBe(event)
    expect(save.attributes('data-open')).toBeUndefined()
    expect(save.attributes('aria-pressed')).toBe('true')
    expect(save.attributes('aria-label')).toContain(basePost.title)
    wrapper.unmount()
  })

  it('retains an image main title and its raw alt while omitting an equivalent excerpt', () => {
    const post: JournalPost = {
      ...basePost,
      image: '/thumbnail.webp',
      title: '  First\nsecond  ',
      titleOrigin: 'fallback',
      text: 'First second',
    }
    const wrapper = render(post)
    expect(wrapper.classes()).toContain('post-card--media')
    expect(wrapper.get('.post-title').text()).toBe('First\nsecond')
    expect(wrapper.get('.post-title').attributes('data-open')).toBe(post.id)
    expect(wrapper.get('journal-image-stub').attributes('alt')).toBe(post.title)
    expect(wrapper.get('.post-media').attributes('data-open')).toBe(post.id)
    expect(wrapper.find('.post-excerpt').exists()).toBe(false)
    wrapper.unmount()
  })

  it('retains a summary-like image title and every additional excerpt character', () => {
    const post: JournalPost = {
      ...basePost,
      image: '/thumbnail.webp',
      title: '文'.repeat(80) + '...',
      text: '文'.repeat(80) + '\n\n' + '尾🙂'.repeat(32),
    }
    const wrapper = render(post)
    expect(wrapper.get('.post-title').text()).toBe(post.title)
    expect(wrapper.get('.post-excerpt').element.textContent).toBe(post.text)
    wrapper.unmount()
  })
})
