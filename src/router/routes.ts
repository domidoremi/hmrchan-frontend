import type { RouteRecordRaw } from 'vue-router'

import type { HmrPublicPageKey } from '@/hmr/types'

declare module 'vue-router' {
  interface RouteMeta {
    pageKey?: HmrPublicPageKey
    navKey?: HmrPublicPageKey
    isPanel?: boolean
    requiresAuth?: boolean
  }
}

export const appRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/HmrSiteShell.vue'),
    children: [
      {
        path: '',
        name: 'hmr-home',
        component: () => import('@/views/HomePage.vue'),
        meta: { pageKey: 'home', navKey: 'home' },
      },
      {
        path: 'explore',
        name: 'hmr-explore',
        component: () => import('@/views/ExplorePage.vue'),
        meta: { pageKey: 'explore', navKey: 'explore' },
      },
      {
        path: 'community',
        name: 'hmr-community',
        component: () => import('@/views/CommunityPage.vue'),
        meta: { pageKey: 'community', navKey: 'community' },
      },
      {
        path: 'schedule',
        name: 'hmr-schedule',
        component: () => import('@/views/SchedulePage.vue'),
        meta: { pageKey: 'schedule', navKey: 'schedule' },
      },
      {
        path: 'settings',
        name: 'hmr-settings',
        component: () => import('@/views/SettingsPage.vue'),
        meta: { pageKey: 'settings', navKey: 'settings', isPanel: true },
      },
      {
        path: 'login',
        name: 'hmr-login',
        component: () => import('@/views/LoginPage.vue'),
        meta: { pageKey: 'login', isPanel: true },
      },
      {
        path: 'register',
        name: 'hmr-register',
        component: () => import('@/views/RegisterPage.vue'),
        meta: { pageKey: 'register', isPanel: true },
      },
      {
        path: 'auth/callback',
        name: 'hmr-auth-callback',
        component: () => import('@/views/AuthCallbackPage.vue'),
        meta: { pageKey: 'auth-callback', isPanel: true },
      },
      {
        path: 'auth/passkey-recovery',
        name: 'hmr-passkey-recovery',
        component: () => import('@/views/PasskeyRecoveryPage.vue'),
        meta: { pageKey: 'passkey-recovery', isPanel: true },
      },
      {
        path: 'passkey-recovery',
        redirect: '/auth/passkey-recovery',
      },
      {
        path: 'favorites',
        redirect: '/profile/favorites',
      },
      {
        path: 'profile',
        name: 'hmr-profile',
        component: () => import('@/views/ProfilePage.vue'),
        props: () => ({
          section: 'overview',
        }),
        meta: { pageKey: 'profile', isPanel: true, requiresAuth: true },
      },
      {
        path: 'profile/:section',
        name: 'hmr-profile-section',
        component: () => import('@/views/ProfilePage.vue'),
        props: (to) => ({
          section: typeof to.params.section === 'string' ? to.params.section : 'overview',
        }),
        meta: { pageKey: 'profile', isPanel: true, requiresAuth: true },
      },
      {
        path: 'about',
        name: 'hmr-about',
        component: () => import('@/views/AboutPage.vue'),
        meta: { pageKey: 'about' },
      },
      {
        path: 'contact',
        name: 'hmr-contact',
        component: () => import('@/views/ContactPage.vue'),
        meta: { pageKey: 'contact' },
      },
      {
        path: 'join-us',
        name: 'hmr-join-us',
        component: () => import('@/views/JoinUsPage.vue'),
        meta: { pageKey: 'join' },
      },
      {
        path: 'thank-you',
        name: 'hmr-thank-you',
        component: () => import('@/views/ThankYouPage.vue'),
        meta: { pageKey: 'thanks', isPanel: true },
      },
      {
        path: 'posts/:id',
        name: 'hmr-post-detail',
        component: () => import('@/views/PostDetailPage.vue'),
        meta: { pageKey: 'post', navKey: 'explore' },
      },
      {
        path: ':pathMatch(.*)*',
        name: 'hmr-not-found',
        component: () => import('@/views/NotFoundPage.vue'),
        meta: { pageKey: 'not-found' },
      },
    ],
  },
]
