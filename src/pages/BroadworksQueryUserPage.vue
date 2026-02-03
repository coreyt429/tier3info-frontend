<template>
  <q-page class="q-pa-md">
    <q-card class="q-pa-md">
      <q-card-section class="row q-col-gutter-md items-start">
        <div class="col-12 col-md-6">
          <q-select
            v-model="selectedJobId"
            :options="jobOptions"
            label="Select Query User Job"
            outlined
            dense
            clearable
            emit-value
            map-options
            :loading="isJobsLoading"
          />
        </div>
        <div class="col-12 col-md-3">
          <q-select
            v-model="targetType"
            :options="targetOptions"
            label="Target"
            outlined
            dense
            emit-value
            map-options
            :disable="isLoading"
          />
        </div>
        <div class="col-12 col-md-3">
          <q-input
            v-model="selectedEntityId"
            :label="`${targetTypeLabel} ID`"
            outlined
            dense
            :disable="isLoading || targetType === 'all'"
            :placeholder="targetTypePlaceholder"
          />
        </div>
      </q-card-section>

      <q-card-section class="row q-col-gutter-sm items-center">
        <div class="col-auto">
          <q-btn
            color="primary"
            label="Refresh Jobs"
            icon="refresh"
            :loading="isJobsLoading"
            @click="fetchJobsList"
          />
        </div>
        <div class="col-auto">
          <q-btn
            color="positive"
            label="Submit"
            icon="play_arrow"
            :loading="isLoading && currentMode === 'rerun'"
            :disable="!canRerun"
            @click="rerunJob"
          />
        </div>
        <div class="col-auto">
          <q-btn
            color="negative"
            label="Delete"
            icon="delete"
            :disable="!selectedJobId || isLoading"
            @click="confirmDelete = true"
          />
        </div>
        <div class="col-auto">
          <q-btn
            color="secondary"
            label="Refresh Status"
            icon="sync"
            :disable="!selectedJobId || isLoading"
            @click="refreshSelectedJob"
          />
        </div>
        <div class="col-auto">
          <q-toggle v-model="usePrimary" label="Use Primary AS" dense />
        </div>
        <div class="col-auto">
          <q-toggle v-model="autoPoll" label="Auto refresh" dense />
        </div>
        <div class="col-12 col-md-auto text-caption text-grey-7">
          <span v-if="jobStatus">Status: {{ jobStatus }}</span>
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

      <q-card-section v-if="jobSummary">
        <q-separator class="q-mb-md" />
        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-4">
            <div class="text-caption text-grey-7">Job ID</div>
            <div class="text-body1">{{ jobSummary.jobId }}</div>
          </div>
          <div class="col-12 col-md-4">
            <div class="text-caption text-grey-7">Job Title</div>
            <div class="text-body1">{{ jobSummary.title || '—' }}</div>
          </div>
          <div class="col-12 col-md-4">
            <div class="text-caption text-grey-7">Owner</div>
            <div class="text-body1">{{ jobSummary.owner || '—' }}</div>
          </div>
          <div class="col-12 col-md-4">
            <div class="text-caption text-grey-7">Target</div>
            <div class="text-body1">{{ jobSummary.target || '—' }}</div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-card v-if="rawText" class="q-mt-md">
      <q-card-section class="row items-center q-col-gutter-sm">
        <div class="col">
          <div class="text-h6">Query User Output</div>
          <div class="text-caption text-grey-7">
            {{ sections.length ? `${sections.length} sections` : 'Raw output' }}
          </div>
        </div>
        <div class="col-auto">
          <q-btn
            color="primary"
            outline
            icon="download"
            label="Download Raw Text"
            :disable="!downloadUrl"
            :href="downloadUrl"
            :download="downloadFileName"
          />
        </div>
      </q-card-section>

      <q-card-section v-if="preambleText" class="q-pt-none">
        <q-expansion-item label="Preamble" dense expand-separator>
          <pre class="query-user-raw">{{ preambleText }}</pre>
        </q-expansion-item>
      </q-card-section>

      <q-separator v-if="sections.length" />

      <q-card-section v-if="sections.length" class="q-pt-none">
        <q-expansion-item
          v-for="section in sections"
          :key="section.key"
          :label="section.title"
          :caption="section.caption"
          dense
          expand-separator
        >
          <div class="q-mb-sm">
            <q-chip
              v-for="request in section.requests"
              :key="request"
              size="sm"
              color="primary"
              text-color="white"
            >
              {{ request }}
            </q-chip>
          </div>
          <div v-if="section.tables.length" class="q-gutter-md q-mb-md">
            <DataTable
              v-for="table in section.tables"
              :key="table.key"
              :rows="table.rows"
              :columns="table.columns"
              :title="table.title"
              :filterable="true"
              :exportable="true"
              :pagination-config="table.pagination"
              table-height="35vh"
            />
          </div>
          <pre class="query-user-raw">{{ section.body }}</pre>
        </q-expansion-item>
      </q-card-section>

      <q-card-section v-else>
        <pre class="query-user-raw">{{ rawText }}</pre>
      </q-card-section>
    </q-card>

    <q-card v-else class="q-mt-md">
      <q-card-section class="text-grey-7">
        Select a job to review or rerun.
      </q-card-section>
    </q-card>

    <q-dialog v-model="confirmDelete">
      <q-card>
        <q-card-section class="text-h6">Delete job?</q-card-section>
        <q-card-section>
          This will delete job {{ selectedJobId }} from the jobs system.
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
          <q-btn flat label="Delete" color="negative" @click="deleteJob" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { tier3info_restful_request } from 'src/plugins/tier3info.js'
import { useTitleStore } from 'stores/titleStore'
import DataTable from 'src/components/DataTable.vue'

const titleStore = useTitleStore()
const pageTitle = 'Broadworks Query User'
const jobBaseEndpoint = '/broadworks/bwcli'
const route = useRoute()

titleStore.setMainTitle(pageTitle)

const isLoading = ref(false)
const isJobsLoading = ref(false)
const statusMessage = ref(null)
const errorMessage = ref(null)
const currentMode = ref('idle')
const jobStatus = ref(null)
const confirmDelete = ref(false)

const jobsList = ref([])
const selectedJobId = ref(null)
const selectedEntityId = ref('')
const targetType = ref('all')
const usePrimary = ref(false)
const autoPoll = ref(true)
const jobSummary = ref(null)

const rawText = ref('')
const sections = ref([])
const preambleText = ref('')

const downloadUrl = ref('')
const downloadFileName = computed(() => {
  const jobId = selectedJobId.value || 'query_user'
  const effectiveTarget = targetType.value === 'all' ? selectedJobTarget.value : targetType.value
  const entityId = selectedEntityId.value || effectiveTarget || 'entity'
  return `query_${effectiveTarget || 'target'}_${entityId}_${jobId}.txt`
})

let pollTimer = null
let jobsRefreshTimer = null
const lastLoadedJobId = ref(null)

const canRerun = computed(() => {
  if (targetType.value === 'all') return false
  return !isLoading.value && selectedEntityId.value.trim().length > 0
})

const targetOptions = [
  { label: 'All Targets', value: 'all' },
  { label: 'User', value: 'user' },
  { label: 'Group', value: 'group' },
  { label: 'Device', value: 'device' },
]

const targetTypeLabel = computed(() => {
  const match = targetOptions.find((opt) => opt.value === targetType.value)
  return match ? match.label : 'Target'
})

const targetTypePlaceholder = computed(() => {
  switch (targetType.value) {
    case 'all':
      return 'Select a target to submit'
    case 'group':
      return 'group_id'
    case 'device':
      return 'device_id'
    default:
      return 'user@example.com'
  }
})

const jobOptions = computed(() => {
  return jobsList.value.map((job) => ({
    label: formatJobOption(job),
    value: job.job_id,
  }))
})

const selectedJobTarget = computed(() => {
  if (!selectedJobId.value) return null
  const job = jobsList.value.find((item) => item.job_id === selectedJobId.value)
  return job?.target || null
})

watch(selectedJobId, async (jobId) => {
  if (!jobId) {
    clearSelection()
    return
  }
  await loadJob(jobId, { startPolling: autoPoll.value })
})

watch(targetType, async (nextTarget, prevTarget) => {
  if (nextTarget === prevTarget) return
  await fetchJobsList()
  if (selectedJobId.value) {
    await loadJob(selectedJobId.value, { startPolling: autoPoll.value })
  }
})

watch(rawText, (nextText) => {
  updateDownloadUrl(nextText)
  const parsed = parseQueryUserSections(nextText)
  sections.value = parsed.sections
  preambleText.value = parsed.preamble
})

watch(
  () => route.query,
  (query) => {
    const jobId = query.job_id || query.jobId
    const target = query.target
    if (jobId && String(jobId) !== String(selectedJobId.value || '')) {
      selectedJobId.value = String(jobId)
    }
    if (target && String(target) !== String(targetType.value || '')) {
      targetType.value = String(target)
    }
  },
  { immediate: true },
)

watch(autoPoll, (enabled) => {
  if (!enabled) {
    clearPoll()
    return
  }
  if (selectedJobId.value && jobStatus.value !== 'completed') {
    schedulePoll(selectedJobId.value)
  }
})

function clearSelection() {
  rawText.value = ''
  sections.value = []
  preambleText.value = ''
  jobStatus.value = null
  jobSummary.value = null
  selectedEntityId.value = ''
  statusMessage.value = null
  errorMessage.value = null
  lastLoadedJobId.value = null
  clearPoll()
}

function updateDownloadUrl(text) {
  if (downloadUrl.value) {
    URL.revokeObjectURL(downloadUrl.value)
    downloadUrl.value = ''
  }
  if (!text) return
  const blob = new Blob([text], { type: 'text/plain' })
  downloadUrl.value = URL.createObjectURL(blob)
}

function formatJobOption(job) {
  const id = job?.job_id || job?.id || ''
  const status = job?.status ? `(${job.status})` : ''
  const title = job?.name || job?.title || ''
  const owner = formatOwner(job?.owner)
  const targetLabel = job?.target ? `[${job.target}]` : ''
  const parts = [id, title].filter(Boolean).join(' — ')
  return [targetLabel, parts, status, owner].filter(Boolean).join(' ')
}

function formatOwner(owner) {
  if (!owner) return ''
  if (Array.isArray(owner)) return owner.join(', ')
  if (typeof owner !== 'string') return String(owner)
  const parts = owner.split(',')
  return parts[parts.length - 1].trim()
}

function coerceDataDict(maybe) {
  if (!maybe) return {}
  if (typeof maybe === 'object') return maybe
  if (typeof maybe === 'string') {
    try {
      return JSON.parse(maybe)
    } catch {
      return { query_user: maybe }
    }
  }
  return {}
}

function normalizeRawQueryUser(payload, responseData) {
  if (payload?.query_user) return String(payload.query_user)
  if (payload && Object.keys(payload).length) return JSON.stringify(payload, null, 2)
  if (responseData?.query_user) return String(responseData.query_user)
  if (responseData && Object.keys(responseData).length) {
    return JSON.stringify(responseData, null, 2)
  }
  return ''
}

function parseQueryUserSections(text) {
  if (!text) return { sections: [], preamble: '' }
  const lines = text.split(/\r?\n/)
  const parsed = []
  const preamble = []
  let current = null
  let buffer = []

  const pushCurrent = () => {
    if (!current) return
    const body = buffer.join('\n').trim()
    const tables = parseTablesFromXml(body)
    parsed.push({
      ...current,
      body,
      tables,
      caption: current.requests.length ? current.requests.join(', ') : '',
      key: `${current.title}-${parsed.length}`,
    })
  }

  lines.forEach((line) => {
    const headerMatch = line.match(/^(.+?)\s*=\s*(\[[^\]]+\].*)$/)
    if (headerMatch) {
      pushCurrent()
      current = {
        title: headerMatch[1].trim(),
        requests: Array.from(headerMatch[2].matchAll(/\[([^\]]+)\]/g)).map((m) => m[1]),
      }
      buffer = []
      return
    }
    if (!current) {
      if (line.trim()) preamble.push(line)
      return
    }
    if (!buffer.length && line.trim().match(/^-{5,}$/)) return
    buffer.push(line)
  })

  pushCurrent()
  return { sections: parsed, preamble: preamble.join('\n').trim() }
}

function parseTablesFromXml(xmlText) {
  if (!xmlText) return []
  if (typeof DOMParser === 'undefined') return []
  const parser = new DOMParser()
  const xml = parser.parseFromString(xmlText, 'text/xml')
  if (xml.getElementsByTagName('parsererror').length) return []

  const elements = Array.from(xml.querySelectorAll('*'))
  const tables = []

  elements.forEach((el) => {
    const childNodes = Array.from(el.children || [])
    const headings = childNodes
      .filter((child) => child.tagName === 'colHeading')
      .map((child) => (child.textContent || '').trim())
    const rows = childNodes.filter((child) => child.tagName === 'row')

    if (!headings.length || !rows.length) return

    const columnKeys = headings.map((heading, index) => {
      const base = heading
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
      return base || `col_${index + 1}`
    })

    const columns = headings.map((heading, index) => ({
      name: columnKeys[index],
      label: heading || `Column ${index + 1}`,
      field: columnKeys[index],
      align: 'left',
    }))

    const tableRows = rows.map((rowEl, rowIndex) => {
      const cols = Array.from(rowEl.children || [])
        .filter((child) => child.tagName === 'col')
        .map((child) => (child.textContent || '').trim())
      const row = { id: rowIndex }
      columnKeys.forEach((key, index) => {
        row[key] = cols[index] || ''
      })
      return row
    })

    const title = formatTableTitle(el.tagName)
    tables.push({
      key: `${title}-${tables.length}`,
      title,
      columns,
      rows: tableRows,
      pagination: { rowsPerPage: 0 },
    })
  })

  return tables
}

function formatTableTitle(tagName) {
  if (!tagName) return 'Table'
  const cleaned = tagName.replace(/Table$/i, '')
  return cleaned
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function resolveJobTarget(jobId) {
  if (targetType.value !== 'all') return targetType.value
  const job = jobsList.value.find((item) => item.job_id === jobId)
  return job?.target || selectedJobTarget.value || null
}

async function fetchJobsList() {
  isJobsLoading.value = true
  try {
    const jobs = []
    const targets = getTargetsToFetch()
    for (const target of targets) {
      const resp = await tier3info_restful_request({
        path: `${jobBaseEndpoint}/${target}/?include=data`,
        method: 'GET',
      })
      const data = resp?.data
      if (Array.isArray(data)) {
        data.forEach((job) => {
          if (!job) return
          jobs.push({ ...job, job_id: job.job_id || job.id, target })
        })
      } else if (data && typeof data === 'object') {
        Object.entries(data).forEach(([key, job]) => {
          if (!job) return
          jobs.push({ ...job, job_id: job.job_id || job.id || key, target })
        })
      }
    }
    jobsList.value = jobs.sort((a, b) => String(b.job_id).localeCompare(String(a.job_id)))
  } catch (err) {
    console.warn('BroadworksQueryUser: fetchJobsList error:', err)
  } finally {
    isJobsLoading.value = false
  }
}

function getTargetsToFetch() {
  if (targetType.value === 'all') return ['user', 'group', 'device']
  return [targetType.value]
}

async function loadJob(jobId, { startPolling } = {}) {
  if (!jobId) return
  errorMessage.value = null
  statusMessage.value = null
  isLoading.value = true
  currentMode.value = 'load'
  if (lastLoadedJobId.value !== jobId) {
    rawText.value = ''
    lastLoadedJobId.value = jobId
  }

  try {
    const jobTarget = resolveJobTarget(jobId)
    if (!jobTarget) {
      throw new Error('Missing target for selected job')
    }
    const resp = await tier3info_restful_request({
      path: `${jobBaseEndpoint}/${jobTarget}/${jobId}`,
      method: 'GET',
    })
    const data = resp?.data || {}
    const payload = coerceDataDict(data._data)
    jobStatus.value = data.status || null
    jobSummary.value = {
      jobId: jobId,
      title: data.name || data.title || '',
      owner: formatOwner(data.owner),
      target: jobTarget,
    }

    const nextEntityId =
      payload.user_id ||
      payload.group_id ||
      payload.device_id ||
      data.user_id ||
      data.group_id ||
      data.device_id ||
      ''
    selectedEntityId.value = nextEntityId

    const nextRaw = normalizeRawQueryUser(payload, data)
    rawText.value = nextRaw

    if (jobStatus.value === 'completed') {
      statusMessage.value = 'Job completed.'
      isLoading.value = false
      clearPoll()
      return
    }

    if (jobStatus.value === 'failed' || jobStatus.value === 'error') {
      errorMessage.value = 'Job failed on the server.'
      isLoading.value = false
      clearPoll()
      return
    }

    statusMessage.value = jobStatus.value
      ? `Job status: ${jobStatus.value}`
      : 'Job is still running.'

    isLoading.value = false
    if (startPolling) {
      schedulePoll(jobId)
    } else {
      clearPoll()
    }
  } catch (err) {
    console.error('BroadworksQueryUser: loadJob error:', err)
    errorMessage.value = 'Invalid response from server. Please try again later.'
    isLoading.value = false
    clearPoll()
  }
}

async function refreshSelectedJob() {
  if (!selectedJobId.value) return
  await loadJob(selectedJobId.value, { startPolling: autoPoll.value })
}

function schedulePoll(jobId) {
  clearPoll()
  pollTimer = setTimeout(async () => {
    if (selectedJobId.value !== jobId) return
    await loadJob(jobId, { startPolling: true })
  }, 5000)
}

async function rerunJob() {
  if (!selectedEntityId.value.trim()) {
    errorMessage.value = `Please provide a ${targetType.value} ID to submit the job.`
    return
  }

  errorMessage.value = null
  statusMessage.value = 'Submitting job...'
  isLoading.value = true
  currentMode.value = 'rerun'

  try {
    const response = await tier3info_restful_request({
      method: 'POST',
      path: `${jobBaseEndpoint}/${targetType.value}/${selectedEntityId.value.trim()}`,
      body: {
        use_primary: usePrimary.value,
      },
    })
    const jobId = response?.data?.job_id
    if (!jobId) {
      throw new Error('Missing job_id in response')
    }
    await fetchJobsList()
    selectedJobId.value = jobId
    jobStatus.value = null
    rawText.value = ''
    statusMessage.value = 'Job submitted. Waiting for completion...'
  } catch (err) {
    console.error('BroadworksQueryUser: rerunJob error:', err)
    errorMessage.value = 'Invalid response from server. Please try again later.'
  } finally {
    isLoading.value = false
  }
}

async function deleteJob() {
  confirmDelete.value = false
  if (!selectedJobId.value) return
  isLoading.value = true
  errorMessage.value = null
  statusMessage.value = 'Deleting job...'

  try {
    const jobTarget = resolveJobTarget(selectedJobId.value)
    if (!jobTarget) {
      throw new Error('Missing target for selected job')
    }
    await tier3info_restful_request({
      path: `${jobBaseEndpoint}/${jobTarget}/${selectedJobId.value}`,
      method: 'DELETE',
    })
    statusMessage.value = 'Job deleted.'
    clearSelection()
    await fetchJobsList()
  } catch (err) {
    console.error('BroadworksQueryUser: deleteJob error:', err)
    errorMessage.value = 'Failed to delete job. Please try again later.'
  } finally {
    isLoading.value = false
  }
}

function clearPoll() {
  if (pollTimer) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
}

function clearJobsRefresh() {
  if (jobsRefreshTimer) {
    clearTimeout(jobsRefreshTimer)
    jobsRefreshTimer = null
  }
}

function scheduleJobsRefresh() {
  clearJobsRefresh()
  jobsRefreshTimer = setTimeout(async () => {
    await fetchJobsList()
    scheduleJobsRefresh()
  }, 60000)
}

onMounted(async () => {
  await fetchJobsList()
  scheduleJobsRefresh()
})

onUnmounted(() => {
  clearPoll()
  clearJobsRefresh()
  if (downloadUrl.value) {
    URL.revokeObjectURL(downloadUrl.value)
  }
})
</script>

<style scoped>
.query-user-raw {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;
  font-size: 12px;
  line-height: 1.4;
}
</style>
