<template>
  <div class="log-viewer">
    <q-card flat bordered>
      <q-card-section class="row items-center justify-between">
        <div class="text-h6">Log Viewer: {{ logData.hits.hits.length }} entries found</div>
        <div class="q-gutter-sm">
          <q-btn
            dense
            flat
            round
            icon="description"
            @click="saveAsText"
            :title="'Save text view'"
          />
          <q-btn dense flat round icon="code" @click="saveAsJson" :title="'Save raw JSON'" />
        </div>
      </q-card-section>
      <q-card-section>
        <div v-if="logData.hits && logData.hits.hits">
          <LogEntry v-for="(entry, index) in logData.hits.hits" :key="index" :entry="entry" />
        </div>
        <div v-else>
          <p>No log entries found.</p>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script>
import LogEntry from 'src/components/LogEntry.vue'
export default {
  components: { LogEntry },
  name: 'LogViewer',
  props: {
    logData: {
      type: Object,
      required: true,
    },
  },
  methods: {
    saveAsJson() {
      const blob = new Blob([JSON.stringify(this.logData, null, 2)], { type: 'application/json' })
      this.downloadBlob(blob, 'json')
    },
    saveAsText() {
      const entries = this.logData.hits?.hits || []
      const lines = entries.map((entry) => {
        const src = entry._source || entry.fields || {}

        const get = (obj, path) =>
          path.reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj)

        const formatLevel = (val) => {
          if (!val && val !== 0) return null
          const s = String(val)
          if (s.toUpperCase() === 'FIELDDEBUG') return 'FieldDebug'
          return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
        }

        const parts = []

        const ts = get(src, ['@timestamp']) || get(src, ['timestamp']) || get(src, ['time'])
        if (ts) parts.push(ts)

        const lvl = formatLevel(get(src, ['log', 'level']))
        if (lvl) parts.push(lvl)

        const logger = get(src, ['log', 'logger'])
        if (logger) parts.push(logger)

        const thread = get(src, ['process', 'thread', 'name'])
        if (thread) parts.push(thread)

        const seq = get(src, ['event', 'sequence'])
        if (seq !== undefined && seq !== null && seq !== '') parts.push(String(seq))

        const lType = get(src, ['labels', 'Type'])
        const lDN = get(src, ['labels', 'DN'])
        const lGroup = get(src, ['labels', 'Group'])
        if (lType) parts.push(lType)
        if (lDN) parts.push(lDN)
        if (lGroup) parts.push(lGroup)

        const tags = src.tags
        if (Array.isArray(tags) && tags.length) {
          for (const t of tags) {
            if (t !== undefined && t !== null && t !== '') parts.push(String(t))
          }
        }

        const traceOrig = get(src, ['trace', 'orig'])
        if (traceOrig) parts.push(traceOrig)

        const header = parts.join(' | ')
        const msg = src.message || src.msg || src.log || (typeof src === 'string' ? src : '')

        return `${header}\n\n        ${msg || ''}\n\n`
      })

      const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
      this.downloadBlob(blob, 'txt')
    },
    downloadBlob(blob, ext) {
      const now = new Date()
      const pad = (n) => String(n).padStart(2, '0')
      const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(
        now.getHours(),
      )}${pad(now.getMinutes())}${pad(now.getSeconds())}`
      const filename = `log_data_${ts}.${ext}`

      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      link.click()
      URL.revokeObjectURL(link.href)
    },
  },
}
</script>

<style scoped>
.log-viewer {
  width: 100%;
}
pre {
  background-color: #1e1e1e;
  color: #f5f5f5;
  padding: 1em;
  overflow-x: auto;
}
</style>
