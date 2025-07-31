<template>
  <q-page class="flex flex-start">
    <div class="q-pa-md" style="width: 100%">
      <!-- Row 1: Search Input and Button -->
      <div class="row q-mt-md">
        <q-card class="col-12">
          <q-card-section class="row items-start">
            <q-input
              v-model="tagData"
              label="Tags"
              outlined
              dense
              type="textarea"
              autogrow
              class="col-6 q-mr-sm"
            />
            <q-input
              v-model="searchQuery"
              label="Search"
              outlined
              dense
              class="col-4 q-mr-sm"
              @keyup.enter="executeSearch"
            />
            <q-btn label="Search" icon="search" color="primary" class="" @click="executeSearch" />
          </q-card-section>
          <q-card-section class="row items-center">
            <q-btn
              label="Rebuild Configs"
              icon="build"
              color="primary"
              class="q-mr-sm"
              :disable="isRebuildConfigsDisabled"
              @click="rebuildConfigs"
            />
            <q-btn
              label="Reboot Phones"
              icon="power_settings_new"
              color="red"
              class="q-mr-sm"
              :disable="isRebootPhonesDisabled"
              @click="rebootPhones"
            />
            <q-btn
              label="Load TagSet"
              icon="cloud_download"
              color="teal"
              class="q-mr-sm"
              :disable="isLoadTagSetDisabled"
              @click="loadTagSet"
            />
            <q-btn
              label="Save TagSet"
              icon="save"
              color="green"
              class="q-mr-sm"
              :disable="isSaveTagSetDisabled"
              @click="saveTagSet"
            />
            <q-btn
              label="Apply Tags"
              icon="label"
              color="purple"
              class="q-mr-sm"
              :disable="isApplyTagsDisabled"
              @click="applyTags"
            />
          </q-card-section>
        </q-card>
      </div>
      <!-- Row 2: Search Results Table -->
      <q-card v-if="rows.length > 0" class="q-mt-md">
        <q-card-section class="row items-center">
          <DataTable
            :rows="rows"
            :columns="columns"
            :visibleColumns="visibleColumns"
            :filterable="true"
            :exportable="true"
            :pagination-config="pagination"
            exportPrefix="tagtool-export"
            selection="multiple"
            @update:selected="handleSelection"
          />
        </q-card-section>
      </q-card>
      <!-- Row 3: Detail Area -->
      <q-card v-if="outputHTML" class="q-mt-md">
        <q-card-section class="row items-center">
          <div class="q-pa-md bg-grey-2">
            <h6>Details</h6>
            <p>{{ outputHTML }}</p>
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
titleStore.setMainTitle('Tag Tool')

const searchQuery = ref('')
const rows = ref([])
const outputHTML = ref(null)
const selectedRows = ref([])
const columns = [
  { name: 'matches', label: 'Matches', field: 'matches' },
  { name: 'id', label: 'ID', field: 'id' },
  { name: 'type_id', label: 'Id', field: 'type_id' },
  { name: 'cluster', label: 'Cluster', field: 'cluster' },
  { name: 'enterprise_id', label: 'Enterprise Id', field: 'enterprise_id' },
  { name: 'group_id', label: 'Group Id', field: 'group_id' },
  { name: 'user_id', label: 'User Id', field: 'user_id' },
  { name: 'device_id', label: 'Device ID', field: 'device_id' },
  { name: 'device_type', label: 'Device Type', field: 'device_type' },
  { name: 'mac_address', label: 'MAC Address', field: 'mac_address' },
  { name: 'tags', label: 'Custom Tags', field: 'tagsButton' },
]

const isRebuildConfigsDisabled = ref(true)
const isRebootPhonesDisabled = ref(true)
const isLoadTagSetDisabled = ref(false)
const isSaveTagSetDisabled = ref(true)
const isApplyTagsDisabled = ref(true)

const visibleColumns = ref(columns.map((col) => col.name).filter((name) => name !== 'id'))
console.log('Visible Columns:', visibleColumns.value)

const tagData = ref('')
const pagination = ref({ rowsPerPage: 0 })
async function executeSearch() {
  console.log('Search Query:', searchQuery.value)
  const request = {
    method: 'POST',
    path: '/locate/',
    body: {
      query_string: `(${searchQuery.value}) AND type:"access_device"`,
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
    const customTags = record.custom_tags || []
    record.tags = customTags.map((tag) => `${tag.tag_name}=${tag.tag_value}`).join('\n')
    record.tagsButton = {
      tooltip: record.tags,
      copyToClipboard: () => {
        navigator.clipboard
          .writeText(record.tags)
          .then(() => {
            console.log('Tags copied to clipboard:', record.tags)
          })
          .catch((err) => {
            console.error('Failed to copy tags to clipboard:', err)
          })
      },
    }
    console.log(`tags: ${record.tags}`)
    record.matches = 'not_set'
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

function checkTags() {
  console.log(`checkTags called with tagData: ${tagData.value} rows: ${rows.value.length}`)
  const lines = tagData.value.split('\n').map((line) => {
    line = line.trim()

    // Add leading '%' if missing
    if (!line.startsWith('%')) {
      line = `%${line}`
    }

    // Ensure '=' exists after the second '%'
    const secondPercentIndex = line.indexOf('%', 1)
    if (secondPercentIndex !== -1) {
      const beforeSecondPercent = line.substring(0, secondPercentIndex + 1)
      const afterSecondPercent = line.substring(secondPercentIndex + 1).trim()

      if (!afterSecondPercent.includes('=')) {
        line = `${beforeSecondPercent}=`
      } else {
        const [key, value] = afterSecondPercent.split('=').map((part) => part.trim())
        line = `${beforeSecondPercent}${key}=${value || ''}`
      }
    }
    // Add '%' before the first '=' if missing
    const firstEqualIndex = line.indexOf('=')
    if (firstEqualIndex !== -1 && line.charAt(firstEqualIndex - 1) !== '%') {
      line = line.substring(0, firstEqualIndex).trim() + '%' + line.substring(firstEqualIndex)
    }
    return line
  })
  tagData.value = lines.join('\n')
  for (const row of rows.value) {
    let hasTag = 0
    let alreadySet = 0

    const tagLines = tagData.value.split('\n').map((line) => line.trim())
    const rowTags = row.tags.split('\n').map((tag) => tag.trim())
    for (const tagLine of tagLines) {
      const [tagKey, tagValue] = tagLine.split('=').map((part) => part.trim())
      for (const rowTag of rowTags) {
        const [rowTagKey, rowTagValue] = rowTag.split('=').map((part) => part.trim())
        if (rowTagKey === tagKey) {
          hasTag++
          if (rowTagValue === tagValue) {
            alreadySet++
          }
        }
      }
    }
    console.log(`hasTag: ${hasTag}, alreadySet: ${alreadySet}`)
    row.matches = `${hasTag}/${alreadySet}`
  }
  isSaveTagSetDisabled.value = tagData.value.trim() === ''
}

watch(
  () => tagData.value,
  (newTagData) => {
    console.log('Tag Data changed:', newTagData)
    checkTags()
  },
)

function handleSelection(newSelectedRows) {
  console.log('Selected rows:', newSelectedRows)
  isRebuildConfigsDisabled.value = newSelectedRows.length === 0
  isRebootPhonesDisabled.value = newSelectedRows.length === 0
  isApplyTagsDisabled.value = newSelectedRows.length === 0 || tagData.value.trim() === ''
  selectedRows.value = newSelectedRows
  for (const row of selectedRows.value) {
    console.log('Selected row:', row)
  }
  console.log(`${selectedRows.value.length} rows selected of ${rows.value.length}`)
}
</script>
<style lang="sass"></style>
