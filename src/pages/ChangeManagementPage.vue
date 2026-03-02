<template>
  <q-page class="flex flex-start">
    <div class="q-pa-md" style="width: 100%">
      <q-card class="q-mt-md bordered">
        <q-card-section class="row items-center">
          <FilterSelect v-model="selectedOption" :options="selectOptions" :label="selectLabel" />
        </q-card-section>
      </q-card>

      <q-card class="q-mt-md bordered">
        <q-card-section>
          <DynamicDisplay v-if="displayBlocks.length > 0" :data="displayBlocks" />
          <div v-else class="text-subtitle2 text-grey-7">Select an item to view details.</div>
        </q-card-section>
        <q-inner-loading :showing="isLoading">
          <q-spinner-gears size="50px" color="primary" />
        </q-inner-loading>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { tier3info_restful_request, emit_notification } from 'src/plugins/tier3info.js'
import FilterSelect from 'src/components/FilterSelect.vue'
import DynamicDisplay from 'src/components/DynamicDisplay.vue'
import { useTitleStore } from 'stores/titleStore'

const route = useRoute()
const router = useRouter()
const titleStore = useTitleStore()

titleStore.setMainTitle(route.meta.title || 'Change Management')

const endpoint = computed(() => route.meta.endpoint || '/change_management')
const selectLabel = computed(() => route.meta.label || 'Change Management')
const routeBasePath = computed(() => route.matched[0]?.path || route.path)

const selectOptions = ref([])
const selectedOption = ref(null)
const displayBlocks = ref([])
const isLoading = ref(false)

function normalizeSelection(value) {
  if (typeof value !== 'string') {
    return null
  }
  const normalized = value.trim()
  return normalized || null
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function toDisplayBlocks(payload) {
  if (Array.isArray(payload)) {
    return payload
  }
  if (Array.isArray(payload?.data_description)) {
    return payload.data_description
  }
  return [
    {
      type: 'html',
      contents: `<pre>${escapeHtml(JSON.stringify(payload ?? {}, null, 2))}</pre>`,
    },
  ]
}

async function syncRouteWithSelection(option) {
  const normalizedOption = normalizeSelection(option)
  const routeSelection = normalizeSelection(route.params.selectedItem)
  if (normalizedOption === routeSelection) {
    return
  }
  const targetPath = normalizedOption
    ? `${routeBasePath.value}/${encodeURIComponent(normalizedOption)}`
    : routeBasePath.value
  await router.replace({
    path: targetPath,
    query: route.query,
    hash: route.hash,
  })
}

async function loadOptions() {
  const response = await tier3info_restful_request({ path: endpoint.value, method: 'GET' })
  if (!response || !response.data) {
    selectOptions.value = []
    emit_notification('negative', 'Failed to load options.')
    return
  }
  if (typeof response.data === 'object' && !Array.isArray(response.data)) {
    selectOptions.value = Object.keys(response.data)
    return
  }
  selectOptions.value = response.data
}

async function loadItem(option) {
  isLoading.value = true
  const response = await tier3info_restful_request({
    method: 'GET',
    path: `${endpoint.value}/${encodeURIComponent(option)}`,
  })

  if (response && response.status === 200) {
    displayBlocks.value = toDisplayBlocks(response.data)
    emit_notification('positive', 'Content loaded successfully!')
  } else {
    displayBlocks.value = []
    emit_notification('negative', 'Failed to load content. Please try again.')
  }
  isLoading.value = false
}

await loadOptions()

watch(selectedOption, async (newOption) => {
  const normalizedOption = normalizeSelection(newOption)
  if (normalizedOption !== newOption) {
    selectedOption.value = normalizedOption
    return
  }

  if (normalizedOption) {
    await syncRouteWithSelection(normalizedOption)
    await loadItem(normalizedOption)
  } else {
    displayBlocks.value = []
    await syncRouteWithSelection(null)
  }
})

watch(
  () => route.params.selectedItem,
  (routeSelection) => {
    const normalizedRouteSelection = normalizeSelection(routeSelection)
    if (normalizedRouteSelection !== selectedOption.value) {
      selectedOption.value = normalizedRouteSelection
    }
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped></style>
