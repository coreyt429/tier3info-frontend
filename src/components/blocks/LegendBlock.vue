<template>
  <q-card v-if="contents" class="q-mt-sm">
    <q-card-section>
      <span :id="id" v-html="contents"></span>
      <div style="border-bottom: 1px solid var(--q-primary); margin: 0 0px"></div>
    </q-card-section>
  </q-card>
</template>

<script setup>
const props = defineProps({
  contents: String,
  id: String,
})
console.log('LegendBlock props:', props)
</script>
