import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/components/ui/Avatar.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'MockAvatar',
      props: ['src', 'alt', 'fallback'],
      template: `
        <span class="ui-avatar">
          <img v-if="src" :src="src" :alt="alt" />
          <span v-else-if="fallback" class="ui-avatar__fallback">{{ fallback }}</span>
          <slot v-else name="fallback" />
        </span>
      `,
    }),
  }
})

import CommentComposerShell from '../shared/CommentComposerShell.vue'
import CommentItemShell from '../shared/CommentItemShell.vue'
import CommentThreadHeader from '../shared/CommentThreadHeader.vue'

describe('comment shell primitives', () => {
  it('renders the guest composer slot without authenticated editor chrome', () => {
    const wrapper = mount(CommentComposerShell, {
      props: {
        authenticated: false,
        title: 'Join the discussion',
        subtitle: 'Write a reply',
        charCount: 0,
        maxLength: 500,
      },
      slots: {
        guest: '<a class="guest-login-link" href="/login">Sign in</a>',
        default: '<textarea class="editor-slot" />',
        footer: '<button class="footer-action">Submit</button>',
      },
    })

    expect(wrapper.find('.guest-login-link').exists()).toBe(true)
    expect(wrapper.find('.comment-composer-shell__card').exists()).toBe(false)
    expect(wrapper.find('.editor-slot').exists()).toBe(false)
    expect(wrapper.find('.footer-action').exists()).toBe(false)
  })

  it('renders authenticated composer identity, editor slots, and count contract', () => {
    const wrapper = mount(CommentComposerShell, {
      props: {
        authenticated: true,
        avatarSrc: 'https://example.test/avatar.jpg',
        avatarAlt: 'Alice avatar',
        avatarFallback: 'A',
        title: 'Reply as Alice',
        subtitle: '500 character limit',
        charCount: 42,
        maxLength: 500,
      },
      slots: {
        toolbar: '<button class="toolbar-action">Attach</button>',
        default: '<textarea class="editor-slot" />',
        attachments: '<div class="attachment-slot">image.png</div>',
        footer: '<button class="footer-action">Submit</button>',
      },
    })

    expect(wrapper.get('.comment-composer-shell__title').text()).toBe('Reply as Alice')
    expect(wrapper.get('.comment-composer-shell__subtitle').text()).toBe('500 character limit')
    expect(wrapper.get('.comment-composer-shell__count').text()).toBe('42/500')
    expect(wrapper.get('.comment-composer-shell__avatar img').attributes('alt')).toBe(
      'Alice avatar'
    )
    expect(wrapper.find('.toolbar-action').exists()).toBe(true)
    expect(wrapper.find('.editor-slot').exists()).toBe(true)
    expect(wrapper.find('.attachment-slot').exists()).toBe(true)
    expect(wrapper.find('.footer-action').exists()).toBe(true)
  })

  it('renders the thread header count, subtitle, and action slot', () => {
    const wrapper = mount(CommentThreadHeader, {
      props: {
        title: 'Comments',
        count: 12,
        subtitle: 'Latest first',
      },
      slots: {
        actions: '<button class="sort-action">Sort</button>',
      },
    })

    expect(wrapper.get('[data-testid="comment-thread-header"]').exists()).toBe(true)
    expect(wrapper.get('.comment-thread-header__title').text()).toContain('Comments')
    expect(wrapper.get('.comment-thread-header__count').text()).toBe('12')
    expect(wrapper.get('.comment-thread-header__subtitle').text()).toBe('Latest first')
    expect(wrapper.find('.sort-action').exists()).toBe(true)
  })

  it('renders comment item identity, reply modifier, and optional slots', () => {
    const wrapper = mount(CommentItemShell, {
      props: {
        author: 'Alice',
        time: '2 minutes ago',
        avatarSrc: null,
        avatarAlt: 'Alice avatar',
        avatarFallback: 'A',
        isReply: true,
      },
      slots: {
        badges: '<span class="badge-slot">Author</span>',
        menu: '<button class="menu-slot">Menu</button>',
        default: '<p class="body-slot">Comment body</p>',
        actions: '<button class="actions-slot">Reply</button>',
        reply: '<form class="reply-slot">Reply form</form>',
        replies: '<article class="replies-slot">Nested reply</article>',
      },
    })

    expect(wrapper.classes()).toContain('comment-item-shell--reply')
    expect(wrapper.get('.comment-item-shell__author').text()).toBe('Alice')
    expect(wrapper.get('.comment-item-shell__time').text()).toBe('2 minutes ago')
    expect(wrapper.get('.ui-avatar__fallback').text()).toBe('A')
    expect(wrapper.find('.badge-slot').exists()).toBe(true)
    expect(wrapper.find('.menu-slot').exists()).toBe(true)
    expect(wrapper.find('.body-slot').text()).toBe('Comment body')
    expect(wrapper.find('.actions-slot').exists()).toBe(true)
    expect(wrapper.find('.reply-slot').exists()).toBe(true)
    expect(wrapper.find('.replies-slot').exists()).toBe(true)
  })
})
