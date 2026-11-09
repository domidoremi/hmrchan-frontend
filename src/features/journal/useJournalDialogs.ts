import {
  computed,
  onBeforeUnmount,
  onMounted,
  provide,
  watch,
  type InjectionKey,
  type ShallowRef,
} from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authorService } from '@/api/authorService'
import { postService } from '@/api/postService'
import { searchService } from '@/api/searchService'
import { ensureAuthStoreLoaded } from '@/services/authSurface'
import { useAuthStore, useFavoritesStore } from '@/stores'
import { isUuidV7String } from '@/types/publicId'
import { getMediaStreamUrl, getMediaThumbnailUrl } from '@/utils/mediaOptimizer'
import { postModel, platforms, type JournalPost } from './models'
import type { JournalRuntime } from './runtime'

export const journalDialogsKey: InjectionKey<ReturnType<typeof useJournalDialogs>> =
  Symbol('journal-dialogs')

export function useJournalDialogs(runtime: ShallowRef<JournalRuntime | null>) {
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
    liked = new Map<string, boolean>()
  const confirmed = new Map<string, boolean>()
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
          `<button class="search-result" data-dialog-post="${esc(post.id)}">${post.image ? `<img src="${esc(post.image)}" alt="" width="44" height="50">` : icon('file')}<span>${esc(post.title)}<small>${time ? esc(post.time) : `${esc(platforms[post.platform] || post.platform)} · ${esc(post.author)}`}</small></span>${icon('chevron')}</button>`
      )
      .join('')
  }
  function paintSearch(query: string, data: { items: JournalPost[]; more: boolean }) {
    const container = document.querySelector('#search-results')
    if (!container) return
    container.innerHTML = `<p class="results-count">${query ? `找到 ${data.items.length}${data.more ? '+' : ''} 条相关动态` : '最近更新'}</p>${resultRows(data.items.slice(0, 6)) || '<p class="dialog-copy">没有找到相关内容</p>'}`
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
    if (container) container.innerHTML = '<p class="results-count">加载中…</p>'
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
      if (valid() && container)
        container.innerHTML =
          '<p class="dialog-copy">暂时无法加载</p><button class="text-button" data-search-retry>重试</button>'
    }
  }
  function openSearch(initial = '') {
    let query = initial
    ui().openDialog(
      `<h2 id="dialog-title">搜索</h2><label class="explore-search">${icon('search')}<input id="global-search" type="search" placeholder="动态、作者、标签" aria-label="搜索动态、作者或标签" value="${esc(initial)}" autofocus></label><div id="search-results" class="search-results" aria-live="polite"></div>`,
      'search-dialog',
      { key: 'search', label: '搜索', render: () => openSearch(query) }
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
    return `<button class="button ${dark ? 'button-dark' : 'button-outline'} button-small detail-save ${saved(post.id) ? 'saved' : ''}" data-dialog-save="${esc(post.id)}" aria-pressed="${saved(post.id)}">${icon('bookmark')}${saved(post.id) ? '已收藏' : '收藏'}</button>`
  }
  function refreshSaves() {
    for (const button of document.querySelectorAll<HTMLElement>('[data-dialog-save]')) {
      const value = saved(button.dataset['dialogSave']!)
      button.classList.toggle('saved', value)
      button.setAttribute('aria-pressed', String(value))
      button.innerHTML = `${icon('bookmark')}${value ? '已收藏' : '收藏'}`
    }
  }
  function renderPost(post: JournalPost) {
    remember([post])
    const media = post.image
      ? `<button class="detail-photo-open" data-dialog-gallery="${esc(post.id)}" aria-label="查看大图"><img class="detail-photo" src="${esc(post.originalImage || post.image)}" alt="${esc(post.title)}" width="400" height="500"><span>${icon('expand')} 查看大图</span></button>`
      : ''
    const copy =
      post.text.trim() && post.text.trim() !== post.title.trim()
        ? `<p class="dialog-copy">${lines(post.text)}</p>`
        : ''
    ui().openDialog(
      `<div class="post-detail${post.image ? '' : ' post-detail--text'}">${media ? `<div class="detail-media">${media}</div>` : ''}<div class="detail-copy"><div class="post-meta"><span class="platform"><i class="platform-dot platform-${esc(post.platform)}"></i>${esc(platforms[post.platform] || post.platform)}</span><span>${esc(post.time)}</span></div><h2 id="dialog-title">${esc(post.title)}</h2>${copy}<div class="detail-tags">${post.tags.map((tag) => `<button class="badge badge-purple" data-search-term="${esc(tag)}"># ${esc(tag)}</button>`).join('')}</div><button class="detail-author" data-author-id="${esc(post.authorId || '')}" data-author-query="${esc(post.author)}"><img src="${esc(post.avatar)}" alt="" width="33" height="33"><span>${esc(post.author)}<small>作者 ${icon('arrow-up-right')}</small></span></button><div class="detail-actions">${saveButton(post)}${post.likes !== null ? `<button class="button button-outline button-small" data-dialog-like="${esc(post.id)}" aria-pressed="${liked.get(post.id) ?? post.liked ?? false}">${icon('heart')}<span>${post.communityLikes ?? post.likes}</span></button>` : ''}<a class="text-button" href="/post/${esc(post.id)}" aria-label="打开动态页面">${icon('arrow-up-right')}</a></div></div></div>`,
      post.image ? 'detail-dialog' : 'detail-dialog detail-dialog--text',
      {
        key: `post:${post.id}`,
        label: '详情',
        render: () => renderPost(posts.get(post.id) || post),
      }
    )
  }
  async function openPost(post: JournalPost) {
    renderPost(post)
    const request = generation
    if (!isUuidV7String(post.id)) return
    try {
      const response = await detail(post.id)
      if (request !== generation || !active('detail-dialog')) return
      const full = postModel(response)
      if (full.liked !== undefined) liked.set(full.id, full.liked)
      remember([full])
      if (request === generation && active('detail-dialog')) renderPost(full)
      if (auth.isAuthenticated) {
        const user = auth.user?.id,
          value = await favorites.checkFavorited(post.id)
        if (user === auth.user?.id) confirm(post.id, value)
      }
    } catch {
      if (request === generation) ui().toast('完整内容暂时无法加载')
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
      `<div class="gallery-toolbar"><div><span class="eyebrow">PHOTOS</span><h2 id="dialog-title">${esc(post.title)}</h2></div><div><button class="icon-button" data-gallery-zoom aria-label="放大图片" aria-pressed="false">${icon('expand')}</button>${saveButton(post, false)}</div></div><div class="gallery-stage"><button class="gallery-arrow gallery-arrow-prev icon-button" data-real-gallery-step="-1" aria-label="上一张图片" ${images.length < 2 ? 'disabled' : ''}>${icon('arrow-left')}</button><div class="gallery-image-area"><img class="gallery-image" src="${esc(item.src)}" alt="${esc(post.title)}" width="900" height="1200"></div><button class="gallery-arrow gallery-arrow-next icon-button" data-real-gallery-step="1" aria-label="下一张图片" ${images.length < 2 ? 'disabled' : ''}>${icon('arrow')}</button></div><div class="gallery-footer"><div class="gallery-counter" aria-live="polite">${String(current + 1).padStart(2, '0')}<span> / ${String(images.length).padStart(2, '0')}</span></div><div class="gallery-filmstrip" aria-label="图片缩略图">${images.map((image, i) => `<button data-real-gallery-index="${i}" class="${i === current ? 'active' : ''}" aria-pressed="${i === current}" aria-label="查看第 ${i + 1} 张图片"><img src="${esc(image.thumb)}" alt="" width="35" height="44"></button>`).join('')}</div><button class="text-button" data-dialog-post="${esc(post.id)}">查看详情 ${icon('arrow')}</button></div>`,
      'gallery-dialog journal-real-gallery',
      {
        key: 'real-gallery',
        label: '图片',
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
        if (request === generation) ui().toast('原图暂时无法加载')
      }
    }
    if (request !== generation) return
    if (!images.length) {
      ui().toast('暂无图片')
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
      ui().toast('暂时无法连接，请重试')
      return false
    }
    if (auth.isAuthenticated) return true
    ui().closeDialog(true)
    await router.push({ path: '/login', query: { redirect: route.fullPath } })
    return false
  }
  async function toggleSave(id: string, button: HTMLElement) {
    if (!isUuidV7String(id) || pending.has(id) || !(await account())) return
    pending.add(id)
    const user = auth.user?.id
    button.setAttribute('aria-busy', 'true')
    try {
      const previous = await favorites.checkFavorited(id)
      if (user !== auth.user?.id) return
      const original = favorites.items.find((item) => item.post_id === id)
      const result = previous
        ? await favorites.removeFavoriteByPostId(id)
        : await favorites.addFavorite(id)
      if (user !== auth.user?.id) return
      if (!result.success) {
        ui().toast('暂时未能保存，请重试')
        return
      }
      confirm(id, !previous)
      runtime.value?.Experience.savedFeedback(button, id, !previous)
      ui().toast(previous ? '已取消收藏' : '已收藏', {
        label: '撤销',
        run: () => {
          if (user !== auth.user?.id || pending.has(id)) return
          pending.add(id)
          void (
            previous
              ? original
                ? favorites.restoreFavorite(original)
                : favorites.addFavorite(id)
              : favorites.removeFavoriteByPostId(id)
          )
            .then((result) => {
              if (result.success && user === auth.user?.id) confirm(id, previous)
            })
            .finally(() => pending.delete(id))
        },
      })
    } finally {
      pending.delete(id)
      button.removeAttribute('aria-busy')
    }
  }
  async function toggleLike(id: string, button: HTMLElement) {
    if (!isUuidV7String(id) || pending.has(id) || !(await account())) return
    pending.add(id)
    const user = auth.user?.id,
      wasLiked = liked.get(id) ?? posts.get(id)?.liked ?? false
    try {
      const response = await (wasLiked
        ? postService.unlikePost(id, config())
        : postService.likePost(id, config()))
      if (user !== auth.user?.id) return
      liked.set(id, response.is_liked)
      const post = posts.get(id)
      if (post) {
        post.liked = response.is_liked
        post.communityLikes = response.community_like_count
      }
      button.setAttribute('aria-pressed', String(response.is_liked))
      const count = button.querySelector('span')
      if (count) count.textContent = String(response.community_like_count)
    } catch {
      ui().toast('暂时未能保存，请重试')
    } finally {
      pending.delete(id)
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
        `<div class="profile-summary"><img src="${esc(avatar)}" alt="${esc(name)}" width="85" height="85"><h2 id="dialog-title">${esc(name)}</h2><div class="profile-stats">${count !== null ? `<span><b>${count}</b>动态</span>` : ''}<span><b>${items.filter((post) => saved(post.id)).length}</b>已收藏</span></div>${id ? `<a class="button button-dark" href="/author/${esc(id)}">作者主页 ${icon('arrow-up-right')}</a>` : ''}</div><div class="search-results">${resultRows(items, true)}</div>`,
        'author-dialog',
        { key: viewKey, label: '作者', render }
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
      if (request === generation) ui().toast('作者动态暂时无法加载')
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
    if (data['dialogLike']) void toggleLike(data['dialogLike'], button)
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
  watch(() => route.fullPath, changed)
  watch(
    () => auth.user?.id,
    (_next, previous) => {
      liked.clear()
      confirmed.clear()
      searches.clear()
      for (const post of posts.values()) delete post.liked
      if (previous) runtime.value?.UI.closeDialog(true)
    }
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
