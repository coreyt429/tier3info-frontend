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
            filled
            dense
            v-model="customStartDT"
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
            filled
            dense
            v-model="customEndDT"
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

      <q-card-section class="row">
        <div class="col-9 q-mb-xs">
          <q-input
            v-model="queryString"
            label="Query"
            outlined
            type="textarea"
            autogrow
            clearable
            @paste="handleQueryPaste"
          />
        </div>
        <div class="col-3 q-mb-xs text-center">
          <q-btn
            color="primary"
            icon="search"
            label="Search"
            class="q-mt-none"
            @click="executeSearch"
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
      <q-card-section v-if="queryFilters && queryFilters.length" class="q-pt-none">
        <div class="row q-col-gutter-sm">
          <div class="col-12">
            <div class="q-gutter-sm">
              <q-badge
                v-for="(f, i) in queryFilters"
                :key="`${f.field}-${i}`"
                rounded
                :color="f.must ? 'positive' : 'negative'"
                text-color="white"
                class="q-pa-xs"
              >
                <q-icon :name="f.must ? 'add' : 'remove'" size="14px" class="q-mr-xs" />
                {{ f.field }}
                <span class="q-mx-xs">=</span>
                <span>{{ formatFilterValue(f.value) }}</span>
                <q-btn
                  dense
                  flat
                  round
                  size="sm"
                  icon="close"
                  class="q-ml-xs"
                  @click.stop="removeFilter(i)"
                />
              </q-badge>
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>
    <div class="q-mt-md">
      <q-card v-if="searchResults" class="q-pa-md">
        <LogViewer
          :items="searchResults?.hits?.hits || []"
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
// Removed unused import for LogViewer
import LogViewer from 'components/LogViewer.vue'
export default {
  components: { LogViewer },
  created() {
    const titleStore = useTitleStore()
    titleStore.setMainTitle('Query String Log Search')
    this.applyRouteQuery(this.$route?.query)
    if (this.queryString) {
      console.log('LogSearch.vue: Query String valid, executing search')
      this.executeSearch()
    }
  },
  data() {
    return {
      queryString: '',
      error: false,
      traceFile: null,
      jobId: null,
      statusMessage: null,
      waitCounter: 0,
      searchDisabled: true,
      searchResults: null,
      errorMessage: null,
      queryFilters: [], // { must: boolean, field: string, value: any }
      timePreset: 'now-15m',
      timeFilters: { value: { gte: 'now-15m' } },
      showCustom: false,
      timeOptions: [
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
      ],
      // Custom range combined datetime strings
      customStartDT: null, // 'YYYY-MM-DD HH:mm:ss.SSS'
      customEndDT: null,
    }
  },
  computed: {
    totalCount() {
      try {
        return this.searchResults?.hits?.hits?.length || 0
      } catch (e) {
        console.error('LogSearch.vue: Error getting totalCount:', e)
        return 0
      }
    },
  },
  mounted() {
    // Capture filter events forwarded by MainLayout's LogEntryDetail modal
    window.addEventListener('log-filter-must', this.filterMustHandler)
    window.addEventListener('log-filter-must-not', this.filterMustNotHandler)
  },
  unmounted() {
    window.removeEventListener('log-filter-must', this.filterMustHandler)
    window.removeEventListener('log-filter-must-not', this.filterMustNotHandler)
  },
  watch: {
    '$route.query'(newQuery) {
      this.applyRouteQuery(newQuery)
    },
  },
  methods: {
    applyRouteQuery(routeQuery) {
      const esquery = routeQuery?.esquery || routeQuery?.queryString || ''
      const trimmedQuery = typeof esquery === 'string' ? esquery.trim() : ''
      if (trimmedQuery !== this.queryString) {
        this.queryString = trimmedQuery
      }

      this.applyRouteTimeRange(routeQuery)
    },

    applyRouteTimeRange(routeQuery) {
      const start = typeof routeQuery?.start === 'string' ? routeQuery.start.trim() : ''
      const end = typeof routeQuery?.end === 'string' ? routeQuery.end.trim() : ''

      if (!start && !end) {
        return
      }

      if (end === 'now' && start && this.timeOptions.some((option) => option.value === start)) {
        this.timePreset = start
        this.showCustom = false
        this.timeFilters.value = { gte: start }
        this.customStartDT = null
        this.customEndDT = null
        return
      }

      this.applyKibanaTimeRange({ from: start, to: end })
    },

    handleQueryPaste(event) {
      const pastedText = event?.clipboardData?.getData('text')?.trim()
      if (!pastedText) return

      const parsedPaste = this.parseKibanaPaste(pastedText)
      if (!parsedPaste) return

      event.preventDefault()
      this.queryString = parsedPaste.query

      if (parsedPaste.timeRange) {
        this.applyKibanaTimeRange(parsedPaste.timeRange)
      }
    },

    parseKibanaPaste(rawValue) {
      const trimmedValue = rawValue?.trim()
      if (!trimmedValue) return null

      let parsedUrl
      try {
        parsedUrl = new URL(trimmedValue)
      } catch {
        return null
      }

      if (!this.looksLikeKibanaUrl(parsedUrl, trimmedValue)) {
        return null
      }

      const searchCandidates = this.getKibanaSearchCandidates(parsedUrl, trimmedValue)
      const query = this.extractKibanaQuery(searchCandidates)
      if (!query) return null

      return {
        query,
        timeRange: this.extractKibanaTimeRange(searchCandidates),
      }
    },

    looksLikeKibanaUrl(parsedUrl, rawValue) {
      const candidate = `${parsedUrl.hostname}${parsedUrl.pathname}${parsedUrl.hash}${parsedUrl.search}`
      return /kibana|discover|app\/logs|_a=|_g=/i.test(candidate || rawValue)
    },

    getKibanaSearchCandidates(parsedUrl, rawValue) {
      const candidates = new Set()
      const addCandidate = (value) => {
        if (!value || typeof value !== 'string') return
        candidates.add(value)
        try {
          candidates.add(decodeURIComponent(value))
        } catch {
          // Ignore malformed URI segments.
        }
      }

      addCandidate(rawValue)
      addCandidate(parsedUrl.hash)
      addCandidate(parsedUrl.search)

      const collectParams = (value) => {
        if (!value) return
        const queryString = value.includes('?') ? value.split('?').slice(1).join('?') : value
        const params = new URLSearchParams(queryString.replace(/^#/, ''))
        ;['_a', '_g', 'query'].forEach((key) => addCandidate(params.get(key)))
      }

      collectParams(parsedUrl.search)
      collectParams(parsedUrl.hash)

      return Array.from(candidates)
    },

    extractKibanaQuery(candidates) {
      const patterns = [
        /query:\(language:[^,]+,query:'((?:!!|!'|[^'])*)'\)/,
        /query:\(query:'((?:!!|!'|[^'])*)',language:[^)]+\)/,
        /query:'((?:!!|!'|[^'])*)'/,
      ]

      for (const candidate of candidates) {
        for (const pattern of patterns) {
          const match = candidate.match(pattern)
          if (!match?.[1]) continue
          const query = this.decodeRisonValue(match[1]).trim()
          if (query) return query
        }
      }

      return null
    },

    extractKibanaTimeRange(candidates) {
      for (const candidate of candidates) {
        const fromMatch = candidate.match(/from:('(?:!!|!'|[^'])*'|[^,)\s]+)/)
        const toMatch = candidate.match(/to:('(?:!!|!'|[^'])*'|[^,)\s]+)/)
        const from = this.normalizeKibanaTimeValue(fromMatch?.[1])
        const to = this.normalizeKibanaTimeValue(toMatch?.[1])

        if (from || to) {
          return { from, to }
        }
      }

      return null
    },

    normalizeKibanaTimeValue(value) {
      if (!value) return null
      const trimmedValue = value.trim()
      if (!trimmedValue) return null
      const unwrappedValue =
        trimmedValue.startsWith("'") && trimmedValue.endsWith("'")
          ? trimmedValue.slice(1, -1)
          : trimmedValue
      const decodedValue = this.decodeRisonValue(unwrappedValue).trim()
      return decodedValue || null
    },

    decodeRisonValue(value) {
      const risonDecoded = value.replace(/!!/g, '__RISON_BANG__').replace(/!'/g, "'").replace(
        /__RISON_BANG__/g,
        '!',
      )

      let uriDecoded = risonDecoded
      for (let i = 0; i < 2; i += 1) {
        try {
          const nextValue = decodeURIComponent(uriDecoded)
          if (nextValue === uriDecoded) break
          uriDecoded = nextValue
        } catch {
          break
        }
      }

      return uriDecoded
    },

    applyKibanaTimeRange(timeRange) {
      const { from, to } = timeRange || {}
      if (!from && !to) return

      if (to === 'now' && from && this.timeOptions.some((option) => option.value === from)) {
        this.timePreset = from
        this.showCustom = false
        this.timeFilters.value = { gte: from }
        this.customStartDT = null
        this.customEndDT = null
        return
      }

      const customStart = this.isoToLocalDateTime(from)
      const customEnd = this.isoToLocalDateTime(to)
      if (!(customStart && customEnd)) return

      this.timePreset = 'custom'
      this.showCustom = true
      this.customStartDT = customStart
      this.customEndDT = customEnd
      this.updateCustomRange()
    },

    getShareableTimeRange() {
      const timeFilter = this.timeFilters?.value || {}
      const start = this.resolveTimeValueToAbsolute(timeFilter.gte)
      const end = this.resolveTimeValueToAbsolute(timeFilter.lte || 'now')
      return { start, end }
    },

    resolveTimeValueToAbsolute(value) {
      if (!value) return null
      if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return value
      if (value === 'now') return new Date().toISOString()

      const relativeMatch = value.match(/^now-(\d+)([mhdwy])$/)
      if (!relativeMatch) return null

      const amount = parseInt(relativeMatch[1], 10)
      const unit = relativeMatch[2]
      const now = new Date()
      const date = new Date(now)
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
    },

    syncRouteQuery() {
      const esquery = this.queryString.trim()
      const { start, end } = this.getShareableTimeRange()
      const nextQuery = {}

      if (esquery) nextQuery.esquery = esquery
      if (start) nextQuery.start = start
      if (end) nextQuery.end = end

      const currentQuery = this.$route?.query || {}
      if (
        (currentQuery.esquery || '') === (nextQuery.esquery || '') &&
        (currentQuery.start || '') === (nextQuery.start || '') &&
        (currentQuery.end || '') === (nextQuery.end || '') &&
        !currentQuery.queryString
      ) {
        return
      }

      this.$router.replace({ path: this.$route.path, query: nextQuery })
    },

    isoToLocalDateTime(value) {
      if (!value || value === 'now') return null
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return null

      const pad = (n) => String(n).padStart(2, '0')
      const pad3 = (n) => String(n).padStart(3, '0')

      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad3(date.getMilliseconds())}`
    },

    onEntrySelected(entry) {
      try {
        window.dispatchEvent(new CustomEvent('log-entry-selected', { detail: entry }))
      } catch (e) {
        console.error('LogSearch.vue: error dispatching log-entry-selected', e)
      }
    },
    onTimePresetChange(val) {
      if (val === 'custom') {
        this.showCustom = true
        // Do not change timeFilters until both custom endpoints are set
        return
      }
      this.showCustom = false
      this.timeFilters.value = { gte: val }
    },

    updateCustomRange() {
      if (!(this.customStartDT && this.customEndDT)) return
      this.customStartDT = this.customStartDT.trim()
      this.customEndDT = this.customEndDT.trim()
      const startIso = this.dtToIso(this.customStartDT)
      const endIso = this.dtToIso(this.customEndDT)
      if (!(startIso && endIso)) return
      this.timeFilters.value = { gte: startIso, lte: endIso }
    },

    dtToIso(datetimeStr) {
      // Expects 'YYYY-MM-DD HH:mm[:ss][.SSS]' in local time
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
    },

    async executeSearch() {
      this.errorMessage = null
      this.queryString = this.queryString.trim()
      if (this.timePreset === 'custom') {
        this.updateCustomRange()
      }
      this.syncRouteQuery()
      this.statusMessage = `Searching for ${this.queryString}... Please wait.`
      console.log('LogSearch.vue: executeSearch called with queryString:', this.queryString)
      console.log('LogSearch.vue: executeSearch called with queryFilters:', this.queryFilters)
      console.log('LogSearch.vue: executeSearch called with timeFilters:', this.timeFilters)
      const request = {
        path: '/logtool/query',
        body: {
          query_string: this.queryString,
          filters: this.queryFilters,
          time_filter: this.timeFilters.value,
        },
        method: 'POST',
      }

      const response = await tier3info_restful_request(request)
      if (!response || !response.data) {
        this.errorMessage = 'Invalid response from server. Please try again later.'
        this.statusMessage = null
        console.error('LogSearch.vue: Invalid response data:', response)
        return
      }
      console.log('LogSearch.vue: executeSearch response:', response)
      this.jobId = response.data.job_id
      console.log('LogSearch.vue: Job ID:', this.jobId)
      setTimeout(() => {
        this.waitCounter = 0
        this.checkJobStatus()
      }, 500)
    },
    async checkJobStatus() {
      console.log('LogSearch.vue: checkJobStatus called with jobId:', this.jobId)
      const request = {
        path: `/jobs/${this.jobId}`,
        method: 'GET',
      }
      const response = await tier3info_restful_request(request)
      console.log('LogSearch.vue: checkJobStatus response:', response)
      if (!response || !response.data) {
        this.statusMessage = null
        this.errorMessage = 'Invalid response from server. Please try again later.'
        console.error('LogSearch.vue: Invalid response data:', response)
        return
      }
      console.log('LogSearch.vue: checkJobStatus response:', response)
      if (response.data.status === 'completed') {
        // Handle completed job status
        console.log('LogSearch.vue: Job completed', response.data)
        try {
          const tmpData = JSON.parse(response.data._data) || 'No results found.'
          console.log('LogSearch.vue: Job completed - search results:', tmpData.length)
          // if (
          //   tmpData &&
          //   tmpData.response &&
          //   tmpData.response.hits &&
          //   Array.isArray(tmpData.response.hits.hits) &&
          //   tmpData.response.hits.hits.length > 1000
          // ) {
          //   tmpData.response.hits.hits = tmpData.response.hits.hits.slice(0, 1000)
          // }
          this.searchResults = tmpData.response || { hits: { total: 0, hits: [] } }
          // Initialize virtual window to the first slice
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
          console.error('LogSearch.vue: Job is taking too long.')
          setTimeout(() => {
            this.statusMessage = null
          }, 5000)
          return
        } else {
          this.statusMessage = `Waiting on search data... (${this.waitCounter / 2} seconds)`
          console.log('LogSearch.vue: Job is still processing...')
          setTimeout(() => {
            this.checkJobStatus()
          }, 5000)
        }
      }
    },
    onMust(event) {
      // event: { key: string, value: any }
      const existingIndex = this.queryFilters.findIndex(
        (f) => f.field === event.key && JSON.stringify(f.value) === JSON.stringify(event.value),
      )
      if (existingIndex !== -1) {
        this.queryFilters[existingIndex].must = true
      } else {
        this.queryFilters.push({ must: true, field: event.key, value: event.value })
      }
      console.log(
        'LogSearch.vue: onMust added filter:',
        this.queryFilters[this.queryFilters.length - 1],
      )
      this.$nextTick(() => {
        try {
          // Prefer smooth scroll; fallback to instant
          if (typeof window !== 'undefined' && window.scrollTo) {
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }
        } catch (e) {
          console.log('LogSearch.vue: onMust scroll error:', e)
          try {
            window.scrollTo(0, 0)
          } catch (e) {
            console.log('LogSearch.vue: onMust scroll fallback error:', e)
          }
        }
      })
    },
    onMustNot(event) {
      // event: { key: string, value: any }
      const existingIndex = this.queryFilters.findIndex(
        (f) => f.field === event.key && JSON.stringify(f.value) === JSON.stringify(event.value),
      )
      if (existingIndex !== -1) {
        this.queryFilters[existingIndex].must = true
      } else {
        this.queryFilters.push({ must: false, field: event.key, value: event.value })
      }
      console.log(
        'LogSearch.vue: onMustNot added filter:',
        this.queryFilters[this.queryFilters.length - 1],
      )
      this.$nextTick(() => {
        try {
          if (typeof window !== 'undefined' && window.scrollTo) {
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }
        } catch (e) {
          console.log('LogSearch.vue: onMustNot scroll error:', e)
          try {
            window.scrollTo(0, 0)
          } catch (e) {
            console.log('LogSearch.vue: onMustNot scroll fallback error:', e)
          }
        }
      })
    },
    removeFilter(index) {
      if (index >= 0 && index < this.queryFilters.length) {
        const removed = this.queryFilters.splice(index, 1)
        console.log('LogSearch.vue: removed filter:', removed)
      }
    },
    formatFilterValue(val) {
      try {
        if (val === null || val === undefined) return 'null'
        if (Array.isArray(val)) return val.join(', ')
        if (typeof val === 'object') return JSON.stringify(val)
        return String(val)
      } catch (e) {
        console.log(`LogSearch.vue: formatFilterValue error:`, e)
        return String(val)
      }
    },
    filterMustHandler(e) {
      try {
        if (e && e.detail) this.onMust(e.detail)
      } catch (err) {
        console.error('LogSearch.vue: filterMustHandler error:', err)
      }
    },
    filterMustNotHandler(e) {
      try {
        if (e && e.detail) this.onMustNot(e.detail)
      } catch (err) {
        console.error('LogSearch.vue: filterMustNotHandler error:', err)
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
