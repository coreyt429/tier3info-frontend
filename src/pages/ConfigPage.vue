<template>
  <q-page class="flex flex-start">
    <div class="q-pa-md" style="width: 100%">
      <q-card class="q-mt-md bordered">
        <q-card-section class="row items-center">
          <q-select
            v-model="selectedOption"
            :options="selectOptions"
            rounded
            outlined
            :label="`Select ${selectLabel}`"
            class="col-8"
          />
          <div class="col-4 flex justify-end">
            <q-btn-toggle
              v-model="states.lang"
              :options="[
                { label: 'YAML', value: 'yaml' },
                { label: 'JSON', value: 'json' },
              ]"
              no-caps
              rounded
              unelevated
              outlined
              toggle-color="positive"
              color="grey-3"
              text-color="primary"
              class="q-ml-md"
            />
          </div>
          <!-- </q-col>
            </q-row>
          </div> -->
        </q-card-section>
      </q-card>
      <!-- Configurable Ace Editor with Label -->
      <q-card v-if="states.content !== null" class="q-mt-md">
        <q-card-section class="row items-center">
          <div class="text-h6 text-black q-mb-sm">{{ editorLabel }}</div>
        </q-card-section>
        <q-separator />
        <q-card-section class="row items-center">
          <VAceEditor
            ref="aceRef"
            v-model:value="states.content"
            class="vue-ace-editor full-width"
            :placeholder="`Enter your ${states.lang} code here`"
            :lang="states.lang"
            :theme="states.theme"
            :options="{
              useWorker: true,
              enableBasicAutocompletion: true,
              enableSnippets: true,
              enableLiveAutocompletion: true,
            }"
          />
        </q-card-section>
        <q-separator />
        <q-card-section class="row items-center">
          <!-- Configurable Buttons -->
          <div class="q-pa-md row justify-center">
            <q-btn
              v-for="(button, index) in buttons"
              :key="index"
              :label="button.label"
              :icon="button.icon"
              :color="button.color"
              @click="button.action"
              class="q-mx-sm"
            />
          </div>
        </q-card-section>
      </q-card>
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
              @click="add_editorContent_confirm"
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
              @click="delete_editorContent_confirm()"
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
import { reactive, ref, computed, watch } from 'vue'
import { VAceEditor } from 'vue3-ace-editor'
import 'src/plugins/ace-config'
import yaml from 'js-yaml'
const backdropFilter = ref('brightness(60%)')
const add_dialog = ref(false)
const add_id = ref(null)
const delete_dialog = ref(false)
const delete_confirm = ref(false)

const states = reactive({
  lang: 'yaml',
  theme: 'github_dark',
  content: null,
})

const route = useRoute()
import { useTitleStore } from 'stores/titleStore'
const titleStore = useTitleStore()
titleStore.setMainTitle(route.meta.title || 'ConfigPage Title Not Set')
const endpoint = computed(() => route.meta.endpoint || '/cfg')

const button_definitions = {
  Save: {
    label: 'Save',
    icon: 'save',
    color: 'primary',
    action: () => save_editorContent(selectedOption.value),
  },
  Reset: {
    label: 'Reset',
    icon: 'refresh',
    color: 'secondary',
    action: () => load_editorContent(selectedOption.value),
  },
  Add: {
    label: 'Add',
    icon: 'add',
    color: 'positive',
    action: () => add_editorContent(),
  },
  Delete: {
    label: 'Delete',
    icon: 'delete',
    color: 'negative',
    action: () => delete_editorContent(),
  },
}
const buttons = computed(() => {
  const metaButtons = route.meta.buttons || []
  return metaButtons.map((key) => button_definitions[key]).filter(Boolean)
})

// Map Ctrl+S / Cmd+S to Save action
document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault()
    const saveButton = buttons.value.find((button) => button.label === 'Save')
    if (saveButton) {
      saveButton.action()
    }
  }
})

const selectLabel = computed(() => route.meta.label || 'Config:')
const response = await tier3info_restful_request({ path: endpoint.value, method: 'GET' })
const selectOptions = ref([])
const reloadOnChange = ref(true)
if (!response || !response.data) {
  console.error('Failed to fetch options from server:')
  selectOptions.value = ['dummy_option1', 'dummy_option2'] // Fallback options if request fails
  // Handle error or set fallback options
} else {
  console.log('Response from server:', response)
  // Assuming response.data is an array of options
  selectOptions.value = response.data
}
console.log('Select options:', selectOptions.value)
const selectedOption = ref(null)
console.log('Selected option:', selectedOption.value)
// const editorContent = ref('test content')
const editorLabel = ref(null)

async function load_editorContent(option) {
  console.log('Loading content for option:', option)
  if (option) {
    const request = {
      path: `${endpoint.value}/${option}`,
      method: 'GET',
    }
    const response = await tier3info_restful_request(request)
    if (!response || !response.data) {
      console.error('Failed to load content from server:', response)
      if (states.lang === 'yaml') {
        states.content = 'Error: content not loaded\noption: ' + option
      } else {
        states.content = JSON.stringify({ error: 'Content not loaded', option: option }, null, 2)
      }
      editorLabel.value = 'Error: content not loaded: ' + option
      return
    }
    console.log('Response from server:', response)
    const yaml_string = yaml.dump(response.data)
    console.log('YAML content:', yaml_string)
    if (states.lang === 'yaml') {
      states.content = yaml.dump(response.data)
    } else {
      states.content = JSON.stringify(response.data, null, 2)
    }
    editorLabel.value = `Editing: ${option}`
  }
}

async function save_editorContent(option) {
  console.log('Saving content for option:', option)
  if (option) {
    try {
      const jsonData = yaml.load(states.content) // Convert YAML to JSON
      const request = {
        path: `${endpoint.value}/${option}`,
        method: 'PUT',
        body: jsonData, // Store JSON content
      }
      const response = await tier3info_restful_request(request)
      console.log('Response from server:', response)
      if (response && response.status === 200) {
        emit_notification('positive', 'Content saved successfully!')
      } else {
        emit_notification('negative', 'Failed to save content. Please try again.')
      }
    } catch (error) {
      console.error('Error converting YAML to JSON:', error)
      emit_notification('negative', 'Error saving content. Invalid YAML format.')
    }
  }
}

function delete_editorContent() {
  delete_dialog.value = true
  delete_confirm.value = false
}

async function delete_editorContent_confirm() {
  console.log('Deleting content for option:', selectedOption.value)
  if (selectedOption.value) {
    const request = {
      path: `${endpoint.value}/${selectedOption.value}`,
      method: 'DELETE',
    }
    const response = await tier3info_restful_request(request)
    console.log('Response from server:', response)
    if (response && response.status === 200) {
      emit_notification('positive', 'Content deleted successfully!')
    } else {
      emit_notification('negative', 'Failed to delete content. Please try again.')
    }
  }
}

function add_editorContent() {
  console.log('Adding content for option:', selectedOption.value)
  add_dialog.value = true
  add_id.value = null // Reset add_id for new entry
}

function add_editorContent_confirm() {
  add_dialog.value = false
  if (add_id.value) {
    const newContent = route.meta.template || {
      id: add_id.value,
      data: {}, // Initialize with empty data or default values
    }
    // Replace any fields in newContent with the value 'ID' to newId
    Object.keys(newContent).forEach((key) => {
      if (newContent[key] === 'ID') {
        newContent[key] = add_id.value
      }
    })
    states.content =
      states.lang === 'yaml' ? yaml.dump(newContent) : JSON.stringify(newContent, null, 2)
    editorLabel.value = `Editing: ${add_id.value}`
    reloadOnChange.value = false // Disable reload on change for new content
    selectedOption.value = add_id.value // Set the new ID as the selected option
    reloadOnChange.value = true // Re-enable reload on change
    selectOptions.value.push(add_id.value) // Add new ID to options
    emit_notification('positive', `New content with ID "${add_id.value}" created.`)
  } else {
    emit_notification('negative', 'No ID entered. Content creation canceled.')
  }
}

// Watch for changes to selectedOption and fetch YAML content
watch(selectedOption, async (option) => {
  console.log('Selected option changed:', option)
  if (reloadOnChange.value) {
    console.log('Reloading content for option:', option)
    await load_editorContent(option)
  }
})

// watch for changes to states.lang and update editor content accordingly
watch(
  () => states.lang,
  (newLang) => {
    console.log('Language changed:', newLang)
    if (states.content !== null) {
      if (newLang === 'yaml') {
        states.content = yaml.dump(yaml.load(states.content))
      } else {
        states.content = JSON.stringify(yaml.load(states.content), null, 2)
      }
    }
  },
)
</script>

<style lang="scss" scoped>
header {
  display: flex;
}

select {
  margin-right: 15px;
}

main {
  flex: 1;
  margin-top: 15px;
  display: flex;
}

.vue-ace-editor {
  font-size: 16px;
  border: 1px solid;
  width: 100%;
  height: auto;
  min-height: 300px;
  max-height: 80vh;
  resize: vertical;
  overflow: auto;
}
.vue-ace-editor .ace_content {
  height: 100%;
}
</style>
