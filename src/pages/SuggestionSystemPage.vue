<template>
  <q-page class="flex flex-start">
    <div class="q-pa-md" style="width: 100%">
      <q-card class="q-mb-md">
        <q-card-section class="row items-center justify-between q-gutter-md">
          <div>
            <div class="text-h5">Suggestion System</div>
            <div class="text-caption text-grey-6">
              {{ rows.length }} suggestion{{ rows.length === 1 ? '' : 's' }} available
            </div>
          </div>
          <div class="row items-center q-gutter-sm">
            <q-btn
              color="primary"
              icon="refresh"
              label="Refresh"
              :loading="loadingRows"
              @click="refreshSuggestions"
            />
            <q-btn color="positive" icon="add" label="New Suggestion" @click="handleAdd" />
          </div>
        </q-card-section>
      </q-card>

      <q-card class="q-mt-md">
        <DataTable
          :rows="rows"
          :columns="columns"
          :filterable="true"
          :exportable="true"
          :onClick="selectSuggestion"
          :storage-key="tableStorageKey"
          exportPrefix="suggestions"
          table-height="60vh"
          noDataLabel="No suggestions found"
          noResultsLabel="No suggestions matched the filter"
        />
      </q-card>

      <MyAceEditor
        v-if="selectedOption"
        v-model="editorContent"
        :lang="states.lang"
        :theme="states.theme"
        :buttons="buttons"
        :endpoint="endpoint"
        :selectedOption="selectedOption"
        :states="states"
        label="Suggestion"
        @save="handleSave"
        @delete="handleDelete"
        @add="handleAdd"
      />

      <q-dialog v-model="add_dialog" persistent :backdrop-filter="backdropFilter">
        <q-card style="min-width: 350px">
          <q-card-section>
            <div class="text-h6">Enter an id for the new suggestion</div>
          </q-card-section>

          <q-card-section class="q-pt-none">
            <q-input
              dense
              v-model="add_id"
              autofocus
              placeholder="suggestion-id"
              @keyup.enter="add_dialog = false"
            />
          </q-card-section>

          <q-card-actions align="right" class="text-primary">
            <q-btn label="Cancel" color="secondary" icon="cancel" v-close-popup />
            <q-btn
              icon="add"
              color="positive"
              label="Add"
              v-close-popup
              @click="handleAddConfirm"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <q-dialog v-model="delete_dialog" persistent :backdrop-filter="backdropFilter">
        <q-card>
          <q-card-section class="row items-center">
            <q-avatar icon="warning" color="negative" text-color="white" />
            <span class="q-ml-sm"
              >You are about to delete suggestion {{ selectedOption }}.</span
            >
          </q-card-section>

          <q-card-actions align="right">
            <q-btn label="Cancel" color="secondary" icon="cancel" v-close-popup />
            <q-btn
              label="Delete"
              icon="delete"
              color="negative"
              v-close-popup
              @click="handleDeleteConfirm"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { tier3info_restful_request, emit_notification } from 'src/plugins/tier3info.js'
import DataTable from 'src/components/DataTable.vue'
import MyAceEditor from 'src/components/MyAceEditor.vue'
import { useTitleStore } from 'stores/titleStore'

const route = useRoute()
const titleStore = useTitleStore()
titleStore.setMainTitle(route.meta.title || 'Suggestion System')

const endpoint = computed(() => route.meta.endpoint || '/suggestions/')
const tableStorageKey = computed(() => `suggestion-system:${route.path}`)
const backdropFilter = ref('brightness(60%)')
const add_dialog = ref(false)
const add_id = ref(null)
const delete_dialog = ref(false)
const loadingRows = ref(false)
const rows = ref([])
const columns = ref([
  { name: 'id', label: 'Id', align: 'left', field: 'id', sortable: true },
])
const selectedOption = ref(null)
const editorContent = ref(null)
const states = reactive({
  lang: 'yaml',
  theme: 'github_dark',
  content: null,
})

const buttons = computed(() => {
  const definitions = {
    Save: { label: 'Save', icon: 'save', color: 'primary', emit: 'save', handler: 'handleSave' },
    Add: { label: 'Add', icon: 'add', color: 'positive', emit: 'add' },
    Delete: { label: 'Delete', icon: 'delete', color: 'negative', emit: 'delete' },
  }

  return (route.meta.buttons || ['Save', 'Add', 'Delete'])
    .map((key) => definitions[key])
    .filter(Boolean)
})

function normalizeSelection(value) {
  if (value === null || value === undefined) {
    return null
  }
  const normalized = String(value).trim()
  return normalized || null
}

function humanizeLabel(value) {
  return String(value)
    .replaceAll('_', ' ')
    .replaceAll('.', ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function resolveNestedValue(row, key) {
  return key.split('.').reduce((acc, part) => acc?.[part], row)
}

function formatTableValue(value) {
  if (value === null || value === undefined) {
    return ''
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return '[object]'
    }
  }
  return value
}

function rowToRecord(item, id) {
  const source = item && typeof item === 'object' && !Array.isArray(item) ? item : { value: item }
  const resolvedId =
    source.id ??
    source.suggestion_id ??
    source.suggestionId ??
    source.name ??
    id ??
    source.value

  return {
    id: resolvedId,
    ...source,
  }
}

function rebuildColumns(list) {
  const keySet = new Set(['id'])
  list.forEach((row) => {
    Object.keys(row || {}).forEach((key) => {
      if (!key.startsWith('_')) {
        keySet.add(key)
      }
    })
  })

  columns.value = Array.from(keySet).map((key) => ({
    name: key,
    label: humanizeLabel(key),
    align: 'left',
    sortable: true,
    field: (row) => formatTableValue(resolveNestedValue(row, key)),
  }))
}

async function refreshSuggestions() {
  loadingRows.value = true
  try {
    const response = await tier3info_restful_request({
      method: 'GET',
      path: endpoint.value,
    })
    if (!response || response.status !== 200) {
      emit_notification('negative', 'Failed to load suggestions.')
      return
    }

    const payload = response.data
    const nextRows = Array.isArray(payload)
      ? payload.map((item, index) => rowToRecord(item, index))
      : payload && typeof payload === 'object'
        ? Object.entries(payload).map(([id, item]) => rowToRecord(item, id))
        : []

    rows.value = nextRows
    rebuildColumns(nextRows)
  } catch (error) {
    console.error('SuggestionSystemPage: refreshSuggestions failed:', error)
    emit_notification('negative', 'Failed to load suggestions.')
  } finally {
    loadingRows.value = false
  }
}

async function loadSuggestionContent(option) {
  const selected = normalizeSelection(option)
  if (!selected) {
    editorContent.value = null
    states.content = null
    return
  }

  const response = await tier3info_restful_request({
    method: 'GET',
    path: `${endpoint.value}/${encodeURIComponent(selected)}`,
  })

  if (response && response.status === 200) {
    editorContent.value = response.data ?? {}
    emit_notification('positive', 'Suggestion loaded successfully!')
    return
  }

  editorContent.value = ''
  emit_notification('negative', 'Failed to load suggestion content.')
}

watch(selectedOption, async (newValue, oldValue) => {
  if (newValue === oldValue) {
    return
  }
  await loadSuggestionContent(newValue)
})

function selectSuggestion(row) {
  selectedOption.value = normalizeSelection(row?.id)
}

function handleAdd() {
  add_dialog.value = true
  add_id.value = selectedOption.value || null
}

async function handleAddConfirm() {
  const nextId = normalizeSelection(add_id.value)
  if (!nextId) {
    emit_notification('negative', 'Please enter a valid id for the new suggestion.')
    return
  }

  const body = route.meta.template ? { ...route.meta.template } : {}

  try {
    const response = await tier3info_restful_request({
      method: 'PUT',
      path: `${endpoint.value}/${encodeURIComponent(nextId)}`,
      body,
    })

    if (response && response.status === 200) {
      emit_notification('positive', 'New suggestion added successfully!')
      selectedOption.value = nextId
      await refreshSuggestions()
    } else {
      emit_notification('negative', 'Failed to add the suggestion.')
    }
  } catch (error) {
    console.error('SuggestionSystemPage: handleAddConfirm failed:', error)
    emit_notification('negative', 'Failed to add the suggestion.')
  }
}

function handleDelete() {
  if (!selectedOption.value) {
    return
  }
  delete_dialog.value = true
}

async function handleDeleteConfirm() {
  const selected = normalizeSelection(selectedOption.value)
  if (!selected) {
    return
  }

  try {
    const response = await tier3info_restful_request({
      method: 'DELETE',
      path: `${endpoint.value}/${encodeURIComponent(selected)}`,
    })

    if (response && response.status === 200) {
      emit_notification('positive', 'Suggestion deleted successfully!')
      selectedOption.value = null
      editorContent.value = null
      await refreshSuggestions()
    } else {
      emit_notification('negative', 'Failed to delete the suggestion.')
    }
  } catch (error) {
    console.error('SuggestionSystemPage: handleDeleteConfirm failed:', error)
    emit_notification('negative', 'Failed to delete the suggestion.')
  }
}

async function handleSave(data) {
  const selected = normalizeSelection(selectedOption.value)
  if (!selected) {
    emit_notification('negative', 'Select a suggestion before saving.')
    return
  }

  try {
    const response = await tier3info_restful_request({
      method: 'PUT',
      path: `${endpoint.value}/${encodeURIComponent(selected)}`,
      data,
    })

    if (response && response.status === 200) {
      emit_notification('positive', 'Suggestion saved successfully!')
      await refreshSuggestions()
    } else {
      emit_notification('negative', 'Failed to save the suggestion.')
    }
  } catch (error) {
    console.error('SuggestionSystemPage: handleSave failed:', error)
    emit_notification('negative', 'Failed to save the suggestion.')
  }
}

await refreshSuggestions()
</script>
