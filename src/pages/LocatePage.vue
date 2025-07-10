<template>
  <q-page class="flex flex-start">
    <div class="q-pa-md" style="width: 100%">
      <!-- Row 1: Search Input and Button -->
      <div class="row q-mb-md q-pa-md bg-white shadow-2 rounded">
        <q-input
          v-model="searchQuery"
          label="Search"
          outlined
          dense
          class="col-9 bg-grey-4"
          @keyup.enter="executeSearch"
        />
        <q-btn label="Search" color="primary" class="col-2 q-ml-sm" @click="executeSearch" />
      </div>
      <!-- Separator Line -->
      <q-separator class="q-my-md" />
      <!-- Row 2: Search Results Table -->
      <div v-if="rows.length > 0" class="q-mb-md" style="max-height: 500px; overflow-y: auto">
        <q-table
          class="my-sticky-header-table"
          flat
          bordered
          :grid="$q.screen.xs"
          :rows="rows"
          :columns="columns"
          dense
          row-key="id"
          :filter="filter"
          virtual-scroll
          v-model:pagination="pagination"
          :visible-columns="visibleColumns"
          @row-click="selectItem"
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
              :options="columns"
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
            <q-btn color="primary" icon-right="archive" label="csv" no-caps @click="exportTable" />
          </template>
        </q-table>
      </div>

      <!-- Row 3: Detail Area -->
      <div v-if="selectedItem" class="q-pa-md bg-grey-2">
        <h6>Details</h6>
        <p>{{ selectedItem }}</p>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { exportFile, useQuasar } from 'quasar'
import { tier3info_restful_request } from 'src/plugins/tier3info.js'
import { locate_cache_key_fields } from 'src/plugins/locate.js'
// import axios from 'axios'
import { useTitleStore } from 'stores/titleStore'
const titleStore = useTitleStore()
titleStore.setMainTitle('Locate Tool')

const searchQuery = ref('')
const rows = ref([])
const selectedItem = ref(null)
const filter = ref('')
const columns = [
  { name: 'id', label: 'ID', field: 'id' },
  { name: 'type', label: 'Type', field: 'type' },
  { name: 'type_id', label: 'Id', field: 'type_id' },
  { name: 'cluster', label: 'Cluster', field: 'cluster' },
  { name: 'enterprise_id', label: 'Enterprise Id', field: 'enterprise_id' },
  { name: 'group_id', label: 'Group Id', field: 'group_id' },
  { name: 'user_id', label: 'User Id', field: 'user_id' },
  { name: 'last_name', label: 'Last Name', field: 'last_name' },
  { name: 'first_name', label: 'First Name', field: 'first_name' },
  { name: 'dn', label: 'DN', field: 'dn' },
  { name: 'extension', label: 'Extension', field: 'extension' },
  { name: 'device_id', label: 'Device ID', field: 'device_id' },
  { name: 'device_type', label: 'Device Type', field: 'device_type' },
  { name: 'mac_address', label: 'MAC Address', field: 'mac_address' },
]
const visibleColumns = ref(columns.filter((col) => col.name !== 'id').map((col) => col.name))
const pagination = ref({ rowsPerPage: 0 })
async function executeSearch() {
  console.log('Search Query:', searchQuery.value)
  const request = {
    method: 'POST',
    path: '/locate/',
    body: {
      query_string: searchQuery.value,
    },
  }
  console.log('Request:', request)
  const response = await tier3info_restful_request(request)
  console.log('Response:', response)
  if (!response || !response.data) {
    console.error('Invalid response data:', response)
    rows.value = [{ id: 'No Matches Found', name: 'No Matches Found' }]
    return
  }
  rows.value = Object.entries(response.data).map(([id, record]) => {
    const recordType = record.type || 'unknown'
    const key_field = locate_cache_key_fields[recordType] || 'unkown'
    const type_id = record[key_field] || 'unknown'
    console.log(
      `Processing record with ID: ${id}, Type: ${recordType}, Key Field: ${key_field}, Type ID: ${type_id}`,
    )
    return {
      id: id,
      type_id: type_id,
      ...record,
    }
  })
  console.log('Rows:', rows.value)
}

function selectItem(row) {
  selectedItem.value = row
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

const $q = useQuasar()

function exportTable() {
  // naive encoding to csv format
  const content = [columns.map((col) => wrapCsvValue(col.label))]
    .concat(
      rows.value.map((row) =>
        columns
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

  const fileName = `locate-export-${new Date().toISOString()}.csv`
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
