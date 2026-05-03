export const brandWorkSlugs = [
  'bricks',
  'decla-fr',
  'dermis',
  'forbes',
  'gostan',
  'incard',
  'jalao',
  'jaws-group',
  'mekaa',
  'notez-nous',
  'novo',
  'olea',
  'onlycard',
  'qonnect',
  'reecall',
  'robinsur',
  'sobry',
  'sound-experience',
  'sowbeez',
  'stables',
  'trends',
  'varzii',
  'very-mountain',
  'voodoo',
  'we-are',
] as const

export type BrandWorkSlug = (typeof brandWorkSlugs)[number]

export interface BrandHeadMeta {
  title: string
  metas: Array<Record<string, string>>
  links: Array<Record<string, string>>
  jsonLd: string[]
}

export interface BrandFormBehavior {
  mode: 'none' | 'route-only' | 'local-success'
  successPath?: string
}

export interface BrandMirrorRoute {
  key: string
  path: string
  requestedPath?: string
  notFound?: boolean
}

export interface BrandMirrorPageSource extends BrandMirrorRoute {
  bodyPath: string
  status: number
  formBehavior: BrandFormBehavior
}

const staticMirrorRoutes = [
  { key: 'home', path: '/' },
  { key: 'works', path: '/works' },
  { key: 'about', path: '/about' },
  { key: 'start-a-project', path: '/start-a-project' },
  { key: 'contact', path: '/contact' },
  { key: 'join-us', path: '/join-us' },
  { key: 'thank-you', path: '/thank-you' },
] as const satisfies readonly BrandMirrorRoute[]

export const brandMirrorRoutes: BrandMirrorRoute[] = [
  ...staticMirrorRoutes,
  ...brandWorkSlugs.map((slug) => ({
    key: `work-${slug}`,
    path: `/work/${slug}`,
  })),
  {
    key: 'not-found',
    path: '/404',
    notFound: true,
  },
]

function toBodyPath(path: string): string {
  if (path === '/') {
    return '/brand-appart/pages/index.html'
  }

  if (path === '/404') {
    return '/brand-appart/pages/404.html'
  }

  return `/brand-appart/pages${path}.html`
}

function defaultFormBehavior(path: string): BrandFormBehavior {
  if (path === '/contact' || path === '/start-a-project' || path === '/join-us') {
    return {
      mode: 'route-only',
      successPath: '/thank-you',
    }
  }

  return { mode: 'none' }
}

export function isBrandWorkSlug(value: string): value is BrandWorkSlug {
  return brandWorkSlugs.includes(value as BrandWorkSlug)
}

export function createMirrorPageSource(
  path: string,
  options: Partial<
    Pick<BrandMirrorPageSource, 'key' | 'requestedPath' | 'notFound' | 'status'>
  > = {}
): BrandMirrorPageSource {
  return {
    key: options.key ?? path,
    path,
    requestedPath: options.requestedPath ?? path,
    notFound: options.notFound ?? path === '/404',
    bodyPath: toBodyPath(path),
    status: options.status ?? (path === '/404' ? 404 : 200),
    formBehavior: defaultFormBehavior(path),
  }
}

export function resolveBrandMirrorSource(path: string): BrandMirrorPageSource {
  const normalizedPath = path === '' ? '/' : path
  const knownRoute = brandMirrorRoutes.find((route) => route.path === normalizedPath)

  if (knownRoute) {
    return createMirrorPageSource(knownRoute.path, {
      key: knownRoute.key,
      requestedPath: path,
      notFound: knownRoute.notFound,
    })
  }

  return createMirrorPageSource('/404', {
    key: 'not-found',
    requestedPath: path,
    notFound: true,
    status: 404,
  })
}
