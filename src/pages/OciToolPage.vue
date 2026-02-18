<template>
  <q-page class="q-pa-md q-gutter-md">
    <q-card class="q-pa-md">
      <q-card-section class="row q-col-gutter-md items-end">
        <div class="col-12 col-md-5">
          <FilterSelect
            v-model="selectedCommand"
            :options="commandOptions"
            :label="commandSelectLabel"
            option-value="value"
            option-label="label"
          />
        </div>
        <div class="col-12 col-md-4">
          <q-select
            v-model="selectedCluster"
            :options="clusterOptions"
            label="Cluster"
            outlined
            dense
            emit-value
            map-options
            :loading="clustersLoading"
            :disable="clustersLoading || !clusterOptions.length"
            clearable
          />
        </div>
        <div class="col-12 col-md-3 text-right">
          <q-btn flat dense icon="refresh" label="Reload" color="primary" @click="reloadData" />
        </div>
      </q-card-section>
    </q-card>

    <q-card>
      <q-card-section class="row items-center justify-between">
        <div class="text-h6">Command Details</div>
        <q-spinner v-if="detailsLoading" size="20px" color="primary" />
      </q-card-section>
      <q-card-section v-if="!selectedCommand" class="text-grey">
        Select a command to view the description and XSD.
      </q-card-section>
      <q-card-section v-else class="q-gutter-md">
        <div>
          <div class="text-subtitle2 text-grey">Description</div>
          <pre class="command-block">{{ descriptionText || 'No description available.' }}</pre>
        </div>
        <div>
          <div class="text-subtitle2 text-grey">XSD</div>
          <pre class="command-block">{{ xsdText || 'No XSD available.' }}</pre>
        </div>
      </q-card-section>
    </q-card>

    <q-card>
      <q-card-section class="row items-center justify-between">
        <div class="text-h6">Parameters</div>
        <div v-if="parametersLoading" class="text-caption text-grey">Loading parameters...</div>
      </q-card-section>
      <q-card-section>
        <q-input
          v-model="parametersInput"
          type="textarea"
          autogrow
          outlined
          label="Parameters (JSON)"
          :error="Boolean(parameterError)"
          :error-message="parameterError || ''"
        />
      </q-card-section>
      <q-separator />
      <q-card-section class="row items-center justify-between q-gutter-sm">
        <div class="text-caption text-grey">
          Command will POST to /broadworks/oci/{{ selectedCluster || '{cluster}' }}/
          {{ selectedCommand || '{command}' }}
        </div>
        <q-btn
          color="primary"
          icon="play_arrow"
          label="Execute"
          :loading="executing"
          :disable="!selectedCommand || !selectedCluster"
          @click="executeCommand"
        />
      </q-card-section>
      <q-separator />
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Response</div>
        <pre v-if="commandResponse" class="command-block">{{ commandResponse }}</pre>
        <div v-else class="text-grey">Run a command to see the response.</div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import FilterSelect from 'components/FilterSelect.vue'
import { emit_notification, tier3info_restful_request } from 'src/plugins/tier3info'
import { useTitleStore } from 'stores/titleStore'

const commandOptions = ref([])
const clusterOptions = ref([])
const selectedCommand = ref(null)
const selectedCluster = ref(null)
const commandDetails = ref(null)
const parametersInput = ref('')
const commandResponse = ref(null)

const commandsLoading = ref(false)
const clustersLoading = ref(false)
const detailsLoading = ref(false)
const parametersLoading = ref(false)
const executing = ref(false)
const parameterError = ref(null)

const commandSelectLabel = computed(() =>
  commandsLoading.value ? 'Loading commands...' : 'OCI Command',
)
const descriptionText = computed(() => commandDetails.value?._source?.description || '')
const xsdText = computed(() => commandDetails.value?._source?.xsd || '')

onMounted(() => {
  const titleStore = useTitleStore()
  titleStore.setMainTitle('Broadworks OCI Tool')
  reloadData()
})

function reloadData() {
  loadCommands()
  loadClusters()
}

async function loadCommands() {
  commandsLoading.value = true
  try {
    const response = await tier3info_restful_request({
      path: '/broadworks/oci/lookup',
      method: 'GET',
    })
    const data = response?.data
    let commandList = []
    if (Array.isArray(data)) {
      commandList = data
    } else if (data && typeof data === 'object') {
      commandList = Object.keys(data)
    }
    commandOptions.value = commandList.map((cmd) => ({
      label: cmd,
      value: cmd,
    }))
  } finally {
    commandsLoading.value = false
  }
}

async function loadClusters() {
  clustersLoading.value = true
  try {
    const response = await tier3info_restful_request({
      path: '/broadworks/clusters',
      method: 'GET',
    })
    const data = response?.data || []
    if (Array.isArray(data)) {
      clusterOptions.value = data.map((item) => {
        if (typeof item === 'string') {
          return { label: item, value: item }
        }
        if (item && typeof item === 'object') {
          const value = item.cluster || item.id || item.value || item.label || JSON.stringify(item)
          const label = item.label || item.cluster || item.id || value
          return { label: String(label), value: String(value) }
        }
        return { label: String(item), value: item }
      })
    } else if (data && typeof data === 'object') {
      clusterOptions.value = Object.keys(data).map((key) => ({
        label: data[key]?.label || key,
        value: key,
      }))
    }
  } finally {
    clustersLoading.value = false
  }
}

watch(selectedCommand, async (newCommand) => {
  commandDetails.value = null
  commandResponse.value = null
  parameterError.value = null
  parametersInput.value = ''
  if (!newCommand) {
    return
  }
  await Promise.all([fetchCommandDetails(newCommand), loadParameters(newCommand)])
})

async function fetchCommandDetails(command) {
  detailsLoading.value = true
  try {
    const response = await tier3info_restful_request({
      path: `/broadworks/oci/lookup/${command}`,
      method: 'GET',
    })
    commandDetails.value = response?.data || null
  } finally {
    detailsLoading.value = false
  }
}

async function loadParameters(command) {
  parametersLoading.value = true
  try {
    const response = await tier3info_restful_request({
      path: `/broadworks/oci/lookup/parameters/${command}`,
      method: 'GET',
    })
    const params = response?.data || []
    const paramObj = {}
    if (Array.isArray(params)) {
      params.forEach((p, idx) => {
        if (p && typeof p === 'object' && p.snake) {
          paramObj[p.snake] = ''
        } else if (typeof p === 'string') {
          paramObj[p] = ''
        } else {
          paramObj[`param_${idx + 1}`] = ''
        }
      })
    } else if (params && typeof params === 'object') {
      Object.keys(params).forEach((key) => {
        paramObj[key] = ''
      })
    }
    parametersInput.value = JSON.stringify(paramObj, null, 2)
  } finally {
    parametersLoading.value = false
  }
}

async function executeCommand() {
  parameterError.value = null
  commandResponse.value = null
  if (!selectedCommand.value) {
    emit_notification('negative', 'Please select a command.')
    return
  }
  if (!selectedCluster.value) {
    emit_notification('negative', 'Please select a cluster.')
    return
  }

  let parsedParams = {}
  if (parametersInput.value && parametersInput.value.trim()) {
    try {
      parsedParams = JSON.parse(parametersInput.value)
    } catch (err) {
      console.log('Error parsing parameters JSON:', err)
      parameterError.value = 'Parameters must be valid JSON.'
      emit_notification('negative', 'Parameters JSON is invalid.')
      return
    }
  }

  executing.value = true
  try {
    const response = await tier3info_restful_request({
      path: `/broadworks/oci/${selectedCluster.value}/${selectedCommand.value}`,
      method: 'POST',
      body: parsedParams,
    })
    if (response?.data !== undefined) {
      commandResponse.value = JSON.stringify(response.data, null, 2)
      emit_notification('positive', 'Command executed.')
    } else {
      commandResponse.value = 'No response received.'
    }
  } finally {
    executing.value = false
  }
}
</script>

<style scoped>
.command-block {
  white-space: pre-wrap;
  font-family: monospace;
  background: #f5f5f5;
  border-radius: 6px;
  padding: 12px;
  overflow-x: auto;
}
</style>
