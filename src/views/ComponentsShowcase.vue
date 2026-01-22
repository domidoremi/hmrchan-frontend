<template>
  <div class="showcase">
    <div class="container">
      <div class="showcase-header">
        <h1>shadcn/ui 风格组件</h1>
        <p>使用 CSS 变量实现的 shadcn/ui 风格组件库</p>
      </div>

      <!-- Buttons Section -->
      <section class="showcase-section">
        <h2>Buttons</h2>
        <p class="section-desc">多种变体和尺寸的按钮组件</p>

        <div class="showcase-group">
          <h3>变体 (Variants)</h3>
          <div class="button-grid">
            <ButtonShadcn variant="default">Default</ButtonShadcn>
            <ButtonShadcn variant="destructive">Destructive</ButtonShadcn>
            <ButtonShadcn variant="outline">Outline</ButtonShadcn>
            <ButtonShadcn variant="secondary">Secondary</ButtonShadcn>
            <ButtonShadcn variant="ghost">Ghost</ButtonShadcn>
            <ButtonShadcn variant="link">Link</ButtonShadcn>
          </div>
        </div>

        <div class="showcase-group">
          <h3>尺寸 (Sizes)</h3>
          <div class="button-grid">
            <ButtonShadcn size="sm">Small</ButtonShadcn>
            <ButtonShadcn size="default">Default</ButtonShadcn>
            <ButtonShadcn size="lg">Large</ButtonShadcn>
          </div>
        </div>

        <div class="showcase-group">
          <h3>带图标 (With Icons)</h3>
          <div class="button-grid">
            <ButtonShadcn :icon="Mail" icon-position="left">Email</ButtonShadcn>
            <ButtonShadcn :icon="Download" icon-position="right" variant="outline">
              Download
            </ButtonShadcn>
            <ButtonShadcn :icon="Plus" size="icon" variant="secondary" />
            <ButtonShadcn :icon="Trash2" size="icon" variant="destructive" />
          </div>
        </div>

        <div class="showcase-group">
          <h3>加载状态 (Loading)</h3>
          <div class="button-grid">
            <ButtonShadcn :loading="true">Loading</ButtonShadcn>
            <ButtonShadcn :loading="true" variant="outline">Loading</ButtonShadcn>
            <ButtonShadcn :loading="true" variant="secondary">Loading</ButtonShadcn>
          </div>
        </div>

        <div class="showcase-group">
          <h3>禁用状态 (Disabled)</h3>
          <div class="button-grid">
            <ButtonShadcn :disabled="true">Disabled</ButtonShadcn>
            <ButtonShadcn :disabled="true" variant="outline">Disabled</ButtonShadcn>
            <ButtonShadcn :disabled="true" variant="secondary">Disabled</ButtonShadcn>
          </div>
        </div>
      </section>

      <!-- Comparison Section -->
      <section class="showcase-section">
        <h2>对比：原始 vs shadcn/ui 风格</h2>
        <div class="comparison-grid">
          <div class="comparison-item">
            <h3>原始按钮</h3>
            <div class="button-grid">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </div>
          </div>
          <div class="comparison-item">
            <h3>shadcn/ui 风格</h3>
            <div class="button-grid">
              <ButtonShadcn variant="default">Default</ButtonShadcn>
              <ButtonShadcn variant="secondary">Secondary</ButtonShadcn>
              <ButtonShadcn variant="ghost">Ghost</ButtonShadcn>
              <ButtonShadcn variant="destructive">Destructive</ButtonShadcn>
            </div>
          </div>
        </div>
      </section>

      <!-- Code Example -->
      <section class="showcase-section">
        <h2>使用示例</h2>
        <div class="code-block">
          <pre><code>&lt;ButtonShadcn variant="default"&gt;Click me&lt;/ButtonShadcn&gt;
&lt;ButtonShadcn variant="outline" :icon="Mail"&gt;Email&lt;/ButtonShadcn&gt;
&lt;ButtonShadcn variant="destructive" :loading="true"&gt;Delete&lt;/ButtonShadcn&gt;</code></pre>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Mail, Download, Plus, Trash2 } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import ButtonShadcn from '@/components/ui/ButtonShadcn.vue'
</script>

<style scoped>
.showcase {
  min-height: 100vh;
  padding: var(--spacing-8) 0;
  background: var(--color-background);
}

.showcase-header {
  text-align: center;
  margin-bottom: var(--spacing-12);
}

.showcase-header h1 {
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-3);
}

.showcase-header p {
  font-size: var(--text-lg);
  color: var(--color-text-secondary);
}

.showcase-section {
  margin-bottom: var(--spacing-16);
  padding: var(--spacing-8);
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-2xl);
}

.showcase-section h2 {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-2);
}

.section-desc {
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-8);
}

.showcase-group {
  margin-bottom: var(--spacing-8);
}

.showcase-group:last-child {
  margin-bottom: 0;
}

.showcase-group h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-4);
}

.button-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-3);
  align-items: center;
}

.comparison-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-6);
}

.comparison-item {
  padding: var(--spacing-6);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
}

.comparison-item h3 {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-4);
}

.code-block {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-4);
  overflow-x: auto;
}

.code-block pre {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--color-text-primary);
}

.code-block code {
  font-family: inherit;
}

@media (max-width: 768px) {
  .showcase {
    padding: var(--spacing-4) 0;
  }

  .showcase-header h1 {
    font-size: var(--text-2xl);
  }

  .showcase-section {
    padding: var(--spacing-4);
  }

  .button-grid {
    flex-direction: column;
    align-items: stretch;
  }

  .comparison-grid {
    grid-template-columns: 1fr;
  }
}
</style>
