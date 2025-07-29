<template>
  <q-layout view="lHh Lpr lFf" class="text-primary bg-darkness">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title class="col-6"> {{ titleStore.mainTitle }} </q-toolbar-title>
        <div class="col-3 row no-wrap q-gutter-md justify-end">
          <q-btn
            v-for="(color, index) in ['green', 'yellow', 'red']"
            :key="index"
            :color="colorMap[color]"
            round
            dense
            :label="dashBoardStore.counts[color]"
          >
            <q-menu
              anchor="bottom middle"
              self="top middle"
              transition-show="scale"
              transition-hide="scale"
              class="text-white"
              dark
              elevated
              rounded
              :elevation="10"
            >
              <q-list>
                <template v-for="(item, idx) in dashBoardStore.metrics[color]" :key="idx">
                  <q-item
                    clickable
                    v-ripple
                    @click="
                      () => {
                        openDashBoard(item)
                      }
                    "
                  >
                    <q-item-section>
                      {{ item.textContent }}
                    </q-item-section>
                  </q-item>
                  <q-separator
                    :color="color"
                    inset
                    spaced
                    v-if="idx < dashBoardStore.metrics[color].length - 1"
                  />
                </template>
              </q-list>
            </q-menu>
          </q-btn>
        </div>
        <div class="col-2 text-right row items-center justify-end q-gutter-sm">
          <div>v{{ appVersion }}</div>
          <q-btn
            flat
            dense
            round
            icon="settings"
            aria-label="Settings"
            @click="toggleRightDrawer"
          />
        </div>
      </q-toolbar>
    </q-header>
    <!-- Left drawer for menu links -->
    <q-drawer v-model="leftDrawerOpen" show-if-above bordered class="bg-warning text-primary">
      <q-list>
        <!-- <q-item-label header> Menu </q-item-label> -->
        <q-input
          filled
          dense
          debounce="300"
          v-model="filter"
          placeholder="Search menu..."
          class="q-mb-sm"
          clearable
          prepend-inner-icon="search"
          @keyup.enter="onMenuEnter"
          @update:model-value="onMenuSearchChange"
        />
        <EssentialLink v-for="link in linksListFiltered" :key="link.title" v-bind="link" />
      </q-list>
    </q-drawer>
    <!-- Right Drawer for Preferences -->
    <q-drawer v-model="rightDrawerOpen" side="right" bordered class="bg-darkness text-primary">
      <PreferencesControl :linksList="linksList" />
    </q-drawer>
    <!-- Dashboard -->
    <q-page-container>
      <q-dialog v-model="dashBoardOpen" persistent>
        <q-card class="q-pa-md text-primary elevated glow" style="width: 80vw; max-width: 80vw">
          <q-card-section class="row items-center justify-between">
            <div class="text-h6 q-pa-sm cols-11">
              <q-icon name="flag" :color="colorMap[currentMetric.color]" class="q-mr-sm" />
              Dashboard Details: {{ currentMetric.label }}
            </div>
            <q-btn
              flat
              dense
              round
              icon="close"
              aria-label="Close Details"
              @click="dashBoardOpen = false"
            ></q-btn>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <DynamicDisplay :data="dashBoardStore.detailsJSON" />
          </q-card-section>
        </q-card>
      </q-dialog>
      <router-view />
    </q-page-container>
    <q-ajax-bar
      :hijack-filter="myFilterFn"
      ref="bar"
      position="bottom"
      color="accent"
      size="10px"
    />
  </q-layout>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { version as appVersion } from '../../package.json'
import { ref } from 'vue'
import EssentialLink from 'components/EssentialLink.vue'
import DynamicDisplay from 'components/DynamicDisplay.vue'
import { useTitleStore } from 'src/stores/titleStore'
import { useDashBoardStore } from 'src/stores/dashBoard'
import PreferencesControl from 'components/PreferencesControl.vue'

import { usePreferencesStore } from 'src/stores/preferences'
const preferencesStore = usePreferencesStore()
console.debug('Preferences Store:', preferencesStore)
preferencesStore.loadPreferences()
console.log('Preferences loaded:', preferencesStore.preferences)

const dashBoardStore = useDashBoardStore()
console.debug('Dashboard Store:', dashBoardStore)
const titleStore = useTitleStore()
titleStore.setMainTitle('Voice Engineering Information Center')
import { onUnmounted } from 'vue'
const colorMap = {
  green: 'positive',
  yellow: 'warning',
  red: 'negative',
}
// const colorReverseMap = {
//   positive: 'green',
//   warning: 'yellow',
//   negative: 'red',
// }

const currentMetric = ref({ label: 'Metric Details', color: 'red' })

const refreshInterval = 60000 // 1 minute in milliseconds
dashBoardStore.refreshDashboard()
const intervalId = setInterval(async () => {
  dashBoardStore.refreshDashboard()
  const response = await heartbeat()
  console.log('Heartbeat response:', response)
}, refreshInterval)

onUnmounted(() => {
  clearInterval(intervalId)
})

const $q = useQuasar()

onMounted(() => {
  $q.dark.set(false) // Force dark mode off
})
// const mainTitle = titleStore.mainTitle

// const mainTitle = ref('Voice Engineering Information Center')
const filter = ref('')

function onMenuEnter() {
  console.log('onMenuEnter called with menu count:', filter.value.length)
  if (linksListFiltered.value.length === 1) {
    console.log('Single link found, navigating to:', linksListFiltered.value[0].link)
    const singleLink = linksListFiltered.value[0]
    if (singleLink.link) {
      // Navigate to the link
      window.location.href = singleLink.link
    } else {
      if (singleLink.children && singleLink.children.length === 1) {
        let child = singleLink.children[0]
        while (child.children && child.children.length === 1) {
          child = child.children[0]
        }
        if (child.link) {
          window.location.href = child.link
        } else {
          window.location.href = `/#/locate?query=${encodeURIComponent(filter.value)}`
        }
      } else {
        window.location.href = `/#/locate?query=${encodeURIComponent(filter.value)}`
      }
    }
  } else if (linksListFiltered.value.length === 0) {
    console.log('No links found, navigating to locate with query:', filter.value)
    console.log('Navigating to locate with query:', encodeURIComponent(filter.value))
    window.location.href = `/#/locate?query=${encodeURIComponent(filter.value)}`
  } else {
    console.log('Multiple links found, not navigating:', linksListFiltered.value.length)
  }
}

function filterLinks(links, filterValue = '') {
  console.log('filterLinks called with filterValue:', filterValue)
  const filteredLinks = links
    .map((item) => {
      const matches =
        item.title.toLowerCase().includes(filterValue) ||
        item.caption.toLowerCase().includes(filterValue) ||
        item.link.toLowerCase().includes(filterValue)

      if (item.children) {
        const filteredChildren = filterLinks(item.children, filterValue)
        if (filteredChildren.length > 0 || matches) {
          return { ...item, children: filteredChildren }
        }
      }

      return matches ? { ...item } : null
    })
    .filter((item) => item !== null)
  console.log('Filtered links:', filteredLinks)
  return filteredLinks
}

function onMenuSearchChange(val) {
  console.log('onMenuSearchChange called with:', val)
  // Now receives the latest value as 'val'
  linksListFiltered.value = filterLinks(linksList.value, val.toLowerCase())
}

import { onMounted } from 'vue'
import { heartbeat, tier3info_restful_request } from 'src/plugins/tier3info.js'

const linksList = ref([])
const linksListFiltered = ref([])

onMounted(async () => {
  try {
    const cachedLinks = localStorage.getItem('linksList')
    if (cachedLinks) {
      linksList.value = JSON.parse(cachedLinks)
      // uncomment when menu stabilizes
      // linksListFiltered.value = linksList.value
      // return
    }
    const request = {
      method: 'GET',
      path: '/menu/user',
    }
    const response = await tier3info_restful_request(request)
    linksList.value = response.data
    localStorage.setItem('linksList', JSON.stringify(linksList.value))
    // linksList.value = []
    linksListFiltered.value = linksList.value // Initialize filtered list with all links
  } catch (error) {
    console.error('Error fetching menu links:', error)
    linksList.value = [
      {
        title: 'Home',
        link: '/',
        icon: 'home',
        caption: 'Go to homepage',
      },
      {
        title: 'Tools',
        icon: 'build',
        caption: 'Useful tools',
        children: [
          {
            title: 'Locate',
            icon: 'search',
            link: '/#/locate',
            caption: 'Find Stuff',
          },
          {
            title: 'Configuration',
            link: '/#/config',
            icon: 'settings',
            caption: 'Set stuff up',
          },
        ],
      },
    ]
    linksListFiltered.value = linksList.value
    localStorage.setItem('linksList', JSON.stringify(linksList.value))
  }
})

const leftDrawerOpen = ref(false)
const rightDrawerOpen = ref(false)
const dashBoardOpen = ref(false)

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}
function toggleRightDrawer() {
  rightDrawerOpen.value = !rightDrawerOpen.value
}

async function openDashBoard(metric) {
  console.log(`openDashBoard(${metric})`)
  console.log(`openDashBoard(${JSON.stringify(metric)})`)
  currentMetric.value = metric
  console.log(`openDashBoard: currentMetric: ${JSON.stringify(currentMetric.value)}`, currentMetric)
  await dashBoardStore.loadDetails(metric)
  console.log('openDashBoard: dashBoardStore.detailsJSON:', dashBoardStore.detailsJSON)
  dashBoardOpen.value = true
}

function myFilterFn() {
  console.log('Ajax bar filter function called')
  return true
}
</script>

<style scoped>
.highlight-panel {
  backdrop-filter: blur(5px);
  /* background: rgba(73, 75, 74, 0.85); */
  border-left: 3px solid var(--q-primary);
}
</style>
