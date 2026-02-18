<template>
  <div class="log-entry-detail">
    <q-card flat bordered>
      <q-card-section class="row items-center q-gutter-sm">
        <q-chip v-if="entry?._index" dense square>{{ entry._index }}</q-chip>
        <q-chip v-if="entry?._id" dense square color="grey-7" text-color="white">{{
          entry._id
        }}</q-chip>
      </q-card-section>

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

      <q-card-section v-if="highlightKeys.length">
        <q-banner dense class="bg-blue-1 text-blue-10 q-mb-sm">Search highlights</q-banner>
        <div class="q-gutter-xs">
          <q-chip v-for="hk in highlightKeys" :key="hk" dense outline>
            {{ stripTags(entry.highlight[hk][0]) }}
          </q-chip>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section class="row items-center justify-between">
        <div class="text-subtitle2">Fields</div>
        <div class="q-gutter-sm">
          <q-btn dense flat @click="copyJSON(src)" label="Copy JSON" icon="content_copy" />
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
    </q-card>
  </div>
</template>

<script>
export default {
  name: 'LogEntryDetail',
  props: { entry: { type: Object, required: true } },
  emits: ['filter-must', 'filter-must-not'],
  data() {
    return { tab: 'fields' }
  },
  computed: {
    src() {
      return (this.entry && (this.entry._source || this.entry.fields)) || {}
    },
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
          if (v && typeof v === 'object' && !Array.isArray(v)) recurse(v, key)
          else result[key] = v
        }
      }
      recurse(this.src)
      return result
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
    formatValue(val) {
      if (Array.isArray(val)) return val.join(', ')
      if (typeof val === 'object') return JSON.stringify(val)
      return val
    },
  },
}
</script>

<style scoped>
.json-pre {
  white-space: pre;
  border-radius: 4px;
  overflow-x: auto;
}
.mono {
  color: #fc06dc;
  background: #f5f5f5;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
}
</style>
