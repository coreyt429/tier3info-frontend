<template>
  <q-card-section v-if="contents">
    <q-table
      :rows="tableRows"
      :columns="tableColumns"
      dense
      flat
      bordered
      :title="title"
      class="my-sticky-header-table"
      :grid="$q.screen.xs"
      row-key="id"
      :filter="filter"
      virtual-scroll
      v-model:pagination="pagination"
      :visible-columns="visibleColumns"
    >
      <template v-slot:top-left>
        <q-select
          v-model="visibleColumns"
          multiple
          outlined
          dense
          options-dense
          :display-value="$q.lang.table.columns"
          emit-value
          map-options
          :options="tableColumns"
          option-value="name"
          options-cover
          style="min-width: 150px"
        />
      </template>
      <template v-slot:top-right>
        <q-input borderless dense debounce="300" v-model="filter" placeholder="Filter">
          <template v-slot:append>
            <q-icon name="search" />
          </template>
        </q-input>
        <q-space />
        <q-btn
          color="primary"
          icon="archive"
          label=""
          round
          no-caps
          @click="exportTable"
        /> </template
    ></q-table>
  </q-card-section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { exportFile, useQuasar } from 'quasar'
const $q = useQuasar()

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
const filter = ref('')
const visibleColumns = ref(tableColumns.value.map((col) => col.name))
const pagination = ref({ rowsPerPage: 0 })

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
  const content = [tableColumns.value.map((col) => wrapCsvValue(col.label))]
    .concat(
      tableRows.value.map((row) =>
        tableColumns.value
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

  const fileName = `dashboard-export-${new Date().toISOString()}.csv`
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
<style lang="sass">
.my-sticky-header-table
  /* height or max-height is important */
  height: 400px

  .q-table__top,
  .q-table__bottom,
  thead tr:first-child th
    /* bg color is important for th; just specify one */
    background-color: white

  thead tr th
    position: sticky
    z-index: 1
  thead tr:first-child th
    top: 0

  /* this is when the loading indicator appears */
  &.q-table--loading thead tr:last-child th
    /* height of all previous header rows */
    top: 48px

  /* prevent scrolling behind sticky top row on focus */
  tbody
    /* height of all previous header rows */
    scroll-margin-top: 48px
</style>
