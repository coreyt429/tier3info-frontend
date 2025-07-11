import { h } from 'vue'
import { Suspense } from 'vue'
import ConfigPage from 'pages/ConfigPage.vue'

const configPageMap = {
  '/config': {
    title: 'Tier3info Configuration',
    label: 'Configuration',
    endpoint: '/cfg',
    buttons: ['Save', 'Reset'],
  },
  '/certificates': {
    title: 'Certificate Management',
    label: 'Certificate',
    endpoint: '/broadworks/certificates',
    buttons: ['Zip', 'Pfx'],
  },
  '/acl': {
    title: 'Tier3info Access Control List',
    label: 'Access Control',
    endpoint: '/acl',
    buttons: ['Save', 'Reset'],
  },
  '/menus': {
    title: 'Tier3info Menu Management',
    label: 'Menu',
    endpoint: '/menus',
    buttons: ['Save', 'Reset'],
  },
  '/bookmarks': {
    title: 'Tier3info Bookmarks',
    label: 'Bookmarks',
    endpoint: '/bookmarks',
    buttons: ['Save', 'Reset'],
  },
}
//aliases
configPageMap['/certs'] = configPageMap['/certificates']
configPageMap['/cfg'] = configPageMap['/config']

const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [{ path: '', component: () => import('pages/IndexPage.vue') }],
  },
  {
    path: '/locate',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('pages/LocatePage.vue'),
        props: (route) => ({ query: route.query }),
      },
    ],
  },
]

Object.keys(configPageMap).forEach((path) => {
  routes.push({
    path,
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
        meta: configPageMap[path],
      },
    ],
  })
})

// Always leave this as last one,
// but you can also remove it
routes.push({
  path: '/:catchAll(.*)*',
  component: () => import('pages/ErrorNotFound.vue'),
})

export default routes
