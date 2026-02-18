<template>
  <q-page class="flex flex-center bg-primary text-primary">
    <img alt="Quasar logo" src="~assets/cubes-2492010_1920.jpg" />
  </q-page>
</template>

<script setup>
import { useTitleStore } from 'stores/titleStore'
const titleStore = useTitleStore()
titleStore.setMainTitle('Voice Engineering Information Center')
import { usePreferencesStore } from 'src/stores/preferences'
const preferencesStore = usePreferencesStore()
const preferences = preferencesStore.preferences
console.log('IndexPage preferences:', JSON.stringify(preferences, null, 2))
console.log('IndexPage default route:', preferences.defaultRoute)
const defaultRouteValue = preferences.defaultRoute

if (
  defaultRouteValue &&
  defaultRouteValue !== '/#/' &&
  defaultRouteValue !== undefined &&
  defaultRouteValue !== '/'
) {
  setTimeout(() => {
    window.location.href = defaultRouteValue
  }, 100)
} else {
  console.warn('No default route set in preferences.')
}
</script>
