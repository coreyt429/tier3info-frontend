<template>
  <q-page class="q-pa-md">
    <q-card class="q-pa-md">
      <q-card-section class="row justify-end q-gutter-sm items-start">
        <div class="col-auto">
          <q-select
            v-model="timePreset"
            :options="timeOptions"
            label="Time Range"
            outlined
            dense
            emit-value
            map-options
            @update:model-value="onTimePresetChange"
          />
        </div>
        <div v-if="showCustom" class="col-auto">
          <q-input
            v-model.trim="customStartDT"
            filled
            dense
            label="Start (local)"
            hint="YYYY-MM-DD HH:mm:ss.SSS (ms optional)"
            @update:model-value="updateCustomRange"
          >
            <template v-slot:prepend>
              <q-icon name="event" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date
                    v-model="customStartDT"
                    mask="YYYY-MM-DD HH:mm:ss"
                    @update:model-value="updateCustomRange"
                  >
                    <div class="row items-center justify-end">
                      <q-btn v-close-popup label="Close" color="primary" flat />
                    </div>
                  </q-date>
                </q-popup-proxy>
              </q-icon>
            </template>
            <template v-slot:append>
              <q-icon name="access_time" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-time
                    v-model="customStartDT"
                    mask="YYYY-MM-DD HH:mm:ss"
                    format24h
                    with-seconds
                    @update:model-value="updateCustomRange"
                  >
                    <div class="row items-center justify-end">
                      <q-btn v-close-popup label="Close" color="primary" flat />
                    </div>
                  </q-time>
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
        </div>
        <div v-if="showCustom" class="col-auto">
          <q-input
            v-model.trim="customEndDT"
            filled
            dense
            label="End (local)"
            hint="YYYY-MM-DD HH:mm:ss.SSS (ms optional)"
            @update:model-value="updateCustomRange"
          >
            <template v-slot:prepend>
              <q-icon name="event" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date
                    v-model="customEndDT"
                    mask="YYYY-MM-DD HH:mm:ss"
                    @update:model-value="updateCustomRange"
                  >
                    <div class="row items-center justify-end">
                      <q-btn v-close-popup label="Close" color="primary" flat />
                    </div>
                  </q-date>
                </q-popup-proxy>
              </q-icon>
            </template>
            <template v-slot:append>
              <q-icon name="access_time" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-time
                    v-model="customEndDT"
                    mask="YYYY-MM-DD HH:mm:ss"
                    format24h
                    with-seconds
                    @update:model-value="updateCustomRange"
                  >
                    <div class="row items-center justify-end">
                      <q-btn v-close-popup label="Close" color="primary" flat />
                    </div>
                  </q-time>
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
        </div>
      </q-card-section>

      <q-card-section class="row q-col-gutter-md items-start">
        <div class="col-12 col-md-9">
          <q-input
            v-model.trim="queryString"
            label="Query"
            outlined
            clearable
            @keyup.enter="executeSearch"
          />
        </div>
        <div class="col-12 col-md-3 text-center text-md-left">
          <q-btn color="primary" icon="search" label="Search" @click="executeSearch" />
        </div>
      </q-card-section>

      <q-card-section v-if="statusMessage">
        <q-banner dense rounded class="bg-info text-primary">
          {{ statusMessage }}
        </q-banner>
      </q-card-section>
      <q-card-section v-if="errorMessage">
        <q-banner dense rounded class="bg-negative text-white">
          {{ errorMessage }}
        </q-banner>
      </q-card-section>
    </q-card>

    <q-card class="q-mt-md">
      <DataTable
        :rows="rows"
        :columns="columns"
        :filterable="true"
        :exportable="false"
        :pagination-config="pagination"
        exportPrefix="ocom-registers-export"
        noDataLabel="No registers found"
      />
    </q-card>
  </q-page>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useTitleStore } from 'stores/titleStore'
import DataTable from 'src/components/DataTable.vue'
import { tier3info_restful_request } from 'src/plugins/tier3info'

const props = defineProps({
  query: Object,
})

const router = useRouter()
const titleStore = useTitleStore()
titleStore.setMainTitle('OCOM Registers')

const queryString = ref('')
const rows = ref([])
const statusMessage = ref(null)
const errorMessage = ref(null)
const timePreset = ref('now-15m')
const timeFilters = ref({ gte: 'now-15m' })
const showCustom = ref(false)
const customStartDT = ref(null)
const customEndDT = ref(null)
const pagination = ref({ rowsPerPage: 0 })

const timeOptions = [
  { label: 'Last 15 Minutes', value: 'now-15m' },
  { label: 'Last Hour', value: 'now-1h' },
  { label: 'Last 4 Hours', value: 'now-4h' },
  { label: 'Last 12 Hours', value: 'now-12h' },
  { label: 'Last 24 Hours', value: 'now-24h' },
  { label: 'Last 7 Days', value: 'now-7d' },
  { label: 'Last 30 Days', value: 'now-30d' },
  { label: 'Last 90 Days', value: 'now-90d' },
  { label: 'Last Year', value: 'now-1y' },
  { label: 'Custom', value: 'custom' },
]

const columns = [
  { name: 'ip', label: 'IP', field: 'ipLink', align: 'left', sortable: true, renderHtml: true },
  { name: 'user', label: 'User', field: 'userLink', align: 'left', sortable: true, renderHtml: true },
  { name: 'device', label: 'Device', field: 'device', align: 'left', sortable: true },
  { name: 'type', label: 'Type', field: 'type', align: 'left', sortable: true },
  { name: 'city', label: 'City', field: 'city', align: 'left', sortable: true },
  { name: 'region', label: 'Region', field: 'region', align: 'left', sortable: true },
  { name: 'country', label: 'Country', field: 'country', align: 'left', sortable: true },
]

onMounted(() => {
  applyRouteQuery(props.query)
  if (queryString.value) {
    executeSearch()
  }
})

watch(
  () => props.query,
  (newQuery) => {
    applyRouteQuery(newQuery)
  },
)

function applyRouteQuery(routeQuery) {
  const esquery = routeQuery?.esquery || routeQuery?.queryString || routeQuery?.query || ''
  queryString.value = typeof esquery === 'string' ? esquery.trim() : ''
  applyRouteTimeRange(routeQuery)
}

function applyRouteTimeRange(routeQuery) {
  const start = typeof routeQuery?.start === 'string' ? routeQuery.start.trim() : ''
  const end = typeof routeQuery?.end === 'string' ? routeQuery.end.trim() : ''

  if (!start && !end) return

  if (end === 'now' && start && timeOptions.some((option) => option.value === start)) {
    timePreset.value = start
    showCustom.value = false
    timeFilters.value = { gte: start }
    customStartDT.value = null
    customEndDT.value = null
    return
  }

  const customStart = isoToLocalDateTime(start)
  const customEnd = isoToLocalDateTime(end)
  if (!(customStart && customEnd)) return

  timePreset.value = 'custom'
  showCustom.value = true
  customStartDT.value = customStart
  customEndDT.value = customEnd
  updateCustomRange()
}

function onTimePresetChange(val) {
  if (val === 'custom') {
    showCustom.value = true
    return
  }
  showCustom.value = false
  timeFilters.value = { gte: val }
}

function updateCustomRange() {
  if (!(customStartDT.value && customEndDT.value)) return
  customStartDT.value = customStartDT.value.trim()
  customEndDT.value = customEndDT.value.trim()
  const startIso = dtToIso(customStartDT.value)
  const endIso = dtToIso(customEndDT.value)
  if (!(startIso && endIso)) return
  timeFilters.value = { gte: startIso, lte: endIso }
}

function buildElasticQuery() {
  const trimmedQuery = queryString.value.trim()
  const must = trimmedQuery ? [{ query_string: { query: trimmedQuery } }] : []

  return {
    query: {
      query: {
        bool: {
          must,
          filter: [
            {
              range: {
                '@timestamp': {
                  format: 'strict_date_optional_time',
                  ...timeFilters.value,
                },
              },
            },
          ],
          should: [],
          must_not: [],
        },
      },
    },
  }
}

async function executeSearch() {
  errorMessage.value = null
  queryString.value = queryString.value.trim()

  if (timePreset.value === 'custom') {
    updateCustomRange()
  }

  syncRouteQuery()
  statusMessage.value = 'Searching OCOM registers...'

  const response = await tier3info_restful_request({
    path: '/ocom/registers',
    method: 'POST',
    body: buildElasticQuery(),
  })

  if (!response || !Array.isArray(response.data)) {
    rows.value = []
    statusMessage.value = null
    errorMessage.value = 'Invalid response from server. Please try again later.'
    return
  }

  rows.value = response.data.map((record, index) => mapRegisterRow(record, index))
  statusMessage.value = `${rows.value.length} register${rows.value.length === 1 ? '' : 's'} found.`
}

function mapRegisterRow(record, index) {
  const ip = getPath(record, 'reg.ip')
  const user = getPath(record, 'reg.user')

  return {
    id: getPath(record, 'reg.id') || `${getPath(record, '@timestamp') || 'register'}-${index}`,
    ip,
    ipLink: buildDrilldownLink('reg.ip', ip),
    user,
    userLink: buildDrilldownLink('reg.user', user),
    device: getPath(record, 'reg.user_device'),
    type: getPath(record, 'reg.type'),
    city: getPath(record, 'geoip.city_name'),
    region: getPath(record, 'geoip.region_name'),
    country: getPath(record, 'geoip.country_name'),
  }
}

function buildDrilldownLink(field, value) {
  if (!value) return ''

  const query = `${field}:${value}`
  const route = router.resolve({
    path: '/ocom/registers',
    query: {
      esquery: query,
      ...getShareableTimeRange(),
    },
  })

  return `<a href="${escapeHtml(route.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(value)}</a>`
}

function syncRouteQuery() {
  const esquery = queryString.value.trim()
  const nextQuery = {
    ...getShareableTimeRange(),
  }

  if (esquery) {
    nextQuery.esquery = esquery
  }

  const currentQuery = props.query || {}
  if (
    (currentQuery.esquery || '') === (nextQuery.esquery || '') &&
    (currentQuery.start || '') === (nextQuery.start || '') &&
    (currentQuery.end || '') === (nextQuery.end || '')
  ) {
    return
  }

  router.replace({ path: '/ocom/registers', query: nextQuery })
}

function getShareableTimeRange() {
  const start = resolveTimeValueToAbsolute(timeFilters.value.gte)
  const end = resolveTimeValueToAbsolute(timeFilters.value.lte || 'now')
  return {
    ...(start ? { start } : {}),
    ...(end ? { end } : {}),
  }
}

function resolveTimeValueToAbsolute(value) {
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return value
  if (value === 'now') return new Date().toISOString()

  const relativeMatch = value.match(/^now-(\d+)([mhdwy])$/)
  if (!relativeMatch) return null

  const amount = parseInt(relativeMatch[1], 10)
  const unit = relativeMatch[2]
  const date = new Date()
  const unitMap = {
    m: 'Minutes',
    h: 'Hours',
    d: 'Date',
    w: 'Date',
    y: 'FullYear',
  }
  const multiplierMap = {
    m: 1,
    h: 1,
    d: 1,
    w: 7,
    y: 1,
  }
  const getter = `get${unitMap[unit]}`
  const setter = `set${unitMap[unit]}`

  date[setter](date[getter]() - amount * multiplierMap[unit])
  return date.toISOString()
}

function isoToLocalDateTime(value) {
  if (!value || value === 'now') return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const pad = (n) => String(n).padStart(2, '0')
  const pad3 = (n) => String(n).padStart(3, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad3(date.getMilliseconds())}`
}

function dtToIso(datetimeStr) {
  if (!datetimeStr) return null
  const [d, t] = datetimeStr.trim().split(/\s+/, 2)
  if (!d) return null
  const [y, m, day] = d.split('-').map((n) => parseInt(n, 10))
  const timeParts = (t || '00:00').split(':')
  const hh = parseInt(timeParts[0] || '0', 10)
  const mm = parseInt(timeParts[1] || '0', 10)
  const secAndMs = timeParts[2] || '0'
  const [ssRaw, msRaw] = secAndMs.split('.')
  const ss = parseInt(ssRaw || '0', 10)
  const ms = parseInt((msRaw || '0').padEnd(3, '0').slice(0, 3), 10)
  const dt = new Date(y, (m || 1) - 1, day || 1, hh || 0, mm || 0, ss || 0, ms || 0)
  if (Number.isNaN(dt.getTime())) return null
  const pad = (n) => String(n).padStart(2, '0')
  const pad3 = (n) => String(n).padStart(3, '0')
  const offMin = -dt.getTimezoneOffset()
  const sign = offMin >= 0 ? '+' : '-'
  const absMin = Math.abs(offMin)
  const offHH = pad(Math.floor(absMin / 60))
  const offMM = pad(absMin % 60)
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}.${pad3(dt.getMilliseconds())}${sign}${offHH}:${offMM}`
}

function getPath(source, path) {
  return path.split('.').reduce((value, key) => value?.[key], source) ?? ''
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
</script>
