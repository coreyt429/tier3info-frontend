<template>
  <q-card-section v-if="contents">
    <div class="row justify-content-center">
      <div class="col-md-4 text-center border q-ma-md bg-grey-2">
        <legend>{{ contents.legend }}</legend>
        <canvas ref="canvasRef" :id="contents.id"></canvas>
      </div>
    </div>
  </q-card-section>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import Chart from 'chart.js/auto'

const props = defineProps({
  contents: {
    type: Object,
    required: true,
  },
})
console.log('ChartBlock props:', props)

const canvasRef = ref(null)
let chartInstance = null

onMounted(() => {
  const ctx = canvasRef.value.getContext('2d')
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: props.contents.labels,
      datasets: props.contents.datasets,
    },
    options: props.contents.options || {},
  })
})

onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.destroy()
  }
})
</script>
