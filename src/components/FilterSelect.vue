<template>
  <q-select
    v-model="internalValue"
    :options="filteredOptions"
    use-input
    fill-input
    hide-selected
    input-debounce="300"
    @filter="filterFn"
    rounded
    outlined
    emit-value
    map-options
    :label="props.label"
    :class="props.class"
    option-value="value"
  />
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  class: {
    type: String,
    default: 'col',
  },
  label: {
    type: String,
    default: 'label not set',
  },
  options: {
    type: Array,
    default: () => [],
  },
  modelValue: {
    type: [String, Number, Object, null],
    default: null,
  },
})

const filteredOptions = ref(props.options || ['Test Option 1', 'Test Option 2'])

const internalValue = ref(props.modelValue)

// Watch for changes in props.options using a getter for reactivity
watch(
  () => props.options,
  (newOptions) => {
    console.log('FilterSelect: Options updated:', newOptions)
    filteredOptions.value = newOptions
  },
)

const emit = defineEmits(['update:modelValue'])

function filterFn(val, update) {
  console.log('FilterSelect: Filter function called with:', val)
  if (val === '') {
    filteredOptions.value = props.options
    update(() => {})
    return
  }
  update(() => {
    const needle = String(val).toLowerCase()
    filteredOptions.value = props.options.filter((v) => {
      // Handle option as string, object, or other types
      let optionStr
      if (typeof v === 'string' || typeof v === 'number') {
        optionStr = String(v)
      } else if (typeof v === 'object' && v !== null) {
        // Try to use label or value property if present, else fallback to JSON string
        optionStr = v.label ?? v.value ?? JSON.stringify(v)
      } else {
        optionStr = String(v)
      }
      return optionStr.toLowerCase().indexOf(needle) > -1
    })
  })
}

watch(
  () => props.modelValue,
  (newVal) => {
    console.log('FilterSelect: Model value updated:', newVal)
    internalValue.value = newVal
  },
)

watch(internalValue, (val) => {
  emit('update:modelValue', val)
})
</script>
