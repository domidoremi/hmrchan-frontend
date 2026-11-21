<template>
  <svg
    v-if="preset === 'minimal-editorial'"
    class="theme-scene-art scene-proof"
    viewBox="0 0 1440 900"
    preserveAspectRatio="none"
  >
    <defs>
      <linearGradient id="scene-proof-light" x2="1" y2="1">
        <stop stop-color="var(--paper)" />
        <stop offset="1" stop-color="var(--scene-wash)" />
      </linearGradient>
      <pattern id="scene-proof-grain" width="8" height="8" patternUnits="userSpaceOnUse">
        <path d="M1 2h2m2 4h1M4 1v1M1 6v1" fill="none" stroke="var(--ink)" opacity=".09" />
      </pattern>
    </defs>
    <path d="M-90 85H292L382 940H-90ZM1055-80h474v770l-410-75Z" fill="url(#scene-proof-light)" />
    <path d="M-90 85H292L382 940H-90ZM1055-80h474v770l-410-75Z" fill="url(#scene-proof-grain)" />
    <g fill="none" stroke="var(--scene-line)">
      <path d="M-90 85H292L382 940M1055-80l64 695 410 75M1094-80l62 662 373 69" />
      <path
        d="M46-20v920m12-920v920M157 117v441M-10 117h320M-10 558h350M1143 164h320m-304 154h320m-302 153h320"
      />
      <path d="M34 119h36m-18-18v36m-18 420h36m-18-18v36m1107-258h29m-14-15v30" />
      <path
        d="M168 136h108m-108 10h69m-69 10h92m-92 10h45M1200 485h164m-165 10h107m-108 10h129"
        stroke-dasharray="2 2"
      />
    </g>
    <path d="M57 206v81m1115 134 5 49" fill="none" stroke="var(--accent)" stroke-width="3" />
  </svg>
  <svg
    v-else-if="preset === 'fluent-soft'"
    class="theme-scene-art scene-current"
    viewBox="0 0 1440 900"
    preserveAspectRatio="none"
  >
    <defs>
      <linearGradient id="scene-current-depth" x1="0" y1="0" x2=".88" y2="1">
        <stop stop-color="var(--scene-glass-cyan)" stop-opacity=".12" />
        <stop offset=".3" stop-color="var(--scene-glass-cyan)" stop-opacity=".66" />
        <stop offset=".57" stop-color="var(--scene-glass-violet)" stop-opacity=".38" />
        <stop offset=".86" stop-color="var(--scene-glass-rose)" stop-opacity=".65" />
        <stop offset="1" stop-color="var(--scene-glass-violet)" stop-opacity=".19" />
      </linearGradient>
      <linearGradient id="scene-current-edge" x1="0" y1="0" x2="1" y2="0">
        <stop stop-color="var(--accent)" stop-opacity=".18" />
        <stop offset=".32" stop-color="var(--scene-glass-shine)" stop-opacity=".86" />
        <stop offset=".57" stop-color="var(--scene-glass-shine)" stop-opacity=".34" />
        <stop offset=".85" stop-color="var(--scene-glass-shine)" stop-opacity=".86" />
        <stop offset="1" stop-color="var(--accent)" stop-opacity=".2" />
      </linearGradient>
    </defs>
    <path
      d="M-90 105C298 13 310 320 676 270S1091-22 1530 92V303C1172 192 1043 440 690 454S268 163-90 348Z"
      fill="url(#scene-current-depth)"
    />
    <path
      d="M-120 614C146 400 365 474 617 619s534 268 928-67v246c-323 260-673 170-972 17S163 643-120 912Z"
      fill="url(#scene-current-depth)"
    />
    <g fill="none" stroke="url(#scene-current-edge)">
      <path
        d="M-90 108C298 16 312 324 676 274S1091-19 1530 96M-90 123C298 31 316 334 678 286S1091-3 1530 111M-90 313C259 143 324 435 688 428s503-266 842-146M-90 346C268 161 337 467 690 451s482-259 840-148"
        stroke-width="2"
      />
      <path
        d="M-120 615C146 402 365 474 617 619s534 268 928-67M-120 628C149 415 362 487 617 631s534 264 928-67M-120 875C161 615 296 639 575 792s647 244 970-20"
        stroke-width="3"
      />
      <path
        d="M-30 225c158-52 277-9 353 43m817 42c109-66 199-73 325-55M-15 691c105-64 202-79 289-67m929 118c82-28 163-79 242-142"
        stroke-width="7"
        stroke-linecap="round"
        opacity=".56"
      />
    </g>
  </svg>
  <svg
    v-else-if="preset === 'organic-natural'"
    class="theme-scene-art scene-garden"
    viewBox="0 0 1440 900"
    preserveAspectRatio="none"
  >
    <defs>
      <pattern id="scene-garden-hatch" width="15" height="15" patternUnits="userSpaceOnUse">
        <path d="m0 8 8-8m3 15 4-4" stroke="var(--scene-line)" stroke-width=".7" />
      </pattern>
      <g id="scene-garden-leaf">
        <path d="M0 0C12-31 45-57 98-68 88-38 50-8 0 0Z" fill="var(--scene-leaf)" />
        <path
          d="M0 0Q36-38 98-68M28-28 30-46m14 10 23-5m-9-10 4-13"
          fill="none"
          stroke="var(--scene-line)"
        />
      </g>
    </defs>
    <path
      d="M-75 316C187 44 327 144 427 54S802 81 953-124H-75ZM1518 418c-155-77-224-18-253 99s-142 121-181 226 14 161-131 234h566Z"
      fill="var(--scene-wash)"
    />
    <path
      d="M-75 290C96 93 251 104 338 58s166-51 230-117H-75ZM1518 478c-104-79-204-34-221 71s-140 120-159 225 12 142-140 203h520Z"
      fill="url(#scene-garden-hatch)"
    />
    <g fill="none" stroke="var(--scene-line)">
      <path
        d="M-90 350C162 81 329 173 452 71s327-32 509-166M-90 375C167 100 349 184 473 88s334-39 504-170M-90 405C194 128 355 205 492 104s336-41 503-175M-90 434C215 160 380 218 515 122s333-49 506-184"
      />
      <path
        d="M1540 369c-126-59-281-23-311 133s-141 110-192 228 8 172-152 255m661-592c-163-54-263-3-295 128s-141 118-185 224 12 164-148 251m639-570c-163-63-253-1-280 116s-141 117-178 219 13 162-147 243"
      />
      <path d="M113 861c30-136 90-256 183-351m1061 375c-37-175-92-336-151-426" stroke-width="2" />
    </g>
    <use href="#scene-garden-leaf" transform="translate(149 739) rotate(5) scale(1.08)" />
    <use href="#scene-garden-leaf" transform="translate(187 655) rotate(-105) scale(1.12)" />
    <use href="#scene-garden-leaf" transform="translate(227 595) rotate(-14) scale(.82)" />
    <use href="#scene-garden-leaf" transform="translate(276 535) rotate(-49) scale(.74)" />
    <use href="#scene-garden-leaf" transform="translate(1335 781) rotate(-86) scale(1.22)" />
    <use href="#scene-garden-leaf" transform="translate(1306 683) rotate(-1) scale(.83)" />
    <use href="#scene-garden-leaf" transform="translate(1280 610) rotate(-86) scale(.81)" />
    <use href="#scene-garden-leaf" transform="translate(1247 531) rotate(-20) scale(.66)" />
  </svg>
  <svg
    v-else
    class="theme-scene-art scene-observatory"
    viewBox="0 0 1440 900"
    preserveAspectRatio="none"
  >
    <defs>
      <linearGradient id="scene-observatory-prism" x1="0" y1="1" x2="1" y2="0">
        <stop stop-color="var(--scene-spectrum-blue)" stop-opacity=".05" />
        <stop offset=".43" stop-color="var(--scene-spectrum-blue)" stop-opacity=".48" />
        <stop offset=".78" stop-color="var(--scene-spectrum-pink)" stop-opacity=".45" />
        <stop offset="1" stop-color="var(--scene-spectrum-pink)" stop-opacity=".07" />
      </linearGradient>
      <linearGradient id="scene-observatory-line" x2="1" y2="0">
        <stop stop-color="var(--scene-spectrum-blue)" />
        <stop offset=".52" stop-color="var(--accent)" stop-opacity=".16" />
        <stop offset="1" stop-color="var(--scene-spectrum-pink)" />
      </linearGradient>
    </defs>
    <path
      d="M-160 16h376l440 588-188 125ZM1251-40h330v720l-482-201Z"
      fill="url(#scene-observatory-prism)"
    />
    <g fill="none" stroke="var(--scene-line)">
      <path
        d="M-160 16h376l440 588-188 125ZM1251-40h330v720l-482-201ZM-112 16l581 701M1220-40l-211 531 545 270"
      />
      <path d="M-40 577h1520M-40 596h1520M-40 623h1520M-40 666h1520M-40 738h1520M-40 848h1520" />
      <path
        d="M720 556-480 940m1200-384-795 384m795-384-525 384m525-384-263 384m263-384v384m0-384 263 384m-263-384 525 384m-525-384 795 384m-795-384 1200 384"
      />
      <path
        d="M114 32v144m24-120H91m1224 493v123m-25-93h50M110 659h68m-34-33v66m1118-507h56m-28-28v56"
      />
    </g>
    <path
      d="M-20 576h1480M66 163h129l100 136m890 109 69-108h206"
      fill="none"
      stroke="url(#scene-observatory-line)"
      stroke-width="2"
    />
    <g fill="var(--accent)">
      <circle cx="195" cy="163" r="5" />
      <circle cx="1254" cy="300" r="5" />
      <circle cx="144" cy="659" r="3" />
      <circle cx="1289" cy="185" r="3" />
    </g>
  </svg>
</template>

<script setup lang="ts">
import type { AppearancePreset } from '@/types'

defineProps<{ preset: AppearancePreset }>()
</script>
