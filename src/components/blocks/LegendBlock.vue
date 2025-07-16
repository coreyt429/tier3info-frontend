<template>
  <q-card-section v-if="contents">
    <span :id="id" v-html="contents"></span>
    <div style="border-bottom: 1px solid var(--q-primary); margin: 0 0px"></div>
  </q-card-section>
</template>

<script setup>
const props = defineProps({
  contents: String,
  id: { type: String, default: () => `id-${Math.random().toString(36).substr(2, 9)}` },
})
console.log('LegendBlock props:', props)
</script>
