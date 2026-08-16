<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import Icon from '../components/Icon.vue'
import WorkflowDesigner from '../components/WorkflowDesigner.vue'
import { api } from '../api'
import { useAuthStore } from '../stores/auth'
import { usePresenceStore } from '../stores/presence'
import { useTareasStore, type ObjetoLab, type Tarea, type TipoActividad, type Transicion } from '../stores/tareas'

const tareas = useTareasStore()
const auth = useAuthStore()
const presence = usePresenceStore()

type Pestana = 'board' | 'list' | 'activity' | 'progress' | 'config'
const tab = ref<Pestana>('board')
const search = ref('')
const personasFiltro = ref<string[]>([])
const tiposFiltro = ref<string[]>([])
const createOpen = ref(false)
const draft = ref({ titulo: '', descripcion: '', tipoClave: 'tarea', prioridad: 'media', fechaLimite: '', codigoObjeto: '', idPadre: '' })
const comment = ref('')
const available = ref<Transicion[]>([])
const transitionComment = ref('')
const aviso = ref<{ tipo: 'error' | 'ok'; texto: string } | null>(null)
const arrastrando = ref<Tarea | null>(null)
const destinosValidos = ref<Record<string, Transicion | undefined>>({})
const cargandoDestinos = ref(false)
const menuEstadoAbierto = ref(false)

const buscarObjeto = ref('')
const objetos = ref<ObjetoLab[]>([])
const buscandoObjetos = ref(false)
const vinculando = ref(false)

const configSub = ref<'tipos' | 'flujo' | 'campos' | 'permisos'>('tipos')
const flujoActivo = ref<string | null>(null)
const tipoDraft = ref({ clave: '', nombre: '', jerarquia: 'tarea', icono: 'clipboard', color: '#1f8f7a', idFlujo: '' })
const field = ref({ clave: '', nombre: '', tipo: 'texto', requerido: false })
const permissionRule = ref({ accion: 'ver', tipoSujeto: 'todos', permitir: true })

const can = (p: string) => auth.can(p)
const puedeEditarFlujo = computed(() => can('tareas.workflow.manage'))
const currentScheme = computed(() => tareas.configuracion?.esquemas?.find((x: any) => x.idEspacio === tareas.idEspacio))

const personasDelTablero = computed(() => {
  const mapa = new Map<string, { id: string; nombre: string; avatarUri?: string | null; total: number }>()
  for (const t of tareas.tareas) {
    if (!t.idAsignado) continue
    const previo = mapa.get(t.idAsignado)
    if (previo) previo.total += 1
    else mapa.set(t.idAsignado, {
      id: t.idAsignado,
      nombre: t.asignadoNombre || 'Sin nombre',
      avatarUri: presence.people.find((p) => p.id === t.idAsignado)?.avatarUri,
      total: 1,
    })
  }
  return [...mapa.values()].sort((a, b) => b.total - a.total)
})
const sinAsignarCount = computed(() => tareas.tareas.filter((t) => !t.idAsignado).length)

const filtered = computed(() => tareas.tareas.filter((t) => {
  if (personasFiltro.value.length) {
    const clave = t.idAsignado ?? '__sin__'
    if (!personasFiltro.value.includes(clave)) return false
  }
  if (tiposFiltro.value.length && !tiposFiltro.value.includes(t.tipoClave || 'tarea')) return false
  const q = search.value.trim().toLowerCase()
  if (!q) return true
  return `${t.clave} ${t.titulo} ${t.asignadoNombre || ''} ${t.codigoObjeto || ''}`.toLowerCase().includes(q)
}))
const porEstadoFiltrado = computed(() => Object.fromEntries(
  tareas.estados.map((e) => [e.clave, filtered.value.filter((t) => t.estadoClave === e.clave)]),
))
const hayFiltros = computed(() => !!(personasFiltro.value.length || tiposFiltro.value.length || search.value.trim()))

function alternarPersona(id: string) {
  personasFiltro.value = personasFiltro.value.includes(id)
    ? personasFiltro.value.filter((x) => x !== id)
    : [...personasFiltro.value, id]
}
function alternarTipo(clave: string) {
  tiposFiltro.value = tiposFiltro.value.includes(clave)
    ? tiposFiltro.value.filter((x) => x !== clave)
    : [...tiposFiltro.value, clave]
}
function limpiarFiltros() { personasFiltro.value = []; tiposFiltro.value = []; search.value = '' }

function notify(texto: string, tipo: 'error' | 'ok' = 'error') {
  aviso.value = { tipo, texto }
  window.setTimeout(() => { if (aviso.value?.texto === texto) aviso.value = null }, 6000)
}
const mensajeDeError = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback)

const fmt = (d?: string | null) => d ? new Date(d).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
const fmtDia = (d?: string | null) => d ? new Date(`${String(d).slice(0, 10)}T12:00:00`).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : '—'
const priority = (p: string) => ({ baja: 'Baja', media: 'Media', alta: 'Alta', critica: 'Crítica' }[p] || p)
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]?.toUpperCase()).join('')
const avatarUrl = (uri?: string | null) => uri ? api.mediaUrl(uri) : ''

function diasRestantes(t: Tarea): number | null {
  if (!t.fechaLimite || t.estadoCategoria === 'hecho') return null
  return Math.ceil((new Date(`${String(t.fechaLimite).slice(0, 10)}T23:59:59`).getTime() - Date.now()) / 86_400_000)
}
function estadoPlazo(t: Tarea) {
  const d = diasRestantes(t)
  if (d === null) return null
  if (d < 0) return { clase: 'vencida', texto: `Venció hace ${Math.abs(d)} d` }
  if (d === 0) return { clase: 'hoy', texto: 'Vence hoy' }
  if (d <= 3) return { clase: 'pronto', texto: `En ${d} d` }
  return { clase: 'ok', texto: fmtDia(t.fechaLimite) }
}

async function open(t: Tarea | string) {
  const key = typeof t === 'string' ? t : t.clave
  await tareas.open(key)
  available.value = await tareas.transitions(key)
  transitionComment.value = ''
  buscarObjeto.value = ''
  objetos.value = []
  menuEstadoAbierto.value = false
}
function closeDrawer() { tareas.detalle = null; available.value = [] }

async function runTransition(tr: Transicion) {
  if (!tr.disponible) { notify(tr.motivo || 'Esa transición no está disponible.'); return }
  const key = tareas.detalle?.clave
  if (!key) return
  try {
    await tareas.transition(key, tr.id, transitionComment.value)
    transitionComment.value = ''
    menuEstadoAbierto.value = false
    notify(`Actividad movida a ${tr.estadoDestinoNombre}.`, 'ok')
    await open(key)
  } catch (e) { notify(mensajeDeError(e, 'No se pudo aplicar la transición.')) }
}

async function startDrag(t: Tarea, event: DragEvent) {
  arrastrando.value = t
  cargandoDestinos.value = true
  event.dataTransfer?.setData('text/plain', t.clave)
  try {
    const rows = await tareas.transitions(t.clave)
    destinosValidos.value = Object.fromEntries(rows.map((r) => [r.estadoDestinoClave, r]))
  } catch { destinosValidos.value = {} } finally { cargandoDestinos.value = false }
}
function endDrag() { arrastrando.value = null; destinosValidos.value = {}; cargandoDestinos.value = false }
function columnaEstado(clave: string) {
  if (!arrastrando.value) return ''
  if (arrastrando.value.estadoClave === clave) return 'origen'
  if (cargandoDestinos.value) return ''
  const tr = destinosValidos.value[clave]
  if (!tr) return 'no-permitida'
  return tr.disponible ? 'permitida' : 'bloqueada'
}
async function onDrop(clave: string) {
  const t = arrastrando.value
  const tr = destinosValidos.value[clave]
  endDrag()
  if (!t || t.estadoClave === clave) return
  if (!tr) { notify(`No existe una transición de ${t.estadoNombre} a esa columna.`); return }
  if (!tr.disponible) { notify(tr.motivo || 'Esa transición está bloqueada.'); return }
  try {
    await tareas.transition(t.clave, tr.id)
    notify(`${t.clave} → ${tr.estadoDestinoNombre}.`, 'ok')
  } catch (e) { notify(mensajeDeError(e, 'No se pudo mover la actividad.')) }
}

async function addComment() {
  if (!tareas.detalle?.clave || !comment.value.trim()) return
  try { await tareas.comment(tareas.detalle.clave, comment.value); comment.value = '' }
  catch (e) { notify(mensajeDeError(e, 'No se pudo comentar.')) }
}

function abrirCreacion(padre?: any, jerarquia: 'epica' | 'tarea' | 'subtarea' = 'tarea') {
  const opciones = tareas.tiposPorJerarquia[jerarquia]
  draft.value = {
    titulo: '', descripcion: '', tipoClave: opciones[0]?.clave || 'tarea', prioridad: 'media',
    fechaLimite: '', codigoObjeto: '', idPadre: padre?.id || '',
  }
  createOpen.value = true
}
const jerarquiaDraft = computed(() => tareas.tipos.find((t) => t.clave === draft.value.tipoClave)?.jerarquia ?? 'tarea')
const tiposDisponiblesDraft = computed(() =>
  draft.value.idPadre ? [...tareas.tiposPorJerarquia.tarea, ...tareas.tiposPorJerarquia.subtarea] : tareas.tipos.filter((t) => t.activo),
)

async function saveCreate() {
  try {
    const t = await tareas.create({
      ...draft.value,
      codigoObjeto: draft.value.codigoObjeto || undefined,
      idPadre: draft.value.idPadre || undefined,
    })
    createOpen.value = false
    notify(`${t.clave} creada.`, 'ok')
    await open(t.clave)
  } catch (e) { notify(mensajeDeError(e, 'No se pudo crear la actividad.')) }
}

let buscarTimer: number | undefined
watch(buscarObjeto, (q) => {
  window.clearTimeout(buscarTimer)
  if (!q.trim()) { objetos.value = []; return }
  buscandoObjetos.value = true
  buscarTimer = window.setTimeout(async () => {
    try { objetos.value = await tareas.buscarObjetos(q) } catch { objetos.value = [] } finally { buscandoObjetos.value = false }
  }, 250)
})
async function vincular(codigo: string) {
  if (!tareas.detalle?.clave) return
  vinculando.value = true
  try {
    await tareas.vincularObjeto(tareas.detalle.clave, codigo)
    buscarObjeto.value = ''; objetos.value = []
    notify(codigo ? `Vinculada a ${codigo}.` : 'Vínculo retirado.', 'ok')
    await open(tareas.detalle.clave)
  } catch (e) { notify(mensajeDeError(e, 'No se pudo vincular.')) } finally { vinculando.value = false }
}

const ETIQUETA_CAMPO: Record<string, string> = {
  titulo: 'Título', descripcion: 'Descripción', prioridad: 'Prioridad', tipo: 'Tipo',
  idAsignado: 'Responsable', fechaLimite: 'Fecha límite', fechaInicio: 'Fecha de inicio',
  codigoObjeto: 'Registro de laboratorio', etiquetas: 'Etiquetas', estado: 'Estado',
}
const ETIQUETA_ACTIVIDAD: Record<string, string> = {
  creada: 'creó la actividad', campo_actualizado: 'actualizó', transicion: 'movió la actividad',
  comentario: 'comentó', vinculo_laboratorio: 'cambió el vínculo de laboratorio',
  asignacion: 'reasignó', adjunto: 'adjuntó evidencia',
}
const describirActividad = (a: any) =>
  `${ETIQUETA_ACTIVIDAD[a.tipo] || a.tipo.replace(/_/g, ' ')}${a.campo ? ` ${ETIQUETA_CAMPO[a.campo] || a.campo}` : ''}`
const valorLegible = (v: any) => v === null || v === undefined || v === '' ? '—' : String(v)

const subtareasHechas = computed(() => (tareas.detalle?.subtareas || []).filter((s: any) => s.estadoCategoria === 'hecho').length)

// --- Configuración ---
const flujosConfig = computed(() => tareas.configuracion?.flujos ?? [])
watch(flujosConfig, (lista) => { if (!flujoActivo.value && lista.length) flujoActivo.value = lista[0].id }, { immediate: true })
const tiposDelFlujo = computed(() => (tareas.configuracion?.tipos ?? []).filter((t) => t.idFlujo === flujoActivo.value))

async function conConfig(accion: () => Promise<unknown>, exito: string) {
  try { await accion(); notify(exito, 'ok') }
  catch (e) { notify(mensajeDeError(e, 'No se pudo guardar.')) }
}
const guardarEstados = (estados: any[]) => conConfig(() => tareas.saveStates(flujoActivo.value!, estados), 'Flujo actualizado.')
const guardarTransiciones = (trs: any[]) => conConfig(() => tareas.saveTransitions(flujoActivo.value!, trs), 'Transiciones actualizadas.')
const crearRegla = (payload: any) => conConfig(() => tareas.createRule(payload), 'Regla añadida.')
const eliminarRegla = (id: string) => conConfig(() => tareas.deleteRule(id), 'Regla eliminada.')

async function nuevoFlujo() {
  const nombre = window.prompt('Nombre del nuevo flujo:')
  if (!nombre?.trim()) return
  const clave = nombre.trim().toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  try {
    const f: any = await tareas.createFlow({ clave, nombre: nombre.trim() })
    flujoActivo.value = f.id
    notify('Flujo creado. Añade sus estados en el lienzo.', 'ok')
  } catch (e) { notify(mensajeDeError(e, 'No se pudo crear el flujo.')) }
}

async function guardarTipo() {
  if (!tipoDraft.value.nombre.trim()) return
  const clave = tipoDraft.value.clave.trim() || tipoDraft.value.nombre.trim().toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '_')
  await conConfig(
    () => tareas.createType({ ...tipoDraft.value, clave, idFlujo: tipoDraft.value.idFlujo || undefined }),
    'Tipo de actividad creado.',
  )
  tipoDraft.value = { clave: '', nombre: '', jerarquia: 'tarea', icono: 'clipboard', color: '#1f8f7a', idFlujo: '' }
}
const cambiarFlujoDeTipo = (tipo: TipoActividad, idFlujo: string) =>
  conConfig(() => tareas.updateType(tipo.id, { idFlujo: idFlujo || null }), `«${tipo.nombre}» ahora usa ese flujo.`)
const cambiarJerarquia = (tipo: TipoActividad, jerarquia: string) =>
  conConfig(() => tareas.updateType(tipo.id, { jerarquia }), `«${tipo.nombre}» actualizado.`)
const alternarTipoActivo = (tipo: TipoActividad) =>
  conConfig(() => tareas.updateType(tipo.id, { activo: !tipo.activo }), `«${tipo.nombre}» ${tipo.activo ? 'desactivado' : 'activado'}.`)
const borrarTipo = (tipo: TipoActividad) =>
  conConfig(() => tareas.deleteType(tipo.id), `«${tipo.nombre}» eliminado.`)

const guardarCampo = () => conConfig(async () => {
  await tareas.createField({ ...field.value, idEspacio: tareas.idEspacio })
  field.value = { clave: '', nombre: '', tipo: 'texto', requerido: false }
}, 'Campo creado.')

const guardarReglaPermiso = () => conConfig(async () => {
  const previas = (currentScheme.value?.reglas || []).map((x: any) => ({
    accion: x.accion, tipoSujeto: x.tipoSujeto, idSujeto: x.idSujeto, permitir: x.permitir, orden: x.orden,
  }))
  await tareas.savePermissionRules(currentScheme.value!.id, [...previas, { ...permissionRule.value, orden: previas.length }])
}, 'Restricción guardada.')

function cambiarTab(nueva: Pestana) {
  tab.value = nueva
  if (nueva === 'activity') void tareas.loadActivity()
  if (nueva === 'progress') void tareas.loadProgreso()
  if (nueva === 'config') void tareas.loadConfig()
}

onMounted(() => { void tareas.load(); void presence.loadDirectory() })
</script>

<template>
<main class="tasks-page">
  <header class="hero">
    <div>
      <span class="eyebrow">Trabajo colaborativo</span>
      <h1>Actividades</h1>
      <p>Épicas, tareas y subtareas del laboratorio, con su flujo, su evidencia y su trazabilidad.</p>
    </div>
    <div class="hero-actions">
      <select v-model="tareas.idEspacio" @change="tareas.changeSpace(tareas.idEspacio!)">
        <option v-for="s in tareas.espacios" :key="s.id" :value="s.id">{{ s.clave }} · {{ s.nombre }}</option>
      </select>
      <button v-if="can('tareas.items.create')" class="btn btn-primary" @click="abrirCreacion()">
        <Icon name="plus" :size="16" /> Nueva actividad
      </button>
    </div>
  </header>

  <nav class="tabs">
    <button :class="{ active: tab === 'board' }" @click="cambiarTab('board')">Tablero</button>
    <button :class="{ active: tab === 'list' }" @click="cambiarTab('list')">Lista</button>
    <button :class="{ active: tab === 'activity' }" @click="cambiarTab('activity')">Actividad</button>
    <button v-if="can('tareas.activity.view')" :class="{ active: tab === 'progress' }" @click="cambiarTab('progress')">Progreso</button>
    <button v-if="can('tareas.config.view')" :class="{ active: tab === 'config' }" @click="cambiarTab('config')">Configuración</button>
  </nav>

  <div v-if="tab === 'board' || tab === 'list'" class="filters">
    <div class="avatars" role="group" aria-label="Filtrar por persona">
      <button
        v-for="p in personasDelTablero"
        :key="p.id"
        class="avatar-chip"
        :class="{ on: personasFiltro.includes(p.id) }"
        :title="`${p.nombre} · ${p.total} actividad(es)`"
        @click="alternarPersona(p.id)"
      >
        <img v-if="p.avatarUri" :src="avatarUrl(p.avatarUri)" :alt="p.nombre" />
        <span v-else>{{ initials(p.nombre) }}</span>
        <i>{{ p.total }}</i>
      </button>
      <button
        v-if="sinAsignarCount"
        class="avatar-chip ghost"
        :class="{ on: personasFiltro.includes('__sin__') }"
        title="Sin asignar"
        @click="alternarPersona('__sin__')"
      >
        <span><Icon name="user" :size="14" /></span>
        <i>{{ sinAsignarCount }}</i>
      </button>
    </div>
    <div class="type-chips">
      <button
        v-for="t in tareas.tipos.filter((x) => x.activo)"
        :key="t.id"
        class="type-chip"
        :class="{ on: tiposFiltro.includes(t.clave) }"
        :style="{ '--tc': t.color || 'var(--teal)' }"
        @click="alternarTipo(t.clave)"
      >
        <Icon :name="(t.icono as any) || 'clipboard'" :size="12" /> {{ t.nombre }}
      </button>
    </div>
    <label class="field-search">
      <Icon name="search" :size="15" />
      <input v-model="search" type="search" placeholder="Buscar por clave, título o código…" />
    </label>
    <button v-if="hayFiltros" class="mini" @click="limpiarFiltros"><Icon name="close" :size="12" /> Limpiar</button>
    <span class="count">{{ filtered.length }} de {{ tareas.tareas.length }}</span>
  </div>

  <p v-if="tareas.error" class="alert">{{ tareas.error }}</p>

  <section v-if="tab === 'board'" class="board" @dragend="endDrag">
    <article
      v-for="state in tareas.estados"
      :key="state.id"
      class="column"
      :class="columnaEstado(state.clave)"
      @dragover.prevent
      @drop.prevent="onDrop(state.clave)"
    >
      <header>
        <span :style="{ background: state.color || undefined }"></span>
        <b>{{ state.nombre }}</b>
        <small>{{ (porEstadoFiltrado[state.clave] || []).length }}</small>
      </header>
      <p v-if="columnaEstado(state.clave) === 'bloqueada'" class="drop-hint blocked">
        <Icon name="alert" :size="13" /> {{ destinosValidos[state.clave]?.motivo }}
      </p>
      <p v-else-if="columnaEstado(state.clave) === 'no-permitida'" class="drop-hint">Sin transición hacia aquí</p>
      <button
        v-for="t in porEstadoFiltrado[state.clave] || []"
        :key="t.id"
        class="task-card"
        draggable="true"
        @dragstart="startDrag(t, $event)"
        @click="open(t)"
      >
        <div class="card-top">
          <span class="type-dot" :style="{ background: t.tipoColor || 'var(--teal)' }" :title="t.tipoNombre || ''">
            <Icon :name="(t.tipoIcono as any) || 'clipboard'" :size="11" />
          </span>
          <code>{{ t.clave }}</code>
          <RouterLink v-if="t.codigoObjeto" class="trace-chip" :to="`/ficha/${t.codigoObjeto}`" :title="`Vinculada a ${t.codigoObjeto}`" @click.stop>
            <Icon name="link" :size="10" /> {{ t.codigoObjeto }}
          </RouterLink>
        </div>
        <b>{{ t.titulo }}</b>
        <footer>
          <i :class="t.prioridad">{{ priority(t.prioridad) }}</i>
          <span v-if="estadoPlazo(t)" class="plazo" :class="estadoPlazo(t)!.clase">
            <Icon name="clock" :size="11" /> {{ estadoPlazo(t)!.texto }}
          </span>
          <span class="asignado">{{ t.asignadoNombre || 'Sin asignar' }}</span>
        </footer>
      </button>
      <p v-if="!(porEstadoFiltrado[state.clave] || []).length" class="empty">Sin actividades</p>
    </article>
  </section>

  <section v-else-if="tab === 'list'" class="card">
    <div class="table-wrap">
      <table>
        <thead><tr><th>Tipo</th><th>Clave</th><th>Actividad</th><th>Estado</th><th>Responsable</th><th>Laboratorio</th><th>Límite</th></tr></thead>
        <tbody>
          <tr v-for="t in filtered" :key="t.id" @click="open(t)">
            <td><span class="type-dot" :style="{ background: t.tipoColor || 'var(--teal)' }"><Icon :name="(t.tipoIcono as any) || 'clipboard'" :size="11" /></span></td>
            <td><code>{{ t.clave }}</code></td>
            <td><b>{{ t.titulo }}</b><small>{{ t.descripcion }}</small></td>
            <td><span class="state">{{ t.estadoNombre }}</span></td>
            <td>{{ t.asignadoNombre || '—' }}</td>
            <td>
              <RouterLink v-if="t.codigoObjeto" class="trace-chip" :to="`/ficha/${t.codigoObjeto}`" @click.stop><Icon name="link" :size="10" /> {{ t.codigoObjeto }}</RouterLink>
              <span v-else class="muted">—</span>
            </td>
            <td><span v-if="estadoPlazo(t)" class="plazo" :class="estadoPlazo(t)!.clase">{{ estadoPlazo(t)!.texto }}</span><span v-else>—</span></td>
          </tr>
          <tr v-if="!filtered.length"><td colspan="7" class="empty">No hay actividades que coincidan.</td></tr>
        </tbody>
      </table>
    </div>
  </section>

  <section v-else-if="tab === 'activity'" class="card feed">
    <header class="section-head"><h2>Actividad reciente</h2></header>
    <article v-for="item in tareas.actividad" :key="item.id">
      <span class="dot"></span>
      <div>
        <b>{{ item.actorNombre || 'Sistema' }} {{ describirActividad(item) }}</b>
        <p>
          <code>{{ item.clave }}</code> {{ item.titulo }}
          <template v-if="item.antes || item.despues">
            <br /><span class="diff-before">{{ valorLegible(item.antes) }}</span>
            <Icon name="arrow" :size="11" />
            <span class="diff-after">{{ valorLegible(item.despues) }}</span>
          </template>
        </p>
      </div>
      <time>{{ fmt(item.createdAt) }}</time>
    </article>
    <p v-if="!tareas.actividad.length" class="empty">Sin actividad todavía.</p>
  </section>

  <section v-else-if="tab === 'progress'" class="progress">
    <article v-for="p in tareas.progreso?.personas || []" :key="p.id" class="card person">
      <header>
        <div class="person-avatar">
          <img v-if="p.avatarUri" :src="avatarUrl(p.avatarUri)" :alt="p.nombre" />
          <span v-else>{{ initials(p.nombre) }}</span>
        </div>
        <div>
          <b>{{ p.nombre }}</b>
          <small>{{ p.cargo || 'Sin cargo registrado' }}</small>
        </div>
        <span class="person-total">{{ p.total }}</span>
      </header>
      <div class="bar" :aria-label="`${p.hecho} de ${p.total} completadas`">
        <i class="seg hecho" :style="{ width: `${(p.hecho / Math.max(p.total, 1)) * 100}%` }"></i>
        <i class="seg progreso" :style="{ width: `${(p.enProgreso / Math.max(p.total, 1)) * 100}%` }"></i>
        <i class="seg pendiente" :style="{ width: `${(p.porHacer / Math.max(p.total, 1)) * 100}%` }"></i>
      </div>
      <dl class="person-stats">
        <div><dt>Por hacer</dt><dd>{{ p.porHacer }}</dd></div>
        <div><dt>En progreso</dt><dd>{{ p.enProgreso }}</dd></div>
        <div><dt>Hecho</dt><dd>{{ p.hecho }}</dd></div>
        <div :class="{ alerta: p.vencidas > 0 }"><dt>Vencidas</dt><dd>{{ p.vencidas }}</dd></div>
        <div><dt>Cerradas 7 d</dt><dd>{{ p.cerradas7d }}</dd></div>
      </dl>
      <button class="mini" @click="personasFiltro = [p.id]; cambiarTab('board')">
        <Icon name="grid" :size="12" /> Ver su tablero
      </button>
    </article>
    <p v-if="!tareas.progreso?.personas.length" class="empty">Nadie tiene actividades asignadas todavía.</p>
    <p v-if="tareas.progreso?.sinAsignar" class="unassigned">
      <Icon name="alert" :size="14" /> {{ tareas.progreso.sinAsignar }} actividad(es) abiertas sin responsable.
    </p>
  </section>

  <section v-else class="config">
    <nav class="subtabs">
      <button :class="{ active: configSub === 'tipos' }" @click="configSub = 'tipos'">Tipos de actividad</button>
      <button :class="{ active: configSub === 'flujo' }" @click="configSub = 'flujo'">Flujos de trabajo</button>
      <button :class="{ active: configSub === 'campos' }" @click="configSub = 'campos'">Campos</button>
      <button :class="{ active: configSub === 'permisos' }" @click="configSub = 'permisos'">Permisos</button>
    </nav>

    <!-- TIPOS -->
    <article v-if="configSub === 'tipos'" class="card">
      <header class="section-head">
        <div>
          <h2>Tipos de actividad</h2>
          <p>Cada tipo declara su nivel en la jerarquía y qué flujo de trabajo sigue.</p>
        </div>
      </header>
      <div class="types">
        <div v-for="t in tareas.configuracion?.tipos || []" :key="t.id" class="type-row" :class="{ off: !t.activo }">
          <span class="type-dot lg" :style="{ background: t.color || 'var(--teal)' }"><Icon :name="(t.icono as any) || 'clipboard'" :size="14" /></span>
          <div class="type-copy">
            <b>{{ t.nombre }}</b>
            <small><code>{{ t.clave }}</code> · {{ t.enUso }} actividad(es)</small>
          </div>
          <label class="type-field">
            <span>Jerarquía</span>
            <select :value="t.jerarquia" :disabled="!puedeEditarFlujo" @change="cambiarJerarquia(t, ($event.target as HTMLSelectElement).value)">
              <option value="epica">Épica</option>
              <option value="tarea">Tarea</option>
              <option value="subtarea">Subtarea</option>
            </select>
          </label>
          <label class="type-field">
            <span>Flujo</span>
            <select :value="t.idFlujo || ''" :disabled="!puedeEditarFlujo" @change="cambiarFlujoDeTipo(t, ($event.target as HTMLSelectElement).value)">
              <option value="">Usar el del espacio</option>
              <option v-for="f in flujosConfig" :key="f.id" :value="f.id">{{ f.nombre }}</option>
            </select>
          </label>
          <div class="type-actions" v-if="puedeEditarFlujo">
            <button class="mini" @click="alternarTipoActivo(t)">{{ t.activo ? 'Desactivar' : 'Activar' }}</button>
            <button v-if="!t.enUso" class="mini danger" @click="borrarTipo(t)"><Icon name="close" :size="12" /></button>
          </div>
        </div>
      </div>
      <form v-if="puedeEditarFlujo" class="inline-form" @submit.prevent="guardarTipo">
        <input v-model.trim="tipoDraft.nombre" required placeholder="Nombre del tipo" />
        <input v-model.trim="tipoDraft.clave" placeholder="clave (opcional)" />
        <select v-model="tipoDraft.jerarquia">
          <option value="epica">Épica</option><option value="tarea">Tarea</option><option value="subtarea">Subtarea</option>
        </select>
        <select v-model="tipoDraft.idFlujo">
          <option value="">Flujo del espacio</option>
          <option v-for="f in flujosConfig" :key="f.id" :value="f.id">{{ f.nombre }}</option>
        </select>
        <input v-model="tipoDraft.color" type="color" title="Color" />
        <button class="btn btn-primary">Crear tipo</button>
      </form>
      <p class="hierarchy-note">
        <Icon name="route" :size="14" />
        Una <b>épica</b> agrupa tareas; una <b>tarea</b> agrupa subtareas. El sistema impide crear
        combinaciones imposibles, como una subtarea colgando de una épica.
      </p>
    </article>

    <!-- FLUJO -->
    <article v-else-if="configSub === 'flujo'" class="card">
      <header class="section-head">
        <div>
          <h2>Flujos de trabajo</h2>
          <p>Este lienzo es el flujo real: lo que se dibuja aquí es lo que el motor evalúa al mover una actividad.</p>
        </div>
        <div class="flow-picker">
          <select v-model="flujoActivo">
            <option v-for="f in flujosConfig" :key="f.id" :value="f.id">{{ f.nombre }}</option>
          </select>
          <button v-if="puedeEditarFlujo" class="mini" @click="nuevoFlujo"><Icon name="plus" :size="13" /> Flujo</button>
        </div>
      </header>
      <p v-if="tiposDelFlujo.length" class="flow-users">
        Lo usan:
        <span v-for="t in tiposDelFlujo" :key="t.id" class="type-chip on" :style="{ '--tc': t.color || 'var(--teal)' }">
          <Icon :name="(t.icono as any) || 'clipboard'" :size="11" /> {{ t.nombre }}
        </span>
      </p>
      <p v-else class="flow-users muted">Ningún tipo de actividad usa este flujo todavía.</p>
      <div class="designer-wrap">
        <WorkflowDesigner
          v-if="flujoActivo && tareas.configuracion"
          :flujo-id="flujoActivo"
          :estados="tareas.configuracion.estados"
          :transiciones="tareas.configuracion.transiciones"
          :reglas="tareas.configuracion.reglas"
          :tipos-regla="tareas.configuracion.tiposRegla || []"
          :editable="puedeEditarFlujo"
          @guardar-estados="guardarEstados"
          @guardar-transiciones="guardarTransiciones"
          @crear-regla="crearRegla"
          @eliminar-regla="eliminarRegla"
          @aviso="notify"
        />
      </div>
    </article>

    <!-- CAMPOS -->
    <article v-else-if="configSub === 'campos'" class="card">
      <header class="section-head"><div><h2>Campos personalizados</h2><p>Información adicional que puede exigir una validación del flujo.</p></div></header>
      <div class="config-list">
        <div v-for="x in tareas.configuracion?.campos" :key="x.id">
          <b>{{ x.nombre }}</b><code>{{ x.clave }}</code><span>{{ x.tipo }}{{ x.requerido ? ' · obligatorio' : '' }}</span>
        </div>
        <p v-if="!tareas.configuracion?.campos?.length" class="muted">Sin campos personalizados.</p>
      </div>
      <form v-if="can('tareas.fields.manage')" class="inline-form" @submit.prevent="guardarCampo">
        <input v-model.trim="field.nombre" required placeholder="Nombre" />
        <input v-model.trim="field.clave" required placeholder="clave" />
        <select v-model="field.tipo"><option value="texto">Texto</option><option value="numero">Número</option><option value="fecha">Fecha</option><option value="seleccion">Selección</option></select>
        <label><input v-model="field.requerido" type="checkbox" /> Obligatorio</label>
        <button class="btn btn-primary">Agregar</button>
      </form>
    </article>

    <!-- PERMISOS -->
    <article v-else class="card">
      <header class="section-head"><div><h2>Esquema de permisos</h2><p>El esquema nunca amplía lo que el ACL niega; únicamente añade restricciones contextuales.</p></div></header>
      <div class="config-list">
        <div v-for="x in currentScheme?.reglas || []" :key="x.id"><b>{{ x.accion }}</b><code>{{ x.tipoSujeto }}</code><span>{{ x.permitir ? 'Permitir' : 'Denegar' }}</span></div>
        <p v-if="!currentScheme?.reglas?.length" class="muted">Sin restricciones: aplica sólo el ACL global.</p>
      </div>
      <form v-if="can('tareas.permissions.manage') && currentScheme" class="inline-form" @submit.prevent="guardarReglaPermiso">
        <select v-model="permissionRule.accion"><option v-for="x in ['ver','crear','editar','transicionar','asignar','comentar','adjuntar','eliminar','gestionar']" :key="x">{{ x }}</option></select>
        <select v-model="permissionRule.tipoSujeto"><option v-for="x in ['todos','asignado','reportador','observador','lider_espacio']" :key="x">{{ x }}</option></select>
        <label><input v-model="permissionRule.permitir" type="checkbox" /> Permitir</label>
        <button class="btn btn-primary">Agregar restricción</button>
      </form>
    </article>
  </section>

  <!-- CAJÓN DE DETALLE -->
  <aside v-if="tareas.detalle" class="drawer">
    <header>
      <div>
        <RouterLink v-if="tareas.detalle.padre" class="parent-link" :to="'/tareas'" @click.prevent="open(tareas.detalle.padre.clave)">
          <Icon :name="(tareas.detalle.padre.tipoIcono as any) || 'clipboard'" :size="11" />
          {{ tareas.detalle.padre.clave }} · {{ tareas.detalle.padre.titulo }}
        </RouterLink>
        <div class="drawer-key">
          <span class="type-dot" :style="{ background: tareas.detalle.tipoColor || 'var(--teal)' }">
            <Icon :name="(tareas.detalle.tipoIcono as any) || 'clipboard'" :size="11" />
          </span>
          <code>{{ tareas.detalle.clave }}</code>
          <small>{{ tareas.detalle.tipoNombre }}</small>
        </div>
        <h2>{{ tareas.detalle.titulo }}</h2>
      </div>
      <button aria-label="Cerrar" @click="closeDrawer">×</button>
    </header>

    <!-- Selector de estado, como el de Jira -->
    <div class="status-picker">
      <button class="status-current" :aria-expanded="menuEstadoAbierto" @click="menuEstadoAbierto = !menuEstadoAbierto">
        <span class="state">{{ tareas.detalle.estadoNombre }}</span>
        <Icon name="chevron" :size="14" />
      </button>
      <div v-if="menuEstadoAbierto" class="status-menu">
        <p class="status-title">Mover a</p>
        <button
          v-for="tr in available"
          :key="tr.id"
          class="status-option"
          :class="{ blocked: !tr.disponible }"
          :disabled="!tr.disponible"
          @click="runTransition(tr)"
        >
          <span><b>{{ tr.estadoDestinoNombre }}</b><small>{{ tr.nombre }}</small></span>
          <Icon :name="tr.disponible ? 'arrow' : 'shield'" :size="13" />
        </button>
        <p v-for="tr in available.filter((x) => !x.disponible)" :key="`m-${tr.id}`" class="status-reason">
          <Icon name="alert" :size="11" /> {{ tr.nombre }}: {{ tr.motivo }}
        </p>
        <p v-if="!available.length" class="status-reason">No hay transiciones desde este estado.</p>
      </div>
    </div>

    <p class="description">{{ tareas.detalle.descripcion || 'Sin descripción.' }}</p>

    <dl>
      <dt>Responsable</dt><dd>{{ tareas.detalle.asignadoNombre || 'Sin asignar' }}</dd>
      <dt>Reportó</dt><dd>{{ tareas.detalle.reportadorNombre || '—' }}</dd>
      <dt>Prioridad</dt><dd>{{ priority(tareas.detalle.prioridad) }}</dd>
      <dt>Fecha límite</dt>
      <dd>
        <span v-if="estadoPlazo(tareas.detalle)" class="plazo" :class="estadoPlazo(tareas.detalle)!.clase">{{ estadoPlazo(tareas.detalle)!.texto }}</span>
        <span v-else>{{ tareas.detalle.fechaLimite || '—' }}</span>
      </dd>
    </dl>

    <section v-if="tareas.detalle.jerarquia !== 'subtarea'">
      <h3>
        <Icon name="layers" :size="15" /> Subtareas
        <span v-if="tareas.detalle.subtareas?.length" class="count-pill">{{ subtareasHechas }}/{{ tareas.detalle.subtareas.length }}</span>
      </h3>
      <div v-if="tareas.detalle.subtareas?.length" class="subtasks">
        <button v-for="s in tareas.detalle.subtareas" :key="s.id" class="subtask" @click="open(s.clave)">
          <span class="type-dot sm" :style="{ background: s.tipoColor || 'var(--teal)' }"></span>
          <code>{{ s.clave }}</code>
          <b>{{ s.titulo }}</b>
          <span class="state sm" :class="s.estadoCategoria">{{ s.estadoNombre }}</span>
        </button>
      </div>
      <p v-else class="muted">Sin subtareas.</p>
      <button
        v-if="can('tareas.items.create')"
        class="tiny"
        @click="abrirCreacion(tareas.detalle, tareas.detalle.jerarquia === 'epica' ? 'tarea' : 'subtarea')"
      >
        <Icon name="plus" :size="12" /> Añadir {{ tareas.detalle.jerarquia === 'epica' ? 'tarea' : 'subtarea' }}
      </button>
    </section>

    <section class="trace">
      <h3><Icon name="route" :size="15" /> Trazabilidad</h3>
      <div v-if="tareas.detalle.codigoObjeto" class="trace-linked">
        <RouterLink class="trace-chip big" :to="`/ficha/${tareas.detalle.codigoObjeto}`">
          <Icon name="link" :size="13" /> {{ tareas.detalle.codigoObjeto }}
        </RouterLink>
        <button v-if="can('tareas.items.update')" class="tiny" :disabled="vinculando" @click="vincular('')">Quitar vínculo</button>
      </div>
      <p v-else class="trace-empty">Sin vincular a ningún registro del experimento.</p>
      <div v-if="can('tareas.items.update')" class="trace-picker">
        <label class="field-search">
          <Icon name="search" :size="14" />
          <input v-model="buscarObjeto" type="search" placeholder="Buscar caja, pez, vial… por código" />
        </label>
        <p v-if="buscandoObjetos" class="muted">Buscando…</p>
        <ul v-else-if="objetos.length" class="trace-results">
          <li v-for="o in objetos" :key="o.id">
            <button :disabled="vinculando" @click="vincular(o.codigo)">
              <code>{{ o.codigo }}</code><span>{{ o.tipoEtiqueta }}</span>
              <small v-if="o.tareasVinculadas">{{ o.tareasVinculadas }}</small>
            </button>
          </li>
        </ul>
        <p v-else-if="buscarObjeto.trim()" class="muted">Sin coincidencias.</p>
      </div>
    </section>

    <section v-if="tareas.detalle.campos?.length">
      <h3>Campos</h3>
      <p v-for="x in tareas.detalle.campos" :key="x.idCampo"><b>{{ x.nombre }}:</b> {{ valorLegible(x.valor) }}</p>
    </section>

    <section>
      <h3>Comentarios</h3>
      <article v-for="c in tareas.detalle.comentarios" :key="c.id" class="comment">
        <b>{{ c.autorNombre || 'Sistema' }}</b><p>{{ c.cuerpo }}</p><time>{{ fmt(c.createdAt) }}</time>
      </article>
      <p v-if="!tareas.detalle.comentarios?.length" class="muted">Aún no hay comentarios.</p>
      <form v-if="can('tareas.comments.create')" @submit.prevent="addComment">
        <textarea v-model="comment" required placeholder="Añade un comentario" />
        <button class="btn btn-primary">Comentar</button>
      </form>
    </section>

    <section>
      <h3>Historial</h3>
      <div v-for="a in tareas.detalle.actividad" :key="a.id" class="history">
        <b>{{ a.actorNombre || 'Sistema' }}</b> {{ describirActividad(a) }}
        <span v-if="a.antes || a.despues" class="history-diff">
          <span class="diff-before">{{ valorLegible(a.antes) }}</span>
          <Icon name="arrow" :size="10" />
          <span class="diff-after">{{ valorLegible(a.despues) }}</span>
        </span>
        <time>{{ fmt(a.createdAt) }}</time>
      </div>
    </section>
  </aside>

  <div v-if="createOpen" class="modal-layer">
    <form class="modal card" @submit.prevent="saveCreate">
      <header><h2>Nueva actividad</h2><button type="button" @click="createOpen = false">×</button></header>
      <p v-if="draft.idPadre" class="modal-parent">
        <Icon name="layers" :size="13" /> Colgará de <b>{{ tareas.detalle?.clave }}</b>
      </p>
      <label>Tipo
        <select v-model="draft.tipoClave">
          <option v-for="t in tiposDisponiblesDraft" :key="t.id" :value="t.clave">{{ t.nombre }} · {{ t.jerarquia }}</option>
        </select>
        <small v-if="jerarquiaDraft === 'subtarea' && !draft.idPadre">Una subtarea necesita una tarea principal; ábrela y usa «Añadir subtarea».</small>
      </label>
      <label>Título<input v-model.trim="draft.titulo" required /></label>
      <label>Descripción<textarea v-model.trim="draft.descripcion" /></label>
      <label>Prioridad
        <select v-model="draft.prioridad"><option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option><option value="critica">Crítica</option></select>
      </label>
      <label>Fecha límite<input v-model="draft.fechaLimite" type="date" /></label>
      <label>Registro de laboratorio (opcional)
        <input v-model.trim="draft.codigoObjeto" placeholder="Ej. CP-Bv1-Ina-ADA" />
        <small>Vincula la actividad a una caja, pez o vial para conservar la trazabilidad.</small>
      </label>
      <footer>
        <button type="button" class="btn" @click="createOpen = false">Cancelar</button>
        <button class="btn btn-primary">Crear</button>
      </footer>
    </form>
  </div>

  <Transition name="toast">
    <p v-if="aviso" class="toast" :class="aviso.tipo" role="status">
      <Icon :name="aviso.tipo === 'ok' ? 'check' : 'alert'" :size="15" /> {{ aviso.texto }}
    </p>
  </Transition>
</main>
</template>

<style scoped>
.tasks-page{max-width:1560px;margin:auto;padding:28px}.hero,.hero-actions,.section-head,.drawer header,.modal header,.modal footer{display:flex;align-items:center;justify-content:space-between;gap:14px}.hero{align-items:end;margin-bottom:20px}.eyebrow{color:var(--teal-600);font-size:.7rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.hero h1{margin:5px 0;font-size:1.8rem}.hero p,.section-head p{color:var(--muted);font-size:.78rem}.hero select,.inline-form input,.inline-form select,.modal input,.modal textarea,.modal select,.drawer textarea,.flow-picker select,.type-field select{padding:9px;border:1px solid var(--line);border-radius:9px;background:var(--panel);color:var(--ink);outline:0}
.tabs,.subtabs{display:flex;gap:4px;padding:5px;background:var(--line-soft);border-radius:13px}.tabs{margin-bottom:14px}.subtabs{margin-bottom:15px;width:fit-content}.tabs button,.subtabs button{padding:9px 15px;border-radius:9px;color:var(--muted);font-size:.8rem;font-weight:800}.tabs button.active,.subtabs button.active{color:var(--teal-600);background:var(--panel);box-shadow:var(--shadow-sm)}
.filters{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:15px}
.avatars{display:flex;align-items:center;gap:-6px}.avatar-chip{position:relative;display:grid;place-items:center;width:36px;height:36px;margin-right:-6px;border:2px solid var(--panel);border-radius:50%;color:#fff;background:linear-gradient(135deg,var(--teal),var(--blue));font-size:.66rem;font-weight:900;transition:transform .12s,box-shadow .12s}.avatar-chip:hover{transform:translateY(-2px);z-index:2}.avatar-chip.on{outline:2px solid var(--teal);outline-offset:2px;z-index:3}.avatar-chip img{width:100%;height:100%;border-radius:50%;object-fit:cover}.avatar-chip.ghost{color:var(--muted);background:var(--line-soft)}.avatar-chip i{position:absolute;right:-3px;bottom:-3px;display:grid;place-items:center;min-width:16px;height:16px;padding:0 3px;border-radius:9px;color:var(--ink);background:var(--panel);border:1px solid var(--line);font-size:.55rem;font-style:normal;font-weight:900}
.type-chips{display:flex;gap:5px;flex-wrap:wrap}.type-chip{display:inline-flex;align-items:center;gap:5px;padding:6px 9px;border:1px solid var(--line);border-radius:9px;color:var(--muted);background:var(--panel);font-size:.66rem;font-weight:800}.type-chip.on{color:var(--tc);border-color:var(--tc);background:color-mix(in srgb,var(--tc) 12%,transparent)}
.field-search{display:flex;align-items:center;gap:8px;flex:1;min-width:210px;padding:9px 12px;border:1px solid var(--line);border-radius:11px;color:var(--muted);background:var(--panel)}.field-search:focus-within{border-color:var(--teal);box-shadow:0 0 0 3px var(--teal-100)}.field-search input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:var(--ink);font-size:.78rem}.count{color:var(--muted);font-size:.72rem}
.alert{padding:11px;border-radius:10px;color:#a42119;background:#fff0ee}
.board{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(255px,1fr);gap:13px;overflow:auto;min-height:480px;padding-bottom:6px}.column{padding:10px;border:1px solid var(--line);border-radius:15px;background:var(--bg);transition:border-color .15s,background .15s,opacity .15s}.column.permitida{border-color:var(--teal);background:var(--teal-50)}.column.bloqueada{border-color:#e0a23c;background:var(--amber-50)}.column.no-permitida{opacity:.45}.column.origen{border-style:dashed}.column>header{display:flex;align-items:center;gap:8px;padding:5px 5px 12px}.column>header span{width:8px;height:8px;border-radius:50%;background:var(--teal)}.column>header small{margin-left:auto;color:var(--muted)}
.drop-hint{display:flex;align-items:center;gap:5px;margin-bottom:8px;padding:7px 8px;border-radius:9px;color:var(--muted);background:var(--line-soft);font-size:.63rem;line-height:1.35}.drop-hint.blocked{color:#8a5104;background:#fff3d6}
.task-card{display:grid;gap:8px;width:100%;margin-bottom:8px;padding:12px;border:1px solid var(--line);border-radius:11px;background:var(--panel);text-align:left;box-shadow:0 2px 5px #0b27300a}.task-card:hover{border-color:var(--teal);transform:translateY(-1px)}.task-card b{font-size:.8rem;line-height:1.35}.card-top{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.task-card code,.drawer code,td code{color:var(--teal-600);font-size:.66rem;font-weight:800}.task-card footer{display:flex;align-items:center;justify-content:space-between;gap:5px;flex-wrap:wrap;color:var(--muted);font-size:.62rem}.task-card i{padding:2px 5px;border-radius:10px;font-style:normal}.task-card i.alta,.task-card i.critica{color:#a42119;background:#fff0ee}.task-card i.media{color:#8a5104;background:#fff5df}.task-card i.baja{color:#08766d;background:#e9fbf6}.asignado{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:110px}
.type-dot{display:grid;place-items:center;width:20px;height:20px;border-radius:6px;color:#fff;flex:none}.type-dot.lg{width:30px;height:30px;border-radius:9px}.type-dot.sm{width:9px;height:9px;border-radius:3px}
.trace-chip{display:inline-flex;align-items:center;gap:4px;padding:2px 6px;border-radius:8px;color:var(--blue);background:var(--blue-50);font-size:.6rem;font-weight:800;text-decoration:none}.trace-chip.big{padding:7px 10px;font-size:.72rem}.trace-chip:hover{filter:brightness(.95)}
.plazo{display:inline-flex;align-items:center;gap:4px;padding:2px 6px;border-radius:8px;font-weight:800}.plazo.vencida{color:#a42119;background:#fff0ee}.plazo.hoy,.plazo.pronto{color:#8a5104;background:#fff5df}.plazo.ok{color:var(--muted);background:var(--line-soft)}
.empty{padding:28px 10px;color:var(--muted);font-size:.75rem;text-align:center}.muted{color:var(--muted);font-size:.72rem}
.card{border:1px solid var(--line);border-radius:16px;background:var(--panel)}.section-head{padding:16px 18px;border-bottom:1px solid var(--line)}.section-head h2{font-size:1rem}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse}th,td{padding:12px 14px;border-bottom:1px solid var(--line-soft);text-align:left;font-size:.76rem}th{color:var(--muted);font-size:.65rem;text-transform:uppercase}tbody tr{cursor:pointer}tbody tr:hover{background:var(--teal-50)}td small{display:block;margin-top:3px;color:var(--muted)}.state{padding:4px 7px;border-radius:10px;color:var(--teal-600);background:var(--teal-50);font-weight:800}.state.sm{font-size:.6rem}.state.hecho{color:#08766d;background:#e9fbf6}.state.por_hacer{color:var(--muted);background:var(--line-soft)}
.feed{max-width:950px}.feed article{display:grid;grid-template-columns:auto 1fr auto;gap:10px;padding:14px 18px;border-bottom:1px solid var(--line-soft);font-size:.76rem}.feed p{margin-top:4px;color:var(--muted);line-height:1.6}.feed time,.comment time{color:var(--muted);font-size:.65rem}.dot{width:9px;height:9px;margin-top:4px;border-radius:50%;background:var(--teal)}
.diff-before{padding:1px 5px;border-radius:6px;color:#a42119;background:#fff0ee;text-decoration:line-through}.diff-after{padding:1px 5px;border-radius:6px;color:#08766d;background:#e9fbf6}
.progress{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:14px}.person{padding:16px}.person header{display:flex;align-items:center;gap:11px;margin-bottom:12px}.person-avatar{display:grid;place-items:center;width:42px;height:42px;border-radius:13px;color:#fff;background:linear-gradient(135deg,var(--teal),var(--blue));font-size:.72rem;font-weight:900}.person-avatar img{width:100%;height:100%;border-radius:13px;object-fit:cover}.person header b{font-size:.83rem}.person header small{display:block;margin-top:2px;color:var(--muted);font-size:.66rem}.person-total{margin-left:auto;padding:4px 9px;border-radius:10px;color:var(--teal-600);background:var(--teal-50);font-size:.75rem;font-weight:900}
.bar{display:flex;height:9px;border-radius:6px;overflow:hidden;background:var(--line-soft)}.seg{display:block;height:100%}.seg.hecho{background:#1f8f7a}.seg.progreso{background:#2f7fd4}.seg.pendiente{background:#c3ccd6}
.person-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin:13px 0}.person-stats div{padding:8px;border-radius:9px;background:var(--line-soft);text-align:center}.person-stats div.alerta{color:#a42119;background:#fff0ee}.person-stats dt{color:var(--muted);font-size:.58rem;text-transform:uppercase;letter-spacing:.05em}.person-stats dd{margin-top:3px;font-size:1rem;font-weight:900}
.unassigned{grid-column:1/-1;display:flex;align-items:center;gap:7px;padding:11px 13px;border-radius:11px;color:#8a5104;background:var(--amber-50);font-size:.73rem;font-weight:700}
.config{display:grid;gap:15px}.config-list{display:flex;gap:9px;flex-wrap:wrap;padding:16px}.config-list div{padding:8px 10px;border-radius:9px;background:var(--line-soft);font-size:.72rem}.config-list b,.config-list code,.config-list span{display:block}.config-list code,.config-list span{margin-top:3px;color:var(--muted);font-size:.62rem}
.inline-form{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:15px;border-top:1px solid var(--line)}.inline-form label{display:flex;align-items:center;gap:5px;font-size:.7rem}.inline-form input[type=color]{width:42px;padding:3px}
.types{display:grid;gap:8px;padding:16px}.type-row{display:grid;grid-template-columns:auto minmax(120px,1fr) auto auto auto;align-items:center;gap:11px;padding:11px;border:1px solid var(--line);border-radius:11px}.type-row.off{opacity:.55}.type-copy b{font-size:.79rem}.type-copy small{display:block;margin-top:2px;color:var(--muted);font-size:.63rem}.type-field{display:grid;gap:3px;font-size:.6rem;color:var(--muted);font-weight:800;text-transform:uppercase;letter-spacing:.04em}.type-field select{font-size:.72rem;text-transform:none;letter-spacing:0;color:var(--ink)}.type-actions{display:flex;gap:5px}
.hierarchy-note{display:flex;align-items:flex-start;gap:8px;margin:0 16px 16px;padding:11px 12px;border-radius:11px;color:var(--ink-soft);background:var(--blue-50);font-size:.7rem;line-height:1.5}
.flow-picker{display:flex;align-items:center;gap:7px}.flow-users{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:13px 18px;color:var(--muted);font-size:.7rem}.designer-wrap{padding:0 16px 16px}
.mini{display:inline-flex;align-items:center;gap:5px;padding:7px 9px;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--ink-soft);font-size:.68rem;font-weight:800}.mini:hover{border-color:var(--teal);background:var(--teal-50)}.mini.danger{color:#a42119;border-color:transparent}.mini.danger:hover{background:#fff0ee}
.drawer{position:fixed;z-index:30;top:0;right:0;display:grid;align-content:start;gap:16px;width:min(500px,100vw);height:100vh;padding:22px;overflow:auto;background:var(--panel);box-shadow:-10px 0 35px #0b273022}.drawer header{align-items:start}.parent-link{display:inline-flex;align-items:center;gap:5px;margin-bottom:6px;padding:3px 7px;border-radius:8px;color:var(--muted);background:var(--line-soft);font-size:.62rem;font-weight:800;text-decoration:none}.parent-link:hover{color:var(--teal-600);background:var(--teal-50)}.drawer-key{display:flex;align-items:center;gap:7px}.drawer-key small{color:var(--muted);font-size:.65rem;font-weight:700}.drawer h2{margin-top:6px;font-size:1.12rem;line-height:1.3}.drawer header>button,.modal header button{font-size:1.5rem;color:var(--muted)}
.status-picker{position:relative}.status-current{display:flex;align-items:center;gap:8px;padding:8px 11px;border:1px solid var(--line);border-radius:10px;background:var(--panel);font-weight:800}.status-current:hover{border-color:var(--teal)}.status-menu{position:absolute;z-index:5;top:calc(100% + 6px);left:0;width:min(320px,90vw);padding:7px;border:1px solid var(--line);border-radius:12px;background:var(--panel);box-shadow:0 14px 34px #0b273022}.status-title{padding:5px 8px;color:var(--muted);font-size:.6rem;font-weight:900;text-transform:uppercase;letter-spacing:.06em}.status-option{display:flex;align-items:center;justify-content:space-between;gap:9px;width:100%;padding:9px 10px;border-radius:9px;background:transparent;text-align:left}.status-option:hover:not(:disabled){background:var(--teal-50)}.status-option b{display:block;font-size:.76rem}.status-option small{display:block;margin-top:2px;color:var(--muted);font-size:.63rem}.status-option.blocked{opacity:.5;cursor:not-allowed}.status-reason{display:flex;align-items:flex-start;gap:5px;padding:5px 9px;color:#8a5104;font-size:.64rem;line-height:1.4}
.description{white-space:pre-wrap;color:var(--ink-soft);font-size:.8rem;line-height:1.55}.drawer dl{display:grid;grid-template-columns:120px 1fr;gap:8px;align-items:center;font-size:.76rem}.drawer dt{color:var(--muted)}.drawer section{padding-top:14px;border-top:1px solid var(--line)}.drawer h3{display:flex;align-items:center;gap:6px;margin-bottom:9px;font-size:.82rem}.count-pill{margin-left:auto;padding:2px 7px;border-radius:9px;color:var(--teal-600);background:var(--teal-50);font-size:.62rem;font-weight:900}
.subtasks{display:grid;gap:5px;margin-bottom:9px}.subtask{display:flex;align-items:center;gap:8px;width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:9px;background:var(--panel);text-align:left}.subtask:hover{border-color:var(--teal);background:var(--teal-50)}.subtask b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.72rem}
.trace-linked{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:9px}.trace-empty{margin-bottom:9px;color:var(--muted);font-size:.72rem}.trace-picker{display:grid;gap:8px}.trace-results{display:grid;gap:5px;max-height:200px;overflow:auto}.trace-results button{display:flex;align-items:center;gap:8px;width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:9px;background:var(--panel);text-align:left}.trace-results button:hover{border-color:var(--teal);background:var(--teal-50)}.trace-results span{color:var(--ink-soft);font-size:.66rem}.trace-results small{margin-left:auto;color:var(--muted);font-size:.6rem}
.tiny{display:inline-flex;align-items:center;gap:6px;padding:7px 10px;border:1px solid var(--line);border-radius:9px;background:var(--panel);font-size:.7rem;font-weight:800}.tiny:hover:not(:disabled){border-color:var(--teal);background:var(--teal-50)}
.comment{padding:8px 0;border-bottom:1px solid var(--line-soft);font-size:.75rem}.comment p{margin:4px 0;white-space:pre-wrap}.drawer form{display:grid;gap:7px;margin-top:9px}.drawer textarea{width:100%;resize:vertical;min-height:64px}
.history{display:grid;gap:3px;padding:7px 0;border-bottom:1px solid var(--line-soft);color:var(--ink-soft);font-size:.7rem}.history b{color:var(--ink)}.history-diff{display:flex;align-items:center;gap:5px;flex-wrap:wrap;font-size:.65rem}.history time{color:var(--muted);font-size:.62rem}
.modal-layer{position:fixed;inset:0;z-index:40;display:grid;place-items:center;padding:18px;background:#10273a66}.modal{display:grid;gap:12px;width:min(500px,100%);max-height:92vh;overflow:auto;padding:20px}.modal label{display:grid;gap:5px;font-size:.75rem;font-weight:800}.modal label small{color:var(--muted);font-weight:600}.modal textarea{min-height:74px;resize:vertical}.modal footer{justify-content:flex-end;margin-top:5px}.modal-parent{display:flex;align-items:center;gap:6px;padding:8px 10px;border-radius:9px;color:var(--ink-soft);background:var(--line-soft);font-size:.7rem}
.toast{position:fixed;z-index:60;left:50%;bottom:26px;display:flex;align-items:center;gap:8px;padding:12px 16px;border-radius:12px;color:#fff;background:#25323d;box-shadow:0 12px 32px #0b273033;font-size:.76rem;font-weight:700;transform:translateX(-50%)}.toast.error{background:#a42119}.toast.ok{background:#08766d}.toast-enter-active,.toast-leave-active{transition:opacity .2s,transform .2s}.toast-enter-from,.toast-leave-to{opacity:0;transform:translate(-50%,10px)}
@media(max-width:760px){.tasks-page{padding:18px}.hero{align-items:start;flex-direction:column}.hero-actions{width:100%}.hero-actions select{flex:1}.feed article{grid-template-columns:auto 1fr}.feed time{grid-column:2}.type-row{grid-template-columns:auto 1fr}.drawer{padding:18px}.drawer dl{grid-template-columns:1fr}}
</style>
