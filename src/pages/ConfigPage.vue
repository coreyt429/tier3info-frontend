<template>
  <q-page class="q-pa-md column items-start">
    <!-- Configurable Select with Label -->
    <div class="q-pa-md">
      <q-item>
        <q-item-section>
          <q-item-label>{{ selectLabel }}</q-item-label>
        </q-item-section>
        <q-item-section>
          <q-select v-model="selectedOption" :options="selectOptions" outlined dense />
        </q-item-section>
      </q-item>
    </div>

    <!-- Configurable Ace Editor with Label -->
    <div class="q-pa-md full-width">
      <q-item class="q-pa-md column" style="resize: vertical; overflow: auto">
        <q-item-label class="q-mb-sm">{{ editorLabel }}</q-item-label>
        <VAceEditor
          ref="aceRef"
          v-model:value="states.content"
          class="vue-ace-editor"
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
      </q-item>
    </div>

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
console.log('Config options:', response.data)
const selectOptions = ref(response.data)
// const selectOptions = ref(['dashboard', 'bwlog'])

const selectedOption = ref(null)
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
    } catch (error) {
      console.error('Error converting YAML to JSON:', error)
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

selectedOption.value = response.data[0] || null
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
  height: 100%;
  min-height: 300px;
  resize: vertical;
  overflow: auto;
}
.vue-ace-editor .ace_content {
  height: 100%;
}
</style>
