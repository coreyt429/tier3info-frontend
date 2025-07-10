<template>
  <q-page class="flex flex-start">
    <div class="q-pa-md" style="width: 100%">
      <!-- Configurable Select with Label -->
      <div class="q-pt-none q-px-md q-pb-md bg-grey-2 text-black">
        <q-row class="items-center q-gutter-sm">
          <q-col cols="12" sm="3">
            <div class="text-subtitle2 text-black">{{ selectLabel }}</div>
          </q-col>
          <q-col cols="12" sm="6" class="full-width">
            <q-select
              v-model="selectedOption"
              :options="selectOptions"
              outlined
              dense
              color="primary"
              label-color="primary"
              class="bg-grey-2 text-black full-width"
            />
          </q-col>
        </q-row>
      </div>

      <!-- Configurable Ace Editor with Label -->
      <q-row class="q-pa-md q-col-gutter-md">
        <q-col cols="12" class="full-width">
          <div class="text-subtitle2 text-white q-mb-sm">{{ editorLabel }}</div>
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
        </q-col>
      </q-row>

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
    </div>
  </q-page>
</template>

<script setup>
import { tier3info_restful_request } from 'src/plugins/tier3info.js'
import { useRoute } from 'vue-router'
import { reactive, ref, computed, watch } from 'vue'
import { VAceEditor } from 'vue3-ace-editor'
import 'src/plugins/ace-config'
import yaml from 'js-yaml'

const states = reactive({
  lang: 'yaml',
  theme: 'github_dark',
  content: '',
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
const selectedOption = ref(selectOptions.value[0] || null)
console.log('Selected option:', selectedOption.value)
// const editorContent = ref('test content')
const editorLabel = ref('Editor Label')

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
      states.content = 'Error: content not loaded\noption: ' + option
      return
    }
    console.log('Response from server:', response)
    const yaml_string = yaml.dump(response.data)
    console.log('YAML content:', yaml_string)
    states.content = yaml_string
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
        this.$q.notify({
          type: 'positive',
          message: 'Content saved successfully!',
        })
      } else {
        this.$q.notify({
          type: 'negative',
          message: 'Failed to save content. Please try again.',
        })
      }
    } catch (error) {
      console.error('Error converting YAML to JSON:', error)
      this.$q.notify({
        type: 'negative',
        message: 'Error saving content. Invalid YAML format.',
      })
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
load_editorContent(selectedOption.value) // Initial load
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
