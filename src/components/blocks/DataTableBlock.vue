<template>
  <q-card-section v-if="contents">
    <DataTable :rows="tableRows" :columns="tableColumns" :filter="filter" :filterable="true" />
  </q-card-section>
</template>

<script setup>
import { ref, computed } from 'vue'
import DataTable from 'src/components/DataTable.vue'

const props = defineProps({
  contents: Object,
  title: String,
})

const tableColumns = computed(() =>
  props.contents.labels.map((label, idx) => ({
    name: 'col_' + idx,
    label,
    field: (row) => row[idx],
    align: 'left',
    sortable: true,
    renderHtml: true,
  })),
)

const tableRows = computed(() => props.contents.data)
const filter = ref('')
</script>
