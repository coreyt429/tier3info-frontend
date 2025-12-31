<template>
  <q-page class="flex flex-start">
    <div class="q-pa-md" style="width: 100%">
      <q-card>
        <q-card-section>
          <div class="row items-center q-col-gutter-sm">
            <div class="col">
              <q-input
                v-model="queryString"
                label="Search"
                outlined
                dense
                @keyup.enter="executeSearch"
              />
            </div>
            <div class="col-auto">
              <q-btn color="primary" icon="search" label="Search" @click="executeSearch" />
            </div>
          </div>
        </q-card-section>
      </q-card>

      <q-card class="q-mt-md">
        <DataTable
          :rows="rows"
          :columns="columns"
          :filterable="true"
          :exportable="true"
          :onClick="selectItem"
          :allowAdd="allowAdd"
          exportPrefix="search-export"
          @add="handleAdd"
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
        :label="`${selectLabel}`"
        @save="handleSave"
        @delete="handleDelete"
        @add="handleAdd"
        @zip-cert="handleDownload(selectedOption, 'zip')"
        @pfx-cert="handleDownload(selectedOption, 'pfx')"
        @oracle-cert="handleDownload(selectedOption, 'oracle_sbc')"
        @download-tech-support="handleDownload(selectedOption, 'techsupport')"
      />
      <!-- Add and Delete Dialogs -->
      <q-dialog v-model="add_dialog" persistent :backdrop-filter="backdropFilter">
        <q-card style="min-width: 350px">
          <q-card-section>
            <div class="text-h6">Enter an Id for new {{ selectLabel }}</div>
          </q-card-section>

          <q-card-section class="q-pt-none">
            <q-input dense v-model="add_id" autofocus @keyup.enter="add_dialog = false" />
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
              >You are about to delete {{ selectLabel }} {{ selectedOption }}.</span
            >
          </q-card-section>

          <q-card-actions align="right">
            <q-btn label="Cancel" color="secondary" icon="cancel" v-close-popup />
            <q-btn
              label="Delete"
              icon="delete"
              color="negative"
              v-close-popup
              @click="handleDeleteConfirm()"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup>
import { tier3info_restful_request, emit_notification } from 'src/plugins/tier3info.js'
import { useRoute } from 'vue-router'
import { reactive, ref, computed } from 'vue'
import DataTable from 'src/components/DataTable.vue'
import MyAceEditor from 'src/components/MyAceEditor.vue'

const add_dialog = ref(false)
const add_id = ref(null)
const delete_dialog = ref(false)
const delete_confirm = ref(false)
const backdropFilter = ref('brightness(60%)')

const states = reactive({
  lang: 'yaml',
  theme: 'github_dark',
  content: null,
})
const selectLabel = computed(() => {
  return route.meta.label || 'Item'
})
const selectedOption = ref(null)
const route = useRoute()
import { useTitleStore } from 'stores/titleStore'
const titleStore = useTitleStore()
titleStore.setMainTitle(route.meta.title || 'ApiSearchTableEditPage Title Not Set')
const endpoint = computed(() => route.meta.endpoint || '/cfg')
const defaultSearch = computed(() => route.meta.defaultSearch || '*')

const button_definitions = {
  Save: { label: 'Save', icon: 'save', color: 'primary', emit: 'save' },
  Add: { label: 'Add', icon: 'add', color: 'positive', emit: 'add' },
  Delete: { label: 'Delete', icon: 'delete', color: 'negative', emit: 'delete' },
  Zip: { label: 'Zip', icon: 'archive', color: 'info', emit: 'zip-cert' },
  Pfx: { label: 'Pfx', icon: 'extension', color: 'warning', emit: 'pfx-cert' },
  Oracle: { label: 'Oracle', icon: 'dns', color: 'deep-orange', emit: 'oracle-cert' },
  'Download Tech Support': {
    label: 'Download Tech Support',
    icon: 'download',
    color: 'accent',
    emit: 'download-tech-support',
  },
}
const buttons = computed(() => {
  const metaButtons = route.meta.buttons || []
  return metaButtons
    .map((key) => {
      const def = button_definitions[key]
      if (key === 'Save') {
        def.handler = 'handleSave'
      }
      return def
    })
    .filter(Boolean)
})

const allowAdd = computed(() => buttons.value.some((button) => button.emit === 'add'))

const columns = ref([
  { name: 'id', label: 'Id', align: 'left', field: 'id', sortable: true },
])

function selectItem(row) {
  load_editorContent(row.id)
}

route.meta.fields.forEach((field) => {
  const colDef = {
    name: field.name,
    label: field.label || field.name,
    align: 'left',
    field: (row) => field.name.split('.').reduce((acc, part) => acc?.[part], row),
    sortable: true,
  }
  columns.value.push(colDef)
})

const rows = ref([])
const queryString = ref(defaultSearch.value)

async function executeSearch() {
  try {
    const response = await tier3info_restful_request({
      method: 'POST',
      path: `${endpoint.value}?include=data`,
      body: { query: queryString.value || defaultSearch.value },
    })
    if (response && response.status === 200) {
      const data = response.data || []
      const newRows = Array.isArray(data)
        ? data.map((item, idx) => mapRow(item, idx))
        : Object.entries(data).map(([id, item]) => mapRow(item, id))
      rows.value = newRows
    } else {
      emit_notification('negative', 'Failed to fetch results.')
    }
  } catch (error) {
    console.error('ApiSearchTableEditPage: Error executing search:', error)
    emit_notification('negative', 'Failed to fetch results.')
  }
}

function mapRow(item, id) {
  const row = { id: item.id || id, ...item }
  if (row.kpi && row.format) {
    const filename = `${row.report || 'report'}.${row.server || 'server'}.${row.format}`
    row.kpi = filename
    const base64 = item.kpi
    row.kpiDownload = {
      label: filename,
      action: () => downloadBase64File(base64, filename),
    }
  }
  return row
}

function downloadBase64File(base64Data, filename) {
  if (!base64Data) return
  const blob = b64toBlob(base64Data)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function b64toBlob(b64Data, contentType = '', sliceSize = 512) {
  const byteCharacters = atob(b64Data)
  const byteArrays = []
  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize)
    const byteNumbers = new Array(slice.length)
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    byteArrays.push(byteArray)
  }
  return new Blob(byteArrays, { type: contentType || 'application/octet-stream' })
}

await executeSearch()

const editorContent = ref(null)

async function load_editorContent(option, newItem = false) {
  selectedOption.value = option
  if (newItem) {
    editorContent.value = null
  }
  const response = await tier3info_restful_request({
    method: 'GET',
    path: `${endpoint.value}/${option}`,
  })
  if (response && response.status === 200) {
    editorContent.value = response.data
    emit_notification('positive', 'Content loaded successfully!')
  } else {
    editorContent.value = ''
    emit_notification('negative', 'Failed to load content. Please try again.')
  }
}

async function handleSave(data) {
  const response = await tier3info_restful_request({
    path: `${endpoint.value}/${selectedOption.value}`,
    method: 'PUT',
    data,
  })
  if (response && response.status === 200) {
    emit_notification('positive', 'Content saved successfully!')
    await executeSearch()
  } else {
    emit_notification('negative', 'Failed to save content. Please try again.')
  }
}

async function handleDownload(option, format) {
  if (format === 'techsupport') {
    const request = { path: `${endpoint.value}/${option}`, method: 'GET' }
    const response = await tier3info_restful_request(request)
    const row = response?.data
    if (!row) {
      emit_notification('negative', 'Tech support data not found for this option.')
      return
    }
    const techsupport = row.techsupport
    const lastUpdated = row.last_updated_parsed
    if (!techsupport) {
      emit_notification('negative', 'No tech support data available for this option.')
      return
    }
    let decoded = ''
    try {
      decoded = atob(techsupport)
    } catch (e) {
      emit_notification('negative', 'Failed to decode tech support data.' + e.message)
      return
    }
    const filename = `${option}_${lastUpdated}_techsupport.txt`
    const blob = new Blob([decoded], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    emit_notification('positive', 'Tech support file downloaded successfully!')
    return
  }
  if (option) {
    const request = { path: `${endpoint.value}/${option}/${format}`, method: 'GET' }
    const response = await tier3info_restful_request(request)
    if (response && response.status === 200) {
      emit_notification('positive', 'Certificate downloaded successfully!')
      const link = document.createElement('a')
      link.href = `data:application/octet-stream;base64,${response.data.base64}`
      link.download = response.data.file_name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      emit_notification('negative', 'Failed to download certificate. Please try again.')
    }
  }
}

function handleDelete() {
  delete_dialog.value = true
  delete_confirm.value = false
}

async function handleDeleteConfirm() {
  const response = await tier3info_restful_request({
    path: `${endpoint.value}/${selectedOption.value}`,
    method: 'DELETE',
  })
  if (response && response.status === 200) {
    emit_notification('positive', 'Content deleted successfully!')
    selectedOption.value = null
    editorContent.value = null
    await executeSearch()
  } else {
    emit_notification('negative', 'Failed to delete content. Please try again.')
  }
  delete_confirm.value = false
}

function handleAdd() {
  add_dialog.value = true
  add_id.value = null
}

async function handleAddConfirm() {
  if (!add_id.value) {
    emit_notification('negative', 'Please enter a valid ID for the new option.')
    return
  }
  const newOption = add_id.value.trim()
  let body = { new_item: true }
  if (route.meta.template) {
    body = { ...route.meta.template }
  }
  await tier3info_restful_request({
    method: 'PUT',
    path: `${endpoint.value}/${newOption}`,
    body: body,
  })
    .then(() => {
      emit_notification('positive', 'New option added successfully!')
    })
    .catch((error) => {
      console.error('Error adding new option:', error)
      emit_notification('negative', 'Failed to add new option. Please try again.')
    })
  await executeSearch()
  selectedOption.value = newOption
  add_dialog.value = false
  load_editorContent(newOption, true)
}
</script>

<style lang="scss" scoped></style>
