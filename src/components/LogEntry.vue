<template>
  <q-expansion-item dense switch-toggle-side expand-separator icon="article">
    <!-- Custom clickable header that also shows the message preview -->
    <template #header>
      <q-item-section>
        <div class="log-header-text">{{ headerText }}</div>
        <pre v-if="message" class="log-pre q-mt-xs">{{ message }}</pre>
      </q-item-section>
      <!-- <q-item-section side>
        <q-icon name="expand_more" />
      </q-item-section> -->
    </template>

    <!-- Expanded details (hidden by default) -->
    <q-card flat bordered class="q-mt-sm">
      <!-- Meta / chips -->
      <q-card-section class="row items-center q-gutter-sm">
        <q-chip v-if="entry._index" dense square>{{ entry._index }}</q-chip>
        <q-chip v-if="entry._id" dense square color="grey-8" text-color="white"
          >_id: {{ entry._id }}</q-chip
        >
        <q-chip v-if="entry._score !== undefined" dense square>_score: {{ entry._score }}</q-chip>
      </q-card-section>

      <!-- Key fields (if present) -->
      <q-card-section class="q-pt-none">
        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-6">
            <div class="text-caption text-grey-6 q-mb-xs">Timestamp</div>
            <div>{{ ts || '—' }}</div>
          </div>

          <div class="col-6 col-md-3" v-if="level">
            <div class="text-caption text-grey-6 q-mb-xs">Level</div>
            <div>{{ level }}</div>
          </div>

          <div class="col-6 col-md-3" v-if="host">
            <div class="text-caption text-grey-6 q-mb-xs">Host</div>
            <div>{{ host }}</div>
          </div>

          <div class="col-12 col-md-6" v-if="service">
            <div class="text-caption text-grey-6 q-mb-xs">Service</div>
            <div>{{ service }}</div>
          </div>

          <div class="col-12 col-md-6" v-if="correlationId">
            <div class="text-caption text-grey-6 q-mb-xs">Correlation ID</div>
            <div class="mono">{{ correlationId }}</div>
          </div>
        </div>
      </q-card-section>

      <!-- Highlights (if ES returned them) -->
      <q-card-section v-if="highlightKeys.length">
        <q-banner dense class="bg-blue-1 text-blue-10 q-mb-sm">Search highlights</q-banner>
        <div class="q-gutter-md">
          <div v-for="hk in highlightKeys" :key="hk">
            <div class="text-caption text-grey-6 q-mb-xs">{{ hk }}</div>
            <div class="q-gutter-xs">
              <q-chip v-for="(frag, i) in entry.highlight[hk]" :key="hk + '-' + i" dense outline>
                {{ stripTags(frag) }}
              </q-chip>
            </div>
          </div>
        </div>
      </q-card-section>

      <q-separator />

      <!-- Raw JSON toggles -->
      <q-card-section class="row items-center justify-between">
        <div class="text-subtitle2">Raw</div>
        <div class="q-gutter-sm">
          <q-btn
            dense
            flat
            @click="copyJSON(entry._source)"
            label="Copy _source JSON"
            icon="content_copy"
          />
          <q-btn dense flat @click="copyJSON(entry)" label="Copy hit JSON" icon="content_copy" />
        </div>
      </q-card-section>

      <q-card-section>
        <q-expansion-item dense label="_source" icon="data_object">
          <pre class="json-pre">{{ prettyJSON(src) }}</pre>
        </q-expansion-item>
        <q-expansion-item dense label="hit" icon="data_object">
          <pre class="json-pre">{{ prettyJSON(entry) }}</pre>
        </q-expansion-item>
      </q-card-section>
    </q-card>
  </q-expansion-item>
</template>

<script>
export default {
  name: 'LogEntry',
  props: {
    entry: { type: Object, required: true },
  },
  computed: {
    src() {
      return (this.entry && (this.entry._source || this.entry.fields)) || {}
    },

    // ---- Displayed message (multiline) ----
    message() {
      return (
        this.src.message ||
        this.src.msg ||
        this.src.log ||
        (typeof this.src === 'string' ? this.src : null)
      )
    },

    // ---- Header fields ----
    headerText() {
      const parts = []

      // @timestamp in YYYY.MM.DD HH:MM:SS.sss EDT
      const ts = this.tsHeader
      if (ts) parts.push(ts)

      // log.level (capitalize, special-case FIELDDEBUG)
      const lvl = this.formatLevel(this.get(this.src, ['log', 'level']))
      if (lvl) parts.push(lvl)

      // log.logger
      const logger = this.get(this.src, ['log', 'logger'])
      if (logger) parts.push(logger)

      // process.thread.name
      const thread = this.get(this.src, ['process', 'thread', 'name'])
      if (thread) parts.push(thread)

      // event.sequence
      const seq = this.get(this.src, ['event', 'sequence'])
      if (seq !== undefined && seq !== null && seq !== '') parts.push(String(seq))

      // labels.Type, labels.DN, labels.Group
      const lType = this.get(this.src, ['labels', 'Type'])
      const lDN = this.get(this.src, ['labels', 'DN'])
      const lGroup = this.get(this.src, ['labels', 'Group'])
      if (lType) parts.push(lType)
      if (lDN) parts.push(lDN)
      if (lGroup) parts.push(lGroup)

      // tags[] (extend the sequence)
      const tags = this.src.tags
      if (Array.isArray(tags) && tags.length) {
        for (const t of tags) {
          if (t !== undefined && t !== null && t !== '') parts.push(String(t))
        }
      }

      // trace.orig
      const traceOrig = this.get(this.src, ['trace', 'orig'])
      if (traceOrig) parts.push(traceOrig)

      return parts.join(' | ')
    },

    // Build timestamp for header per spec
    tsHeader() {
      const raw = this.ts
      if (!raw) return null
      return this.formatTimestampToET(raw)
    },

    // Fallbacks for details section (unchanged)
    ts() {
      return (
        this.src['@timestamp'] ||
        (Array.isArray(this.src['@timestamp']) ? this.src['@timestamp'][0] : null) ||
        this.src.timestamp ||
        this.src.time ||
        null
      )
    },
    level() {
      return this.src.level || this.src.loglevel || this.src.severity || null
    },
    host() {
      return (
        (this.src.host && (this.src.host.name || this.src.host.hostname)) ||
        this.src.hostname ||
        null
      )
    },
    service() {
      return (this.src.service && this.src.service.name) || this.src.app || this.src.program || null
    },
    correlationId() {
      return (
        this.src.correlationId ||
        this.src.correlation_id ||
        this.src.correlation ||
        this.src['x-correlation-id'] ||
        null
      )
    },
    highlightKeys() {
      return this.entry && this.entry.highlight ? Object.keys(this.entry.highlight) : []
    },
  },
  methods: {
    // Safe deep get
    get(obj, path) {
      return path.reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj)
    },

    // "Capitalize" with special case for FIELDDEBUG
    formatLevel(val) {
      if (!val && val !== 0) return null
      const s = String(val)
      if (s.toUpperCase() === 'FIELDDEBUG') return 'FieldDebug'
      return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
    },

    // Format to 'YYYY.MM.DD HH:MM:SS.sss EDT' in America/New_York
    formatTimestampToET(ts) {
      try {
        const d = new Date(ts)
        // Extract parts via Intl to honor timezone & get milliseconds
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
        // parts month/day are "MM"/"DD"; year is "YYYY"; hour/minute/second "HH"/"MM"/"SS"; fractionalSecond "sss"
        const yyyy = map.year
        const mm = map.month
        const dd = map.day
        const hh = map.hour
        const min = map.minute
        const ss = map.second
        const ms = map.fractionalSecond || '000'

        return `${yyyy}.${mm}.${dd} ${hh}:${min}:${ss}.${ms} EDT`
      } catch {
        // Fallback raw if formatting fails
        return String(ts) + ' EDT'
      }
    },

    prettyJSON(obj) {
      try {
        return JSON.stringify(obj, null, 2)
      } catch {
        return String(obj)
      }
    },
    stripTags(s) {
      return String(s || '').replace(/<[^>]*>/g, '')
    },
    async copyJSON(obj) {
      try {
        await navigator.clipboard.writeText(this.prettyJSON(obj))
        this.$q.notify({ type: 'positive', message: 'Copied to clipboard' })
      } catch {
        this.$q.notify({ type: 'warning', message: 'Copy failed' })
      }
    },
  },
}
</script>

<style scoped>
.mono {
  background: #dc3545;
  color: #f5f5f5;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
}
.log-header-text {
  background: #dc3545;
  color: #f5f5f5;
  font-weight: 500;
  font-size: 13px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.log-pre,
.json-pre {
  background: var(--q-dark-page);
  color: var(--q-primary);
  padding: 8px 10px;
  margin: 0;
  white-space: pre;
  word-break: break-word;
  border-radius: 4px;
  font-size: 13px;
  overflow-x: auto;
}
.json-pre {
  white-space: pre; /* keep JSON aligned */
  overflow-x: auto;
}
</style>
