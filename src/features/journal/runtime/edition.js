export function installEditorial(runtime, environment) {
  const { createVisibilityObserver, matchMedia } = environment
  const { document, addEventListener, requestAnimationFrame } = environment
  const { icon, escape: esc, read, save, openDialog } = runtime.UI
  const asset = (name) => `/journal/${name}`
  const stories = [
    {
      id: 'garden',
      title: '树下随拍',
      english: 'An afternoon outside.',
      titleA: ['几张近照，', '一些日常。'],
      titleB: ['写真、舞台，', '还有日常。'],
      description: '籾山ひめり / 高嶺のなでしこ\n最近的照片、节目与舞台。',
      image: 'himeri-garden.webp',
      secondary: 'stage-moment.webp',
      secondaryId: 'stage',
      caption: 'MOMIYAMA HIMERI / PHOTO NOTES',
      color: 'lavender',
      tag: '日常 · 写真',
    },
    {
      id: 'pink',
      title: '黑与粉',
      english: 'Black, pink & portraits.',
      titleA: ['黑色与粉色，', '这次的合照。'],
      titleB: ['蝴蝶结，', '还有双人合照。'],
      description: '蝴蝶结、蓬松裙摆。\n这组照片里有不少造型细节。',
      image: 'himeri-portrait.webp',
      secondary: 'pink-moment.webp',
      secondaryId: 'shop',
      caption: 'PORTRAIT STUDIES / BLACK & PINK',
      color: 'rose',
      tag: '造型 · 合照',
    },
    {
      id: 'stage',
      title: '舞台照片',
      english: 'From the stage.',
      titleA: ['这场舞台，', '再看几张。'],
      titleB: ['几张舞台照，', '一段现场回顾。'],
      description: '高嶺のなでしこ\n舞台造型、演出照片与节目合照。',
      image: 'stage-moment.webp',
      secondary: 'nadeshiko-radio.webp',
      secondaryId: 'radio',
      caption: 'TAKANE NO NADESHIKO / STAGE MEMORIES',
      color: 'sage',
      tag: '舞台 · 出演',
    },
  ]
  const collections = [
    {
      id: 'letters',
      title: '日常照片',
      english: 'Everyday photos.',
      note: '户外随拍、相册与手账。',
      theme: 'lavender',
      cover: 'himeri-garden.webp',
      second: 'nadeshiko-memory.webp',
      posts: ['garden', 'memory'],
      index: '01',
    },
    {
      id: 'daydream',
      title: '造型合集',
      english: 'Outfits & portraits.',
      note: '服装细节与双人合照。',
      theme: 'rose',
      cover: 'himeri-portrait.webp',
      second: 'pink-moment.webp',
      posts: ['pink', 'shop'],
      index: '02',
    },
    {
      id: 'encore',
      title: '舞台记录',
      english: 'On stage.',
      note: '演出、节目与应援。',
      theme: 'sage',
      cover: 'stage-moment.webp',
      second: 'nadeshiko-radio.webp',
      posts: ['stage', 'radio', 'cheer'],
      index: '03',
    },
  ]
  const validView = (value) => (['grid', 'wall', 'list'].includes(value) ? value : 'grid')
  let preferences = read('reading', { motion: null, largeText: false })
  if (!preferences || typeof preferences !== 'object')
    preferences = { motion: null, largeText: false }
  const systemMotion = matchMedia('(prefers-reduced-motion: reduce)')
  function syncMotionControls() {
    const enabled = document.body.dataset.motion === 'full'
    const label = `${preferences.motion === null ? '跟随系统 · ' : ''}${enabled ? '已开启' : '已关闭'}`
    document.querySelectorAll('[data-motion-enable]').forEach((button) => {
      button.hidden = enabled
    })
    document.querySelectorAll('[data-motion-status]').forEach((status) => {
      status.textContent = label
    })
    document.querySelectorAll('[data-preference="motion"]').forEach((button) => {
      button.setAttribute('aria-checked', String(enabled))
    })
  }
  function applyPreferences() {
    const previous = document.body.dataset.motion
    document.body.dataset.motion =
      preferences.motion === true || (!systemMotion.matches && preferences.motion !== false)
        ? 'full'
        : 'reduced'
    document.body.classList.toggle('reading-large', preferences.largeText === true)
    syncMotionControls()
    if (previous === 'reduced' && document.body.dataset.motion === 'full')
      requestAnimationFrame(() => enhance())
  }
  applyPreferences()
  systemMotion.addEventListener('change', applyPreferences)

  function hero(index = 0) {
    return runtime.Atelier.hero(index)
  }

  function sectionHeading(number, title, english, action = '') {
    return `<div class="editorial-heading"><div class="editorial-heading-main"><span class="chapter-number">${number}</span><div><span class="eyebrow">${english}</span><h2>${title}</h2></div></div>${action}</div>`
  }
  function collectionSection() {
    return `<section class="collection-section" data-reveal>${sectionHeading('02', '主题合集', 'COLLECTIONS', '<span class="section-side-note">写真 / 日常 / 舞台</span>')}<div class="collection-grid">${collections.map((collection) => `<button class="collection-card collection--${collection.theme}" data-collection="${collection.id}" aria-label="打开主题合集：${collection.title}"><div class="collection-art"><span class="collection-art-label">MOMICHAN<br>CURATED EDITION</span><span class="collection-art-number">${collection.index}</span><img class="collection-cover" src="${asset(collection.cover)}" alt="${collection.title}" width="300" height="400" loading="lazy"><img class="collection-second" src="${asset(collection.second)}" alt="" width="300" height="400" loading="lazy"><span class="collection-script">${collection.english}</span><span class="collection-seal" aria-hidden="true">✳</span></div><div class="collection-info"><div><span class="collection-count">${String(collection.posts.length).padStart(2, '0')} 条动态</span><h3>${collection.title}</h3><p>${collection.note}</p></div><span class="circle-arrow">${icon('arrow-up-right')}</span></div></button>`).join('')}</div></section>`
  }
  function interlude() {
    return `<section class="editorial-interlude" data-reveal><span class="interlude-index">PHOTO JOURNAL / NOV. 2026</span><div class="interlude-quote"><h2>籾山ひめり<br>高嶺のなでしこ</h2><p>MOMIYAMA HIMERI / TAKANE NO NADESHIKO</p></div><div class="interlude-mark" aria-hidden="true">✳</div><span class="interlude-sign">MomiChan</span></section>`
  }
  function communitySpotlight() {
    return `<section class="community-spotlight" data-reveal><div class="community-spotlight-art"><span>COMMUNITY</span><div class="community-photo community-photo-one"><img src="${asset('stage-moment.webp')}" alt="舞台写真" width="300" height="400" loading="lazy"></div><div class="community-photo community-photo-two"><img src="${asset('himeri-garden.webp')}" alt="日常写真" width="300" height="400" loading="lazy"></div><b aria-hidden="true">✳</b><i>on repeat.</i></div><div class="community-spotlight-copy"><span class="eyebrow">THIS WEEK'S TOPIC</span><h2>最近循环的，<br>是哪首歌？</h2><p>新歌、老歌，或是某一场的现场版。</p><div><button class="button button-dark" data-discussion="d3">看看讨论 ${icon('arrow-up-right')}</button><a class="text-button" href="#community">社区 ${icon('arrow')}</a></div></div></section>`
  }
  function browserToolbar(view, count, label = '条动态') {
    return `<div class="browser-toolbar"><p id="results-count" class="results-count" aria-live="polite">${count} ${label}</p><div class="view-toggle" aria-label="浏览布局"><button data-layout="grid" class="${view === 'grid' ? 'active' : ''}" aria-pressed="${view === 'grid'}" aria-label="画廊视图">${icon('grid')}<span>画廊</span></button><button data-layout="wall" class="${view === 'wall' ? 'active' : ''}" aria-pressed="${view === 'wall'}" aria-label="相纸视图">${icon('image')}<span>相纸</span></button><button data-layout="list" class="${view === 'list' ? 'active' : ''}" aria-pressed="${view === 'list'}" aria-label="列表视图">${icon('list')}<span>列表</span></button></div></div>`
  }
  function filterBar(selected, collection) {
    return `<div class="refine-bar"><span class="refine-label">${icon('filter')} 内容类型</span><div class="type-filters">${['全部', '写真', '文字', '节目', '出演', '应援'].map((type) => `<button class="type-filter ${selected === type ? 'active' : ''}" data-type="${type}" aria-pressed="${selected === type}">${type}</button>`).join('')}</div>${collection ? `<button class="collection-filter-badge" data-action="clear-collection">${esc(collection.title)} ${icon('x')}</button>` : ''}</div>`
  }
  function favoritesBanner(count) {
    return `<section class="favorites-banner"><span class="favorites-monogram" aria-hidden="true">m.</span><div><span class="eyebrow">SAVED</span><h2>已收藏</h2><p>${count ? `${count} 条动态` : '还没有收藏'}</p></div><span class="favorites-total">${String(count).padStart(2, '0')}<small>ITEMS</small></span></section>`
  }
  function appearance() {
    openDialog(
      `<div class="appearance-heading"><span class="eyebrow">DISPLAY</span><h2 id="dialog-title">显示设置</h2></div><div class="preference-row"><div><h3>大号文字</h3></div><button class="switch" role="switch" aria-checked="${preferences.largeText === true}" data-preference="largeText" aria-label="大号文字"><span></span></button></div><div class="preference-row"><div><h3>动画效果</h3><small class="journal-motion-status" data-motion-status></small></div><button class="switch" role="switch" aria-checked="${document.body.dataset.motion === 'full'}" data-preference="motion" aria-label="动画效果"><span></span></button></div><div class="dialog-actions"><button class="button button-dark" data-close>完成 ${icon('check')}</button></div>`,
      'appearance-dialog'
    )
    syncMotionControls()
  }
  let observer
  function enhance(root = document) {
    runtime.SpatialMotion?.mount(root)
    runtime.Atelier?.mount(root)
    runtime.Experience?.mount(root)
    syncMotionControls()
    const targets = document.querySelectorAll('[data-reveal]')
    observer?.disconnect()
    updateProgress()
    if (document.body.dataset.motion === 'reduced' || !('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-visible'))
      return
    }
    observer = createVisibilityObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        }),
      { threshold: 0.06 }
    )
    targets.forEach((el) => observer.observe(el))
  }
  function updateProgress() {
    const max = document.documentElement.scrollHeight - innerHeight
    const progress = document.querySelector('.reading-progress')
    if (progress) progress.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`
    const top = document.querySelector('.back-to-top')
    if (top) top.hidden = scrollY < 650
    document.body.classList.toggle('has-scrolled', scrollY > 30)
  }
  let scheduled = false
  addEventListener(
    'scroll',
    () => {
      if (scheduled) return
      scheduled = true
      requestAnimationFrame(() => {
        updateProgress()
        scheduled = false
      })
    },
    { passive: true }
  )
  addEventListener('resize', updateProgress, { passive: true })
  document.addEventListener('click', (event) => {
    const button = event.target.closest('button')
    if (!button) return
    if (button.hasAttribute('data-motion-enable')) {
      preferences.motion = true
      save('reading', preferences)
      applyPreferences()
      const cover = button.closest('[data-cover-shell]')
      cover
        ?.querySelector('[data-scene-mode="' + cover.dataset.sceneMode + '"]')
        ?.focus({ preventScroll: true })
    }
    if (button.dataset.preference) {
      const key = button.dataset.preference
      if (!['motion', 'largeText'].includes(key)) return
      preferences[key] =
        key === 'motion' ? document.body.dataset.motion !== 'full' : preferences.largeText !== true
      save('reading', preferences)
      applyPreferences()
      button.setAttribute('aria-checked', preferences[key])
      updateProgress()
    }
    if (button.dataset.action === 'appearance') appearance()
    if (button.dataset.action === 'top')
      scrollTo({
        top: 0,
        behavior: document.body.dataset.motion === 'reduced' ? 'instant' : 'smooth',
      })
  })
  addEventListener('storage', (event) => {
    if (event.key === 'momichan-journal:reading') {
      preferences = read('reading', { motion: null, largeText: false })
      applyPreferences()
    }
  })
  runtime.Editorial = {
    stories,
    collections,
    hero,
    sectionHeading,
    collectionSection,
    interlude,
    communitySpotlight,
    browserToolbar,
    filterBar,
    favoritesBanner,
    validView,
    enhance,
  }
}
