<template>
  <q-page class="q-pa-md">
    <q-card>
      <q-card-section>
        <div class="row items-center q-col-gutter-sm">
          <div class="col">
            <q-input
              v-model="searchQuery"
              label="Search Access Devices"
              outlined
              dense
              @blur="trimSearchQuery"
              @keyup.enter="executeSearch"
            />
          </div>
          <div class="col-auto">
            <q-btn color="primary" icon="search" label="Search" :loading="isSearching" @click="executeSearch" />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-card class="q-mt-md">
      <DataTable
        :rows="rows"
        :columns="columns"
        :filterable="true"
        :exportable="true"
        :pagination-config="pagination"
        :onClick="selectItem"
        exportPrefix="access-devices-export"
        no-data-label="No access devices found"
        no-results-label="No matching access devices"
        table-height="55vh"
      />
    </q-card>

    <q-card v-if="selectedItem" class="q-mt-md">
      <q-card-section class="row items-start q-col-gutter-md">
        <div class="col-12 col-md-6">
          <div class="text-h6">{{ selectedItem.device_id }}</div>
          <div class="text-caption text-grey-7">
            {{ selectedItem.cluster }} / {{ selectedItem.enterprise_id }} / {{ selectedItem.group_id }}
          </div>
        </div>
        <div class="col-12 col-md-6 text-md-right">
          <div class="text-caption text-grey-7">Last Updated</div>
          <div>{{ selectedItem.last_updated || '—' }}</div>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Device Files</div>
        <q-markup-table flat bordered dense>
          <thead>
            <tr>
              <th class="text-left">Access URL</th>
              <th class="text-left">File Format</th>
              <th class="text-left">File Source</th>
              <th class="text-left">Last Pull</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="file in deviceFiles" :key="file.access_url">
              <td class="text-left">
                <q-btn
                  flat
                  dense
                  no-caps
                  color="primary"
                  icon="download"
                  :label="file.access_url"
                  @click="downloadRepositoryFile(file)"
                />
              </td>
              <td class="text-left">
                <q-btn
                  flat
                  dense
                  no-caps
                  color="primary"
                  icon="description"
                  :label="file.file_format"
                  @click="downloadTemplateFile(file)"
                />
              </td>
              <td class="text-left">{{ file.file_source || '—' }}</td>
              <td class="text-left">
                <div v-if="file.lastPull">
                  <div>{{ file.lastPull.timestamp || '—' }}</div>
                  <div class="text-caption text-grey-7">
                    {{ file.lastPull.ip_address || '—' }} / {{ file.lastPull.status_code ?? '—' }}
                  </div>
                  <div class="text-caption text-grey-7">{{ file.lastPull.user_agent || '—' }}</div>
                </div>
                <span v-else class="text-grey-7">No pull data</span>
              </td>
            </tr>
            <tr v-if="!deviceFiles.length && !isLoadingDetails">
              <td colspan="4" class="text-left text-grey-7">No files returned for this access device.</td>
            </tr>
          </tbody>
        </q-markup-table>
      </q-card-section>

      <q-card-section v-if="orphanPulls.length">
        <div class="text-subtitle1 q-mb-sm">Additional DMS Pulls</div>
        <q-markup-table flat bordered dense>
          <thead>
            <tr>
              <th class="text-left">Path</th>
              <th class="text-left">Timestamp</th>
              <th class="text-left">IP Address</th>
              <th class="text-left">Status</th>
              <th class="text-left">User Agent</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="pull in orphanPulls" :key="pull.path">
              <td class="text-left">{{ pull.path }}</td>
              <td class="text-left">{{ pull.timestamp || '—' }}</td>
              <td class="text-left">{{ pull.ip_address || '—' }}</td>
              <td class="text-left">{{ pull.status_code ?? '—' }}</td>
              <td class="text-left">{{ pull.user_agent || '—' }}</td>
            </tr>
          </tbody>
        </q-markup-table>
      </q-card-section>

      <q-inner-loading :showing="isLoadingDetails">
        <q-spinner-gears size="48px" color="primary" />
      </q-inner-loading>
    </q-card>
  </q-page>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import DataTable from 'src/components/DataTable.vue'
import { emit_notification, tier3info_restful_request } from 'src/plugins/tier3info.js'
import { useTitleStore } from 'stores/titleStore'

const route = useRoute()
const titleStore = useTitleStore()

titleStore.setMainTitle(route.meta.title || 'Broadworks Access Devices')

const searchQuery = ref('')
const isSearching = ref(false)
const isLoadingDetails = ref(false)
const rows = ref([])
const selectedItem = ref(null)
const fileMap = ref({})
const lastPullMap = ref({})
const pagination = ref({ rowsPerPage: 0 })

const columns = [
  { name: 'cluster', label: 'Cluster', field: 'cluster', sortable: true, align: 'left' },
  {
    name: 'enterprise_id',
    label: 'Enterprise Id',
    field: 'enterprise_id',
    sortable: true,
    align: 'left',
  },
  { name: 'group_id', label: 'Group Id', field: 'group_id', sortable: true, align: 'left' },
  { name: 'device_type', label: 'Device Type', field: 'device_type', sortable: true, align: 'left' },
  { name: 'device_id', label: 'Device Id', field: 'device_id', sortable: true, align: 'left' },
  { name: 'mac_address', label: 'MAC Address', field: 'mac_address', sortable: true, align: 'left' },
  {
    name: 'tagsButton',
    label: 'Custom Tags',
    field: 'tagsButton',
    sortable: false,
    align: 'left',
  },
  {
    name: 'users_display',
    label: 'Users',
    field: 'users_display',
    sortable: false,
    align: 'left',
    renderHtml: true,
  },
]

const deviceFiles = computed(() => {
  return Object.values(fileMap.value)
    .map((file) => {
      const pullKey = accessUrlToPullKey(file.access_url)
      return {
        ...file,
        lastPull: pullKey ? lastPullMap.value[pullKey] || null : null,
      }
    })
    .sort((a, b) => String(a.file_format || '').localeCompare(String(b.file_format || '')))
})

const orphanPulls = computed(() => {
  const matchedKeys = new Set(
    deviceFiles.value.map((file) => accessUrlToPullKey(file.access_url)).filter(Boolean),
  )
  return Object.entries(lastPullMap.value)
    .filter(([path]) => !matchedKeys.has(path))
    .map(([path, pull]) => ({
      path,
      ...pull,
    }))
    .sort((a, b) => String(a.path).localeCompare(String(b.path)))
})

function trimSearchQuery() {
  searchQuery.value = searchQuery.value.trim()
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatLinesAsHtml(lines) {
  if (!lines.length) {
    return ''
  }
  return lines.map((line) => escapeHtml(line)).join('<br>')
}

function buildTagToolUrl(deviceId) {
  return `/#/tagtool?device_id=${encodeURIComponent(deviceId)}`
}

function buildTagsButton(tags, deviceId) {
  const tooltip = tags.join('\n')
  return {
    tooltip,
    copyToClipboard: () => {
      navigator.clipboard
        .writeText(tooltip)
        .catch((error) => console.error('Failed to copy access device tags:', error))
    },
    editAction: deviceId
      ? () => {
          window.open(buildTagToolUrl(deviceId), '_blank', 'noopener')
        }
      : null,
    editTooltip: deviceId ? `Edit tags for ${deviceId}` : 'Edit tags',
  }
}

function parseOrder(value) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : Number.MAX_SAFE_INTEGER
}

function mapAccessDeviceRow([id, record]) {
  const customTags = Array.isArray(record.custom_tags)
    ? record.custom_tags
        .map((tag) => `${tag.tag_name || ''}=${tag.tag_value || ''}`.trim())
        .filter((line) => line !== '=' && line !== '')
    : []
  const users = Array.isArray(record.users)
    ? [...record.users]
        .sort((a, b) => parseOrder(a.order) - parseOrder(b.order))
        .map((user) => `${user.user_id || ''} ${user.line_port || ''}`.trim())
        .filter(Boolean)
    : []

  return {
    id,
    ...record,
    mac_address: record.mac_address || '',
    tagsButton: buildTagsButton(customTags, record.device_id || id),
    users_display: formatLinesAsHtml(users),
  }
}

async function executeSearch() {
  trimSearchQuery()
  if (!searchQuery.value) {
    rows.value = []
    selectedItem.value = null
    fileMap.value = {}
    lastPullMap.value = {}
    emit_notification('negative', 'Enter a search string.')
    return
  }

  isSearching.value = true
  try {
    const response = await tier3info_restful_request({
      method: 'POST',
      path: '/locate/',
      body: {
        query: {
          query: {
            bool: {
              must: [
                {
                  term: {
                    'type.keyword': 'access_device',
                  },
                },
                {
                  query_string: {
                    query: searchQuery.value,
                  },
                },
              ],
            },
          },
        },
      },
    })

    if (!response?.data || typeof response.data !== 'object') {
      rows.value = []
      selectedItem.value = null
      emit_notification('negative', 'Failed to load access devices.')
      return
    }

    rows.value = Object.entries(response.data).map(mapAccessDeviceRow)
    selectedItem.value = null
    fileMap.value = {}
    lastPullMap.value = {}

    if (!rows.value.length) {
      emit_notification('negative', 'No access devices found.')
      return
    }

    emit_notification('positive', `Loaded ${rows.value.length} access device${rows.value.length === 1 ? '' : 's'}.`)
  } finally {
    isSearching.value = false
  }
}

async function selectItem(row) {
  selectedItem.value = row
  fileMap.value = {}
  lastPullMap.value = {}
  isLoadingDetails.value = true

  try {
    const [filesResponse, lastPullResponse] = await Promise.all([
      tier3info_restful_request({
        method: 'GET',
        path: `/broadworks/access_device/files/${encodeURIComponent(row.device_id)}?include=data`,
      }),
      tier3info_restful_request({
        method: 'GET',
        path: `/broadworks/access_device/${encodeURIComponent(row.device_id)}/last_dms_pull`,
      }),
    ])

    fileMap.value = filesResponse?.data && typeof filesResponse.data === 'object' ? filesResponse.data : {}
    lastPullMap.value =
      lastPullResponse?.data && typeof lastPullResponse.data === 'object' ? lastPullResponse.data : {}
  } finally {
    isLoadingDetails.value = false
  }
}

function accessUrlToPullKey(accessUrl) {
  if (!accessUrl) {
    return null
  }
  try {
    const parsedUrl = new URL(accessUrl)
    return parsedUrl.pathname.replace(/^\/+/, '')
  } catch {
    return accessUrl.replace(/^\/+/, '')
  }
}

function getFileNameFromAccessUrl(accessUrl) {
  if (!accessUrl) {
    return 'access-device-file'
  }
  const normalized = accessUrl.split('?')[0].replace(/\/+$/, '')
  const segments = normalized.split('/')
  return segments[segments.length - 1] || 'access-device-file'
}

function downloadContentAsFile(content, fileName) {
  const blob = new Blob([content ?? ''], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

async function downloadRepositoryFile(file) {
  if (!selectedItem.value?.device_id || !file.file_format) {
    return
  }
  const response = await tier3info_restful_request({
    method: 'GET',
    path: `/broadworks/access_device/files/${encodeURIComponent(selectedItem.value.device_id)}/${encodeURIComponent(file.file_format)}/repository`,
  })
  if (!response?.data || typeof response.data.content !== 'string') {
    emit_notification('negative', 'Failed to download repository file.')
    return
  }
  downloadContentAsFile(response.data.content, getFileNameFromAccessUrl(file.access_url))
}

async function downloadTemplateFile(file) {
  if (!selectedItem.value?.device_id || !file.file_format) {
    return
  }
  const response = await tier3info_restful_request({
    method: 'GET',
    path: `/broadworks/access_device/files/${encodeURIComponent(selectedItem.value.device_id)}/${encodeURIComponent(file.file_format)}`,
  })
  if (!response?.data || typeof response.data.content !== 'string') {
    emit_notification('negative', 'Failed to download template file.')
    return
  }
  downloadContentAsFile(response.data.content, `${file.file_format}.template`)
}
</script>

<style scoped>
.text-md-right {
  text-align: right;
}

@media (max-width: 1023px) {
  .text-md-right {
    text-align: left;
  }
}
</style>
