<template>
  <svg class="liquid-glass" viewBox="0 0 1000 96" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient
        id="journal-glass-ribbon"
        x1="0"
        y1="0"
        x2="1"
        y2="1"
        gradientUnits="objectBoundingBox"
      >
        <stop offset="0" stop-color="#43a6b7" stop-opacity=".3" />
        <stop offset=".45" stop-color="#9b9be2" stop-opacity=".38" />
        <stop offset=".73" stop-color="#f3a582" stop-opacity=".36" />
        <stop offset="1" stop-color="#64bba6" stop-opacity=".4" />
      </linearGradient>
      <filter
        id="journal-glass-refraction"
        x="-12%"
        y="-80%"
        width="124%"
        height="260%"
        color-interpolation-filters="sRGB"
      >
        <feTurbulence
          ref="water"
          type="fractalNoise"
          baseFrequency=".008 .031"
          numOctaves="2"
          seed="17"
          result="current"
        />
        <feDisplacementMap
          ref="lens"
          in="SourceGraphic"
          in2="current"
          scale="9"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </defs>
    <g class="liquid-glass__flow" filter="url(#journal-glass-refraction)">
      <path
        fill="url(#journal-glass-ribbon)"
        d="M-60 48C130 6 278 12 469 49S740 89 1060 22V52C845 115 674 90 469 65S142 31-60 76Z"
      />
      <path
        class="liquid-glass__edge"
        d="M-60 51C153 3 290 19 466 48S759 87 1060 25M-60 63C119 21 271 27 462 56S777 96 1060 37M-60 72C151 29 284 36 459 63S779 102 1060 46"
      />
    </g>
  </svg>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue'

const lens = useTemplateRef<SVGFEDisplacementMapElement>('lens')
const water = useTemplateRef<SVGFETurbulenceElement>('water')
const lifetime = new AbortController()
let frame = 0
let timer: number | undefined
let phase = 0
let target = 0.5
let engaged = false
let activeSurface: HTMLElement | null = null

onMounted(() => {
  const header = lens.value?.closest<HTMLElement>('.edition-header')
  if (!header) return
  function flow() {
    frame = 0
    if (document.body.dataset['motion'] !== 'full') {
      stop()
      return
    }
    phase += 0.065
    const drift = Math.sin(phase) * 0.004
    const ripple = Math.sin(phase * 1.7 + target * 4) * 0.006
    header!.style.setProperty('--lens-shift', `${(target - 0.5) * 12}%`)
    lens.value?.setAttribute('scale', String(9 + Math.sin(target * Math.PI) * 26))
    water.value?.setAttribute('baseFrequency', `${0.008 + drift} ${0.031 + ripple}`)
    timer = window.setTimeout(() => {
      timer = undefined
      frame = requestAnimationFrame(flow)
    }, 110)
  }
  function stop() {
    window.clearTimeout(timer)
    timer = undefined
    cancelAnimationFrame(frame)
    frame = 0
    activeSurface?.style.removeProperty('--glass-x')
    activeSurface?.style.removeProperty('--glass-y')
    activeSurface = null
    header!.style.removeProperty('--lens-shift')
    lens.value?.setAttribute('scale', '9')
    water.value?.setAttribute('baseFrequency', '.008 .031')
  }
  function setRefraction(position: number) {
    target = position
    engaged = true
    if (frame || timer || document.body.dataset['motion'] !== 'full') return
    frame = requestAnimationFrame(flow)
  }
  const shell = header.closest<HTMLElement>('.journal-shell')
  if (!shell) return
  shell.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType === 'touch' || document.body.dataset['motion'] !== 'full') return
      const surface = (event.target as Element).closest<HTMLElement>(
        '.liquid-surface, .archive-result-row, .author-card, .schedule-book-cover, .month-poster, .editorial-discussion, .community-cover'
      )
      if (!surface) {
        if (activeSurface) {
          activeSurface.style.removeProperty('--glass-x')
          activeSurface.style.removeProperty('--glass-y')
          activeSurface = null
        }
        engaged = false
        stop()
        return
      }
      if (activeSurface !== surface) {
        activeSurface?.style.removeProperty('--glass-x')
        activeSurface?.style.removeProperty('--glass-y')
        activeSurface = surface
      }
      const bounds = surface.getBoundingClientRect()
      const x = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width))
      const y = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height))
      surface.style.setProperty('--glass-x', `${x * 100}%`)
      surface.style.setProperty('--glass-y', `${y * 100}%`)
      const headerBounds = header.getBoundingClientRect()
      setRefraction(
        surface === header
          ? Math.min(1, Math.max(0, (event.clientX - headerBounds.left) / headerBounds.width))
          : 0.5
      )
    },
    { passive: true, signal: lifetime.signal }
  )
  shell.addEventListener(
    'pointerleave',
    () => {
      engaged = false
      stop()
    },
    { signal: lifetime.signal }
  )
  document.addEventListener(
    'journalmotionchange',
    () => {
      if (document.body.dataset['motion'] === 'full' && engaged && !frame && !timer) {
        frame = requestAnimationFrame(flow)
      } else if (document.body.dataset['motion'] !== 'full') {
        stop()
      }
    },
    { signal: lifetime.signal }
  )
  lifetime.signal.addEventListener('abort', stop, { once: true })
})

onBeforeUnmount(() => {
  lifetime.abort()
  activeSurface?.style.removeProperty('--glass-x')
  activeSurface?.style.removeProperty('--glass-y')
  lens.value?.closest<HTMLElement>('.edition-header')?.style.removeProperty('--lens-shift')
})
</script>
