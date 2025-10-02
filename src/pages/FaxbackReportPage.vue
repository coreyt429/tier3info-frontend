<template>
  <q-page class="flex flex-start">
    <div class="q-pa-md" style="width: 100%">
      <!-- Row 1: Search Input and Button -->
      <q-card class="q-mt-md">
        <q-card-section class="row items-center">
          <q-input
            v-model="searchQuery"
            label="Search"
            outlined
            dense
            class="col-9"
            @keyup.enter="executeSearch"
          />
          <q-btn
            label="Search"
            color="primary"
            class="col-2 q-ml-sm"
            :loading="isLoading"
            :disable="!searchQuery"
            @click="executeSearch"
          />
        </q-card-section>
      </q-card>
      <q-card class="q-mt-md">
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
      <!-- Row 2: Search Results Table -->
      <q-card v-if="rows.length > 0" class="q-mt-md">
        <DataTable
          :rows="rows"
          :columns="columns"
          :filterable="true"
          :exportable="true"
          :pagination-config="pagination"
          :onClick="selectItem"
          exportPrefix="locate-export"
        />
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue'
// import { exportFile, useQuasar } from 'quasar'
import { tier3info_restful_request } from 'src/plugins/tier3info.js'
import DataTable from 'src/components/DataTable.vue'

// import axios from 'axios'
import { useTitleStore } from 'stores/titleStore'
const titleStore = useTitleStore()
titleStore.setMainTitle('Faxback Report')

const searchQuery = ref('')
const rows = ref([])
const selectedItem = ref(null)
const isLoading = ref(false)
const statusMessage = ref(null)
const errorMessage = ref(null)
const jobId = ref(null)
const waitCounter = ref(0)
let pollTimer = null

const resultsRetryCount = ref(0)
const resultsBackoffMs = ref(1000)
let resultsTimer = null

const columns = [
  { name: 'AccountId', label: 'AccountId', field: 'AccountId' },
  { name: 'DomainId', label: 'DomainId', field: 'DomainId' },
  { name: 'DID', label: 'DID', field: 'DID' },
  { name: 'ANI', label: 'ANI', field: 'ANI' },
  { name: 'CSID', label: 'CSID', field: 'CSID' },
  { name: 'TSID', label: 'TSID', field: 'TSID' },
  { name: 'BillingCode', label: 'BillingCode', field: 'BillingCode' },
  { name: 'EmailAddress', label: 'Email Address', field: 'email_address' },
  { name: 'ATA SerialNumber', label: 'ATA SerialNumber', field: 'ata_serial_number' },
  { name: 'ATA MacAddress', label: 'ATA MacAddress', field: 'ata_mac_address' },
  { name: 'ATA Port', label: 'ATA Port', field: 'ata_port' },
]
const pagination = ref({ rowsPerPage: 0 })

async function executeSearch() {
  // reset state
  clearPoll()
  clearResultsTimer()
  resultsRetryCount.value = 0
  resultsBackoffMs.value = 1000
  errorMessage.value = null
  rows.value = []
  statusMessage.value = `Searching for "${searchQuery.value}"... Please wait.`
  isLoading.value = true

  const request = {
    method: 'POST',
    path: '/locate/faxback_report',
    body: { query_string: searchQuery.value },
  }
  try {
    const response = await tier3info_restful_request(request)
    if (!response || !response.data || !response.data.job_id) {
      throw new Error('Invalid response (missing job_id)')
    }
    jobId.value = response.data.job_id
    waitCounter.value = 0
    // start polling
    pollTimer = setTimeout(checkJobStatus, 500)
  } catch (err) {
    console.error('FaxbackReportPage: executeSearch error:', err)
    errorMessage.value = 'Invalid response from server. Please try again later.'
    statusMessage.value = null
    isLoading.value = false
  }
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

async function checkJobStatus() {
  try {
    const req = { path: `/jobs/${jobId.value}`, method: 'GET' }
    const resp = await tier3info_restful_request(req)
    console.log('FaxbackReportPage: checkJobStatus response:', resp)
    if (!resp || !resp.data) {
      throw new Error('Invalid job status response')
    }

    if (resp.data.status === 'completed') {
      resultsRetryCount.value = 0
      resultsBackoffMs.value = 1000
      await fetchResults()
      statusMessage.value = null
      isLoading.value = false
      clearPoll()
      // attempt to delete job record (best-effort)
      // try {
      //   await tier3info_restful_request({ path: `/jobs/${jobId.value}`, method: 'DELETE' })
      // } catch {
      //   /* noop */
      // }
    } else if (resp.data.status === 'failed') {
      errorMessage.value = 'Job failed on the server.'
      statusMessage.value = null
      isLoading.value = false
      clearPoll()
    } else {
      waitCounter.value += 1
      if (waitCounter.value > 60) {
        statusMessage.value = 'Job is taking too long. Please try again later.'
        isLoading.value = false
        // auto-clear after a short delay
        setTimeout(() => {
          statusMessage.value = null
        }, 5000)
        clearPoll()
      } else {
        statusMessage.value = `Waiting on search data... (${waitCounter.value * 5} seconds)`
        pollTimer = setTimeout(checkJobStatus, 5000)
      }
    }
  } catch (err) {
    console.error('FaxbackReportPage: checkJobStatus error:', err)
    errorMessage.value = 'Invalid response from server. Please try again later.'
    statusMessage.value = null
    isLoading.value = false
    clearPoll()
  }
}

async function fetchResults() {
  try {
    const req = {
      path: `/jobs/files/${jobId.value}/results.ndjson`,
      method: 'GET',
      responseType: 'text',
    }
    const resp = await tier3info_restful_request(req)
    // Some clients put the status on resp.status; others nest under resp.response.status
    const status = resp?.status ?? resp?.response?.status
    if (status === 404) {
      // results file not ready yet — schedule a retry with backoff
      scheduleResultsRetry('Results not ready (404). Retrying')
      return
    }

    const text = typeof resp?.data === 'string' ? resp.data : ''
    if (!text) {
      // If server sometimes returns empty body before file is fully written, retry once more
      scheduleResultsRetry('Empty results. Retrying')
      return
    }

    const parsed = []
    for (const line of text.split('\n')) {
      if (!line.trim()) continue
      try {
        parsed.push(JSON.parse(line))
      } catch {
        console.warn('Skipping bad NDJSON line:', line)
      }
    }

    if (parsed.length === 0) {
      scheduleResultsRetry('No rows parsed. Retrying')
      return
    }

    rows.value = parsed
    statusMessage.value = null
    clearResultsTimer()
  } catch (err) {
    // Detect 404 from thrown errors (e.g., axios-like) and back off
    const code = err?.response?.status || err?.status
    if (code === 404) {
      scheduleResultsRetry('Results not ready (404). Retrying')
      return
    }
    console.error('FaxbackReportPage: fetchResults error:', err)
    errorMessage.value = 'Error retrieving or parsing search results. Please try again later.'
    rows.value = []
    clearResultsTimer()
  }
}

function scheduleResultsRetry(reason) {
  resultsRetryCount.value += 1
  // cap at 10 retries (~ up to ~17s total with starting at 1s and doubling, but we also cap per-try at 10s)
  if (resultsRetryCount.value > 10) {
    errorMessage.value =
      'Results file is not yet available. Please run the search again in a moment.'
    statusMessage.value = null
    isLoading.value = false
    clearResultsTimer()
    return
  }
  const delay = Math.min(resultsBackoffMs.value, 10000)
  statusMessage.value = `${reason} in ${Math.round(delay / 1000)}s...`
  clearResultsTimer()
  resultsTimer = setTimeout(() => {
    // exponential backoff for next time
    resultsBackoffMs.value = Math.min(resultsBackoffMs.value * 2, 10000)
    fetchResults()
  }, delay)
}

function selectItem(row) {
  selectedItem.value = row
}

const props = defineProps({
  query: Object,
})

onMounted(() => {
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

onUnmounted(() => {
  clearPoll()
  clearResultsTimer()
})
</script>
<style lang="sass"></style>
