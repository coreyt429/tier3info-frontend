<template>
  <q-page class="flex flex-center bg-primary text-primary">
    <img alt="Quasar logo" src="~assets/cubes-2492010_1920.jpg" />
  </q-page>
</template>

<script setup>
import { useTitleStore } from 'stores/titleStore'
const titleStore = useTitleStore()
titleStore.setMainTitle('Voice Engineering Information Center')
</script>
