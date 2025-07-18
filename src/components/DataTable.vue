<template>
  <q-card-section>
    <q-table
      :rows="props.rows"
      :columns="props.columns"
      dense
      flat
      bordered
      :title="props.title"
      class="my-sticky-header-table"
      :grid="$q.screen.xs"
      row-key="id"
      :filter="props.filterable ? filter : ''"
      virtual-scroll
      v-model:pagination="pagination"
      :visible-columns="visibleColumns"
      @row-click="handleRowClick"
    >
      <template v-if="props.filterable" v-slot:top-left>
        <q-select
          v-model="visibleColumns"
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
          @click="exportTable"
        />
      </template>
    </q-table>
  </q-card-section>
</template>

<script setup>
import { ref } from 'vue'
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
})
console.log('DataTable props:', props)

const filter = ref('')
const visibleColumns = ref(props.columns.map((col) => col.name))
const pagination = ref({ ...props.paginationConfig })

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
          .map((col) =>
            wrapCsvValue(
              typeof col.field === 'function'
                ? col.field(row)
                : row[col.field === void 0 ? col.name : col.field],
              col.format,
              row,
            ),
          )
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
