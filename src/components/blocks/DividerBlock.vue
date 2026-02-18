<template>
  <div>
    <q-card-section>
      <q-separator />
      <q-banner v-if="contents" class="bg-secondary text-white q-mt-sm">{{ contents }}</q-banner>
    </q-card-section>
  </div>
</template>

<script setup>
const props = defineProps({ contents: String })
console.log('DividerBlock props:', props)
</script>
