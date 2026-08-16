<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import StatCard from '../components/StatCard.vue'
import BarChart from '../components/BarChart.vue'
import DonutChart from '../components/DonutChart.vue'
import Icon from '../components/Icon.vue'
import { useLabStore } from '../stores/lab'
import { useAuthStore } from '../stores/auth'

const lab = useLabStore()
const auth = useAuthStore()
const router = useRouter()

const porMedio = computed(() => lab.cajasPorMedio)
const calidad = computed(() => lab.calidadPorOrgano)

// Embudo del flujo de trabajo (de pez hasta PCR positivo).
const embudo = computed(() => [
  { label: 'Peces', value: lab.kpis.peces, tone: 'var(--blue)' },
  { label: 'Cajas Petri', value: lab.kpis.cajas, tone: 'var(--teal)' },
  { label: 'Con crecimiento', value: lab.kpis.conCrecimiento, tone: '#14b8a6' },
  { label: 'Subcultivos', value: lab.kpis.subcultivos, tone: 'var(--violet)' },
  { label: 'Viales ADN', value: lab.kpis.viales, tone: 'var(--amber)' },
  { label: 'PCR positivos', value: lab.kpis.pcrPositivos, tone: 'var(--coral)' },
])
const maxEmbudo = computed(() => Math.max(...embudo.value.map((e) => e.value), 1))
</script>

<template>
  <div class="page-head">
    <div>
      <h1>Panel del laboratorio</h1>
      <p class="sub">{{ lab.proyecto.nombre }} · {{ lab.proyecto.especie }} · Responsable {{ lab.proyecto.responsable }}</p>
    </div>
    <div class="actions">
      <button v-if="auth.can('datos.database.view')" class="btn" @click="router.push('/modelo')"><Icon name="database" :size="16" /> Modelo de datos</button>
      <button v-if="auth.can('aislamiento.workflow.create')" class="btn btn-primary" @click="router.push('/aislamiento')"><Icon name="plus" :size="16" /> Nuevo aislamiento</button>
    </div>
  </div>

  <div class="grid cols-4" style="margin-bottom: 18px">
    <StatCard label="Peces procesados" :value="lab.kpis.peces" icon="fish" tone="blue" delta="cadena trazable" />
    <StatCard label="Cajas Petri" :value="lab.kpis.cajas" icon="dish" tone="teal" :sub="`${lab.kpis.conCrecimiento} con crecimiento`" />
    <StatCard label="Lecturas NanoDrop" :value="lab.kpis.nanodrop" icon="droplet" tone="amber" sub="calidad de ADN" />
    <StatCard label="PCR positivos" :value="lab.kpis.pcrPositivos" icon="dna" tone="coral" sub="candidatos fagoterapia" />
  </div>

  <div class="grid cols-2" style="margin-bottom: 18px">
    <div class="card">
      <div class="card-head"><div class="ic"><Icon name="chart" :size="16" /></div><h3>Cajas por medio de cultivo</h3></div>
      <div class="card-pad">
        <BarChart :labels="porMedio.map((m) => m.medio)" :data="porMedio.map((m) => m.total)" :colors="porMedio.map((m) => m.color)" />
      </div>
    </div>
    <div class="card">
      <div class="card-head"><div class="ic"><Icon name="droplet" :size="16" /></div><h3>Pureza de ADN (260/280) por órgano</h3></div>
      <div class="card-pad">
        <BarChart v-if="calidad.length" :labels="calidad.map((c) => c.organo)" :data="calidad.map((c) => c.valor)" horizontal :suggestedMax="2.2" :colors="['#2f6fed']" />
        <div v-else class="empty">Aún no hay lecturas NanoDrop registradas.</div>
      </div>
    </div>
  </div>

  <div class="grid cols-2">
    <div class="card">
      <div class="card-head"><div class="ic"><Icon name="layers" :size="16" /></div><h3>Embudo del flujo experimental</h3></div>
      <div class="card-pad" style="display: flex; flex-direction: column; gap: 12px">
        <div v-for="e in embudo" :key="e.label">
          <div style="display: flex; justify-content: space-between; font-size: 0.84rem; margin-bottom: 4px">
            <span style="font-weight: 600; color: var(--ink-soft)">{{ e.label }}</span>
            <b>{{ e.value }}</b>
          </div>
          <div style="height: 10px; background: var(--line-soft); border-radius: 99px; overflow: hidden">
            <div :style="{ width: (e.value / maxEmbudo) * 100 + '%', height: '100%', background: e.tone, borderRadius: '99px', transition: 'width .4s' }"></div>
          </div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-head"><div class="ic"><Icon name="dish" :size="16" /></div><h3>Distribución de cajas</h3></div>
      <div class="card-pad" style="display: flex; align-items: center; gap: 20px">
        <div style="flex: 1; min-width: 0">
          <DonutChart :labels="porMedio.map((m) => m.medio)" :data="porMedio.map((m) => m.total)" :colors="porMedio.map((m) => m.color)" />
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px">
          <div v-for="m in porMedio" :key="m.medio" style="display: flex; align-items: center; gap: 8px; font-size: 0.84rem">
            <span :style="{ width: '10px', height: '10px', borderRadius: '3px', background: m.color }"></span>
            <span style="color: var(--ink-soft); font-weight: 600">{{ m.medio }}</span>
            <b style="margin-left: auto">{{ m.total }}</b>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
