<template>
  <q-page class="q-pa-md column items-start">
    <!-- Configurable Title Banner -->
    <div class="q-pa-md text-h5 text-center bg-secondary text-white full-width q-mt-none">
      {{ title }}
    </div>

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
        :color="button.color"
        @click="button.action"
        class="q-mx-sm"
      />
    </div>
  </q-page>
</template>

<script setup>
import { tier3info_restful_request } from 'src/plugins/tier3info.js'
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { reactive } from 'vue'
import { VAceEditor } from 'vue3-ace-editor'
import 'src/plugins/ace-config'
// import yaml from 'js-yaml'
// import { mdiBookOpenBlankVariant } from '@quasar/extras/mdi-v5'

const states = reactive({
  lang: 'yaml',
  theme: 'monokai',
  content: '',
})

// watch(
//   () => states.lang,
//   async (lang) => {
//     states.content = (
//       await {
//         json: import('../../package.json?raw'),
//         javascript: import('../plugins/ace-config.js?raw'),
//         html: import('../../index.html?raw'),
//         yaml: import('../../test.yaml?raw'),
//       }[lang]
//     ).default
//   },
//   { immediate: true },
// )

const route = useRoute()
const title = computed(() => route.meta.title || 'Default Page Title')
const endpoint = computed(() => route.meta.endpoint || '/cfg')

const selectLabel = computed(() => route.meta.label || 'Config:')
const response = await tier3info_restful_request({ path: endpoint.value, method: 'GET' })
console.log('Config options:', response.data)
const selectOptions = ref(response.data)
const selectedOption = ref(null)
// const editorContent = ref('test content')
const editorLabel = ref('Editor Label')
const buttons = ref([
  { label: 'Save', color: 'primary', action: () => console.log('Save clicked') },
  { label: 'Cancel', color: 'negative', action: () => console.log('Cancel clicked') },
])

// Watch for changes to selectedOption and fetch YAML content
// watch(selectedOption, async (option) => {
//   console.log('Selected option changed:', option)
//   if (option) {
//     const response = await tier3info_restful_request({
//       path: `${endpoint.value}/${option}`,
//       method: 'GET',
//     })
//     console.log('Response from server:', response)
//     const yaml_string = yaml.dump(response)
//     console.log('YAML content:', yaml_string)
//     states.content = yaml_string
//   }
// })
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
