<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import { useLabStore } from '../stores/lab'
import { organoNombre } from '../data/catalogs'

const route = useRoute()
const router = useRouter()
const lab = useLabStore()
const codigo = computed(() => decodeURIComponent(String(route.params.codigo || '')).trim())

const caja = computed(() => lab.state.cajas.find((x) => x.codigo === codigo.value))
const subcultivo = computed(() => lab.state.subcultivos.find((x) => x.codigo === codigo.value))
const vial = computed(() => lab.state.viales.find((x) => x.codigo === codigo.value))
const pez = computed(() => lab.state.peces.find((x) => x.codigo === codigo.value))
const lectura = computed(() => vial.value ? lab.state.nanodrop.find((x) => x.idVial === vial.value!.id) : undefined)
const tipo = computed(() => caja.value ? 'Caja Petri' : subcultivo.value ? 'Subcultivo' : vial.value ? 'Vial de ADN' : pez.value ? 'Pez' : '')

const detalle = computed((): string[][] => {
  if (caja.value) {
    const c = caja.value
    return [['Pez', lab.pezDeCaja(c)?.codigo ?? '—'], ['Órgano', organoNombre(lab.organoDeCaja(c))], ['Medio', c.medio], ['Estado', c.estado], ['Fecha de siembra', c.fechaSiembra]]
  }
  if (subcultivo.value) {
    const s = subcultivo.value
    const origen = lab.state.cajas.find((x) => x.id === s.idCaja)
    return [['Caja origen', origen?.codigo ?? '—'], ['Morfotipo', s.morfotipo || '—'], ['Pureza', s.estado], ['Apto para extracción', s.aptoExtraccion ? 'Sí' : 'No'], ['Fecha de siembra', s.fechaSiembra]]
  }
  if (vial.value) {
    const v = vial.value
    return [
      ['Código de extracción', lab.state.extracciones.find((x) => x.id === v.idExtraccion)?.codigo ?? '—'],
      ['Concentración', lectura.value?.concentracionNgUl != null ? `${lectura.value.concentracionNgUl} ng/µL` : 'Sin lectura'],
      ['260/280', String(lectura.value?.ratio260_280 ?? '—')],
      ['260/230', String(lectura.value?.ratio260_230 ?? '—')],
      ['Resultado NanoDrop', lectura.value ? `${lectura.value.calidad} · ${lectura.value.accion}` : 'Pendiente'],
    ]
  }
  if (pez.value) {
    const p = pez.value
    return [['Recepción', lab.state.recepciones.find((x) => x.id === p.idRecepcion)?.codigo ?? '—'], ['Peso', `${p.pesoG} g`], ['Longitud', `${p.longitudCm} cm`], ['Estado clínico', p.estadoClinico || '—'], ['Lesiones', p.lesiones || 'Sin observaciones']]
  }
  return []
})

function abrirModulo() {
  if (caja.value) router.push('/cajas')
  else if (subcultivo.value) router.push('/subcultivos')
  else if (vial.value) router.push('/nanodrop')
  else if (pez.value) router.push('/peces')
}
</script>

<template>
  <main class="qr-page">
    <section class="qr-card">
      <div class="qr-icon"><Icon name="qr" :size="30" /></div>
      <span class="eyebrow">Ficha abierta mediante QR</span>
      <template v-if="tipo">
        <h1>{{ tipo }}</h1>
        <p class="codigo">{{ codigo }}</p>
        <dl class="datos"><template v-for="fila in detalle" :key="fila[0]"><dt>{{ fila[0] }}</dt><dd>{{ fila[1] }}</dd></template></dl>
        <button class="btn btn-primary" @click="abrirModulo"><Icon name="arrow" :size="16" /> Abrir ficha completa</button>
      </template>
      <template v-else>
        <h1>Registro no encontrado</h1>
        <p class="sub">No localizamos <b>{{ codigo || 'este código' }}</b>. Confirma que la etiqueta pertenezca a este sistema.</p>
        <button class="btn" @click="router.push('/')">Ir al inicio</button>
      </template>
    </section>
  </main>
</template>

<style scoped>
.qr-page { min-height: 72vh; display: grid; place-items: center; padding: 24px; }
.qr-card { width: min(100%, 620px); padding: 32px; border: 1px solid var(--line); border-radius: 24px; background: linear-gradient(145deg, #fff, var(--teal-50)); box-shadow: var(--shadow-md); }
.qr-icon { display: grid; place-items: center; width: 58px; height: 58px; border-radius: 18px; background: var(--teal-100); color: var(--teal-600); margin-bottom: 16px; }
h1 { margin: 10px 0 4px; font-size: 1.65rem; }.codigo { font-family: Consolas, monospace; font-weight: 800; color: var(--teal-600); margin: 0 0 22px; }
.datos { display: grid; grid-template-columns: minmax(130px, .8fr) 1.2fr; gap: 0; margin: 0 0 24px; border: 1px solid var(--line); border-radius: 15px; overflow: hidden; }.datos dt, .datos dd { padding: 12px 14px; margin: 0; border-bottom: 1px solid var(--line); }.datos dt:nth-last-of-type(1), .datos dd:last-child { border-bottom: 0; }.datos dt { background: rgba(255,255,255,.65); color: var(--muted); font-weight: 700; }.datos dd { font-weight: 700; color: var(--ink); }
@media (max-width: 520px) { .qr-card { padding: 24px 18px; }.datos { grid-template-columns: 1fr; }.datos dt { padding-bottom: 3px; border-bottom: 0; }.datos dd { padding-top: 3px; } }
</style>
