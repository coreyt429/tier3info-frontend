<template>
  <q-page class="q-pa-md">
    <q-card class="q-pa-md">
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
        <LogViewer :logData="searchResults" @filter-must="onMust" @filter-must-not="onMustNot" />
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
    }
  },
  methods: {
    async executeSearch() {
      this.errorMessage = null
      this.statusMessage = `Searching for ${this.queryString}... Please wait.`
      console.log('LogSearch.vue: executeSearch called with queryString:', this.queryString)
      console.log('LogSearch.vue: executeSearch called with queryFilters:', this.queryFilters)

      const request = {
        path: '/logtool/query',
        body: {
          query_string: this.queryString,
          filters: this.queryFilters,
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
      this.queryFilters.push({ must: true, field: event.key, value: event.value })
      console.log(
        'LogSearch.vue: onMust added filter:',
        this.queryFilters[this.queryFilters.length - 1],
      )
    },
    onMustNot(event) {
      // event: { key: string, value: any }
      this.queryFilters.push({ must: false, field: event.key, value: event.value })
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
  },
}
</script>

<style scoped>
.q-banner {
  text-align: center;
}
</style>
