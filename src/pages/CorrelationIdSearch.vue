<!--
 FIXME: this page should handle Call-Id as well as Correlation-Id, but for now it's just Correlation-Id

 When processing the uploaded OCOM trace file, it should extract all Call-Ids and Correlation-Ids found in the trace,
 Note Call-Id will be in both long and short forn headers like:
   Call-id: 1234567890@host
   i: 1234567890@host
 So we need to extract both forms and de-duplicate them.

 Correlation Ids will still be in the X-BroadWorks-Correlation-Info headers.

 this goes for both HTML and PCAP files.

 We will also likely need to scrap or augment the validation rules, since Call-Ids are not UUIDs.
   maybe UUID or alphanumeric with special chars like @ and .
   looking at production traffic, not all call-ids have an @ sign some are just long hex strings.
   so we may need to relax the validation to allow for that.

 -->

<template>
  <q-page class="q-pa-md">
    <q-card class="q-pa-md">
      <q-card-section class="row">
        <div class="col-5 q-mb-xs">
          <q-input
            v-model="correlationId"
            label="Call / Correlation Ids"
            outlined
            type="textarea"
            autogrow
            :rules="[validateId]"
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
        <LogViewer
          :logData="searchResults"
          @filter-must="onMust"
          @filter-must-not="onMustNot"
          @entry-selected="onEntrySelected"
        />
      </q-card>
    </div>
  </q-page>
</template>

<script>
import { useTitleStore } from 'stores/titleStore'
import { tier3info_restful_request } from 'src/plugins/tier3info'
import { useRoute } from 'vue-router'
// Removed unused import for LogViewer
import LogViewer from 'components/LogViewer_v1.vue'
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const callIdRegex = /^[A-Za-z0-9_.:@-]{4,}$/
export default {
  components: { LogViewer },
  created() {
    const titleStore = useTitleStore()
    titleStore.setMainTitle('Correlation Id Log Search')

    const route = useRoute()
    if (route.query.correlationId) {
      this.correlationId = route.query.correlationId
      if (this.checkValidation()) {
        console.log('CorrelationIdSearch.vue: Correlation IDs valid, executing search')
        this.executeSearch()
      }
    }
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
    onEntrySelected(entry) {
      try {
        window.dispatchEvent(new CustomEvent('log-entry-selected', { detail: entry }))
      } catch (e) {
        console.error('CorrelationIdSearch.vue: error dispatching log-entry-selected', e)
      }
    },
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
          await tier3info_restful_request({
            path: `/jobs/${this.jobId}`,
            method: 'DELETE',
          })
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
    onMust(event) {
      console.log('CorrelationIdSearch.vue: onMust called with event:', event)
      // Handle the filter-must event
    },
    onMustNot(event) {
      console.log('CorrelationIdSearch.vue: onMustNot called with event:', event)
      // Handle the filter-must-not event
    },
    validateId(value) {
      // Accept multiple IDs (one per line or separated by whitespace/commas)
      const items = String(value || '')
        .split(/[\s,]+/)
        .filter(Boolean)

      if (items.length === 0) {
        this.searchDisabled = true
        return true
      }

      const allValid = items.every((s) => uuidRegex.test(s) || callIdRegex.test(s))
      this.searchDisabled = !allValid

      return allValid ? true : 'One or more lines are not valid Call-Ids or Correlation-Ids.'
    },
    checkValidation() {
      const isValid = this.validateId(this.correlationId)
      this.error = !isValid
      return isValid
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
    extractCallIds(text) {
      console.log('CorrelationIdSearch.vue: extractCallIds called with text length:', text)
      const matches = []
      const regex = /(?:call-id|callid|i)\s*:\s*([^\s<>]+)/gi
      let m
      while ((m = regex.exec(text))) {
        const val = m[1].replace(/[<>]/g, '').trim()
        console.log('CorrelationIdSearch.vue: Found Call-Id:', val)
        if (val) matches.push(val)
      }
      return matches
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
        const ids = new Set()
        if (file.name.includes('html')) {
          console.log('CorrelationIdSearch.vue: Processing HTML file')
          const content = event.target.result
          const data = this.extractVarData(content)
          console.log('CorrelationIdSearch.vue: Extracted data:', data)
          if (data) {
            data.messages.forEach((packet) => {
              console.log('CorrelationIdSearch.vue: Processing packet:', packet)
              const uuids = this.extractUUIDs(packet.data)
              uuids.forEach((uuid) => ids.add(uuid))
              const callIds = this.extractCallIds(packet.data)
              callIds.forEach((cid) => ids.add(cid))
            })
            console.log('CorrelationIdSearch.vue: Extracted ids:', ids)
            this.handleCorrelationIds(ids)
          }
        } else if (file.name.includes('pcap')) {
          console.log('CorrelationIdSearch.vue: Processing PCAP file')
          const arrayBuffer = event.target.result
          const data = new Uint8Array(arrayBuffer)
          const text = this.extractASCIIStrings(data)
          this.extractUUIDs(text).forEach((uuid) => ids.add(uuid))
          this.extractCallIds(text).forEach((cid) => ids.add(cid))
          console.log('CorrelationIdSearch.vue: Extracted ids:', ids)
          this.handleCorrelationIds(ids)
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
      console.log('CorrelationIdSearch.vue: handleCorrelationIds called with:', correlationIds)
      const list = Array.from(correlationIds)
      this.correlationId = list.join('\n') // one per line
      console.log('CorrelationIdSearch.vue: Updated correlationId input:', this.correlationId)
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
