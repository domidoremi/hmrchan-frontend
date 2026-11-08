<template>
  <div class="journal-display-settings">
    <div class="display-editions" aria-label="站点">
      <a
        v-for="edition in editions"
        :key="edition.id"
        :href="edition.href"
        class="display-edition"
        :class="[edition.id, { selected: edition.id === designEdition }]"
        :aria-current="edition.id === designEdition ? 'true' : undefined"
      >
        <span class="display-edition-art" aria-hidden="true"><i /><i /><i /><b>m.</b></span>
        <span class="display-edition-label"
          ><strong>{{ edition.label }}</strong
          ><span>{{ edition.id === designEdition ? '当前站点' : '前往 ↗' }}</span></span
        >
      </a>
    </div>
    <div class="display-motion-row">
      <div>
        <h3>动效</h3>
        <span>此设备</span>
      </div>
      <div class="display-motion-options" role="group" aria-label="动效">
        <button type="button" :aria-pressed="motion === 'full'" @click="selectMotion('full')">
          完整
        </button>
        <button type="button" :aria-pressed="motion === 'reduced'" @click="selectMotion('reduced')">
          简化
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { designEdition } from '@/config/designEdition'

const editions = [
  { id: 'editorial', label: '杂志', href: 'https://momichan.com' },
  { id: 'archive', label: '资料库', href: 'https://next.momichan.com' },
]
const motion = ref<'full' | 'reduced'>('full')
function syncMotion() {
  motion.value = document.body.dataset['motion'] === 'reduced' ? 'reduced' : 'full'
}
function selectMotion(value: 'full' | 'reduced') {
  document.dispatchEvent(new CustomEvent('journalmotionrequest', { detail: value }))
}
onMounted(() => {
  document.addEventListener('journalmotionchange', syncMotion)
  void nextTick(syncMotion)
})
onBeforeUnmount(() => document.removeEventListener('journalmotionchange', syncMotion))
</script>

<style scoped>
.journal-display-settings {
  display: grid;
  gap: 32px;
}
.display-editions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}
.display-edition {
  display: grid;
  color: var(--ink);
  border: 1px solid var(--line);
  border-radius: 4px;
  overflow: hidden;
}
.display-edition.selected {
  border-color: var(--accent);
}
.display-edition-art {
  position: relative;
  display: grid;
  place-items: center;
  height: 180px;
  overflow: hidden;
  perspective: 800px;
  background: #e8e4d8;
  color: #2d3029;
}
.display-edition-art i {
  position: absolute;
  width: 108px;
  height: 140px;
  background: #faf9f3;
  border: 1px solid #c5c2b5;
  transform: rotateY(-20deg) rotateZ(-10deg);
  transition: transform 0.6s;
}
.display-edition-art i:nth-child(1) {
  transform: translate(28px, -8px) rotateY(-20deg) rotateZ(9deg);
  background: #b83d29;
}
.display-edition-art i:nth-child(2) {
  transform: translate(14px, -4px) rotateY(-20deg) rotateZ(0deg);
  background: #dad7ca;
}
.display-edition-art b {
  position: relative;
  font:
    64px Georgia,
    serif;
  transform: rotateY(-20deg) rotateZ(-10deg);
}
.display-edition.archive .display-edition-art {
  background: #10211b;
  color: #b8f4ce;
}
.display-edition.archive .display-edition-art i {
  background: #244437;
  border-color: #668675;
  width: 150px;
  height: 96px;
  transform: rotateX(40deg) rotateZ(-24deg);
}
.display-edition.archive .display-edition-art i:nth-child(1) {
  transform: translateY(22px) rotateX(40deg) rotateZ(-24deg);
  background: #406b53;
}
.display-edition.archive .display-edition-art i:nth-child(2) {
  transform: translateY(11px) rotateX(40deg) rotateZ(-24deg);
  background: #315440;
}
.display-edition.archive .display-edition-art b {
  transform: rotateX(40deg) rotateZ(-24deg);
}
.display-edition:hover .display-edition-art i:first-child {
  transform: translate(36px, -12px) rotateY(-20deg) rotateZ(14deg);
}
.display-edition.archive:hover .display-edition-art i:first-child {
  transform: translateY(32px) rotateX(40deg) rotateZ(-24deg);
}
.display-edition-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  gap: 12px;
  font-size: 14px;
}
.display-edition-label strong {
  font-weight: 500;
}
.display-edition-label > span {
  color: var(--muted);
  font-size: 12px;
}
.display-motion-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-block: 24px;
  gap: 20px;
  border-top: 1px solid var(--line);
}
.display-motion-row h3 {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 500;
}
.display-motion-row > div > span {
  font-size: 12px;
  color: var(--muted);
}
.display-motion-options {
  display: flex;
  padding: 4px;
  border: 1px solid var(--line);
  border-radius: 4px;
}
.display-motion-options button {
  padding: 12px 28px;
  min-height: 44px;
  border-radius: 2px;
  color: var(--muted);
}
.display-motion-options button[aria-pressed='true'] {
  color: var(--paper);
  background: var(--ink);
}
@media (max-width: 600px) {
  .display-editions {
    gap: 12px;
  }
  .display-edition-art {
    height: 140px;
  }
  .display-edition-label {
    flex-direction: column;
    align-items: start;
    gap: 6px;
    padding: 12px;
  }
  .display-motion-options button {
    padding: 12px 20px;
  }
}
</style>
