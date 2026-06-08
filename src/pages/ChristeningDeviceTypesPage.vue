<template>
  <q-page class="flex flex-start">
    <div class="q-pa-md full-width">
      <q-card class="q-mt-md bordered">
        <q-card-section class="row items-center q-col-gutter-md">
          <div class="col-12 col-md-5">
            <FilterSelect
              v-model="selectedDeviceTypeId"
              :options="deviceTypeOptions"
              label="Device Type"
              option-value="value"
              option-label="label"
            />
          </div>
          <div class="col row justify-end q-gutter-sm">
            <q-btn color="positive" icon="add" label="Add" @click="openAddDialog" />
            <q-btn
              color="primary"
              icon="save"
              label="Save"
              :disable="!selectedDeviceTypeId || !currentDeviceType"
              @click="saveDeviceType"
            />
            <q-btn
              color="negative"
              icon="delete"
              label="Delete"
              :disable="!selectedDeviceTypeId"
              @click="deleteDialog = true"
            />
          </div>
        </q-card-section>
      </q-card>

      <q-card v-if="currentDeviceType" class="q-mt-md">
        <q-card-section class="row q-col-gutter-md">
          <div class="col-12 col-sm-3">
            <q-field dense outlined stack-label label="Device Type ID">
              <template v-slot:control>
                <div class="self-center full-width no-outline">{{ currentDeviceType.device_type_id }}</div>
              </template>
            </q-field>
          </div>
          <div class="col-12 col-sm-3">
            <q-field dense outlined stack-label label="Models">
              <template v-slot:control>
                <div class="self-center full-width no-outline">{{ modelCount }}</div>
              </template>
            </q-field>
          </div>
          <div class="col-12 col-sm-3">
            <q-field dense outlined stack-label label="Templates">
              <template v-slot:control>
                <div class="self-center full-width no-outline">{{ templateCount }}</div>
              </template>
            </q-field>
          </div>
          <div class="col-12 col-sm-3">
            <q-field dense outlined stack-label label="Upgrade Rules">
              <template v-slot:control>
                <div class="self-center full-width no-outline">{{ upgradeRuleCount }}</div>
              </template>
            </q-field>
          </div>
          <div class="col-12 col-md-6">
            <q-field dense outlined stack-label label="Created">
              <template v-slot:control>
                <div class="self-center full-width no-outline">{{ currentDeviceType.created || '' }}</div>
              </template>
            </q-field>
          </div>
          <div class="col-12 col-md-6">
            <q-field dense outlined stack-label label="Updated">
              <template v-slot:control>
                <div class="self-center full-width no-outline">{{ currentDeviceType.updated || '' }}</div>
              </template>
            </q-field>
          </div>
        </q-card-section>

        <q-separator />

        <q-tabs v-model="activeTab" dense align="left" active-color="primary" indicator-color="primary">
          <q-tab name="models" icon="devices" label="Models" />
          <q-tab name="templates" icon="description" label="Templates" />
          <q-tab name="upgrade_rules" icon="system_update_alt" label="Upgrade Rules" />
          <q-tab name="user_agents" icon="rule" label="User Agents" />
          <q-tab name="vendors" icon="business" label="Vendors" />
          <q-tab name="raw" icon="data_object" label="Raw" />
        </q-tabs>

        <q-separator />

        <q-tab-panels v-model="activeTab" animated>
          <q-tab-panel name="models">
            <DeviceTypeStringListEditor
              :model-value="currentDeviceType.models || []"
              title="Models"
              item-label="Model"
              @update:model-value="(value) => updateCurrentField('models', value)"
            />
          </q-tab-panel>

          <q-tab-panel name="templates">
            <DeviceTypeTemplatesEditor
              :model-value="currentDeviceType.templates || {}"
              @update:model-value="(value) => updateCurrentField('templates', value)"
            />
          </q-tab-panel>

          <q-tab-panel name="upgrade_rules">
            <DeviceTypeUpgradeRulesEditor
              :model-value="currentDeviceType.upgrade_rules || {}"
              :models="currentDeviceType.models || []"
              @update:model-value="(value) => updateCurrentField('upgrade_rules', value)"
            />
          </q-tab-panel>

          <q-tab-panel name="user_agents">
            <DeviceTypeUserAgentsEditor
              :model-value="currentDeviceType.user_agents || []"
              @update:model-value="(value) => updateCurrentField('user_agents', value)"
            />
          </q-tab-panel>

          <q-tab-panel name="vendors">
            <DeviceTypeStringListEditor
              :model-value="currentDeviceType.vendors || []"
              title="Vendors"
              item-label="Vendor"
              @update:model-value="(value) => updateCurrentField('vendors', value)"
            />
          </q-tab-panel>

          <q-tab-panel name="raw">
            <q-input
              v-model="rawEditorText"
              outlined
              type="textarea"
              label="Raw JSON"
              input-class="raw-json-textarea"
            />
            <div class="row justify-end q-mt-md">
              <q-btn color="primary" icon="check" label="Apply JSON" @click="applyRawJson" />
            </div>
          </q-tab-panel>
        </q-tab-panels>
      </q-card>

      <q-card v-else class="q-mt-md">
        <q-card-section class="text-grey-7">Select or add a device type.</q-card-section>
      </q-card>

      <q-dialog v-model="addDialog" persistent :backdrop-filter="backdropFilter">
        <q-card style="min-width: 350px">
          <q-card-section>
            <div class="text-h6">Enter an ID for the new device type</div>
          </q-card-section>
          <q-card-section class="q-pt-none">
            <q-input v-model="addId" dense autofocus label="Device type ID" @keyup.enter="addDeviceType" />
          </q-card-section>
          <q-card-actions align="right">
            <q-btn label="Cancel" color="secondary" icon="cancel" v-close-popup />
            <q-btn label="Add" color="positive" icon="add" @click="addDeviceType" />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <q-dialog v-model="deleteDialog" persistent :backdrop-filter="backdropFilter">
        <q-card>
          <q-card-section class="row items-center">
            <q-avatar icon="warning" color="negative" text-color="white" />
            <span class="q-ml-sm">You are about to delete device type {{ selectedDeviceTypeId }}.</span>
          </q-card-section>
          <q-card-actions align="right">
            <q-btn label="Cancel" color="secondary" icon="cancel" v-close-popup />
            <q-btn label="Delete" icon="delete" color="negative" @click="deleteDeviceType" />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FilterSelect from 'src/components/FilterSelect.vue'
import DeviceTypeStringListEditor from 'src/components/DeviceTypeStringListEditor.vue'
import DeviceTypeTemplatesEditor from 'src/components/DeviceTypeTemplatesEditor.vue'
import DeviceTypeUpgradeRulesEditor from 'src/components/DeviceTypeUpgradeRulesEditor.vue'
import DeviceTypeUserAgentsEditor from 'src/components/DeviceTypeUserAgentsEditor.vue'
import { emit_notification, tier3info_restful_request } from 'src/plugins/tier3info.js'
import { useTitleStore } from 'stores/titleStore'

const endpoint = '/christening/device_types'
const route = useRoute()
const router = useRouter()
const titleStore = useTitleStore()

titleStore.setMainTitle(route.meta.title || 'Christening Device Types')

const activeTab = ref('models')
const addDialog = ref(false)
const addId = ref('')
const deleteDialog = ref(false)
const backdropFilter = ref('brightness(60%)')
const selectedDeviceTypeId = ref(null)
const currentDeviceType = ref(null)
const deviceTypesById = ref({})
const rawEditorText = ref('')

const deviceTypeOptions = computed(() => Object.keys(deviceTypesById.value).sort())
const modelCount = computed(() => currentDeviceType.value?.models?.length || 0)
const templateCount = computed(() => Object.keys(currentDeviceType.value?.templates || {}).length)
const upgradeRuleCount = computed(
  () =>
    Object.values(currentDeviceType.value?.upgrade_rules || {}).filter(
      (value) => value && typeof value === 'object' && !Array.isArray(value),
    ).length,
)

function normalizeId(value) {
  const normalized = String(value ?? '').trim()
  return normalized || null
}

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? {}))
}

function routeBasePath() {
  return route.matched[0]?.path || route.path
}

async function syncRouteWithSelection(deviceTypeId) {
  const normalizedId = normalizeId(deviceTypeId)
  const routeSelection = normalizeId(route.params.selectedItem)
  if (normalizedId === routeSelection) {
    return
  }
  await router.replace({
    path: normalizedId ? `${routeBasePath()}/${encodeURIComponent(normalizedId)}` : routeBasePath(),
    query: route.query,
    hash: route.hash,
  })
}

function normalizeDeviceType(deviceTypeId, deviceType = {}) {
  const id = normalizeId(deviceType.device_type_id || deviceTypeId)
  return {
    created: deviceType.created || null,
    device_type_id: id,
    models: Array.isArray(deviceType.models) ? deviceType.models.map((model) => String(model).trim()).filter(Boolean) : [],
    templates: deviceType.templates && typeof deviceType.templates === 'object' ? deviceType.templates : {},
    updated: deviceType.updated || null,
    upgrade_rules:
      deviceType.upgrade_rules && typeof deviceType.upgrade_rules === 'object' ? deviceType.upgrade_rules : {},
    user_agents: Array.isArray(deviceType.user_agents)
      ? deviceType.user_agents.map((rule) => ({
          regex: String(rule.regex ?? '').trim(),
          fields: Array.isArray(rule.fields) ? rule.fields.map((field) => String(field).trim()).filter(Boolean) : [],
          dpts: Array.isArray(rule.dpts) ? rule.dpts.map((dpt) => String(dpt).trim()).filter(Boolean) : [],
        }))
      : [],
    vendors: Array.isArray(deviceType.vendors)
      ? deviceType.vendors.map((vendor) => String(vendor).trim()).filter(Boolean)
      : [],
  }
}

async function fetchDeviceTypes() {
  const response = await tier3info_restful_request({
    method: 'GET',
    path: `${endpoint}/?include=data`,
  })
  if (!response || response.status !== 200 || !response.data) {
    emit_notification('negative', 'Failed to load christening device types.')
    return
  }
  deviceTypesById.value = response.data
  const routeSelection = normalizeId(route.params.selectedItem)
  if (routeSelection && Object.hasOwn(response.data, routeSelection)) {
    selectedDeviceTypeId.value = routeSelection
  } else if (!selectedDeviceTypeId.value && deviceTypeOptions.value.length) {
    selectedDeviceTypeId.value = deviceTypeOptions.value[0]
  }
}

function loadCurrentDeviceType(deviceTypeId) {
  const normalizedId = normalizeId(deviceTypeId)
  if (!normalizedId || !Object.hasOwn(deviceTypesById.value, normalizedId)) {
    currentDeviceType.value = null
    rawEditorText.value = ''
    return
  }
  currentDeviceType.value = normalizeDeviceType(normalizedId, clone(deviceTypesById.value[normalizedId]))
  rawEditorText.value = JSON.stringify(currentDeviceType.value, null, 2)
}

function updateCurrentField(field, value) {
  if (!currentDeviceType.value) {
    return
  }
  currentDeviceType.value = {
    ...currentDeviceType.value,
    [field]: value,
  }
  rawEditorText.value = JSON.stringify(currentDeviceType.value, null, 2)
}

function applyRawJson() {
  try {
    const parsed = JSON.parse(rawEditorText.value)
    currentDeviceType.value = normalizeDeviceType(selectedDeviceTypeId.value, parsed)
    rawEditorText.value = JSON.stringify(currentDeviceType.value, null, 2)
    emit_notification('positive', 'Raw JSON applied.')
  } catch (error) {
    emit_notification('negative', `Invalid JSON: ${error.message}`)
  }
}

async function saveDeviceType() {
  const deviceTypeId = normalizeId(selectedDeviceTypeId.value)
  if (!deviceTypeId || !currentDeviceType.value) {
    emit_notification('negative', 'Select a device type before saving.')
    return
  }
  const body = normalizeDeviceType(deviceTypeId, currentDeviceType.value)
  const response = await tier3info_restful_request({
    method: 'PUT',
    path: `${endpoint}/${encodeURIComponent(deviceTypeId)}`,
    body,
  })
  if (response && response.status === 200) {
    deviceTypesById.value = { ...deviceTypesById.value, [deviceTypeId]: body }
    currentDeviceType.value = clone(body)
    rawEditorText.value = JSON.stringify(currentDeviceType.value, null, 2)
    emit_notification('positive', 'Device type saved successfully.')
  } else {
    emit_notification('negative', 'Failed to save device type.')
  }
}

function openAddDialog() {
  addId.value = ''
  addDialog.value = true
}

async function addDeviceType() {
  const deviceTypeId = normalizeId(addId.value)
  if (!deviceTypeId) {
    emit_notification('negative', 'Enter a valid device type ID.')
    return
  }
  if (Object.hasOwn(deviceTypesById.value, deviceTypeId)) {
    emit_notification('negative', 'This device type already exists.')
    return
  }
  const body = normalizeDeviceType(deviceTypeId, {
    device_type_id: deviceTypeId,
    models: [],
    templates: {},
    upgrade_rules: { url_template: '' },
    user_agents: [],
    vendors: [],
  })
  const response = await tier3info_restful_request({
    method: 'PUT',
    path: `${endpoint}/${encodeURIComponent(deviceTypeId)}`,
    body,
  })
  if (response && response.status === 200) {
    deviceTypesById.value = { ...deviceTypesById.value, [deviceTypeId]: body }
    selectedDeviceTypeId.value = deviceTypeId
    addDialog.value = false
    emit_notification('positive', 'Device type added successfully.')
  } else {
    emit_notification('negative', 'Failed to add device type.')
  }
}

async function deleteDeviceType() {
  const deviceTypeId = normalizeId(selectedDeviceTypeId.value)
  if (!deviceTypeId) {
    return
  }
  const response = await tier3info_restful_request({
    method: 'DELETE',
    path: `${endpoint}/${encodeURIComponent(deviceTypeId)}`,
  })
  if (response && response.status === 200) {
    const nextDeviceTypes = { ...deviceTypesById.value }
    delete nextDeviceTypes[deviceTypeId]
    deviceTypesById.value = nextDeviceTypes
    selectedDeviceTypeId.value = deviceTypeOptions.value[0] || null
    deleteDialog.value = false
    emit_notification('positive', 'Device type deleted successfully.')
  } else {
    emit_notification('negative', 'Failed to delete device type.')
  }
}

watch(selectedDeviceTypeId, async (nextId) => {
  const normalizedId = normalizeId(nextId)
  if (normalizedId !== nextId) {
    selectedDeviceTypeId.value = normalizedId
    return
  }
  loadCurrentDeviceType(normalizedId)
  await syncRouteWithSelection(normalizedId)
})

watch(
  () => route.params.selectedItem,
  (routeSelection) => {
    const normalizedSelection = normalizeId(routeSelection)
    if (normalizedSelection !== selectedDeviceTypeId.value) {
      selectedDeviceTypeId.value = normalizedSelection
    }
  },
)

await fetchDeviceTypes()
</script>

<style lang="scss" scoped>
:deep(.raw-json-textarea) {
  font-family: monospace;
  min-height: 520px;
  white-space: pre;
}
</style>
