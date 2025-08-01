<template>
  <ToggleBanner title="Documentation" storageKey="showDocumentation" v-model="showDocumentation" />
  <q-card>
    <q-card-section class="q-pa-sm">
      <iframe
        v-if="docStore.docUrl"
        :src="`/${docStore.docUrl}`"
        width="100%"
        height="600px"
        frameborder="0"
      ></iframe>
      <p v-else>No documentation available.</p>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref } from 'vue'
import ToggleBanner from './ToggleBanner.vue'
import { useDocStore } from 'src/stores/docStore'

const docStore = useDocStore()

const showDocumentation = ref(
  localStorage.getItem('showDocumentation') === null
    ? true
    : JSON.parse(localStorage.getItem('showDocumentation')),
)
</script>
