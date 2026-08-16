<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
} from 'chart.js'

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip)

const props = defineProps<{
  labels: string[]
  data: number[]
  colors?: string[]
  horizontal?: boolean
  suggestedMax?: number
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null

function render() {
  if (!canvas.value) return
  chart?.destroy()
  chart = new Chart(canvas.value, {
    type: 'bar',
    data: {
      labels: props.labels,
      datasets: [
        {
          data: props.data,
          backgroundColor: props.colors ?? '#0d9488',
          borderRadius: 8,
          maxBarThickness: 38,
        },
      ],
    },
    options: {
      indexAxis: props.horizontal ? 'y' : 'x',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: !props.horizontal, color: '#eef2f6' }, ticks: { color: '#6b7d92' }, suggestedMax: props.horizontal ? props.suggestedMax : undefined },
        y: { grid: { display: !!props.horizontal ? false : true, color: '#eef2f6' }, ticks: { color: '#6b7d92' }, suggestedMax: !props.horizontal ? props.suggestedMax : undefined },
      },
    },
  })
}

onMounted(render)
watch(() => [props.labels, props.data], render, { deep: true })
onBeforeUnmount(() => chart?.destroy())
</script>

<template>
  <div style="position: relative; height: 240px">
    <canvas ref="canvas"></canvas>
  </div>
</template>
