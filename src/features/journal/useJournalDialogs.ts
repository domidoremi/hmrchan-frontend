import {
  computed,
  onBeforeUnmount,
  onMounted,
  provide,
  watch,
  type InjectionKey,
  type ShallowRef,
} from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { authorService } from '@/api/authorService'
import { postService } from '@/api/postService'
import { searchService } from '@/api/searchService'
import { ensureAuthStoreLoaded } from '@/services/authSurface'
import { useAuthStore, useFavoritesStore } from '@/stores'
import { isUuidV7String } from '@/types/publicId'
import { getMediaStreamUrl, getMediaThumbnailUrl } from '@/utils/mediaOptimizer'
import { journalPostTimeLabel } from './localizedPostTime'
import { journalSourceLabel } from './controlLabels'
import { postModel, platforms, type JournalPost } from './models'
import { journalFavoriteFeedback } from './feedback'
import { useJournalOperationScope } from './useJournalOperationScope'
import type { JournalRuntime } from './runtime'

export const journalDialogsKey: InjectionKey<ReturnType<typeof useJournalDialogs>> =
  Symbol('journal-dialogs')

export function useJournalDialogs(runtime: ShallowRef<JournalRuntime | null>) {
  const { locale, t } = useI18n({ useScope: 'global' })
  const route = useRoute(),
    router = useRouter(),
    auth = useAuthStore(),
    favorites = useFavoritesStore()
  const fixture = computed(
    () => import.meta.env.DEV && route.query['journal-fixture'] === 'reference'
  )
  const posts = new Map<string, JournalPost>()
  const searches = new Map<string, { items: JournalPost[]; more: boolean }>()
  const pending = new Set<string>(),
    liked = new Map<string, { active: boolean; count: number | undefined }>()
  const confirmed = new Map<string, boolean>()
  const operations = useJournalOperationScope(
    () => auth.user?.id,
    () => {
      for (const button of document.querySelectorAll<HTMLElement>(
        '[data-dialog-save][aria-busy]'
      )) {
        if (pending.has(button.dataset['dialogSave'] ?? '')) button.removeAttribute('aria-busy')
      }
      pending.clear()
      liked.clear()
      confirmed.clear()
      for (const post of posts.values()) delete post.liked
      refreshSaves()
      for (const button of document.querySelectorAll<HTMLElement>('[data-dialog-like]')) {
        button.setAttribute('aria-pressed', 'false')
      }
    }
  )
  const lifetime = new AbortController()
  let searchRequest: AbortController | undefined, timer: ReturnType<typeof setTimeout> | undefined
  let generation = 0,
    galleryPost: JournalPost | undefined,
    galleryIndex = 0
  let galleryImages: { src: string; thumb: string }[] = []
  const ui = () => runtime.value!.UI
  const esc = (value: unknown) => ui().escape(value)
  const icon = (name: string) => ui().icon(name)
  const active = (name: string) => Boolean(document.querySelector(`#app-dialog.${name}[open]`))
  let searchState: {
    kind: 'loading' | 'error' | 'results'
    query: string
    count: number
    more: boolean
  } = { kind: 'loading', query: '', count: 0, more: false }
  function searchSummary() {
    if (searchState.kind === 'loading') return t('common.loading')
    if (searchState.kind === 'error') return t('common.loadingFailed')
    return searchState.query
      ? t('journal.search.results', { count: searchState.count, more: searchState.more ? '+' : '' })
      : t('journal.search.recent')
  }
  const config = () => ({ signal: lifetime.signal, skipErrorToast: true })
  const lines = (value: string) => esc(value).replace(/\n/g, '<br>')
  function remember(items: JournalPost[]) {
    for (const item of items) posts.set(item.id, item)
    while (posts.size > 120) posts.delete(posts.keys().next().value!)
  }
  function detail(id: string) {
    return postService.getPost(id, config())
  }
  function resultRows(items: JournalPost[], time = false) {
    return items
      .map(
        (post) =>
          `<button class="search-result" data-dialog-post="${esc(post.id)}">${post.image ? `<img src="${esc(post.image)}" alt="" width="44" height="50">` : icon('file')}<span>${esc(post.title)}<small>${time ? `<span class="dialog-post-time" data-post-time="${esc(post.id)}">${esc(journalPostTimeLabel(post, t, locale.value))}</span>` : `${esc(platforms[post.platform] || post.platform)} · ${esc(post.author)}`}</small></span>${icon('chevron')}</button>`
      )
      .join('')
  }
  function paintSearch(query: string, data: { items: JournalPost[]; more: boolean }) {
    const container = document.querySelector('#search-results')
    if (!container) return
    searchState = { kind: 'results', query, count: data.items.length, more: data.more }
    container.innerHTML = `<p class="results-count">${esc(searchSummary())}</p>${resultRows(data.items.slice(0, 6)) || `<p class="dialog-copy search-empty">${esc(t('common.noResults'))}</p>`}`
    ui().hydrate(container)
  }
  async function search(query: string) {
    searchRequest?.abort()
    const controller = new AbortController()
    searchRequest = controller
    const valid = () =>
      !controller.signal.aborted &&
      active('search-dialog') &&
      (document.querySelector<HTMLInputElement>('#global-search')?.value ?? '') === query
    const cached = searches.get(query)
    if (cached) {
      paintSearch(query, cached)
      return
    }
    const container = document.querySelector('#search-results')
    searchState = { kind: 'loading', query, count: 0, more: false }
    if (container) container.innerHTML = `<p class="results-count">${esc(searchSummary())}</p>`
    try {
      let items: JournalPost[],
        more = false
      if (import.meta.env.DEV && fixture.value) {
        const reference = await import('./reference-data.json')
        items = reference.posts
          .map((post) => ({
            ...post,
            image: post.image ? '/journal/' + post.image : null,
            avatar: '/journal/himeri-garden.webp',
            authorId: null,
          }))
          .filter((post) =>
            `${post.title} ${post.author} ${post.tags.join(' ')} ${post.type}`
              .toLowerCase()
              .includes(query.toLowerCase())
          )
      } else {
        const response = query.trim()
          ? await searchService.searchPosts(
              { q: query.trim(), limit: 6 },
              { ...config(), signal: controller.signal }
            )
          : await postService.listPosts({ limit: 6 }, { ...config(), signal: controller.signal })
        items = response.items.map(postModel)
        more = response.has_more
      }
      if (!valid()) return
      remember(items)
      const data = { items, more }
      searches.set(query, data)
      if (searches.size > 30) searches.delete(searches.keys().next().value!)
      paintSearch(query, data)
    } catch {
      if (valid() && container) {
        searchState = { kind: 'error', query, count: 0, more: false }
        container.innerHTML = `<p class="dialog-copy search-error">${esc(searchSummary())}</p><button class="text-button" data-search-retry>${esc(t('common.retry'))}</button>`
      }
    }
  }
  function openSearch(initial = '') {
    let query = initial
    ui().openDialog(
      `<h2 id="dialog-title">${esc(t('common.search'))}</h2><label class="explore-search">${icon('search')}<input id="global-search" type="search" placeholder="${esc(t('search.placeholder'))}" aria-label="${esc(t('journal.search.inputLabel'))}" value="${esc(initial)}" autofocus></label><div id="search-results" class="search-results" aria-live="polite"></div>`,
      'search-dialog',
      { key: 'search', labelKey: 'common.search', render: () => openSearch(query) }
    )
    const input = document.querySelector<HTMLInputElement>('#global-search')!
    input.addEventListener('input', () => {
      query = input.value
      clearTimeout(timer)
      timer = setTimeout(() => void search(query), 250)
    })
    void search(initial)
    input.focus({ preventScroll: true })
  }
  function saved(id: string) {
    return confirmed.get(id) ?? favorites.items.some((item) => item.post_id === id)
  }
  function confirm(id: string, value: boolean) {
    confirmed.set(id, value)
    document.dispatchEvent(
      new CustomEvent('journalfavoritechange', { detail: { id, saved: value } })
    )
    refreshSaves()
  }
  function saveButton(post: JournalPost, dark = true) {
    return `<button class="button ${dark ? 'button-dark' : 'button-outline'} button-small detail-save ${saved(post.id) ? 'saved' : ''}" data-dialog-save="${esc(post.id)}" aria-pressed="${saved(post.id)}" aria-label="${esc(t(saved(post.id) ? 'journal.actions.removeFavorite' : 'journal.actions.addFavorite', { title: post.title }))}">${icon('bookmark')}<span class="dialog-save-label">${esc(t(saved(post.id) ? 'journal.actions.saved' : 'post.favorite'))}</span></button>`
  }
  function refreshSaves() {
    for (const button of document.querySelectorAll<HTMLElement>('[data-dialog-save]')) {
      const value = saved(button.dataset['dialogSave']!)
      button.classList.toggle('saved', value)
      button.setAttribute('aria-pressed', String(value))
      const title = posts.get(button.dataset['dialogSave']!)?.title
      button.setAttribute(
        'aria-label',
        title === undefined
          ? t(value ? 'post.unfavorite' : 'post.favorite')
          : t(value ? 'journal.actions.removeFavorite' : 'journal.actions.addFavorite', { title })
      )
      const label = button.querySelector('.dialog-save-label')
      if (label) label.textContent = t(value ? 'journal.actions.saved' : 'post.favorite')
    }
  }
  function renderPost(post: JournalPost) {
    remember([post])
    const media = post.image
      ? `<button class="detail-photo-open" data-dialog-gallery="${esc(post.id)}" aria-label="${esc(t('journal.gallery.open'))}"><img class="detail-photo" src="${esc(post.originalImage || post.image)}" alt="${esc(post.title)}" width="400" height="500"><span>${icon('expand')} <span class="detail-photo-label">${esc(t('journal.gallery.open'))}</span></span></button>`
      : ''
    const copy =
      post.text.trim() && post.text.trim() !== post.title.trim()
        ? `<p class="dialog-copy">${lines(post.text)}</p>`
        : ''
    ui().openDialog(
      `<div class="post-detail${post.image ? '' : ' post-detail--text'}">${media ? `<div class="detail-media">${media}</div>` : ''}<div class="detail-copy"><div class="post-meta"><span class="platform"><i class="platform-dot platform-${esc(post.platform)}"></i><span class="detail-platform-label" data-platform="${esc(post.platform)}">${esc(journalSourceLabel(post.platform, platforms[post.platform] || post.platform, t))}</span></span><span class="dialog-post-time" data-post-time="${esc(post.id)}">${esc(journalPostTimeLabel(post, t, locale.value))}</span></div><h2 id="dialog-title">${esc(post.title)}</h2>${copy}<div class="detail-tags">${post.tags.map((tag) => `<button class="badge badge-purple" data-search-term="${esc(tag)}"># ${esc(tag)}</button>`).join('')}</div><button class="detail-author" data-author-id="${esc(post.authorId || '')}" data-author-query="${esc(post.author)}"><img src="${esc(post.avatar)}" alt="" width="33" height="33"><span>${esc(post.author)}<small><span class="detail-author-label">${esc(t('search.type.author'))}</span> ${icon('arrow-up-right')}</small></span></button><div class="detail-actions">${saveButton(post)}${post.likes !== null ? `<button class="button button-outline button-small" data-dialog-like="${esc(post.id)}" aria-pressed="${liked.get(post.id)?.active ?? post.liked ?? false}">${icon('heart')}<span>${liked.get(post.id)?.count ?? post.communityLikes ?? post.likes}</span></button>` : ''}<a class="text-button" href="/post/${esc(post.id)}" aria-label="${esc(t('journal.actions.openPostNamed', { title: post.title }))}">${icon('arrow-up-right')}</a></div></div></div>`,
      post.image ? 'detail-dialog' : 'detail-dialog detail-dialog--text',
      {
        key: `post:${post.id}`,
        labelKey: 'nav.postDetail',
        render: () => renderPost(posts.get(post.id) || post),
      }
    )
  }
  async function openPost(post: JournalPost) {
    const likeSnapshot = liked.get(post.id)
    renderPost(post)
    const request = generation
    if (!isUuidV7String(post.id)) return
    try {
      const response = await detail(post.id)
      if (request !== generation || !active('detail-dialog')) return
      const full = postModel(response)
      // A read started before a confirmed mutation must not replace that result.
      const currentLike = liked.get(full.id)
      if (currentLike && currentLike !== likeSnapshot) {
        full.liked = currentLike.active
        full.communityLikes = currentLike.count
      } else if (full.liked !== undefined) {
        liked.set(full.id, { active: full.liked, count: full.communityLikes })
      }
      remember([full])
      if (request === generation && active('detail-dialog')) renderPost(full)
      if (auth.isAuthenticated) {
        const user = auth.user?.id,
          value = await favorites.checkFavorited(post.id)
        if (user === auth.user?.id) confirm(post.id, value)
      }
    } catch {
      if (request === generation) ui().toast(t('journal.toast.postFailed'))
    }
  }
  function renderGallery(index: number, focus?: string) {
    if (!galleryPost || !galleryImages.length) return
    galleryIndex = (index + galleryImages.length) % galleryImages.length
    const post = galleryPost,
      item = galleryImages[galleryIndex]!,
      current = galleryIndex,
      images = galleryImages
    ui().openDialog(
      `<div class="gallery-toolbar"><div><span class="eyebrow">${esc(t('journal.views.gallery'))}</span><h2 id="dialog-title">${esc(post.title)}</h2></div><div><button class="icon-button" data-gallery-zoom aria-label="${esc(t('common.zoomIn'))}" aria-pressed="false">${icon('expand')}</button>${saveButton(post, false)}</div></div><div class="gallery-stage"><button class="gallery-arrow gallery-arrow-prev icon-button" data-real-gallery-step="-1" aria-label="${esc(t('journal.gallery.previous'))}" ${images.length < 2 ? 'disabled' : ''}>${icon('arrow-left')}</button><div class="gallery-image-area"><img class="gallery-image" src="${esc(item.src)}" alt="${esc(post.title)}" width="900" height="1200"></div><button class="gallery-arrow gallery-arrow-next icon-button" data-real-gallery-step="1" aria-label="${esc(t('journal.gallery.next'))}" ${images.length < 2 ? 'disabled' : ''}>${icon('arrow')}</button></div><div class="gallery-footer"><div class="gallery-counter" aria-live="polite">${String(current + 1).padStart(2, '0')}<span> / ${String(images.length).padStart(2, '0')}</span></div><div class="gallery-filmstrip" aria-label="${esc(t('journal.gallery.thumbnails'))}">${images.map((image, i) => `<button data-real-gallery-index="${i}" class="${i === current ? 'active' : ''}" aria-pressed="${i === current}" aria-label="${esc(t('journal.gallery.viewIndex', { index: i + 1 }))}"><img src="${esc(image.thumb)}" alt="" width="35" height="44"></button>`).join('')}</div><button class="text-button" data-dialog-post="${esc(post.id)}"><span class="gallery-details-label">${esc(t('post.viewDetail'))}</span> ${icon('arrow')}</button></div>`,
      'gallery-dialog journal-real-gallery',
      {
        key: 'real-gallery',
        labelKey: 'journal.views.gallery',
        render: () => {
          galleryPost = post
          galleryImages = images
          renderGallery(current)
        },
      }
    )
    const img = document.querySelector<HTMLImageElement>('.gallery-image')
    img?.addEventListener(
      'error',
      () => {
        if (img.src !== new URL(item.thumb, location.href).href) img.src = item.thumb
      },
      { once: true }
    )
    if (focus) document.querySelector<HTMLElement>(focus)?.focus({ preventScroll: true })
    document
      .querySelector('.gallery-filmstrip .active')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }
  async function openGallery(post: JournalPost) {
    if (!post.image) return
    const request = generation
    let current = post,
      images = [{ src: post.originalImage || post.image, thumb: post.image }]
    if (isUuidV7String(post.id)) {
      try {
        const response = await detail(post.id)
        if (request !== generation) return
        current = postModel(response)
        remember([current])
        const originals = (response.media_files || [])
          .filter((file) => /^image(?:\/|$)/i.test(file.file_type))
          .map((file) => ({
            src: getMediaStreamUrl(file.id),
            thumb: getMediaThumbnailUrl(file.id, 'large'),
          }))
        images = originals.length
          ? originals
          : current.image
            ? [{ src: current.originalImage || current.image, thumb: current.image }]
            : []
      } catch {
        if (request === generation) ui().toast(t('common.imageLoadFailed'))
      }
    }
    if (request !== generation) return
    if (!images.length) {
      ui().toast(t('journal.gallery.noImages'))
      if (active('detail-dialog')) renderPost(current)
      return
    }
    galleryPost = current
    galleryImages = images
    renderGallery(0)
  }
  async function account() {
    try {
      await ensureAuthStoreLoaded({ initialize: true })
    } catch {
      ui().toast(t('journal.toast.connectFailed'), undefined, { type: 'error' })
      return false
    }
    if (auth.isAuthenticated) return true
    ui().closeDialog(true)
    await router.push({ path: '/login', query: { redirect: route.fullPath } })
    return false
  }
  async function toggleSave(id: string, button: HTMLElement) {
    if (!isUuidV7String(id) || pending.has(id) || !(await account()) || pending.has(id)) return
    pending.add(id)
    const currentSession = operations.capture()
    button.setAttribute('aria-busy', 'true')
    try {
      const previous = await favorites.checkFavorited(id)
      if (!currentSession()) return
      const originalPosition = favorites.items.findIndex((item) => item.post_id === id)
      const original = favorites.items[originalPosition]
      const result = previous
        ? await favorites.removeFavoriteByPostId(id, journalFavoriteFeedback)
        : await favorites.addFavorite(id, undefined, journalFavoriteFeedback)
      if (!currentSession()) return
      if (!result.success) {
        ui().toast(t('journal.toast.saveFailed'), undefined, { type: 'error' })
        return
      }
      confirm(id, !previous)
      runtime.value?.Experience.savedFeedback(button, id, !previous)
      ui().toast(
        t(previous ? 'journal.toast.favoriteRemoved' : 'journal.toast.favoriteAdded'),
        {
          label: t('spatial.undo'),
          run: async () => {
            if (!currentSession()) return
            if (pending.has(id)) throw new Error('journal-action-busy')
            pending.add(id)
            try {
              const result = previous
                ? original
                  ? await favorites.restoreFavorite(
                      original,
                      Math.max(0, originalPosition),
                      journalFavoriteFeedback
                    )
                  : await favorites.addFavorite(id, undefined, journalFavoriteFeedback)
                : await favorites.removeFavoriteByPostId(id, journalFavoriteFeedback)
              if (!currentSession()) return
              if (!result.success) throw new Error('journal-action-failed')
              confirm(id, previous)
            } finally {
              if (currentSession()) pending.delete(id)
            }
          },
        },
        { type: 'success' }
      )
    } finally {
      if (currentSession()) {
        pending.delete(id)
        button.removeAttribute('aria-busy')
      }
    }
  }
  async function toggleLike(id: string) {
    if (!isUuidV7String(id) || pending.has(id) || !(await account()) || pending.has(id)) return
    pending.add(id)
    const currentSession = operations.capture()
    const wasLiked = liked.get(id)?.active ?? posts.get(id)?.liked ?? false
    try {
      const response = await (wasLiked
        ? postService.unlikePost(id, config())
        : postService.likePost(id, config()))
      if (!currentSession()) return
      liked.set(id, { active: response.is_liked, count: response.community_like_count })
      const post = posts.get(id)
      if (post) {
        post.liked = response.is_liked
        post.communityLikes = response.community_like_count
      }
      // Content refresh can replace the control while the request is pending.
      for (const control of document.querySelectorAll(`[data-dialog-like="${id}"]`)) {
        control.setAttribute('aria-pressed', String(response.is_liked))
        const count = control.querySelector('span')
        if (count) count.textContent = String(response.community_like_count)
      }
    } catch {
      if (currentSession()) ui().toast(t('journal.toast.saveFailed'), undefined, { type: 'error' })
    } finally {
      if (currentSession()) pending.delete(id)
    }
  }
  async function openAuthor(id: string, name: string) {
    const viewKey = `author:${id || name}`
    let items = [...posts.values()].filter((post) =>
      id ? post.authorId === id : post.author === name
    )
    let avatar = items[0]?.avatar || '/journal/mascot.webp',
      count: number | null = null
    const render = () =>
      ui().openDialog(
        `<div class="profile-summary"><img src="${esc(avatar)}" alt="${esc(name)}" width="85" height="85"><h2 id="dialog-title">${esc(name)}</h2><div class="profile-stats">${count !== null ? `<span class="author-post-count" data-count="${count}">${esc(t('author.postCount', { count }))}</span>` : ''}<span class="author-favorite-count" data-count="${items.filter((post) => saved(post.id)).length}">${esc(t('favorites.totalCount', { count: items.filter((post) => saved(post.id)).length }))}</span></div>${id ? `<a class="button button-dark" href="/author/${esc(id)}"><span class="author-profile-label">${esc(t('nav.authorDetail'))}</span> ${icon('arrow-up-right')}</a>` : ''}</div><div class="search-results">${resultRows(items, true)}</div>`,
        'author-dialog',
        { key: viewKey, labelKey: 'search.type.author', render }
      )
    render()
    const request = generation
    try {
      if (!id) {
        if (fixture.value) return
        const found = await searchService.searchAuthors({ q: name, limit: 6 }, config())
        if (request !== generation) return
        const match = found.items.find((author) =>
          [author.display_name, author.username, author.name].includes(name)
        )
        if (!match) return
        id = match.id
      }
      const [author, response] = await Promise.all([
        authorService.getAuthor(id, config()),
        authorService.listAuthorPosts(id, { limit: 12 }, config()),
      ])
      if (request !== generation || !active('author-dialog')) return
      items = response.items.map(postModel)
      remember(items)
      avatar = author.avatar_url || avatar
      count = author.post_count ?? null
      render()
    } catch {
      if (request === generation) ui().toast(t('journal.toast.authorFailed'))
    }
  }
  function click(event: MouseEvent) {
    const button =
      event.target instanceof Element ? event.target.closest<HTMLElement>('button,a') : null
    if (!button) return
    const data = button.dataset
    if (data['dialogPost']) {
      const post = posts.get(data['dialogPost'])
      if (post) void openPost(post)
    }
    if (data['dialogGallery']) {
      const post = posts.get(data['dialogGallery'])
      if (post) void openGallery(post)
    }
    if (data['dialogSave']) void toggleSave(data['dialogSave'], button)
    if (data['dialogLike']) void toggleLike(data['dialogLike'])
    if (data['authorQuery']) void openAuthor(data['authorId'] || '', data['authorQuery'])
    if (data['realGalleryStep'])
      renderGallery(
        galleryIndex + Number(data['realGalleryStep']),
        `[data-real-gallery-step="${data['realGalleryStep']}"]`
      )
    if (data['realGalleryIndex'] !== undefined)
      renderGallery(
        Number(data['realGalleryIndex']),
        `[data-real-gallery-index="${data['realGalleryIndex']}"]`
      )
    if (data['searchTerm'] !== undefined) {
      const input = document.querySelector<HTMLInputElement>('#global-search')
      if (input) {
        input.value = data['searchTerm']
        input.dispatchEvent(new Event('input', { bubbles: true }))
        input.focus()
      } else openSearch(data['searchTerm'])
    }
    if (button.hasAttribute('data-search-retry'))
      void search(document.querySelector<HTMLInputElement>('#global-search')?.value || '')
  }
  function refreshLocalizedControls() {
    const root = document.querySelector('#app-dialog[open] #dialog-content')
    if (!root || !runtime.value) return
    const text = (selector: string, value: string) => {
      const node = root.querySelector(selector)
      if (node) node.textContent = value
    }
    if (active('search-dialog')) {
      text('#dialog-title', t('common.search'))
      const input = root.querySelector<HTMLInputElement>('#global-search')
      if (input) {
        input.placeholder = t('search.placeholder')
        input.setAttribute('aria-label', t('journal.search.inputLabel'))
      }
      text('.results-count', searchSummary())
      text('.search-empty', t('common.noResults'))
      text('.search-error', t('common.loadingFailed'))
      text('[data-search-retry]', t('common.retry'))
    }
    for (const node of root.querySelectorAll<HTMLElement>('[data-post-time]')) {
      const post = posts.get(node.dataset['postTime']!)
      if (post) node.textContent = journalPostTimeLabel(post, t, locale.value)
    }
    refreshSaves()
    if (active('detail-dialog')) {
      text('.detail-photo-label', t('journal.gallery.open'))
      const photo = root.querySelector('[data-dialog-gallery]')
      if (photo) photo.setAttribute('aria-label', t('journal.gallery.open'))
      text('.detail-author-label', t('search.type.author'))
      const platform = root.querySelector<HTMLElement>('.detail-platform-label')
      if (platform) {
        const key = platform.dataset['platform']!
        platform.textContent = journalSourceLabel(key, platforms[key] || key, t)
      }
      const link = root.querySelector('.detail-actions a[href]')
      const title = root.querySelector('#dialog-title')?.textContent ?? ''
      if (link) link.setAttribute('aria-label', t('journal.actions.openPostNamed', { title }))
    }
    if (active('journal-real-gallery')) {
      text('.gallery-toolbar .eyebrow', t('journal.views.gallery'))
      for (const [step, key] of [
        ['-1', 'journal.gallery.previous'],
        ['1', 'journal.gallery.next'],
      ] as const) {
        const button = root.querySelector(`[data-real-gallery-step="${step}"]`)
        if (button) button.setAttribute('aria-label', t(key))
      }
      const filmstrip = root.querySelector('.gallery-filmstrip')
      if (filmstrip) filmstrip.setAttribute('aria-label', t('journal.gallery.thumbnails'))
      for (const button of root.querySelectorAll<HTMLElement>('[data-real-gallery-index]'))
        button.setAttribute(
          'aria-label',
          t('journal.gallery.viewIndex', {
            index: Number(button.dataset['realGalleryIndex']) + 1,
          })
        )
      text('.gallery-details-label', t('post.viewDetail'))
    }
    if (active('author-dialog')) {
      text('.author-profile-label', t('nav.authorDetail'))
      const count = root.querySelector<HTMLElement>('.author-post-count')
      if (count)
        count.textContent = t('author.postCount', { count: Number(count.dataset['count']) })
      const favorites = root.querySelector<HTMLElement>('.author-favorite-count')
      if (favorites)
        favorites.textContent = t('favorites.totalCount', {
          count: Number(favorites.dataset['count']),
        })
    }
  }
  const changed = () => {
    generation++
    clearTimeout(timer)
    searchRequest?.abort()
  }
  onMounted(() => {
    document.addEventListener('click', click, { signal: lifetime.signal })
    document.addEventListener('dialogwillchange', changed, { signal: lifetime.signal })
    document.addEventListener(
      'journalsearch',
      (event) => openSearch((event as CustomEvent<string>).detail || ''),
      { signal: lifetime.signal }
    )
    document.addEventListener(
      'journalauthor',
      (event) => {
        void openAuthor('', (event as CustomEvent<string>).detail)
      },
      { signal: lifetime.signal }
    )
    document.addEventListener(
      'journalfavoritechange',
      (event) => {
        const value = (event as CustomEvent<{ id: string; saved: boolean }>).detail
        confirmed.set(value.id, value.saved)
        refreshSaves()
      },
      { signal: lifetime.signal }
    )
    document.addEventListener(
      'keydown',
      (event) => {
        if (
          !active('journal-real-gallery') ||
          !['ArrowLeft', 'ArrowRight'].includes(event.key) ||
          (event.target instanceof Element && event.target.closest('input,textarea,select'))
        )
          return
        event.preventDefault()
        const delta = event.key === 'ArrowLeft' ? -1 : 1
        renderGallery(galleryIndex + delta, `[data-real-gallery-step="${delta}"]`)
      },
      { signal: lifetime.signal }
    )
  })
  watch(locale, refreshLocalizedControls, { flush: 'post' })
  watch(() => route.fullPath, changed)
  watch(
    () => auth.user?.id,
    (_next, previous) => {
      changed()
      searches.clear()
      if (previous) runtime.value?.UI.closeDialog(true)
    },
    { flush: 'sync' }
  )
  watch(() => favorites.items, refreshSaves, { deep: true })
  onBeforeUnmount(() => {
    lifetime.abort()
    changed()
  })
  const dialogs = { openSearch, openPost, openAuthor, remember }
  provide(journalDialogsKey, dialogs)
  return dialogs
}
