import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import packageJson from '../../package.json'

export interface TechItem {
  name: string
  version: string
  description: string
  url: string
}

// QuickLink interface removed - repository is private

export function extractVersion(version: string | undefined): string {
  if (!version?.trim()) return 'N/A'

  let normalized = version.trim()

  if (normalized.startsWith('npm:')) {
    const aliasSeparator = normalized.lastIndexOf('@')
    if (aliasSeparator <= 4 || aliasSeparator >= normalized.length - 1) return 'N/A'
    normalized = normalized.slice(aliasSeparator + 1)
  }

  const versionNumber = normalized.replace(/^[^\d]+/, '')
  const matched = versionNumber.match(/^(\d+)(?:\.(\d+))?/)
  if (!matched) return 'N/A'

  const major = matched[1]
  const minor = matched[2]
  return minor ? `${major}.${minor}` : major
}

export function useAboutData() {
  const { t } = useI18n()
  const { dependencies: deps, devDependencies: devDeps } = packageJson

  const techStack = computed<TechItem[]>(() => [
    {
      name: 'Vue',
      version: extractVersion(deps.vue),
      description: t('about.tech.vue'),
      url: 'https://vuejs.org',
    },
    {
      name: 'TypeScript',
      version: extractVersion(devDeps.typescript),
      description: t('about.tech.typescript'),
      url: 'https://www.typescriptlang.org',
    },
    {
      name: 'Vite',
      version: extractVersion(devDeps.vite),
      description: t('about.tech.vite'),
      url: 'https://vitejs.dev',
    },
    {
      name: 'Pinia',
      version: extractVersion(deps.pinia),
      description: t('about.tech.pinia'),
      url: 'https://pinia.vuejs.org',
    },
    {
      name: 'Vue Router',
      version: extractVersion(deps['vue-router']),
      description: t('about.tech.router'),
      url: 'https://router.vuejs.org',
    },
    {
      name: 'Vue I18n',
      version: extractVersion(deps['vue-i18n']),
      description: t('about.tech.i18n'),
      url: 'https://vue-i18n.intlify.dev',
    },
    {
      name: 'GSAP',
      version: extractVersion(deps.gsap),
      description: t('about.tech.gsap'),
      url: 'https://gsap.com',
    },
    {
      name: 'Lucide Icons',
      version: extractVersion(deps['@lucide/vue']),
      description: t('about.tech.lucide'),
      url: 'https://lucide.dev',
    },
  ])

  return {
    techStack,
  }
}
