<template>
  <q-card flat bordered>
    <q-card-section class="row items-center">
      <div class="text-h6 col">User Agents</div>
      <q-btn color="positive" icon="add" label="Add" @click="addRule" />
    </q-card-section>

    <q-separator />

    <q-card-section class="q-gutter-md">
      <q-expansion-item
        v-for="(rule, index) in rules"
        :key="index"
        default-opened
        expand-separator
        icon="rule"
        :label="`User-Agent Rule ${index + 1}`"
      >
        <div class="q-pa-md q-gutter-md">
          <q-input
            :model-value="rule.regex"
            outlined
            type="textarea"
            autogrow
            label="Regex"
            input-class="regex-textarea"
            @update:model-value="(value) => updateRule(index, { regex: value })"
            @blur="trimRuleString(index, 'regex')"
          />

          <DeviceTypeStringListEditor
            :model-value="rule.fields || []"
            title="Capture Fields"
            item-label="Field"
            @update:model-value="(value) => updateRule(index, { fields: value })"
          />

          <DeviceTypeStringListEditor
            :model-value="rule.dpts || []"
            title="Device Profile Types"
            item-label="DPT"
            @update:model-value="(value) => updateRule(index, { dpts: value })"
          />

          <q-card flat bordered>
            <q-card-section>
              <div class="text-subtitle1 q-mb-sm">Test User-Agent</div>
              <q-input
                v-model="testInputs[index]"
                dense
                outlined
                label="Paste user-agent"
                @blur="testInputs[index] = String(testInputs[index] || '').trim()"
              />
            </q-card-section>
            <q-card-section v-if="testInputs[index]">
              <q-banner v-if="parseError(rule, testInputs[index])" dense class="bg-red-1 text-negative">
                {{ parseError(rule, testInputs[index]) }}
              </q-banner>
              <div v-else-if="parsedValues(rule, testInputs[index])" class="row q-col-gutter-sm">
                <div
                  v-for="field in rule.fields || []"
                  :key="field"
                  class="col-12 col-sm-6 col-md-3"
                >
                  <q-field dense outlined stack-label :label="fieldLabel(field)">
                    <template v-slot:control>
                      <div class="self-center full-width no-outline">
                        {{ parsedValues(rule, testInputs[index])?.[field] || '' }}
                      </div>
                    </template>
                  </q-field>
                </div>
              </div>
              <q-banner v-else dense class="bg-amber-1 text-brown-9">No match.</q-banner>
            </q-card-section>
          </q-card>

          <div class="row justify-end">
            <q-btn color="negative" icon="delete" label="Delete" @click="removeRule(index)" />
          </div>
        </div>
      </q-expansion-item>

      <div v-if="!rules.length" class="text-grey-7">No user-agent rules configured.</div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { computed, ref } from 'vue'
import DeviceTypeStringListEditor from 'src/components/DeviceTypeStringListEditor.vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue'])
const testInputs = ref({})

const rules = computed(() => props.modelValue || [])

function normalizedString(value) {
  return String(value ?? '').trim()
}

function emitRules(nextRules) {
  emit('update:modelValue', nextRules)
}

function addRule() {
  emitRules([
    ...rules.value,
    {
      regex: '',
      fields: ['vendor', 'model', 'firmware', 'mac_address'],
      dpts: [],
    },
  ])
}

function updateRule(index, patch) {
  const nextRules = [...rules.value]
  nextRules[index] = { ...(nextRules[index] || {}), ...patch }
  emitRules(nextRules)
}

function trimRuleString(index, field) {
  updateRule(index, { [field]: normalizedString(rules.value[index]?.[field]) })
}

function removeRule(index) {
  emitRules(rules.value.filter((_, ruleIndex) => ruleIndex !== index))
}

function createRegex(rule) {
  try {
    return new RegExp(rule.regex || '')
  } catch (error) {
    return { error: error.message }
  }
}

function parseError(rule, userAgent) {
  if (!userAgent) {
    return ''
  }
  const regex = createRegex(rule)
  return regex.error || ''
}

function parsedValues(rule, userAgent) {
  if (!userAgent || parseError(rule, userAgent)) {
    return null
  }
  const match = userAgent.match(createRegex(rule))
  if (!match) {
    return null
  }
  return (rule.fields || []).reduce((values, field, index) => {
    values[field] = match[index + 1] || ''
    return values
  }, {})
}

function fieldLabel(field) {
  if (field === 'firmware') {
    return 'version / firmware'
  }
  return field
}
</script>

<style lang="scss" scoped>
:deep(.regex-textarea) {
  font-family: monospace;
}
</style>
