<template>
  <q-page class="q-pa-md">
    <q-card>
      <DataTable
        :rows="rows"
        :columns="columns"
        :filterable="true"
        :exportable="true"
        :pagination-config="pagination"
        :visible-columns="defaultVisibleColumns"
        :onClick="selectRow"
        storage-key="broadworks-access-device-christening"
        exportPrefix="access-device-christening-queue"
        no-data-label="No christening queue records found"
        no-results-label="No matching christening queue records"
        table-height="58vh"
      />
      <q-inner-loading :showing="isLoading">
        <q-spinner-gears size="48px" color="primary" />
      </q-inner-loading>
    </q-card>

    <q-card v-if="selectedRecord" class="q-mt-md">
      <q-card-section class="row items-start q-col-gutter-md">
        <div class="col-12 col-md-8">
          <div class="text-h6">
            {{ selectedRecord.vendor || 'Unknown Vendor' }} {{ selectedRecord.model || '' }}
          </div>
          <div class="text-caption text-grey-7">
            {{ selectedRecord.mac_address || 'No MAC address' }} / {{ selectedRecord.ip_address || 'No IP address' }}
          </div>
        </div>
        <div class="col-12 col-md-4 text-md-right">
          <q-chip dense square color="primary" text-color="white">{{ selectedRecord.state || 'unknown' }}</q-chip>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section>
        <q-markup-table flat bordered dense>
          <tbody>
            <tr v-for="field in detailFields" :key="field.name">
              <th class="text-left detail-key">{{ field.label }}</th>
              <td class="text-left">
                <span class="detail-value">{{ formatValue(selectedRecord[field.name]) }}</span>
              </td>
            </tr>
          </tbody>
        </q-markup-table>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import DataTable from 'src/components/DataTable.vue'
import { emit_notification, tier3info_restful_request } from 'src/plugins/tier3info.js'
import { useTitleStore } from 'stores/titleStore'

const endpoint = '/broadworks/access_device/christening/queue/'
const route = useRoute()
const titleStore = useTitleStore()

titleStore.setMainTitle(route.meta.title || 'Broadworks Access Device Christening')

const isLoading = ref(false)
const rows = ref([])
const selectedRecord = ref(null)
const pagination = ref({
  sortBy: 'timestamp',
  descending: true,
  rowsPerPage: 0,
})

const defaultVisibleColumns = ['timestamp', 'ip_address', 'vendor', 'model', 'mac_address', 'state']

const fieldLabels = {
  cert_expiration: 'Certificate Expiration',
  cert_expired: 'Certificate Expired',
  cert_issuer: 'Certificate Issuer',
  cert_verified: 'Certificate Verified',
  cluster: 'Cluster',
  device_id: 'Device ID',
  device_type: 'Device Type',
  enterprise_id: 'Enterprise ID',
  firmware: 'Firmware',
  firmware_verified: 'Firmware Verified',
  group_id: 'Group ID',
  handler: 'Handler',
  https_verified: 'HTTPS Verified',
  ip_address: 'IP Address',
  mac_address: 'MAC Address',
  model: 'Model',
  provisioned: 'Provisioned',
  state: 'State',
  timestamp: 'Timestamp',
  upgrade_url: 'Upgrade URL',
  user_agent: 'User Agent',
  user_agent_valid: 'User-Agent Valid',
  vendor: 'Vendor',
}

const preferredFieldOrder = [
  'timestamp',
  'ip_address',
  'vendor',
  'model',
  'mac_address',
  'state',
  'firmware',
  'handler',
  'user_agent',
  'user_agent_valid',
  'firmware_verified',
  'https_verified',
  'cert_verified',
  'cert_expired',
  'cert_expiration',
  'cert_issuer',
  'provisioned',
  'device_id',
  'device_type',
  'cluster',
  'enterprise_id',
  'group_id',
  'upgrade_url',
]

const allFieldNames = computed(() => {
  const fields = new Set(preferredFieldOrder)
  rows.value.forEach((row) => {
    Object.keys(row).forEach((key) => {
      if (key !== 'id') {
        fields.add(key)
      }
    })
  })
  return [...fields]
})

const detailFields = computed(() =>
  allFieldNames.value.map((fieldName) => ({
    name: fieldName,
    label: formatLabel(fieldName),
  })),
)

const columns = computed(() =>
  allFieldNames.value.map((fieldName) => ({
    name: fieldName,
    label: formatLabel(fieldName),
    field: fieldName,
    sortable: true,
    align: 'left',
  })),
)

function formatLabel(fieldName) {
  return (
    fieldLabels[fieldName] ||
    String(fieldName)
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  )
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') {
    return '—'
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }
  return String(value)
}

function normalizeRecord(record, index) {
  return {
    id: `${record.timestamp || index}-${record.mac_address || record.ip_address || index}`,
    ...record,
  }
}

function selectRow(row) {
  selectedRecord.value = row
}

async function fetchQueue() {
  isLoading.value = true
  try {
    const response = await tier3info_restful_request({
      method: 'GET',
      path: endpoint,
    })
    if (response && response.status === 200 && Array.isArray(response.data)) {
      rows.value = response.data.map(normalizeRecord)
      selectedRecord.value = rows.value[0] || null
      return
    }
    rows.value = []
    selectedRecord.value = null
    emit_notification('negative', 'Failed to load christening queue records.')
  } finally {
    isLoading.value = false
  }
}

await fetchQueue()
</script>

<style lang="scss" scoped>
.detail-key {
  width: 220px;
}

.detail-value {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
