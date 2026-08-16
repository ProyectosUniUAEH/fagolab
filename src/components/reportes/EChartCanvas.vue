<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import {
  BarChart,
  BoxplotChart,
  FunnelChart,
  GraphChart,
  HeatmapChart,
  LineChart,
  PieChart,
  RadarChart,
  SankeyChart,
  ScatterChart,
  SunburstChart,
} from 'echarts/charts'
import {
  AriaComponent,
  CalendarComponent,
  GraphicComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components'
import { init, type ECharts } from 'echarts/core'
import type { EChartsOption } from 'echarts'

use([
  CanvasRenderer,
  BarChart,
  BoxplotChart,
  FunnelChart,
  GraphChart,
  HeatmapChart,
  LineChart,
  PieChart,
  RadarChart,
  SankeyChart,
  ScatterChart,
  SunburstChart,
  AriaComponent,
  CalendarComponent,
  GraphicComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  TooltipComponent,
  VisualMapComponent,
])

const props = defineProps<{
  option: EChartsOption
  ariaLabel?: string
}>()

const root = ref<HTMLDivElement | null>(null)
let chart: ECharts | null = null
let observer: ResizeObserver | null = null

function render() {
  if (!chart) return
  chart.setOption(props.option, { notMerge: true, lazyUpdate: true })
}

function download(filename: string) {
  if (!chart) return
  const link = document.createElement('a')
  link.href = chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#ffffff' })
  link.download = `${filename}.png`
  link.click()
}

onMounted(() => {
  if (!root.value) return
  chart = init(root.value, undefined, { renderer: 'canvas' })
  render()
  observer = new ResizeObserver(() => chart?.resize())
  observer.observe(root.value)
})

watch(() => props.option, render, { deep: true })

onBeforeUnmount(() => {
  observer?.disconnect()
  chart?.dispose()
})

defineExpose({ download })
</script>

<template>
  <div
    ref="root"
    class="echart-canvas"
    role="img"
    :aria-label="ariaLabel || 'Visualización interactiva'"
  />
</template>

<style scoped>
.echart-canvas {
  width: 100%;
  height: 100%;
  min-height: 300px;
}
</style>
