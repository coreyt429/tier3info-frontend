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
    color: 'positive',
    action: () => save_editorContent(selectedOption.value),
  },
  Reset: {
    label: 'Reset',
    icon: 'refresh',
    color: 'negative',
    action: () => load_editorContent(selectedOption.value),
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

// Watch for changes to selectedOption and fetch YAML content
watch(selectedOption, async (option) => {
  console.log('Selected option changed:', option)
  if (option) {
    load_editorContent(option)
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
