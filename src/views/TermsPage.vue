<template>
    <MainLayout>
        <div class="terms-page">
            <div class="terms-header glass-card">
                <button class="back-button glass-button" @click="goBack">
                    <ArrowLeft :size="20" />
                    {{ $t('common.back', 'Back') }}
                </button>

                <h1>{{ $t('terms.title', 'Terms of Use') }}</h1>
            </div>

            <div class="terms-content glass-card">
                <section class="terms-section">
                    <h2>{{ $t('terms.introTitle', 'Introduction') }}</h2>
                    <p>
                        {{
                            $t(
                                'terms.intro',
                                'By using this service, you agree to the following basic terms. Please read them carefully
                        before continuing to use the site.',
                            )
                        }}
                    </p>
                </section>

                <section class="terms-section">
                    <h2>{{ $t('terms.usageTitle', 'Acceptable Use') }}</h2>
                    <p>
                        {{
                            $t(
                                'terms.usage',
                                'You agree not to abuse, reverse engineer, or use this service in ways that may harm the system,
                        other users, or the underlying data sources.',
                            )
                        }}
                    </p>
                </section>

                <section class="terms-section">
                    <h2>{{ $t('terms.changesTitle', 'Changes to Terms') }}</h2>
                    <p>
                        {{
                            $t(
                                'terms.changes',
                                'These terms may be updated from time to time. Continued use of the service after changes means
                        you accept the updated terms.',
                            )
                        }}
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
.terms-page {
    max-width: 900px;
    margin: 0 auto;
    padding: var(--spacing-xl);
}

.terms-header {
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

.terms-header h1 {
    font-size: var(--text-3xl);
    font-weight: 700;
    margin-bottom: var(--spacing-sm);
    color: var(--text-primary);
}

.terms-content {
    padding: var(--spacing-xl);
}

.terms-section {
    margin-bottom: var(--spacing-2xl);
}

.terms-section:last-of-type {
    margin-bottom: var(--spacing-xl);
}

.terms-section h2 {
    font-size: var(--text-2xl);
    font-weight: 600;
    margin-bottom: var(--spacing-md);
    color: var(--text-primary);
}

.terms-section p {
    font-size: var(--text-md);
    color: var(--text-secondary);
    line-height: 1.8;
}

@media (max-width: 768px) {
    .terms-page {
        padding: var(--spacing-md);
    }

    .terms-header,
    .terms-content {
        padding: var(--spacing-md);
    }

    .terms-header h1 {
        font-size: var(--text-2xl);
    }

    .terms-section h2 {
        font-size: var(--text-xl);
    }
}
</style>
