<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import { useLabStore } from '../stores/lab'
import { useAuthStore } from '../stores/auth'
import type { Nanodrop } from '../data/types'

const lab = useLabStore()
const auth = useAuthStore()
const router = useRouter()
const selectedId = ref<string | null>(null)
const filtro = ref<'todas' | 'aptas' | 'repetir'>('todas')

// ---- Registrar una lectura nueva (vial pendiente → NanoDrop) ----
// Viales que aún no tienen lectura registrada.
const vialesConLectura = computed(() => new Set(lab.state.nanodrop.map((n) => n.idVial)))
const vialesPendientes = computed(() => lab.state.viales.filter((v) => !vialesConLectura.value.has(v.id)))

const modalAbierto = ref(false)
const guardandoLectura = ref(false)
const errorLectura = ref('')
const nuevo = ref({ idVial: '', concentracion: '' as number | string, r280: '' as number | string, r230: '' as number | string })

function validarValores(concentracion: number | string, r280Entrada: number | string, r230Entrada: number | string) {
  const r280 = Number(r280Entrada)
  const r230 = Number(r230Entrada)
  if (!Number.isFinite(r280) || r280 <= 0 || !Number.isFinite(r230) || r230 <= 0) {
    return 'Escribe valores numéricos mayores que 0 para los ratios 260/280 y 260/230.'
  }
  if (concentracion !== '' && (!Number.isFinite(Number(concentracion)) || Number(concentracion) < 0)) {
    return 'La concentración debe ser un número igual o mayor que 0.'
  }
  return ''
}

function abrirModal() {
  errorLectura.value = ''
  nuevo.value = { idVial: vialesPendientes.value[0]?.id ?? '', concentracion: '', r280: '', r230: '' }
  modalAbierto.value = true
}

// Vista previa de la recomendación (misma regla que aplica el backend).
const previaCalidad = computed(() => {
  const r280 = Number(nuevo.value.r280)
  const r230 = Number(nuevo.value.r230)
  if (!r280 || !r230) return null
  if (r280 >= 1.8 && r280 <= 2.0 && r230 >= 2.0) return { txt: 'Óptima · continuar a PCR', cls: 'ok' }
  if (r280 >= 1.7) return { txt: 'Aceptable · continuar a PCR', cls: 'ok' }
  return { txt: 'Baja · repetir extracción', cls: 'bad' }
})

async function guardarLectura() {
  if (guardandoLectura.value) return
  const r280 = Number(nuevo.value.r280)
  const r230 = Number(nuevo.value.r230)
  if (!nuevo.value.idVial) { errorLectura.value = 'Elige un vial.'; return }
  const errorValores = validarValores(nuevo.value.concentracion, nuevo.value.r280, nuevo.value.r230)
  if (errorValores) { errorLectura.value = errorValores; return }
  guardandoLectura.value = true
  errorLectura.value = ''
  try {
    const res = await lab.registrarNanodrop(nuevo.value.idVial, {
      ratio260_280: r280,
      ratio260_230: r230,
      concentracionNgUl: nuevo.value.concentracion === '' ? null : Number(nuevo.value.concentracion),
      fecha: new Date().toISOString().slice(0, 10),
    })
    modalAbierto.value = false
    selectedId.value = res.id
  } catch (e) {
    errorLectura.value = e instanceof Error ? e.message : String(e)
  } finally {
    guardandoLectura.value = false
  }
}

const vialCod = (id: string) => lab.state.viales.find((v) => v.id === id)?.codigo ?? id

// ---- Editar los números de una lectura ya registrada ----
const editandoNums = ref(false)
const guardandoNums = ref(false)
const errorNums = ref('')
const edNum = ref({ concentracion: '' as number | string, r280: '' as number | string, r230: '' as number | string })

function abrirEdicionNums() {
  const n = seleccionado.value
  if (!n) return
  edNum.value = {
    concentracion: n.concentracionNgUl ?? '',
    r280: n.ratio260_280 ?? '',
    r230: n.ratio260_230 ?? '',
  }
  errorNums.value = ''
  editandoNums.value = true
}

// Vista previa del veredicto mientras se editan los números (misma regla que el backend).
const previaEdicion = computed(() => {
  const r280 = Number(edNum.value.r280)
  const r230 = Number(edNum.value.r230)
  if (!r280 || !r230) return null
  if (r280 >= 1.8 && r280 <= 2.0 && r230 >= 2.0) return { txt: 'Óptima · continuar a PCR', cls: 'ok' }
  if (r280 >= 1.7) return { txt: 'Aceptable · continuar a PCR', cls: 'ok' }
  return { txt: 'Baja · repetir extracción', cls: 'bad' }
})

async function guardarNums() {
  const n = seleccionado.value
  if (!n || guardandoNums.value) return
  const r280 = Number(edNum.value.r280)
  const r230 = Number(edNum.value.r230)
  const errorValores = validarValores(edNum.value.concentracion, edNum.value.r280, edNum.value.r230)
  if (errorValores) { errorNums.value = errorValores; return }
  guardandoNums.value = true
  errorNums.value = ''
  try {
    await lab.actualizarNanodrop(n.id, {
      ratio260_280: r280,
      ratio260_230: r230,
      concentracionNgUl: edNum.value.concentracion === '' ? null : Number(edNum.value.concentracion),
    })
    editandoNums.value = false
  } catch (e) {
    errorNums.value = e instanceof Error ? e.message : String(e)
  } finally {
    guardandoNums.value = false
  }
}

// Índices de búsqueda (evitan find() anidados O(n²) al exportar/listar miles de filas)
const vialPorId = computed(() => new Map(lab.state.viales.map((v) => [v.id, v])))
const extPorId = computed(() => new Map(lab.state.extracciones.map((e) => [e.id, e])))
const subPorId = computed(() => new Map(lab.state.subcultivos.map((s) => [s.id, s])))

// Mapeos
const vialDatos = (n: Nanodrop) => vialPorId.value.get(n.idVial)
const subcultivoDatos = (vialId: string) => {
  const ext = extPorId.value.get(vialPorId.value.get(vialId)?.idExtraccion ?? '')
  return ext ? subPorId.value.get(ext.idSubcultivo) : null
}

// Recepción origen, siguiendo la cadena vial → extracción → subcultivo → caja → muestra → pez → recepción
const recepcionDe = (n: Nanodrop) => {
  const sub = vialDatos(n) ? subcultivoDatos(vialDatos(n)!.id) : null
  if (!sub) return null
  const caja = lab.state.cajas.find((c) => c.id === sub.idCaja)
  const muestra = caja ? lab.state.muestras.find((m) => m.id === caja.idMuestra) : null
  const pez = muestra ? lab.state.peces.find((p) => p.id === muestra.idPez) : null
  return pez ? lab.state.recepciones.find((r) => r.id === pez.idRecepcion) : null
}

// Lógica de pureza: usamos la clasificación que ya calcula el backend
// (calidad + acción). "baja" / "Repetir extracción" → se repite la extracción.
const esApta = (n: Nanodrop) => {
  if (n.accion) return n.accion.toLowerCase().includes('continuar') || n.accion.toLowerCase().includes('pcr')
  return n.calidad !== 'baja'
}

const necesitaRepetir = (n: Nanodrop) => !esApta(n)

// Chequeos individuales de cada ratio (para explicar el "por qué" en el panel).
const r280Ok = (n: Nanodrop) =>
  n.ratio260_280 !== null && n.ratio260_280 >= 1.8 && n.ratio260_280 <= 2.0
const r230Ok = (n: Nanodrop) =>
  n.ratio260_230 !== null && n.ratio260_230 >= 2.0 && n.ratio260_230 <= 2.2

// Estadísticas
const stats = computed(() => {
  const total = lab.state.nanodrop.length
  const aptas = lab.state.nanodrop.filter(esApta).length
  const repetir = lab.state.nanodrop.filter(necesitaRepetir).length
  const promedio =
    total > 0
      ? (lab.state.nanodrop.reduce((sum, n) => sum + (n.concentracionNgUl || 0), 0) / total).toFixed(1)
      : '0.0'

  return { total, aptas, repetir, promedio }
})

// Tabla filtrada
const tabla = computed(() => {
  switch (filtro.value) {
    case 'aptas':
      return lab.state.nanodrop.filter(esApta)
    case 'repetir':
      return lab.state.nanodrop.filter(necesitaRepetir)
    default:
      return lab.state.nanodrop
  }
})

// Detalles del seleccionado
const seleccionado = computed(() => lab.state.nanodrop.find((n) => n.id === selectedId.value))
const vialSel = computed(() => seleccionado.value ? vialDatos(seleccionado.value) : null)
const subcultSel = computed(() => seleccionado.value && vialSel.value ? subcultivoDatos(vialSel.value.id) : null)

const fx = (v: number | null | undefined, d = 2) => (v === null || v === undefined ? '—' : v.toFixed(d))
const calLabel: Record<string, string> = { optima: 'Óptima', aceptable: 'Aceptable', baja: 'Baja' }

// ---- Barras visuales de rango (gauge) ----
// Cada ratio tiene una escala con su banda ideal; calculamos posiciones en %.
const pct = (v: number | null, min: number, max: number) =>
  v === null ? 0 : Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100))

const gauges = computed(() => {
  const n = seleccionado.value
  if (!n) return []
  return [
    { label: '260/280', value: n.ratio260_280, min: 1.0, max: 2.5, idMin: 1.8, idMax: 2.0, ok: r280Ok(n) },
    { label: '260/230', value: n.ratio260_230, min: 0.5, max: 3.0, idMin: 2.0, idMax: 2.2, ok: r230Ok(n) },
  ]
})

// ---- Recomendación textual ----
const recomendacion = computed(() => {
  const n = seleccionado.value
  if (!n) return ''
  return esApta(n)
    ? 'La muestra cumple con los criterios para continuar.'
    : 'Se recomienda repetir la extracción: posible contaminación por proteínas o sales.'
})

// ---- Observaciones (persistidas en la BD vía PATCH) ----
const obsEditando = ref(false)
const obsBorrador = ref('')
const obsGuardando = ref(false)

const obsPorDefecto = (n: Nanodrop) =>
  esApta(n) ? 'Valores dentro de rango aceptable.' : 'Fuera de rango: posible contaminación por proteínas o sales.'

// Lo guardado en la BD (si hay) tiene prioridad sobre el texto por defecto.
const obsActual = computed(() => {
  const n = seleccionado.value
  if (!n) return ''
  return n.observaciones && n.observaciones.trim() ? n.observaciones : obsPorDefecto(n)
})

function editarObs() {
  // Al editar partimos del texto real guardado (vacío si nunca se escribió).
  obsBorrador.value = seleccionado.value?.observaciones ?? ''
  obsEditando.value = true
}
async function guardarObs() {
  const n = seleccionado.value
  if (!n) return
  obsGuardando.value = true
  try {
    await lab.actualizarNanodrop(n.id, { observaciones: obsBorrador.value })
    obsEditando.value = false
  } catch (e) {
    console.error('[nanodrop] error al guardar observaciones:', e)
    alert('No se pudo guardar la observación. Revisa la conexión con el servidor.')
  } finally {
    obsGuardando.value = false
  }
}
function cancelarObs() {
  obsEditando.value = false
}

// ---- Decisión de seguimiento (Enviar a PCR / Repetir extracción) ----
const decisionGuardando = ref<'enviada_pcr' | 'repetir' | null>(null)

const decisionLabel: Record<string, string> = {
  enviada_pcr: 'Enviada a PCR',
  repetir: 'Marcada para repetir extracción',
}

async function decidir(estado: 'enviada_pcr' | 'repetir') {
  const n = seleccionado.value
  if (!n || decisionGuardando.value) return
  const ahora = new Date()
  const decision = {
    estado,
    usuario: lab.proyecto.responsable,
    fecha: ahora.toISOString().slice(0, 10),
    hora: ahora.toTimeString().slice(0, 5),
  }
  decisionGuardando.value = estado
  try {
    await lab.actualizarNanodrop(n.id, { decision })
    if (estado === 'enviada_pcr') {
      const vial = vialDatos(n)
      await router.push({ path: '/pcr', query: vial ? { vial: vial.codigo } : undefined })
    }
  } catch (e) {
    console.error('[nanodrop] error al guardar la decisión:', e)
    alert('No se pudo guardar la decisión. Revisa la conexión con el servidor.')
  } finally {
    decisionGuardando.value = null
  }
}

async function deshacerDecision() {
  const n = seleccionado.value
  if (!n) return
  try {
    await lab.actualizarNanodrop(n.id, { decision: null })
  } catch (e) {
    console.error('[nanodrop] error al deshacer la decisión:', e)
  }
}

// ---- Exportar CSV (de las lecturas según el filtro activo) ----
function exportarCsv() {
  const filas = tabla.value
  const cols = [
    'Codigo', 'Vial', 'Subcultivo', 'Fecha', '260/280', '260/230', 'ng/uL', 'Calidad', 'Estado', 'Accion', 'Decision',
  ]
  // Escapa comillas/comas/saltos de línea según RFC 4180.
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lineas = [cols.join(',')]
  for (const n of filas) {
    const vial = vialDatos(n)
    const sub = vial ? subcultivoDatos(vial.id) : null
    lineas.push(
      [
        n.codigo,
        vial?.codigo ?? '',
        sub?.codigo ?? '',
        n.fecha,
        fx(n.ratio260_280),
        fx(n.ratio260_230),
        fx(n.concentracionNgUl, 1),
        calLabel[n.calidad] ?? n.calidad,
        esApta(n) ? 'Apta para PCR' : 'Repetir extraccion',
        n.accion ?? '',
        n.decision ? (decisionLabel[n.decision.estado] ?? '') : 'Pendiente',
      ]
        .map(esc)
        .join(','),
    )
  }
  // BOM para que Excel reconozca acentos (UTF-8).
  const blob = new Blob(['﻿' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const hoy = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `nanodrop-${filtro.value}-${hoy}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ---- Trazabilidad editable (quién/día/hora por evento, persistida en BD) ----
type TrazaKey = 'lectura' | 'muestra' | 'recepcion'
interface TrazaCampo { usuario: string; fecha: string; hora: string }

const TRAZA_DEFS: { key: TrazaKey; titulo: string }[] = [
  { key: 'lectura', titulo: 'Lectura registrada' },
  { key: 'muestra', titulo: 'Muestra procesada' },
  { key: 'recepcion', titulo: 'Recepción registrada' },
]

// Valores por defecto derivados de la cadena real (si el usuario no los editó).
const trazaDefaults = computed<Record<TrazaKey, TrazaCampo>>(() => {
  const n = seleccionado.value
  const u = lab.proyecto.responsable
  return {
    lectura: { usuario: u, fecha: n?.fecha ?? '', hora: '' },
    muestra: { usuario: u, fecha: subcultSel.value?.fechaSiembra ?? '', hora: '' },
    recepcion: { usuario: u, fecha: (n ? recepcionDe(n)?.fecha : '') ?? '', hora: '' },
  }
})

// Eventos a mostrar: override guardado tiene prioridad sobre el default.
const trazaItems = computed(() => {
  const n = seleccionado.value
  if (!n) return []
  const def = trazaDefaults.value
  const ov = n.trazabilidad ?? {}
  return TRAZA_DEFS.map((d) => {
    const o = (ov as Record<string, Partial<TrazaCampo>>)[d.key] ?? {}
    return {
      key: d.key,
      titulo: d.titulo,
      usuario: o.usuario || def[d.key].usuario,
      fecha: o.fecha || def[d.key].fecha,
      hora: o.hora ?? def[d.key].hora,
    }
  })
})

// Evento de decisión (no editable aquí; se controla con los botones de Acción).
const decisionEvento = computed(() => {
  const n = seleccionado.value
  if (!n?.decision) return null
  return {
    titulo: decisionLabel[n.decision.estado] ?? 'Decisión registrada',
    usuario: n.decision.usuario,
    fecha: `${n.decision.fecha} ${n.decision.hora}`,
  }
})

// Edición de trazabilidad
const trazaEditando = ref(false)
const trazaGuardando = ref(false)
const trazaBorrador = ref<Record<TrazaKey, TrazaCampo>>({
  lectura: { usuario: '', fecha: '', hora: '' },
  muestra: { usuario: '', fecha: '', hora: '' },
  recepcion: { usuario: '', fecha: '', hora: '' },
})

function editarTraza() {
  const draft = {} as Record<TrazaKey, TrazaCampo>
  for (const it of trazaItems.value) {
    draft[it.key] = { usuario: it.usuario, fecha: it.fecha, hora: it.hora }
  }
  trazaBorrador.value = draft
  trazaEditando.value = true
}
async function guardarTraza() {
  const n = seleccionado.value
  if (!n) return
  trazaGuardando.value = true
  try {
    await lab.actualizarNanodrop(n.id, { trazabilidad: trazaBorrador.value })
    trazaEditando.value = false
  } catch (e) {
    console.error('[nanodrop] error al guardar trazabilidad:', e)
    alert('No se pudo guardar la trazabilidad. Revisa la conexión con el servidor.')
  } finally {
    trazaGuardando.value = false
  }
}
function cancelarTraza() {
  trazaEditando.value = false
}
</script>

<style scoped>
/* ---------- Estadísticas ---------- */
.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 16px;
}

.stat {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #fff;
  border: 2px solid var(--line);
  border-radius: 18px;
  padding: 16px 18px;
  text-align: left;
  cursor: pointer;
  transition: all 0.16s ease;
  min-width: 0;
}

.stat:hover {
  border-color: var(--teal-600);
  box-shadow: 0 4px 14px rgba(14, 141, 126, 0.12);
}

.stat.active {
  border-color: var(--teal-600);
  background: #e2f5ee;
}

/* La tarjeta de promedio es informativa, no filtra. */
.stat-info {
  cursor: default;
}

.stat-info:hover {
  border-color: var(--line);
  box-shadow: none;
}

.stat-ic {
  width: 54px;
  height: 54px;
  object-fit: contain;
  flex-shrink: 0;
}

.stat-num {
  font-size: 1.7rem;
  font-weight: 800;
  line-height: 1;
  color: var(--ink);
  font-family: 'Sora', sans-serif;
}

.stat-label {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--ink);
  margin-top: 2px;
}

.stat-sub {
  font-size: 0.76rem;
  color: var(--muted);
}

/* ---------- Layout maestro-detalle ---------- */
.layout-maestro {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

/* Solo reservamos la columna del panel cuando hay una lectura seleccionada. */
.layout-maestro.con-panel {
  grid-template-columns: 1fr 340px;
}

.tabla-area {
  min-width: 0;
}

.tabla-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 0 16px;
}

.tabla-header h3 {
  margin: 0;
  font-size: 1rem;
  color: var(--ink);
}

.count {
  color: var(--muted);
  font-weight: 400;
}

.btn-export {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid var(--teal-600);
  background: #fff;
  color: var(--teal-600);
  font-size: 0.83rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.14s ease;
}
.btn-export:hover:not(:disabled) {
  background: var(--teal-600);
  color: #fff;
}
.btn-export:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.table-wrap {
  overflow-x: auto;
}

.data {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.data thead {
  background: #f8f9fb;
  border-bottom: 2px solid var(--line);
}

.data th {
  padding: 12px 16px;
  text-align: left;
  font-weight: 700;
  color: var(--ink-soft);
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.data tbody tr {
  border-bottom: 1px solid var(--line);
  transition: background 0.12s ease;
  cursor: pointer;
}

.data tbody tr:hover {
  background: #fafbfd;
}

.data tbody tr.active {
  background: #e2f5ee;
}

.data td {
  padding: 14px 16px;
  color: var(--ink);
}

.radio-cell {
  width: 40px;
  text-align: center;
}

.radio-cell input {
  accent-color: var(--teal-600);
}

.mono {
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
}

.empty {
  text-align: center;
  color: var(--muted);
  padding: 32px 16px;
}

.text-teal {
  color: var(--teal-600);
  font-weight: 700;
}

.text-coral {
  color: #d2682f;
  font-weight: 700;
}

/* ---------- Panel lateral (ficha) ---------- */
.panel-lateral {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 18px;
  max-height: 82vh;
  overflow-y: auto;
  box-shadow: 0 2px 10px rgba(15, 36, 56, 0.05);
}

.ficha-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.ficha-cod {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--ink);
  font-family: 'Sora', sans-serif;
  flex: 1;
  min-width: 0;
}

.close-btn {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: none;
  background: #f0f2f5;
  color: var(--muted);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.12s ease;
}
.close-btn:hover { background: #e6e8eb; color: var(--ink); }

/* Pastilla de estado */
.pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
  white-space: nowrap;
}
.pill-sm { padding: 3px 9px; font-size: 0.74rem; }
.pill-ok { background: #e6f6ec; color: #1f9d57; }
.pill-bad { background: #fdece3; color: #d2682f; }

/* Resumen dos columnas */
.resumen {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 18px;
  padding: 14px;
  background: #f8f9fb;
  border-radius: 12px;
  margin-bottom: 16px;
}
.res-col { display: flex; flex-direction: column; gap: 8px; }
.res-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.res-k { font-size: 0.82rem; color: var(--ink-soft); }
.res-v { font-size: 0.86rem; font-weight: 700; color: var(--ink); }

/* Bloques */
.bloque { margin-bottom: 16px; }
.bloque-titulo {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 10px;
}
.bloque-titulo.entre { display: flex; align-items: center; justify-content: space-between; }

.icon-btn {
  display: grid;
  place-items: center;
  width: 26px; height: 26px;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.12s ease;
}
.icon-btn:hover { background: #f0f2f5; color: var(--teal-600); }

/* Barras de rango (gauge) */
.gauge-row {
  display: grid;
  grid-template-columns: 64px 1fr 110px;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}
.gauge-tag {
  background: #f8f9fb;
  border-radius: 9px;
  padding: 6px 4px;
  text-align: center;
}
.gauge-label { display: block; font-size: 0.66rem; font-weight: 700; color: var(--ink-soft); }
.gauge-val { display: block; font-size: 1.05rem; font-weight: 800; color: var(--ink); font-family: 'Sora', sans-serif; }

.gauge-bar {
  position: relative;
  height: 10px;
  border-radius: 999px;
  margin: 14px 0 12px;
}
.gauge-bar.g-ok { background: #d8f0e1; }
.gauge-bar.g-bad { background: #fbdcd0; }

.gauge-ideal {
  position: absolute;
  top: 0; bottom: 0;
  border-radius: 999px;
  background: #1f9d57;
  opacity: 0.85;
}
.g-bad .gauge-ideal { background: #2f9e5a; opacity: 0.35; }

.gauge-mark {
  position: absolute;
  top: -15px;
  transform: translateX(-50%);
  font-size: 0.62rem;
  color: var(--ink-soft);
  font-weight: 600;
}
.gauge-dot {
  position: absolute;
  top: 50%;
  width: 14px; height: 14px;
  border-radius: 50%;
  border: 2px solid #fff;
  transform: translate(-50%, -50%);
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.g-ok .gauge-dot { background: #1f9d57; }
.g-bad .gauge-dot { background: #e1502a; }

.gauge-end {
  position: absolute;
  top: 14px;
  font-size: 0.62rem;
  color: var(--muted);
}
.gauge-end-l { left: 0; }
.gauge-end-r { right: 0; }

.gauge-side { display: flex; flex-direction: column; gap: 5px; }
.gauge-ideal-txt { font-size: 0.72rem; color: var(--ink-soft); }
.gauge-flag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.74rem;
  font-weight: 700;
}
.flag-ok { color: #1f9d57; }
.flag-bad { color: #d2682f; }

/* Recomendación */
.reco-txt { font-size: 0.84rem; color: var(--ink-soft); line-height: 1.5; margin: 10px 0 0; }

/* Acción / decisión */
.decision-btns { display: flex; gap: 10px; }
.act-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 10px 12px;
  border-radius: 11px;
  font-size: 0.84rem;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.14s ease;
}
.act-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.act-pcr { background: var(--teal-600); color: #fff; }
.act-pcr:hover:not(:disabled) { filter: brightness(1.08); }
.act-rep { background: #fff; color: #d2682f; border-color: #f1c4ac; }
.act-rep:hover:not(:disabled) { background: #fdece3; }

.decision-tomada {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 11px 13px;
  border-radius: 12px;
}
.decision-tomada.d-pcr { background: #e6f6ec; color: #1f9d57; }
.decision-tomada.d-rep { background: #fdece3; color: #d2682f; }
.decision-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.decision-info b { font-size: 0.86rem; }
.decision-info span { font-size: 0.74rem; opacity: 0.85; }
.decision-tomada .icon-btn { color: inherit; }
.decision-tomada .icon-btn:hover { background: rgba(0, 0, 0, 0.06); color: inherit; }

/* Observaciones */
.obs-txt { font-size: 0.84rem; color: var(--ink-soft); line-height: 1.5; margin: 0; }
.obs-input {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 9px 11px;
  font: inherit;
  font-size: 0.84rem;
  color: var(--ink);
  resize: vertical;
}
.obs-input:focus { outline: none; border-color: var(--teal-600); }
.obs-acciones { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
.btn-mini {
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid transparent;
}
.btn-mini.ghost { background: #f0f2f5; color: var(--ink-soft); }
.btn-mini.ghost:hover { background: #e6e8eb; }
.btn-mini.solid { background: var(--teal-600); color: #fff; }
.btn-mini.solid:hover { filter: brightness(1.06); }

.panel-divider { height: 1px; background: var(--line); margin: 14px 0; }

/* Trazabilidad */
.traza { list-style: none; margin: 0; padding: 0; position: relative; }
.traza::before {
  content: '';
  position: absolute;
  left: 5px; top: 6px; bottom: 6px;
  width: 2px;
  background: var(--line);
}
.traza-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
  position: relative;
}
.traza-dot {
  width: 12px; height: 12px;
  border-radius: 50%;
  background: var(--teal-600);
  border: 2px solid #fff;
  flex-shrink: 0;
  z-index: 1;
  box-shadow: 0 0 0 1px var(--line);
}
.traza-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.traza-tit { font-size: 0.84rem; font-weight: 700; color: var(--ink); }
.traza-user { font-size: 0.76rem; color: var(--muted); }
.traza-fecha { font-size: 0.74rem; color: var(--muted); white-space: nowrap; }

/* Edición de trazabilidad */
.traza-edit {
  padding: 10px 0;
  border-bottom: 1px solid var(--line);
}
.traza-edit:first-child { padding-top: 0; }
.traza-edit-tit {
  display: block;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 6px;
}
.traza-edit-row { display: flex; gap: 8px; margin-top: 6px; }
.traza-input {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 7px 9px;
  font: inherit;
  font-size: 0.82rem;
  color: var(--ink);
}
.traza-input:focus { outline: none; border-color: var(--teal-600); }

/* Info banner */
.info-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  border-left: 4px solid;
}

.info-banner.teal {
  background: #e2f5ee;
  border-color: var(--teal-600);
  color: var(--ink);
}

.info-banner span {
  font-size: 0.9rem;
  line-height: 1.5;
}

/* Card wrapper */
.card {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(15, 36, 56, 0.04);
}

/* Responsive */
@media (max-width: 1000px) {
  .layout-maestro {
    grid-template-columns: 1fr;
  }

  .panel-lateral {
    max-height: none;
  }
}

@media (max-width: 900px) {
  .stats {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 680px) {
  .stats {
    grid-template-columns: 1fr;
  }

  .data {
    font-size: 0.8rem;
  }

  .data th,
  .data td {
    padding: 10px 8px;
  }
}

.pend-badge { margin-left: 4px; font-size: 0.7rem; font-weight: 700; background: rgba(255,255,255,0.25); padding: 2px 8px; border-radius: 999px; }
.edit-nums-btn { display: inline-flex; align-items: center; gap: 5px; border: 1px solid var(--line); background: #fff; border-radius: 8px; padding: 5px 10px; font-size: 0.76rem; font-weight: 700; color: var(--ink-soft); cursor: pointer; }
.edit-nums-btn:hover { border-color: var(--teal); color: var(--teal-600); }
.ed-nums { margin: 4px 0 14px; padding: 14px; border: 1px solid var(--line); border-radius: 12px; background: var(--bg); }
.ed-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
.ed-grid label { display: flex; flex-direction: column; gap: 4px; font-size: 0.72rem; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.03em; }
.ed-grid input { padding: 7px 9px; border: 1px solid var(--line); border-radius: 8px; font-size: 0.9rem; }
.ed-grid input:focus { border-color: var(--teal); outline: none; }
.ed-previa { display: flex; align-items: center; gap: 7px; margin-top: 10px; padding: 8px 11px; border-radius: 9px; font-size: 0.82rem; font-weight: 700; }
.ed-previa.ok { background: var(--teal-50); color: var(--teal-600); }
.ed-previa.bad { background: var(--amber-50); color: #9a6a1a; }
.ed-err { margin-top: 8px; font-size: 0.8rem; color: var(--coral); }
.ed-acc { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
.nd-overlay { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 20px; background: rgba(15,30,40,0.42); backdrop-filter: blur(3px); }
.nd-modal { width: 100%; max-width: 540px; background: #fff; border-radius: 18px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.25); }
.nd-mhead { display: flex; align-items: center; gap: 12px; padding: 20px 22px; border-bottom: 1px solid var(--line); }
.nd-mic { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; color: #fff; background: linear-gradient(135deg, var(--teal), #14b8a6); flex: none; }
.nd-mhead h2 { font-size: 1.1rem; line-height: 1.2; }
.nd-mhead .sub { font-size: 0.82rem; }
.nd-close { margin-left: auto; align-self: flex-start; border: none; background: transparent; font-size: 1.6rem; line-height: 1; color: var(--muted); cursor: pointer; }
.nd-mbody { padding: 20px 22px; display: flex; flex-direction: column; gap: 14px; }
.nd-previa { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 10px; font-size: 0.84rem; font-weight: 700; }
.nd-previa.ok { background: var(--teal-50); color: var(--teal-600); }
.nd-previa.bad { background: var(--amber-50); color: #9a6a1a; }
.nd-err { display: flex; align-items: center; gap: 6px; font-size: 0.84rem; color: var(--coral); }
.nd-empty { display: grid; place-items: center; gap: 6px; padding: 16px; text-align: center; color: var(--muted); font-size: 0.82rem; }
.nd-mfoot { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 22px; border-top: 1px solid var(--line); background: var(--bg); }
</style>

<template>
  <div class="page-head">
    <div>
      <h1>Lecturas NanoDrop</h1>
      <p class="sub">Pureza y concentración del ADN extraído. Ratios 260/280 y 260/230 deciden si avanza a PCR.</p>
    </div>
    <div class="actions">
      <button v-if="auth.can('nanodrop.readings.create')" class="btn btn-primary" @click="abrirModal">
        <Icon name="plus" :size="16" /> Registrar lectura
        <span v-if="vialesPendientes.length" class="pend-badge">{{ vialesPendientes.length }} pendientes</span>
      </button>
    </div>
  </div>

  <!-- Tarjetas de estadística -->
  <div class="stats">
    <button
      class="stat"
      :class="{ active: filtro === 'todas' }"
      @click="filtro = 'todas'"
    >
      <img class="stat-ic" src="/nanodrop/iconos/total lecturas.png" alt="" />
      <div>
        <div class="stat-num">{{ stats.total }}</div>
        <div class="stat-label">total lecturas</div>
        <div class="stat-sub">registros en total</div>
      </div>
    </button>
    <button
      class="stat"
      :class="{ active: filtro === 'aptas' }"
      @click="filtro = 'aptas'"
    >
      <img class="stat-ic" src="/nanodrop/iconos/aptas para pcr.png" alt="" />
      <div>
        <div class="stat-num">{{ stats.aptas }}</div>
        <div class="stat-label">aptas para PCR</div>
        <div class="stat-sub">{{ ((stats.aptas / stats.total) * 100).toFixed(1) }}% del total</div>
      </div>
    </button>
    <button
      class="stat"
      :class="{ active: filtro === 'repetir' }"
      @click="filtro = 'repetir'"
    >
      <img class="stat-ic" src="/nanodrop/iconos/repetir extraccion.png" alt="" />
      <div>
        <div class="stat-num">{{ stats.repetir }}</div>
        <div class="stat-label">repetir extracción</div>
        <div class="stat-sub">{{ ((stats.repetir / stats.total) * 100).toFixed(1) }}% del total</div>
      </div>
    </button>
    <div class="stat stat-info">
      <img class="stat-ic" src="/nanodrop/iconos/promedio.png" alt="" />
      <div>
        <div class="stat-num">{{ stats.promedio }}</div>
        <div class="stat-label">promedio ng/µL</div>
        <div class="stat-sub">concentración media</div>
      </div>
    </div>
  </div>

  <!-- Info banner -->
  <div class="info-banner teal" style="margin-bottom: 18px">
    <img src="/nanodrop/iconos/criterios de pureza.png" alt="" style="width: 24px; height: 24px; object-fit: contain" />
    <span><b>Criterios de pureza:</b> 260/280 ideal 1.8–2.0 (proteínas) | 260/230 ideal 2.0–2.2 (sales/solventes)</span>
  </div>

  <!-- Contenedor principal con tabla y panel lateral -->
  <div class="layout-maestro" :class="{ 'con-panel': seleccionado }">
    <div class="tabla-area">
      <div class="card">
        <div class="tabla-header">
          <h3>
            {{ filtro === 'aptas' ? 'Aptas para PCR' : filtro === 'repetir' ? 'Necesitan repetir extracción' : 'Todas las lecturas' }}
            <span class="count">({{ tabla.length }})</span>
          </h3>
          <button class="btn-export" :disabled="!tabla.length" @click="exportarCsv">
            <Icon name="download" :size="15" /> Exportar CSV
          </button>
        </div>
        <div class="table-wrap">
          <table class="data">
            <thead>
              <tr>
                <th></th>
                <th>Código</th>
                <th>Vial</th>
                <th>Fecha</th>
                <th>260/280</th>
                <th>260/230</th>
                <th>ng/µL</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="n in tabla" :key="n.id" :class="{ active: selectedId === n.id }" @click="selectedId = n.id">
                <td class="radio-cell">
                  <input type="radio" :checked="selectedId === n.id" @click.stop="selectedId = n.id" />
                </td>
                <td class="mono">{{ n.codigo }}</td>
                <td class="mono">{{ vialDatos(n)?.codigo ?? '—' }}</td>
                <td>{{ n.fecha }}</td>
                <td><b :class="r280Ok(n) ? 'text-teal' : 'text-coral'">{{ fx(n.ratio260_280) }}</b></td>
                <td><b :class="r230Ok(n) ? 'text-teal' : 'text-coral'">{{ fx(n.ratio260_230) }}</b></td>
                <td>{{ fx(n.concentracionNgUl, 1) }}</td>
              </tr>
              <tr v-if="!tabla.length">
                <td colspan="7" class="empty">Sin registros en este filtro.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Panel lateral (ficha de la lectura) -->
    <div v-if="seleccionado" class="panel-lateral">
      <!-- Cabecera: código + estado -->
      <div class="ficha-head">
        <h2 class="ficha-cod">{{ seleccionado.codigo }}</h2>
        <span class="pill" :class="esApta(seleccionado) ? 'pill-ok' : 'pill-bad'">
          <Icon :name="esApta(seleccionado) ? 'check' : 'close'" :size="13" />
          {{ esApta(seleccionado) ? 'Apta para PCR' : 'Repetir extracción' }}
        </span>
        <button v-if="!editandoNums && auth.can('nanodrop.readings.update')" class="edit-nums-btn" @click="abrirEdicionNums"><Icon name="edit" :size="13" /> Editar</button>
        <button class="close-btn" @click="selectedId = null"><Icon name="close" :size="16" /></button>
      </div>

      <!-- Editar los números medidos -->
      <div v-if="editandoNums" class="ed-nums">
        <div class="ed-grid">
          <label>Concentración (ng/µL)<input type="number" step="0.1" min="0" v-model="edNum.concentracion" placeholder="opcional" /></label>
          <label>260/280<input type="number" step="0.01" v-model="edNum.r280" /></label>
          <label>260/230<input type="number" step="0.01" v-model="edNum.r230" /></label>
        </div>
        <div v-if="previaEdicion" class="ed-previa" :class="previaEdicion.cls">
          <Icon :name="previaEdicion.cls === 'ok' ? 'check' : 'alert'" :size="14" /> {{ previaEdicion.txt }}
        </div>
        <p v-if="errorNums" class="ed-err">{{ errorNums }}</p>
        <div class="ed-acc">
          <button class="btn-mini ghost" :disabled="guardandoNums" @click="editandoNums = false">Cancelar</button>
          <button class="btn-mini solid" :disabled="guardandoNums" @click="guardarNums">{{ guardandoNums ? 'Guardando…' : 'Guardar' }}</button>
        </div>
      </div>

      <!-- Resumen en dos columnas -->
      <div v-else class="resumen">
        <div class="res-col">
          <div class="res-row"><span class="res-k">Vial</span><span class="res-v mono">{{ vialSel?.codigo ?? '—' }}</span></div>
          <div class="res-row"><span class="res-k">Fecha</span><span class="res-v">{{ seleccionado.fecha }}</span></div>
          <div class="res-row"><span class="res-k">ng/µL</span><span class="res-v">{{ fx(seleccionado.concentracionNgUl, 1) }}</span></div>
        </div>
        <div class="res-col">
          <div class="res-row"><span class="res-k">260/280</span><span class="res-v">{{ fx(seleccionado.ratio260_280) }}</span></div>
          <div class="res-row"><span class="res-k">260/230</span><span class="res-v">{{ fx(seleccionado.ratio260_230) }}</span></div>
          <div class="res-row">
            <span class="res-k">Calidad</span>
            <span class="pill pill-sm" :class="esApta(seleccionado) ? 'pill-ok' : 'pill-bad'">
              <Icon :name="esApta(seleccionado) ? 'check' : 'close'" :size="11" />
              {{ esApta(seleccionado) ? 'Apta' : calLabel[seleccionado.calidad] }}
            </span>
          </div>
        </div>
      </div>

      <!-- Evaluación de pureza: barras de rango -->
      <div class="bloque">
        <div class="bloque-titulo">Evaluación de pureza</div>
        <div v-for="g in gauges" :key="g.label" class="gauge-row">
          <div class="gauge-tag">
            <span class="gauge-label">{{ g.label }}</span>
            <span class="gauge-val">{{ fx(g.value) }}</span>
          </div>
          <div class="gauge-bar" :class="g.ok ? 'g-ok' : 'g-bad'">
            <!-- banda ideal -->
            <span
              class="gauge-ideal"
              :style="{ left: pct(g.idMin, g.min, g.max) + '%', width: (pct(g.idMax, g.min, g.max) - pct(g.idMin, g.min, g.max)) + '%' }"
            ></span>
            <!-- marcas ideal -->
            <span class="gauge-mark" :style="{ left: pct(g.idMin, g.min, g.max) + '%' }">{{ g.idMin }}</span>
            <span class="gauge-mark" :style="{ left: pct(g.idMax, g.min, g.max) + '%' }">{{ g.idMax }}</span>
            <!-- punto del valor -->
            <span class="gauge-dot" :style="{ left: pct(g.value, g.min, g.max) + '%' }"></span>
            <!-- extremos de escala -->
            <span class="gauge-end gauge-end-l">{{ g.min }}</span>
            <span class="gauge-end gauge-end-r">{{ g.max }}</span>
          </div>
          <div class="gauge-side">
            <span class="gauge-ideal-txt">Ideal {{ g.idMin }}–{{ g.idMax }}</span>
            <span class="gauge-flag" :class="g.ok ? 'flag-ok' : 'flag-bad'">
              <Icon :name="g.ok ? 'check' : 'close'" :size="12" />
              {{ g.ok ? 'En rango' : 'Fuera de rango' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Recomendación -->
      <div class="bloque">
        <div class="bloque-titulo">Recomendación</div>
        <span class="pill" :class="esApta(seleccionado) ? 'pill-ok' : 'pill-bad'">
          <Icon :name="esApta(seleccionado) ? 'check' : 'close'" :size="13" />
          {{ esApta(seleccionado) ? 'Apta para PCR' : 'Repetir extracción' }}
        </span>
        <p class="reco-txt">{{ recomendacion }}</p>
      </div>

      <!-- Acción / decisión de seguimiento -->
      <div class="bloque">
        <div class="bloque-titulo">Acción</div>

        <!-- Decisión ya tomada -->
        <div v-if="seleccionado.decision" class="decision-tomada" :class="seleccionado.decision.estado === 'enviada_pcr' ? 'd-pcr' : 'd-rep'">
          <Icon :name="seleccionado.decision.estado === 'enviada_pcr' ? 'check' : 'refresh'" :size="16" />
          <div class="decision-info">
            <b>{{ decisionLabel[seleccionado.decision.estado] }}</b>
            <span>{{ seleccionado.decision.usuario }} · {{ seleccionado.decision.fecha }} {{ seleccionado.decision.hora }}</span>
          </div>
          <button
            v-if="seleccionado.decision.estado === 'enviada_pcr' && vialDatos(seleccionado)"
            class="btn-mini solid"
            @click="router.push({ path: '/pcr', query: { vial: vialDatos(seleccionado)?.codigo } })"
          >Preparar PCR</button>
          <button v-if="auth.can('nanodrop.readings.update')" class="icon-btn" title="Deshacer" @click="deshacerDecision"><Icon name="close" :size="15" /></button>
        </div>

        <!-- Botones de decisión -->
        <div v-else class="decision-btns">
          <button v-if="auth.can('nanodrop.readings.update')" class="act-btn act-pcr" :disabled="!!decisionGuardando" @click="decidir('enviada_pcr')">
            <Icon name="check" :size="15" />
            {{ decisionGuardando === 'enviada_pcr' ? 'Guardando…' : 'Enviar a PCR' }}
          </button>
          <button v-if="auth.can('nanodrop.readings.update')" class="act-btn act-rep" :disabled="!!decisionGuardando" @click="decidir('repetir')">
            <Icon name="refresh" :size="15" />
            {{ decisionGuardando === 'repetir' ? 'Guardando…' : 'Repetir extracción' }}
          </button>
        </div>
      </div>

      <!-- Observaciones (editable) -->
      <div class="bloque">
        <div class="bloque-titulo entre">
          Observaciones
          <button v-if="!obsEditando && auth.can('nanodrop.readings.update')" class="icon-btn" title="Editar" @click="editarObs"><Icon name="edit" :size="15" /></button>
        </div>
        <template v-if="obsEditando">
          <textarea v-model="obsBorrador" class="obs-input" rows="3"></textarea>
          <div class="obs-acciones">
            <button class="btn-mini ghost" :disabled="obsGuardando" @click="cancelarObs">Cancelar</button>
            <button class="btn-mini solid" :disabled="obsGuardando" @click="guardarObs">
              {{ obsGuardando ? 'Guardando…' : 'Guardar' }}
            </button>
          </div>
        </template>
        <p v-else class="obs-txt">{{ obsActual }}</p>
      </div>

      <div class="panel-divider"></div>

      <!-- Trazabilidad (editable) -->
      <div class="bloque">
        <div class="bloque-titulo entre">
          Trazabilidad (últimos eventos)
          <button v-if="!trazaEditando && auth.can('nanodrop.readings.update')" class="icon-btn" title="Editar quién/día/hora" @click="editarTraza">
            <Icon name="edit" :size="15" />
          </button>
        </div>

        <!-- Modo lectura -->
        <ul v-if="!trazaEditando" class="traza">
          <li v-if="decisionEvento" class="traza-item">
            <span class="traza-dot"></span>
            <span class="traza-info">
              <span class="traza-tit">{{ decisionEvento.titulo }}</span>
              <span class="traza-user">{{ decisionEvento.usuario }}</span>
            </span>
            <span class="traza-fecha">{{ decisionEvento.fecha }}</span>
          </li>
          <li v-for="e in trazaItems" :key="e.key" class="traza-item">
            <span class="traza-dot"></span>
            <span class="traza-info">
              <span class="traza-tit">{{ e.titulo }}</span>
              <span class="traza-user">{{ e.usuario || '—' }}</span>
            </span>
            <span class="traza-fecha">{{ e.fecha }}{{ e.hora ? ' ' + e.hora : '' }}</span>
          </li>
        </ul>

        <!-- Modo edición -->
        <template v-else>
          <div v-for="d in TRAZA_DEFS" :key="d.key" class="traza-edit">
            <span class="traza-edit-tit">{{ d.titulo }}</span>
            <input
              v-model="trazaBorrador[d.key].usuario"
              class="traza-input"
              type="text"
              placeholder="Quién registró"
            />
            <div class="traza-edit-row">
              <input v-model="trazaBorrador[d.key].fecha" class="traza-input" type="date" />
              <input v-model="trazaBorrador[d.key].hora" class="traza-input" type="time" />
            </div>
          </div>
          <div class="obs-acciones">
            <button class="btn-mini ghost" :disabled="trazaGuardando" @click="cancelarTraza">Cancelar</button>
            <button class="btn-mini solid" :disabled="trazaGuardando" @click="guardarTraza">
              {{ trazaGuardando ? 'Guardando…' : 'Guardar' }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>

  <!-- Modal: registrar lectura NanoDrop -->
  <Teleport to="body">
    <div v-if="modalAbierto" class="nd-overlay" @click.self="modalAbierto = false">
      <div class="nd-modal" role="dialog" aria-modal="true">
        <div class="nd-mhead">
          <div class="nd-mic"><Icon name="droplet" :size="20" /></div>
          <div>
            <h2>Registrar lectura NanoDrop</h2>
            <p class="sub">El sistema calcula solo si el ADN es apto según los ratios.</p>
          </div>
          <button class="nd-close" @click="modalAbierto = false">&times;</button>
        </div>

        <div class="nd-mbody">
          <div v-if="!vialesPendientes.length" class="nd-empty">
            <Icon name="beaker" :size="24" />
            <p>No hay viales pendientes de lectura.</p>
            <span>Extrae ADN de un subcultivo apto (en la sección <b>Subcultivos</b>) para generar un vial.</span>
          </div>

          <template v-else>
            <div class="field">
              <label>Vial de ADN <span class="req">*</span></label>
              <select v-model="nuevo.idVial">
                <option v-for="v in vialesPendientes" :key="v.id" :value="v.id">{{ v.codigo }}</option>
              </select>
            </div>
            <div class="grid cols-3" style="gap: 12px">
              <div class="field">
                <label>Concentración (ng/µL)</label>
                <input type="number" step="0.1" min="0" v-model="nuevo.concentracion" placeholder="opcional" />
              </div>
              <div class="field">
                <label>260/280 <span class="req">*</span></label>
                <input type="number" step="0.01" v-model="nuevo.r280" placeholder="p. ej. 1.85" />
              </div>
              <div class="field">
                <label>260/230 <span class="req">*</span></label>
                <input type="number" step="0.01" v-model="nuevo.r230" placeholder="p. ej. 2.10" />
              </div>
            </div>

            <div v-if="previaCalidad" class="nd-previa" :class="previaCalidad.cls">
              <Icon :name="previaCalidad.cls === 'ok' ? 'check' : 'alert'" :size="15" />
              <span>{{ previaCalidad.txt }}</span>
            </div>

            <p v-if="errorLectura" class="nd-err"><Icon name="shield" :size="14" /> {{ errorLectura }}</p>
          </template>
        </div>

        <div class="nd-mfoot">
          <button class="btn btn-ghost" :disabled="guardandoLectura" @click="modalAbierto = false">Cancelar</button>
          <button
            v-if="vialesPendientes.length"
            class="btn btn-primary"
            :disabled="guardandoLectura"
            @click="guardarLectura"
          >
            <Icon name="check" :size="16" /> {{ guardandoLectura ? 'Guardando…' : 'Guardar lectura' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
