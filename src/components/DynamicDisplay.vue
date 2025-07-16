<template>
  <div>
    <template v-if="useQcard">
      <q-card>
        <component
          v-for="(item, index) in data"
          :key="index"
          :is="componentMap[item.type] || 'div'"
          v-bind="item"
        />
      </q-card>
    </template>
    <template v-else>
      <component
        v-for="(item, index) in data"
        :key="index"
        :is="componentMap[item.type] || 'div'"
        v-bind="item"
      />
    </template>
  </div>
</template>

<script setup>
import HtmlBlock from './blocks/HtmlBlock.vue'
import DividerBlock from './blocks/DividerBlock.vue'
import LegendBlock from './blocks/LegendBlock.vue'
import TabBlock from './blocks/TabBlock.vue'
import DataTableBlock from './blocks/DataTableBlock.vue'
import ChartBlock from './blocks/ChartBlock.vue'

const props = defineProps({
  data: {
    type: Array,
    required: true,
  },
  useQcard: {
    type: Boolean,
    default: true,
  },
})

console.log('DynamicDisplay props:', props)

const componentMap = {
  html: HtmlBlock,
  divider: DividerBlock,
  legend: LegendBlock,
  tabs: TabBlock,
  datatable: DataTableBlock,
  chart: ChartBlock,
}
</script>
