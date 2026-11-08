import { installUI } from './shared.js'
import { installEditorial } from './edition.js'
import { installSpatialMotion } from './motion.js'
import { installAtelier } from './atelier.js'
import { installExperience } from './experience.js'
import photos from '../photos.json'
import { createVisibilityObserver } from '@/utils/modernAPIs'

export function createJournalRuntime(navigate) {
  const lifetime = new AbortController()
  const observers = new Set()
  const frames = new Set()
  const listen = (target, type, callback, options) =>
    target.addEventListener(type, callback, {
      ...(typeof options === 'boolean' ? { capture: options } : options),
      signal: lifetime.signal,
    })
  const scopedDocument = new Proxy(document, {
    get(target, key) {
      if (key === 'addEventListener')
        return (type, callback, options) => listen(target, type, callback, options)
      const value = Reflect.get(target, key, target)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
  const environment = {
    document: scopedDocument,
    addEventListener: (type, callback, options) => listen(window, type, callback, options),
    MutationObserver: class extends MutationObserver {
      constructor(callback) {
        super(callback)
        observers.add(this)
      }
    },
    createVisibilityObserver(callback, options) {
      const observer = createVisibilityObserver(callback, options)
      observers.add(observer)
      return observer
    },
    matchMedia(query) {
      const media = window.matchMedia(query)
      return new Proxy(media, {
        get(target, key) {
          if (key === 'addEventListener')
            return (type, callback, options) => listen(target, type, callback, options)
          const value = Reflect.get(target, key, target)
          return typeof value === 'function' ? value.bind(target) : value
        },
      })
    },
    requestAnimationFrame(callback) {
      const id = requestAnimationFrame((time) => {
        frames.delete(id)
        callback(time)
      })
      frames.add(id)
      return id
    },
    cancelAnimationFrame(id) {
      frames.delete(id)
      cancelAnimationFrame(id)
    },
  }
  const runtime = {}
  installUI(runtime, environment)
  installEditorial(runtime, environment)
  installSpatialMotion(runtime, environment)
  installAtelier(runtime, environment)
  installExperience(runtime, environment)
  const { icon, escape: esc } = runtime.UI
  const paths = {
    home: '/',
    explore: '/explore',
    schedule: '/schedule',
    community: '/community',
    favorites: '/profile/favorites',
  }
  const photo = (id) => photos.find((item) => item.id === id)

  let galleryId = ''
  function openPhoto(id, gallery = false) {
    const item = photo(id)
    if (!item) return false
    const pictures = photos.filter((entry) => entry.image)
    const index = pictures.findIndex((entry) => entry.id === id)
    const render = () => openPhoto(id, gallery)
    galleryId = gallery ? id : ''
    runtime.UI.openDialog(
      gallery
        ? `<div class="gallery-toolbar"><div><span class="eyebrow">PHOTOS</span><h2 id="dialog-title">${esc(item.title)}</h2></div><div><button class="icon-button" data-gallery-zoom aria-label="放大图片" aria-pressed="false">${icon('expand')}</button><a class="button button-outline button-small" href="/journal/${item.image}" download>${icon('download')}保存照片</a></div></div><div class="gallery-stage"><button class="gallery-arrow gallery-arrow-prev icon-button" data-gallery-step="-1" aria-label="上一张图片">${icon('arrow-left')}</button><div class="gallery-image-area"><img class="gallery-image" src="/journal/${item.image}" alt="${esc(item.title)}" width="900" height="1200"></div><button class="gallery-arrow gallery-arrow-next icon-button" data-gallery-step="1" aria-label="下一张图片">${icon('arrow')}</button></div><div class="gallery-footer"><div class="gallery-counter" aria-live="polite">${String(index + 1).padStart(2, '0')}<span> / ${String(pictures.length).padStart(2, '0')}</span></div><div class="gallery-filmstrip" aria-label="图片缩略图">${pictures.map((p) => `<button data-gallery="${p.id}" class="${p.id === id ? 'active' : ''}" aria-pressed="${p.id === id}" aria-label="查看${esc(p.title)}"><img src="/journal/${p.image}" alt="" width="35" height="44"></button>`).join('')}</div><button class="text-button" data-open="${id}">查看详情 ${icon('arrow')}</button></div>`
        : `<div class="post-detail"><div><button class="detail-photo-open" data-gallery="${id}" aria-label="查看大图"><img class="detail-photo" src="/journal/${item.image}" alt="${esc(item.title)}" width="400" height="500"><span>${icon('expand')} 查看大图</span></button></div><div class="detail-copy"><div class="post-meta"><span class="platform">PHOTO JOURNAL</span></div><h2 id="dialog-title">${esc(item.title)}</h2><p class="dialog-copy">${esc(item.text)}</p><div class="detail-tags">${item.tags.map((tag) => `<button class="badge badge-purple" data-photo-tag="${esc(tag)}"># ${esc(tag)}</button>`).join('')}</div><button class="detail-author" data-photo-author="${esc(item.author)}"><img src="/journal/himeri-garden.webp" alt="" width="33" height="33"><span>${esc(item.author)}<small>作者 ${icon('arrow-up-right')}</small></span></button><div class="detail-actions"><button class="button button-dark button-small" data-gallery="${id}">${icon('expand')}查看照片</button><a class="button button-outline button-small" href="/journal/${item.image}" download>${icon('download')}保存照片</a></div></div></div>`,
      gallery ? 'gallery-dialog' : 'detail-dialog',
      { key: gallery ? 'gallery' : `photo:${id}`, label: gallery ? '图片' : '详情', render }
    )
    return true
  }
  function stepGallery(delta) {
    const pictures = photos.filter((item) => item.image)
    const index = pictures.findIndex((item) => item.id === galleryId)
    openPhoto(pictures[(index + delta + pictures.length) % pictures.length].id, true)
  }
  function changeCover(index, direction = 1) {
    const cover = document.querySelector('[data-cover-shell]')
    if (!cover || cover.dataset.sceneMode !== 'stack') return
    const selected = (index + 3) % 3
    const template = document.createElement('template')
    template.innerHTML = runtime.Atelier.hero(selected)
    cover.querySelector('.cover-copy').innerHTML =
      template.content.querySelector('.cover-copy').innerHTML
    cover.querySelector('.cover-arrows > span').innerHTML = `0${selected + 1}<i> / 03</i>`
    cover.querySelectorAll('.cover-selector').forEach((button, i) => {
      button.classList.toggle('active', i === selected)
      button.setAttribute('aria-pressed', String(i === selected))
    })
    runtime.SpatialMotion.changeCover(cover, selected, direction)
  }
  function openCollection(id) {
    const collection = runtime.Editorial.collections.find((item) => item.id === id)
    if (!collection) return
    runtime.UI.openDialog(
      runtime.Experience.collectionBook(
        collection,
        photos.filter((item) => collection.posts.includes(item.id))
      ),
      'collection-dialog',
      { key: `collection:${id}`, label: '合集', render: () => openCollection(id) }
    )
  }
  listen(document, 'click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('button,a') : null
    if (!target) return
    const link = target.closest('a[href]')
    const hash = link
      ?.getAttribute('href')
      ?.match(/^#(home|explore|schedule|community|favorites)$/)?.[1]
    if (hash) {
      event.preventDefault()
      runtime.UI.closeDialog(true)
      navigate(paths[hash])
      return
    }
    if (target.dataset.open && openPhoto(target.dataset.open)) return
    if (target.dataset.gallery && openPhoto(target.dataset.gallery, true)) return
    if (target.dataset.galleryStep) stepGallery(Number(target.dataset.galleryStep))
    if (target.hasAttribute('data-gallery-zoom')) {
      const stage = document.querySelector('.gallery-image-area')
      const zoomed = stage?.classList.toggle('is-zoomed')
      target.setAttribute('aria-pressed', String(Boolean(zoomed)))
      target.setAttribute('aria-label', zoomed ? '还原图片' : '放大图片')
    }
    if (target.dataset.photoTag) {
      document.dispatchEvent(
        new CustomEvent('journalsearch', {
          detail: target.dataset.photoTag,
        })
      )
    }
    if (target.dataset.photoAuthor)
      document.dispatchEvent(
        new CustomEvent('journalauthor', { detail: target.dataset.photoAuthor })
      )
    if (target.dataset.photoStep) {
      const pictures = photos.filter((item) => item.image)
      const index = pictures.findIndex((item) => item.id === target.dataset.currentPhoto)
      openPhoto(
        pictures[(index + Number(target.dataset.photoStep) + pictures.length) % pictures.length].id,
        true
      )
    }
    if (target.dataset.collection) openCollection(target.dataset.collection)
    if (target.dataset.collectionBrowse) {
      runtime.UI.closeDialog(true)
      const collection = runtime.Editorial.collections.find(
        (item) => item.id === target.dataset.collectionBrowse
      )
      if (collection) navigate(`/explore?collection=${encodeURIComponent(collection.id)}`)
    }
    const actions = {
      login: '/profile',
      favorites: '/profile/favorites',
    }
    if (target.dataset.action === 'search') document.dispatchEvent(new CustomEvent('journalsearch'))
    if (target.dataset.action === 'notifications')
      document.dispatchEvent(new Event('journalnotifications'))
    if (target.dataset.action === 'about') {
      const next = document.body.classList.contains('next-body')
      runtime.UI.openDialog(
        `<h2 id="dialog-title">MomiChan</h2><p class="dialog-copy">籾山ひめり / 高嶺のなでしこ<br>非官方粉丝站</p><div class="dialog-actions"><a class="button button-dark" href="${next ? 'https://momichan.com' : 'https://next.momichan.com'}">${next ? '浅色版' : '深色版'} ${icon('arrow-up-right')}</a></div>`
      )
    }
    if (target.dataset.action === 'goto-schedule') {
      runtime.UI.closeDialog(true)
      navigate('/schedule')
    }
    if (actions[target.dataset.action]) {
      runtime.UI.closeDialog(true)
      navigate(actions[target.dataset.action])
    }
    const step = target.dataset.coverStep
    const selected = target.dataset.cover
    if (step || selected !== undefined) {
      const cover = document.querySelector('[data-cover-shell]')
      if (!cover || cover.dataset.sceneMode !== 'stack') return
      const current = Number(cover.querySelector('[data-deck]')?.dataset.index ?? 0)
      const index = selected !== undefined ? Number(selected) : (current + Number(step) + 3) % 3
      changeCover(index, Number(step) || 1)
    }
  })
  listen(document, 'covergesture', (event) => {
    const current = Number(document.querySelector('[data-deck]')?.dataset.index ?? 0)
    changeCover(current + event.detail.direction, event.detail.direction)
  })
  listen(document, 'keydown', (event) => {
    if (
      document.querySelector('#app-dialog.gallery-dialog[open]:not(.journal-real-gallery)') &&
      ['ArrowLeft', 'ArrowRight'].includes(event.key)
    ) {
      event.preventDefault()
      stepGallery(event.key === 'ArrowLeft' ? -1 : 1)
      return
    }
    if (
      event.key === '/' &&
      !(
        event.target instanceof Element &&
        event.target.closest('input,textarea,select,[contenteditable]')
      )
    ) {
      const input = document.querySelector('#explore-input')
      event.preventDefault()
      if (input && !document.querySelector('#app-dialog[open]')) input.focus()
      else document.dispatchEvent(new CustomEvent('journalsearch'))
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault()
      document.dispatchEvent(new CustomEvent('journalsearch'))
    }
  })
  return {
    ...runtime,
    mount(root = document) {
      runtime.UI.hydrate(root)
      runtime.Editorial.enhance(root)
    },
    transition() {
      runtime.UI.closeDialog(true)
      runtime.Experience.routeTransition()
      runtime.Atelier.pageTransition()
    },
    dispose() {
      lifetime.abort()
      for (const observer of observers) observer.disconnect()
      for (const frame of frames) cancelAnimationFrame(frame)
      for (const node of document.querySelectorAll(
        '.experience-field,#experience-menu,.experience-curtain,.experience-cursor,.discussion-preview,.dialog-photo-flight,.book-turn-leaf'
      ))
        node.remove()
      document.body.classList.remove('menu-open', 'app-dialog-open')
    },
  }
}
