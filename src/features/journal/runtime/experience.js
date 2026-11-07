export function installExperience(runtime, environment) {
  const {
    document,
    addEventListener,
    MutationObserver,
    requestAnimationFrame,
    cancelAnimationFrame,
  } = environment
  const { icon, escape: esc } = runtime.UI
  const night = document.body.dataset.variant === 'next'
  const asset = (name) => `/journal/${name}`
  const motion = () => document.body.dataset.motion === 'full'
  const fine = matchMedia('(pointer: fine) and (hover: hover)')
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v))
  const pages = [
    ['home', '首页', 'Home', 'himeri-garden.webp'],
    ['explore', '动态', 'Photos', 'himeri-portrait.webp'],
    ['schedule', '日程', 'Schedule', 'stage-moment.webp'],
    ['community', '社区', 'Community', 'nadeshiko-radio.webp'],
    ['favorites', '收藏', 'Saved', 'nadeshiko-memory.webp'],
  ]
  const photos = [
    ['garden', '树下随拍', 'himeri-garden.webp', '日常'],
    ['pink', '黑与粉', 'himeri-portrait.webp', '写真'],
    ['stage', '舞台照片', 'stage-moment.webp', '出演'],
    ['memory', '相册合照', 'nadeshiko-memory.webp', '日常'],
    ['radio', '电台合照', 'nadeshiko-radio.webp', '节目'],
    ['shop', '粉色造型', 'pink-moment.webp', '写真'],
    ['cheer', '应援记录', 'cheer-project.webp', '应援'],
  ]
  const photoTitles = [
    ['树下随拍，', '几张近照。', 'DAILY PHOTOS'],
    ['黑色与粉色，', '这次的合照。', 'BLACK & PINK'],
    ['薄荷绿，', '舞台造型。', 'ON STAGE'],
    ['翻翻相册，', '最近的照片。', 'FROM THE ALBUM'],
    ['电台时间，', '录音室合照。', 'RADIO DAYS'],
    ['粉色造型，', '这一组随拍。', 'IN PINK'],
    ['应援记录，', '现场照片。', 'CHEER NOTES'],
  ]
  const orbitStates = new Map()
  const animations = new Set()
  let panoramaSections = []
  let scrollFrame = 0
  let pointerFrame = 0
  let hoverTarget = null
  let hoverPoint = { x: -100, y: -100 }
  let currentPage = 'home'
  let calendarDay = 7
  let bookAnimation

  function animate(el, frames, options = {}) {
    if (!el || !motion()) return null
    const animation = el.animate(frames, {
      duration: 620,
      easing: 'cubic-bezier(.22,1,.36,1)',
      ...options,
    })
    animations.add(animation)
    animation.finished.then(
      () => animations.delete(animation),
      () => animations.delete(animation)
    )
    return animation
  }

  // A low-resolution fragment field runs behind the document, never over controls.
  function atmosphere() {
    const canvas = document.createElement('canvas')
    canvas.className = 'experience-field'
    canvas.setAttribute('aria-hidden', 'true')
    document.body.prepend(canvas)
    let gl
    try {
      gl = canvas.getContext('webgl', {
        alpha: true,
        antialias: false,
        depth: false,
        powerPreference: 'low-power',
      })
    } catch {
      /* CSS fallback */
    }
    if (!gl) {
      canvas.dataset.renderer = 'static'
      return
    }
    const vertex = `attribute vec2 a_position; void main(){gl_Position=vec4(a_position,0.0,1.0);}`
    const fragment = `precision mediump float;
      uniform vec2 u_resolution; uniform vec2 u_pointer; uniform float u_time; uniform float u_scroll; uniform float u_night; uniform float u_page;
      void main(){
        vec2 uv=gl_FragCoord.xy/u_resolution;
        vec2 p=(uv-vec2(.78,.52))*vec2(u_resolution.x/u_resolution.y,1.0);
        p+=vec2((u_pointer.x-.5)*.07,(u_pointer.y-.5)*.05);
        float t=u_time*.075;
        float angle=atan(p.y,p.x); float r=length(p);
        float bend=.09*sin(angle*3.0+t+u_page*.4)+.045*cos(angle*5.0-t)+.025*sin(p.y*12.0+u_scroll*.3);
        float d=r+bend;
        float band=abs(fract(d*30.0-t*.12)-.5);
        float lines=1.0-smoothstep(.025,.08,band);
        float envelope=smoothstep(.13,.36,r)*(1.0-smoothstep(.48,.95,r));
        float aperture=pow(max(0.0,.5+.5*sin(angle-t)),2.0);
        float glow=exp(-pow((d-.48)*7.0,2.0));
        vec3 light=vec3(.28,.38,.23); vec3 dark=vec3(.67,.79,.43);
        vec3 color=mix(light,dark,u_night);
        float alpha=(lines*.15*envelope*(.28+.72*aperture)+glow*.025)*(1.0-uv.x*.12);
        gl_FragColor=vec4(color*alpha,alpha);
      }`
    function shader(type, text) {
      const result = gl.createShader(type)
      gl.shaderSource(result, text)
      gl.compileShader(result)
      if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) {
        gl.deleteShader(result)
        return null
      }
      return result
    }
    const vs = shader(gl.VERTEX_SHADER, vertex),
      fs = shader(gl.FRAGMENT_SHADER, fragment)
    if (!vs || !fs) {
      canvas.dataset.renderer = 'static'
      return
    }
    const program = gl.createProgram()
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      canvas.dataset.renderer = 'static'
      return
    }
    gl.useProgram(program)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    )
    const position = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    const uniforms = Object.fromEntries(
      ['resolution', 'pointer', 'time', 'scroll', 'night', 'page'].map((name) => [
        name,
        gl.getUniformLocation(program, `u_${name}`),
      ])
    )
    let raf = 0,
      last = 0,
      pointer = [0.5, 0.5],
      target = [0.5, 0.5],
      lost = false
    function resize() {
      const scale = Math.min(0.7, Math.sqrt(650000 / (innerWidth * innerHeight)))
      canvas.width = Math.round(innerWidth * scale)
      canvas.height = Math.round(innerHeight * scale)
      gl.viewport(0, 0, canvas.width, canvas.height)
      start()
    }
    function draw(time) {
      raf = 0
      if (document.hidden || lost || obscured()) return
      if (time - last > 32 || !motion()) {
        pointer = pointer.map((p, i) => p + (target[i] - p) * 0.075)
        gl.uniform2f(uniforms.resolution, canvas.width, canvas.height)
        gl.uniform2f(uniforms.pointer, ...(motion() ? pointer : [0.5, 0.5]))
        gl.uniform1f(uniforms.time, motion() ? time / 1000 : 0)
        gl.uniform1f(uniforms.scroll, motion() ? scrollY / 1000 : 0)
        gl.uniform1f(uniforms.night, night ? 1 : 0)
        gl.uniform1f(
          uniforms.page,
          Math.max(
            0,
            pages.findIndex((p) => p[0] === currentPage)
          )
        )
        gl.drawArrays(gl.TRIANGLES, 0, 6)
        last = time
      }
      if (motion()) raf = requestAnimationFrame(draw)
    }
    function obscured() {
      return (
        document.body.classList.contains('app-dialog-open') ||
        document.body.classList.contains('menu-open')
      )
    }
    function start() {
      if (obscured()) {
        cancelAnimationFrame(raf)
        raf = 0
      } else if (!raf && !lost && !document.hidden) raf = requestAnimationFrame(draw)
    }
    addEventListener(
      'pointermove',
      (e) => {
        if (e.pointerType === 'mouse')
          target = [e.clientX / innerWidth, 1 - e.clientY / innerHeight]
      },
      { passive: true }
    )
    addEventListener('resize', resize, { passive: true })
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(raf)
        raf = 0
      } else start()
    })
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault()
      lost = true
      cancelAnimationFrame(raf)
      raf = 0
      canvas.dataset.renderer = 'static'
    })
    new MutationObserver(start).observe(document.body, {
      attributes: true,
      attributeFilter: ['data-motion', 'data-page', 'class'],
    })
    canvas.dataset.renderer = 'webgl'
    resize()
  }

  function ring() {
    return `<div class="orbit-gallery" data-orbit tabindex="0" role="region" aria-label="照片环览"><div class="orbit-viewport"><div class="orbit-floor" aria-hidden="true"></div><div class="orbit-axis">${photos.map((p, i) => `<button class="orbit-card" data-orbit-index="${i}" aria-label="选择${esc(p[1])}" aria-pressed="${i === 0}"><span class="orbit-card-inner"><img src="${asset(p[2])}" alt="${esc(p[1])}" width="420" height="560" draggable="false" ${i > 2 ? 'loading="lazy"' : ''}><span class="orbit-card-caption"><small>0${i + 1} / ${p[3]}</small><b>${p[1]}</b>${icon('arrow-up-right')}</span></span><span class="orbit-gloss" aria-hidden="true"></span></button>`).join('')}</div></div><div class="orbit-hud"><span>PHOTO INDEX <i>07</i></span><div class="orbit-pagination" aria-label="选择照片">${photos.map((p, i) => `<button data-orbit-to="${i}" aria-label="${esc(p[1])}" aria-pressed="${i === 0}"><span></span></button>`).join('')}</div><div class="orbit-steppers"><button data-orbit-step="-1" aria-label="上一张照片">${icon('arrow-left')}</button><span class="orbit-current" aria-live="polite">01 / 07</span><button data-orbit-step="1" aria-label="下一张照片">${icon('arrow')}</button></div></div></div>`
  }

  function modes() {
    return `<div class="scene-modes" aria-label="相册浏览方式"><button data-scene-mode="orbit" aria-pressed="true">环览</button><button data-scene-mode="stack" aria-pressed="false">叠放</button></div>`
  }

  function bindOrbit(root) {
    if (orbitStates.has(root)) return
    const cards = [...root.querySelectorAll('[data-orbit-index]')]
    const state = {
      root,
      cards,
      value: 0,
      target: 0,
      velocity: 0,
      frame: 0,
      drag: null,
      suppressed: 0,
      active: -1,
      stackCopy: root.closest('[data-cover-shell]').querySelector('.atelier-copy').innerHTML,
    }
    orbitStates.set(root, state)
    const count = cards.length,
      step = 360 / count
    function paint() {
      if (!root.isConnected) return
      const width = root.clientWidth
      const radius = Math.min(425, width * (innerWidth < 650 ? 0.64 : 0.48))
      const active = ((Math.round(state.target) % count) + count) % count
      const changed = state.active !== active
      if (changed) root.dataset.active = active
      cards.forEach((card, i) => {
        let distance = (i - state.value) % count
        if (distance > count / 2) distance -= count
        if (distance < -count / 2) distance += count
        const angle = distance * step,
          rad = (angle * Math.PI) / 180
        const x = Math.sin(rad) * radius,
          z = (Math.cos(rad) - 1) * radius * 0.83
        const y = (1 - Math.cos(rad)) * -28
        card.style.transform = `translate3d(${x}px,${y}px,${z}px) rotateY(${-angle * 0.66}deg)`
        card.style.zIndex = String(20 - Math.round(Math.abs(distance) * 3))
        card.style.opacity = '1'
        card.style.filter = `brightness(${(night ? 0.72 : 0.91) + (night ? 0.28 : 0.09) * clamp((Math.cos(rad) + 1) / 2)})`
        if (changed) {
          card.classList.toggle('is-current', i === active)
          card.setAttribute('aria-pressed', String(i === active))
          card.setAttribute('aria-label', `${i === active ? '查看' : '选择'}${photos[i][1]}`)
          card.tabIndex = i === active ? 0 : -1
          if (i === active) card.dataset.open = photos[i][0]
          else delete card.dataset.open
        }
      })
      if (changed) {
        root
          .querySelectorAll('[data-orbit-to]')
          .forEach((button, i) => button.setAttribute('aria-pressed', String(i === active)))
        root.querySelector('.orbit-current').textContent = `0${active + 1} / 07`
      }
      const cover = root.closest('[data-cover-shell]')
      if (cover?.dataset.sceneMode === 'orbit') {
        const copy = cover.querySelector('.atelier-copy')
        if (copy.dataset.orbitIndex !== String(active)) {
          const title = copy.querySelector('.cover-title')
          copy.dataset.orbitIndex = active
          copy.querySelector('.atelier-kicker > span:first-child').textContent = `0${active + 1}`
          copy.querySelector('.atelier-kicker > span:last-child').innerHTML =
            `${photos[active][3]}<br><small>${photoTitles[active][2]}</small>`
          title.innerHTML = `${photoTitles[active][0]}<br><em>${photoTitles[active][1]}</em>`
          copy.querySelector('[data-open]').dataset.open = photos[active][0]
          title.getAnimations().forEach((a) => a.cancel())
          if (state.active >= 0)
            animate(
              title,
              [
                {
                  transform: 'translateY(14px)',
                  opacity: 0,
                  clipPath: 'inset(20% 0 0)',
                },
                {
                  transform: 'translateY(0)',
                  opacity: 1,
                  clipPath: 'inset(0)',
                },
              ],
              { duration: 420 }
            )
        }
      }
      state.active = active
    }
    function tick() {
      state.frame = 0
      if (!root.isConnected) return
      if (!motion()) {
        state.value = state.target
        state.velocity = 0
        paint()
        return
      }
      const force = (state.target - state.value) * 0.095
      state.velocity = (state.velocity + force) * 0.72
      state.value += state.velocity
      if (Math.abs(state.target - state.value) < 0.001 && Math.abs(state.velocity) < 0.001) {
        state.value = state.target
        state.velocity = 0
        paint()
        return
      }
      paint()
      state.frame = requestAnimationFrame(tick)
    }
    function go(value) {
      state.target = value
      if (!state.frame) state.frame = requestAnimationFrame(tick)
    }
    state.go = go
    state.paint = paint
    root.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || !e.isPrimary || e.target.closest('.orbit-pagination, .orbit-steppers'))
        return
      state.drag = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        start: state.value,
        last: e.clientX,
        time: performance.now(),
        speed: 0,
        locked: false,
      }
    })
    root.addEventListener('pointermove', (e) => {
      const d = state.drag
      if (!d || d.id !== e.pointerId) return
      const dx = e.clientX - d.x,
        dy = e.clientY - d.y
      if (!d.locked && Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
        state.drag = null
        return
      }
      if (!d.locked && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
        d.locked = true
        root.setPointerCapture(e.pointerId)
        root.classList.add('is-dragging')
        cancelAnimationFrame(state.frame)
        state.frame = 0
      }
      if (!d.locked) return
      const now = performance.now()
      d.speed = (e.clientX - d.last) / Math.max(1, now - d.time)
      d.last = e.clientX
      d.time = now
      state.value = d.start - dx / (root.clientWidth * 0.27)
      state.target = state.value
      state.velocity = 0
      paint()
    })
    function release(e, cancel = false) {
      const d = state.drag
      if (!d || e.pointerId !== d.id) return
      state.drag = null
      root.classList.remove('is-dragging')
      if (root.hasPointerCapture(d.id)) root.releasePointerCapture(d.id)
      if (d.locked) {
        state.suppressed = performance.now() + 450
        go(Math.round(state.value - (cancel ? 0 : clamp(d.speed, -1, 1) * 0.45)))
      }
    }
    root.addEventListener('pointerup', release)
    root.addEventListener('pointercancel', (e) => release(e, true))
    root.addEventListener('lostpointercapture', (e) => {
      if (e.target === root) release(e, true)
    })
    root.addEventListener(
      'click',
      (e) => {
        if (performance.now() < state.suppressed) {
          e.preventDefault()
          e.stopImmediatePropagation()
          return
        }
        const stepButton = e.target.closest('[data-orbit-step]')
        if (stepButton) {
          e.preventDefault()
          e.stopImmediatePropagation()
          go(Math.round(state.target) + Number(stepButton.dataset.orbitStep))
          return
        }
        const pick = e.target.closest('[data-orbit-index], [data-orbit-to]')
        if (!pick) return
        const i = Number(pick.dataset.orbitIndex ?? pick.dataset.orbitTo)
        const active = ((Math.round(state.target) % count) + count) % count
        if (pick.hasAttribute('data-orbit-to') || active !== i) {
          e.preventDefault()
          e.stopImmediatePropagation()
          let delta = i - active
          if (delta > count / 2) delta -= count
          if (delta < -count / 2) delta += count
          go(Math.round(state.target) + delta)
        }
      },
      true
    )
    root.addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return
      e.preventDefault()
      e.stopPropagation()
      go(
        e.key === 'Home'
          ? 0
          : e.key === 'End'
            ? count - 1
            : Math.round(state.target) + (e.key === 'ArrowRight' ? 1 : -1)
      )
      root.focus({ preventScroll: true })
    })
    paint()
  }

  function panorama() {
    return `<section class="panorama-scroll" aria-label="舞台专题"><div class="panorama-pin"><div class="panorama-topline"><span>PHOTO ESSAY / 01</span><span>高嶺のなでしこ</span><span>2026</span></div><div class="panorama-window"><div class="panorama-images"><img src="${asset('himeri-portrait.webp')}" alt="双人合照" width="500" height="700" loading="lazy"><img src="${asset('stage-moment.webp')}" alt="舞台造型" width="600" height="800" loading="lazy"><img src="${asset('nadeshiko-memory.webp')}" alt="日常合照" width="500" height="700" loading="lazy"></div><div class="panorama-vignette"></div></div><div class="panorama-type" aria-hidden="true"><span>ON</span><span>STAGE.</span></div><div class="panorama-caption"><span>舞台照片</span><button class="panorama-link" data-open="stage" aria-label="查看舞台照片">${icon('arrow-up-right')}</button><span>日常 / 写真 / 出演</span></div></div></section>`
  }

  function calendarDial() {
    return `<div class="calendar-object" aria-hidden="true"><div class="calendar-object-ring">${Array.from({ length: 30 }, (_, i) => `<i style="--tick:${i}">${i % 5 === 0 ? `<span>${String(i + 1).padStart(2, '0')}</span>` : ''}</i>`).join('')}</div><div class="calendar-object-center"><small>NOVEMBER</small><b>11</b><span>2026</span></div><div class="calendar-object-needle"></div></div>`
  }

  function communityFeature() {
    return `<section class="conversation-feature"><div class="conversation-feature-copy"><span>THIS WEEK / 01</span><h2>最近循环的<br>是哪首歌？</h2><button class="atelier-round-link" data-discussion="d3"><span>看看讨论</span><b>${icon('arrow-up-right')}</b></button></div><div class="conversation-feature-art"><span class="conversation-disc" aria-hidden="true"><i></i><b>ON REPEAT</b></span><img src="${asset('nadeshiko-radio.webp')}" alt="节目合照" width="400" height="480"><span class="conversation-cutout">Music<br><i>& talk.</i></span></div></section>`
  }

  function savedShelf(list) {
    const covers = list.filter((p) => p.image).slice(0, 4)
    return `<section class="saved-shelf"><div class="saved-shelf-label"><span>YOUR COLLECTION</span><b>${String(list.length).padStart(2, '0')}</b><small>条收藏</small></div><div class="saved-shelf-stage" ${!covers.length ? 'aria-hidden="true"' : ''}>${covers.length ? covers.map((p, i) => `<button class="saved-volume" style="--volume:${i};--volumes:${covers.length}" data-open="${p.id}" aria-label="查看${esc(p.title)}"><img src="${asset(p.image)}" alt="${esc(p.title)}" width="260" height="340"><span>0${i + 1}</span></button>`).join('') : Array.from({ length: 3 }, (_, i) => `<div class="saved-volume saved-volume-empty" style="--volume:${i};--volumes:3"><b>0${i + 1}</b><i>✳</i><span>MOMICHAN</span></div>`).join('')}</div><span class="saved-shelf-word" aria-hidden="true">Saved.</span></section>`
  }

  function collectionBook(collection, items) {
    return `<div class="collection-book" data-collection-book="${esc(collection.id)}"><div class="book-spread"><section class="book-page book-left" aria-labelledby="dialog-title"><div class="book-page-meta"><span>VOL. ${collection.index}</span><span>PHOTO BOOK</span></div><div class="book-photo-pair"><img class="book-main-photo" src="${asset(collection.cover)}" alt="${esc(collection.title)}" width="480" height="600"><img class="book-inset-photo" src="${asset(collection.second)}" alt="" width="180" height="220"></div><div class="book-page-heading"><h2 id="dialog-title">${esc(collection.title)}</h2><p>${esc(collection.note)}</p></div><span class="book-folio">01 / MOMICHAN</span></section><section class="book-page book-right" aria-label="合集目录"><div class="book-page-meta"><span>CONTENTS</span><span>${items.length} 张照片</span></div><div class="book-contents-title"><span>${esc(collection.english)}</span><b>${collection.index}</b></div><div class="collection-dialog-list">${items.map((post, i) => `<button class="collection-dialog-item" data-open="${post.id}"><span class="collection-item-number">0${i + 1}</span>${post.image ? `<img src="${asset(post.image)}" alt="" width="64" height="80">` : `<span class="collection-text-icon">${icon('file')}</span>`}<span><b>${esc(post.title)}</b><small>${esc(post.author)} · ${post.type}</small></span>${icon('arrow-up-right')}</button>`).join('')}</div><div class="book-page-footer"><button class="atelier-round-link" data-collection-browse="${collection.id}"><span>查看合集</span><b>${icon('arrow-up-right')}</b></button><span>02</span></div></section></div></div>`
  }

  function clearBook() {
    bookAnimation?.cancel()
    bookAnimation = null
    document.querySelectorAll('.book-turn-leaf').forEach((leaf) => leaf.remove())
  }

  function dialogBook(element) {
    clearBook()
    const book = element.querySelector('[data-collection-book]')
    if (!book) return false
    element
      .querySelector('#dialog-content')
      .getAnimations()
      .forEach((a) => a.cancel())
    if (!motion()) return true
    if (innerWidth <= 720) {
      animate(
        book,
        [
          { opacity: 0, transform: 'translateY(18px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        { duration: 400 }
      )
      return true
    }
    const collection = runtime.Editorial.collections.find(
      (c) => c.id === book.dataset.collectionBook
    )
    const leaf = document.createElement('div')
    leaf.className = 'book-turn-leaf'
    leaf.setAttribute('aria-hidden', 'true')
    leaf.innerHTML = `<div class="book-leaf-front"><div class="book-page-meta"><span>VOL. ${collection.index}</span><span>MOMICHAN</span></div><img src="${asset(collection.cover)}" alt="" width="480" height="600"><b>${esc(collection.title)}</b><small>${esc(collection.english)}</small></div>`
    const back = book.querySelector('.book-left').cloneNode(true)
    back.classList.add('book-leaf-back')
    back.removeAttribute('aria-labelledby')
    back.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'))
    leaf.append(back)
    book.querySelector('.book-spread').append(leaf)
    animate(
      book,
      [
        { opacity: 0, transform: 'scale(.96)' },
        { opacity: 1, transform: 'scale(1)' },
      ],
      { duration: 400 }
    )
    bookAnimation = animate(
      leaf,
      [
        { transform: 'rotateY(0deg)', offset: 0 },
        { transform: 'rotateY(-95deg)', offset: 0.55 },
        { transform: 'rotateY(-180deg)', offset: 1 },
      ],
      {
        duration: 1120,
        delay: 90,
        fill: 'backwards',
        easing: 'cubic-bezier(.32,.05,.18,1)',
      }
    )
    const done = () => leaf.remove()
    bookAnimation?.finished.then(done, done)
    return true
  }

  function menu() {
    const el = document.createElement('dialog')
    el.id = 'experience-menu'
    el.className = 'experience-menu'
    el.setAttribute('aria-labelledby', 'menu-title')
    el.innerHTML = `<div class="menu-top"><span id="menu-title">MOMICHAN / 目录</span><button class="icon-button" data-menu-close aria-label="关闭目录">${icon('x')}</button></div><div class="menu-layout"><nav aria-label="全部页面">${pages.map((p, i) => `<a href="#${p[0]}" data-menu-page="${p[0]}"><small>0${i + 1}</small><span>${p[1]}<i>${p[2]}</i></span>${icon('arrow-up-right')}</a>`).join('')}</nav><div class="menu-visual" aria-hidden="true">${pages.map((p, i) => `<img src="${asset(p[3])}" alt="" width="400" height="530" data-menu-image="${p[0]}" class="${i === 0 ? 'is-active' : ''}">`).join('')}<span>籾山ひめり<br>高嶺のなでしこ</span></div></div><div class="menu-bottom"><span>PHOTO JOURNAL / 2026</span><span>非官方粉丝站</span></div>`
    document.body.append(el)
    document.querySelectorAll('.header-actions').forEach((header) => {
      const button = document.createElement('button')
      button.className = 'experience-menu-trigger'
      button.dataset.menuOpen = ''
      button.setAttribute('aria-label', '打开目录')
      button.setAttribute('aria-haspopup', 'dialog')
      button.innerHTML = `<span>目录</span><i></i><i></i>`
      header.prepend(button)
    })
    function select(name) {
      el.querySelectorAll('[data-menu-page]').forEach((a) =>
        a.classList.toggle('is-active', a.dataset.menuPage === name)
      )
      el.querySelectorAll('[data-menu-image]').forEach((img) =>
        img.classList.toggle('is-active', img.dataset.menuImage === name)
      )
    }
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-menu-open]')) {
        select(currentPage)
        el.showModal()
        document.body.classList.add('menu-open')
        el.querySelectorAll('.menu-layout nav a').forEach((a, i) =>
          animate(
            a,
            [
              { transform: 'translateY(80%) rotate(3deg)', opacity: 0 },
              { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
            ],
            { duration: 700, delay: i * 55 }
          )
        )
      }
      if (e.target.closest('[data-menu-close], [data-menu-page]')) {
        el.close()
        document.body.classList.remove('menu-open')
      }
    })
    el.addEventListener('close', () => document.body.classList.remove('menu-open'))
    el.addEventListener('pointerover', (e) => {
      const a = e.target.closest('[data-menu-page]')
      if (a) select(a.dataset.menuPage)
    })
    el.addEventListener('focusin', (e) => {
      const a = e.target.closest('[data-menu-page]')
      if (a) select(a.dataset.menuPage)
    })
    addEventListener('hashchange', () => {
      if (el.open) el.close()
    })
  }

  const curtain = document.createElement('div')
  curtain.className = 'experience-curtain'
  curtain.setAttribute('aria-hidden', 'true')
  curtain.innerHTML = '<i></i>'.repeat(5)
  document.body.append(curtain)
  const cursor = document.createElement('div')
  cursor.className = 'experience-cursor'
  cursor.setAttribute('aria-hidden', 'true')
  cursor.innerHTML = `<span>查看</span>${icon('arrow-up-right')}`
  document.body.append(cursor)
  const preview = document.createElement('div')
  preview.className = 'discussion-preview'
  preview.setAttribute('aria-hidden', 'true')
  preview.innerHTML = `<img src="${asset('stage-moment.webp')}" alt="" width="230" height="290"><span>COMMUNITY / MOMICHAN</span>`
  document.body.append(preview)
  const previewPhotos = {
    d1: 'stage-moment.webp',
    d2: 'nadeshiko-memory.webp',
    d3: 'nadeshiko-radio.webp',
    d4: 'himeri-portrait.webp',
  }

  function pointerTick() {
    pointerFrame = 0
    cursor.style.transform = `translate3d(${hoverPoint.x + 15}px,${hoverPoint.y + 15}px,0)`
    const x = clamp(hoverPoint.x + 30, 15, innerWidth - 260),
      y = clamp(hoverPoint.y - 140, 90, innerHeight - 330)
    preview.style.transform = `translate3d(${x}px,${y}px,0) rotate(${(hoverPoint.x / innerWidth - 0.5) * 7}deg)`
    if (hoverTarget) {
      const r = hoverTarget.getBoundingClientRect()
      const x = clamp((hoverPoint.x - r.left) / r.width),
        y = clamp((hoverPoint.y - r.top) / r.height)
      hoverTarget.style.setProperty('--pointer-x', `${x * 100}%`)
      hoverTarget.style.setProperty('--pointer-y', `${y * 100}%`)
    }
  }
  document.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse' || !fine.matches || !motion()) return
      hoverPoint = { x: e.clientX, y: e.clientY }
      const image = e.target.closest(
        '.post-media, .orbit-card.is-current, .archive-picture, .saved-volume:not(.saved-volume-empty)'
      )
      cursor.classList.toggle('is-visible', !!image && !document.querySelector('dialog[open]'))
      const discussion = e.target.closest('.discussion-row [data-discussion]')
      const file = discussion && previewPhotos[discussion.dataset.discussion]
      preview.classList.toggle('is-visible', !!file && !document.querySelector('dialog[open]'))
      if (file && !preview.querySelector('img').src.endsWith(file))
        preview.querySelector('img').src = asset(file)
      hoverTarget = e.target.closest('.post-card, .event-card, .discussion-row, .saved-volume')
      if (!pointerFrame) pointerFrame = requestAnimationFrame(pointerTick)
    },
    { passive: true }
  )
  document.addEventListener('pointerout', (e) => {
    if (!e.relatedTarget) {
      cursor.classList.remove('is-visible')
      preview.classList.remove('is-visible')
    }
  })

  function updateScroll() {
    scrollFrame = 0
    for (const section of panoramaSections) {
      if (!section.isConnected) continue
      const pin = section.querySelector('.panorama-pin'),
        r = section.getBoundingClientRect()
      if (!motion() || innerWidth <= 900) {
        section.style.setProperty('--panorama', 1)
        continue
      }
      if (r.bottom < 0 || r.top > innerHeight) continue
      const p = clamp((76 - r.top) / (section.offsetHeight - pin.offsetHeight))
      section.style.setProperty('--panorama', p.toFixed(4))
    }
    const max = document.documentElement.scrollHeight - innerHeight
    document.documentElement.style.setProperty(
      '--page-progress',
      max > 0 ? clamp(scrollY / max) : 0
    )
  }
  function onScroll() {
    cursor.classList.remove('is-visible')
    preview.classList.remove('is-visible')
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll)
  }

  function mount(root = document) {
    currentPage = document.body.dataset.page || 'home'
    for (const [el, state] of orbitStates) {
      if (!el.isConnected) {
        cancelAnimationFrame(state.frame)
        orbitStates.delete(el)
      }
    }
    root.querySelectorAll('[data-orbit]').forEach(bindOrbit)
    panoramaSections = [...document.querySelectorAll('.panorama-scroll')]
    const scheduleHeading = root.querySelector('.calendar-toolbar')
    if (scheduleHeading && !root.querySelector('.calendar-object'))
      scheduleHeading.insertAdjacentHTML('afterbegin', calendarDial())
    const calendar = root.querySelector('.calendar-object')
    if (calendar) {
      const selected = root.querySelector("[data-day].active:not([data-day='all'])")
      const day = Number(selected?.dataset.day) || 7
      calendar.style.setProperty('--selected-day', day)
      if (day !== calendarDay) {
        animate(
          calendar.querySelector('.calendar-object-needle'),
          [
            { transform: `rotate(${(calendarDay - 1) * 12 - 90}deg)` },
            { transform: `rotate(${(day - 1) * 12 - 90}deg)` },
          ],
          { duration: 650 }
        )
      }
      calendarDay = day
    }
    root.querySelectorAll('.event-card').forEach((el, i) => el.style.setProperty('--ticket', i))
    root
      .querySelectorAll('.discussion-row')
      .forEach((el, i) => el.style.setProperty('--discussion', i))
    root.querySelectorAll('.explore-grid .post-card').forEach((el, i) => {
      el.dataset.contactIndex = String(i + 1).padStart(2, '0')
    })
    updateScroll()
  }

  function routeTransition() {
    cursor.classList.remove('is-visible')
    preview.classList.remove('is-visible')
    if (!motion()) return
    curtain.querySelectorAll('i').forEach((el, i) => {
      el.getAnimations().forEach((a) => a.cancel())
      animate(el, [{ transform: 'translateY(0)' }, { transform: 'translateY(-102%)' }], {
        duration: 650,
        delay: i * 42,
      })
    })
    const heading = document.querySelector('.page-heading h1')
    animate(
      heading,
      [
        { transform: 'translateY(85%) rotate(3deg)', opacity: 0 },
        { transform: 'translateY(0) rotate(0)', opacity: 1 },
      ],
      { duration: 800, delay: 180 }
    )
  }

  function savedFeedback(button, id, saved) {
    if (!motion()) return
    animate(
      button,
      [{ transform: 'scale(.8)' }, { transform: 'scale(1.16)' }, { transform: 'scale(1)' }],
      { duration: 420 }
    )
    if (!saved) return
    const from = button?.getBoundingClientRect()
    const target = [
      ...document.querySelectorAll(
        '.header-actions [data-action="favorites"], .sidebar-nav [data-page="favorites"]'
      ),
    ].find((el) => {
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.top >= 0 && r.bottom < innerHeight
    })
    if (!from || !target || document.querySelector('#app-dialog').open) return
    const to = target.getBoundingClientRect(),
      p = photos.find((p) => p[0] === id)
    if (!p) return
    const image = document.createElement('img')
    image.src = asset(p[2])
    image.className = 'saved-flight'
    image.alt = ''
    image.setAttribute('aria-hidden', 'true')
    image.style.left = `${from.left}px`
    image.style.top = `${from.top}px`
    document.body.append(image)
    const dx = to.left - from.left,
      dy = to.top - from.top
    const animation = animate(
      image,
      [
        { transform: 'translate(0,0) rotate(-8deg) scale(1)', opacity: 1 },
        {
          transform: `translate(${dx * 0.55}px,${dy * 0.5 - 55}px) rotate(8deg) scale(.8)`,
          opacity: 1,
          offset: 0.5,
        },
        {
          transform: `translate(${dx}px,${dy}px) rotate(0deg) scale(.12)`,
          opacity: 0,
        },
      ],
      { duration: 700 }
    )
    const done = () => {
      image.remove()
      animate(
        target,
        [{ transform: 'scale(1)' }, { transform: 'scale(1.2)' }, { transform: 'scale(1)' }],
        { duration: 320 }
      )
    }
    animation?.finished.then(done, () => image.remove())
  }

  document.addEventListener('click', (e) => {
    const mode = e.target.closest('[data-scene-mode]')
    if (mode?.tagName === 'BUTTON') {
      const cover = mode.closest('[data-cover-shell]')
      if (cover.dataset.sceneMode === mode.dataset.sceneMode) return
      const orbit = cover.querySelector('[data-orbit]')
      const state = orbitStates.get(orbit)
      const copy = cover.querySelector('.atelier-copy')
      if (cover.dataset.sceneMode === 'stack' && state) state.stackCopy = copy.innerHTML
      if (mode.dataset.sceneMode === 'stack' && state) {
        copy.innerHTML = state.stackCopy
        delete copy.dataset.orbitIndex
      }
      cover.dataset.sceneMode = mode.dataset.sceneMode
      cover
        .querySelectorAll('.scene-modes button')
        .forEach((b) => b.setAttribute('aria-pressed', String(b === mode)))
      state?.paint()
      if (mode.dataset.sceneMode === 'stack') {
        const current = cover.querySelector('.depth-card[data-slot="0"] [data-open]')
        if (current)
          cover.querySelector('.atelier-copy [data-open]').dataset.open = current.dataset.open
      }
      animate(
        mode.dataset.sceneMode === 'orbit' ? orbit : cover.querySelector('.cover-visual--spatial'),
        [
          { opacity: 0, transform: 'translateY(30px) scale(.94)' },
          { opacity: 1, transform: 'translateY(0) scale(1)' },
        ],
        { duration: 650 }
      )
    }
  })
  addEventListener('scroll', onScroll, { passive: true })
  addEventListener(
    'resize',
    () => {
      for (const s of orbitStates.values()) s.paint()
      onScroll()
    },
    { passive: true }
  )
  new MutationObserver(() => {
    if (!motion()) {
      for (const a of [...animations]) a.cancel()
      cursor.classList.remove('is-visible')
      preview.classList.remove('is-visible')
      for (const s of orbitStates.values()) {
        cancelAnimationFrame(s.frame)
        s.frame = 0
        s.value = s.target
        s.velocity = 0
        s.paint()
      }
    }
    onScroll()
  }).observe(document.body, {
    attributes: true,
    attributeFilter: ['data-motion'],
  })
  atmosphere()
  menu()
  runtime.Experience = {
    animate,
    ring,
    modes,
    panorama,
    communityFeature,
    savedShelf,
    collectionBook,
    dialogBook,
    clearBook,
    mount,
    routeTransition,
    savedFeedback,
  }
}
