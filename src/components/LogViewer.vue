<template>
  <div class="log-viewer">
    <q-card flat bordered>
      <q-card-section>
        <div class="text-h6">Log Viewer: {{ logData.hits.hits.length }} entries found</div>
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
