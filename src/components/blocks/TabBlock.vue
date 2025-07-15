<template>
  <div>
    <q-card>
      <q-card-section>
        <q-tabs v-model="tab" dense>
          <q-tab v-for="(content, label) in contents" :key="label" :name="label" :label="label" />
        </q-tabs>
      </q-card-section>

      <q-separator />

      <q-card-section>
        <q-tab-panels v-model="tab" animated>
          <q-tab-panel v-for="(content, label) in contents" :key="label" :name="label">
            <DynamicDisplay :data="content" />
          </q-tab-panel>
        </q-tab-panels>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import DynamicDisplay from '../DynamicDisplay.vue'

const props = defineProps({
  contents: Object,
})

const tab = ref(Object.keys(props.contents)[0])
</script>
