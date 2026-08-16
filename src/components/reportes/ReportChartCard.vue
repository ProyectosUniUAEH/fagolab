<script setup lang="ts">
import { ref, useAttrs } from 'vue'
import type { EChartsOption } from 'echarts'
import Icon from '../Icon.vue'
import EChartCanvas from './EChartCanvas.vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  title: string
  eyebrow: string
  description: string
  option: EChartsOption
  filename: string
  badge?: string
  tone?: 'mint' | 'blue' | 'amber' | 'coral' | 'violet'
  tall?: boolean
}>(), {
  tone: 'mint',
  tall: false,
})

const expanded = ref(false)
const chart = ref<InstanceType<typeof EChartCanvas> | null>(null)
const attrs = useAttrs()
</script>

<template>
  <div v-if="expanded" class="chart-backdrop" @click="expanded = false" />
  <article class="report-chart-card" :class="[`tone-${tone}`, { expanded, tall }, attrs.class]">
    <header>
      <div>
        <span class="eyebrow">{{ eyebrow }}</span>
        <h3>{{ title }}</h3>
        <p>{{ description }}</p>
      </div>
      <div class="chart-tools">
        <span v-if="badge" class="data-badge">{{ badge }}</span>
        <button type="button" title="Exportar como PNG" @click="chart?.download(props.filename)">
          <Icon name="download" :size="15" />
        </button>
        <button
          type="button"
          :title="expanded ? 'Cerrar vista ampliada' : 'Ampliar gráfica'"
          @click="expanded = !expanded"
        >
          <Icon :name="expanded ? 'minus-circle' : 'grid'" :size="15" />
        </button>
      </div>
    </header>

    <div class="chart-stage">
      <EChartCanvas
        ref="chart"
        :option="option"
        :aria-label="`${title}. ${description}`"
      />
    </div>

    <footer v-if="$slots.footer">
      <slot name="footer" />
    </footer>
  </article>
</template>

<style scoped>
.chart-backdrop {
  position: fixed;
  inset: 0;
  z-index: 129;
  background: rgba(5, 25, 35, 0.64);
  backdrop-filter: blur(8px);
}
.report-chart-card {
  --accent: #0d9488;
  --wash: #e9faf6;
  position: relative;
  min-width: 0;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--accent) 15%, var(--line));
  border-radius: 24px;
  background:
    radial-gradient(circle at 100% 0, color-mix(in srgb, var(--wash) 72%, transparent), transparent 34%),
    var(--panel);
  box-shadow: 0 18px 44px rgba(15, 36, 56, 0.08);
}
.report-chart-card::after {
  position: absolute;
  inset: 0 auto auto 0;
  width: 100%;
  height: 3px;
  content: '';
  background: linear-gradient(90deg, var(--accent), transparent 70%);
}
.tone-blue { --accent: #3478d4; --wash: #eaf3ff; }
.tone-amber { --accent: #d18a2f; --wash: #fff4df; }
.tone-coral { --accent: #d95d62; --wash: #fff0ef; }
.tone-violet { --accent: #7f68d9; --wash: #f2efff; }
.report-chart-card > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 20px 0;
}
.eyebrow {
  display: block;
  margin-bottom: 7px;
  color: var(--accent);
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
h3 {
  font-size: 1.06rem;
  line-height: 1.2;
}
header p {
  max-width: 600px;
  margin: 7px 0 0;
  color: var(--muted);
  font-size: 0.78rem;
  line-height: 1.55;
}
.chart-tools {
  display: flex;
  align-items: center;
  gap: 7px;
  flex: none;
}
.chart-tools button {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 10px;
  color: var(--ink-soft);
  background: color-mix(in srgb, var(--panel) 88%, transparent);
}
.chart-tools button:hover {
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 35%, var(--line));
  transform: translateY(-1px);
}
.data-badge {
  padding: 5px 8px;
  border-radius: 999px;
  color: var(--accent);
  background: var(--wash);
  font-size: 0.64rem;
  font-weight: 900;
  text-transform: uppercase;
}
.chart-stage {
  height: 330px;
  padding: 4px 12px 14px;
}
.tall .chart-stage { height: 400px; }
footer {
  padding: 0 20px 18px;
  color: var(--muted);
  font-size: 0.74rem;
}
.expanded {
  position: fixed;
  inset: 24px;
  z-index: 130;
  display: flex;
  flex-direction: column;
  border-radius: 28px;
}
.expanded .chart-stage {
  flex: 1;
  height: auto;
  min-height: 0;
}
@media (max-width: 720px) {
  .report-chart-card > header { flex-direction: column; }
  .chart-tools { width: 100%; justify-content: flex-end; }
  .expanded { inset: 10px; }
  .data-badge { margin-right: auto; }
}
</style>
