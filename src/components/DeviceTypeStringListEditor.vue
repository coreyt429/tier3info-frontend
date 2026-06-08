<template>
  <q-card flat bordered>
    <q-card-section class="row items-center q-gutter-sm">
      <div class="text-h6 col">{{ title }}</div>
      <q-input
        v-model="newValue"
        dense
        outlined
        :label="`Add ${itemLabel}`"
        class="col-12 col-sm-4"
        @keyup.enter="addValue"
      >
        <template v-slot:append>
          <q-btn flat round dense icon="add" color="positive" @click="addValue" />
        </template>
      </q-input>
    </q-card-section>

    <q-separator />

    <q-card-section>
      <div v-if="items.length" class="row q-col-gutter-sm">
        <div v-for="(item, index) in items" :key="`${item}-${index}`" class="col-12 col-sm-6 col-md-4">
          <q-input
            :model-value="item"
            dense
            outlined
            :label="itemLabel"
            @update:model-value="(value) => updateValue(index, value)"
            @blur="trimValue(index)"
          >
            <template v-slot:append>
              <q-btn flat round dense icon="delete" color="negative" @click="removeValue(index)" />
            </template>
          </q-input>
        </div>
      </div>
      <div v-else class="text-grey-7">No {{ title.toLowerCase() }} configured.</div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  title: { type: String, required: true },
  itemLabel: { type: String, default: 'Value' },
})

const emit = defineEmits(['update:modelValue'])
const newValue = ref('')

const items = computed(() => props.modelValue || [])

function normalizedValue(value) {
  return String(value ?? '').trim()
}

function emitItems(nextItems) {
  emit('update:modelValue', nextItems.map(normalizedValue).filter(Boolean))
}

function addValue() {
  const value = normalizedValue(newValue.value)
  if (!value || items.value.includes(value)) {
    newValue.value = ''
    return
  }
  emitItems([...items.value, value])
  newValue.value = ''
}

function updateValue(index, value) {
  const nextItems = [...items.value]
  nextItems[index] = value
  emit('update:modelValue', nextItems)
}

function trimValue(index) {
  const nextItems = [...items.value]
  nextItems[index] = normalizedValue(nextItems[index])
  emitItems(nextItems)
}

function removeValue(index) {
  emitItems(items.value.filter((_, itemIndex) => itemIndex !== index))
}
</script>
