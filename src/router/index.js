// src/router/index.js
import { route } from 'quasar/wrappers'
import {
  createRouter,
  createMemoryHistory,
  createWebHistory,
  createWebHashHistory,
} from 'vue-router'
import routes from './routes'
import { Cookies } from 'quasar'

export default route(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE),
  })

  // ✅ Add the sessionId check here
  Router.beforeEach((to, from, next) => {
    const sessionId = Cookies.get('sessionId')

    if (!sessionId && to.meta.requiresAuth) {
      // if (!sessionId) {
      next('/index.cgi') // redirect to legacy app or login
    } else {
      next()
    }
  })

  return Router
})
