import type { RouteRecordRaw } from 'vue-router'

import { isBrandWorkSlug } from '@/brand-appart/content/pageSources'

declare module 'vue-router' {
  interface RouteMeta {
    mirrorPath?: string
  }
}

function mirrorProps(path: string) {
  return {
    mirrorPath: path,
    requestedPath: path,
    notFound: path === '/404',
  }
}

export const appRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/brand-appart/layout/BrandAppartSiteLayout.vue'),
    children: [
      {
        path: '',
        name: 'brand-home',
        component: () => import('@/brand-appart/components/BrandRawPage.vue'),
        props: mirrorProps('/'),
        meta: { mirrorPath: '/' },
      },
      {
        path: 'works',
        name: 'brand-works',
        component: () => import('@/brand-appart/components/BrandRawPage.vue'),
        props: mirrorProps('/works'),
        meta: { mirrorPath: '/works' },
      },
      {
        path: 'about',
        name: 'brand-about',
        component: () => import('@/brand-appart/components/BrandRawPage.vue'),
        props: mirrorProps('/about'),
        meta: { mirrorPath: '/about' },
      },
      {
        path: 'start-a-project',
        name: 'brand-start-a-project',
        component: () => import('@/brand-appart/components/BrandRawPage.vue'),
        props: mirrorProps('/start-a-project'),
        meta: { mirrorPath: '/start-a-project' },
      },
      {
        path: 'contact',
        name: 'brand-contact',
        component: () => import('@/brand-appart/components/BrandRawPage.vue'),
        props: mirrorProps('/contact'),
        meta: { mirrorPath: '/contact' },
      },
      {
        path: 'join-us',
        name: 'brand-join-us',
        component: () => import('@/brand-appart/components/BrandRawPage.vue'),
        props: mirrorProps('/join-us'),
        meta: { mirrorPath: '/join-us' },
      },
      {
        path: 'thank-you',
        name: 'brand-thank-you',
        component: () => import('@/brand-appart/components/BrandRawPage.vue'),
        props: mirrorProps('/thank-you'),
        meta: { mirrorPath: '/thank-you' },
      },
      {
        path: 'work/:slug',
        name: 'brand-work-detail',
        component: () => import('@/brand-appart/components/BrandRawPage.vue'),
        props: (to) => {
          const slug = Array.isArray(to.params.slug) ? to.params.slug[0] : to.params.slug

          if (!slug || !isBrandWorkSlug(slug)) {
            return {
              mirrorPath: '/404',
              requestedPath: to.path,
              notFound: true,
            }
          }

          return {
            mirrorPath: `/work/${slug}`,
            requestedPath: to.path,
            notFound: false,
          }
        },
      },
      {
        path: ':pathMatch(.*)*',
        name: 'brand-not-found',
        component: () => import('@/brand-appart/components/BrandRawPage.vue'),
        props: (to) => ({
          mirrorPath: '/404',
          requestedPath: to.path,
          notFound: true,
        }),
        meta: { mirrorPath: '/404' },
      },
    ],
  },
]
