<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from './Icon.vue'
import { api } from '../api'
import { useLabStore } from '../stores/lab'
import { useAuthStore } from '../stores/auth'

const lab = useLabStore()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

interface Frasco {
  codigo: string
  num: number
  muestra: string
  organo: string
  ngul: number | null
  lote: string
  yaCorrida?: boolean
}

interface Reactivo {
  id: string
  nombre: string
  stock: string
  ulPorRxn: number
  esAgua?: boolean
  esMolde?: boolean
}

const STORAGE_KEY = 'fago.pcr.receta.v1'

function recetaDefault(): { volFinal: number; reactivos: Reactivo[] } {
  return {
    volFinal: 25,
    reactivos: [
      { id: 'buffer', nombre: 'Buffer', stock: '10X', ulPorRxn: 2.5 },
      { id: 'mgcl2', nombre: 'MgCl₂', stock: '25 mM', ulPorRxn: 1.5 },
      { id: 'dntps', nombre: 'dNTPs', stock: '10 mM', ulPorRxn: 0.5 },
      { id: 'taq', nombre: 'Taq polimerasa', stock: '5 U/µL', ulPorRxn: 0.2 },
      { id: 'agua', nombre: 'H₂O libre de nucleasas', stock: 'auto', ulPorRxn: 0, esAgua: true },
      { id: 'adn', nombre: 'ADN molde', stock: 'muestra', ulPorRxn: 2.5, esMolde: true },
    ],
  }
}

const cargando = ref(true)
const errorCarga = ref<string | null>(null)
const frascos = ref<Frasco[]>([])
const receta = reactive(recetaDefault())

const seleccion = ref<string[]>([])
const loteActivo = ref<string>('')
// La lista muestra de inmediato los viales disponibles; el rango sigue como
// alternativa cuando se trabaja con muchas muestras del mismo lote.
const modo = ref<'rango' | 'lista'>('lista')
const rangoDesde = ref<string>('')
const rangoHasta = ref<string>('')

const usarBlanco = ref(true)
const usarPositivo = ref(true)
const margenError = ref(1)
const controlPositivoId = ref<string>('')
const positivosDisponibles = computed(() => lab.state.positivos.filter((p) => p.estado === 'disponible'))
const controlElegido = computed(() => lab.state.positivos.find((p) => p.id === controlPositivoId.value))

const fechaCorrida = ref(new Date().toISOString().slice(0, 10))
const guardando = ref(false)
const guardado = ref<{ codigo: string; nTubos: number } | null>(null)
const errorGuardar = ref<string | null>(null)

onMounted(async () => {
  cargarReceta()
  try {
    frascos.value = await api.get<Frasco[]>('/api/pcr/pendientes')
    if (lotes.value.length) loteActivo.value = lotes.value[0]
    const vialSolicitado = typeof route.query.vial === 'string' ? route.query.vial : ''
    if (vialSolicitado && frascosElegibles.value.some((f) => f.codigo === vialSolicitado)) {
      seleccion.value = [vialSolicitado]
      const frasco = frascosElegibles.value.find((f) => f.codigo === vialSolicitado)
      if (frasco) loteActivo.value = frasco.lote
    }
  } catch (e) {
    errorCarga.value = e instanceof Error ? e.message : String(e)
  } finally {
    cargando.value = false
  }
})

function cargarReceta() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const data = JSON.parse(raw)
    if (typeof data.volFinal === 'number') receta.volFinal = data.volFinal
    if (Array.isArray(data.reactivos) && data.reactivos.length) receta.reactivos = data.reactivos
  } catch {
    // Si la receta local está dañada, se usa la receta base.
  }
}

watch(
  receta,
  () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(receta))
  },
  { deep: true },
)

function restablecerReceta() {
  const def = recetaDefault()
  receta.volFinal = def.volFinal
  receta.reactivos = def.reactivos
}

// El backend ya devuelve únicamente viales enviados desde NanoDrop y aún sin PCR.
const frascosElegibles = computed(() => frascos.value)
const lotes = computed(() => [...new Set(frascosElegibles.value.map((f) => f.lote))])
const frascosLote = computed(() => frascosElegibles.value.filter((f) => f.lote === loteActivo.value))
const seleccionados = computed(() =>
  seleccion.value
    .map((cod) => frascosElegibles.value.find((f) => f.codigo === cod))
    .filter((f): f is Frasco => !!f),
)

function toggleFrasco(cod: string) {
  const i = seleccion.value.indexOf(cod)
  if (i >= 0) seleccion.value.splice(i, 1)
  else seleccion.value.push(cod)
}
function quitar(cod: string) {
  const i = seleccion.value.indexOf(cod)
  if (i >= 0) seleccion.value.splice(i, 1)
}
function limpiarSeleccion() {
  seleccion.value = []
}
function seleccionarLoteCompleto() {
  for (const f of frascosLote.value) if (!seleccion.value.includes(f.codigo)) seleccion.value.push(f.codigo)
}
function aplicarRango() {
  const a = frascosLote.value.find((f) => f.codigo === rangoDesde.value)
  const b = frascosLote.value.find((f) => f.codigo === rangoHasta.value)
  if (!a || !b) return
  const lo = Math.min(a.num, b.num)
  const hi = Math.max(a.num, b.num)
  for (const f of frascosLote.value) {
    if (f.num >= lo && f.num <= hi && !seleccion.value.includes(f.codigo)) seleccion.value.push(f.codigo)
  }
}

const fmt = (n: number) => {
  if (!isFinite(n)) return '—'
  return Number(n.toFixed(2)).toString()
}

const molde = computed(() => receta.reactivos.find((r) => r.esMolde))
const volMolde = computed(() => molde.value?.ulPorRxn ?? 0)
const comunes = computed(() => receta.reactivos.filter((r) => !r.esMolde))
const comunesNoAgua = computed(() => comunes.value.filter((r) => !r.esAgua))
const aguaPorRxn = computed(
  () => receta.volFinal - volMolde.value - comunesNoAgua.value.reduce((a, r) => a + (r.ulPorRxn || 0), 0),
)
const mmPorRxn = computed(() => receta.volFinal - volMolde.value)
const nMuestras = computed(() => seleccionados.value.length)
const nExtras = computed(() => (usarBlanco.value ? 1 : 0) + (usarPositivo.value ? 1 : 0) + Math.max(0, margenError.value))
const nReacciones = computed(() => nMuestras.value + nExtras.value)
const nTubos = computed(() => nMuestras.value + (usarBlanco.value ? 1 : 0) + (usarPositivo.value ? 1 : 0))

const filasMM = computed(() =>
  comunes.value.map((r) => {
    const porRxn = r.esAgua ? aguaPorRxn.value : r.ulPorRxn || 0
    return { ...r, porRxn, total: porRxn * nReacciones.value }
  }),
)
const mmTotal = computed(() => mmPorRxn.value * nReacciones.value)
const aguaNegativa = computed(() => aguaPorRxn.value < -0.0001)
const pasosPreparacion = computed(() => filasMM.value.filter((r) => r.porRxn > 0 && !r.esAgua).length + (aguaPorRxn.value > 0 ? 1 : 0))
const volumenReactivosActivos = computed(() => comunesNoAgua.value.reduce((a, r) => a + (r.ulPorRxn || 0), 0))
const fillPct = computed(() => {
  const pct = (volumenReactivosActivos.value / Math.max(1, mmPorRxn.value)) * 100
  return Math.min(100, Math.max(volumenReactivosActivos.value > 0 ? 8 : 0, Math.round(pct)))
})

const reactivoColor = (id: string) => {
  const colors: Record<string, string> = {
    buffer: '#8ddfd2',
    mgcl2: '#90b7ff',
    dntps: '#b9a3f4',
    taq: '#f59a8b',
    agua: '#b7e9ff',
  }
  return colors[id] ?? '#d7e3ea'
}

const tubos = computed(() => {
  const lista: { n: number; etiqueta: string; tipo: string; clase: string; nota: string }[] = []
  let n = 1
  for (const f of seleccionados.value) {
    lista.push({
      n: n++,
      etiqueta: f.codigo,
      tipo: 'Muestra',
      clase: 'sample',
      nota: `${f.lote} · ${f.muestra} · ${f.ngul != null ? f.ngul + ' ng/µL' : 's/d'}`,
    })
  }
  if (usarBlanco.value) lista.push({ n: n++, etiqueta: 'BLANCO', tipo: 'Control −', clase: 'blank', nota: `${fmt(volMolde.value)} µL de H₂O en vez de molde` })
  if (usarPositivo.value) lista.push({ n: n++, etiqueta: 'CONTROL +', tipo: 'Control +', clase: 'positive', nota: `${fmt(volMolde.value)} µL de ADN control positivo` })
  return lista
})

function agregarReactivo() {
  const idx = Math.max(0, receta.reactivos.findIndex((r) => r.id === 'taq'))
  receta.reactivos.splice(idx, 0, { id: 'r' + Date.now(), nombre: 'Nuevo reactivo', stock: '—', ulPorRxn: 0 })
}
function quitarReactivo(id: string) {
  const r = receta.reactivos.find((x) => x.id === id)
  if (!r || r.esAgua || r.esMolde) return
  receta.reactivos = receta.reactivos.filter((x) => x.id !== id)
}
function imprimir() {
  window.print()
}

async function guardarCorrida() {
  if (!nMuestras.value) return
  guardando.value = true
  errorGuardar.value = null
  guardado.value = null
  try {
    const res = await lab.crearCorridaPcr({
      fecha: fechaCorrida.value,
      volFinal: receta.volFinal,
      volMolde: volMolde.value,
      usarBlanco: usarBlanco.value,
      usarPositivo: usarPositivo.value,
      margenError: Math.max(0, margenError.value),
      idControlPositivo: usarPositivo.value ? controlPositivoId.value || null : null,
      receta: { volFinal: receta.volFinal, reactivos: receta.reactivos },
      muestras: seleccionados.value.map((f) => ({ frasco: f.codigo, lote: f.lote, muestra: f.muestra })),
    })
    guardado.value = { codigo: res.codigo, nTubos: res.nTubos }
    limpiarSeleccion()
  } catch (e) {
    errorGuardar.value = e instanceof Error ? e.message : String(e)
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <div class="pcr-mix-page">
    <div class="mix-hero card">
      <div class="mix-hero-text">
        <span class="eyebrow"><Icon name="beaker" :size="15" /> Mezcla maestra · PCR 16S</span>
        <h2>Prepara el mix sin saturarte</h2>
        <p>
          Selecciona muestras, revisa los componentes y calcula el volumen total. El ADN molde se agrega tubo por tubo;
          la mezcla maestra solo lleva los reactivos comunes.
        </p>
      </div>
      <div class="tube-stage" aria-label="Tubo de mezcla maestra">
        <svg class="tube-svg" :class="{ active: volumenReactivosActivos > 0 }" viewBox="0 0 150 230" role="img" aria-label="Tubo de PCR llenándose">
          <defs>
            <clipPath id="tubeClip"><path d="M48 18h54v128c0 35-12 58-27 58s-27-23-27-58z" /></clipPath>
            <linearGradient id="tubeLiquid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#8ee6dd" />
              <stop offset="1" stop-color="#5b8df2" />
            </linearGradient>
          </defs>
          <path d="M42 12h66" class="tube-rim" />
          <path d="M48 18h54v128c0 35-12 58-27 58s-27-23-27-58z" class="tube-glass" />
          <g clip-path="url(#tubeClip)">
            <rect class="liquid-fill" x="45" y="32" width="60" height="172" fill="url(#tubeLiquid)" :style="{ transform: `translateY(${172 - fillPct * 1.72}px)` }" />
            <path class="liquid-wave wave-one" d="M38 43c16-8 34 8 52 0 10-4 20-5 32 0v9c-16 8-31-7-50 0-14 5-24 5-34 0z" :style="{ transform: `translateY(${166 - fillPct * 1.72}px)` }" />
            <path class="liquid-wave wave-two" d="M34 57c18 7 28-5 45 0 15 5 28 5 44-1v8c-17 8-31 4-45 0-18-5-29 8-44 0z" :style="{ transform: `translateY(${166 - fillPct * 1.72}px)` }" />
            <g class="tube-bubbles">
              <circle class="bubble b1" cx="63" cy="176" r="3.5" />
              <circle class="bubble b2" cx="82" cy="186" r="2.5" />
              <circle class="bubble b3" cx="73" cy="164" r="2.8" />
              <circle class="bubble b4" cx="91" cy="154" r="2.2" />
              <circle class="bubble b5" cx="58" cy="145" r="2.4" />
            </g>
          </g>
          <path d="M48 18h54v128c0 35-12 58-27 58s-27-23-27-58z" class="tube-outline" />
        </svg>
        <div class="tube-meta">
          <b>{{ fmt(volumenReactivosActivos) }} / {{ fmt(mmPorRxn) }} µL</b>
          <span>volumen capturado</span>
          <small>{{ pasosPreparacion }} componentes activos</small>
        </div>
      </div>
    </div>

    <div v-if="cargando" class="empty">Cargando frascos...</div>
    <div v-else-if="errorCarga" class="info-banner amber">No se pudieron cargar los frascos: {{ errorCarga }}</div>

    <div v-else class="mix-grid-layout">
      <section class="card sample-panel">
        <div class="panel-title"><span>1</span><div><b>Muestras</b><small>elige frascos para amplificar</small></div></div>
        <div class="field">
          <label>Lote</label>
          <select v-model="loteActivo">
            <option v-for="l in lotes" :key="l" :value="l">{{ l }} · {{ frascos.filter((f) => f.lote === l).length }} frascos</option>
          </select>
        </div>

        <div class="seg">
          <button class="seg-btn" :class="{ on: modo === 'rango' }" @click="modo = 'rango'">Por rango</button>
          <button class="seg-btn" :class="{ on: modo === 'lista' }" @click="modo = 'lista'">Por lista</button>
        </div>

        <div v-if="modo === 'rango'" class="rango-row">
          <div class="field"><label>Desde</label><select v-model="rangoDesde"><option value="">—</option><option v-for="f in frascosLote" :key="f.codigo" :value="f.codigo">{{ f.codigo }} · {{ f.muestra }}</option></select></div>
          <div class="field"><label>Hasta</label><select v-model="rangoHasta"><option value="">—</option><option v-for="f in frascosLote" :key="f.codigo" :value="f.codigo">{{ f.codigo }} · {{ f.muestra }}</option></select></div>
          <button class="btn btn-primary" :disabled="!rangoDesde || !rangoHasta" @click="aplicarRango"><Icon name="plus" :size="15" /> Agregar</button>
        </div>

        <div v-else class="frasco-grid">
          <button v-for="f in frascosLote" :key="f.codigo" class="frasco-chip" :class="{ on: seleccion.includes(f.codigo) }" @click="toggleFrasco(f.codigo)">
            <b>{{ f.codigo }}</b><span>{{ f.muestra }}</span>
          </button>
        </div>

        <div class="row-actions">
          <button class="btn btn-sm" @click="seleccionarLoteCompleto">Todo el lote</button>
          <button class="btn btn-sm" :disabled="!seleccion.length" @click="limpiarSeleccion">Limpiar</button>
        </div>

        <div class="selected-box">
          <div class="selected-head"><b>{{ nMuestras }} muestras</b><span>seleccionadas</span></div>
          <div v-if="!nMuestras" class="empty small">Aún no eliges muestras.</div>
          <div v-else class="chips selected-chips">
            <span v-for="f in seleccionados" :key="f.codigo" class="sel-chip"><b>{{ f.codigo }}</b><small>{{ f.muestra }}</small><button class="x" @click="quitar(f.codigo)">×</button></span>
          </div>
        </div>
      </section>

      <section class="card recipe-panel">
        <div class="panel-title"><span>2</span><div><b>Componentes del mix</b><small>la Taq se deja al último</small></div></div>
        <div class="volume-card">
          <span>Volumen final por reacción</span>
          <label><input type="number" min="1" step="0.5" v-model.number="receta.volFinal" /> µL</label>
        </div>

        <div class="component-list">
          <div v-for="r in filasMM" :key="r.id" class="component-row" :class="{ taq: r.id === 'taq', water: r.esAgua }">
            <span class="drop" :style="{ background: reactivoColor(r.id) }"></span>
            <div class="comp-main">
              <input class="comp-name" v-model="r.nombre" :disabled="r.esAgua" />
              <input class="comp-stock mono" v-model="r.stock" :disabled="r.esAgua" />
            </div>
            <div class="comp-vol">
              <span v-if="r.esAgua" class="auto-val">{{ fmt(aguaPorRxn) }}</span>
              <input v-else type="number" min="0" step="0.1" v-model.number="r.ulPorRxn" />
              <small>µL/rxn</small>
            </div>
            <button v-if="!r.esAgua && r.id !== 'taq'" class="x" @click="quitarReactivo(r.id)">×</button>
          </div>
        </div>

        <div class="recipe-actions">
          <button class="btn btn-sm" @click="agregarReactivo"><Icon name="plus" :size="14" /> Reactivo</button>
          <button class="btn btn-sm" @click="restablecerReceta">Restablecer</button>
        </div>

        <div class="taq-alert">
          <svg class="taq-polimerase-svg" viewBox="0 0 170 118" aria-hidden="true">
            <g class="taq-dna">
              <path d="M14 88c18-20 38 18 56-2s37 16 55-4" />
              <path d="M16 101c18-20 38 18 56-2s37 16 55-4" />
              <path d="M31 82l-9 22M52 92l-9 14M73 84l-10 21M94 89l-9 14M116 78l-10 22" />
            </g>
            <g class="taq-body">
              <path class="taq-shadow" d="M54 92c9 8 51 10 66 1" />
              <path class="taq-blob" d="M47 44c6-18 27-20 39-12 10-12 33-5 35 13 18 5 19 30 4 39-10 17-42 16-51 3-17 8-37-2-36-19-13-10-5-24 9-24z" />
              <circle cx="72" cy="57" r="4" />
              <circle cx="100" cy="57" r="4" />
              <path d="M78 72c8 6 18 6 27 0" />
              <path class="taq-arm left" d="M48 69c-12 2-18 8-20 18" />
              <path class="taq-arm right" d="M121 66c12-1 20 5 24 15" />
            </g>
            <g class="taq-bubble">
              <path d="M105 10h45c7 0 12 5 12 12v22c0 7-5 12-12 12h-24l-14 13 4-13h-11c-7 0-12-5-12-12V22c0-7 5-12 12-12z" />
              <text x="127" y="31" text-anchor="middle">TAQ</text>
              <text x="127" y="45" text-anchor="middle">AL FINAL</text>
            </g>
            <g class="taq-alert-mark">
              <circle cx="37" cy="28" r="13" />
              <path d="M37 20v10M37 37h.01" />
            </g>
          </svg>
          <div><b>Siempre coloca la Taq al último.</b><span>Si la agregas antes, puede empezar a trabajar antes de tiempo. Mantenla fría y súmala al final de las reacciones.</span></div>
        </div>
      </section>

      <aside class="card mix-summary">
        <div class="panel-title"><span>3</span><div><b>Resultado</b><small>volúmenes listos para preparar</small></div></div>
        <div class="calc-counts">
          <div><b>{{ nMuestras }}</b><span>muestras</span></div>
          <i>+</i>
          <div><b>{{ nExtras }}</b><span>extras</span></div>
          <i>=</i>
          <div class="strong"><b>{{ nReacciones }}</b><span>reacciones</span></div>
        </div>

        <div class="mix-total">
          <span>Mezcla maestra total</span>
          <b>{{ fmt(mmTotal) }} µL</b>
          <small>{{ fmt(mmPorRxn) }} µL por tubo + {{ fmt(volMolde) }} µL de ADN</small>
        </div>

        <div class="summary-list">
          <div v-for="r in filasMM" :key="r.id"><span>{{ r.nombre }}</span><b>{{ fmt(r.total) }} µL</b></div>
        </div>
        <div v-if="aguaNegativa" class="mini-warn">Los reactivos superan el volumen final. Baja algún componente.</div>
      </aside>

      <section class="card tube-plan">
        <div class="panel-title"><span>4</span><div><b>¿Cuántos tubos vas a preparar?</b><small>vista visual de muestras y controles</small></div></div>
        <div class="control-row">
          <label class="check-row"><input type="checkbox" v-model="usarBlanco" /><span>Blanco</span></label>
          <label class="check-row"><input type="checkbox" v-model="usarPositivo" /><span>Control positivo</span></label>
          <label class="margin-field">Margen <input type="number" min="0" step="1" v-model.number="margenError" /></label>
        </div>
        <div v-if="usarPositivo" class="field pos-pick">
          <label>Control positivo</label>
          <select v-model="controlPositivoId"><option value="">Sin asignar</option><option v-for="cp in positivosDisponibles" :key="cp.id" :value="cp.id">{{ cp.etiqueta }}{{ cp.organismo ? ' · ' + cp.organismo : '' }}</option></select>
          <span v-if="controlElegido" class="hint">Usado {{ controlElegido.vecesUsado }}× · {{ controlElegido.ubicacion || 'sin ubicación' }}</span>
        </div>

        <div v-if="!nTubos" class="empty small">Selecciona muestras para ver los tubos.</div>
        <div v-else class="tube-rack">
          <div v-for="t in tubos" :key="t.n" class="mini-tube" :class="t.clase" :title="t.nota">
            <svg viewBox="0 0 42 72" aria-hidden="true"><path d="M12 5h18v42c0 12-4 20-9 20s-9-8-9-20z" /><rect x="14" y="34" width="14" height="23" rx="6" /></svg>
            <b>{{ t.n }}</b><span>{{ t.etiqueta }}</span>
          </div>
        </div>
      </section>

      <section class="card save-card">
        <div class="panel-title"><span>5</span><div><b>Guardar corrida</b><small>deja memoria de qué muestras ya se amplificaron</small></div></div>
        <div class="save-row">
          <div class="field"><label>Fecha</label><input type="date" v-model="fechaCorrida" /></div>
          <button v-if="auth.can('pcr.runs.create')" class="btn btn-primary save-btn" :disabled="!nMuestras || guardando" @click="guardarCorrida"><Icon name="save" :size="15" /> {{ guardando ? 'Guardando...' : `Guardar corrida (${nTubos} tubos)` }}</button>
          <button class="btn btn-sm" @click="imprimir"><Icon name="print" :size="14" /> Imprimir</button>
        </div>
        <div v-if="guardado" class="info-banner teal">
          <Icon name="check" :size="16" />
          <span>Corrida <b>{{ guardado.codigo }}</b> guardada con {{ guardado.nTubos }} tubos.</span>
          <button class="btn btn-sm" style="margin-left: auto" @click="router.push('/electroforesis')">Registrar gel</button>
        </div>
        <div v-if="errorGuardar" class="info-banner amber">No se pudo guardar: {{ errorGuardar }}</div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.pcr-mix-page { display: grid; gap: 18px; }
.mix-hero { display: grid; grid-template-columns: 1fr 240px; gap: 22px; align-items: center; padding: 24px; overflow: hidden; background: linear-gradient(120deg, var(--panel), var(--teal-50)); }
.eyebrow { display: inline-flex; align-items: center; gap: 7px; padding: 6px 12px; border-radius: 999px; background: #fff; color: var(--teal-600); font-weight: 800; font-size: .78rem; }
.mix-hero h2 { margin-top: 14px; font-size: 1.85rem; }
.mix-hero p { margin-top: 10px; max-width: 640px; color: var(--ink-soft); line-height: 1.55; }
.tube-stage { display: grid; justify-items: center; gap: 8px; }
.tube-svg { width: 150px; height: 210px; overflow: visible; }
.tube-rim,.tube-outline { fill: none; stroke: color-mix(in srgb, var(--teal) 70%, #fff); stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; }
.tube-glass { fill: rgba(255,255,255,.52); stroke: rgba(15,36,56,.12); stroke-width: 2; }
.liquid-fill {
  opacity: .9;
  transition: transform .65s cubic-bezier(.2,.9,.25,1);
}
.liquid-wave {
  fill: rgba(255,255,255,.28);
  transform-box: fill-box;
  transition: transform .65s cubic-bezier(.2,.9,.25,1);
}
.wave-one { animation: wave-drift 2.5s ease-in-out infinite; }
.wave-two { animation: wave-drift 3.1s ease-in-out infinite reverse; opacity: .2; }
.tube-bubbles {
  opacity: 0;
  transition: opacity .3s ease;
}
.tube-svg.active .tube-bubbles { opacity: 1; }
.bubble {
  fill: #fff;
  opacity: 0;
  transform-box: fill-box;
  transform-origin: center;
  animation: bubble-rise 2.8s linear infinite;
}
.b2 { animation-duration: 2.2s; animation-delay: .35s; }
.b3 { animation-duration: 3.4s; animation-delay: .7s; }
.b4 { animation-duration: 2.7s; animation-delay: 1.1s; }
.b5 { animation-duration: 3s; animation-delay: 1.45s; }
.tube-meta { display: grid; justify-items: center; }
.tube-meta b { color: var(--teal-600); font-size: 1.25rem; }
.tube-meta span,.tube-meta small { color: var(--muted); font-size: .78rem; }
.mix-grid-layout { display: grid; grid-template-columns: minmax(300px, .9fr) minmax(360px, 1.15fr) minmax(300px, .85fr); gap: 18px; align-items: start; }
.sample-panel,.recipe-panel,.mix-summary,.tube-plan,.save-card { padding: 18px; display: grid; gap: 14px; }
.panel-title { display: flex; align-items: center; gap: 10px; }
.panel-title > span { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 11px; background: var(--teal-50); color: var(--teal-600); font-weight: 900; }
.panel-title b { display: block; color: var(--ink); }
.panel-title small { color: var(--muted); font-size: .76rem; }
.seg { display: inline-flex; padding: 4px; border-radius: 12px; background: var(--line-soft); width: fit-content; }
.seg-btn { padding: 8px 14px; border-radius: 10px; color: var(--muted); font-weight: 800; }
.seg-btn.on { background: var(--panel); color: var(--teal-600); box-shadow: var(--shadow-sm); }
.rango-row { display: grid; grid-template-columns: 1fr 1fr auto; gap: 10px; align-items: end; }
.frasco-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(82px, 1fr)); gap: 8px; max-height: 260px; overflow: auto; }
.frasco-chip { display: grid; gap: 2px; padding: 9px; border: 1px solid var(--line); border-radius: 12px; background: var(--panel); color: var(--ink-soft); text-align: left; }
.frasco-chip b { font-family: Consolas, monospace; color: var(--ink); }
.frasco-chip span { font-size: .7rem; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.frasco-chip.on { border-color: var(--teal); background: var(--teal-50); }
.row-actions,.recipe-actions,.control-row,.save-row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.selected-box { padding: 12px; border-radius: 16px; background: var(--line-soft); }
.selected-head { display: flex; justify-content: space-between; color: var(--muted); font-size: .8rem; margin-bottom: 8px; }
.selected-head b { color: var(--ink); }
.selected-chips { gap: 7px; }
.sel-chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 7px 6px 10px; border-radius: 999px; background: var(--panel); border: 1px solid var(--line); }
.sel-chip b { color: var(--teal-600); font-family: Consolas, monospace; font-size: .78rem; }
.sel-chip small { color: var(--muted); }
.x { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 999px; color: var(--muted); }
.x:hover { background: var(--coral-50); color: var(--coral); }
.volume-card { display: flex; justify-content: space-between; gap: 12px; align-items: center; padding: 12px 14px; border-radius: 16px; background: var(--teal-50); color: var(--teal-600); font-weight: 800; }
.volume-card input { width: 78px; padding: 7px 9px; border: 1px solid var(--teal-100); border-radius: 10px; text-align: right; font-weight: 900; color: var(--ink); background: #fff; }
.component-list { display: grid; gap: 9px; }
.component-row { display: grid; grid-template-columns: 18px minmax(0,1fr) 94px 24px; gap: 10px; align-items: center; padding: 10px; border: 1px solid var(--line); border-radius: 15px; background: var(--panel); }
.component-row.taq { border-color: #ffd1c8; background: #fff5f2; }
.component-row.water { background: var(--blue-50); }
.drop { width: 14px; height: 26px; border-radius: 999px; box-shadow: inset 0 0 0 2px rgba(255,255,255,.55); }
.comp-main { display: grid; gap: 4px; min-width: 0; }
.comp-name,.comp-stock,.comp-vol input { width: 100%; border: 1px solid transparent; background: transparent; border-radius: 8px; padding: 5px 7px; color: var(--ink); outline: none; }
.comp-name { font-weight: 800; }
.comp-stock { color: var(--muted); font-size: .76rem; }
.comp-name:focus,.comp-stock:focus,.comp-vol input:focus { border-color: var(--teal); background: #fff; }
.comp-vol { display: grid; justify-items: end; }
.comp-vol input { text-align: right; font-family: Consolas, monospace; font-weight: 900; }
.comp-vol small { color: var(--muted); font-size: .66rem; }
.auto-val { font-family: Consolas, monospace; font-weight: 900; color: var(--blue); padding: 5px 7px; }
.taq-alert { display: grid; grid-template-columns: 138px 1fr; gap: 14px; align-items: center; padding: 12px; border-radius: 18px; background: #fff4f1; border: 1px solid #ffd5cc; overflow: hidden; }
.taq-polimerase-svg { width: 132px; overflow: visible; }
.taq-dna path { fill: none; stroke: #f3b2a7; stroke-width: 3; stroke-linecap: round; animation: dna-slide 4.8s linear infinite; }
.taq-body { animation: taq-bob 2.4s ease-in-out infinite; transform-origin: 82px 65px; }
.taq-shadow { fill: none; stroke: rgba(156,62,48,.18); stroke-width: 7; stroke-linecap: round; }
.taq-blob { fill: #ffd8cf; stroke: #e66755; stroke-width: 3; }
.taq-body circle { fill: #27324a; }
.taq-body path:not(.taq-blob):not(.taq-shadow):not(.taq-arm) { fill: none; stroke: #27324a; stroke-width: 3; stroke-linecap: round; }
.taq-arm { fill: none; stroke: #e66755; stroke-width: 5; stroke-linecap: round; animation: taq-wave 1.6s ease-in-out infinite; transform-origin: center; }
.taq-arm.right { animation-delay: .25s; }
.taq-bubble { animation: bubble-pop 2.3s ease-in-out infinite; transform-origin: 118px 58px; }
.taq-bubble path { fill: #fff; stroke: #e66755; stroke-width: 3; }
.taq-bubble text { fill: #b84435; font-size: 11px; font-weight: 900; font-family: Sora, Arial, sans-serif; }
.taq-alert-mark { animation: alert-pulse 1.35s ease-in-out infinite; transform-origin: 37px 28px; }
.taq-alert-mark circle { fill: #fff; stroke: #e66755; stroke-width: 3; }
.taq-alert-mark path { fill: none; stroke: #e66755; stroke-width: 4; stroke-linecap: round; }
.taq-alert b { display: block; color: #b84435; }
.taq-alert span { display: block; color: var(--ink-soft); font-size: .83rem; line-height: 1.35; margin-top: 3px; }
.calc-counts { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 12px; border-radius: 16px; background: var(--teal-50); }
.calc-counts div { display: grid; justify-items: center; min-width: 58px; }
.calc-counts b { font-size: 1.45rem; color: var(--ink); }
.calc-counts span { color: var(--muted); font-size: .68rem; text-transform: uppercase; font-weight: 900; }
.calc-counts i { color: var(--muted); font-style: normal; font-weight: 900; }
.calc-counts .strong b { color: var(--teal-600); }
.mix-total { padding: 16px; border-radius: 18px; background: linear-gradient(135deg, var(--teal-50), var(--blue-50)); display: grid; gap: 4px; }
.mix-total span,.mix-total small { color: var(--muted); }
.mix-total b { color: var(--teal-600); font-size: 1.85rem; }
.summary-list { display: grid; gap: 8px; }
.summary-list div { display: flex; justify-content: space-between; gap: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--line-soft); color: var(--ink-soft); }
.summary-list b { color: var(--ink); font-family: Consolas, monospace; }
.mini-warn { padding: 10px 12px; border-radius: 14px; background: var(--coral-50); color: var(--coral); font-weight: 800; font-size: .82rem; }
.tube-plan,.save-card { grid-column: span 3; }
.check-row { display: inline-flex; align-items: center; gap: 8px; color: var(--ink-soft); font-weight: 800; }
.check-row input { width: 17px; height: 17px; accent-color: var(--teal); }
.margin-field { display: inline-flex; align-items: center; gap: 8px; color: var(--ink-soft); font-weight: 800; }
.margin-field input { width: 70px; padding: 8px; border: 1px solid var(--line); border-radius: 10px; }
.pos-pick { padding: 10px 12px; border-radius: 14px; background: var(--amber-50); }
.tube-rack { display: grid; grid-template-columns: repeat(auto-fill, minmax(82px, 1fr)); gap: 12px; }
.mini-tube { display: grid; justify-items: center; gap: 3px; padding: 10px 6px; border: 1px solid var(--line); border-radius: 16px; background: var(--panel); }
.mini-tube svg { width: 42px; height: 72px; fill: var(--teal-50); stroke: var(--teal); stroke-width: 2; }
.mini-tube svg rect { stroke: none; fill: var(--teal); opacity: .55; }
.mini-tube.blank svg { fill: var(--line-soft); stroke: var(--muted); }
.mini-tube.blank svg rect { fill: var(--muted); }
.mini-tube.positive svg { fill: var(--amber-50); stroke: var(--amber); }
.mini-tube.positive svg rect { fill: var(--amber); }
.mini-tube b { font-family: Consolas, monospace; color: var(--ink); }
.mini-tube span { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--muted); font-size: .72rem; }
.save-row .field { min-width: 150px; }
.save-btn { min-width: 220px; justify-content: center; }
.empty.small { padding: 16px; font-size: .84rem; }
@media (max-width: 1180px) { .mix-grid-layout { grid-template-columns: 1fr 1fr; } .mix-summary,.tube-plan,.save-card { grid-column: span 2; } }
@media (max-width: 760px) { .mix-hero,.mix-grid-layout { grid-template-columns: 1fr; } .mix-summary,.tube-plan,.save-card { grid-column: span 1; } .rango-row { grid-template-columns: 1fr; } }

@keyframes bubble-rise {
  0% { transform: translateY(22px) scale(.65); opacity: 0; }
  18% { opacity: .62; }
  70% { opacity: .44; }
  100% { transform: translateY(-72px) scale(1.22); opacity: 0; }
}
@keyframes wave-drift {
  0%, 100% { translate: -5px 0; }
  50% { translate: 6px 1px; }
}
@keyframes taq-bob {
  0%, 100% { transform: translateY(0) rotate(-1deg); }
  50% { transform: translateY(-4px) rotate(1deg); }
}
@keyframes taq-wave {
  0%, 100% { transform: rotate(-5deg); }
  50% { transform: rotate(8deg); }
}
@keyframes bubble-pop {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-3px) scale(1.03); }
}
@keyframes alert-pulse {
  0%, 100% { transform: scale(1); opacity: .9; }
  50% { transform: scale(1.1); opacity: 1; }
}
@keyframes dna-slide {
  0%, 100% { stroke-dasharray: 1 13; stroke-dashoffset: 0; }
  50% { stroke-dasharray: 8 8; stroke-dashoffset: -18; }
}
</style>
