<template>
  <q-page class="q-pa-md">
    <q-card class="q-pa-md">
      <q-card-section class="row q-col-gutter-md items-start">
        <div class="col-12 col-md-4">
          <q-input
            v-model="title"
            label="Job Title"
            outlined
            dense
            :disable="isLoading"
            placeholder="Auth reset review"
          />
        </div>
        <div class="col-12 col-md-8">
          <q-input
            v-model="targetsInput"
            label="Targets (one per line or comma-separated)"
            type="textarea"
            autogrow
            outlined
            dense
            :disable="isLoading"
            placeholder="2059784479"
          />
        </div>
      </q-card-section>
      <q-card-section class="row q-col-gutter-sm items-center">
        <div class="col-auto">
          <q-btn
            color="primary"
            label="Stage Job"
            icon="playlist_add_check"
            :loading="isLoading && currentMode === 'stage'"
            :disable="!canStage"
            @click="submitJob(false)"
          />
        </div>
        <div class="col-auto">
          <q-btn
            color="positive"
            label="Execute Job"
            icon="play_arrow"
            :loading="isLoading && currentMode === 'execute'"
            :disable="!canExecute"
            @click="submitJob(true)"
          />
        </div>
        <div class="col-12 col-md-auto text-caption text-grey-7">
          <span v-if="dataSource">Showing {{ dataSourceLabel }}</span>
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

    <q-card v-if="tableRows.length" class="q-mt-md">
      <DataTable
        :rows="tableRows"
        :columns="columns"
        :filterable="true"
        :exportable="true"
        :pagination-config="pagination"
        :visible-columns="visibleColumns"
        exportPrefix="broadworks-auth-reset"
        table-height="60vh"
      />
    </q-card>
  </q-page>
</template>

<script setup>
import { computed, onUnmounted, ref } from 'vue'
import { tier3info_restful_request } from 'src/plugins/tier3info.js'
import { useTitleStore } from 'stores/titleStore'
import DataTable from 'src/components/DataTable.vue'

const titleStore = useTitleStore()
const pageTitle = 'Broadworks Auth Reset'
const jobEndpoint = '/broadworks/user/bulk/auth_reset'

const title = ref('')
const targetsInput = ref('')
const statusMessage = ref(null)
const errorMessage = ref(null)
const isLoading = ref(false)
const currentMode = ref('stage')

const stageJobId = ref(null)
const executeJobId = ref(null)
const dataJobId = ref(null)
const waitCounter = ref(0)
let pollTimer = null

const rowsRaw = ref([])
const dataSource = ref(null)
const initialDataMap = ref(new Map())

const pagination = ref({ rowsPerPage: 0 })
const visibleColumns = ref([
  'user_id',
  'device_id',
  'line_port',
  'password_change_local',
  'last_registration_code',
  'last_registration_local',
  'last_registration_user_agent',
  'dms_latest_local',
  'dms_latest_path',
  'complete',
])

const columns = [
  {
    name: 'user_id',
    label: 'User ID',
    field: 'user_id',
    align: 'left',
    classes: (row) => cellClass('user_id', row),
  },
  {
    name: 'device_id',
    label: 'Device ID',
    field: 'device_id',
    align: 'left',
    classes: (row) => cellClass('device_id', row),
  },
  {
    name: 'line_port',
    label: 'Line Port',
    field: 'line_port',
    align: 'left',
    classes: (row) => cellClass('line_port', row),
  },
  {
    name: 'password_change_local',
    label: 'Password Change (SIP)',
    field: 'password_change_local',
    classes: (row) => cellClass('password_change_ts', row),
  },
  {
    name: 'last_registration_code',
    label: 'Last Reg Code',
    field: 'last_registration_code',
    classes: (row) => cellClass('last_registration_code', row),
  },
  {
    name: 'last_registration_local',
    label: 'Last Reg Time',
    field: 'last_registration_local',
    classes: (row) => cellClass('last_registration_ts', row, { stale: row.stale_registration }),
  },
  {
    name: 'last_registration_user_agent',
    label: 'Last Reg UA',
    field: 'last_registration_user_agent',
    classes: (row) => `text-wrap ${cellClass('last_registration_user_agent', row)}`.trim(),
    style: 'white-space: normal; word-break: break-word;',
  },
  {
    name: 'dms_latest_local',
    label: 'DMS Latest Time',
    field: 'dms_latest_local',
    classes: (row) => cellClass('dms_latest_ts', row, { stale: row.stale_dms }),
  },
  {
    name: 'dms_latest_path',
    label: 'DMS File',
    field: 'dms_latest_path',
    classes: (row) => `text-wrap ${cellClass('dms_latest_path', row)}`.trim(),
    style: 'white-space: normal; word-break: break-word;',
  },
  {
    name: 'complete',
    label: 'Complete',
    field: (row) => (row.complete ? 'true' : 'false'),
    align: 'center',
  },
]

titleStore.setMainTitle(pageTitle)

const dataSourceLabel = computed(() => {
  if (dataSource.value === 'current') return 'current_data.json'
  if (dataSource.value === 'initial') return 'initial_data.json'
  return ''
})

const canStage = computed(() => {
  return !isLoading.value && title.value.trim() && parseTargets().length
})

const canExecute = computed(() => {
  return !isLoading.value && stageJobId.value && dataSource.value === 'initial'
})

const tableRows = computed(() => {
  return rowsRaw.value.map((row) => {
    const pwdTs = row?.password_change?.sip?.timestamp || null
    const lastReg = row?.last_registration || {}
    const dmsLatest = getLatestDmsEntry(row)
    return {
      key: getRecordKey(row),
      _raw: row,
      user_id: row?.user_id || '',
      device_id: row?.device_id || '',
      line_port: row?.line_port || '',
      complete: row?.complete === true,
      password_change_ts: pwdTs,
      password_change_local: formatLocalTimestamp(pwdTs),
      last_registration_code: lastReg?.code || '',
      last_registration_ts: lastReg?.timestamp || null,
      last_registration_local: formatLocalTimestamp(lastReg?.timestamp),
      last_registration_user_agent: lastReg?.user_agent || '',
      dms_latest_ts: dmsLatest?.timestamp || null,
      dms_latest_local: formatLocalTimestamp(dmsLatest?.timestamp),
      dms_latest_path: dmsLatest?.path || '',
      stale_dms: isTimestampStale(dmsLatest?.timestamp, pwdTs),
      stale_registration: isTimestampStale(lastReg?.timestamp, pwdTs),
    }
  })
})

function parseTargets() {
  return targetsInput.value
    .split(/\n|,/)
    .map((t) => t.trim())
    .filter(Boolean)
}

function getRecordKey(record) {
  return `${record?.user_id || ''}|${record?.device_id || ''}|${record?.line_port || ''}`
}

function formatLocalTimestamp(isoString) {
  if (!isoString) return ''
  const dt = new Date(isoString)
  if (Number.isNaN(dt.getTime())) return ''
  return dt.toLocaleString()
}

function isTimestampStale(candidate, baseline) {
  if (!candidate || !baseline) return false
  const c = Date.parse(candidate)
  const b = Date.parse(baseline)
  if (Number.isNaN(c) || Number.isNaN(b)) return false
  return c <= b
}

function getLatestDmsEntry(record) {
  const dms = record?.dms || {}
  let latest = null
  Object.entries(dms).forEach(([path, info]) => {
    if (!info || info.status_code !== 200 || !info.timestamp) return
    if (!latest) {
      latest = { path, ...info }
      return
    }
    const currentTime = Date.parse(info.timestamp)
    const latestTime = Date.parse(latest.timestamp)
    if (!Number.isNaN(currentTime) && (Number.isNaN(latestTime) || currentTime > latestTime)) {
      latest = { path, ...info }
    }
  })
  return latest
}

function cellClass(field, row, options = {}) {
  if (options.stale) return 'bg-red-2 text-dark'
  if (dataSource.value !== 'current') return ''
  if (row.complete) return ''
  const initialRow = initialDataMap.value.get(row.key)
  if (!initialRow) return ''

  const current = getComparableValue(field, row, row._raw || row)
  const initial = getComparableValue(field, row, initialRow)
  if (current === null || current === undefined || current === '') return ''
  if (initial === null || initial === undefined || initial === '') return ''
  return current === initial ? 'bg-orange-2 text-dark' : ''
}

function getComparableValue(field, tableRow, rawRow) {
  switch (field) {
    case 'user_id':
      return rawRow?.user_id || ''
    case 'device_id':
      return rawRow?.device_id || ''
    case 'line_port':
      return rawRow?.line_port || ''
    case 'password_change_ts':
      return rawRow?.password_change?.sip?.timestamp || ''
    case 'last_registration_code':
      return rawRow?.last_registration?.code || ''
    case 'last_registration_ts':
      return rawRow?.last_registration?.timestamp || ''
    case 'last_registration_user_agent':
      return rawRow?.last_registration?.user_agent || ''
    case 'dms_latest_ts': {
      const latest = getLatestDmsEntry(rawRow)
      return latest?.timestamp || ''
    }
    case 'dms_latest_path': {
      const latest = getLatestDmsEntry(rawRow)
      return latest?.path || ''
    }
    default:
      return tableRow?.[field]
  }
}

function resetState() {
  statusMessage.value = null
  errorMessage.value = null
  isLoading.value = false
  currentMode.value = 'stage'
  stageJobId.value = null
  executeJobId.value = null
  dataJobId.value = null
  waitCounter.value = 0
  rowsRaw.value = []
  dataSource.value = null
  initialDataMap.value = new Map()
  clearPoll()
}

function clearPoll() {
  if (pollTimer) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
}

async function submitJob(executeFlag) {
  if (!executeFlag) {
    resetState()
  }
  errorMessage.value = null
  currentMode.value = executeFlag ? 'execute' : 'stage'
  isLoading.value = true
  const targets = parseTargets()
  if (!targets.length) {
    errorMessage.value = 'Please provide at least one target.'
    isLoading.value = false
    return
  }

  statusMessage.value = executeFlag
    ? 'Executing job... Please wait.'
    : 'Staging job... Please wait.'

  try {
    const response = await tier3info_restful_request({
      method: 'POST',
      path: jobEndpoint,
      body: {
        targets,
        title: title.value.trim(),
        execute: executeFlag,
      },
    })

    const jobId = response?.data?.job_id
    if (!jobId) {
      throw new Error('Missing job_id in response')
    }

    if (executeFlag) {
      executeJobId.value = jobId
      dataJobId.value = jobId
    } else {
      stageJobId.value = jobId
      dataJobId.value = jobId
    }
    waitCounter.value = 0
    clearPoll()
    pollTimer = setTimeout(() => checkJobStatus(executeFlag), 500)
  } catch (err) {
    console.error('BroadworksAuthReset: submitJob error:', err)
    errorMessage.value = 'Invalid response from server. Please try again later.'
    statusMessage.value = null
    isLoading.value = false
  }
}

async function checkJobStatus(executing) {
  const jobId = executing ? executeJobId.value : stageJobId.value
  if (!jobId) return

  try {
    const resp = await tier3info_restful_request({ path: `/jobs/${jobId}`, method: 'GET' })
    if (!resp || !resp.data) {
      throw new Error('Invalid job status response')
    }

    await refreshDataFiles(jobId, resp.data?.status)

    if (resp.data.status === 'completed') {
      statusMessage.value = executing
        ? 'Execution complete.'
        : 'Stage complete. Review the data, then execute when ready.'
      isLoading.value = false
      clearPoll()
      return
    }

    if (resp.data.status === 'failed') {
      errorMessage.value = 'Job failed on the server.'
      statusMessage.value = null
      isLoading.value = false
      clearPoll()
      return
    }

    waitCounter.value += 1
    if (waitCounter.value > 60) {
      statusMessage.value = 'Job is taking too long. Please try again later.'
      isLoading.value = false
      clearPoll()
      return
    }

    statusMessage.value = `Waiting on job data... (${waitCounter.value * 5} seconds)`
    pollTimer = setTimeout(() => checkJobStatus(executing), 5000)
  } catch (err) {
    console.error('BroadworksAuthReset: checkJobStatus error:', err)
    errorMessage.value = 'Invalid response from server. Please try again later.'
    statusMessage.value = null
    isLoading.value = false
    clearPoll()
  }
}

async function refreshDataFiles(jobId, jobStatus) {
  if (!jobId) return
  if (jobStatus === 'new' || jobStatus === 'queued') {
    statusMessage.value = `Waiting for job to start... (${jobStatus})`
    return
  }
  const filesIndex = await fetchFilesIndex(jobId)
  console.log('BroadworksAuthReset: Files index:', filesIndex)
  const currentReady = filesIndex?.['current_data.json']?.bytes > 0
  const initialReady = filesIndex?.['initial_data.json']?.bytes > 0
  console.log(
    `BroadworksAuthReset: Data files status - current: ${currentReady}, initial: ${initialReady}`,
  )

  if (!currentReady && !initialReady) {
    statusMessage.value = `Waiting on job files... (${jobStatus || 'processing'})`
    return
  }

  if (initialReady) {
    await loadInitialData(jobId)
  }

  // For staged jobs, initial data is the expected output until execution.
  if (initialReady && !currentReady) {
    const initialData = await fetchFile(jobId, 'initial_data.json')
    if (Array.isArray(initialData) && initialData.length) {
      rowsRaw.value = initialData.map((row) => ({ ...row, complete: false }))
      dataSource.value = 'initial'
    }
    return
  }

  if (currentReady) {
    const currentData = await fetchFile(jobId, 'current_data.json')
    if (Array.isArray(currentData) && currentData.length) {
      rowsRaw.value = currentData
      dataSource.value = 'current'
      return
    }
  }

  if (initialReady) {
    const initialData = await fetchFile(jobId, 'initial_data.json')
    if (Array.isArray(initialData) && initialData.length) {
      rowsRaw.value = initialData.map((row) => ({ ...row, complete: false }))
      dataSource.value = 'initial'
    }
  }
}

async function loadInitialData(jobId) {
  if (initialDataMap.value.size) return
  const initialData = await fetchFile(jobId, 'initial_data.json')
  if (!Array.isArray(initialData) || !initialData.length) return
  const map = new Map()
  initialData.forEach((row) => {
    map.set(getRecordKey(row), row)
  })
  initialDataMap.value = map
}

async function fetchFile(jobId, fileName) {
  try {
    const resp = await tier3info_restful_request({
      path: `/jobs/files/${jobId}/${fileName}`,
      method: 'GET',
    })
    return resp?.data
  } catch (err) {
    const status = err?.response?.status || err?.status
    if (status !== 404) {
      console.warn('BroadworksAuthReset: fetchFile error:', fileName, err)
    }
    return null
  }
}

async function fetchFilesIndex(jobId) {
  try {
    const resp = await tier3info_restful_request({
      path: `/jobs/files/${jobId}?include=data`,
      method: 'GET',
    })
    return resp?.data
  } catch (err) {
    const status = err?.response?.status || err?.status
    if (status !== 404) {
      console.warn('BroadworksAuthReset: fetchFilesIndex error:', err)
    }
    return null
  }
}

onUnmounted(() => {
  clearPoll()
})
</script>

<style scoped>
.text-wrap {
  white-space: normal;
  word-break: break-word;
}
</style>
