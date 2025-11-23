<template>
    <MainLayout>
        <div class="contact-page">
            <div class="contact-header glass-card">
                <button class="back-button glass-button" @click="goBack">
                    <ArrowLeft :size="20" />
                    {{ $t('common.back') }}
                </button>

                <h1>{{ $t('contact.title') }}</h1>
                <p class="subtitle">
                    {{ $t('contact.subtitle') }}
                </p>
            </div>

            <div class="contact-content glass-card">
                <section class="contact-section">
                    <h2>{{ $t('contact.githubTitle') }}</h2>
                    <p>
                        {{ $t('contact.githubDesc') }}
                    </p>
                    <a href="https://github.com/domidoremi/hmrchan-frontend/issues" class="contact-link" target="_blank"
                        rel="noopener noreferrer">
                        {{ $t('contact.githubLink') }}
                    </a>
                </section>

                <section class="contact-section">
                    <h2>{{ $t('contact.emailTitle') }}</h2>
                    <p>
                        {{ $t('contact.emailDesc') }}
                    </p>
                </section>
            </div>
        </div>
    </MainLayout>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import MainLayout from '@/components/layout/MainLayout.vue'

const router = useRouter()

const goBack = () => {
    router.back()
}
</script>

<style scoped>
.contact-page {
    max-width: 900px;
    margin: 0 auto;
    padding: var(--spacing-xl);
}

.contact-header {
    padding: var(--spacing-xl);
    margin-bottom: var(--spacing-lg);
}

.back-button {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-md);
    padding: 0.5rem 1rem;
    border: 1px solid var(--glass-border);
    background: var(--glass-bg);
    color: var(--text-primary);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s;
}

.back-button:hover {
    background: rgba(255, 255, 255, 0.1);
}

.contact-header h1 {
    font-size: var(--text-3xl);
    font-weight: 700;
    margin-bottom: var(--spacing-sm);
    color: var(--text-primary);
}

.subtitle {
    font-size: var(--text-md);
    color: var(--text-secondary);
}

.contact-content {
    padding: var(--spacing-xl);
}

.contact-section {
    margin-bottom: var(--spacing-2xl);
}

.contact-section:last-of-type {
    margin-bottom: var(--spacing-xl);
}

.contact-section h2 {
    font-size: var(--text-2xl);
    font-weight: 600;
    margin-bottom: var(--spacing-md);
    color: var(--text-primary);
}

.contact-section p {
    font-size: var(--text-md);
    color: var(--text-secondary);
    line-height: 1.8;
    margin-bottom: var(--spacing-md);
}

.contact-link {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    border-radius: var(--radius-md);
    background: var(--primary-color);
    color: white;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.2s;
}

.contact-link:hover {
    background: var(--primary-dark);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

@media (max-width: 768px) {
    .contact-page {
        padding: var(--spacing-md);
    }

    .contact-header,
    .contact-content {
        padding: var(--spacing-md);
    }

    .contact-header h1 {
        font-size: var(--text-2xl);
    }

    .contact-section h2 {
        font-size: var(--text-xl);
    }
}
</style>
