export function installSpatialMotion(runtime, environment) {
  const { document, MutationObserver, requestAnimationFrame, cancelAnimationFrame } = environment
  const { icon } = runtime.UI
  const isNext = document.body.dataset.variant === 'next'
  const asset = (name) => `/journal/${name}`
  const scenes = new Map()
  const tilts = new Map()
  const animations = new Set()
  const fullMotion = () => document.body.dataset.motion === 'full'
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)')
  const ease = 'cubic-bezier(.22,.75,.18,1)'

  function animate(element, frames, options = {}) {
    if (!element || !fullMotion() || !element.animate) return
    const animation = element.animate(frames, {
      duration: 680,
      easing: ease,
      ...options,
    })
    animations.add(animation)
    const release = () => animations.delete(animation)
    animation.addEventListener('finish', release, { once: true })
    animation.addEventListener('cancel', release, { once: true })
    return animation
  }

  function coverScene(index) {
    const stories = runtime.Editorial.stories
    return `<div class="cover-visual cover-visual--spatial">
      <span class="cover-watermark" aria-hidden="true">${isNext ? 'ARCHIVE' : 'Moments.'}</span>
      <div class="deck-scene" data-deck data-index="${index}" data-layout="stack" role="region" aria-label="精选相册" tabindex="0" aria-describedby="deck-instructions">
        <div class="deck-camera"><div class="deck-floor" aria-hidden="true"></div><div class="deck-tilt">
          ${stories.map((story, i) => `<article class="depth-card" data-deck-card="${i}" data-slot="${(i - index + stories.length) % stories.length}"><div class="depth-card-inner" ${i === index ? '' : 'inert aria-hidden="true"'}><button class="deck-photo" data-open="${story.id}" aria-label="查看${story.title}"><img src="${asset(story.image)}" alt="${story.title} · 籾山ひめり写真" width="300" height="400" ${i === index ? 'fetchpriority="high"' : ''} draggable="false"></button><div class="deck-caption"><span>0${i + 1} / <b>${story.title}</b></span><span class="deck-caption-en">${story.english}</span><button class="icon-button" data-gallery="${story.id}" aria-label="全屏查看${story.title}">${icon('expand')}</button></div></div><span class="deck-card-edge" aria-hidden="true"></span><span class="deck-glint" aria-hidden="true"></span><button class="deck-pick" data-cover="${i}" aria-label="翻到${story.title}" ${i === index ? 'hidden' : ''}><span>0${i + 1} ${story.title} ${icon('arrow-up-right')}</span></button></article>`).join('')}
        </div></div>
        <div class="deck-tools"><span id="deck-instructions">03 张照片</span><button class="deck-layout-button" data-deck-layout aria-expanded="false">${icon('grid')}<span>展开相册</span></button></div>
        <span class="sr-only" data-deck-status aria-live="polite">${stories[index].title}，第 ${index + 1} 张，共 3 张</span>
      </div>
    </div>`
  }

  function pose(slot, expanded) {
    if (expanded) {
      return [
        'translate3d(0, -6px, 95px) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(.75)',
        'translate3d(64%, 15px, -55px) rotateX(4deg) rotateY(-24deg) rotateZ(7deg) scale(.72)',
        'translate3d(-64%, 15px, -55px) rotateX(4deg) rotateY(24deg) rotateZ(-7deg) scale(.72)',
      ][slot]
    }
    return (
      isNext
        ? [
            'translate3d(-7%, 7px, 85px) rotateX(3deg) rotateY(-13deg) rotateZ(-3deg) scale(.94)',
            'translate3d(31%, -21px, -82px) rotateX(-3deg) rotateY(-26deg) rotateZ(9deg) scale(.96)',
            'translate3d(-22%, 22px, -190px) rotateX(6deg) rotateY(22deg) rotateZ(-12deg) scale(.96)',
          ]
        : [
            'translate3d(-8%, 4px, 80px) rotateX(3deg) rotateY(-9deg) rotateZ(-5deg) scale(.94)',
            'translate3d(27%, -18px, -85px) rotateX(-4deg) rotateY(-20deg) rotateZ(10deg) scale(.96)',
            'translate3d(-23%, 18px, -180px) rotateX(5deg) rotateY(22deg) rotateZ(-13deg) scale(.96)',
          ]
    )[slot]
  }

  function paint(state) {
    const expanded = state.scene.dataset.layout === 'spread'
    for (const [i, card] of state.cards.entries()) {
      const slot = (i - state.index + state.cards.length) % state.cards.length
      card.dataset.slot = slot
      card.style.setProperty('--card-pose', pose(slot, expanded))
      const inner = card.querySelector('.depth-card-inner')
      inner.inert = slot !== 0
      inner.setAttribute('aria-hidden', String(slot !== 0))
      card.querySelector('.deck-pick').hidden = slot === 0
    }
    state.scene.dataset.index = state.index
    state.scene.querySelector('[data-deck-status]').textContent =
      `${runtime.Editorial.stories[state.index].title}，第 ${state.index + 1} 张，共 3 张`
  }

  function resetTilt(state) {
    state.tilt.style.setProperty('--tilt-x', '0deg')
    state.tilt.style.setProperty('--tilt-y', '0deg')
    state.scene.style.setProperty('--glow-x', '50%')
    state.scene.style.setProperty('--glow-y', '30%')
  }

  function requestStep(state, direction) {
    state.scene.dispatchEvent(
      new CustomEvent('covergesture', {
        bubbles: true,
        detail: { direction },
      })
    )
  }

  function releaseDrag(state, event, cancelled = false) {
    const drag = state.drag
    if (!drag || (event && drag.id !== event.pointerId)) return
    state.drag = null
    state.scene.classList.remove('is-dragging')
    const card = state.cards[state.index]
    card.style.removeProperty('--drag-x')
    card.style.removeProperty('--drag-turn')
    if (state.scene.hasPointerCapture(drag.id)) state.scene.releasePointerCapture(drag.id)
    if (drag.locked) state.suppressClickUntil = performance.now() + 400
    if (!cancelled && drag.locked && Math.abs(drag.dx) > 42)
      requestStep(state, drag.dx < 0 ? 1 : -1)
    resetTilt(state)
  }

  function bindScene(scene) {
    if (scenes.has(scene)) return
    const state = {
      scene,
      index: Number(scene.dataset.index),
      cards: [...scene.querySelectorAll('[data-deck-card]')],
      tilt: scene.querySelector('.deck-tilt'),
      drag: null,
      suppressClickUntil: 0,
      frame: 0,
    }
    scenes.set(scene, state)
    paint(state)
    scene.addEventListener('pointermove', (event) => {
      if (state.drag && event.pointerId === state.drag.id) {
        const drag = state.drag
        const dx = event.clientX - drag.x
        const dy = event.clientY - drag.y
        if (!drag.locked && Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
          releaseDrag(state, event, true)
          return
        }
        if (!drag.locked && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
          drag.locked = true
          scene.setPointerCapture(event.pointerId)
          scene.classList.add('is-dragging')
        }
        if (drag.locked) {
          drag.dx = dx
          if (fullMotion()) {
            const distance = Math.max(-110, Math.min(110, dx))
            state.cards[state.index].style.setProperty('--drag-x', `${distance}px`)
            state.cards[state.index].style.setProperty('--drag-turn', `${distance / 10}deg`)
          }
        }
        return
      }
      if (!fullMotion() || !finePointer.matches || event.pointerType !== 'mouse') return
      cancelAnimationFrame(state.frame)
      state.frame = requestAnimationFrame(() => {
        const box = scene.getBoundingClientRect()
        const x = Math.max(0, Math.min(1, (event.clientX - box.left) / box.width))
        const y = Math.max(0, Math.min(1, (event.clientY - box.top) / box.height))
        state.tilt.style.setProperty('--tilt-x', `${(0.5 - y) * 9}deg`)
        state.tilt.style.setProperty('--tilt-y', `${(x - 0.5) * 13}deg`)
        scene.style.setProperty('--glow-x', `${x * 100}%`)
        scene.style.setProperty('--glow-y', `${y * 100}%`)
      })
    })
    scene.addEventListener('pointerleave', () => {
      cancelAnimationFrame(state.frame)
      if (!state.drag) resetTilt(state)
    })
    scene.addEventListener('pointerdown', (event) => {
      if (
        event.button !== 0 ||
        !event.isPrimary ||
        event.target.closest('[data-gallery], [data-deck-layout]')
      )
        return
      state.drag = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        dx: 0,
        locked: false,
      }
    })
    scene.addEventListener('pointerup', (event) => releaseDrag(state, event))
    scene.addEventListener('pointercancel', (event) => releaseDrag(state, event, true))
    scene.addEventListener('lostpointercapture', (event) => {
      if (event.target === scene) releaseDrag(state, event, true)
    })
    scene.addEventListener(
      'click',
      (event) => {
        if (performance.now() < state.suppressClickUntil) {
          state.suppressClickUntil = 0
          event.preventDefault()
          event.stopImmediatePropagation()
        }
      },
      true
    )
    scene.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
      event.preventDefault()
      requestStep(state, event.key === 'ArrowRight' ? 1 : -1)
      scene.focus({ preventScroll: true })
    })
    scene.querySelector('[data-deck-layout]').addEventListener('click', (event) => {
      const expanded = scene.dataset.layout !== 'spread'
      scene.dataset.layout = expanded ? 'spread' : 'stack'
      const button = event.currentTarget
      button.setAttribute('aria-expanded', String(expanded))
      button.querySelector('span').textContent = expanded ? '收起相册' : '展开相册'
      for (const card of state.cards) card.getAnimations().forEach((a) => a.cancel())
      paint(state)
    })
    for (const card of state.cards) {
      const end = card.style.getPropertyValue('--card-pose')
      animate(
        card,
        [
          {
            transform:
              'translate3d(12%, 45px, -420px) rotateX(20deg) rotateY(-28deg) rotateZ(5deg) scale(.75)',
            opacity: 0,
          },
          { transform: end, opacity: 1 },
        ],
        { duration: 820, delay: (2 - Number(card.dataset.slot)) * 65 }
      )
    }
  }

  function bindCollection(card) {
    if (tilts.has(card)) return
    const art = card.querySelector('.collection-art')
    const state = { art, frame: 0 }
    tilts.set(card, state)
    card.addEventListener('pointermove', (event) => {
      if (!fullMotion() || !finePointer.matches || event.pointerType !== 'mouse') return
      cancelAnimationFrame(state.frame)
      state.frame = requestAnimationFrame(() => {
        const box = card.getBoundingClientRect()
        const x = Math.max(0, Math.min(1, (event.clientX - box.left) / box.width))
        const y = Math.max(0, Math.min(1, (event.clientY - box.top) / box.height))
        art.style.setProperty('--album-x', `${(0.5 - y) * 12}deg`)
        art.style.setProperty('--album-y', `${(x - 0.5) * 16}deg`)
        art.style.setProperty('--album-light', `${x * 100}%`)
      })
    })
    card.addEventListener('pointerleave', () => {
      cancelAnimationFrame(state.frame)
      art.style.removeProperty('--album-x')
      art.style.removeProperty('--album-y')
    })
  }

  function mount(root = document) {
    for (const [scene, state] of scenes)
      if (!scene.isConnected) {
        cancelAnimationFrame(state.frame)
        scenes.delete(scene)
      }
    for (const [card, state] of tilts)
      if (!card.isConnected) {
        cancelAnimationFrame(state.frame)
        tilts.delete(card)
      }
    root.querySelectorAll('[data-deck]').forEach(bindScene)
    root.querySelectorAll('.collection-card').forEach(bindCollection)
  }

  function changeCover(cover, index, direction = 1) {
    const state = scenes.get(cover.querySelector('[data-deck]'))
    if (!state || state.index === index) return
    const previous = state.index
    const start = new Map(state.cards.map((card) => [card, getComputedStyle(card).transform]))
    for (const card of state.cards) card.getAnimations().forEach((a) => a.cancel())
    state.index = index
    paint(state)
    if (!fullMotion()) return
    for (const [i, card] of state.cards.entries()) {
      const end = card.style.getPropertyValue('--card-pose')
      const frames = [{ transform: start.get(card), offset: 0 }]
      if (i === previous && state.scene.dataset.layout === 'stack') {
        frames.push({
          transform: `translate3d(${direction > 0 ? -69 : 69}%, -12px, 140px) rotateX(7deg) rotateY(${direction > 0 ? -39 : 39}deg) rotateZ(${direction > 0 ? -17 : 17}deg) scale(.88)`,
          offset: 0.42,
        })
      }
      frames.push({ transform: end, offset: 1 })
      animate(card, frames, { duration: isNext ? 840 : 920 })
    }
    animate(
      cover.querySelector('.cover-copy'),
      [
        { opacity: 0, transform: `translateY(13px)` },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 420 }
    )
  }

  function layout(container, update) {
    if (!container || !fullMotion()) {
      update()
      return
    }
    const cards = [...container.querySelectorAll('.post-card')]
    cards.forEach((card) => card.getAnimations().forEach((a) => a.cancel()))
    const before = new Map(cards.map((card) => [card, card.getBoundingClientRect()]))
    update()
    cards.forEach((card, index) => {
      const old = before.get(card)
      const current = card.getBoundingClientRect()
      if (!old.width || !current.width) return
      animate(
        card,
        [
          {
            transformOrigin: '0 0',
            transform: `translate(${old.left - current.left}px, ${old.top - current.top}px) scale(${old.width / current.width}, ${old.height / current.height})`,
          },
          { transformOrigin: '0 0', transform: 'translate(0, 0) scale(1, 1)' },
        ],
        { duration: 520, delay: Math.min(index * 18, 90) }
      )
    })
  }

  function dialog(element) {
    if (element.classList.contains('gallery-dialog')) return
    const content = element.querySelector('#dialog-content')
    content.getAnimations().forEach((a) => a.cancel())
    animate(
      content,
      [
        {
          opacity: 0.3,
          transform: 'perspective(1000px) translateY(20px) rotateX(-7deg) scale(.98)',
          transformOrigin: '50% 100%',
        },
        {
          opacity: 1,
          transform: 'perspective(1000px) translateY(0) rotateX(0deg) scale(1)',
          transformOrigin: '50% 100%',
        },
      ],
      { duration: 360 }
    )
  }

  new MutationObserver(() => {
    if (fullMotion()) return
    for (const animation of [...animations]) animation.cancel()
    for (const state of scenes.values()) {
      cancelAnimationFrame(state.frame)
      releaseDrag(state, null, true)
      resetTilt(state)
    }
    for (const { art, frame } of tilts.values()) {
      cancelAnimationFrame(frame)
      art.style.removeProperty('--album-x')
      art.style.removeProperty('--album-y')
    }
  }).observe(document.body, {
    attributes: true,
    attributeFilter: ['data-motion'],
  })
  runtime.SpatialMotion = { coverScene, mount, changeCover, layout, dialog }
}
