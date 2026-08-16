<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import Icon from '../components/Icon.vue'
import GaleriaFotos from '../components/GaleriaFotos.vue'
import { useLabStore } from '../stores/lab'
import { useAuthStore } from '../stores/auth'
import type { Subcultivo, Estado } from '../data/types'

const lab = useLabStore()
const auth = useAuthStore()
const cajaCod = (s: Subcultivo) => lab.state.cajas.find((c) => c.id === s.idCaja)?.codigo ?? '—'

// ---- Filtros ----
const busqueda = ref('')
const filtroMorfo = ref('')
const filtroPureza = ref('')
const filtroApto = ref('')

const morfotipos = computed(() => [...new Set(lab.state.subcultivos.map((s) => s.morfotipo).filter(Boolean))])
const purezas = computed(() => [...new Set(lab.state.subcultivos.map((s) => s.estado).filter(Boolean))])

const filtradas = computed(() =>
  lab.state.subcultivos.filter((s) => {
    if (filtroMorfo.value && s.morfotipo !== filtroMorfo.value) return false
    if (filtroPureza.value && s.estado !== filtroPureza.value) return false
    if (filtroApto.value === 'si' && !s.aptoExtraccion) return false
    if (filtroApto.value === 'no' && s.aptoExtraccion) return false
    if (busqueda.value) {
      const q = busqueda.value.toLowerCase()
      if (!s.codigo.toLowerCase().includes(q) && !cajaCod(s).toLowerCase().includes(q)) return false
    }
    return true
  }),
)

function limpiarFiltros() {
  busqueda.value = ''
  filtroMorfo.value = ''
  filtroPureza.value = ''
  filtroApto.value = ''
}

// ---- Paginación ----
const page = ref(1)
const perPage = ref(10)
const totalPaginas = computed(() => Math.max(1, Math.ceil(filtradas.value.length / perPage.value)))
const desde = computed(() => (filtradas.value.length ? (page.value - 1) * perPage.value + 1 : 0))
const hasta = computed(() => Math.min(page.value * perPage.value, filtradas.value.length))
const pagina = computed(() => filtradas.value.slice((page.value - 1) * perPage.value, page.value * perPage.value))
watch([busqueda, filtroMorfo, filtroPureza, filtroApto, perPage], () => (page.value = 1))

// ---- Estadísticas ----
const stats = computed(() => {
  const all = lab.state.subcultivos
  const total = all.length
  const puros = all.filter((s) => s.estado === 'puro').length
  const aptos = all.filter((s) => s.aptoExtraccion).length
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0)
  return { total, morfos: morfotipos.value.length, puros, aptos, pctPuros: pct(puros), pctAptos: pct(aptos) }
})

// ---- Selección + ficha ----
const seleccion = ref<Subcultivo | null>(null)
function seleccionar(s: Subcultivo) {
  seleccion.value = s
}

const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
function fechaLarga(iso?: string) {
  if (!iso) return '—'
  const p = iso.split('-')
  return p.length >= 3 ? `${parseInt(p[2], 10)} ${meses[parseInt(p[1], 10) - 1] ?? ''} ${p[0]}` : iso
}

// ---- Edición de la ficha (color, forma, textura, pureza, apto) ----
const usuarios = ['Pamela Bardales G', 'Dra. Nydia Edith Reyes Rodríguez']
const formaOpts = ['circular', 'irregular', 'filamentosa', 'puntiforme', 'fusiforme']
const texturaOpts = ['cremosa', 'mucoide', 'seca', 'rugosa', 'membranosa']
const purezaOpts: Estado[] = ['puro', 'pendiente', 'descartado']
const editFicha = ref(false)
const ed = reactive({ color: '', forma: '', textura: '', estado: 'puro' as Estado, aptoExtraccion: true })
function abrirEdicion() {
  if (!seleccion.value) return
  ed.color = seleccion.value.color || ''
  ed.forma = seleccion.value.forma || ''
  ed.textura = seleccion.value.textura || ''
  ed.estado = seleccion.value.estado
  ed.aptoExtraccion = seleccion.value.aptoExtraccion
  editFicha.value = true
}
async function guardarFicha() {
  if (!seleccion.value) return
  const cod = seleccion.value.codigo
  errMsg.value = ''
  try {
    await lab.actualizarSubcultivo(seleccion.value.id, {
      color: ed.color,
      forma: ed.forma,
      textura: ed.textura,
      estado: ed.estado,
      aptoExtraccion: ed.aptoExtraccion,
    })
    seleccion.value = lab.state.subcultivos.find((s) => s.codigo === cod) ?? null
    editFicha.value = false
    okMsg.value = 'Ficha guardada.'
  } catch (e) {
    errMsg.value = e instanceof Error ? e.message : String(e)
  }
}

// ---- Trazabilidad editable (persona · fecha · hora) ----
const editTraza = ref(false)
interface TEvento { usuario: string; fecha: string; hora: string }
const trazaStore = reactive<Record<string, { creado: TEvento; pureza: TEvento; apto: TEvento }>>({})
function trazaDe(s: Subcultivo) {
  if (!trazaStore[s.id]) {
    const f = s.fechaSiembra || new Date().toISOString().slice(0, 10)
    const t = s.trazabilidad || {}
    trazaStore[s.id] = {
      creado: { usuario: usuarios[0], fecha: f, hora: '09:00', ...(t.creado || {}) },
      pureza: { usuario: usuarios[0], fecha: f, hora: '11:00', ...(t.pureza || {}) },
      apto: { usuario: usuarios[0], fecha: f, hora: '12:00', ...(t.apto || {}) },
    }
  }
  return trazaStore[s.id]
}
const traza = computed(() => (seleccion.value ? trazaStore[seleccion.value.id] : null))

async function guardarTraza() {
  if (!seleccion.value || !traza.value) return
  const cod = seleccion.value.codigo
  errMsg.value = ''
  try {
    await lab.actualizarSubcultivo(seleccion.value.id, { trazabilidad: traza.value })
    seleccion.value = lab.state.subcultivos.find((s) => s.codigo === cod) ?? null
    editTraza.value = false
    okMsg.value = 'Trazabilidad guardada.'
  } catch (e) {
    errMsg.value = e instanceof Error ? e.message : String(e)
  }
}

const okMsg = ref('')
const errMsg = ref('')
watch(seleccion, (s) => {
  okMsg.value = ''
  errMsg.value = ''
  editFicha.value = false
  editTraza.value = false
  if (s) trazaDe(s)
})

// load() reemplaza los arrays completos: hay que volver a apuntar al subcultivo por su
// código, o la ficha se queda mostrando un objeto huérfano tras subir una foto.
function reSincronizarSeleccion() {
  const cod = seleccion.value?.codigo
  if (cod) seleccion.value = lab.state.subcultivos.find((s) => s.codigo === cod) ?? seleccion.value
}

// ---- Extracción de ADN (subcultivo apto → vial pendiente de NanoDrop) ----
// Todos los viales extraídos de este subcultivo (puede extraerse varias veces).
const vialesConLectura = computed(() => new Set(lab.state.nanodrop.map((n) => n.idVial)))

const vialesDelSubcultivo = computed(() => {
  if (!seleccion.value) return []
  const extIds = lab.state.extracciones.filter((e) => e.idSubcultivo === seleccion.value!.id).map((e) => e.id)
  return lab.state.viales
    .filter((v) => extIds.includes(v.idExtraccion))
    .map((v) => ({ ...v, tieneLectura: vialesConLectura.value.has(v.id) }))
})

const extrayendo = ref(false)
const borrando = ref(false)

async function borrarSubcultivo() {
  if (!seleccion.value || borrando.value) return
  if (!confirm(`¿Borrar el subcultivo ${seleccion.value.codigo}? No se puede deshacer.`)) return
  borrando.value = true
  errMsg.value = ''
  okMsg.value = ''
  try {
    await lab.eliminarSubcultivo(seleccion.value.id)
    seleccion.value = null
  } catch (e) {
    errMsg.value = e instanceof Error ? e.message : String(e)
  } finally {
    borrando.value = false
  }
}

async function extraerAdn() {
  if (!seleccion.value || extrayendo.value) return
  extrayendo.value = true
  errMsg.value = ''
  try {
    const res = await lab.extraerAdn(seleccion.value.id, { fecha: new Date().toISOString().slice(0, 10) })
    okMsg.value = `Vial ${res.vial.codigo} creado. Ya puedes registrar su lectura en NanoDrop.`
    reSincronizarSeleccion()
  } catch (e) {
    errMsg.value = e instanceof Error ? e.message : String(e)
  } finally {
    extrayendo.value = false
  }
}

// ---- Exportar CSV ----
function exportar() {
  const head = ['Código', 'Caja origen', 'Morfotipo', 'Color', 'Forma', 'Textura', 'Pureza', 'Apto extracción']
  const rows = filtradas.value.map((s) => [s.codigo, cajaCod(s), s.morfotipo, s.color || '', s.forma || '', s.textura || '', s.estado, s.aptoExtraccion ? 'Sí' : 'No'])
  const csv = [head, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'subcultivos.csv'
  a.click()
  URL.revokeObjectURL(url)
}

const dash = (v?: string) => (v && v.trim() ? v : '–')
</script>

<template>
  <div class="page-head">
    <div class="ph-left">
      <span class="ph-ic"><img src="/cajas/cajas-petri.png" alt="" /></span>
      <div>
        <h1>Subcultivos <span class="sub" style="font-weight: 400">(subcajas)</span></h1>
        <p class="sub">Colonias puras resembradas a partir de cajas con crecimiento. Origen de la extracción de ADN.</p>
      </div>
    </div>
  </div>

  <!-- Estadísticas -->
  <div class="stats">
    <div class="stat">
      <span class="s-ic i-teal"><Icon name="dish" :size="22" /></span>
      <div class="s-tx"><div class="stat-label">Total subcultivos</div><div class="stat-num">{{ stats.total }}</div><div class="stat-sub">registros en total</div></div>
    </div>
    <div class="stat">
      <span class="s-ic i-purple"><Icon name="microscope" :size="22" /></span>
      <div class="s-tx"><div class="stat-label">Morfotipos</div><div class="stat-num">{{ stats.morfos }}</div><div class="stat-sub">morfotipo(s) identificado(s)</div></div>
    </div>
    <div class="stat">
      <span class="s-ic i-teal"><Icon name="edit" :size="22" /></span>
      <div class="s-tx"><div class="stat-label">Cultivos puros</div><div class="stat-num">{{ stats.puros }}</div><div class="stat-sub">{{ stats.pctPuros }}% del total</div></div>
    </div>
    <div class="stat">
      <span class="s-ic i-orange"><Icon name="dish" :size="22" /></span>
      <div class="s-tx"><div class="stat-label">Aptos para extracción</div><div class="stat-num">{{ stats.aptos }}</div><div class="stat-sub">{{ stats.pctAptos }}% del total</div></div>
    </div>
  </div>

  <!-- Filtros -->
  <div class="filtros">
    <div class="f-search">
      <Icon name="search" :size="16" />
      <input v-model="busqueda" placeholder="Buscar por código o caja origen…" />
    </div>
    <select v-model="filtroMorfo" class="f-sel">
      <option value="">Morfotipo · Todos</option>
      <option v-for="m in morfotipos" :key="m" :value="m">{{ m }}</option>
    </select>
    <select v-model="filtroPureza" class="f-sel">
      <option value="">Pureza · Todos</option>
      <option v-for="p in purezas" :key="p" :value="p">{{ p }}</option>
    </select>
    <select v-model="filtroApto" class="f-sel">
      <option value="">Apto extracción · Todos</option>
      <option value="si">Sí</option>
      <option value="no">No</option>
    </select>
    <button class="f-clear" @click="limpiarFiltros"><Icon name="refresh" :size="15" /> Limpiar filtros</button>
  </div>

  <div class="split">
    <!-- Tabla -->
    <div class="card tabla-card">
      <div class="tabla-head">
        <span class="th-ic"><Icon name="microscope" :size="16" /></span>
        <h3>Colonias seleccionadas</h3>
        <span class="th-count">{{ filtradas.length }} registros</span>
        <button class="exp-btn" @click="exportar"><Icon name="download" :size="15" /> Exportar</button>
      </div>
      <div class="tabla-scroll">
      <table class="ctab">
        <thead>
          <tr><th></th><th>Código</th><th>Caja origen</th><th>Morfotipo</th><th>Color</th><th>Forma</th><th>Textura</th><th>Pureza</th><th>Apto extracción</th></tr>
        </thead>
        <tbody>
          <tr v-for="s in pagina" :key="s.id" :class="{ sel: seleccion?.id === s.id }" @click="seleccionar(s)">
            <td><span class="radio" :class="{ on: seleccion?.id === s.id }"></span></td>
            <td class="mono cod">{{ s.codigo }}</td>
            <td class="mono">{{ cajaCod(s) }}</td>
            <td><span class="pill-morfo">{{ s.morfotipo }}</span></td>
            <td>{{ dash(s.color) }}</td>
            <td>{{ dash(s.forma) }}</td>
            <td>{{ dash(s.textura) }}</td>
            <td><span class="pill-puro">{{ s.estado }}</span></td>
            <td><span class="apto" :class="s.aptoExtraccion ? 'si' : 'no'"><span class="edot"></span>{{ s.aptoExtraccion ? 'Sí' : 'No' }}</span></td>
          </tr>
          <tr v-if="!pagina.length"><td colspan="9" class="vacio">Sin subcultivos con esos filtros.</td></tr>
        </tbody>
      </table>
      </div>
      <div class="pager">
        <span class="pager-info">Mostrando {{ desde }} a {{ hasta }} de {{ filtradas.length }} registros</span>
        <div class="pager-ctrl">
          <button class="pg" :disabled="page === 1" @click="page--">‹</button>
          <button v-for="n in totalPaginas" :key="n" class="pg" :class="{ on: n === page }" @click="page = n">{{ n }}</button>
          <button class="pg" :disabled="page === totalPaginas" @click="page++">›</button>
        </div>
        <select v-model.number="perPage" class="f-sel sm">
          <option :value="10">10 por página</option>
          <option :value="25">25 por página</option>
        </select>
      </div>
    </div>

    <!-- Ficha -->
    <div class="card ficha">
      <template v-if="seleccion">
        <div class="ficha-top">
          <span class="ficha-ava"><Icon name="dish" :size="18" /></span>
          <span>Ficha del subcultivo</span>
          <button v-if="auth.can('subcultivos.records.update')" class="mini-btn" @click="editFicha ? guardarFicha() : abrirEdicion()">
            <Icon :name="editFicha ? 'check' : 'edit'" :size="14" /> {{ editFicha ? 'Guardar' : 'Editar' }}
          </button>
          <button v-if="auth.can('subcultivos.records.delete')" class="mini-btn borrar" :disabled="borrando" title="Borrar subcultivo" @click="borrarSubcultivo">
            <Icon name="close" :size="14" />
          </button>
        </div>
        <div class="ficha-cod"><span class="edot ok"></span>{{ seleccion.codigo }}</div>

        <div class="ficha-grid">
          <div><span class="fg-label">Caja origen</span><span class="fg-val mono">{{ cajaCod(seleccion) }}</span></div>
          <div><span class="fg-label">Morfotipo</span><span class="pill-morfo">{{ seleccion.morfotipo }}</span></div>
          <div><span class="fg-label">Pureza</span>
            <span v-if="!editFicha" class="pill-puro">{{ seleccion.estado }}</span>
            <select v-else v-model="ed.estado" class="mini-input"><option v-for="p in purezaOpts" :key="p" :value="p">{{ p }}</option></select>
          </div>
          <div><span class="fg-label">Apto extracción</span>
            <span v-if="!editFicha" class="apto" :class="seleccion.aptoExtraccion ? 'si' : 'no'"><span class="edot"></span>{{ seleccion.aptoExtraccion ? 'Sí' : 'No' }}</span>
            <div v-else class="chips2">
              <button class="chip2" :class="{ on: ed.aptoExtraccion }" @click="ed.aptoExtraccion = true">Sí</button>
              <button class="chip2" :class="{ on: !ed.aptoExtraccion }" @click="ed.aptoExtraccion = false">No</button>
            </div>
          </div>
        </div>

        <div class="ficha-rows">
          <div class="fr"><span>Color</span>
            <b v-if="!editFicha">{{ dash(seleccion.color) }}</b>
            <input v-else v-model="ed.color" class="mini-input" placeholder="p. ej. blanca" />
          </div>
          <div class="fr"><span>Forma</span>
            <b v-if="!editFicha">{{ dash(seleccion.forma) }}</b>
            <select v-else v-model="ed.forma" class="mini-input"><option value="">—</option><option v-for="f in formaOpts" :key="f" :value="f">{{ f }}</option></select>
          </div>
          <div class="fr"><span>Textura</span>
            <b v-if="!editFicha">{{ dash(seleccion.textura) }}</b>
            <select v-else v-model="ed.textura" class="mini-input"><option value="">—</option><option v-for="t in texturaOpts" :key="t" :value="t">{{ t }}</option></select>
          </div>
        </div>

        <div v-if="okMsg" class="aviso ok"><Icon name="check" :size="15" /> {{ okMsg }}</div>
        <div v-if="errMsg" class="aviso err"><Icon name="shield" :size="15" /> {{ errMsg }}</div>

        <!-- Imagen de evidencia -->
        <div class="evi-gal">
          <GaleriaFotos
            :codigo="seleccion.codigo"
            rol="evidencia"
            titulo="Imágenes de evidencia"
            vacio-texto="Sube una o varias fotos de la colonia o del medio."
            @cambio="reSincronizarSeleccion"
          />
        </div>

        <!-- Extracción de ADN -->
        <div class="adn-sec">
          <div class="adn-head"><span class="adn-ic"><Icon name="dna" :size="16" /></span> Extracción de ADN</div>

          <ul v-if="vialesDelSubcultivo.length" class="adn-viales">
            <li v-for="v in vialesDelSubcultivo" :key="v.id">
              <Icon name="beaker" :size="14" />
              <b class="mono">{{ v.codigo }}</b>
              <span v-if="v.tieneLectura" class="adn-tag ok"><Icon name="check" :size="12" /> con lectura</span>
              <span v-else class="adn-tag pend">pendiente de NanoDrop</span>
            </li>
          </ul>

          <p v-if="!seleccion.aptoExtraccion && !vialesDelSubcultivo.length" class="adn-hint">
            Este subcultivo está marcado como <b>no apto</b>. Cámbialo a apto arriba si quieres extraer su ADN.
          </p>
          <button v-else-if="seleccion.aptoExtraccion && auth.can('subcultivos.dna.extract')" class="adn-btn" :disabled="extrayendo" @click="extraerAdn">
            <Icon name="dna" :size="15" />
            {{ extrayendo ? 'Extrayendo…' : vialesDelSubcultivo.length ? 'Extraer de nuevo (otro vial)' : 'Extraer ADN (crear vial)' }}
          </button>
          <p v-if="vialesDelSubcultivo.length" class="adn-hint" style="margin-top: 8px">
            Cada vial se lee por separado en <b>NanoDrop</b>. Extrae de nuevo si necesitas repetir.
          </p>
        </div>

        <!-- Trazabilidad -->
        <div v-if="traza" class="traza-sec">
          <div class="traza-title-row">
            <span class="traza-title">Trazabilidad</span>
            <button v-if="auth.can('subcultivos.records.update')" class="mini-btn" @click="editTraza ? guardarTraza() : (editTraza = true)"><Icon :name="editTraza ? 'check' : 'edit'" :size="14" /> {{ editTraza ? 'Guardar' : 'Editar' }}</button>
          </div>

          <div class="tstep" :class="{ editing: editTraza }">
            <span class="t-ic i-teal"><Icon name="leaf" :size="15" /></span>
            <div class="t-main"><b>Subcultivo creado</b>
              <span v-if="!editTraza">{{ fechaLarga(traza.creado.fecha) }} · {{ traza.creado.hora }}</span>
              <div v-else class="t-dt"><input type="date" v-model="traza.creado.fecha" /><input type="time" v-model="traza.creado.hora" /></div>
            </div>
            <div v-if="!editTraza" class="t-user">{{ traza.creado.usuario }}<span>Microbiología</span></div>
            <select v-else class="t-usel" v-model="traza.creado.usuario"><option v-for="u in usuarios" :key="u" :value="u">{{ u }}</option></select>
          </div>

          <div class="tstep" :class="{ editing: editTraza }">
            <span class="t-ic i-purple"><Icon name="microscope" :size="15" /></span>
            <div class="t-main"><b>Evaluación de pureza</b>
              <span v-if="!editTraza">{{ fechaLarga(traza.pureza.fecha) }} · {{ traza.pureza.hora }}</span>
              <div v-else class="t-dt"><input type="date" v-model="traza.pureza.fecha" /><input type="time" v-model="traza.pureza.hora" /></div>
            </div>
            <div v-if="!editTraza" class="t-user">{{ traza.pureza.usuario }}<span>Microbiología</span></div>
            <select v-else class="t-usel" v-model="traza.pureza.usuario"><option v-for="u in usuarios" :key="u" :value="u">{{ u }}</option></select>
          </div>

          <div v-if="seleccion.aptoExtraccion || editTraza" class="tstep" :class="{ editing: editTraza }">
            <span class="t-ic i-orange"><Icon name="check" :size="15" /></span>
            <div class="t-main"><b>Apto para extracción</b>
              <span v-if="!editTraza">{{ fechaLarga(traza.apto.fecha) }} · {{ traza.apto.hora }}</span>
              <div v-else class="t-dt"><input type="date" v-model="traza.apto.fecha" /><input type="time" v-model="traza.apto.hora" /></div>
            </div>
            <div v-if="!editTraza" class="t-user">{{ traza.apto.usuario }}<span>Microbiología</span></div>
            <select v-else class="t-usel" v-model="traza.apto.usuario"><option v-for="u in usuarios" :key="u" :value="u">{{ u }}</option></select>
          </div>
        </div>
      </template>

      <div v-else class="ficha-vacia">
        <span class="ficha-ava lg"><Icon name="dish" :size="26" /></span>
        <p>Selecciona un subcultivo</p>
        <span>Elige una colonia de la lista para ver su ficha completa.</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-head .ph-left { display: flex; align-items: center; gap: 14px; }
.ph-ic { display: grid; place-items: center; width: 56px; height: 56px; border-radius: 15px; flex-shrink: 0; background: var(--teal-50); overflow: hidden; }
.ph-ic img { width: 44px; height: 44px; object-fit: contain; }

/* Estadísticas */
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin: 16px 0; }
.stat { display: flex; align-items: center; gap: 13px; background: #fff; border: 1px solid var(--line); border-radius: 18px; padding: 16px 18px; }
.s-ic { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 13px; flex-shrink: 0; }
.i-teal { background: var(--teal-50); color: var(--teal-600); }
.i-purple { background: #efe9fb; color: #6f56c4; }
.i-orange { background: #fdece3; color: #d2682f; }
.s-tx { flex: 1; min-width: 0; }
.stat-label { font-size: 0.8rem; color: var(--muted); }
.stat-num { font-size: 1.5rem; font-weight: 800; line-height: 1.1; color: var(--ink); font-family: "Sora", sans-serif; }
.stat-sub { font-size: 0.74rem; color: var(--muted); }

/* Filtros */
.filtros { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
.f-search { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 200px; background: #fff; border: 1px solid var(--line); border-radius: 11px; padding: 0 12px; color: var(--muted); }
.f-search input { border: none; outline: none; background: transparent; padding: 9px 0; width: 100%; font-size: 0.86rem; color: var(--ink); }
.f-sel { border: 1px solid var(--line); border-radius: 11px; padding: 8px 12px; background: #fff; font-size: 0.84rem; color: var(--ink); cursor: pointer; }
.f-sel.sm { padding: 6px 10px; font-size: 0.8rem; }
.f-clear { display: inline-flex; align-items: center; gap: 6px; border: none; background: transparent; color: var(--teal-600); font-size: 0.82rem; font-weight: 700; cursor: pointer; }

/* Split */
.split { display: grid; grid-template-columns: 1.5fr 1fr; gap: 16px; align-items: start; }
@media (max-width: 1080px) { .split { grid-template-columns: 1fr; } }

/* Tabla */
.tabla-card { padding: 0; overflow: hidden; }
.tabla-head { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--line); }
.th-ic { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 9px; background: var(--teal-50); color: var(--teal-600); }
.tabla-head h3 { font-size: 0.98rem; margin: 0; }
.th-count { font-size: 0.74rem; font-weight: 700; color: var(--teal-600); background: var(--teal-50); padding: 3px 9px; border-radius: 999px; }
.exp-btn { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--line); background: #fff; border-radius: 9px; padding: 7px 13px; font-size: 0.82rem; font-weight: 700; color: var(--teal-600); cursor: pointer; }
.exp-btn:hover { background: var(--teal-50); }
.tabla-scroll { overflow-x: auto; }
.ctab { width: 100%; min-width: 640px; border-collapse: collapse; }
.ctab thead th, .ctab tbody td { white-space: nowrap; }
.ctab thead th { text-align: left; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: var(--muted); padding: 11px 12px; border-bottom: 1px solid var(--line); }
.ctab tbody td { padding: 11px 12px; border-bottom: 1px solid var(--line-soft); font-size: 0.83rem; color: var(--ink-soft); }
.ctab tbody tr { cursor: pointer; transition: background 0.12s ease; }
.ctab tbody tr:hover { background: var(--teal-50); }
.ctab tbody tr.sel { background: var(--teal-50); }
.cod { font-weight: 700; color: var(--ink); }
.radio { display: block; width: 16px; height: 16px; border-radius: 50%; border: 2px solid var(--line); }
.radio.on { border-color: var(--teal-600); box-shadow: inset 0 0 0 3px var(--teal-600); }
.pill-morfo { font-size: 0.74rem; font-weight: 700; padding: 2px 9px; border-radius: 999px; background: #efe9fb; color: #6f56c4; }
.pill-puro { font-size: 0.74rem; font-weight: 700; padding: 2px 9px; border-radius: 999px; background: #e6f6ec; color: #1f9d57; }
.apto { display: inline-flex; align-items: center; gap: 6px; font-size: 0.78rem; font-weight: 700; }
.apto .edot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.apto.si { color: #1f9d57; }
.apto.no { color: #6b7d92; }
.vacio { text-align: center; color: var(--muted); padding: 30px; }

/* Paginación */
.pager { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 12px 14px; }
.pager-info { font-size: 0.78rem; color: var(--muted); }
.pager-ctrl { display: flex; align-items: center; gap: 4px; margin-left: auto; }
.pg { min-width: 30px; height: 30px; border: 1px solid var(--line); background: #fff; border-radius: 8px; font-size: 0.8rem; color: var(--ink-soft); cursor: pointer; }
.pg.on { background: var(--teal-600); border-color: var(--teal-600); color: #fff; font-weight: 700; }
.pg:disabled { opacity: 0.4; cursor: default; }

/* Ficha */
.ficha { padding: 16px; }
.ficha-top { display: flex; align-items: center; gap: 9px; }
.ficha-ava { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; background: var(--teal-50); color: var(--teal-600); }
.ficha-ava.lg { width: 56px; height: 56px; border-radius: 16px; }
.ficha-top > span { font-size: 0.95rem; font-weight: 700; color: var(--ink); }
.ficha-cod { display: flex; align-items: center; gap: 8px; font-size: 1.2rem; font-weight: 800; color: var(--ink); font-family: "Sora", sans-serif; margin: 12px 0 14px; }
.edot { width: 8px; height: 8px; border-radius: 50%; background: var(--muted); flex-shrink: 0; }
.edot.ok { background: #1f9d57; }
.ficha-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; padding-bottom: 14px; border-bottom: 1px solid var(--line-soft); }
.ficha-grid > div { display: flex; flex-direction: column; gap: 4px; align-items: flex-start; }
.fg-label { font-size: 0.72rem; color: var(--muted); }
.fg-val { font-size: 0.85rem; font-weight: 700; color: var(--ink); }
.ficha-rows { padding: 12px 0; border-bottom: 1px solid var(--line-soft); }
.fr { display: flex; justify-content: space-between; padding: 5px 0; font-size: 0.84rem; }
.fr span { color: var(--muted); }
.fr b { color: var(--ink); }

.aviso { display: flex; align-items: center; gap: 7px; font-size: 0.82rem; padding: 8px 12px; border-radius: 10px; margin-top: 12px; }
.aviso.ok { background: #e6f6ec; color: #1f9d57; }
.aviso.err { background: #fdece3; color: #d2682f; }

/* Evidencia */
.evi { display: flex; align-items: center; gap: 12px; background: var(--bg, #f6f9fb); border-radius: 12px; padding: 12px 14px; margin: 14px 0; }
.evi-ic { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 10px; background: #e6f0fb; color: #3074bf; flex-shrink: 0; }
.evi-tx { flex: 1; min-width: 0; }
.evi-tx b { font-size: 0.85rem; color: var(--ink); }
.opc { font-weight: 400; color: var(--muted); font-size: 0.78rem; }
.evi-tx span { display: block; font-size: 0.76rem; color: var(--muted); }
.evi-btn { display: inline-flex; align-items: center; gap: 6px; border: 1px solid #cfd8ec; background: #eef2fb; border-radius: 9px; padding: 7px 12px; font-size: 0.8rem; font-weight: 700; color: #3074bf; cursor: pointer; white-space: nowrap; }
.evi-btn:hover { background: #e2ebfb; }

/* Trazabilidad */
.adn-sec { margin: 16px 0; padding: 14px; border: 1px solid var(--line); border-radius: 12px; }
.adn-head { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 0.86rem; margin-bottom: 10px; }
.adn-ic { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; background: var(--violet-50); color: var(--violet); }
.adn-btn { display: inline-flex; align-items: center; gap: 8px; padding: 9px 15px; border-radius: 10px; border: none; background: var(--violet); color: #fff; font-weight: 700; font-size: 0.84rem; cursor: pointer; transition: filter 0.15s; }
.adn-btn:hover:not(:disabled) { filter: brightness(0.95); }
.adn-btn:disabled { opacity: 0.6; cursor: default; }
.adn-hint { font-size: 0.8rem; color: var(--muted); line-height: 1.5; }
.adn-viales { list-style: none; margin: 0 0 12px; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.adn-viales li { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 9px; background: var(--bg); font-size: 0.82rem; }
.adn-viales li svg { color: var(--violet); }
.adn-tag { margin-left: auto; font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 999px; display: inline-flex; align-items: center; gap: 3px; }
.adn-tag.ok { background: var(--teal-50); color: var(--teal-600); }
.adn-tag.pend { background: var(--amber-50); color: #9a6a1a; }

.traza-sec { margin-top: 6px; }
.traza-title { font-size: 0.92rem; font-weight: 700; color: var(--ink); margin-bottom: 10px; }
.tstep { display: flex; align-items: center; gap: 11px; padding: 8px 0; }
.t-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; }
.t-main { flex: 1; min-width: 0; }
.t-main b { display: block; font-size: 0.84rem; color: var(--ink); }
.t-main span { font-size: 0.74rem; color: var(--muted); }
.t-user { text-align: right; font-size: 0.78rem; font-weight: 700; color: var(--ink-soft); }
.t-user span { display: block; font-size: 0.72rem; font-weight: 400; color: var(--muted); }

/* Controles de edición */
.mini-btn { margin-left: auto; display: inline-flex; align-items: center; gap: 5px; border: 1px solid var(--line); background: #fff; border-radius: 9px; padding: 5px 11px; font-size: 0.78rem; font-weight: 700; color: var(--teal-600); cursor: pointer; }
.mini-btn.borrar { margin-left: 6px; color: var(--muted); }
.mini-btn.borrar:hover:not(:disabled) { border-color: var(--coral); color: var(--coral); }
.mini-btn.borrar:disabled { opacity: 0.5; cursor: default; }
.mini-btn:hover { background: var(--teal-50); }
.mini-input { border: 1px solid var(--line); border-radius: 8px; padding: 5px 9px; font-size: 0.82rem; background: #fff; font-family: inherit; color: var(--ink); max-width: 160px; }
.fr .mini-input { width: 150px; }
.chips2 { display: flex; gap: 6px; }
.chip2 { border: 1px solid var(--line); background: #fff; border-radius: 8px; padding: 4px 12px; font-size: 0.8rem; cursor: pointer; color: var(--ink-soft); }
.chip2.on { background: var(--teal-600); border-color: var(--teal-600); color: #fff; font-weight: 700; }
.traza-title-row { display: flex; align-items: center; margin-bottom: 8px; }
.traza-title-row .traza-title { margin-bottom: 0; }
.tstep.editing { align-items: flex-start; flex-wrap: wrap; }
.t-dt { display: flex; gap: 6px; margin-top: 4px; }
.t-dt input, .t-usel { border: 1px solid var(--line); border-radius: 8px; padding: 5px 8px; font-size: 0.8rem; background: #fff; font-family: inherit; }
.t-usel { margin-left: auto; max-width: 150px; }

.ficha-vacia { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 6px; padding: 50px 20px; }
.ficha-vacia p { font-size: 0.95rem; font-weight: 700; color: var(--ink-soft); margin: 6px 0 0; }
.ficha-vacia > span:last-child { font-size: 0.8rem; color: var(--muted); max-width: 240px; }
</style>
