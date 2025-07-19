<template>
  <q-layout view="lHh Lpr lFf" class="text-primary bg-darkness">
    <q-header elevated>
      <q-toolbar>
        <q-toolbar-title class="col-10"> {{ titleStore.mainTitle }} </q-toolbar-title>
        <div class="col-2 text-right row items-center justify-end q-gutter-sm">
          <div>v{{ appVersion }}</div>
        </div>
      </q-toolbar>
    </q-header>

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
import { useTitleStore } from 'src/stores/titleStore'
import { onMounted } from 'vue'
const titleStore = useTitleStore()
titleStore.setMainTitle('Voice Engineering Information Center')
const $q = useQuasar()
onMounted(() => {
  $q.dark.set(false) // Force dark mode off
})

function myFilterFn() {
  console.log('Ajax bar filter function called')
  return true
}
</script>

<style scoped></style>
