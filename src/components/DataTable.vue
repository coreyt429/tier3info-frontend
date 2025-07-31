<template>
  <q-card-section>
    <q-table
      :rows="props.rows"
      :columns="props.columns"
      dense
      flat
      bordered
      :title="props.title"
      style="height: 40vh"
      :grid="$q.screen.xs"
      row-key="id"
      :filter="props.filterable ? filter : ''"
      virtual-scroll
      v-model:pagination="pagination"
      :visible-columns="localVisibleColumns"
      @row-click="handleRowClick"
      :selection="props.selection"
      v-model:selected="selected"
    >
      <template v-if="props.filterable" v-slot:top-left>
        <q-select
          v-model="localVisibleColumns"
          multiple
          outlined
          dense
          options-dense
          :display-value="$q.lang.table.columns"
          emit-value
          map-options
          :options="props.columns"
          option-value="name"
          options-cover
          style="min-width: 150px"
        />
      </template>
      <template v-if="props.filterable || props.exportable" v-slot:top-right>
        <template v-if="props.filterable">
          <q-input dense outlined debounce="300" v-model="filter" placeholder="Filter">
            <template v-slot:append>
              <q-icon name="search" style="margin-left: 8px" />
            </template>
          </q-input>
        </template>
        <div v-if="props.filterable && props.exportable" style="width: 16px" />
        <q-btn
          v-if="props.exportable"
          color="primary"
          icon="archive"
          label=""
          round
          no-caps
          dense
          flat
          :no-data-label="noDataLabel"
          :no-results-label="noResultsLabel"
          @click="exportTable"
        />
      </template>
      <template v-slot:no-data="{ icon, message, filter }">
        <div class="full-width row flex-center text-negative q-gutter-sm">
          <q-icon size="2em" name="sentiment_dissatisfied" />
          <span> {{ noDataLabel }}: {{ message }} </span>
          <q-icon size="2em" :name="filter ? 'filter_b_and_w' : icon" />
          <q-btn
            v-if="allowAdd"
            color="positive"
            icon="add"
            flat
            round
            dense
            @click="$emit('add')"
          />
        </div>
      </template>
      <template v-slot:body-cell-tagsButton="props">
        <q-td :props="props">
          <q-btn
            flat
            dense
            round
            size="sm"
            icon="content_copy"
            :title="props.row.tagsButton.tooltip"
            @click="props.row.tagsButton.copyToClipboard"
          />
        </q-td>
      </template>
    </q-table>
  </q-card-section>
</template>

<script setup>
import { ref, watch } from 'vue'
import { exportFile, useQuasar } from 'quasar'
const $q = useQuasar()

const props = defineProps({
  rows: { type: Array, required: true },
  columns: { type: Array, required: true },
  title: { type: String, default: '' },
  filterable: { type: Boolean, default: true },
  exportable: { type: Boolean, default: true },
  paginationConfig: { type: Object, default: () => ({ rowsPerPage: 0 }) },
  onClick: { type: Function, default: null }, // New prop for row click
  exportPrefix: { type: String, default: 'export' },
  noDataLabel: { type: String, default: 'No data found' },
  noResultsLabel: { type: String, default: 'No results found' },
  allowAdd: { type: Boolean, default: false }, // New prop to control add button visibility
  selection: { type: String, default: 'none' }, // New prop for selection mode
  visibleColumns: { type: Array, default: () => [] },
})
console.log('DataTable props:', JSON.stringify(props))
const filter = ref('')
const selected = ref([])

const emit = defineEmits(['update:selected'])

watch(selected, (newSelection) => {
  emit('update:selected', newSelection)
})

console.log('DataTable filter:', filter.value)
const localVisibleColumns = ref(
  props.visibleColumns.length ? [...props.visibleColumns] : props.columns.map((col) => col.name),
)
console.log('DataTable visibleColumns:', props.visibleColumns)
console.log('DataTable localVisibleColumns:', localVisibleColumns.value)
watch(
  () => props.visibleColumns,
  (newVal) => {
    localVisibleColumns.value = newVal.length ? [...newVal] : props.columns.map((col) => col.name)
  },
  { immediate: true },
)

// const visibleColumns = ref(
//   props.visibleColumns.length ? [...props.visibleColumns] : props.columns.map((col) => col.name),
// )

// watch(props.visibleColumns, (newVal) => {
//   emit('update:visibleColumns', newVal)
// })
const pagination = ref({ ...props.paginationConfig })
console.log('DataTable pagination:', pagination.value)

function handleRowClick(evt, row, index) {
  console.log('DataTable event:', evt)
  console.log('DataTable row clicked:', row, 'at index:', index)
  console.log('DataTable onClick:', props.onClick)
  if (props.onClick) {
    props.onClick(row) // Call the onClick function with the clicked row
  }
}

function wrapCsvValue(val, formatFn, row) {
  let formatted = formatFn !== void 0 ? formatFn(val, row) : val

  formatted = formatted === void 0 || formatted === null ? '' : String(formatted)

  formatted = formatted.split('"').join('""')
  /**
   * Excel accepts \n and \r in strings, but some other CSV parsers do not
   * Uncomment the next two lines to escape new lines
   */
  // .split('\n').join('\\n')
  // .split('\r').join('\\r')

  return `"${formatted}"`
}

function exportTable() {
  // naive encoding to csv format
  const content = [props.columns.map((col) => wrapCsvValue(col.label))]
    .concat(
      props.rows.map((row) =>
        props.columns
          .map((col) => {
            const fieldValue =
              typeof col.field === 'function'
                ? col.field(row)
                : row[col.field === void 0 ? col.name : col.field]

            // Check if the field name is 'tagsButton' and extract the tooltip property
            return col.field === 'tagsButton' && fieldValue && typeof fieldValue === 'object'
              ? wrapCsvValue(fieldValue.tooltip, col.format, row)
              : wrapCsvValue(fieldValue, col.format, row)
          })
          .join(','),
      ),
    )
    .join('\r\n')

  const fileName = `${props.exportPrefix}-${new Date().toLocaleString('sv-SE').replace(' ', 'T')}.csv`
  const status = exportFile(fileName, content, 'text/csv')

  if (status !== true) {
    $q.notify({
      message: 'Browser denied file download...',
      color: 'negative',
      icon: 'warning',
    })
  }
}
</script>
