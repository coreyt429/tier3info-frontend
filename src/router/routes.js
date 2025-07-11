import { h } from 'vue'
import { Suspense } from 'vue'
import ConfigPage from 'pages/ConfigPage.vue'

const configPageMap = {
  '/config': {
    title: 'Tier3info Configuration',
    label: 'Configuration',
    endpoint: '/cfg',
    buttons: ['Save', 'Reset', 'Add', 'Delete'],
    template: {},
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
    buttons: ['Save', 'Reset', 'Add', 'Delete'],
  },
  '/menu': {
    title: 'Tier3info Menu Management',
    label: 'Menu',
    endpoint: '/menu',
    buttons: ['Save', 'Reset', 'Add', 'Delete'],
    template: {
      menu_id: 'ID',
      caption: '',
      acl: 'all_users',
      icon: '',
      link: '',
      order: 0,
      parent_id: null,
      children: [],
      title: '',
      target: '',
    },
  },
  '/bookmarks': {
    title: 'Tier3info Bookmarks',
    label: 'Bookmarks',
    endpoint: '/bookmarks',
    buttons: ['Save', 'Reset', 'Add', 'Delete'],
    template: {
      bookmark_id: 'ID',
      caption: '',
      icon: '',
      item: '',
      order: 0,
      menu: 'tools',
      acl: 'all_users',
    },
  },
  '/broadworks/clusters': {
    title: 'Broadworks Clusters',
    label: 'Cluster',
    endpoint: '/broadworks/clusters',
    buttons: ['Save', 'Reset'],
  },
  '/broadworks/cli_templates': {
    title: 'Broadworks CLI Templates',
    label: 'CLI Template',
    endpoint: '/broadworks/cli_templates',
    buttons: ['Save', 'Reset'],
  },
  '/oracle/sbc': {
    title: 'Oracle SBC',
    label: 'SBC',
    endpoint: '/oracle/sbc',
    buttons: ['Save', 'Reset'],
  },
  '/sansay/sbc': {
    title: 'Sansay SBC',
    label: 'SBC',
    endpoint: '/sansay/sbc',
    buttons: ['Save', 'Reset'],
  },
  '/alerts': {
    title: 'Tier3info Alerts',
    label: 'Alert',
    endpoint: '/alerts',
    buttons: ['Save', 'Reset', 'Add', 'Delete'],
  },
  '/task_schedule': {
    title: 'Tier3info Task Schedule',
    label: 'Task',
    endpoint: '/task_schedule',
    buttons: ['Save', 'Reset', 'Add', 'Delete'],
    template: {
      taskName: 'ID',
      taskCmd: 'tasks.version',
      taskNode: 'Any',
      taskParams: '',
      taskSchedule: '0 0 * * *',
      taskType: 'celery',
    },
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
    meta: { requiresAuth: true },
  },
  {
    path: '/locate',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('pages/LocatePage.vue'),
        props: (route) => ({ query: route.query }),
        meta: { requiresAuth: true },
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
        meta: { ...configPageMap[path], requiresAuth: true },
      },
    ],
  })
})

// Add a route for the login page

routes.push({
  path: '/login',
  component: () => import('pages/LoginPage.vue'),
})

// Always leave this as last one,
// but you can also remove it
routes.push({
  path: '/:catchAll(.*)*',
  component: () => import('pages/ErrorNotFound.vue'),
})

export default routes
