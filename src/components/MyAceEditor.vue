<template>
  <!-- Configurable Ace Editor with Label -->
  <q-card v-if="states.content !== null" class="q-mt-md">
    <q-card-section class="row items-center">
      <div class="text-h6 text-black q-mb-sm col">
        {{ `${props.label}: ${selectedOption} ` || '' }}
      </div>
      <div class="col-2 flex justify-end">
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
        :options="props.options"
      />
    </q-card-section>
    <q-separator />
    <q-card-section class="row items-center">
      <!-- Configurable Buttons -->
      <div class="q-pa-md row justify-center">
        <q-btn
          v-for="(button, index) in props.buttons"
          :key="index"
          :label="button.label"
          :icon="button.icon"
          :color="button.color"
          @click="() => handleButton(button)"
          class="q-mx-sm"
        />
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, watch, reactive } from 'vue'
import { VAceEditor } from 'vue3-ace-editor'
import 'src/plugins/ace-config'
import yaml from 'js-yaml'
// import axios from 'axios'

const props = defineProps({
  lang: {
    type: String,
    default: 'yaml',
  },
  class: {
    type: String,
    default: 'col',
  },
  label: {
    type: String,
    default: 'label not set',
  },
  buttons: {
    type: Array,
    default: () => [],
  },
  options: {
    type: Object,
    default: () => ({
      useWorker: true,
      enableBasicAutocompletion: true,
      enableSnippets: true,
      enableLiveAutocompletion: true,
      wrapBehavioursEnabled: true,
    }),
  },
  modelValue: {
    type: [String, Number, Object, null],
    default: null,
  },
  endpoint: {
    type: String,
    required: true,
  },
  selectedOption: {
    type: String,
    required: true,
  },
})

const states = reactive({
  lang: props.lang || 'yaml',
  theme: 'github_dark',
  content: null,
})

console.log('MyAceEditor: Initial props:', props)
console.log('MyAceEditor: Initial props.options:', props.options)

const internalValue = ref(props.modelValue)

const emit = defineEmits(['update:modelValue', 'save'])

watch(
  () => props.modelValue,
  (newVal) => {
    console.log('MyAceEditor: modelValue changed:', newVal)
    const currentParsed =
      states.lang === 'yaml'
        ? yaml.dump(yaml.load(states.content || '', { lineWidth: -1 }) || {})
        : JSON.stringify(JSON.parse(states.content || '{}'), null, 2)

    const incomingSerialized =
      states.lang === 'yaml'
        ? yaml.dump(newVal, { lineWidth: -1 })
        : JSON.stringify(newVal, null, 2)

    if (currentParsed !== incomingSerialized) {
      console.log('MyAceEditor: Updating content from modelValue')
      states.content = incomingSerialized
    } else {
      console.log('MyAceEditor: Skipping update, content already in sync')
    }
  },
  { immediate: true },
)

// Map Ctrl+S / Cmd+S to Save action
document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    console.log('MyAceEditor: Save shortcut triggered')
    event.preventDefault()
    handleSave()
  }
})

function handleButton(button) {
  if (button.handler === 'handleSave') {
    handleSave()
  } else if (button.emit) {
    emit(button.emit)
  }
}

function handleSave() {
  console.log('MyAceEditor: Save action triggered')
  try {
    let parsed
    if (states.lang === 'yaml') {
      parsed = yaml.load(states.content)
    } else {
      parsed = JSON.parse(states.content)
    }
    emit('save', parsed)
  } catch (err) {
    console.error('Invalid content', err)
  }
}

watch(internalValue, (val) => {
  console.log('MyAceEditor: internalValue changed:', val)
  emit('update:modelValue', val)
})

// Watch for changes in lang and convert content accordingly
watch(
  () => states.lang,
  (newLang, oldLang) => {
    console.log('MyAceEditor: Language changed from', oldLang, 'to', newLang)
    if (states.content === null || states.content === '') return
    try {
      if (newLang === 'yaml' && oldLang === 'json') {
        const jsonObj = JSON.parse(states.content)
        states.content = yaml.dump(jsonObj, { lineWidth: -1 }) // Disable line wrapping
      } else if (newLang === 'json' && oldLang === 'yaml') {
        const yamlObj = yaml.load(states.content)
        states.content = JSON.stringify(yamlObj, null, 2)
      }
    } catch (error) {
      console.error('Error converting content:', error)
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
