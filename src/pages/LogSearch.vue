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
          <q-input filled dense v-model="customStartDT" label="Start (local)">
            <template v-slot:prepend>
              <q-icon name="event" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date
                    v-model="customStartDT"
                    mask="YYYY-MM-DD HH:mm"
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
                    mask="YYYY-MM-DD HH:mm"
                    format24h
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
          <q-input filled dense v-model="customEndDT" label="End (local)">
            <template v-slot:prepend>
              <q-icon name="event" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date
                    v-model="customEndDT"
                    mask="YYYY-MM-DD HH:mm"
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
                    mask="YYYY-MM-DD HH:mm"
                    format24h
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
import { useRoute } from 'vue-router'
// Removed unused import for LogViewer
import LogViewer from 'components/LogViewer.vue'
export default {
  components: { LogViewer },
  created() {
    const titleStore = useTitleStore()
    titleStore.setMainTitle('Query String Log Search')

    const route = useRoute()
    if (route.query.queryString) {
      this.queryString = route.query.queryString
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
      customStartDT: null, // 'YYYY-MM-DD HH:mm'
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
  methods: {
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
      const startIso = this.dtToIso(this.customStartDT)
      const endIso = this.dtToIso(this.customEndDT)
      this.timeFilters.value = { gte: startIso, lte: endIso }
    },

    dtToIso(datetimeStr) {
      // Expects 'YYYY-MM-DD HH:mm' in local time
      if (!datetimeStr) return null
      const [d, t] = datetimeStr.trim().split(' ')
      const [y, m, day] = d.split('-').map((n) => parseInt(n, 10))
      const [hh, mm] = (t || '00:00').split(':').map((n) => parseInt(n, 10))
      const dt = new Date(y, (m || 1) - 1, day || 1, hh || 0, mm || 0, 0, 0)
      const pad = (n) => String(n).padStart(2, '0')
      const offMin = -dt.getTimezoneOffset()
      const sign = offMin >= 0 ? '+' : '-'
      const absMin = Math.abs(offMin)
      const offHH = pad(Math.floor(absMin / 60))
      const offMM = pad(absMin % 60)
      return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}${sign}${offHH}:${offMM}`
    },

    async executeSearch() {
      this.errorMessage = null
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
