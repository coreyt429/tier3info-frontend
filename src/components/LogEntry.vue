<template>
  <q-expansion-item dense hide-expand-icon>
    <!-- Custom clickable header that also shows the message preview -->
    <template #header>
      <!-- Left side: message preview (does NOT toggle) -->
      <q-item-section @click.stop="selectEntry" class="log-item-section">
        <pre class="log-pre q-my-sm">
<span class="log-header-text">{{ headerText }}</span>


<span v-if="message" class="message-scroll">        {{ message }}</span>

        </pre>
      </q-item-section>

      <!-- Right side: explicit toggle button -->
      <q-item-section side="right" avatar class="log-toggle-top">
        <q-btn
          dense
          flat
          round
          size="xs"
          :icon="'chevron_right'"
          aria-label="Show details"
          @click.stop="selectEntry"
        />
      </q-item-section>
    </template>

    <!-- Expanded details (hidden by default) -->
    <q-card v-if="false" flat bordered class="q-mt-sm expand-scroll">
      <div class="row no-wrap">
        <div class="col">
          <!-- Meta / chips -->
          <q-card-section class="row items-center q-gutter-sm">
            <q-chip v-if="entry._index" dense square>{{ entry._index }}</q-chip>
            <q-chip v-if="entry._id" dense square color="grey-7" text-color="white">{{
              entry._id
            }}</q-chip>
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
                  <q-chip
                    v-for="(frag, i) in entry.highlight[hk]"
                    :key="hk + '-' + i"
                    dense
                    outline
                  >
                    {{ stripTags(frag) }}
                  </q-chip>
                </div>
              </div>
            </div>
          </q-card-section>

          <q-separator />

          <!-- Raw JSON toggles -->
          <q-card-section class="row items-center justify-between">
            <div class="text-subtitle2">Fields</div>
            <div class="q-gutter-sm">
              <q-btn
                dense
                flat
                @click="copyJSON(entry._source)"
                label="Copy JSON"
                icon="content_copy"
              />
            </div>
          </q-card-section>

          <q-card-section>
            <q-tabs v-model="tab" dense>
              <q-tab name="fields" label="Fields" />
              <q-tab name="json" label="JSON" />
            </q-tabs>

            <q-separator />

            <q-tab-panels v-model="tab" animated>
              <q-tab-panel name="fields">
                <q-markup-table dense flat class="q-pa-none full-width">
                  <colgroup>
                    <col style="width: 1%" />
                    <col style="width: auto" />
                    <col style="width: 100%" />
                  </colgroup>
                  <tbody>
                    <tr v-for="(value, key) in flattened" :key="key">
                      <td class="text-left">
                        <q-btn
                          dense
                          flat
                          size="sm"
                          icon="add"
                          @click="$emit('filter-must', { key, value })"
                        />
                        <q-btn
                          dense
                          flat
                          size="sm"
                          icon="remove"
                          @click="$emit('filter-must-not', { key, value })"
                        />
                      </td>
                      <td class="text-weight-medium">{{ key }}</td>
                      <td class="text-left">
                        <pre class="q-ma-none">{{ formatValue(value) }}</pre>
                      </td>
                    </tr>
                  </tbody>
                </q-markup-table>
              </q-tab-panel>
              <q-tab-panel name="json">
                <pre class="json-pre">{{ prettyJSON(src) }}</pre>
              </q-tab-panel>
            </q-tab-panels>
          </q-card-section>
        </div>
        <!-- Right-side filler to align with header toggle -->
        <div class="log-toggle" style="visibility: hidden"></div>
      </div>
    </q-card>
  </q-expansion-item>
</template>

<script>
export default {
  name: 'LogEntry',
  props: {
    entry: { type: Object, required: true },
  },
  data() {
    return {
      tab: 'fields',
      // expanded: false,
    }
  },
  computed: {
    src() {
      return (this.entry && (this.entry._source || this.entry.fields)) || {}
    },

    // ---- Displayed message (multiline) ----
    message() {
      const msg =
        this.src.message ||
        this.src.msg ||
        this.src.log ||
        (typeof this.src === 'string' ? this.src : null)

      if (msg === 'CDR' && this.src.cdr) {
        try {
          return 'Call Detail Record:\n' + JSON.stringify(this.src.cdr, null, 2)
        } catch {
          return 'Call Detail Record:\n' + String(this.src.cdr)
        }
      }

      return msg
    },

    // ---- Header fields ----
    headerText() {
      const parts = []

      // @timestamp in YYYY.MM.DD HH:MM:SS.sss EDT
      const ts = this.tsHeader
      if (ts) parts.push(ts)

      const hostname = this.get(this.src, ['host', 'hostname'])
      if (hostname) parts.push(hostname.split('.')[0])

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
    flattened() {
      const result = {}
      const recurse = (obj, prefix = '') => {
        for (const [k, v] of Object.entries(obj || {})) {
          const key = prefix ? `${prefix}.${k}` : k
          if (v && typeof v === 'object' && !Array.isArray(v)) {
            recurse(v, key)
          } else {
            result[key] = v
          }
        }
      }
      recurse(this.src)
      return result
    },
  },
  emits: ['filter-must', 'filter-must-not', 'entry-selected'],
  methods: {
    // Safe deep get
    get(obj, path) {
      return path.reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj)
    },
    selectEntry() {
      this.$emit('entry-selected', this.entry)
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
    formatValue(val) {
      if (Array.isArray(val)) return val.join(', ')
      if (typeof val === 'object') return JSON.stringify(val)
      return val
    },
  },
}
</script>

<style scoped>
.mono {
  color: #fc06dc;
  background: #f5f5f5;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
}
.log-header-text {
  color: #ca1326;
  font-weight: 500;
  font-size: 13px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
  /* white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis; */
}
.log-pre,
.json-pre {
  /* background: #dfdddd; */
  background-color: white;
  background: white;
  color: var(--q-primary);
  padding: 8px 10px;
  margin: 0;
  white-space: pre-wrap;
  /* word-break: break-word; */
  font-size: 13px;
  overflow-x: auto;
}
.json-pre {
  white-space: pre; /* keep JSON aligned */
  border-radius: 4px;
  overflow-x: auto;
}
.log-pre {
  display: flex;
  border: 0px;
  border-radius: 0px;
  flex-direction: column;
  align-items: flex-start;
  flex: 1 1 auto;
  min-height: 0;
}
.log-toggle {
  /* Keep the right toggle/filler narrow and fixed width */
  flex: 0 0 28px;
  width: 28px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
.message-scroll {
  display: block;
  flex: 1 1 auto;
  min-height: 0; /* allows child to shrink within flex container */
  max-height: 100%;
  width: 100%;
  overflow-y: auto;
  vertical-align: top;
}
.log-item-section {
  /* max-height: 400px;
  overflow: hidden; */
  display: flex;
  flex-direction: column;
}
.log-toggle-top {
  align-items: flex-start !important;
  justify-content: flex-start !important;
}

/* .expand-scroll {
  max-height: 400px;
  overflow-y: auto;
} */
</style>
