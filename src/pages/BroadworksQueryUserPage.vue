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
        <div class="col-12 col-md-6">
          <q-input
            v-model="selectedUserId"
            label="User ID"
            outlined
            dense
            :disable="isLoading"
            placeholder="user@example.com"
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
            label="Rerun"
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
          <q-toggle v-model="usePrimary" label="Use Primary AS" dense />
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
import { tier3info_restful_request } from 'src/plugins/tier3info.js'
import { useTitleStore } from 'stores/titleStore'

const titleStore = useTitleStore()
const pageTitle = 'Broadworks Query User'
const jobEndpoint = '/broadworks/bwcli/query_user'

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
const selectedUserId = ref('')
const usePrimary = ref(false)
const jobSummary = ref(null)

const rawText = ref('')
const sections = ref([])
const preambleText = ref('')

const downloadUrl = ref('')
const downloadFileName = computed(() => {
  const jobId = selectedJobId.value || 'query_user'
  const userId = selectedUserId.value || 'user'
  return `query_user_${userId}_${jobId}.txt`
})

let pollTimer = null
let jobsRefreshTimer = null
const lastLoadedJobId = ref(null)

const canRerun = computed(() => {
  return !isLoading.value && selectedUserId.value.trim().length > 0
})

const jobOptions = computed(() => {
  return jobsList.value.map((job) => ({
    label: formatJobOption(job),
    value: job.job_id,
  }))
})

watch(selectedJobId, async (jobId) => {
  if (!jobId) {
    clearSelection()
    return
  }
  await loadJob(jobId, { startPolling: true })
})

watch(rawText, (nextText) => {
  updateDownloadUrl(nextText)
  const parsed = parseQueryUserSections(nextText)
  sections.value = parsed.sections
  preambleText.value = parsed.preamble
})

function clearSelection() {
  rawText.value = ''
  sections.value = []
  preambleText.value = ''
  jobStatus.value = null
  jobSummary.value = null
  selectedUserId.value = ''
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
  const parts = [id, title].filter(Boolean).join(' — ')
  return [parts, status, owner].filter(Boolean).join(' ')
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
    parsed.push({
      ...current,
      body,
      caption: current.requests.length ? `${current.requests.length} request(s)` : '',
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

async function fetchJobsList() {
  isJobsLoading.value = true
  try {
    const resp = await tier3info_restful_request({
      path: `${jobEndpoint}?include=data`,
      method: 'GET',
    })
    const data = resp?.data
    const jobs = []
    if (Array.isArray(data)) {
      data.forEach((job) => {
        if (!job) return
        jobs.push({ ...job, job_id: job.job_id || job.id })
      })
    } else if (data && typeof data === 'object') {
      Object.entries(data).forEach(([key, job]) => {
        if (!job) return
        jobs.push({ ...job, job_id: job.job_id || job.id || key })
      })
    }
    jobsList.value = jobs.sort((a, b) => String(b.job_id).localeCompare(String(a.job_id)))
  } catch (err) {
    console.warn('BroadworksQueryUser: fetchJobsList error:', err)
  } finally {
    isJobsLoading.value = false
  }
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
    const resp = await tier3info_restful_request({
      path: `${jobEndpoint}/${jobId}`,
      method: 'GET',
    })
    const data = resp?.data || {}
    const payload = coerceDataDict(data._data)
    jobStatus.value = data.status || null
    jobSummary.value = {
      jobId: jobId,
      title: data.name || data.title || '',
      owner: formatOwner(data.owner),
    }

    const nextUserId = payload.user_id || data.user_id || ''
    selectedUserId.value = nextUserId

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
    }
  } catch (err) {
    console.error('BroadworksQueryUser: loadJob error:', err)
    errorMessage.value = 'Invalid response from server. Please try again later.'
    isLoading.value = false
    clearPoll()
  }
}

function schedulePoll(jobId) {
  clearPoll()
  pollTimer = setTimeout(async () => {
    if (selectedJobId.value !== jobId) return
    await loadJob(jobId, { startPolling: true })
  }, 5000)
}

async function rerunJob() {
  if (!selectedUserId.value.trim()) {
    errorMessage.value = 'Please provide a user ID to rerun the job.'
    return
  }

  errorMessage.value = null
  statusMessage.value = 'Submitting job...'
  isLoading.value = true
  currentMode.value = 'rerun'

  try {
    const response = await tier3info_restful_request({
      method: 'POST',
      path: `${jobEndpoint}/`,
      body: {
        user_id: selectedUserId.value.trim(),
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
    await tier3info_restful_request({
      path: `/jobs/${selectedJobId.value}`,
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
