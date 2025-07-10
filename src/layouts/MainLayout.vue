<template>
  <q-layout view="lHh Lpr lFf" class="bg-grey-10 text-primary">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title> {{ titleStore.mainTitle }} </q-toolbar-title>

        <div>Tier3info v{{ appVersion }}</div>
      </q-toolbar>
    </q-header>

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

    <q-page-container>
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
import { useTitleStore } from 'stores/titleStore'
const titleStore = useTitleStore()
titleStore.setMainTitle('Voice Engineering Information Center')

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
import { tier3info_restful_request } from 'src/plugins/tier3info.js'

const linksList = ref([])
const linksListFiltered = ref([])

onMounted(async () => {
  try {
    const request = {
      method: 'GET',
      path: '/menu',
    }
    const response = await tier3info_restful_request(request)
    linksList.value = response.data
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
    ]
    linksListFiltered.value = linksList.value
  }
})

const leftDrawerOpen = ref(false)

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}
function myFilterFn() {
  console.log('Ajax bar filter function called')
  return true
}
</script>
