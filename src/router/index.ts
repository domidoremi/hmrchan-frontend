/**
 * Vue Router Configuration
 */

import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomePage.vue'),
    meta: { title: 'nav.home' },
  },
  {
    path: '/explore',
    name: 'explore',
    component: () => import('@/views/ExplorePage.vue'),
    meta: { title: 'nav.explore' },
  },
  {
    path: '/post/:id',
    name: 'post-detail',
    component: () => import('@/views/PostDetailPage.vue'),
    meta: { title: 'nav.postDetail' },
  },
  {
    path: '/authors',
    name: 'authors',
    component: () => import('@/views/AuthorsPage.vue'),
    meta: { title: 'nav.authors' },
  },
  {
    path: '/author/:id',
    name: 'author-detail',
    component: () => import('@/views/AuthorDetailPage.vue'),
    meta: { title: 'nav.authorDetail' },
  },
  {
    path: '/favorites',
    name: 'favorites',
    component: () => import('@/views/FavoritesPage.vue'),
    meta: { title: 'nav.favorites', requiresAuth: true },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsPage.vue'),
    meta: { title: 'nav.settings' },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginPage.vue'),
    meta: { title: 'nav.login', guestOnly: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/RegisterPage.vue'),
    meta: { title: 'nav.register', guestOnly: true },
  },
  {
    path: '/contact',
    name: 'contact',
    component: () => import('@/views/ContactPage.vue'),
    meta: { title: 'nav.contact' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundPage.vue'),
    meta: { title: 'error.notFound' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' }
    }
    return { top: 0, behavior: 'smooth' }
  },
})

export default router
