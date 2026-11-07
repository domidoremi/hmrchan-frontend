export function installAtelier(runtime, environment) {
  const { createVisibilityObserver } = environment
  const { document, addEventListener, MutationObserver, requestAnimationFrame } = environment
  const { icon } = runtime.UI
  const isNext = document.body.dataset.variant === 'next'
  const asset = (name) => `/journal/${name}`
  const fullMotion = () => document.body.dataset.motion === 'full'
  const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n))
  const animations = new Set()
  let sections = []
  let heroElement
  let frame = 0
  let sourceImage
  let dialogOrigin
  let returnAnimation
  let revealObserver

  function animate(element, keyframes, options) {
    if (!element || !fullMotion()) return
    const animation = element.animate(keyframes, {
      duration: 780,
      easing: 'cubic-bezier(.22,1,.36,1)',
      ...options,
    })
    animations.add(animation)
    const release = () => animations.delete(animation)
    animation.finished.then(release, release)
    return animation
  }

  function hero(index) {
    const story = runtime.Editorial.stories[index]
    const title = isNext ? story.titleB : story.titleA
    return `<section class="atelier-cover ${isNext ? 'atelier-cover--night' : 'atelier-cover--paper'}" data-cover-shell data-scene-mode="orbit" data-story="${story.color}" aria-label="精选照片">
      <div class="atelier-hero-meta"><span>籾山ひめり / 高嶺のなでしこ</span><span>PHOTO JOURNAL — 03</span><span>NOV. 2026</span></div>
      <div class="atelier-masthead" aria-hidden="true">${[...'HIMERI'].map((letter, i) => `<span style="--letter:${i}"><i>${letter}</i></span>`).join('')}<sup>03</sup></div>
      <div class="atelier-composition">
        <div class="cover-copy atelier-copy"><div class="atelier-kicker"><span>0${index + 1}</span><span>${story.tag}<br><small>${story.english}</small></span></div><h1 class="cover-title">${title[0]}<br><em>${title[1]}</em></h1><div class="cover-actions"><button class="atelier-round-link" data-open="${story.id}"><span>查看照片</span><b>${icon('arrow-up-right')}</b></button></div></div>
        ${runtime.SpatialMotion.coverScene(index)}
        ${runtime.Experience.ring()}${runtime.Experience.modes()}
        <div class="atelier-side-note"><span class="atelier-side-no">03</span><span>PHOTO<br>SELECTION</span><i aria-hidden="true">✳</i></div>
        <span class="atelier-registration atelier-registration--one" aria-hidden="true">+</span><span class="atelier-registration atelier-registration--two" aria-hidden="true">+</span>
      </div>
      <div class="atelier-cover-footer"><a href="#explore" class="atelier-all">全部动态 ${icon('arrow-up-right')}</a><div class="cover-selectors" aria-label="选择封面">${runtime.Editorial.stories.map((s, i) => `<button data-cover="${i}" class="cover-selector ${i === index ? 'active' : ''}" aria-pressed="${i === index}" aria-label="封面 ${i + 1}：${s.title}"><span><small>0${i + 1}</small>${s.title}</span></button>`).join('')}</div><div class="cover-arrows"><button class="icon-button" data-cover-step="-1" aria-label="上一张封面">${icon('arrow-left')}</button><span aria-live="polite">0${index + 1}<i> / 03</i></span><button class="icon-button" data-cover-step="1" aria-label="下一张封面">${icon('arrow')}</button></div></div>
    </section>`
  }

  function index() {
    return `<nav class="atelier-index" aria-label="本页章节"><a href="#explore"><small>01 / UPDATES</small><span>最近更新</span>${icon('arrow-up-right')}</a><button data-scroll-section="collections"><small>02 / COLLECTIONS</small><span>主题合集</span>${icon('arrow-up-right')}</button><a href="#schedule"><small>03 / SCHEDULE</small><span>活动日程</span>${icon('arrow-up-right')}</a></nav>`
  }

  function heading(number, title, english, action = '') {
    return `<div class="atelier-section-heading"><span class="atelier-section-index">${number} /</span><div><span>${english}</span><h2>${title}</h2></div>${action}</div>`
  }

  function collections() {
    return `<section class="archive-scroll" id="collections" aria-label="主题合集"><div class="archive-pin"><div class="archive-heading"><span>02 / COLLECTIONS</span><h2>主题合集</h2><span class="archive-range">01 — 03</span></div><div class="archive-stage"><span class="archive-backtype" aria-hidden="true">Selected.</span>${runtime.Editorial.collections.map((c, i) => `<button class="archive-panel archive-panel--${c.theme}" data-archive-card="${i}" data-collection="${c.id}" aria-label="查看合集：${c.title}"><span class="archive-panel-top"><span>VOL. ${c.index}</span>${icon('arrow-up-right')}</span><div class="archive-picture"><img src="${asset(c.cover)}" alt="${c.title}" width="600" height="800" loading="lazy"><img class="archive-inset" src="${asset(c.second)}" alt="" width="180" height="240" loading="lazy"></div><span class="archive-panel-bottom"><b>${c.title}</b><small>${c.posts.length} 张照片</small></span></button>`).join('')}</div><div class="archive-bottom"><span>写真 / 日常 / 舞台</span><span class="archive-progress" aria-hidden="true"><i></i></span><span>MOMICHAN — SELECTED PHOTOS</span></div></div></section>`
  }

  function schedule(cards) {
    return `<section class="atelier-schedule" data-reveal>${heading('03', '活动日程', 'ON THE CALENDAR', `<a class="text-button" href="#schedule">全部日程 ${icon('arrow-up-right')}</a>`)}<div class="atelier-schedule-grid"><div class="atelier-calendar-art"><span>NOV<span>2026</span></span><img src="${asset('stage-moment.webp')}" alt="舞台造型" width="400" height="500" loading="lazy"><i aria-hidden="true">11</i></div><div class="atelier-events">${cards}</div></div></section>`
  }

  function community(rows) {
    return `<section class="atelier-community" data-reveal><div class="atelier-community-lead"><span>04 / COMMUNITY</span><h2>最近<br>在聊什么<span aria-hidden="true">↗</span></h2><a class="atelier-round-link" href="#community"><span>全部讨论</span><b>${icon('arrow-up-right')}</b></a></div><div class="atelier-discussions">${rows}</div></section>`
  }

  function renderScroll() {
    frame = 0
    const moving = fullMotion()
    if (heroElement?.isConnected) {
      const box = heroElement.getBoundingClientRect()
      const progress = moving ? clamp(-box.top / box.height) : 0
      heroElement.style.setProperty('--hero-progress', progress.toFixed(3))
    }
    for (const section of sections) {
      if (!section.isConnected) continue
      const pin = section.querySelector('.archive-pin')
      const stage = section.querySelector('.archive-stage')
      const active = moving && innerWidth > 900
      if (!active) {
        section.style.setProperty('--archive-progress', 1)
        section
          .querySelectorAll('[data-archive-card]')
          .forEach((card) => card.style.removeProperty('transform'))
        continue
      }
      const box = section.getBoundingClientRect()
      const top = parseFloat(getComputedStyle(pin).top) || 0
      const progress = clamp((top - box.top) / Math.max(1, box.height - pin.offsetHeight))
      const eased = progress * progress * (3 - 2 * progress)
      section.style.setProperty('--archive-progress', progress.toFixed(3))
      if (box.bottom < 0 || box.top > innerHeight) continue
      const width = stage.clientWidth
      section.querySelectorAll('[data-archive-card]').forEach((card, i) => {
        const lane = i - 1
        const x = lane * width * (0.1 + eased * 0.24)
        const y = (i === 1 ? -20 : 35) * (1 - eased) + (i === 1 ? 16 : 0) * eased
        const z = (i === 1 ? 100 : -100) * (1 - eased)
        const rotate = lane * (13 - eased * 13)
        const rotateY = lane * (-17 + eased * 17)
        card.style.transform = `translate3d(${x}px,${y}px,${z}px) rotateY(${rotateY}deg) rotate(${rotate}deg) scale(${0.88 + eased * 0.12})`
      })
    }
  }

  function scheduleScroll() {
    if (!frame) frame = requestAnimationFrame(renderScroll)
  }

  function mount(root = document) {
    document
      .querySelectorAll('.next-sidebar .sidebar-nav a, .next-sidebar .sidebar-nav button')
      .forEach((link) => {
        const label =
          link.dataset.page === 'home'
            ? '首页'
            : link.dataset.page === 'explore'
              ? '动态'
              : link.dataset.page === 'schedule'
                ? '日程'
                : link.dataset.page === 'community'
                  ? '社区'
                  : link.dataset.page === 'favorites'
                    ? '收藏'
                    : '搜索'
        link.dataset.navLabel = label
        link.setAttribute('aria-label', label)
      })
    heroElement = document.querySelector('.atelier-cover')
    sections = [...document.querySelectorAll('.archive-scroll')]
    revealObserver?.disconnect()
    const targets = root.querySelectorAll(
      '.journal-grid .post-card, .atelier-section-heading h2, .atelier-community-lead h2'
    )
    if (fullMotion() && 'IntersectionObserver' in window) {
      revealObserver = createVisibilityObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return
            const element = entry.target
            animate(
              element,
              [
                {
                  clipPath: 'inset(14% 0 86% 0)',
                  transform: 'translateY(44px)',
                },
                { clipPath: 'inset(0% 0 0% 0)', transform: 'translateY(0)' },
              ],
              {
                duration: 950,
                delay: Number(element.dataset.stagger || 0) * 65,
              }
            )
            revealObserver.unobserve(element)
          })
        },
        { threshold: 0.12 }
      )
      targets.forEach((el, i) => {
        el.dataset.stagger = i % 3
        revealObserver.observe(el)
      })
    }
    root.querySelectorAll('.atelier-masthead i').forEach((letter, i) => {
      animate(
        letter,
        [
          { transform: 'translateY(108%) rotate(7deg)' },
          { transform: 'translateY(0) rotate(0deg)' },
        ],
        { duration: 1000, delay: 55 * i }
      )
    })
    renderScroll()
  }

  function pageTransition() {
    const page = document.querySelector('#main-content > div')
    animate(
      page,
      [
        {
          opacity: 0.3,
          transform: 'translateY(30px)',
          clipPath: 'inset(0 0 8% 0)',
        },
        { opacity: 1, transform: 'translateY(0)', clipPath: 'inset(0 0 0 0)' },
      ],
      { duration: 650 }
    )
  }

  // Keep the photo in the dialog's top layer while it moves from its source.
  function clearDialogFlight(element, discardSource = false) {
    returnAnimation?.cancel()
    returnAnimation = null
    element.querySelectorAll('.atelier-image-flight').forEach((image) => {
      image.getAnimations().forEach((animation) => animation.cancel())
      image.remove()
    })
    if (discardSource) sourceImage = null
  }
  function dialog(element) {
    returnAnimation?.cancel()
    returnAnimation = null
    const source = sourceImage
    sourceImage = null
    if (runtime.Experience?.dialogBook(element)) return
    if (!source || !fullMotion() || performance.now() - source.time > 650) return
    const target = element.querySelector(
      '.detail-photo, .gallery-image, .collection-dialog-cover > img'
    )
    if (!target || (target.currentSrc && !target.currentSrc.endsWith(source.filename))) return
    element
      .querySelector('#dialog-content')
      .getAnimations()
      .forEach((animation) => animation.cancel())
    const rect = target.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const image = target.cloneNode()
    image.removeAttribute('id')
    image.removeAttribute('class')
    image.className = 'atelier-image-flight'
    image.alt = ''
    image.setAttribute('aria-hidden', 'true')
    Object.assign(image.style, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      objectPosition: getComputedStyle(target).objectPosition,
    })
    element.append(image)
    target.style.opacity = '0'
    const flight = animate(
      image,
      [
        {
          transform: `translate(${source.rect.left - rect.left}px,${source.rect.top - rect.top}px) scale(${source.rect.width / rect.width},${source.rect.height / rect.height})`,
          borderRadius: '3px',
        },
        { transform: 'translate(0,0) scale(1)', borderRadius: '0px' },
      ],
      { duration: 680 }
    )
    const done = () => {
      target.style.removeProperty('opacity')
      image.remove()
    }
    flight?.finished.then(done, done)
    if (!flight) done()
  }

  function closeDialog(element, immediate = false) {
    const origin = dialogOrigin
    dialogOrigin = null
    returnAnimation?.cancel()
    returnAnimation = null
    if (immediate || !element.open || !fullMotion() || !origin?.element.isConnected) return false
    const current = element.querySelector(
      '.detail-photo, .gallery-image, .collection-dialog-cover > img'
    )
    if (!current || !current.src.endsWith(origin.filename)) return false
    const destination = origin.element.getBoundingClientRect()
    const from = current.getBoundingClientRect()
    if (
      destination.bottom <= 70 ||
      destination.top >= innerHeight ||
      !destination.width ||
      !from.width
    )
      return false
    const clone = current.cloneNode()
    clone.removeAttribute('class')
    clone.removeAttribute('id')
    clone.className = 'photo-return-flight'
    clone.alt = ''
    clone.setAttribute('aria-hidden', 'true')
    Object.assign(clone.style, {
      left: `${from.left}px`,
      top: `${from.top}px`,
      width: `${from.width}px`,
      height: `${from.height}px`,
      opacity: '1',
      objectPosition: getComputedStyle(current).objectPosition,
    })
    element.querySelectorAll('.atelier-image-flight').forEach((image) => {
      image.getAnimations().forEach((a) => a.cancel())
      image.remove()
    })
    element.close()
    document.body.append(clone)
    origin.element.style.opacity = '0'
    returnAnimation = animate(
      clone,
      [
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        {
          transform: `translate(${destination.left - from.left}px,${destination.top - from.top}px) scale(${destination.width / from.width},${destination.height / from.height})`,
          opacity: 1,
        },
      ],
      { duration: 560 }
    )
    const finish = () => {
      clone.remove()
      origin.element.style.removeProperty('opacity')
      if (origin.trigger?.isConnected) origin.trigger.focus({ preventScroll: true })
    }
    returnAnimation?.finished.then(finish, () => {
      clone.remove()
      origin.element.style.removeProperty('opacity')
    })
    if (!returnAnimation) finish()
    return true
  }

  document.addEventListener(
    'click',
    (event) => {
      const button = event.target.closest('[data-open], [data-gallery], [data-collection]')
      const cover = button?.closest('[data-cover-shell]')
      const image =
        button?.querySelector('img') ||
        button?.closest('.post-card')?.querySelector('.post-media img') ||
        button?.closest('.depth-card')?.querySelector('.deck-photo img') ||
        cover?.querySelector(
          cover.dataset.sceneMode === 'orbit'
            ? '.orbit-card.is-current img'
            : '.depth-card[data-slot="0"] .deck-photo img'
        )
      if (!image || !fullMotion()) {
        sourceImage = null
        return
      }
      const rect = image.getBoundingClientRect()
      if (rect.bottom <= 0 || rect.top >= innerHeight) return
      sourceImage = {
        rect,
        filename: image.src.split('/').pop(),
        time: performance.now(),
        element: image,
        trigger: button,
      }
      if (!button.closest('#app-dialog')) dialogOrigin = sourceImage
    },
    true
  )
  addEventListener('scroll', scheduleScroll, { passive: true })
  addEventListener('resize', scheduleScroll, { passive: true })
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) scheduleScroll()
  })
  new MutationObserver(() => {
    if (!fullMotion()) {
      for (const animation of [...animations]) animation.cancel()
      revealObserver?.disconnect()
    }
    scheduleScroll()
  }).observe(document.body, {
    attributes: true,
    attributeFilter: ['data-motion'],
  })
  runtime.Atelier = {
    hero,
    index,
    heading,
    collections,
    schedule,
    community,
    mount,
    pageTransition,
    dialog,
    closeDialog,
    clearDialogFlight,
  }
}
