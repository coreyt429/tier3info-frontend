<template>
  <q-list>
    <EssentialLinkItem v-bind="props" />
  </q-list>
</template>

<script setup>
import EssentialLinkItem from 'src/components/EssentialLinkItem.vue'

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  caption: {
    type: String,
    default: '',
  },
  link: {
    type: String,
    default: '#',
  },
  target: {
    type: String,
    default: '',
  },
  icon: {
    type: String,
    default: '',
  },
  children: {
    type: Array,
    default: () => [],
  },
})
console.log('EssentialLink props:', props)
</script>
