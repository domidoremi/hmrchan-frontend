import packageJson from '../../../package.json'

export interface HmrAboutProfileItem {
  id: string
  index: string
  labelKey: string
  params?: Record<string, number>
  valueKey: string
}

export interface HmrAboutStoryItem {
  id: string
  index: string
  titleKey: string
  bodyKey: string
}

export interface HmrAboutLink {
  id: string
  label: string
  labelKey?: string
  description?: string
  url: string
}

export interface HmrAboutFeatureItem {
  id: string
  index: string
  titleKey: string
  bodyKey: string
}

export interface HmrAboutTechnology {
  id: string
  name: string
  version: string
  descriptionKey: string
  url: string
}

const dependencies = packageJson.dependencies as Record<string, string | undefined>
const devDependencies = packageJson.devDependencies as Record<string, string | undefined>

const profileItems: HmrAboutProfileItem[] = [
  {
    id: 'birthday',
    index: '01',
    labelKey: 'about.origin.profileLabels.birthday',
    valueKey: 'about.origin.profile.birthday',
  },
  {
    id: 'age',
    index: '02',
    labelKey: 'about.origin.profileLabels.age',
    params: { age: calculateAge() },
    valueKey: 'about.origin.profile.age',
  },
  {
    id: 'blood-type',
    index: '03',
    labelKey: 'about.origin.profileLabels.bloodType',
    valueKey: 'about.origin.profile.bloodType',
  },
  {
    id: 'zodiac',
    index: '04',
    labelKey: 'about.origin.profileLabels.zodiac',
    valueKey: 'about.origin.profile.zodiac',
  },
  {
    id: 'height',
    index: '05',
    labelKey: 'about.origin.profileLabels.height',
    valueKey: 'about.origin.profile.height',
  },
  {
    id: 'birthplace',
    index: '06',
    labelKey: 'about.origin.profileLabels.birthplace',
    valueKey: 'about.origin.profile.birthplace',
  },
  {
    id: 'group',
    index: '07',
    labelKey: 'about.origin.profileLabels.group',
    valueKey: 'about.origin.profile.group',
  },
  {
    id: 'position',
    index: '08',
    labelKey: 'about.origin.profileLabels.position',
    valueKey: 'about.origin.profile.position',
  },
  {
    id: 'nickname',
    index: '09',
    labelKey: 'about.origin.profileLabels.nickname',
    valueKey: 'about.origin.profile.nickname',
  },
  {
    id: 'hobbies',
    index: '10',
    labelKey: 'about.origin.profileLabels.hobbies',
    valueKey: 'about.origin.profile.hobbies',
  },
  {
    id: 'skills',
    index: '11',
    labelKey: 'about.origin.profileLabels.skills',
    valueKey: 'about.origin.profile.skills',
  },
]

const storyItems: HmrAboutStoryItem[] = [
  {
    id: 'career',
    index: '01',
    titleKey: 'about.story.careerTitle',
    bodyKey: 'about.origin.career',
  },
  {
    id: 'creative-work',
    index: '02',
    titleKey: 'about.story.creativeTitle',
    bodyKey: 'about.origin.personality',
  },
  {
    id: 'platforms',
    index: '03',
    titleKey: 'about.story.platformsTitle',
    bodyKey: 'about.origin.platforms',
  },
]

const officialLinks: HmrAboutLink[] = [
  {
    id: 'group-site',
    label: '',
    labelKey: 'about.links.groupSite',
    description: 'takanenonadeshiko.jp',
    url: 'https://takanenonadeshiko.jp/',
  },
  {
    id: 'member-page',
    label: '',
    labelKey: 'about.links.memberPage',
    description: 'himeri_momiyama',
    url: 'https://takanenonadeshiko.jp/himeri_momiyama/',
  },
  {
    id: 'schedule',
    label: '',
    labelKey: 'about.links.schedule',
    description: 'takanenonadeshiko.jp/schedule',
    url: 'https://takanenonadeshiko.jp/schedule/',
  },
  {
    id: 'fan-club',
    label: '',
    labelKey: 'about.links.fanClub',
    description: 'takanekofc.com',
    url: 'https://takanekofc.com/',
  },
  {
    id: 'shop',
    label: '',
    labelKey: 'about.links.ecShop',
    description: 'takanenonadeshiko-ec.com',
    url: 'https://takanenonadeshiko-ec.com/',
  },
]

const personalLinks: HmrAboutLink[] = [
  { id: 'x', label: 'X', url: 'https://x.com/himeri_momiyama' },
  { id: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/momichan_hime/' },
  { id: 'tiktok', label: 'TikTok', url: 'https://www.tiktok.com/@momichan_hime/' },
  { id: 'showroom', label: 'SHOWROOM', url: 'https://www.showroom-live.com/r/himeri_momiyama' },
]

const groupSocialLinks: HmrAboutLink[] = [
  {
    id: 'youtube',
    label: 'YouTube',
    url: 'https://www.youtube.com/channel/UCoR4zZDvWvUIqgEWz4HS-sA',
  },
  { id: 'tiktok', label: 'TikTok', url: 'https://www.tiktok.com/@takanenofficial' },
  { id: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/takanenofficial/' },
  {
    id: 'discord',
    label: 'Discord',
    url: 'https://discord.gg/gao-ling-nonadeshiko-1158648392516378624',
  },
  { id: 'line', label: 'LINE', url: 'https://line.me/R/ti/p/@620abpnj' },
  {
    id: 'facebook',
    label: 'Facebook',
    url: 'https://www.facebook.com/people/高嶺のなでしこ-Takane-No-Nadeshiko/61554973852737/',
  },
  {
    id: 'douyin',
    label: '',
    labelKey: 'about.links.douyin',
    url: 'https://www.douyin.com/user/MS4wLjABAAAAQYxY_cUHv7K8JyUWvWB0hOCp4U-oMp81Zr8g52KxBxI',
  },
  {
    id: 'red',
    label: '',
    labelKey: 'about.links.redbook',
    url: 'https://www.xiaohongshu.com/user/profile/670366fd000000001d033fdf',
  },
  { id: 'weibo', label: 'Weibo', url: 'https://weibo.com/u/7953892369' },
  { id: 'bilibili', label: 'Bilibili', url: 'https://space.bilibili.com/3493257990375590' },
  { id: 'bereal', label: 'BeReal', url: 'https://bere.al/takanenofficial' },
]

const featureItems: HmrAboutFeatureItem[] = [
  {
    id: 'aggregation',
    index: '01',
    titleKey: 'about.features.aggregation',
    bodyKey: 'about.features.aggregationDesc',
  },
  {
    id: 'community',
    index: '02',
    titleKey: 'about.features.community',
    bodyKey: 'about.features.communityDesc',
  },
  {
    id: 'personalization',
    index: '03',
    titleKey: 'about.features.personalization',
    bodyKey: 'about.features.personalizationDesc',
  },
  {
    id: 'multilingual',
    index: '04',
    titleKey: 'about.features.multilingual',
    bodyKey: 'about.features.multilingualDesc',
  },
]

export function extractVersion(version: string | undefined): string {
  if (!version?.trim()) return 'N/A'

  const normalized = version.trim()
  const aliasVersion = normalized.startsWith('npm:')
    ? normalized.slice(normalized.lastIndexOf('@') + 1)
    : normalized
  const match = aliasVersion.replace(/^[^\d]+/, '').match(/^(\d+)(?:\.(\d+))?/)
  if (!match) return 'N/A'

  return match[2] ? `${match[1]}.${match[2]}` : (match[1] ?? 'N/A')
}

export function calculateAge(now: Date = new Date()): number {
  const birthdayMonth = 2
  const birthdayDate = 22
  const birthdayPassed =
    now.getMonth() > birthdayMonth ||
    (now.getMonth() === birthdayMonth && now.getDate() >= birthdayDate)

  return now.getFullYear() - 2004 - (birthdayPassed ? 0 : 1)
}

const techStack: HmrAboutTechnology[] = [
  {
    id: 'vue',
    name: 'Vue',
    version: extractVersion(dependencies['vue']),
    descriptionKey: 'about.tech.vue',
    url: 'https://vuejs.org/',
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    version: extractVersion(devDependencies['typescript']),
    descriptionKey: 'about.tech.typescript',
    url: 'https://www.typescriptlang.org/',
  },
  {
    id: 'vite',
    name: 'Vite',
    version: extractVersion(devDependencies['vite']),
    descriptionKey: 'about.tech.vite',
    url: 'https://vite.dev/',
  },
  {
    id: 'pinia',
    name: 'Pinia',
    version: extractVersion(dependencies['pinia']),
    descriptionKey: 'about.tech.pinia',
    url: 'https://pinia.vuejs.org/',
  },
  {
    id: 'router',
    name: 'Vue Router',
    version: extractVersion(dependencies['vue-router']),
    descriptionKey: 'about.tech.router',
    url: 'https://router.vuejs.org/',
  },
  {
    id: 'i18n',
    name: 'Vue I18n',
    version: extractVersion(dependencies['vue-i18n']),
    descriptionKey: 'about.tech.i18n',
    url: 'https://vue-i18n.intlify.dev/',
  },
  {
    id: 'lucide',
    name: 'Lucide',
    version: extractVersion(dependencies['@lucide/vue']),
    descriptionKey: 'about.tech.lucide',
    url: 'https://lucide.dev/',
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare Pages',
    version: 'Edge',
    descriptionKey: 'about.tech.cloudflare',
    url: 'https://developers.cloudflare.com/pages/',
  },
  {
    id: 'vitest',
    name: 'Vitest',
    version: extractVersion(devDependencies['vitest']),
    descriptionKey: 'about.tech.vitest',
    url: 'https://vitest.dev/',
  },
  {
    id: 'bun',
    name: 'Bun',
    version: packageJson.packageManager.replace(/^bun@/, ''),
    descriptionKey: 'about.tech.bun',
    url: 'https://bun.sh/',
  },
]

export function useHmrAboutContent() {
  return {
    featureItems,
    groupSocialLinks,
    officialLinks,
    personalLinks,
    profileItems,
    storyItems,
    techStack,
  }
}
