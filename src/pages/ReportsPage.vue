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
            <template v-if="parameterFields.length">
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
                @click="resetParameterValues"
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
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { tier3info_restful_request } from 'src/plugins/tier3info.js'
import DataTable from 'src/components/DataTable.vue'
import { useTitleStore } from 'stores/titleStore'

const titleStore = useTitleStore()
titleStore.setMainTitle('Reports')

const reportsLoading = ref(false)
const reports = ref([])
const selectedReport = ref(null)
const parameterValues = ref({})
const resultRows = ref([])
const resultColumns = ref([])
const isLoading = ref(false)
const statusMessage = ref(null)
const errorMessage = ref(null)
const jobId = ref(null)
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

const parameterFields = computed(() => normalizeParameters(selectedReport.value?.parameters))

function requiredRule(value) {
  if (Array.isArray(value)) return value.length > 0 || 'Required'
  return (value !== null && value !== undefined && String(value).trim() !== '') || 'Required'
}

function normalizeReports(data) {
  if (Array.isArray(data)) {
    return data.map((item) => normalizeReportItem(item))
  }
  if (data && typeof data === 'object') {
    return Object.entries(data).map(([id, item]) => normalizeReportItem(item, id))
  }
  return []
}

function normalizeReportItem(item, fallbackId = '') {
  if (typeof item === 'string') {
    return { id: item, title: item }
  }
  const report = item && typeof item === 'object' ? { ...item } : {}
  const id = String(report.id || report.report_id || report.name || fallbackId).trim()
  return { ...report, id }
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
    hint: param.hint || param.description || '',
    defaultValue: param.default ?? param.value ?? defaultValueForType(inputType, param.multiple),
  }
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

async function selectReport(row) {
  clearPoll()
  clearResultsTimer()
  errorMessage.value = null
  statusMessage.value = null
  resultRows.value = []
  resultColumns.value = []
  selectedReport.value = row
  resetParameterValues()

  try {
    const response = await tier3info_restful_request({
      method: 'GET',
      path: `/reports/${encodeURIComponent(row.id)}`,
    })
    if (response?.data) {
      selectedReport.value = normalizeReportItem(response.data, row.id)
      resetParameterValues()
    }
  } catch (error) {
    console.error('ReportsPage: selectReport detail error:', error)
  }
}

function resetParameterValues() {
  const values = {}
  for (const parameter of parameterFields.value) {
    values[parameter.name] = cloneValue(parameter.defaultValue)
  }
  parameterValues.value = values
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

function buildRequestBody() {
  const body = {}
  for (const parameter of parameterFields.value) {
    const value = parameterValues.value[parameter.name]
    body[parameter.name] = typeof value === 'string' ? value.trim() : value
  }
  return body
}

async function submitReport() {
  if (!selectedReport.value?.id) return
  clearPoll()
  clearResultsTimer()
  resultRows.value = []
  resultColumns.value = []
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

    if (['completed', 'complete', 'success', 'succeeded'].includes(status)) {
      clearPoll()
      await fetchResults()
      return
    }
    if (['failed', 'failure', 'error'].includes(status)) {
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
    const response = await tier3info_restful_request({
      method: 'GET',
      path: `/jobs/files/${encodeURIComponent(jobId.value)}/data.csv`,
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

onMounted(fetchReports)

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
