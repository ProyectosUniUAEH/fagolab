<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Icon from '../components/Icon.vue'
import LabelCard from '../components/LabelCard.vue'
import { useLabStore } from '../stores/lab'
import { organoNombre } from '../data/catalogs'
import type { Etiqueta } from '../data/types'

const lab = useLabStore()

type Fuente = 'cajas' | 'subcultivos' | 'viales' | 'peces'
const fuente = ref<Fuente>('cajas')
const columnas = ref(3)
// Con datos reales hay >1000 objetos; renderizar todos los QR/códigos a la vez
// congela el navegador. Mostramos por lotes (ideal para imprimir hoja por hoja).
const TAMANO_LOTE = 60
const lote = ref(0)

const todos = computed<Etiqueta[]>(() => {
  if (fuente.value === 'cajas')
    return lab.state.cajas.map((c) => ({
      codigo: c.codigo,
      tipo: 'caja_petri',
      titulo: lab.pezDeCaja(c)?.codigo ?? '',
      sub: `${organoNombre(lab.organoDeCaja(c))} · ${c.medio}`,
    }))
  if (fuente.value === 'subcultivos')
    return lab.state.subcultivos.map((s) => ({ codigo: s.codigo, tipo: 'subcultivo', titulo: 'Subcultivo', sub: `morfotipo ${s.morfotipo}` }))
  if (fuente.value === 'viales')
    return lab.state.viales.map((v) => ({ codigo: v.codigo, tipo: 'vial_adn', titulo: 'Vial ADN', sub: `${v.concentracionNgUl ?? '?'} ng/µL` }))
  return lab.state.peces.map((p) => ({ codigo: p.codigo, tipo: 'pez', titulo: 'Pez', sub: `${p.pesoG} g · ${p.longitudCm} cm` }))
})

const totalLotes = computed(() => Math.max(1, Math.ceil(todos.value.length / TAMANO_LOTE)))
const items = computed<Etiqueta[]>(() => todos.value.slice(lote.value * TAMANO_LOTE, lote.value * TAMANO_LOTE + TAMANO_LOTE))

watch(fuente, () => { lote.value = 0 })

const fuentes: { key: Fuente; label: string }[] = [
  { key: 'cajas', label: 'Cajas Petri' },
  { key: 'subcultivos', label: 'Subcultivos' },
  { key: 'viales', label: 'Viales ADN' },
  { key: 'peces', label: 'Peces' },
]

function imprimir() {
  window.print()
}
</script>

<template>
  <div class="page-head no-print">
    <div>
      <h1>Etiquetas QR / código de barras</h1>
      <p class="sub">Genera hojas A4 imprimibles para identificar físicamente cada objeto del laboratorio.</p>
    </div>
    <div class="actions">
      <button class="btn btn-primary" @click="imprimir"><Icon name="print" :size="16" /> Imprimir hoja</button>
    </div>
  </div>

  <div class="card card-pad no-print" style="margin-bottom: 18px; display: flex; gap: 18px; align-items: center; flex-wrap: wrap">
    <div class="field" style="min-width: 220px">
      <label>Tipo de objeto</label>
      <div class="chips">
        <button v-for="f in fuentes" :key="f.key" class="chip" :class="{ on: fuente === f.key }" @click="fuente = f.key">{{ f.label }}</button>
      </div>
    </div>
    <div class="field" style="width: 160px">
      <label>Columnas</label>
      <select v-model.number="columnas"><option :value="2">2</option><option :value="3">3</option><option :value="4">4</option></select>
    </div>
    <div v-if="totalLotes > 1" class="field" style="min-width: 220px">
      <label>Lote a imprimir ({{ TAMANO_LOTE }} por hoja)</label>
      <div class="chips" style="align-items: center">
        <button class="chip" :disabled="lote === 0" @click="lote = Math.max(0, lote - 1)">‹</button>
        <span style="padding: 0 8px">Lote {{ lote + 1 }} / {{ totalLotes }}</span>
        <button class="chip" :disabled="lote >= totalLotes - 1" @click="lote = Math.min(totalLotes - 1, lote + 1)">›</button>
      </div>
    </div>
    <div class="flow-pill" style="margin-left: auto"><Icon name="tag" :size="14" /> {{ todos.length }} etiquetas · mostrando {{ items.length }}</div>
  </div>

  <div v-if="items.length" class="card card-pad print-sheet">
    <div class="grid" :style="{ gridTemplateColumns: `repeat(${columnas}, minmax(0,1fr))`, gap: '12px' }">
      <LabelCard v-for="it in items" :key="it.codigo" :codigo="it.codigo" :tipo="it.tipo" :titulo="it.titulo" :sub="it.sub" :qr-size="84" />
    </div>
  </div>
  <div v-else class="card card-pad empty">No hay objetos de este tipo todavía.</div>
</template>
