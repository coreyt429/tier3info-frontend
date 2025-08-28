<template>
  <q-card>
    <q-card-section class="bg-primary q-py-xs q-px-sm">
      <div
        class="text-warning text-subtitle1 q-mb-none flex items-center justify-between"
        style="line-height: 1"
      >
        {{ props.title }}
        <q-btn flat round size="xs" icon="menu" @click="toggleDisplay" class="text-white" />
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
// [@vue/compiler-sfc] `defineEmits` is a compiler macro and no longer needs to be imported.
// [@vue/compiler-sfc] `defineProps` is a compiler macro and no longer needs to be imported.
import { ref, watch } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  storageKey: {
    type: String,
    required: true,
  },
  modelValue: {
    type: Boolean,
    required: true,
  },
})

console.log('ToggleBanner: props:', props)
const emit = defineEmits(['update:modelValue'])

console.log('ToggleBanner: initial value:', props.modelValue)

const showDisplay = ref(
  localStorage.getItem(props.storageKey) === null
    ? props.modelValue
    : JSON.parse(localStorage.getItem(props.storageKey)),
)
console.log('ToggleBanner: showDisplay:', showDisplay.value)

watch(showDisplay, (val) => {
  console.log('ToggleBanner: showDisplay changed:', val)
  emit('update:modelValue', val)
  localStorage.setItem(props.storageKey, JSON.stringify(val))
})

function toggleDisplay() {
  console.log('ToggleBanner: toggleDisplay called')
  showDisplay.value = !showDisplay.value
}
</script>
