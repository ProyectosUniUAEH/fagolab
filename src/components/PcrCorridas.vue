<script setup lang="ts">
import { computed } from 'vue'
import Icon from './Icon.vue'
import { useLabStore } from '../stores/lab'

/* Historial de corridas de PCR: qué muestras y de qué lotes ya se amplificaron,
 * y cómo salió cada tubo una vez leído en electroforesis. */

const lab = useLabStore()
const corridas = computed(() => lab.state.corridas)

const estadoBadge: Record<string, string> = {
  preparada: 'b-slate',
  corrida: 'b-blue',
  leida: 'b-teal',
}
const estadoLabel: Record<string, string> = {
  preparada: 'Preparada',
  corrida: 'En equipo',
  leida: 'Leída',
}
const resultadoBadge: Record<string, string> = {
  pendiente: 'b-slate',
  positivo: 'b-teal',
  negativo: 'b-coral',
  no_claro: 'b-amber',
  no_revisado: 'b-slate',
}
const resultadoLabel: Record<string, string> = {
  pendiente: 'pendiente',
  positivo: 'positivo',
  negativo: 'negativo',
  no_claro: 'no claro',
  no_revisado: 'sin revisar',
}

function positivasDe(c: { tubos: { tipo: string; resultado: string }[] }) {
  return c.tubos.filter((t) => t.tipo === 'muestra' && t.resultado === 'positivo').length
}
</script>

<template>
  <div class="info-banner teal" style="margin-bottom: 18px">
    <Icon name="database" :size="16" />
    <span>Cada corrida que guardas queda aquí: <b>qué muestras y de qué lotes</b> ya pasaron por PCR, y el resultado de cada tubo cuando lo lees en electroforesis.</span>
  </div>

  <div v-if="!corridas.length" class="empty" style="padding: 30px">
    Aún no has guardado ninguna corrida. Arma tu mezcla maestra y pulsa <b>Guardar corrida</b>.
  </div>

  <div v-for="c in corridas" :key="c.id" class="card corr-card">
    <div class="card-head">
      <div class="ic"><Icon name="dna" :size="16" /></div>
      <h3>{{ c.codigo }}</h3>
      <span class="badge" :class="estadoBadge[c.estado]" style="margin-left: 10px">{{ estadoLabel[c.estado] }}</span>
      <span class="head-meta">{{ c.fecha }} · {{ c.responsable }}</span>
    </div>
    <div class="card-pad">
      <div class="corr-stats">
        <div class="st"><span class="v">{{ c.nMuestras }}</span><span class="k">muestras</span></div>
        <div class="st"><span class="v">{{ c.nReacciones }}</span><span class="k">reacciones</span></div>
        <div class="st"><span class="v" style="color: var(--teal-600)">{{ positivasDe(c) }}</span><span class="k">positivas</span></div>
        <div class="st lotes"><span class="v">{{ c.lotes || '—' }}</span><span class="k">lotes</span></div>
        <div v-if="c.controlPositivo" class="st lotes"><span class="v">{{ c.controlPositivo }}</span><span class="k">control +</span></div>
      </div>

      <div class="chips tubos">
        <span
          v-for="t in c.tubos"
          :key="t.id"
          class="tubo-chip"
          :class="t.tipo"
          :title="`${t.frasco} · ${t.lote || t.tipo} · ${t.resultado}`"
        >
          <span class="n">{{ t.numero }}</span>
          <span class="lab">{{ t.frasco }}</span>
          <span class="badge" :class="resultadoBadge[t.resultado]">{{ resultadoLabel[t.resultado] || t.resultado }}</span>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.corr-card {
  margin-bottom: 16px;
}
.head-meta {
  margin-left: auto;
  font-size: 0.8rem;
  color: var(--muted);
  font-weight: 600;
}
.corr-stats {
  display: flex;
  gap: 26px;
  padding: 4px 2px 16px;
  flex-wrap: wrap;
}
.corr-stats .st {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}
.corr-stats .v {
  font-family: "Sora", sans-serif;
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--ink);
}
.corr-stats .lotes .v {
  font-size: 0.95rem;
}
.corr-stats .k {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  font-weight: 700;
  margin-top: 4px;
}
.tubos {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tubo-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 9px;
  border-radius: 9px;
  border: 1px solid var(--line);
  background: #fff;
}
.tubo-chip.blanco {
  background: var(--line-soft);
}
.tubo-chip.positivo {
  background: var(--amber-50);
  border-color: var(--amber-100, #ffe2b0);
}
.tubo-chip .n {
  display: grid;
  place-items: center;
  width: 19px;
  height: 19px;
  border-radius: 6px;
  background: var(--line-soft);
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--muted);
}
.tubo-chip .lab {
  font-family: "Consolas", monospace;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--ink-soft);
}
</style>
