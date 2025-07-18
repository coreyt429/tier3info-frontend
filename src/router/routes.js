import { h } from 'vue'
import { Suspense } from 'vue'
import ApiSelectEditPage from 'pages/ApiSelectEditPage.vue'
import ApiTableEditPage from 'pages/ApiTableEditPage.vue'

const routePageMap = {
  '/task_schedule': {
    page: ApiTableEditPage,
    meta: {
      title: 'Tier3info Task Schedule',
      label: 'Task',
      endpoint: '/task_schedule',
      buttons: ['Save', 'Reset', 'Add', 'Delete'],
      fields: [
        { name: 'taskName', label: 'Name' },
        { name: 'taskCmd', label: 'Command' },
        { name: 'taskNode', label: 'Node' },
        { name: 'taskParams', label: 'Params' },
        { name: 'taskSchedule', label: 'Schedule' },
        { name: 'taskType', label: 'Type' },
      ],
      template: {
        taskName: 'ID',
        taskCmd: 'tasks.version',
        taskNode: 'Any',
        taskParams: '',
        taskSchedule: '0 0 * * *',
        taskType: 'celery',
      },
    },
  },
  '/config': {
    page: ApiSelectEditPage,
    meta: {
      title: 'Tier3info Configuration',
      label: 'Configuration',
      endpoint: '/cfg',
      buttons: ['Save', 'Reset', 'Add', 'Delete'],
      template: { structure: 'freeform' },
    },
  },
  '/certificates': {
    page: ApiTableEditPage,
    meta: {
      title: 'Certificate Management',
      label: 'Certificate',
      endpoint: '/broadworks/certificates',
      buttons: ['Zip', 'Pfx'],
      fields: [
        { name: 'id', label: 'Id' },
        { name: 'alias', label: 'Alias' },
        { name: 'certificate_id', label: 'Certificate ID' },
        { name: 'data.subject', label: 'Subject' },
        { name: 'data.issuer', label: 'Issuer' },
        { name: 'data.expiration_date', label: 'Expiration Date' },
        { name: 'data.serial_number', label: 'Serial Number' },
        { name: 'data.san', label: 'SAN' },
      ],
    },
  },
  '/acl': {
    page: ApiTableEditPage,
    meta: {
      title: 'Tier3info Access Control List',
      label: 'Access Control',
      endpoint: '/acl',
      buttons: ['Save', 'Reset', 'Add', 'Delete'],
      fields: [
        { name: 'id', label: 'Id' },
        { name: 'aclName', label: 'ACL Name' },
        { name: 'acl', label: 'Access List' },
        { name: 'last_updated', label: 'Last Updated' },
      ],
      template: {
        aclName: 'ID',
        acl: '',
      },
    },
  },
  '/menu': {
    page: ApiTableEditPage,
    meta: {
      title: 'Tier3info Menu Management',
      label: 'Menu',
      endpoint: '/menu',
      buttons: ['Save', 'Reset', 'Add', 'Delete'],
      template: {
        id: 'ID',
        caption: '',
        acl: 'all_users',
        icon: '',
        link: '',
        order: 0,
        parentd: null,
        children: [],
        title: '',
        target: '',
      },
      fields: [
        { name: 'parent', label: 'Parent Menu' },
        { name: 'menu_id', label: 'Menu ID' },
        { name: 'title', label: 'Title' },
        { name: 'caption', label: 'Caption' },
        { name: 'acl', label: 'ACL' },
        { name: 'icon', label: 'Icon' },
        { name: 'link', label: 'Link' },
        { name: 'order', label: 'Order' },
        { name: 'target', label: 'Target' },
      ],
    },
  },
  '/bookmarks': {
    page: ApiTableEditPage,
    meta: {
      title: 'Tier3info Bookmarks',
      label: 'Bookmark',
      endpoint: '/bookmarks',
      buttons: ['Save', 'Reset', 'Add', 'Delete'],
      fields: [
        { name: 'menu', label: 'Menu' },
        { name: 'id', label: 'Id' },
        { name: 'order', label: 'Order' },
        { name: 'link', label: 'Link' },
        { name: 'acl', label: 'ACL' },
      ],
      template: {
        caption: '',
        icon: '',
        link: '',
        order: 0,
        menu: 'tools',
        acl: 'all_users',
      },
    },
  },
  '/broadworks/clusters': {
    page: ApiTableEditPage,
    meta: {
      title: 'Broadworks Clusters',
      label: 'Cluster',
      endpoint: '/broadworks/clusters',
      buttons: ['Save', 'Reset', 'Add'],
      fields: [
        { name: 'id', label: 'Id' },
        { name: 'cluster', label: 'Cluster' },
        { name: 'label', label: 'Label' },
        { name: 'RPXLabel', label: 'RPX Label' },
        { name: 'domain', label: 'Domain' },
        { name: 'SecondaryURI', label: 'Secondary URI' },
        { name: 'primaryIP', label: 'Primary IP' },
        { name: 'primary_hostname', label: 'Primary Hostname' },
        { name: 'secondaryIP', label: 'Secondary IP' },
        { name: 'secondary_hostname', label: 'Secondary Hostname' },
        { name: 'XsiServer', label: 'XSI Server' },
        { name: 'nscluster', label: 'NS Cluster' },
      ],
      template: {
        OpenClientServer: '',
        RPXLabel: '',
        SecondaryURI: '',
        XsiServer: '',
        cluster: '',
        domain: '',
        label: '',
        nscluster: '',
        primaryIP: '',
        primary_hostname: '',
        secondaryIP: '',
        secondary_hostname: '',
      },
    },
  },
  '/broadworks/cli_templates': {
    page: ApiTableEditPage,
    meta: {
      title: 'Broadworks CLI Templates',
      label: 'CLI Template',
      endpoint: '/broadworks/cli_templates',
      buttons: ['Save', 'Reset', 'Add', 'Delete'],
      fields: [{ name: 'description', label: 'Description' }],
      template: {
        description: '',
        template: '',
      },
    },
  },
  '/oracle/sbc': {
    page: ApiTableEditPage,
    meta: {
      title: 'Oracle SBC',
      label: 'SBC',
      endpoint: '/oracle/sbc',
      buttons: [],
      fields: [
        { name: 'colo', label: 'Colo' },
        { name: 'host_status', label: 'Status' },
        { name: 'description', label: 'Description' },
        { name: 'management_ip_address', label: 'Management IP' },
      ],
    },
  },
  '/sansay/sbc': {
    page: ApiTableEditPage,
    meta: {
      title: 'Sansay SBC',
      label: 'SBC',
      endpoint: '/sansay/sbc',
      fields: [
        { name: 'colo', label: 'Colo' },
        { name: 'host_status', label: 'Status' },
        { name: 'description', label: 'Description' },
        { name: 'management_ip_address', label: 'Management IP' },
      ],
    },
  },
  '/alerts': {
    page: ApiTableEditPage,
    meta: {
      title: 'Tier3info Alerts',
      label: 'Alert',
      endpoint: '/alerts',
      buttons: ['Save', 'Reset', 'Add', 'Delete'],
      template: {
        end: '',
        start: '',
        message: '',
        severity: 'info',
      },
      fields: [
        { name: 'start', label: 'Start' },
        { name: 'end', label: 'End' },
        { name: 'message', label: 'Message' },
        { name: 'severity', label: 'Severity' },
      ],
    },
  },
}
//aliases
routePageMap['/certs'] = routePageMap['/certificates']
routePageMap['/cfg'] = routePageMap['/config']

const routes = [
  {
    path: '/test',
    component: () => import('layouts/MainLayout.vue'),
    children: [{ path: '', component: () => import('pages/testPage.vue') }],
    meta: { requiresAuth: true },
  },
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

Object.keys(routePageMap).forEach((path) => {
  routes.push({
    path,
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        component: {
          render() {
            return h(Suspense, null, {
              default: h(routePageMap[path].page),
              fallback: h('div', 'Loading...'),
            })
          },
        },
        meta: { ...routePageMap[path].meta, requiresAuth: true },
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
