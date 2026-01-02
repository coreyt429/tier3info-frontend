<template>
  <q-page class="q-pa-md">
    <q-card class="q-pa-md">
      <q-card-section class="row items-center q-col-gutter-md">
        <div class="col-5 q-mb-xs">
          <q-input v-model="index" label="Index" outlined dense clearable />
        </div>
        <div class="col-5 q-mb-xs">
          <q-input v-model="record" label="Record" outlined dense clearable />
        </div>
        <div class="col-2 q-mb-xs text-center">
          <q-btn
            :disable="!index || !record"
            color="primary"
            icon="search"
            label="Search"
            class="q-mt-none"
            :disabled="searchDisabled"
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
import LogViewer from 'components/LogViewer_v1.vue'

export default {
  components: { LogViewer },
  created() {
    const titleStore = useTitleStore()
    titleStore.setMainTitle('Audit Log Trace')

    const route = useRoute()
    if (route.query.index && route.query.record) {
      this.index = route.query.index
      this.record = route.query.record
      this.executeSearch()
    }
  },
  data() {
    return {
      index: '',
      record: '',
      jobId: null,
      statusMessage: null,
      waitCounter: 0,
      searchDisabled: false,
      searchResults: null,
      errorMessage: null,
    }
  },
  methods: {
    onEntrySelected(entry) {
      try {
        window.dispatchEvent(new CustomEvent('log-entry-selected', { detail: entry }))
      } catch (e) {
        console.error('AuditLogTrace.vue: error dispatching log-entry-selected', e)
      }
    },
    async executeSearch() {
      this.errorMessage = null
      this.statusMessage = `Searching for index ${this.index}, record ${this.record}...`
      const request = {
        path: '/logtool/auditlog_trace',
        body: {
          index: this.index,
          record: this.record,
        },
        method: 'POST',
      }
      const response = await tier3info_restful_request(request)
      if (!response || !response.data) {
        this.errorMessage = 'Invalid response from server. Please try again later.'
        this.statusMessage = null
        return
      }
      this.jobId = response.data.job_id
      setTimeout(() => {
        this.waitCounter = 0
        this.checkJobStatus()
      }, 500)
    },
    async checkJobStatus() {
      const request = {
        path: `/jobs/${this.jobId}`,
        method: 'GET',
      }
      const response = await tier3info_restful_request(request)
      if (!response || !response.data) {
        this.statusMessage = null
        this.errorMessage = 'Invalid response from server. Please try again later.'
        return
      }
      if (response.data.status === 'completed') {
        try {
          const tmpData = JSON.parse(response.data._data) || 'No results found.'
          this.searchResults = tmpData.response || { hits: { total: 0, hits: [] } }
          await tier3info_restful_request({
            path: `/jobs/${this.jobId}`,
            method: 'DELETE',
          })
        } catch (error) {
          console.log('Error parsing search results:', error)
          this.errorMessage = 'Error parsing search results. Please try again later.'
          this.searchResults = null
        }
        this.statusMessage = null
      } else {
        this.waitCounter += 1
        if (this.waitCounter > 60) {
          this.statusMessage = 'Job is taking too long. Please try again later.'
          setTimeout(() => {
            this.statusMessage = null
          }, 5000)
          return
        } else {
          this.statusMessage = `Waiting on search data... (${this.waitCounter / 2} seconds)`
          setTimeout(() => {
            this.checkJobStatus()
          }, 5000)
        }
      }
    },
    onMust(event) {
      console.log('AuditLogTrace.vue: onMust called with event:', event)
    },
    onMustNot(event) {
      console.log('AuditLogTrace.vue: onMustNot called with event:', event)
    },
  },
}
</script>

<style scoped>
.q-banner {
  text-align: center;
}
</style>
