<template>
  <section
    class="journal-route-state"
    :class="{ 'is-error': error }"
    :data-state="error ? 'error' : slow ? 'slow' : 'loading'"
  >
    <div class="route-state-heading">
      <div>
        <span class="route-state-eyebrow"
          >{{ isArchive ? 'ARCHIVE' : 'THE JOURNAL' }} / {{ pageLabel }}</span
        >
        <h1>
          {{ error ? '这一页暂时未能载入。' : isArchive ? '正在读取内容。' : '正在翻开这一页。' }}
        </h1>
        <p role="status" aria-live="polite">
          {{
            error
              ? '请检查网络后重试，或继续浏览其他页面。'
              : slow
                ? '仍在载入，请稍候。'
                : isArchive
                  ? '记录与预览即将就绪。'
                  : '内容正在载入，稍后即可阅读。'
          }}
        </p>
      </div>
      <div class="route-state-mark" aria-hidden="true" />
    </div>
    <template v-if="!error">
      <div class="route-state-progress" aria-hidden="true" />
      <div class="route-state-skeleton" aria-hidden="true">
        <div class="route-state-lines"><i /><i /><i /><i /><i /></div>
        <div class="route-state-preview"><i /><i /><i /></div>
      </div>
    </template>
    <div v-if="error || slow" class="route-state-recovery">
      <p v-if="slow && !error">加载时间比平时长，可以继续等待或重新加载。</p>
      <div>
        <button class="button button-dark" @click="reloadPage">
          重新加载 <span aria-hidden="true">↗</span>
        </button>
        <RouterLink class="button button-outline" to="/">返回首页</RouterLink>
      </div>
    </div>
  </section>
</template>
<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { designEdition } from '@/config/designEdition'

defineProps<{ error?: Error }>()
const route = useRoute()
const isArchive = designEdition === 'archive'
const pageLabel = computed(() => {
  if (route.path === '/schedule') return isArchive ? '月历' : '日程'
  if (route.path === '/community') return isArchive ? '讨论' : '社区'
  if (route.path === '/profile/favorites') return '我的收藏'
  if (route.path === '/explore') return isArchive ? '资料检索' : '动态'
  return '页面载入'
})
const slow = ref(false)
let slowTimer: ReturnType<typeof setTimeout> | undefined
onMounted(() => {
  slowTimer = setTimeout(() => {
    slow.value = true
  }, 8000)
})
onBeforeUnmount(() => clearTimeout(slowTimer))
function reloadPage() {
  window.location.reload()
}
</script>
<style scoped>
.journal-route-state {
  padding: 52px 48px;
  min-height: min(720px, 80svh);
  color: var(--ink);
}
.route-state-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  margin-bottom: 32px;
}
.route-state-eyebrow {
  color: var(--accent);
  font: 10px/1.6 monospace;
  letter-spacing: 0.12em;
}
.route-state-heading h1 {
  margin: 16px 0;
  font:
    400 clamp(28px, 4vw, 52px)/1.2 Georgia,
    'Songti SC',
    serif;
}
.route-state-heading p,
.route-state-recovery p {
  margin: 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.8;
}
.route-state-mark {
  width: 52px;
  height: 64px;
  flex: none;
  border: 1px solid var(--line);
  border-top: 3px solid var(--accent);
  background: var(--paper);
  transform: rotate(5deg);
}
.route-state-progress {
  height: 2px;
  margin-bottom: 36px;
  background: var(--line);
  overflow: hidden;
}
.route-state-progress::before {
  content: '';
  display: block;
  height: 100%;
  width: 24%;
  background: var(--accent);
  animation: route-state-progress 1.8s ease-in-out infinite;
}
@keyframes route-state-progress {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(520%);
  }
}
.route-state-skeleton {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 64px;
  min-height: 280px;
}
.route-state-lines {
  padding-top: 20px;
}
.route-state-lines i {
  display: block;
  height: 10px;
  width: 100%;
  margin-bottom: 22px;
  background: var(--line);
  opacity: 0.55;
}
.route-state-lines i:first-child {
  width: 42%;
}
.route-state-lines i:nth-child(2) {
  height: 26px;
  margin-block: 32px;
  width: 85%;
}
.route-state-lines i:nth-child(4) {
  width: 68%;
}
.route-state-preview {
  position: relative;
  min-height: 280px;
}
.route-state-preview i {
  position: absolute;
  inset: 12px 12%;
  border: 1px solid var(--line);
  background: var(--paper);
  transform: rotate(-6deg);
}
.route-state-preview i:nth-child(2) {
  transform: rotate(6deg);
}
.route-state-preview i:last-child {
  transform: rotate(-1deg);
  inset: 0 16% 22px;
}
.route-state-preview i:last-child::after {
  content: '';
  display: block;
  height: 76%;
  margin: 18px;
  background: var(--canvas);
}
.route-state-recovery {
  padding-top: 26px;
}
.route-state-recovery > div {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.route-state-recovery .button {
  min-height: 44px;
}
.route-state-recovery p {
  margin-bottom: 20px;
}
.is-error .route-state-recovery {
  border-top: 1px solid var(--line);
}
.edition-archive .route-state-heading h1 {
  font-family: inherit;
  font-size: clamp(28px, 3vw, 38px);
}
.edition-archive .route-state-mark {
  height: 52px;
  transform: none;
  background: repeating-linear-gradient(0deg, var(--paper), var(--paper) 10px, var(--line) 11px);
}
.edition-archive .route-state-skeleton {
  grid-template-columns: 1.1fr 0.9fr;
  gap: 36px;
}
.edition-archive .route-state-lines {
  padding: 0;
  border-top: 1px solid var(--line);
}
.edition-archive .route-state-lines i {
  height: 56px;
  width: 100%;
  margin: 0;
  border-bottom: 1px solid var(--line);
  background: linear-gradient(var(--line), var(--line)) left center / 65% 8px no-repeat;
}
.edition-archive .route-state-preview {
  padding: 24px;
  border: 1px solid var(--line);
  background: var(--paper);
}
.edition-archive .route-state-preview i {
  display: none;
}
.edition-archive .route-state-preview i:last-child {
  display: block;
  inset: 24px;
  transform: none;
  border: none;
  background: var(--canvas);
}
.edition-archive .route-state-preview i:last-child::after {
  display: none;
}
body[data-motion='reduced'] .route-state-progress::before {
  animation: none;
  width: 100%;
  opacity: 0.5;
}
@media (prefers-reduced-motion: reduce) {
  .route-state-progress::before {
    animation: none;
    width: 100%;
    opacity: 0.5;
  }
}
@media (max-width: 760px) {
  .journal-route-state {
    padding: 32px 18px;
  }
  .route-state-heading {
    align-items: flex-start;
    gap: 14px;
  }
  .route-state-mark {
    width: 32px;
    height: 42px;
    margin-top: 28px;
  }
  .edition-archive .route-state-mark {
    height: 32px;
  }
  .route-state-heading h1 {
    font-size: 28px;
  }
  .route-state-skeleton,
  .edition-archive .route-state-skeleton {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  .route-state-lines {
    padding: 0;
  }
  .route-state-lines i:nth-child(n + 4) {
    display: none;
  }
  .edition-editorial .route-state-lines i:nth-child(2) {
    margin-block: 14px 22px;
  }
  .route-state-preview,
  .edition-archive .route-state-preview {
    min-height: 220px;
  }
}
</style>
