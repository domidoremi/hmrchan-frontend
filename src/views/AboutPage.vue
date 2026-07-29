<template>
  <div class="hmr-route-page hmr-route-page--about">
    <header class="hmr-page-hero hmr-page-hero--about">
      <div class="hmr-container hmr-page-hero-container">
        <p class="hmr-kicker">{{ t('about.eyebrow') }}</p>
        <h1 class="hmr-page-title" data-hmr-text-reveal>
          <span>{{ t('about.hero.name') }}</span>
          <span>{{ t('about.hero.project') }}</span>
        </h1>
        <p class="hmr-body">{{ t('about.subtitle') }}</p>
        <div class="hmr-actions">
          <a
            class="hmr-cta"
            href="https://takanenonadeshiko.jp/himeri_momiyama/"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ t('about.links.memberPage') }}
          </a>
          <a
            class="hmr-text-link"
            href="https://www.instagram.com/momichan_hime/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Instagram
          </a>
        </div>
      </div>
    </header>

    <section class="hmr-section" data-hmr-reveal>
      <div class="hmr-sticky-split">
        <div class="hmr-sticky-copy">
          <p class="hmr-kicker">{{ t('about.origin.title') }}</p>
          <h2 class="hmr-section-title">{{ t('about.origin.himeri') }}</h2>
          <p class="hmr-body">{{ t('about.origin.himeriRomaji') }}</p>
          <p class="hmr-body">{{ t('about.origin.purpose') }}</p>
        </div>
        <div class="hmr-list">
          <article v-for="item in profileItems" :key="item.id" class="hmr-list-row">
            <strong>{{ t(item.valueKey, item.params ?? {}) }}</strong>
            <span>{{ t(item.labelKey) }}</span>
            <em>{{ item.index }}</em>
          </article>
        </div>
      </div>
    </section>

    <section class="hmr-section" data-hmr-reveal>
      <div class="hmr-sticky-split">
        <div class="hmr-sticky-copy">
          <p class="hmr-kicker">{{ t('about.origin.aboutTitle') }}</p>
          <h2 class="hmr-section-title">{{ t('about.story.title') }}</h2>
          <p class="hmr-body">{{ t('about.story.intro') }}</p>
        </div>
        <div class="hmr-story-stack">
          <article v-for="item in storyItems" :key="item.id" class="hmr-story-block">
            <p class="hmr-kicker">{{ item.index }}</p>
            <strong>{{ t(item.titleKey) }}</strong>
            <span>{{ t(item.bodyKey) }}</span>
          </article>
        </div>
      </div>
    </section>

    <section class="hmr-section hmr-section--tight" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-section-head">
          <p class="hmr-kicker">{{ t('about.links.eyebrow') }}</p>
          <h2 class="hmr-section-title">{{ t('about.links.title') }}</h2>
        </div>
        <div class="hmr-list">
          <a
            v-for="link in officialLinks"
            :key="link.id"
            class="hmr-list-row hmr-list-row--source"
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
          >
            <strong>{{ link.labelKey ? t(link.labelKey) : link.label }}</strong>
            <span>{{ link.description }}</span>
            <em><ExternalLink :size="18" aria-hidden="true" /></em>
          </a>
        </div>
      </div>
    </section>

    <section class="hmr-section hmr-section--tight" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-section-head">
          <p class="hmr-kicker">{{ t('about.links.socialEyebrow') }}</p>
          <h2 class="hmr-section-title">{{ t('about.links.personal') }}</h2>
        </div>
        <div class="hmr-platform-strip hmr-platform-strip--center">
          <a
            v-for="link in personalLinks"
            :key="link.id"
            class="hmr-platform-chip"
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>{{ link.label }}</span>
            <em><ExternalLink :size="14" aria-hidden="true" /></em>
          </a>
        </div>

        <div class="hmr-section-head">
          <p class="hmr-kicker">{{ t('about.links.groupEyebrow') }}</p>
          <h2 class="hmr-section-title">{{ t('about.links.groupSocial') }}</h2>
        </div>
        <div class="hmr-platform-strip hmr-platform-strip--center">
          <a
            v-for="link in groupSocialLinks"
            :key="link.id"
            class="hmr-platform-chip"
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>{{ link.labelKey ? t(link.labelKey) : link.label }}</span>
            <em><ExternalLink :size="14" aria-hidden="true" /></em>
          </a>
        </div>
      </div>
    </section>

    <section class="hmr-section" data-hmr-reveal>
      <div class="hmr-sticky-split">
        <div class="hmr-sticky-copy">
          <p class="hmr-kicker">{{ t('about.features.eyebrow') }}</p>
          <h2 class="hmr-section-title">{{ t('about.features.title') }}</h2>
          <p class="hmr-body">{{ t('about.features.description') }}</p>
        </div>
        <div class="hmr-list">
          <article v-for="item in featureItems" :key="item.id" class="hmr-list-row">
            <strong>{{ t(item.titleKey) }}</strong>
            <span>{{ t(item.bodyKey) }}</span>
            <em>{{ item.index }}</em>
          </article>
        </div>
      </div>
    </section>

    <section class="hmr-section hmr-section--tight" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-section-head">
          <p class="hmr-kicker">{{ t('about.tech.stack') }}</p>
          <h2 class="hmr-section-title">{{ t('about.tech.title') }}</h2>
          <p class="hmr-body">{{ t('about.tech.description') }}</p>
        </div>
        <div class="hmr-platform-strip hmr-platform-strip--center">
          <a
            v-for="item in techStack"
            :key="item.id"
            class="hmr-platform-chip"
            :href="item.url"
            target="_blank"
            rel="noopener noreferrer"
            :title="t(item.descriptionKey)"
          >
            <span>{{ item.name }}</span>
            <em>{{ item.version }}</em>
          </a>
        </div>
      </div>
    </section>

    <section class="hmr-section hmr-section--tight" data-hmr-reveal>
      <div class="hmr-container">
        <p class="hmr-kicker">{{ t('about.footer.eyebrow') }}</p>
        <h2 class="hmr-section-title">{{ t('about.footer.title') }}</h2>
        <p class="hmr-body">{{ t('about.footer.fanProject') }}</p>
        <a
          class="hmr-text-link"
          href="https://github.com/domidoremi"
          target="_blank"
          rel="noopener noreferrer"
        >
          @domidoremi
        </a>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ExternalLink } from '@lucide/vue'
import { useI18n } from 'vue-i18n'

import { useHmrAboutContent } from '@/hmr/composables/useHmrAboutContent'

const { t } = useI18n()
const {
  featureItems,
  groupSocialLinks,
  officialLinks,
  personalLinks,
  profileItems,
  storyItems,
  techStack,
} = useHmrAboutContent()
</script>
