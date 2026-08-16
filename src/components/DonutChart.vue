<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { Chart, DoughnutController, ArcElement, Tooltip } from 'chart.js'

Chart.register(DoughnutController, ArcElement, Tooltip)

const props = defineProps<{
  labels: string[]
  data: number[]
  colors: string[]
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null

function render() {
  if (!canvas.value) return
  chart?.destroy()
  chart = new Chart(canvas.value, {
    type: 'doughnut',
    data: {
      labels: props.labels,
      datasets: [{ data: props.data, backgroundColor: props.colors, borderWidth: 0, hoverOffset: 6 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: { legend: { display: false } },
    },
  })
}

onMounted(render)
watch(() => [props.labels, props.data], render, { deep: true })
onBeforeUnmount(() => chart?.destroy())
</script>

<template>
  <div style="position: relative; height: 200px">
    <canvas ref="canvas"></canvas>
  </div>
</template>
