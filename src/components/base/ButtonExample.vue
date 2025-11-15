<template>
    <div class="button-examples">
        <h2>Enhanced Button Component Examples</h2>

        <!-- Variants -->
        <section class="example-section">
            <h3>Variants</h3>
            <div class="button-group">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
                <Button variant="success">Success</Button>
            </div>
        </section>

        <!-- Sizes -->
        <section class="example-section">
            <h3>Sizes</h3>
            <div class="button-group">
                <Button size="xs">Extra Small</Button>
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
                <Button size="xl">Extra Large</Button>
            </div>
        </section>

        <!-- With Icons -->
        <section class="example-section">
            <h3>With Icons</h3>
            <div class="button-group">
                <Button :icon="Heart" icon-position="left">Like</Button>
                <Button :icon="Share2" icon-position="right" variant="secondary">Share</Button>
                <Button :icon="Download" variant="success">Download</Button>
                <Button :icon="Trash2" variant="danger">Delete</Button>
            </div>
        </section>

        <!-- Icon Only -->
        <section class="example-section">
            <h3>Icon Only</h3>
            <div class="button-group">
                <Button :icon="Heart" size="sm" />
                <Button :icon="Share2" size="md" variant="secondary" />
                <Button :icon="Download" size="lg" variant="success" />
                <Button :icon="Trash2" size="xl" variant="danger" />
            </div>
        </section>

        <!-- States -->
        <section class="example-section">
            <h3>States</h3>
            <div class="button-group">
                <Button>Normal</Button>
                <Button disabled>Disabled</Button>
                <Button loading>Loading</Button>
                <Button :icon="Check" loading>Processing</Button>
            </div>
        </section>

        <!-- Modifiers -->
        <section class="example-section">
            <h3>Modifiers</h3>
            <div class="button-group-vertical">
                <Button full-width>Full Width Button</Button>
                <Button rounded>Rounded Button</Button>
                <Button rounded :icon="Heart">Rounded with Icon</Button>
            </div>
        </section>

        <!-- Ripple Effect Demo -->
        <section class="example-section">
            <h3>Ripple Effect (Click to see)</h3>
            <div class="button-group">
                <Button @click="handleClick">Click Me!</Button>
                <Button variant="secondary" @click="handleClick">Click Me Too!</Button>
                <Button variant="danger" @click="handleClick">And Me!</Button>
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
import Button from './Button.vue'
import { Heart, Share2, Download, Trash2, Check } from 'lucide-vue-next'

const handleClick = () => {
    console.log('Button clicked with ripple effect!')
}
</script>

<style scoped>
.button-examples {
    padding: var(--spacing-8);
    max-width: 1200px;
    margin: 0 auto;
}

h2 {
    font-size: var(--text-3xl);
    font-weight: var(--font-bold);
    margin-bottom: var(--spacing-8);
    color: var(--color-text-primary);
}

.example-section {
    margin-bottom: var(--spacing-10);
    padding: var(--spacing-6);
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur-light);
    border-radius: var(--radius-xl);
    border: 1px solid var(--glass-border);
}

h3 {
    font-size: var(--text-xl);
    font-weight: var(--font-semibold);
    margin-bottom: var(--spacing-4);
    color: var(--color-text-primary);
}

.button-group {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-4);
    align-items: center;
}

.button-group-vertical {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
    max-width: 400px;
}

@media (max-width: 768px) {
    .button-examples {
        padding: var(--spacing-4);
    }

    .example-section {
        padding: var(--spacing-4);
    }
}
</style>
