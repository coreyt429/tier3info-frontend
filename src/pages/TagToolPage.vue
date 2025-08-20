<template>
  <q-page class="flex flex-start">
    <div class="q-pa-md" style="width: 100%">
      <!-- Row 1: Search Input and Button -->
      <div class="row q-mt-md">
        <q-card class="col-12">
          <q-card-section class="row items-start">
            <q-input
              v-model="tagData"
              @paste="handlePaste"
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
            <q-btn-dropdown
              label="Load TagSet"
              icon="cloud_download"
              color="teal"
              class="q-mr-sm"
              :disable="isLoadTagSetDisabled"
              split
              menu-anchor="bottom start"
              menu-self="top start"
              menu-cover
              menu-class="bg-teal text-white"
              auto-close
            >
              <q-list>
                <q-item
                  v-for="tag in tagSets"
                  :key="tag"
                  clickable
                  v-close-popup
                  active-class="text-white bg-teal"
                  @click="loadTagSet(tag)"
                >
                  <q-item-section class="q-pa-sm q-mx-sm">{{ tag }}</q-item-section>
                </q-item>
              </q-list>
            </q-btn-dropdown>
            <q-btn
              label="Save TagSet"
              icon="save"
              color="green"
              class="q-mr-sm"
              :disable="isSaveTagSetDisabled"
              @click="showSaveDialog = true"
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
      <q-dialog v-model="showSaveDialog" persistent>
        <q-card>
          <q-card-section>
            <div class="text-h6">Enter TagSet Name</div>
          </q-card-section>
          <q-card-section>
            <q-input v-model="tagsetName" label="TagSet Name" autofocus />
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat label="Cancel" v-close-popup />
            <q-btn
              flat
              label="Save"
              color="green"
              @click="confirmSaveTagSet"
              :disable="!tagsetName"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>
      <!-- Row 2: Search Results Table -->
      <q-card v-if="rows.length > 0" class="q-mt-md">
        <q-card-section class="row items-center">
          <div class="col-12">
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
          </div>
        </q-card-section>
      </q-card>
      <!-- Row 3: Detail Area -->
      <q-card v-if="outputHTML" class="q-mt-md">
        <q-card-section class="row items-center">
          <div class="q-pa-md bg-grey-2" v-html="outputHTML"></div>
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

import { useDocStore } from 'src/stores/docStore'
useDocStore().setDocUrl('docs/tagtool.html')

const tagSets = ref(['tagset_1', 'tagset_2', 'tagset_3'])

async function loadTagSet(name) {
  console.log('Load TagSet:', name)
  tagsetName.value = name
  // pull tagset from tier3info_restful_request
  const request = {
    method: 'GET',
    path: `/api/tagtool/tagset/${name}`,
  }
  const response = await tier3info_restful_request(request)
  console.log('Response:', response)
  tagData.value = response.data.tags.join('\n') || ''
}

const searchQuery = ref('')
const rows = ref([])
const outputHTML = ref(null)
const selectedRows = ref([])
const columns = [
  { name: 'matches', label: 'Matches', field: 'matches' },
  { name: 'id', label: 'ID', field: 'id' },
  { name: 'device_id', label: 'Device ID', field: 'device_id' },
  { name: 'cluster', label: 'Cluster', field: 'cluster' },
  { name: 'enterprise_id', label: 'Enterprise Id', field: 'enterprise_id' },
  { name: 'group_id', label: 'Group Id', field: 'group_id' },
  { name: 'user_id', label: 'User Id', field: 'user_id' },
  { name: 'device_type', label: 'Device Type', field: 'device_type' },
  { name: 'mac_address', label: 'MAC Address', field: 'mac_address' },
  { name: 'tagsButton', label: 'Custom Tags', field: 'tagsButton' },
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
  loadTagSetNames()
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

const showSaveDialog = ref(false)
const tagsetName = ref('')

async function saveTagSet(name) {
  console.log('Saving TagSet:', tagData.value)
  const request = {
    method: 'PUT',
    path: `/api/tagtool/tagset/${name}`,
    body: {
      tags: tagData.value.split('\n').map((line) => line.trim()),
    },
  }
  const response = await tier3info_restful_request(request)
  console.log('Response:', response)
  if (!tagSets.value.includes(name)) {
    tagSets.value.push(name)
  }
}

async function loadTagSetNames() {
  console.log('Loading TagSet Names')
  const request = {
    method: 'GET',
    path: `/api/tagtool/tagset`,
  }
  const response = await tier3info_restful_request(request)
  console.log('Response:', response)
  tagSets.value = response.data || []
}

function confirmSaveTagSet() {
  showSaveDialog.value = false
  saveTagSet(tagsetName.value)
}

async function rebuildConfigs() {
  console.log('Rebuilding configs for selected rows:', selectedRows.value)
  for (const row of selectedRows.value) {
    const request = {
      method: 'POST',
      path: `/api/broadworks/access_device/${row.id}/rebuild`,
    }
    const response = await tier3info_restful_request(request)
    console.log(`Rebuild response for ${row.id}:`, response)
    if (outputHTML.value === null) {
      outputHTML.value = ''
    }
    if (response.data.status === 'okay') {
      outputHTML.value += `<p class="bg-positive text-white q-pa-sm q-mb-xs rounded-borders">Rebuild configs for ${row.id}: ${response.data.message}</p>`
    } else {
      outputHTML.value += `<p class="bg-negative text-white q-pa-sm q-mb-xs rounded-borders">Error rebuilding configs for ${row.id}: ${response.data.error}</p>`
    }
  }
}

async function rebootPhones() {
  console.log('Rebooting phones for selected rows:', selectedRows.value)
  for (const row of selectedRows.value) {
    const request = {
      method: 'POST',
      path: `/api/broadworks/access_device/${row.id}/reboot`,
    }
    const response = await tier3info_restful_request(request)
    console.log(`Reboot response for ${row.id}:`, response)
    if (outputHTML.value === null) {
      outputHTML.value = ''
    }
    if (response.data.status === 'okay') {
      outputHTML.value += `<p class="bg-positive text-white q-pa-sm q-mb-xs rounded-borders">Reboot phones for ${row.id}: ${response.data.message}</p>`
    } else {
      outputHTML.value += `<p class="bg-negative text-white q-pa-sm q-mb-xs rounded-borders">Error rebooting phones for ${row.id}: ${response.data.error}</p>`
    }
  }
}

async function applyTags() {
  console.log('applyTags: Applying tags to selected rows:', selectedRows.value)
  for (const row of selectedRows.value) {
    const request = {
      method: 'PUT',
      path: `/api/broadworks/access_device/${row.id}/tags`,
      body: Object.fromEntries(
        tagData.value.split('\n').map((line) => {
          const [key, value] = line.split('=').map((part) => part.trim())
          return [key, value || '']
        }),
      ),
    }
    const response = await tier3info_restful_request(request)
    console.log(`applyTags: Tag response for ${row.id}:`, response)
    if (outputHTML.value === null) {
      outputHTML.value = ''
    }
    response.data.forEach((res) => {
      console.log(`applyTags: Response for ${row.id}:`, res)
      if (res.status === 'success') {
        console.log(`applyTags: Applied tags to ${row.id}:`, res.status, res.message)
        outputHTML.value += `<p class="bg-positive text-white q-pa-sm q-mb-xs rounded-borders">Applied tags to ${row.id}: ${res.message}</p>`
      } else if (res.status === 'info') {
        console.log(`applyTags: Applied tags to ${row.id}:`, res.status, res.message)
        outputHTML.value += `<p class="bg-info text-black q-pa-sm q-mb-xs rounded-borders">Info for ${row.id}: ${res.message}</p>`
      } else {
        console.log(`applyTags: Applied tags to ${row.id}:`, res.status, res.message)
        outputHTML.value += `<p class="bg-negative text-white q-pa-sm q-mb-xs rounded-borders">Error applying tags to ${row.id}: ${res.message}</p>`
      }
    })
  }
}

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
  isRebuildConfigsDisabled.value = selectedRows.value.length === 0
  isRebootPhonesDisabled.value = selectedRows.value.length === 0
  isApplyTagsDisabled.value = selectedRows.value.length === 0 || tagData.value.trim() === ''
  console.log(`checkTags: selected ${JSON.stringify(selectedRows.value.length)}`)
  console.log(`checkTags: selected ${JSON.stringify(selectedRows.value.length === 0)}`)
  console.log(`checkTags: tags ${JSON.stringify(tagData.value)}`)
  console.log(`checkTags: tags ${JSON.stringify(tagData.value.trim() === '')}`)

  console.log(`checkTags: ${JSON.stringify(isApplyTagsDisabled.value)}`)
}

watch(
  () => tagData.value,
  (newTagData) => {
    console.log('Tag Data changed:', newTagData)
    checkTags()
  },
)

function handlePaste(event) {
  console.log('Paste event:', event)
  // Handle paste event
  const pastedData = event.clipboardData.getData('text/plain')
  console.log('Pasted data:', pastedData)
  tagData.value = pastedData
}

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
