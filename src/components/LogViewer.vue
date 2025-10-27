<template>
  <div class="log-viewer">
    <div v-if="entries && entries.length">
      <LogEntry
        v-for="(entry, index) in entries"
        :key="index"
        :entry="entry"
        @filter-must="$emit('filter-must', $event)"
        @filter-must-not="$emit('filter-must-not', $event)"
        @entry-selected="$emit('entry-selected', $event)"
      />
    </div>
    <div v-else>
      <p>No log entries found.</p>
    </div>
  </div>
</template>

<script>
import LogEntry from 'src/components/LogEntry.vue'
export default {
  components: { LogEntry },
  name: 'LogViewer',
  props: {
    // Legacy full-result prop (kept for compatibility)
    logData: {
      type: Object,
      required: false,
      default: () => ({ hits: { hits: [] } }),
    },
    // Windowed/virtualization props
    // Defaults assume LogEntry heights: 400px collapsed, ~800px expanded
    totalCount: { type: Number, required: false, default: null },
    windowStartIndex: { type: Number, required: false, default: 0 },
    items: { type: Array, required: false, default: null },
    avgItemPx: { type: Number, required: false, default: 400 },
    sliceSize: { type: Number, required: false, default: 80 },
    searchId: { type: String, required: false, default: null },
    busy: { type: Boolean, required: false, default: false },
    error: { type: String, required: false, default: null },
    viewPortHeight: { type: Number, required: false, default: 800 },
  },
  computed: {
    entries() {
      return this.hasWindowedItems ? this.items : this.legacyHits
    },
    legacyHits() {
      return this.logData && this.logData.hits && this.logData.hits.hits
        ? this.logData.hits.hits
        : []
    },
    hasWindowedItems() {
      return Array.isArray(this.items) && this.items.length > 0
    },
    windowedItems() {
      return this.hasWindowedItems ? this.items : []
    },
    displayCount() {
      if (this.totalCount != null) return this.totalCount
      return this.entries.length
    },
  },
  emits: [
    'filter-must',
    'filter-must-not',
    'request-range',
    'rendered-range-changed',
    'filter-change',
    'find-request',
    'jump-to-index',
    'entry-selected',
  ],
  methods: {
    formatTimestampToET(ts) {
      try {
        const d = new Date(ts)
        const parts = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/New_York',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          fractionalSecondDigits: 3,
        }).formatToParts(d)
        const map = Object.fromEntries(parts.map((p) => [p.type, p.value]))
        const yyyy = map.year
        const mm = map.month
        const dd = map.day
        const hh = map.hour
        const min = map.minute
        const ss = map.second
        const ms = map.fractionalSecond || '000'
        return `${yyyy}.${mm}.${dd} ${hh}:${min}:${ss}.${ms} EDT`
      } catch {
        return String(ts) + ' EDT'
      }
    },
    saveAsJson() {
      const payload = this.hasWindowedItems
        ? { windowStartIndex: this.windowStartIndex, items: this.items }
        : this.logData
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      this.downloadBlob(blob, 'json')
    },
    saveAsText() {
      const entries = this.hasWindowedItems ? this.items : this.logData.hits?.hits || []
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
        if (ts) parts.push(this.formatTimestampToET(ts))

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
    onVirtualScroll(info) {
      // info: { from, to, direction }
      const absStart = this.windowStartIndex + info.from
      const absEnd = this.windowStartIndex + info.to
      this.$emit('rendered-range-changed', { start: absStart, end: absEnd })
      this.maybeRequestMore(info)
    },
    maybeRequestMore(info) {
      if (!this.hasWindowedItems) return
      const buffer = Math.floor(this.sliceSize * 0.5)
      const nearStart = info.from <= buffer
      const nearEnd = info.to >= this.items.length - buffer

      if (nearStart && this.windowStartIndex > 0) {
        const wantStart = Math.max(0, this.windowStartIndex - this.sliceSize)
        const wantEnd = this.windowStartIndex + buffer
        this.$emit('request-range', {
          start: wantStart,
          end: wantEnd,
          reason: 'scroll',
          searchId: this.searchId || undefined,
        })
      } else if (nearEnd && this.totalCount != null) {
        const globalEnd = this.windowStartIndex + this.items.length
        if (globalEnd < this.totalCount) {
          const wantStart = this.windowStartIndex + this.items.length - buffer
          const wantEnd = Math.min(this.totalCount, wantStart + this.sliceSize)
          this.$emit('request-range', {
            start: wantStart,
            end: wantEnd,
            reason: 'scroll',
            searchId: this.searchId || undefined,
          })
        }
      }
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
