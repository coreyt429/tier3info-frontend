<template>
  <q-card flat bordered>
    <q-card-section class="row items-center q-gutter-sm">
      <div class="text-h6 col">Upgrade Rules</div>
      <q-input v-model="newRuleKey" dense outlined label="Add rule" class="col-12 col-sm-4" @keyup.enter="addRule">
        <template v-slot:append>
          <q-btn flat round dense icon="add" color="positive" @click="addRule" />
        </template>
      </q-input>
    </q-card-section>

    <q-separator />

    <q-card-section class="q-gutter-md">
      <q-input
        :model-value="urlTemplate"
        dense
        outlined
        label="Upgrade URL template"
        @update:model-value="updateUrlTemplate"
        @blur="updateUrlTemplate(String(urlTemplate || '').trim())"
      />

      <div v-if="modelsMissingRules.length || rulesMissingModels.length" class="row q-col-gutter-sm">
        <div v-if="modelsMissingRules.length" class="col-12 col-md-6">
          <q-banner dense class="bg-amber-1 text-brown-9">
            Models without upgrade rules:
            <q-chip v-for="model in modelsMissingRules" :key="model" dense square>{{ model }}</q-chip>
          </q-banner>
        </div>
        <div v-if="rulesMissingModels.length" class="col-12 col-md-6">
          <q-banner dense class="bg-blue-1 text-blue-9">
            Rules without matching models:
            <q-chip v-for="rule in rulesMissingModels" :key="rule" dense square>{{ rule }}</q-chip>
          </q-banner>
        </div>
      </div>

      <q-markup-table dense flat bordered separator="cell">
        <thead>
          <tr>
            <th class="text-left">Rule</th>
            <th v-for="field in ruleFields" :key="field" class="text-left">{{ field }}</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="rule in ruleRows" :key="rule.key">
            <td>
              <q-input
                :model-value="pendingRenames[rule.key] ?? rule.key"
                dense
                borderless
                @update:model-value="setPendingRename(rule.key, $event)"
                @blur="renameRule(rule.key)"
              />
            </td>
            <td v-for="field in ruleFields" :key="`${rule.key}-${field}`">
              <q-input
                :model-value="rule.value[field]"
                dense
                borderless
                @update:model-value="(value) => updateRuleField(rule.key, field, value)"
                @blur="trimRuleField(rule.key, field)"
              />
            </td>
            <td class="text-right">
              <q-btn flat round dense icon="delete" color="negative" @click="removeRule(rule.key)" />
            </td>
          </tr>
        </tbody>
      </q-markup-table>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  models: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue'])
const newRuleKey = ref('')
const pendingRenames = ref({})

const upgradeRules = computed(() => props.modelValue || {})
const urlTemplate = computed(() => upgradeRules.value.url_template || '')
const ruleRows = computed(() =>
  Object.entries(upgradeRules.value)
    .filter(([, value]) => value && typeof value === 'object' && !Array.isArray(value))
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => a.key.localeCompare(b.key)),
)
const ruleFields = computed(() => {
  const fields = new Set(['minimum', 'recommended'])
  ruleRows.value.forEach((rule) => {
    Object.keys(rule.value).forEach((field) => fields.add(field))
  })
  return [...fields]
})
const ruleKeys = computed(() => ruleRows.value.map((rule) => rule.key))
const modelsMissingRules = computed(() => (props.models || []).filter((model) => !ruleKeys.value.includes(model)))
const rulesMissingModels = computed(() => ruleKeys.value.filter((rule) => !(props.models || []).includes(rule)))

function normalizedValue(value) {
  return String(value ?? '').trim()
}

function emitRules(nextRules) {
  emit('update:modelValue', nextRules)
}

function updateUrlTemplate(value) {
  emitRules({ ...upgradeRules.value, url_template: value })
}

function addRule() {
  const key = normalizedValue(newRuleKey.value)
  if (!key || Object.hasOwn(upgradeRules.value, key)) {
    newRuleKey.value = ''
    return
  }
  emitRules({
    ...upgradeRules.value,
    [key]: {
      minimum: '',
      recommended: '',
    },
  })
  newRuleKey.value = ''
}

function updateRuleField(ruleKey, field, value) {
  emitRules({
    ...upgradeRules.value,
    [ruleKey]: {
      ...(upgradeRules.value[ruleKey] || {}),
      [field]: value,
    },
  })
}

function trimRuleField(ruleKey, field) {
  updateRuleField(ruleKey, field, normalizedValue(upgradeRules.value[ruleKey]?.[field]))
}

function setPendingRename(ruleKey, value) {
  pendingRenames.value = { ...pendingRenames.value, [ruleKey]: value }
}

function renameRule(oldKey) {
  const nextKey = normalizedValue(pendingRenames.value[oldKey] ?? oldKey)
  if (!nextKey || nextKey === oldKey || Object.hasOwn(upgradeRules.value, nextKey)) {
    setPendingRename(oldKey, oldKey)
    return
  }
  const nextRules = {}
  for (const [key, value] of Object.entries(upgradeRules.value)) {
    nextRules[key === oldKey ? nextKey : key] = value
  }
  emitRules(nextRules)
}

function removeRule(ruleKey) {
  const nextRules = { ...upgradeRules.value }
  delete nextRules[ruleKey]
  emitRules(nextRules)
}
</script>
