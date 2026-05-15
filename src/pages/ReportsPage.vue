<template>
  <q-page class="flex flex-start">
    <div class="q-pa-md reports-page">
      <q-card class="q-mt-md">
        <q-card-section class="row items-center justify-between q-gutter-sm">
          <div>
            <div class="text-h6">Reports</div>
            <div class="text-caption text-grey-7">Select a report and enter its parameters.</div>
          </div>
          <q-btn
            color="primary"
            icon="refresh"
            round
            flat
            :loading="reportsLoading"
            @click="fetchReports"
          >
            <q-tooltip>Refresh reports</q-tooltip>
          </q-btn>
        </q-card-section>
        <q-separator />
        <DataTable
          :rows="reportRows"
          :columns="reportColumns"
          :filterable="true"
          :exportable="false"
          :onClick="selectReport"
          :pagination-config="{ rowsPerPage: 10 }"
          table-height="32vh"
          no-data-label="No reports found"
        />
      </q-card>

      <q-card v-if="selectedReport" class="q-mt-md">
        <q-card-section>
          <div class="text-h6">{{ selectedReportTitle }}</div>
          <div v-if="selectedReportDescription" class="text-body2 text-grey-8 q-mt-xs">
            {{ selectedReportDescription }}
          </div>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <q-form class="row q-col-gutter-md" @submit.prevent="submitReport">
            <div class="col-12 col-md-6 col-lg-4">
              <q-input
                v-model="reportRunTitle"
                label="Report Title"
                outlined
                dense
                clearable
                :disable="isLoading"
                @blur="trimReportRunTitle"
              />
            </div>
            <div v-if="reportDetailsLoading" class="col-12 row items-center text-grey-7 q-gutter-sm">
              <q-spinner size="20px" color="primary" />
              <span>Loading report parameters...</span>
            </div>
            <template v-else-if="parameterFields.length">
              <div
                v-for="parameter in parameterFields"
                :key="parameter.name"
                class="col-12 col-md-6 col-lg-4"
              >
                <q-select
                  v-if="parameter.inputType === 'select'"
                  v-model="parameterValues[parameter.name]"
                  :label="parameter.label"
                  :options="parameter.options"
                  :multiple="parameter.multiple"
                  :rules="parameter.required ? [requiredRule] : []"
                  :hint="parameter.hint"
                  outlined
                  dense
                  emit-value
                  map-options
                  clearable
                  options-dense
                  @blur="trimParameter(parameter.name)"
                >
                  <q-tooltip v-if="parameter.hint">{{ parameter.hint }}</q-tooltip>
                </q-select>
                <q-toggle
                  v-else-if="parameter.inputType === 'boolean'"
                  v-model="parameterValues[parameter.name]"
                  :label="parameter.label"
                  color="primary"
                >
                  <q-tooltip v-if="parameter.hint">{{ parameter.hint }}</q-tooltip>
                </q-toggle>
                <q-input
                  v-else
                  v-model="parameterValues[parameter.name]"
                  :label="parameter.label"
                  :type="parameter.inputType"
                  :rules="parameter.required ? [requiredRule] : []"
                  :hint="parameter.hint"
                  outlined
                  dense
                  clearable
                  @blur="trimParameter(parameter.name)"
                />
              </div>
            </template>
            <div v-else class="col-12 text-grey-7">This report does not require parameters.</div>

            <div class="col-12 row items-center q-gutter-sm">
              <q-btn
                type="submit"
                color="primary"
                icon="play_arrow"
                label="Run Report"
                :loading="isLoading"
                :disable="isLoading"
              />
              <q-btn
                color="secondary"
                icon="restart_alt"
                label="Reset"
                flat
                :disable="isLoading"
                @click="resetReportForm"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>

      <q-card v-if="statusMessage || errorMessage" class="q-mt-md">
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

      <q-card v-if="resultRows.length" class="q-mt-md">
        <q-card-section>
          <div class="text-h6">Results</div>
          <div class="text-caption text-grey-7">{{ resultRows.length }} rows returned.</div>
        </q-card-section>
        <q-separator />
        <DataTable
          :rows="resultRows"
          :columns="resultColumns"
          :filterable="true"
          :exportable="true"
          exportPrefix="report-data"
          table-height="60vh"
        />
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { tier3info_restful_request } from 'src/plugins/tier3info.js'
import DataTable from 'src/components/DataTable.vue'
import { useTitleStore } from 'stores/titleStore'

const route = useRoute()
const router = useRouter()
const titleStore = useTitleStore()
titleStore.setMainTitle('Reports')

const reportsLoading = ref(false)
const reportDetailsLoading = ref(false)
const reports = ref([])
const selectedReport = ref(null)
const reportRunTitle = ref('')
const parameterValues = ref({})
const resultRows = ref([])
const resultColumns = ref([])
const isLoading = ref(false)
const statusMessage = ref(null)
const errorMessage = ref(null)
const jobId = ref(null)
const reportJob = ref(null)
const reportJobOutputFileName = ref('')
const reportJobLoading = ref(false)
const waitCounter = ref(0)
let pollTimer = null
let resultsTimer = null
const resultsRetryCount = ref(0)
const resultsBackoffMs = ref(1000)

const reportColumns = [
  { name: 'id', label: 'Report ID', align: 'left', field: 'id', sortable: true },
  { name: 'title', label: 'Title', align: 'left', field: 'title', sortable: true },
  { name: 'description', label: 'Description', align: 'left', field: 'description', sortable: true },
]

const reportRows = computed(() =>
  reports.value.map((report) => ({
    ...report,
    title: report.title || report.name || report.label || report.id,
    description: report.description || report.caption || '',
  })),
)

const selectedReportTitle = computed(
  () =>
    selectedReport.value?.title ||
    selectedReport.value?.name ||
    selectedReport.value?.label ||
    selectedReport.value?.id ||
    'Report',
)
const selectedReportDescription = computed(
  () => selectedReport.value?.description || selectedReport.value?.caption || '',
)

const parameterFields = computed(() =>
  normalizeParameters(selectedReport.value?.parameters || selectedReport.value?.Parameters),
)

function requiredRule(value) {
  if (Array.isArray(value)) return value.length > 0 || 'Required'
  return (value !== null && value !== undefined && String(value).trim() !== '') || 'Required'
}

function normalizeReports(data) {
  const reportData = unwrapReportsResponse(data)
  if (Array.isArray(reportData)) {
    return reportData.map((item) => normalizeReportItem(item))
  }
  if (reportData && typeof reportData === 'object') {
    return Object.entries(reportData).map(([id, item]) => normalizeReportItem(item, id))
  }
  return []
}

function unwrapReportsResponse(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return data
  }
  return data.reports || data.items || data.data || data
}

function normalizeReportItem(item, fallbackId = '') {
  if (typeof item === 'string') {
    return { id: item, title: item }
  }
  const report = item && typeof item === 'object' ? { ...item } : {}
  const id = String(report.id || report.report_id || report.name || fallbackId).trim()
  return { ...report, id }
}

function normalizeReportDetail(data, fallbackId) {
  const detail = unwrapReportDetailResponse(data)
  if (detail !== data) {
    return normalizeReportDetail(detail, fallbackId)
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return normalizeReportItem(data, fallbackId)
  }

  if (data.parameters || data.Parameters || data.task_name || data.output || data.title) {
    return normalizeReportItem(data, fallbackId)
  }

  if (fallbackId && data[fallbackId]) {
    return normalizeReportItem(data[fallbackId], fallbackId)
  }

  const entries = Object.entries(data)
  if (entries.length === 1) {
    const [id, report] = entries[0]
    return normalizeReportItem(report, id)
  }

  return normalizeReportItem(data, fallbackId)
}

function unwrapReportDetailResponse(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return data
  }
  return data.report || data.definition || data.data || data
}

function normalizeParameters(parameters) {
  if (!parameters) return []
  const entries = Array.isArray(parameters)
    ? parameters.map((parameter) => [parameter?.name || parameter?.id || parameter?.key, parameter])
    : Object.entries(parameters)

  return entries
    .map(([name, definition]) => normalizeParameter(name, definition))
    .filter((parameter) => parameter.name)
}

function normalizeParameter(name, definition) {
  const param = definition && typeof definition === 'object' ? { ...definition } : { default: definition }
  const cleanName = String(param.name || param.id || param.key || name || '').trim()
  const type = String(param.type || param.inputType || param.input_type || 'text').toLowerCase()
  const options = normalizeOptions(param.options || param.choices || param.values)
  const inputType = options.length ? 'select' : normalizeInputType(type)
  return {
    ...param,
    name: cleanName,
    label: param.label || cleanName,
    inputType,
    options,
    multiple: Boolean(param.multiple),
    required: Boolean(param.required),
    hint: normalizeHint(param.hint || param.description || param.example),
    defaultValue: param.default ?? param.value ?? defaultValueForType(inputType, param.multiple),
  }
}

function normalizeHint(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

function normalizeInputType(type) {
  if (['bool', 'boolean', 'checkbox', 'toggle'].includes(type)) return 'boolean'
  if (['int', 'integer', 'float', 'number'].includes(type)) return 'number'
  if (['date', 'datetime-local', 'time', 'email', 'password', 'textarea'].includes(type)) return type
  return 'text'
}

function defaultValueForType(type, multiple) {
  if (multiple) return []
  if (type === 'boolean') return false
  return ''
}

function normalizeOptions(options) {
  if (!options) return []
  if (Array.isArray(options)) {
    return options.map((option) => {
      if (option && typeof option === 'object') {
        return {
          label: option.label || option.name || option.value,
          value: option.value ?? option.id ?? option.name ?? option.label,
        }
      }
      return { label: String(option), value: option }
    })
  }
  if (typeof options === 'object') {
    return Object.entries(options).map(([value, label]) => ({ label: String(label), value }))
  }
  return []
}

async function fetchReports() {
  reportsLoading.value = true
  errorMessage.value = null
  try {
    const response = await tier3info_restful_request({
      method: 'GET',
      path: '/reports?include=data',
    })
    reports.value = normalizeReports(response?.data)
  } catch (error) {
    console.error('ReportsPage: fetchReports error:', error)
    errorMessage.value = 'Error retrieving reports. Please try again later.'
    reports.value = []
  } finally {
    reportsLoading.value = false
  }
}

function normalizeJob(data, fallbackJobId = '') {
  if (!data || typeof data !== 'object') {
    return { job_id: fallbackJobId }
  }
  const jobData = data.job || data.data || data
  if (fallbackJobId && jobData[fallbackJobId] && typeof jobData[fallbackJobId] === 'object') {
    return normalizeJob(jobData[fallbackJobId], fallbackJobId)
  }
  return {
    ...jobData,
    job_id: jobData.job_id || jobData.id || fallbackJobId,
  }
}

function getJobType(job) {
  return String(job?.type || job?.job_type || job?.jobType || job?.task_name || '').trim()
}

function isCompletedStatus(status) {
  return ['completed', 'complete', 'success', 'succeeded'].includes(String(status || '').toLowerCase())
}

function isFailedStatus(status) {
  return ['failed', 'failure', 'error'].includes(String(status || '').toLowerCase())
}

function findReportForJob(job) {
  const reportId = String(job?.report_id || job?.reportId || job?.report || '').trim()
  if (reportId) {
    const exact = reports.value.find((report) => report.id === reportId)
    if (exact) return exact
  }

  const jobType = getJobType(job)
  if (jobType) {
    const taskMatch = reports.value.find((report) => report.task_name === jobType)
    if (taskMatch) return taskMatch

    const derivedId = jobType.replace(/^reports\./, '').replaceAll('.', '_')
    const derivedMatch = reports.value.find((report) => report.id === derivedId)
    if (derivedMatch) return derivedMatch
  }

  return null
}

function pickReportOutputFile(filesIndex) {
  const configuredOutput = getReportOutputFileName()
  if (configuredOutput !== 'data.csv') return configuredOutput

  const files = normalizeJobFiles(filesIndex)
  const csvFile = files.find((file) => file.file_name.toLowerCase().endsWith('.csv'))
  return csvFile?.file_name || configuredOutput
}

function normalizeJobFiles(data) {
  if (Array.isArray(data)) {
    return data.map((file) => normalizeJobFile(file)).filter((file) => file.file_name)
  }
  if (data && typeof data === 'object') {
    return Object.entries(data)
      .map(([fileName, file]) => normalizeJobFile(file, fileName))
      .filter((file) => file.file_name)
  }
  return []
}

function normalizeJobFile(file, fallbackName = '') {
  if (typeof file === 'string') {
    return { file_name: file }
  }
  const normalized = file && typeof file === 'object' ? file : {}
  const fileName = String(
    normalized.file_name || normalized.filename || normalized.name || normalized.path || fallbackName,
  ).trim()
  return { ...normalized, file_name: fileName }
}

async function loadReportJob(jobIdFromRoute) {
  const targetJobId = String(jobIdFromRoute || '').trim()
  if (!targetJobId) return

  clearPoll()
  clearResultsTimer()
  errorMessage.value = null
  resultRows.value = []
  resultColumns.value = []
  jobId.value = targetJobId
  reportJob.value = null
  reportJobOutputFileName.value = ''
  reportJobLoading.value = true
  isLoading.value = true
  statusMessage.value = `Loading report data for job ${targetJobId}...`

  try {
    const jobResponse = await tier3info_restful_request({
      method: 'GET',
      path: `/jobs/${encodeURIComponent(targetJobId)}`,
    })
    const job = normalizeJob(jobResponse?.data, targetJobId)
    reportJob.value = job

    const matchingReport = findReportForJob(job)
    if (matchingReport) {
      await loadReportDefinition(matchingReport, { updateRoute: false, preserveJobContext: true })
      setGeneratedReportRunTitle(job.name || job.title || '')
    } else {
      selectedReport.value = {
        id: job.report_id || getJobType(job) || targetJobId,
        title: job.name || job.title || `Report job ${targetJobId}`,
      }
      setGeneratedReportRunTitle(job.name || job.title || '')
    }
    hydrateJobParameters(job)

    const status = job.status || ''
    if (isFailedStatus(status)) {
      errorMessage.value = `Report job ${targetJobId} failed.`
      statusMessage.value = null
      isLoading.value = false
      return
    }

    if (!isCompletedStatus(status)) {
      statusMessage.value = `Report job ${targetJobId} status: ${status || 'running'}`
      isLoading.value = true
      clearPoll()
      pollTimer = setTimeout(() => loadReportJob(targetJobId), 5000)
      return
    }

    const filesResponse = await tier3info_restful_request({
      method: 'GET',
      path: `/jobs/files/${encodeURIComponent(targetJobId)}?include=data`,
    })
    reportJobOutputFileName.value = pickReportOutputFile(filesResponse?.data)
    await fetchResults()
  } catch (error) {
    console.error('ReportsPage: loadReportJob error:', error)
    errorMessage.value = `Unable to load report data for job ${targetJobId}.`
    statusMessage.value = null
    isLoading.value = false
  } finally {
    reportJobLoading.value = false
  }
}

async function loadReportById(reportId) {
  const targetReportId = String(reportId || '').trim()
  if (!targetReportId) return

  const existingReport = reports.value.find((report) => report.id === targetReportId)
  await loadReportDefinition(existingReport || { id: targetReportId, title: targetReportId }, {
    updateRoute: false,
  })
}

async function loadReportDefinition(row, options = {}) {
  const updateRoute = options.updateRoute === true
  const preserveJobContext = options.preserveJobContext === true
  if (!row?.id) return

  clearPoll()
  clearResultsTimer()
  errorMessage.value = null
  statusMessage.value = null
  resultRows.value = []
  resultColumns.value = []
  if (!preserveJobContext) {
    reportJob.value = null
    reportJobOutputFileName.value = ''
  }
  selectedReport.value = row
  setGeneratedReportRunTitle()
  resetParameterValues()
  reportDetailsLoading.value = true
  if (!preserveJobContext) {
    jobId.value = null
  }

  if (updateRoute) {
    updateRouteQuery({ report_id: row.id })
  }

  try {
    const response = await tier3info_restful_request({
      method: 'GET',
      path: `/reports/${encodeURIComponent(row.id)}`,
    })
    if (response?.data) {
      selectedReport.value = normalizeReportDetail(response.data, row.id)
      setGeneratedReportRunTitle()
      resetParameterValues()
    }
  } catch (error) {
    console.error('ReportsPage: selectReport detail error:', error)
    errorMessage.value = `Unable to load report details for ${row.id}.`
  } finally {
    reportDetailsLoading.value = false
  }
}

async function selectReport(row) {
  await loadReportDefinition(row, { updateRoute: true })
}

function resetParameterValues() {
  const values = {}
  for (const parameter of parameterFields.value) {
    values[parameter.name] = cloneValue(parameter.defaultValue)
  }
  parameterValues.value = values
}

function resetReportForm() {
  setGeneratedReportRunTitle()
  resetParameterValues()
}

function setGeneratedReportRunTitle(titleOverride = '') {
  reportRunTitle.value = titleOverride || generateReportRunTitle()
}

function generateReportRunTitle() {
  return `${selectedReportTitle.value} ${formatGeneratedTitleTimestamp(new Date())}`.trim()
}

function formatGeneratedTitleTimestamp(date) {
  return date.toLocaleString('sv-SE').replace('T', ' ')
}

function trimReportRunTitle() {
  reportRunTitle.value = String(reportRunTitle.value || '').trim()
}

function cloneValue(value) {
  if (Array.isArray(value)) return [...value]
  if (value && typeof value === 'object') return { ...value }
  return value
}

function trimParameter(name) {
  const value = parameterValues.value[name]
  if (typeof value === 'string') {
    parameterValues.value[name] = value.trim()
  }
}

function extractJobParameters(job) {
  const candidates = [
    job?.parameters,
    job?.params,
    job?.report_parameters,
    job?.reportParameters,
    job?.body,
    job?.payload,
    job?.request?.parameters,
    job?.request?.params,
    job?.request?.body,
  ]

  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      return candidate.report_parameters || candidate.parameters || candidate
    }
  }
  return {}
}

function hydrateJobParameters(job) {
  const jobParameters = extractJobParameters(job)
  if (!jobParameters || typeof jobParameters !== 'object') return

  const nextValues = { ...parameterValues.value }
  for (const parameter of parameterFields.value) {
    if (Object.prototype.hasOwnProperty.call(jobParameters, parameter.name)) {
      nextValues[parameter.name] = jobParameters[parameter.name]
    }
  }
  parameterValues.value = nextValues
}

function updateRouteQuery(query) {
  router
    .replace({
      path: route.path,
      query,
    })
    .catch((error) => {
      if (error?.name !== 'NavigationDuplicated') {
        console.warn('ReportsPage: route update failed:', error)
      }
    })
}

function buildRequestBody() {
  const body = {}
  for (const parameter of parameterFields.value) {
    const value = parameterValues.value[parameter.name]
    body[parameter.name] = typeof value === 'string' ? value.trim() : value
  }
  trimReportRunTitle()
  body.title = reportRunTitle.value || generateReportRunTitle()
  return body
}

async function submitReport() {
  if (!selectedReport.value?.id) return
  clearPoll()
  clearResultsTimer()
  resultRows.value = []
  resultColumns.value = []
  reportJob.value = null
  reportJobOutputFileName.value = ''
  errorMessage.value = null
  statusMessage.value = `Running ${selectedReportTitle.value}...`
  isLoading.value = true
  waitCounter.value = 0
  resultsRetryCount.value = 0
  resultsBackoffMs.value = 1000

  try {
    const response = await tier3info_restful_request({
      method: 'POST',
      path: `/reports/${encodeURIComponent(selectedReport.value.id)}`,
      body: buildRequestBody(),
    })
    const returnedJobId = response?.data?.job_id || response?.data?.jobId || response?.data?.id
    if (!returnedJobId) {
      throw new Error('Missing job_id in response')
    }
    jobId.value = returnedJobId
    updateRouteQuery({ job_id: returnedJobId })
    pollTimer = setTimeout(checkJobStatus, 500)
  } catch (error) {
    console.error('ReportsPage: submitReport error:', error)
    errorMessage.value = 'Invalid response from server. Please try again later.'
    statusMessage.value = null
    isLoading.value = false
  }
}

async function checkJobStatus() {
  try {
    const response = await tier3info_restful_request({
      method: 'GET',
      path: `/jobs/${encodeURIComponent(jobId.value)}`,
    })
    const status = String(response?.data?.status || '').toLowerCase()

    if (isCompletedStatus(status)) {
      clearPoll()
      await fetchResults()
      return
    }
    if (isFailedStatus(status)) {
      errorMessage.value = 'Report job failed on the server.'
      statusMessage.value = null
      isLoading.value = false
      clearPoll()
      return
    }

    waitCounter.value += 1
    if (waitCounter.value > 60) {
      statusMessage.value = 'Report job is taking too long. Please try again later.'
      isLoading.value = false
      clearPoll()
      return
    }

    statusMessage.value = `Waiting on report data... (${waitCounter.value * 5} seconds)`
    pollTimer = setTimeout(checkJobStatus, 5000)
  } catch (error) {
    console.error('ReportsPage: checkJobStatus error:', error)
    errorMessage.value = 'Invalid job status response. Please try again later.'
    statusMessage.value = null
    isLoading.value = false
    clearPoll()
  }
}

async function fetchResults() {
  try {
    const outputFileName = getReportOutputFileName()
    const response = await tier3info_restful_request({
      method: 'GET',
      path: `/jobs/files/${encodeURIComponent(jobId.value)}/${encodeURIComponent(outputFileName)}`,
    })
    const csvText = normalizeCsvResponse(response?.data)
    if (!csvText.trim()) {
      scheduleResultsRetry('Results file is empty. Retrying')
      return
    }

    const parsed = parseCsv(csvText)
    if (!parsed.headers.length) {
      scheduleResultsRetry('No CSV headers found. Retrying')
      return
    }

    resultColumns.value = parsed.headers.map((header) => ({
      name: header,
      label: header,
      align: 'left',
      field: header,
      sortable: true,
    }))
    resultRows.value = parsed.rows
    statusMessage.value = null
    isLoading.value = false
    clearResultsTimer()
  } catch (error) {
    const code = error?.response?.status || error?.status
    if (code === 404) {
      scheduleResultsRetry('Results not ready. Retrying')
      return
    }
    console.error('ReportsPage: fetchResults error:', error)
    errorMessage.value = 'Error retrieving or parsing report results. Please try again later.'
    statusMessage.value = null
    isLoading.value = false
    clearResultsTimer()
  }
}

function getReportOutputFileName() {
  const output =
    reportJobOutputFileName.value ||
    selectedReport.value?.output ||
    selectedReport.value?.file_name ||
    selectedReport.value?.filename ||
    reportJob.value?.output ||
    reportJob.value?.file_name ||
    reportJob.value?.filename
  const normalizedOutput = typeof output === 'string' ? output.trim() : ''
  return normalizedOutput || 'data.csv'
}

function normalizeCsvResponse(data) {
  if (typeof data === 'string') return data
  if (data instanceof Blob) return ''
  if (data && typeof data === 'object' && typeof data.data === 'string') return data.data
  return data === null || data === undefined ? '' : String(data)
}

function parseCsv(text) {
  const records = []
  let field = ''
  let record = []
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        field += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      record.push(field)
      field = ''
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i += 1
      record.push(field)
      records.push(record)
      field = ''
      record = []
    } else {
      field += char
    }
  }

  if (field || record.length) {
    record.push(field)
    records.push(record)
  }

  const nonEmptyRecords = records.filter((row) => row.some((cell) => cell !== ''))
  const headers = (nonEmptyRecords.shift() || []).map((header, index) =>
    String(header || `Column ${index + 1}`).trim(),
  )
  const rows = nonEmptyRecords.map((row, rowIndex) => {
    const item = { id: rowIndex + 1 }
    headers.forEach((header, index) => {
      item[header] = row[index] ?? ''
    })
    return item
  })

  return { headers, rows }
}

function scheduleResultsRetry(reason) {
  resultsRetryCount.value += 1
  if (resultsRetryCount.value > 10) {
    errorMessage.value = 'Results file is not yet available. Please run the report again in a moment.'
    statusMessage.value = null
    isLoading.value = false
    clearResultsTimer()
    return
  }

  const delay = Math.min(resultsBackoffMs.value, 10000)
  statusMessage.value = `${reason} in ${Math.round(delay / 1000)}s...`
  clearResultsTimer()
  resultsTimer = setTimeout(() => {
    resultsBackoffMs.value = Math.min(resultsBackoffMs.value * 2, 10000)
    fetchResults()
  }, delay)
}

function clearPoll() {
  if (pollTimer) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
}

function clearResultsTimer() {
  if (resultsTimer) {
    clearTimeout(resultsTimer)
    resultsTimer = null
  }
}

async function hydrateFromRoute(query) {
  const routeJobId = String(query?.job_id || '').trim()
  const routeReportId = String(query?.report_id || '').trim()

  if (routeJobId) {
    if (routeJobId === String(jobId.value || '') && (isLoading.value || resultRows.value.length)) {
      return
    }
    await loadReportJob(routeJobId)
    return
  }

  if (routeReportId) {
    if (routeReportId === selectedReport.value?.id && !jobId.value) {
      return
    }
    await loadReportById(routeReportId)
  }
}

onMounted(async () => {
  await fetchReports()
  await hydrateFromRoute(route.query)
})

watch(
  () => ({ ...route.query }),
  async (newQuery) => {
    await hydrateFromRoute(newQuery)
  },
)

onUnmounted(() => {
  clearPoll()
  clearResultsTimer()
})
</script>

<style lang="scss" scoped>
.reports-page {
  width: 100%;
}
</style>
