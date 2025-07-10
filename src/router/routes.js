import { h } from 'vue'
import { Suspense } from 'vue'
import ConfigPage from 'pages/ConfigPage.vue'

const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [{ path: '', component: () => import('pages/IndexPage.vue') }],
  },
  {
    path: '/locate',
    component: () => import('layouts/MainLayout.vue'),
    children: [{ path: '', component: () => import('pages/LocatePage.vue') }],
  },
  {
    path: '/config',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        component: {
          render() {
            return h(Suspense, null, {
              default: h(ConfigPage),
              fallback: h('div', 'Loading...'),
            })
          },
        },
        meta: {
          title: 'Tier3info Configuration',
          label: 'Configuration',
          endpoint: '/cfg',
          buttons: [
            { label: 'Save', color: 'primary', action: () => console.log('Save clicked') },
            { label: 'Reset', color: 'negative', action: () => console.log('Reset clicked') },
          ],
        },
      },
    ],
  },
  {
    path: '/certs',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        component: {
          render() {
            return h(Suspense, null, {
              default: h(ConfigPage),
              fallback: h('div', 'Loading...'),
            })
          },
        },
        meta: {
          title: 'Certificate Management',
          label: 'Certificate',
          endpoint: '/broadworks/certificates',
        },
      },
    ],
  },
  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
