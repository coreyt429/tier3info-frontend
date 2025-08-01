<template>
  <ToggleBanner title="Scratch Pad" storageKey="showScratchPad" v-model="showScratchPad" />
  <q-card>
    <q-card-section v-if="showScratchPad">
      <q-form>
        <q-input
          filled
          v-model="tier3InfoScratchPad"
          label="Scratch Pad"
          type="textarea"
          autogrow
          lazy-rules
          class="q-mb-md"
        />
      </q-form>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, watch } from 'vue'
import ToggleBanner from './ToggleBanner.vue'

const tier3InfoScratchPad = ref('')
const showScratchPad = ref(
  localStorage.getItem('showScratchPad') === null
    ? true
    : JSON.parse(localStorage.getItem('showScratchPad')),
)
if (localStorage.getItem('TierInfoScratchPad')) {
  tier3InfoScratchPad.value = localStorage.getItem('TierInfoScratchPad')
}

watch(tier3InfoScratchPad, (newValue) => {
  localStorage.setItem('TierInfoScratchPad', newValue)
})
</script>
