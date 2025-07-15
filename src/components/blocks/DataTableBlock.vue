<template>
  <q-table :rows="tableRows" :columns="tableColumns" dense flat bordered :title="title" />
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  contents: Object,
  title: String,
})

const tableColumns = computed(() =>
  props.contents.labels.map((label, idx) => ({
    name: 'col_' + idx,
    label,
    field: (row) => row[idx],
    sortable: true,
  })),
)

const tableRows = computed(() => props.contents.data)
</script>
