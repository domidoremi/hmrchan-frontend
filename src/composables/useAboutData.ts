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

/**
 * 从 package.json 版本号中提取主版本号
 * 例如: "^3.5.26" -> "3.5", "~5.9.3" -> "5.9", "npm:rolldown-vite@^7.3.1" -> "7.3"
 */
export function extractVersion(version: string | undefined): string {
  if (!version?.trim()) return 'N/A'

  // 处理 npm: 前缀的特殊情况 (如 vite)
  const cleanVersion = version.includes('@') ? version.split('@')[1] : version
  if (!cleanVersion) return 'N/A'

  // 移除 ^, ~, >= 等前缀
  const versionNumber = cleanVersion.replace(/^[^\d]+/, '')
  // 提取主版本号和次版本号
  const parts = versionNumber.split('.')
  return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : parts[0] || 'N/A'
}

export function useAboutData() {
  const { t } = useI18n()
  const { dependencies: deps, devDependencies: devDeps } = packageJson

  const techStack = computed<TechItem[]>(() => [
    {
      name: 'Vue',
      version: extractVersion(deps.vue),
      description: t('about.techStack.vue'),
      url: 'https://vuejs.org',
    },
    {
      name: 'TypeScript',
      version: extractVersion(devDeps.typescript),
      description: t('about.techStack.typescript'),
      url: 'https://www.typescriptlang.org',
    },
    {
      name: 'Vite',
      version: extractVersion(devDeps.vite),
      description: t('about.techStack.vite'),
      url: 'https://vitejs.dev',
    },
    {
      name: 'Pinia',
      version: extractVersion(deps.pinia),
      description: t('about.techStack.pinia'),
      url: 'https://pinia.vuejs.org',
    },
    {
      name: 'Vue Router',
      version: extractVersion(deps['vue-router']),
      description: t('about.techStack.router'),
      url: 'https://router.vuejs.org',
    },
    {
      name: 'Vue I18n',
      version: extractVersion(deps['vue-i18n']),
      description: t('about.techStack.i18n'),
      url: 'https://vue-i18n.intlify.dev',
    },
    {
      name: 'GSAP',
      version: extractVersion(deps.gsap),
      description: t('about.techStack.gsap'),
      url: 'https://gsap.com',
    },
    {
      name: 'Lucide Icons',
      version: extractVersion(deps['lucide-vue-next']),
      description: t('about.techStack.lucide'),
      url: 'https://lucide.dev',
    },
  ])

  return {
    techStack,
  }
}
