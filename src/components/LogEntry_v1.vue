<template>
  <q-expansion-item dense switch-toggle-side expand-separator :label="headerLabel" icon="article">
    <q-card flat bordered class="q-mt-sm">
      <!-- Meta / chips -->
      <q-card-section class="row items-center q-gutter-sm">
        <q-chip v-if="entry._index" dense square>{{ entry._index }}</q-chip>
        <q-chip v-if="entry._id" dense square color="grey-8" text-color="white">
          _id: {{ entry._id }}
        </q-chip>
        <q-chip v-if="entry._score !== undefined" dense square> _score: {{ entry._score }} </q-chip>
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

      <!-- Message preview / body -->
      <q-card-section v-if="message">
        <div class="text-caption text-grey-6 q-mb-xs">Message</div>
        <pre class="log-pre">{{ message }}</pre>
      </q-card-section>

      <!-- Highlights (if ES returned them) -->
      <q-card-section v-if="highlightKeys.length">
        <q-banner dense class="bg-blue-1 text-blue-10 q-mb-sm"> Search highlights </q-banner>
        <div class="q-gutter-md">
          <div v-for="hk in highlightKeys" :key="hk">
            <div class="text-caption text-grey-6 q-mb-xs">{{ hk }}</div>
            <div class="q-gutter-xs">
              <q-chip v-for="(frag, i) in entry.highlight[hk]" :key="hk + '-' + i" dense outline>
                <!-- ES highlight may contain <em> tags; render as plain text here -->
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
    entry: {
      type: Object,
      required: true,
    },
  },
  computed: {
    src() {
      return (this.entry && (this.entry._source || this.entry.fields)) || {}
    },
    // Common fields (defensive lookups)
    ts() {
      return (
        this.src['@timestamp'] ||
        (Array.isArray(this.src['@timestamp']) ? this.src['@timestamp'][0] : null) ||
        this.src.timestamp ||
        this.src.time ||
        null
      )
    },
    message() {
      return (
        this.src.message ||
        this.src.msg ||
        this.src.log ||
        (typeof this.src === 'string' ? this.src : null)
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
    headerLabel() {
      const t = this.ts || '(no time)'
      const msg = this.messagePreview
      return msg ? `${t} — ${msg}` : `${t}`
    },
    messagePreview() {
      const text =
        typeof this.message === 'string'
          ? this.message
          : this.message != null
            ? JSON.stringify(this.message)
            : this.src && Object.keys(this.src).length
              ? '[no message]'
              : ''
      return text.length > 140 ? text.slice(0, 140) + '…' : text
    },
    highlightKeys() {
      return this.entry && this.entry.highlight ? Object.keys(this.entry.highlight) : []
    },
  },
  methods: {
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
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
}
.log-pre,
.json-pre {
  background: #1e1e1e;
  color: #f5f5f5;
  padding: 8px 10px;
  margin: 0;
  white-space: pre-wrap; /* wrap long lines in messages */
  word-break: break-word;
  border-radius: 4px;
  font-size: 12px;
}
.json-pre {
  white-space: pre; /* keep JSON aligned */
  overflow-x: auto;
}
</style>
