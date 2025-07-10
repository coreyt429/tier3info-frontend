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
        },
      },
    ],
  },
  //   {
  //   path: '/config',
  //   component: () => import('layouts/MainLayout.vue'),
  //   children: [
  //     {
  //       path: '',
  //       component: () => import('pages/ConfigPage.vue'),
  //       meta: { title: 'Tier3info Configuration', endpoint: '/cfg/' },
  //     },
  //   ],
  // },
  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
