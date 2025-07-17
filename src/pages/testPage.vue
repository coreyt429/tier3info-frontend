<template>
  <div>
    <q-card>
      <q-card-section>
        <h2>Filter Select Example</h2>
        <p>
          This component allows you to select options and click buttons to modify the selection.
        </p>
      </q-card-section>
      <FilterSelect
        v-model="selected"
        :options="options"
        label="Test Label"
        option-value="value"
        option-label="label"
      />
      <p>Selected option: {{ selected }}</p>
    </q-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import FilterSelect from 'src/components/FilterSelect.vue'

const selected = ref(null)
// const lastClicked = ref(null)
const options = ref([
  { label: 'Option 1', value: 'option1' },
  { label: 'Option 2', value: 'option2' },
  { label: 'Option 3', value: 'option3' },
])
// const buttons = [
//   { label: 'Button 1', icon: 'flag', color: 'primary', disabled: false },
//   { label: 'Button 2', icon: 'build', color: 'secondary', disabled: false },
//   { label: 'Button 3', icon: 'settings', color: 'accent', disabled: true },
// ]
// let counter = 0
// function handleButtonClick(button) {
//   lastClicked.value = button.label
//   if (button.label === 'Button 1') {
//     console.log('Button 1 clicked, adding new option')
//     const newOption = { label: `New Option ${counter}`, value: `newOption${counter}` }
//     options.value = [...options.value, newOption]
//     selected.value = newOption.value
//     counter++
//   } else if (button.label === 'Button 2') {
//     console.log('Button 2 clicked, adding another new option')
//     const newOption = { label: `New Option ${counter}`, value: `newOption${counter}` }
//     options.value = [...options.value, newOption]
//     selected.value = newOption.value // 👈 Set the new selection
//     counter++
//   } else if (button.label === 'Button 3') {
//     console.log('Button 3 is disabled, no action taken')
//   }
//   console.log('Current options:', options.value)
// }
</script>
