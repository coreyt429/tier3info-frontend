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
    let sessionId = Cookies.get('sessionId')
    if (!sessionId) {
      sessionId = localStorage.getItem('sessionId')
    }

    if (!sessionId && to.meta.requiresAuth) {
      // if (!sessionId) {
      next('/login') // redirect to login
    } else {
      next()
    }
  })

  return Router
})
