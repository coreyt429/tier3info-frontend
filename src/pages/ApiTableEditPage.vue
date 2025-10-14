<template>
  <q-page class="flex flex-start">
    <div class="q-pa-md" style="width: 100%">
      <!-- Row 2: Search Results Table -->
      <q-card class="q-mt-md">
        <DataTable
          :rows="rows"
          :columns="columns"
          :filterable="true"
          :exportable="true"
          :onClick="selectItem"
          :allowAdd="allowAdd"
          exportPrefix="locate-export"
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
console.log('ApiTableEditPage: ApiTableEditPage.vue loading...')

const add_dialog = ref(false)
const add_id = ref(null)
// const selectedItem = ref(null)

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
titleStore.setMainTitle(route.meta.title || 'ApiTableEditPage Title Not Set')
const endpoint = computed(() => route.meta.endpoint || '/cfg')
console.log(`ApiTableEditPage.vue: Endpoint set to ${endpoint.value} `)
const button_definitions = {
  Save: {
    label: 'Save',
    icon: 'save',
    color: 'primary',
    emit: 'save',
  },
  Add: {
    label: 'Add',
    icon: 'add',
    color: 'positive',
    emit: 'add',
  },
  Delete: {
    label: 'Delete',
    icon: 'delete',
    color: 'negative',
    emit: 'delete',
  },
  Zip: {
    label: 'Zip',
    icon: 'archive',
    color: 'info',
    emit: 'zip-cert',
  },
  Pfx: {
    label: 'Pfx',
    icon: 'extension',
    color: 'warning',
    emit: 'pfx-cert',
  },
  Oracle: {
    label: 'Oracle',
    icon: 'dns',
    color: 'deep-orange',
    emit: 'oracle-cert',
  },
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
        def.handler = 'handleSave' // <- string identifier used inside MyAceEditor
      }
      return def
    })
    .filter(Boolean)
})

const allowAdd = computed(() => buttons.value.some((button) => button.emit === 'add'))

const columns = ref([
  {
    name: 'id',
    label: 'Id',
    align: 'left',
    field: 'id',
    sortable: true,
  },
])

function selectItem(row) {
  console.log('ApiTableEditPage: Row selected:', row)
  load_editorContent(row.id)
}

route.meta.fields.forEach((field) => {
  console.log('ApiTableEditPage: Adding column for field:', field.name)
  columns.value.push({
    name: field.name,
    label: field.label || field.name,
    align: 'left',
    // field: (row) => row[field.name],
    field: (row) => field.name.split('.').reduce((acc, part) => acc?.[part], row),
    sortable: true,
  })
})

console.log('ApiTableEditPage: Columns defined:', JSON.stringify(columns.value, null, 2))
const rows = ref([])

async function fetchIds(includeData = false) {
  console.log('ApiTableEditPage: Fetching IDs from endpoint:', endpoint.value)
  try {
    const path = includeData ? `${endpoint.value}?include=data` : endpoint.value
    const response = await tier3info_restful_request({
      method: 'GET',
      path: path,
    })
    console.log('ApiTableEditPage: Response from server:', response)
    if (response && response.status === 200) {
      if (typeof response.data === 'object' && !Array.isArray(response.data)) {
        if (includeData) {
          console.log('ApiTableEditPage: Returning data with IDs:', Object.keys(response.data))
          return response.data
        }
        return Object.keys(response.data)
      }
      return response.data || []
    } else {
      console.error('ApiTableEditPage:Failed to fetch IDs:', response)
    }
  } catch (error) {
    console.error('ApiTableEditPage:Error fetching IDs:', error)
  }
  return []
}

// async function fetchItem(id) {
//   console.log(`ApiTableEditPage: Fetching item for ID: ${id} from endpoint: ${endpoint.value}`)
//   try {
//     const response = await tier3info_restful_request({
//       method: 'GET',
//       path: `${endpoint.value}/${id}`,
//     })
//     console.log(`ApiTableEditPage: Response for ID ${id}:`, response)
//     if (response && response.status === 200) {
//       return response.data || {}
//     } else {
//       console.error('ApiTableEditPage:Failed to fetch item:', response)
//     }
//   } catch (error) {
//     console.error('ApiTableEditPage:Error fetching item:', error)
//   }
//   return {}
// }

async function fetchRows() {
  console.log('ApiTableEditPage: Fetching rows for endpoint:', endpoint.value)
  try {
    const includeData = true
    const rowData = await fetchIds(includeData)
    console.log('ApiTableEditPage: Row data fetched:', rowData)
    const newRows = []
    for (const [id, item] of Object.entries(rowData)) {
      console.log(`ApiTableEditPage: Processing item for ID: ${id}`, item)
      const row = { id: id, ...item }
      // fix for certificates that have 'files' property
      if (row.files) {
        delete row.files // Temporary fix: Remove 'files' property if it exists
      }
      // fix for certificates that have 'data.san' property
      if (row.data && row.data.san) {
        row.data.san = row.data.san.join(', ') // Convert array to string
      }
      console.log(`ApiTableEditPage: Row for ID ${id}:`, row)
      newRows.push(row)
    }
    console.log('ApiTableEditPage: New Rows fetched:', newRows)
    rows.value = newRows
    console.log('ApiTableEditPage: Rows fetched:', rows.value)
  } catch (error) {
    console.error('ApiTableEditPage: Error fetching rows:', error)
  }
}

await fetchRows()
console.log('ApiTableEditPage: Initial rows fetched:', rows.value)

const editorContent = ref(null)

async function load_editorContent(option, newItem = false) {
  console.log('ApiTableEditPage: Loading editor content for option:', option)
  console.log('ApiTableEditPage: New item flag:', newItem)
  selectedOption.value = option
  if (newItem) {
    editorContent.value = null // Clear content for new item
    // return
  }
  const response = await tier3info_restful_request({
    method: 'GET',
    path: `${endpoint.value}/${option}`,
  })
  console.log('ApiTableEditPage: Response from server:', response)
  if (response && response.status === 200) {
    editorContent.value = response.data // can be object or string
    emit_notification('positive', 'Content loaded successfully!')
  } else {
    editorContent.value = '' // Clear content on failure
    emit_notification('negative', 'Failed to load content. Please try again.')
  }
}

async function handleSave(data) {
  console.log('ApiTableEditPage: Saving content:', data)
  const response = await tier3info_restful_request({
    path: `${endpoint.value}/${selectedOption.value}`,
    method: 'PUT',
    data,
  })
  console.log('ApiTableEditPage: Save response:', response)
  if (response && response.status === 200) {
    emit_notification('positive', 'Content saved successfully!')
    await fetchRows() // Refresh rows after saving
  } else {
    emit_notification('negative', 'Failed to save content. Please try again.')
  }
}

async function handleDownload(option, format) {
  console.log('ApiTableEditPage: Downloading certificate for option:', option, 'Format:', format)
  if (format === 'techsupport') {
    // Find the row with id == option
    console.log('ApiTableEditPage: Handling tech support download for option:', option)
    const request = {
      path: `${endpoint.value}/${option}/${format}`,
      method: 'GET',
    }
    const response = await tier3info_restful_request(request)
    console.log('ApiTableEditPage: Response from server:', response)
    const row = response.data
    if (!row) {
      emit_notification('negative', 'Tech support data not found for this option.')
      return
    }
    console.log('ApiTableEditPage: Found row for tech support:', row)
    const techsupport = row.techsupport
    const lastUpdated = row.last_updated_parsed
    console.log('ApiTableEditPage: Tech support data:', techsupport)
    console.log('ApiTableEditPage: Last updated:', lastUpdated)
    if (!techsupport) {
      emit_notification('negative', 'No tech support data available for this option.')
      return
    }
    // Decode base64 techsupport
    let decoded = ''
    try {
      decoded = atob(techsupport)
    } catch (e) {
      emit_notification('negative', 'Failed to decode tech support data.' + e.message)
      return
    }
    // Create a Blob and trigger download
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
    const request = {
      path: `${endpoint.value}/${option}/${format}`,
      method: 'GET',
    }
    const response = await tier3info_restful_request(request)
    console.log('ApiTableEditPage: Response from server:', response)
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
  console.log('ApiTableEditPage: Deleting content for option:', selectedOption.value)
  delete_dialog.value = true
  delete_confirm.value = false
}

async function handleDeleteConfirm() {
  console.log('ApiTableEditPage: Confirming delete for option:', selectedOption.value)
  const response = await tier3info_restful_request({
    path: `${endpoint.value}/${selectedOption.value}`,
    method: 'DELETE',
  })
  console.log('ApiTableEditPage: Delete response:', response)
  if (response && response.status === 200) {
    emit_notification('positive', 'Content deleted successfully!')
    // Remove the deleted option from selectOptions
    selectedOption.value = null // Reset selected option
    editorContent.value = null // Clear editor content
    await fetchRows() // Refresh rows after deletion
  } else {
    emit_notification('negative', 'Failed to delete content. Please try again.')
  }
  delete_confirm.value = false // Reset delete_confirm
}

function handleAdd() {
  console.log('ApiTableEditPage: Adding content for option:', selectedOption.value)
  add_dialog.value = true
  add_id.value = null // Reset add_id for new entry
}

async function handleAddConfirm() {
  console.log('ApiTableEditPage: Confirming add with ID:', add_id.value)
  if (!add_id.value) {
    emit_notification('negative', 'Please enter a valid ID for the new option.')
    return
  }
  const newOption = add_id.value.trim()
  const current_ids = await fetchIds()
  if (current_ids.includes(newOption)) {
    emit_notification('negative', 'This option already exists.')
    return
  }
  let body = { new_item: true }
  console.log('ApiTableEditPage: Adding new meta template:', route.meta.template)
  if (route.meta.template) {
    body = { ...route.meta.template }
  }
  console.log('ApiTableEditPage: Id for new item:', newOption)
  console.log('ApiTableEditPage: Body for new item:', body)
  await tier3info_restful_request({
    method: 'PUT',
    path: `${endpoint.value}/${newOption}`,
    body: body,
  })
    .then((response) => {
      console.log('ApiTableEditPage: Response from server:', response)
      emit_notification('positive', 'New option added successfully!')
    })
    .catch((error) => {
      console.error('ApiTableEditPage:Error adding new option:', error)
      emit_notification('negative', 'Failed to add new option. Please try again.')
    })
  await fetchRows() // Refresh rows after adding
  selectedOption.value = newOption // Set the newly added option as selected
  add_dialog.value = false // Close the dialog
  load_editorContent(newOption, true) // Load content for the new option
}
</script>

<style lang="scss" scoped></style>
