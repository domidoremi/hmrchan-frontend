import { computed, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { Github, FileText, Book } from 'lucide-vue-next'

export interface TechItem {
  name: string
  version: string
  description: string
}

export interface QuickLink {
  name: string
  description: string
  url: string
  icon: Component
}

export function useAboutData() {
  const { t } = useI18n()

  const techStack = computed<TechItem[]>(() => [
    {
      name: 'Vue',
      version: '3.5',
      description: t('about.techStack.vue'),
    },
    {
      name: 'TypeScript',
      version: '5.9',
      description: t('about.techStack.typescript'),
    },
    {
      name: 'Vite',
      version: '7.0',
      description: t('about.techStack.vite'),
    },
    {
      name: 'Pinia',
      version: '3.0',
      description: t('about.techStack.pinia'),
    },
    {
      name: 'Vue Router',
      version: '4.6',
      description: t('about.techStack.router'),
    },
    {
      name: 'Vue I18n',
      version: '11.2',
      description: t('about.techStack.i18n'),
    },
  ])

  const basicChecklist = computed<string[]>(() => [
    t('about.gitChecklist.basic.typeCheck'),
    t('about.gitChecklist.basic.lint'),
    t('about.gitChecklist.basic.format'),
    t('about.gitChecklist.basic.test'),
    t('about.gitChecklist.basic.commit'),
    t('about.gitChecklist.basic.docs'),
  ])

  const featureChecklist = computed<string[]>(() => [
    t('about.gitChecklist.feature.complete'),
    t('about.gitChecklist.feature.tests'),
    t('about.gitChecklist.feature.responsive'),
    t('about.gitChecklist.feature.theme'),
    t('about.gitChecklist.feature.i18n'),
    t('about.gitChecklist.feature.performance'),
  ])

  const productionChecklist = computed<string[]>(() => [
    t('about.gitChecklist.production.allTests'),
    t('about.gitChecklist.production.codeReview'),
    t('about.gitChecklist.production.preview'),
    t('about.gitChecklist.production.version'),
    t('about.gitChecklist.production.changelog'),
    t('about.gitChecklist.production.notify'),
  ])

  const quickLinks = computed<QuickLink[]>(() => [
    {
      name: 'GitHub',
      description: t('about.links.github'),
      url: 'https://github.com/domidoremi/hmrchan-frontend',
      icon: Github,
    },
    {
      name: t('about.links.readme'),
      description: t('about.links.readmeDesc'),
      url: 'https://github.com/domidoremi/hmrchan-frontend/blob/main/README.md',
      icon: FileText,
    },
    {
      name: t('about.links.docs'),
      description: t('about.links.docsDesc'),
      url: 'https://github.com/domidoremi/hmrchan-frontend/blob/main/ABOUT.md',
      icon: Book,
    },
  ])

  return {
    techStack,
    basicChecklist,
    featureChecklist,
    productionChecklist,
    quickLinks,
  }
}
