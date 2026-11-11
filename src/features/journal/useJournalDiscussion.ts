import { onBeforeUnmount, onMounted, watch, type ShallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { discussionService, type DiscussionComment } from '@/api/discussionService'
import { ensureAuthStoreLoaded } from '@/services/authSurface'
import { useAuthStore } from '@/stores'
import { isUuidV7String } from '@/types/publicId'
import { discussionModel, type JournalDiscussion } from './models'
import type { JournalRuntime } from './runtime'

export function useJournalDiscussion(runtime: ShallowRef<JournalRuntime | null>) {
  const { locale, t } = useI18n({ useScope: 'global' })
  const auth = useAuthStore(),
    router = useRouter(),
    route = useRoute()
  const lifetime = new AbortController()
  let version = 0
  function open(item: JournalDiscussion) {
    const ui = runtime.value?.UI
    if (!ui) return
    const esc = ui.escape
    let discussion = item,
      comments: DiscussionComment[] = [],
      cursor: string | null = null,
      pending = false
    let closed = false
    const rows = () =>
      comments
        .map(
          (comment) =>
            `<div class="comment-entry"><b>${esc(comment.user.username)}</b><small>${esc(comment.created_at.slice(0, 10))}</small><p>${esc(comment.content).replace(/\n/g, '<br>')}</p></div>`
        )
        .join('')
    const render = () => {
      ui.openDialog(
        `<span class="badge badge-purple">${esc(discussion.category)}</span><h2 id="dialog-title" style="margin-top:14px">${esc(discussion.title)}</h2><div class="discussion-meta"><span>${esc(discussion.author)}</span><span>·</span><span>${esc(discussion.time)}</span></div><p class="dialog-copy">${esc(discussion.text).replace(/\n/g, '<br>')}</p><div id="journal-comments">${rows()}</div><button class="text-button" data-more-comments ${cursor ? '' : 'hidden'}>${esc(t('comment.loadMoreReplies'))}</button>${closed ? `<p class="dialog-copy discussion-closed">${esc(t('journal.community.closed'))}</p>` : `<form id="comment-form" class="comment-form"><input name="comment" placeholder="${esc(t('comment.placeholder'))}" aria-label="${esc(t('journal.community.replyLabel'))}" maxlength="500" required><button type="submit" class="button button-dark button-small">${esc(t('comment.reply'))}</button></form>`}`,
        'discussion-dialog',
        { key: `discussion:${item.id}`, labelKey: 'journal.nav.discussions', render }
      )
      const current = version
      document.querySelector('#comment-form')?.addEventListener('submit', (event) => {
        event.preventDefault()
        const form = event.currentTarget as HTMLFormElement
        const input = form.elements.namedItem('comment') as HTMLInputElement
        const button = form.querySelector('button')!
        const content = input.value.trim()
        if (!content || pending || !isUuidV7String(item.id)) return
        pending = true
        button.disabled = true
        void (async () => {
          try {
            await ensureAuthStoreLoaded({ initialize: true })
            if (!auth.isAuthenticated) {
              ui.closeDialog(true)
              await router.push({ path: '/login', query: { redirect: route.fullPath } })
              return
            }
            const user = auth.user?.id
            const response = await discussionService.addComment(item.id, { content })
            if (user !== auth.user?.id || current !== version) return
            comments.push(response)
            const target = document.querySelector('#journal-comments')
            if (target) target.innerHTML = rows()
            if (input.value.trim() === content) input.value = ''
            input.focus({ preventScroll: true })
            ui.toast(t('comment.submitSuccess'))
          } catch {
            if (current === version) ui.toast(t('comment.error.addFailed'))
          } finally {
            pending = false
            button.disabled = false
          }
        })()
      })
      document.querySelector('[data-more-comments]')?.addEventListener('click', () => {
        if (!cursor || pending) return
        pending = true
        void discussionService
          .getComments(
            item.id,
            { limit: 20, cursor },
            { signal: lifetime.signal, skipErrorToast: true }
          )
          .then((response) => {
            if (current !== version) return
            comments.push(...response.items)
            cursor = response.next_cursor ?? null
            const target = document.querySelector('#journal-comments')
            if (target) target.innerHTML = rows()
            const more = document.querySelector<HTMLElement>('[data-more-comments]')
            if (more) more.hidden = !cursor
          })
          .catch(() => {
            if (current === version) ui.toast(t('comment.error.fetchRepliesFailed'))
          })
          .finally(() => {
            pending = false
          })
      })
    }
    render()
    const request = version
    if (!isUuidV7String(item.id)) return
    void Promise.all([
      discussionService.get(item.id, { signal: lifetime.signal, skipErrorToast: true }),
      discussionService.getComments(
        item.id,
        { limit: 20 },
        { signal: lifetime.signal, skipErrorToast: true }
      ),
    ])
      .then(([full, response]) => {
        if (request !== version) return
        discussion = discussionModel(full)
        closed = Boolean(full.is_closed)
        comments = response.items
        cursor = response.next_cursor ?? null
        const field = document.querySelector<HTMLInputElement>('#comment-form input')
        const value = field?.value || '',
          focused = field === document.activeElement
        render()
        const restored = document.querySelector<HTMLInputElement>('#comment-form input')
        if (restored) {
          restored.value = value
          if (focused) restored.focus({ preventScroll: true })
        }
      })
      .catch(() => {
        if (request === version) ui.toast(t('journal.toast.discussionFailed'))
      })
  }
  function refreshLocalizedControls() {
    const root = document.querySelector('#app-dialog.discussion-dialog[open]')
    if (!root) return
    const more = root.querySelector('[data-more-comments]')
    if (more) more.textContent = t('comment.loadMoreReplies')
    const closed = root.querySelector('.discussion-closed')
    if (closed) closed.textContent = t('journal.community.closed')
    const input = root.querySelector<HTMLInputElement>('#comment-form input')
    if (input) {
      input.placeholder = t('comment.placeholder')
      input.setAttribute('aria-label', t('journal.community.replyLabel'))
    }
    const submit = root.querySelector('#comment-form button[type="submit"]')
    if (submit) submit.textContent = t('comment.reply')
  }
  watch(locale, refreshLocalizedControls, { flush: 'post' })
  onMounted(() =>
    document.addEventListener('dialogwillchange', () => version++, { signal: lifetime.signal })
  )
  onBeforeUnmount(() => lifetime.abort())
  return { open }
}
