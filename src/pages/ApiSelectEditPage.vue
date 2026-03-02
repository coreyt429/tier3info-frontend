<template>
  <q-page class="flex flex-start">
    <div class="q-pa-md" style="width: 100%">
      <q-card class="q-mt-md bordered">
        <q-card-section class="row items-center">
          <FilterSelect
            v-model="selectedOption"
            :options="selectOptions"
            :label="selectLabel"
            option-value="value"
            option-label="label"
          />
        </q-card-section>
      </q-card>
      <MyAceEditor
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
      />
      <!-- Add and Deletze Dialogs -->
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
import { useRoute, useRouter } from 'vue-router'
import { reactive, ref, computed, watch } from 'vue'
import FilterSelect from 'src/components/FilterSelect.vue'
import MyAceEditor from 'src/components/MyAceEditor.vue'
console.log('ApiSelectEditPage: testPage.vue loaded')
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

const route = useRoute()
const router = useRouter()
import { useTitleStore } from 'stores/titleStore'
const titleStore = useTitleStore()
titleStore.setMainTitle(route.meta.title || 'ApiSelectEditPage Title Not Set')
const endpoint = computed(() => route.meta.endpoint || '/cfg')
const routeBasePath = computed(() => route.matched[0]?.path || route.path)

function normalizeSelection(value) {
  if (typeof value !== 'string') {
    return null
  }
  const normalized = value.trim()
  return normalized || null
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
console.log(`ApiSelectEditPage.vue: Endpoint set to ${endpoint.value} `)
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

const editorContent = ref(null)

async function load_editorContent(option, newItem = false) {
  console.log('ApiSelectEditPage: Loading editor content for option:', option)
  console.log('ApiSelectEditPage: New item flag:', newItem)
  if (newItem) {
    editorContent.value = null // Clear content for new item
    return
  }
  const response = await tier3info_restful_request({
    method: 'GET',
    path: `${endpoint.value}/${option}`,
  })
  console.log('ApiSelectEditPage: Response from server:', response)
  if (response && response.status === 200) {
    editorContent.value = response.data // can be object or string
    emit_notification('positive', 'Content loaded successfully!')
  } else {
    editorContent.value = '' // Clear content on failure
    emit_notification('negative', 'Failed to load content. Please try again.')
  }
}

async function handleSave(data) {
  console.log('ApiSelectEditPage: Saving content:', data)
  const response = await tier3info_restful_request({
    path: `${endpoint.value}/${selectedOption.value}`,
    method: 'PUT',
    data,
  })
  console.log('ApiSelectEditPage: Save response:', response)
  if (response && response.status === 200) {
    emit_notification('positive', 'Content saved successfully!')
  } else {
    emit_notification('negative', 'Failed to save content. Please try again.')
  }
}

const selectLabel = computed(() => route.meta.label || 'Config:')
const response = await tier3info_restful_request({ path: endpoint.value, method: 'GET' })
console.log(`ApiSelectEditPage.vue: Response from server for ${endpoint.value}:`, response)
const selectOptions = ref([])
if (!response || !response.data) {
  console.error('Failed to fetch options from server:')
  selectOptions.value = ['dummy_option1', 'dummy_option2'] // Fallback options if request fails
  // Handle error or set fallback options
} else {
  console.log('ApiSelectEditPage: Response from server:', response)
  if (typeof response.data === 'object' && !Array.isArray(response.data)) {
    // Assuming response.data is an object with keys as options
    selectOptions.value = Object.keys(response.data)
  } else {
    // Assuming response.data is an array of options
    selectOptions.value = response.data
  }
}
console.log('ApiSelectEditPage: Select options:', selectOptions.value)
const selectedOption = ref(null)
console.log('ApiSelectEditPage: Selected option:', selectedOption.value)

async function handleDownload(option, format) {
  console.log('ApiSelectEditPage: Downloading certificate for option:', option, 'Format:', format)
  if (option) {
    const request = {
      path: `${endpoint.value}/${option}/${format}`,
      method: 'GET',
    }
    const response = await tier3info_restful_request(request)
    console.log('ApiSelectEditPage: Response from server:', response)
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
  console.log('ApiSelectEditPage: Deleting content for option:', selectedOption.value)
  delete_dialog.value = true
  delete_confirm.value = false
}
async function handleDeleteConfirm() {
  console.log('ApiSelectEditPage: Confirming delete for option:', selectedOption.value)
  const response = await tier3info_restful_request({
    path: `${endpoint.value}/${selectedOption.value}`,
    method: 'DELETE',
  })
  console.log('ApiSelectEditPage: Delete response:', response)
  if (response && response.status === 200) {
    emit_notification('positive', 'Content deleted successfully!')
    // Remove the deleted option from selectOptions
    selectOptions.value = selectOptions.value.filter((option) => option !== selectedOption.value)
    selectedOption.value = null // Reset selected option
    editorContent.value = null // Clear editor content
  } else {
    emit_notification('negative', 'Failed to delete content. Please try again.')
  }
  delete_confirm.value = false // Reset delete_confirm
}

function handleAdd() {
  console.log('ApiSelectEditPage: Adding content for option:', selectedOption.value)
  add_dialog.value = true
  add_id.value = null // Reset add_id for new entry
}

async function handleAddConfirm() {
  console.log('ApiSelectEditPage: Confirming add with ID:', add_id.value)
  if (!add_id.value) {
    emit_notification('negative', 'Please enter a valid ID for the new option.')
    return
  }
  const newOption = add_id.value.trim()
  if (selectOptions.value.includes(newOption)) {
    emit_notification('negative', 'This option already exists.')
    return
  }
  await tier3info_restful_request({
    method: 'PUT',
    path: `${endpoint.value}/${newOption}`,
    body: { new_item: true },
  })
    .then(() => {
      emit_notification('positive', 'New option added successfully!')
    })
    .catch((error) => {
      console.error('Error adding new option:', error)
      emit_notification('negative', 'Failed to add new option. Please try again.')
    })
  selectOptions.value.push(newOption)
  selectedOption.value = newOption // Set the newly added option as selected
  add_dialog.value = false // Close the dialog
  // load_editorContent(newOption, true) // Load content for the new option
}

watch(selectedOption, async (newOption) => {
  const normalizedOption = normalizeSelection(newOption)
  if (normalizedOption !== newOption) {
    selectedOption.value = normalizedOption
    return
  }

  if (normalizedOption) {
    console.log('ApiSelectEditPage: Selected option changed:', normalizedOption)
    await syncRouteWithSelection(normalizedOption)
    await load_editorContent(normalizedOption)
  } else {
    editorContent.value = null
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
