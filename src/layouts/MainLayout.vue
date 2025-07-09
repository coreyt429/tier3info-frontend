<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title> Voice Engineering Information Center </q-toolbar-title>

        <div>Tier3info v{{ appVersion }}</div>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered class="bg-warning">
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
import { version as appVersion } from '../../package.json'
import { ref } from 'vue'
import EssentialLink from 'components/EssentialLink.vue'

const filter = ref('')

function onMenuEnter() {
  console.log('Enter key pressed' + linksListFiltered.value.length)
  if (linksListFiltered.value.length === 1) {
    const singleLink = linksListFiltered.value[0]
    if (singleLink.link) {
      // Navigate to the link
      console.log('Single link found. Navigating to:', singleLink.link)
      window.location.href = singleLink.link
    } else {
      if (singleLink.children && singleLink.children.length === 1) {
        let child = singleLink.children[0]
        while (child.children && child.children.length === 1) {
          child = child.children[0]
        }
        if (child.link) {
          console.log('Navigating to child link:', child.link)
          window.location.href = child.link
        } else {
          console.log('No valid link found in the child hierarchy.')
        }
      } else {
        console.log('No single child or link found.')
      }
    }
  } else {
    console.log('Enter pressed. Filter value:', filter.value)
  }
}

function filterLinks(links, filterValue = '') {
  return links
    .map((item) => {
      const matches =
        item.title.toLowerCase().includes(filterValue) ||
        item.caption.toLowerCase().includes(filterValue) ||
        item.link.toLowerCase().includes(filterValue)

      if (item.children) {
        const filteredChildren = filterLinks(item.children)
        if (filteredChildren.length > 0 || matches) {
          return { ...item, children: filteredChildren }
        }
      }

      return matches ? { ...item } : null
    })
    .filter((item) => item !== null)
}

function onMenuSearchChange(val) {
  // Now receives the latest value as 'val'
  console.log('Key pressed. Filter value:', val)
  linksListFiltered.value = filterLinks(linksList.value, val.toLowerCase())
}

import { onMounted } from 'vue'
// import axios from 'axios'
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
    console.log('Menu links response:', response)
    linksList.value = response.data
    console.log('Links list:', linksList.value)
    linksListFiltered.value = linksList.value // Initialize filtered list with all links
    console.log('Initial filtered links list:', linksListFiltered.value)
  } catch (error) {
    console.error('Error fetching menu links:', error)
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
