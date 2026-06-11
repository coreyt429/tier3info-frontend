<template>
  <q-page class="q-pa-md">
    <q-card>
      <q-card-section class="row items-center justify-between q-gutter-sm">
        <div>
          <div class="text-h6">Jobs</div>
          <div class="text-caption text-grey-7">Select a job to inspect available files.</div>
        </div>
        <q-btn color="primary" icon="refresh" round flat :loading="jobsLoading" @click="fetchJobs">
          <q-tooltip>Refresh jobs</q-tooltip>
        </q-btn>
      </q-card-section>
      <q-separator />
      <DataTable
        :rows="jobRows"
        :columns="jobColumns"
        :filterable="true"
        :exportable="true"
        :onClick="selectJob"
        storage-key="jobs-list"
        exportPrefix="jobs-export"
        no-data-label="No jobs found"
        table-height="45vh"
      />
    </q-card>

    <q-card v-if="selectedJob" class="q-mt-md">
      <q-card-section class="row items-center justify-between q-gutter-sm">
        <div>
          <div class="text-h6">{{ selectedJob.job_id }}</div>
          <div class="text-caption text-grey-7">
            {{ selectedJob.name || selectedJob.title || selectedJob.type || 'Selected job' }}
          </div>
        </div>
        <div class="row q-gutter-sm">
          <q-btn
            color="primary"
            icon="refresh"
            label="Refresh Files"
            flat
            :loading="filesLoading"
            @click="fetchJobFiles(selectedJob.job_id)"
          />
          <q-btn
            color="negative"
            icon="delete"
            label="Delete Job"
            flat
            :loading="deleteLoading"
            @click="deleteDialog = true"
          />
        </div>
      </q-card-section>
      <q-separator />
      <q-card-section v-if="filesLoading" class="row items-center text-grey-7 q-gutter-sm">
        <q-spinner size="20px" color="primary" />
        <span>Loading job files...</span>
      </q-card-section>
      <DataTable
        v-else
        :rows="fileRows"
        :columns="fileColumns"
        :filterable="true"
        :exportable="false"
        storage-key="job-files"
        no-data-label="No files found for this job"
        table-height="30vh"
      />
    </q-card>

    <q-card v-if="errorMessage" class="q-mt-md">
      <q-card-section>
        <q-banner dense rounded class="bg-negative text-white">
          {{ errorMessage }}
        </q-banner>
      </q-card-section>
    </q-card>

    <q-dialog v-model="deleteDialog" persistent>
      <q-card>
        <q-card-section class="row items-center">
          <q-avatar icon="warning" color="negative" text-color="white" />
          <span class="q-ml-sm">Delete job {{ selectedJob?.job_id }}?</span>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn label="Cancel" color="secondary" icon="cancel" v-close-popup />
          <q-btn
            label="Delete"
            icon="delete"
            color="negative"
            v-close-popup
            :loading="deleteLoading"
            @click="deleteSelectedJob"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { emit_notification, tier3info_restful_request } from 'src/plugins/tier3info.js'
import DataTable from 'src/components/DataTable.vue'
import { useTitleStore } from 'stores/titleStore'

const titleStore = useTitleStore()
titleStore.setMainTitle('Jobs')

const jobs = ref([])
const selectedJob = ref(null)
const files = ref([])
const jobsLoading = ref(false)
const filesLoading = ref(false)
const deleteLoading = ref(false)
const deleteDialog = ref(false)
const errorMessage = ref(null)
const downloadingFiles = ref(new Set())

const jobColumns = [
  { name: 'job_id', label: 'Job ID', field: 'job_id', align: 'left', sortable: true },
  { name: 'type', label: 'Type', field: 'type', align: 'left', sortable: true },
  { name: 'status', label: 'Status', field: 'status', align: 'left', sortable: true },
  { name: 'name', label: 'Title', field: 'name', align: 'left', sortable: true },
  {
    name: 'reportAction',
    label: 'Report',
    field: 'reportAction',
    align: 'center',
    sortable: false,
  },
]

const fileColumns = [
  { name: 'file_name', label: 'File', field: 'file_name', align: 'left', sortable: true },
  { name: 'bytes', label: 'Bytes', field: 'bytes', align: 'right', sortable: true },
  { name: 'last_modified', label: 'Last Modified', field: 'last_modified', align: 'left', sortable: true },
  { name: 'content_type', label: 'Content Type', field: 'content_type', align: 'left', sortable: true },
  {
    name: 'downloadAction',
    label: 'Download',
    field: 'downloadAction',
    align: 'center',
    sortable: false,
  },
]

const jobRows = computed(() =>
  jobs.value.map((job) => ({
    ...job,
    job_id: job.job_id || job.id,
    name: job.name || job.title || '',
    type: job.type || job.job_type || job.jobType || '',
    status: job.status || '',
    reportAction: buildReportAction(job),
  })),
)

const fileRows = computed(() =>
  files.value.map((file) => ({
    ...file,
    downloadAction: buildDownloadAction(file),
  })),
)

function normalizeJobs(data) {
  if (Array.isArray(data)) {
    return data.map((job) => ({ ...job, job_id: job?.job_id || job?.id })).filter((job) => job.job_id)
  }
  if (data && typeof data === 'object') {
    return Object.entries(data)
      .map(([key, job]) => ({ ...(job || {}), job_id: job?.job_id || job?.id || key }))
      .filter((job) => job.job_id)
  }
  return []
}

function normalizeFiles(data) {
  if (Array.isArray(data)) {
    return data.map((file) => normalizeFile(file)).filter((file) => file.file_name)
  }
  if (data && typeof data === 'object') {
    return Object.entries(data)
      .map(([fileName, file]) => normalizeFile(file, fileName))
      .filter((file) => file.file_name)
  }
  return []
}

function normalizeFile(file, fallbackName = '') {
  if (typeof file === 'string') {
    return { id: file, file_name: file }
  }
  const normalized = file && typeof file === 'object' ? { ...file } : {}
  const fileName = String(
    normalized.file_name || normalized.filename || normalized.name || normalized.path || fallbackName,
  ).trim()
  return {
    ...normalized,
    id: fileName,
    file_name: fileName,
    bytes: normalized.bytes ?? normalized.size ?? '',
    content_type: normalized.content_type || normalized.contentType || '',
    last_modified: normalized.last_modified || normalized.lastModified || normalized.updated || '',
  }
}

function getJobType(job) {
  return String(job?.type || job?.job_type || job?.jobType || job?.task_name || '').trim()
}

function isReportJob(job) {
  return getJobType(job).startsWith('reports.')
}

function buildReportAction(job) {
  const jobId = job?.job_id || job?.id
  if (!jobId || !isReportJob(job)) return null
  return {
    tooltip: `View report data for ${jobId}`,
    action: () => {
      window.location.href = `/#/reports?job_id=${encodeURIComponent(jobId)}`
    },
  }
}

async function fetchJobs() {
  jobsLoading.value = true
  errorMessage.value = null
  try {
    const response = await tier3info_restful_request({
      method: 'GET',
      path: '/jobs?include=data',
    })
    jobs.value = normalizeJobs(response?.data)
  } catch (error) {
    console.error('JobsPage: fetchJobs error:', error)
    errorMessage.value = 'Error loading jobs.'
  } finally {
    jobsLoading.value = false
  }
}

async function selectJob(row) {
  selectedJob.value = row
  files.value = []
  errorMessage.value = null
  await fetchJobFiles(row.job_id)
}

async function fetchJobFiles(jobId) {
  if (!jobId) return
  filesLoading.value = true
  errorMessage.value = null
  try {
    const response = await tier3info_restful_request({
      method: 'GET',
      path: `/jobs/files/${encodeURIComponent(jobId)}?include=data`,
    })
    files.value = normalizeFiles(response?.data)
  } catch (error) {
    console.error('JobsPage: fetchJobFiles error:', error)
    errorMessage.value = `Error loading files for job ${jobId}.`
    files.value = []
  } finally {
    filesLoading.value = false
  }
}

function buildDownloadAction(file) {
  if (!selectedJob.value?.job_id || !file.file_name) return null
  const fileName = file.file_name
  return {
    tooltip: `Download ${fileName}`,
    get loading() {
      return downloadingFiles.value.has(fileName)
    },
    action: () => downloadJobFile(fileName),
  }
}

async function downloadJobFile(fileName) {
  if (!selectedJob.value?.job_id || !fileName || downloadingFiles.value.has(fileName)) {
    return
  }
  downloadingFiles.value.add(fileName)
  files.value = [...files.value]

  try {
    const response = await tier3info_restful_request({
      method: 'GET',
      path: `/jobs/files/${encodeURIComponent(selectedJob.value.job_id)}/${encodeURIComponent(fileName)}`,
    })
    const contentType = response?.headers?.['content-type'] || 'application/octet-stream'
    downloadContentAsFile(normalizeDownloadContent(response?.data), fileName, contentType)
  } catch (error) {
    console.error('JobsPage: downloadJobFile error:', error)
    emit_notification('negative', `Failed to download ${fileName}.`)
  } finally {
    downloadingFiles.value.delete(fileName)
    files.value = [...files.value]
  }
}

function normalizeDownloadContent(data) {
  if (data === null || data === undefined) return ''
  if (typeof data === 'string') return data
  if (typeof data === 'object' && typeof data.content === 'string') return data.content
  if (typeof data === 'object' && typeof data.base64 === 'string') return atob(data.base64)
  return JSON.stringify(data, null, 2)
}

function downloadContentAsFile(content, fileName, contentType) {
  const blob = new Blob([content], { type: contentType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

async function deleteSelectedJob() {
  if (!selectedJob.value?.job_id) return
  deleteLoading.value = true
  errorMessage.value = null
  try {
    await tier3info_restful_request({
      method: 'DELETE',
      path: `/jobs/${encodeURIComponent(selectedJob.value.job_id)}`,
    })
    emit_notification('positive', `Deleted job ${selectedJob.value.job_id}.`)
    selectedJob.value = null
    files.value = []
    await fetchJobs()
  } catch (error) {
    console.error('JobsPage: deleteSelectedJob error:', error)
    errorMessage.value = 'Error deleting job.'
  } finally {
    deleteLoading.value = false
  }
}

onMounted(fetchJobs)
</script>
