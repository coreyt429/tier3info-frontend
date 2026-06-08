<template>
  <q-card flat bordered>
    <q-card-section class="row items-center q-gutter-sm">
      <div class="text-h6 col">Templates</div>
      <q-input
        v-model="newTemplateKey"
        dense
        outlined
        label="Add template"
        class="col-12 col-sm-4"
        @keyup.enter="addTemplate"
      >
        <template v-slot:append>
          <q-btn flat round dense icon="add" color="positive" @click="addTemplate" />
        </template>
      </q-input>
    </q-card-section>

    <q-separator />

    <q-card-section class="row q-col-gutter-md">
      <div class="col-12 col-md-3">
        <q-list bordered separator>
          <q-item
            v-for="key in templateKeys"
            :key="key"
            clickable
            :active="key === selectedKey"
            active-class="bg-blue-1 text-primary"
            @click="selectedKey = key"
          >
            <q-item-section>{{ key }}</q-item-section>
            <q-item-section side>
              <q-btn flat round dense icon="delete" color="negative" @click.stop="removeTemplate(key)" />
            </q-item-section>
          </q-item>
        </q-list>
      </div>

      <div class="col-12 col-md-9">
        <template v-if="selectedKey">
          <q-input
            :model-value="pendingRename"
            dense
            outlined
            label="Template key"
            class="q-mb-md"
            @update:model-value="pendingRename = $event"
            @blur="renameTemplate"
          />
          <q-input
            :model-value="templates[selectedKey]"
            outlined
            type="textarea"
            autogrow
            label="Template body"
            input-class="template-textarea"
            @update:model-value="(value) => updateTemplate(selectedKey, value)"
          />
        </template>
        <div v-else class="text-grey-7">Select or add a template.</div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update:modelValue'])
const selectedKey = ref(null)
const newTemplateKey = ref('')
const pendingRename = ref('')

const templates = computed(() => props.modelValue || {})
const templateKeys = computed(() => Object.keys(templates.value).sort())

watch(
  templateKeys,
  (keys) => {
    if (!keys.length) {
      selectedKey.value = null
      return
    }
    if (!selectedKey.value || !keys.includes(selectedKey.value)) {
      selectedKey.value = keys[0]
    }
    pendingRename.value = selectedKey.value
  },
  { immediate: true },
)

watch(selectedKey, (key) => {
  pendingRename.value = key || ''
})

function normalizedKey(value) {
  return String(value ?? '').trim()
}

function emitTemplates(nextTemplates) {
  emit('update:modelValue', nextTemplates)
}

function addTemplate() {
  const key = normalizedKey(newTemplateKey.value)
  if (!key || Object.hasOwn(templates.value, key)) {
    newTemplateKey.value = ''
    return
  }
  emitTemplates({ ...templates.value, [key]: '' })
  selectedKey.value = key
  newTemplateKey.value = ''
}

function updateTemplate(key, value) {
  emitTemplates({ ...templates.value, [key]: value })
}

function renameTemplate() {
  const oldKey = selectedKey.value
  const nextKey = normalizedKey(pendingRename.value)
  if (!oldKey || !nextKey || oldKey === nextKey || Object.hasOwn(templates.value, nextKey)) {
    pendingRename.value = oldKey || ''
    return
  }
  const nextTemplates = {}
  for (const [key, value] of Object.entries(templates.value)) {
    nextTemplates[key === oldKey ? nextKey : key] = value
  }
  emitTemplates(nextTemplates)
  selectedKey.value = nextKey
}

function removeTemplate(keyToRemove) {
  const nextTemplates = { ...templates.value }
  delete nextTemplates[keyToRemove]
  emitTemplates(nextTemplates)
}
</script>

<style lang="scss" scoped>
:deep(.template-textarea) {
  font-family: monospace;
  min-height: 360px;
  white-space: pre;
}
</style>
