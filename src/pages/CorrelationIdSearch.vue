<template>
  <q-page class="q-pa-md">
    <q-card class="q-pa-md">
      <q-card-section class="row">
        <div class="col-5 q-mb-xs">
          <q-input
            v-model="correlationId"
            label="Call Correlation Id"
            outlined
            type="textarea"
            autogrow
            :rules="[validateUUID]"
            clearable
            @blur="checkValidation"
          />
        </div>
        <div class="col-3 q-mb-xs text-center">
          <q-btn
            :disable="error || !correlationId"
            color="primary"
            icon="search"
            label="Search"
            class="q-mt-none"
            :disabled="searchDisabled"
            @click="executeSearch"
          />
        </div>
        <div class="col-4 q-mb-xs">
          <q-file
            v-model="traceFile"
            label="OCOM Trace (html or pcap)"
            outlined
            filled
            counter
            use-chips
            accept=".html,.pcap"
          />
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
    <div class="q-mt-md">
      <q-card v-if="searchResults" class="q-pa-md">
        <LogViewer :logData="searchResults" />
      </q-card>
    </div>
  </q-page>
</template>

<script>
import { useTitleStore } from 'stores/titleStore'
import { tier3info_restful_request } from 'src/plugins/tier3info'
// Removed unused import for LogViewer
import LogViewer from 'components/LogViewer.vue'
export default {
  components: { LogViewer },
  created() {
    const titleStore = useTitleStore()
    titleStore.setMainTitle('Correlation Id Log Search')
  },
  data() {
    return {
      correlationId: '',
      error: false,
      traceFile: null,
      jobId: null,
      statusMessage: null,
      waitCounter: 0,
      searchDisabled: true,
      searchResults: null,
      errorMessage: null,
    }
  },
  methods: {
    async executeSearch() {
      this.errorMessage = null
      this.statusMessage = `Searching for ${this.correlationId}... Please wait.`
      console.log(
        'CorrelationIdSearch.vue: executeSearch called with correlationId:',
        this.correlationId,
      )
      const request = {
        path: '/logtool/correlation_id',
        body: {
          correlation_id: this.correlationId.split('\n').filter(Boolean),
        },
        method: 'POST',
      }
      const response = await tier3info_restful_request(request)
      if (!response || !response.data) {
        this.errorMessage = 'Invalid response from server. Please try again later.'
        this.statusMessage = null
        console.error('CorrelationIdSearch.vue: Invalid response data:', response)
        return
      }
      console.log('CorrelationIdSearch.vue: executeSearch response:', response)
      this.jobId = response.data.job_id
      console.log('CorrelationIdSearch.vue: Job ID:', this.jobId)
      setTimeout(() => {
        this.waitCounter = 0
        this.checkJobStatus()
      }, 500)
    },
    async checkJobStatus() {
      console.log('CorrelationIdSearch.vue: checkJobStatus called with jobId:', this.jobId)
      const request = {
        path: `/jobs/${this.jobId}`,
        method: 'GET',
      }
      const response = await tier3info_restful_request(request)
      console.log('CorrelationIdSearch.vue: checkJobStatus response:', response)
      if (!response || !response.data) {
        this.statusMessage = null
        this.errorMessage = 'Invalid response from server. Please try again later.'
        console.error('CorrelationIdSearch.vue: Invalid response data:', response)
        return
      }
      console.log('CorrelationIdSearch.vue: checkJobStatus response:', response)
      if (response.data.status === 'completed') {
        // Handle completed job status
        console.log('CorrelationIdSearch.vue: Job completed', response.data)
        try {
          const tmpData = JSON.parse(response.data._data) || 'No results found.'
          this.searchResults = tmpData.response || { hits: { total: 0, hits: [] } }
        } catch (error) {
          console.error('Error parsing JSON:', error)
          this.errorMessage = 'Error parsing search results. Please try again later.'
          this.searchResults = null
        }
        this.statusMessage = null
      } else {
        this.waitCounter += 1
        if (this.waitCounter > 60) {
          this.statusMessage = 'Job is taking too long. Please try again later.'
          console.error('CorrelationIdSearch.vue: Job is taking too long.')
          setTimeout(() => {
            this.statusMessage = null
          }, 5000)
          return
        } else {
          this.statusMessage = `Waiting on search data... (${this.waitCounter / 2} seconds)`
          console.log('CorrelationIdSearch.vue: Job is still processing...')
          setTimeout(() => {
            this.checkJobStatus()
          }, 5000)
        }
      }
    },
    validateUUID(value) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

      // Accept multiple UUIDs (one per line or separated by any whitespace/commas)
      const items = String(value || '')
        .split(/[\s,]+/) // split on newlines, spaces, tabs, commas
        .filter(Boolean) // drop empties

      if (items.length === 0) {
        // No input yet – let Quasar treat it as neutral and rely on button disable
        this.searchDisabled = true
        return true
      }

      const allValid = items.every((s) => uuidRegex.test(s))
      this.searchDisabled = !allValid

      return allValid
        ? true
        : 'One or more lines are not valid UUIDs (format xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx).'
    },
    checkValidation() {
      this.error = !this.validateUUID(this.correlationId)
    },
    extractVarData(content) {
      const lines = content.split('\n')
      const regex = /var data =/

      for (const line of lines) {
        const match = regex.exec(line)
        if (match) {
          console.log('CorrelationIdSearch.vue: Found var data definition', line)
          try {
            const dataMatch = line.match(/var data = \((.+)\);/)
            if (dataMatch && dataMatch[1]) {
              const dataString = dataMatch[1]
              const data = JSON.parse(dataString)
              console.log('CorrelationIdSearch.vue: Parsed data:', data)
              return data
            }
          } catch (e) {
            console.error('Error decoding JSON:', e)
            return null
          }
        }
      }
      console.error("No 'var data' definition found in the file.")
      return null
    },
    extractUUIDs(text) {
      const uuidPattern =
        /\b[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}\b/g
      return text.match(uuidPattern) || []
    },
    extractASCIIStrings(data) {
      let result = ''
      let currentString = ''

      for (let i = 0; i < data.length; i++) {
        const char = String.fromCharCode(data[i])
        if (char >= ' ' && char <= '~') {
          currentString += char
        } else {
          if (currentString.length >= 4) {
            result += currentString + '\n'
          }
          currentString = ''
        }
      }

      if (currentString.length >= 4) {
        result += currentString + '\n'
      }

      return result
    },
    async parseCorrelationIdFromFile() {
      console.log('CorrelationIdSearch.vue: parseCorrelationIdFromFile called')
      if (!this.traceFile) return

      const file = this.traceFile
      const reader = new FileReader()
      console.log('CorrelationIdSearch.vue: Reading file:', file.name)
      reader.onload = (event) => {
        if (file.name.includes('html')) {
          console.log('CorrelationIdSearch.vue: Processing HTML file')
          const content = event.target.result
          const data = this.extractVarData(content)
          console.log('CorrelationIdSearch.vue: Extracted data:', data)
          const correlationIds = new Set()
          if (data) {
            data.messages.forEach((packet) => {
              if (packet.html.includes('X-BroadWorks-Correlation-Info')) {
                const uuids = this.extractUUIDs(packet.html)
                uuids.forEach((uuid) => correlationIds.add(uuid))
              }
            })
            console.log('CorrelationIdSearch.vue: Extracted correlationIds:', correlationIds)
            this.handleCorrelationIds(correlationIds)
          }
        } else if (file.name.includes('pcap')) {
          console.log('CorrelationIdSearch.vue: Processing PCAP file')
          const arrayBuffer = event.target.result
          const data = new Uint8Array(arrayBuffer)
          const text = this.extractASCIIStrings(data)
          const correlationIds = new Set(this.extractUUIDs(text))
          console.log('CorrelationIdSearch.vue: Extracted correlationIds:', correlationIds)
          this.handleCorrelationIds(correlationIds)
        } else {
          alert('Unhandled file type: ' + file.name)
        }
      }

      if (file.name.includes('pcap')) {
        reader.readAsArrayBuffer(file)
      } else {
        reader.readAsText(file)
      }
    },
    handleCorrelationIds(correlationIds) {
      const list = Array.from(correlationIds)
      this.correlationId = list.join('\n') // one per line
      this.checkValidation()
    },
  },
  watch: {
    traceFile(newFile) {
      console.log('CorrelationIdSearch.vue: traceFile changed:', newFile)
      if (newFile) {
        this.parseCorrelationIdFromFile()
      }
    },
  },
}
</script>

<style scoped>
.q-banner {
  text-align: center;
}
</style>
