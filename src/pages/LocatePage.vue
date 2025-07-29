<template>
  <q-page class="flex flex-start">
    <div class="q-pa-md" style="width: 100%">
      <!-- Row 1: Search Input and Button -->
      <q-card class="q-mt-md">
        <q-card-section class="row items-center">
          <q-input
            v-model="searchQuery"
            label="Search"
            outlined
            dense
            class="col-9"
            @keyup.enter="executeSearch"
          />
          <q-btn label="Search" color="primary" class="col-2 q-ml-sm" @click="executeSearch" />
        </q-card-section>
      </q-card>
      <!-- Row 2: Search Results Table -->
      <q-card v-if="rows.length > 0" class="q-mt-md">
        <DataTable
          :rows="rows"
          :columns="columns"
          :filterable="true"
          :exportable="true"
          :pagination-config="pagination"
          :onClick="selectItem"
          exportPrefix="locate-export"
        />
      </q-card>
      <!-- <q-card v-if="rows.length > 0" class="q-mt-md">
        <q-card-section class="row items-center">
          <div class="q-mb-md" style="max-height: 500px; overflow-y: auto">
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
                <q-btn color="primary" icon="archive" label="" round no-caps @click="exportTable" />
              </template>
            </q-table>
          </div>
        </q-card-section>
      </q-card> -->

      <!-- Row 3: Detail Area -->
      <q-card v-if="selectedItem" class="q-mt-md">
        <q-card-section class="row items-center">
          <div class="q-pa-md bg-grey-2">
            <h6>Details</h6>
            <p>{{ selectedItem }}</p>
          </div>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
// import { exportFile, useQuasar } from 'quasar'
import { tier3info_restful_request } from 'src/plugins/tier3info.js'
import { locate_cache_key_fields } from 'src/plugins/locate.js'
import DataTable from 'src/components/DataTable.vue'

// import axios from 'axios'
import { useTitleStore } from 'stores/titleStore'
const titleStore = useTitleStore()
titleStore.setMainTitle('Locate Tool')

const searchQuery = ref('')
const rows = ref([])
const selectedItem = ref(null)
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
    rows.value = [{ id: 'No Matches Found', type: 'No Matches Found' }]
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

const props = defineProps({
  query: Object,
})

import { watch } from 'vue'

onMounted(() => {
  if (props.query?.query) {
    searchQuery.value = props.query.query
    executeSearch()
  }
})

watch(
  () => props.query?.query,
  (newQuery) => {
    if (newQuery) {
      searchQuery.value = newQuery
      executeSearch()
    }
  },
)
</script>
<style lang="sass"></style>
