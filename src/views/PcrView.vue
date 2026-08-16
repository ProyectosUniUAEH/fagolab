<script setup lang="ts">
import { ref } from 'vue'
import Icon from '../components/Icon.vue'
import PcrMasterMix from '../components/PcrMasterMix.vue'
import PcrPositivos from '../components/PcrPositivos.vue'
import PcrCorridas from '../components/PcrCorridas.vue'
import { useLabStore } from '../stores/lab'
import type { Pcr } from '../data/types'

const lab = useLabStore()
const vialCod = (p: Pcr) => lab.state.viales.find((v) => v.id === p.idVial)?.codigo ?? '—'

const tab = ref<'mezcla' | 'positivos' | 'corridas' | 'reacciones'>('mezcla')
</script>

<template>
  <div class="page-head pcr-head">
    <div>
      <h1>PCR</h1>
      <p class="sub">Amplificación del ADN extraído para visualizar, documentar y preparar corridas moleculares con trazabilidad.</p>
    </div>
  </div>

  <div class="info-banner" style="margin-bottom: 18px">
    <Icon name="dna" :size="16" />
    <span>Se hacen copias del ADN de cada bacteria aislada (gen <b>16S rRNA</b>) para poder diferenciarlas. Las reacciones positivas pasan a electroforesis.</span>
  </div>

  <div class="tabs no-print">
    <button class="tab" :class="{ on: tab === 'mezcla' }" @click="tab = 'mezcla'">
      <Icon name="beaker" :size="16" /> Mezcla maestra
    </button>
    <button class="tab" :class="{ on: tab === 'positivos' }" @click="tab = 'positivos'">
      <Icon name="shield" :size="16" /> Caja de positivos
      <span v-if="lab.state.positivos.length" class="tab-count">{{ lab.state.positivos.length }}</span>
    </button>
    <button class="tab" :class="{ on: tab === 'corridas' }" @click="tab = 'corridas'">
      <Icon name="database" :size="16" /> Corridas hechas
      <span v-if="lab.state.corridas.length" class="tab-count">{{ lab.state.corridas.length }}</span>
    </button>
    <button class="tab" :class="{ on: tab === 'reacciones' }" @click="tab = 'reacciones'">
      <Icon name="dna" :size="16" /> Reacciones
    </button>
  </div>

  <PcrMasterMix v-if="tab === 'mezcla'" />
  <PcrPositivos v-else-if="tab === 'positivos'" />
  <PcrCorridas v-else-if="tab === 'corridas'" />

  <div v-else class="card">
    <div class="card-head"><div class="ic"><Icon name="dna" :size="16" /></div><h3>Reacciones de PCR</h3></div>
    <div class="table-wrap">
      <table class="data">
        <thead><tr><th>Código</th><th>Vial (template)</th><th>Gen objetivo</th><th>Fecha</th><th>Banda (pb)</th><th>Resultado</th></tr></thead>
        <tbody>
          <tr v-for="p in lab.state.pcr" :key="p.id">
            <td class="mono" style="font-weight: 700">{{ p.codigo }}</td>
            <td class="mono">{{ vialCod(p) }}</td>
            <td>{{ p.genObjetivo }}</td>
            <td>{{ p.fecha }}</td>
            <td>{{ p.tamanoBandaPb ?? '—' }}</td>
            <td><span class="badge" :class="p.resultado === 'positivo' ? 'b-teal' : 'b-coral'">{{ p.resultado }}</span></td>
          </tr>
          <tr v-if="!lab.state.pcr.length"><td colspan="6" class="empty">Sin reacciones de PCR.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.pcr-head {
  padding: 18px 20px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--panel), var(--violet-50));
  box-shadow: var(--shadow-sm);
}
.pcr-shell-note {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 16px;
  margin-bottom: 18px;
  border-radius: 16px;
  background: color-mix(in srgb, var(--violet-50) 62%, var(--panel));
  color: var(--ink-soft);
  border: 1px solid var(--line);
  line-height: 1.45;
}
.pcr-shell-note svg {
  color: var(--violet);
  flex: none;
}

.tabs {
  display: inline-flex;
  gap: 4px;
  background: var(--line-soft);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 18px;
}
.tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  border-radius: 9px;
  font-weight: 700;
  font-size: 0.86rem;
  color: var(--muted);
  transition: all 0.15s;
}
.tab svg {
  color: var(--muted);
}
.tab.on {
  background: #fff;
  color: var(--teal-600);
  box-shadow: var(--shadow-sm);
}
.tab.on svg {
  color: var(--teal);
}
.tab-count {
  display: inline-grid;
  place-items: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--teal-100);
  color: var(--teal-600);
  font-size: 0.7rem;
  font-weight: 800;
}
</style>
