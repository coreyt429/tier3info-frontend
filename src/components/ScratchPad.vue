<template>
  <ToggleBanner title="Scratch Pad" storageKey="showScratchPad" v-model="showScratchPad" />
  <q-card>
    <q-card-section v-if="showScratchPad">
      <q-form>
        <q-input
          ref="scratchpadInput"
          filled
          v-model="tier3InfoScratchPad"
          label="Scratch Pad"
          type="textarea"
          lazy-rules
          class="q-mb-md"
          :input-style="scratchpadInputStyle"
          @blur="trimScratchPad"
        />
      </q-form>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import ToggleBanner from './ToggleBanner.vue'
import { usePreferencesStore } from 'src/stores/preferences'

const tier3InfoScratchPad = ref('')
const scratchpadInput = ref(null)
const preferencesStore = usePreferencesStore()
const preferences = preferencesStore.preferences
const scratchpadInputStyle = {
  resize: 'vertical',
  minHeight: '140px',
  height: '200px',
}
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

function trimScratchPad() {
  tier3InfoScratchPad.value = tier3InfoScratchPad.value.trim()
}

function getTextareaEl() {
  return scratchpadInput.value?.$el?.querySelector('textarea') || null
}

let resizeObserver = null

function applyStoredHeight() {
  const stored = Number(preferences.scratchPadHeight || 0)
  if (!stored) return
  scratchpadInputStyle.height = `${stored}px`
  const textarea = getTextareaEl()
  if (textarea) {
    textarea.style.height = scratchpadInputStyle.height
  }
}

function handleResize(entries) {
  const entry = entries[0]
  const height = Math.round(entry?.contentRect?.height || 0)
  if (!height) return
  preferences.scratchPadHeight = height
}

onMounted(() => {
  applyStoredHeight()
  const textarea = getTextareaEl()
  if (!textarea || typeof ResizeObserver === 'undefined') return
  resizeObserver = new ResizeObserver(handleResize)
  resizeObserver.observe(textarea)
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})
</script>
