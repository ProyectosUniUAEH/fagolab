import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '../api'
import { usePresenceStore } from './presence'

export interface Tarea { id:string; clave:string; titulo:string; descripcion?:string|null; tipo:string; prioridad:string; idEspacio:string; estadoClave:string; idEstado:string; estadoNombre:string; estadoCategoria:string; estadoColor?:string|null; estadoOrden:number; idAsignado?:string|null; asignadoNombre?:string|null; idReportador?:string|null; reportadorNombre?:string|null; idPadre?:string|null; fechaInicio?:string|null; fechaLimite?:string|null; etiquetas:string[]; ordenTablero:number; codigoObjeto?:string|null; tipoObjeto?:string|null; idTipo?:string|null; tipoClave?:string|null; tipoNombre?:string|null; tipoIcono?:string|null; tipoColor?:string|null; jerarquia?:string|null; createdAt:string; updatedAt:string; [key:string]: unknown }
export interface Estado { id:string; clave:string; nombre:string; categoria:string; color?:string|null; orden:number; idFlujo?:string; esInicial?:boolean; posX?:number|null; posY?:number|null }
export interface Espacio { id:string; clave:string; nombre:string; descripcion?:string|null; idFlujo?:string|null; flujoNombre?:string|null }
/** `disponible` y `motivo` permiten mostrar la transición bloqueada y explicar por qué. */
export interface Transicion { id:string; clave:string; nombre:string; estadoDestinoClave:string; estadoDestinoNombre:string; idEstadoDestino?:string; idEstadoOrigen?:string|null; requiereComentario?:boolean; disponible:boolean; motivo?:string|null; bloqueadaPor?:string|null; pendientes?:string[] }
export interface ObjetoLab { id:string; codigo:string; tipoObjeto:string; tipoEtiqueta:string; nombre?:string|null; tareasVinculadas?:number }
export interface TipoActividad { id:string; clave:string; nombre:string; descripcion?:string|null; icono?:string|null; color?:string|null; jerarquia:'epica'|'tarea'|'subtarea'; idFlujo?:string|null; flujoNombre?:string|null; orden:number; activo:boolean; enUso:number }
export interface TipoRegla { tipo:string; fase:string; nombre:string; descripcion:string; esquema:{ required?:string[]; properties?:Record<string,any> } }
export interface Progreso { personas:Array<{ id:string; nombre:string; cargo?:string|null; avatarUri?:string|null; total:number; porHacer:number; enProgreso:number; hecho:number; vencidas:number; cerradas7d:number }>; sinAsignar:number }
export interface Configuracion { flujos:any[]; estados:Estado[]; transiciones:any[]; reglas:any[]; campos:any[]; reglasPermisos:any[]; tipos:TipoActividad[]; esquemas?:any[]; tiposRegla?:TipoRegla[] }

export const useTareasStore = defineStore('tareas', () => {
  const presence = usePresenceStore()
  const espacios = ref<Espacio[]>([]); const estados = ref<Estado[]>([]); const tareas = ref<Tarea[]>([])
  const idEspacio = ref<string | null>(null); const seleccionada = ref<Tarea | null>(null); const detalle = ref<any>(null)
  const actividad = ref<any[]>([]); const configuracion = ref<Configuracion | null>(null)
  const tipos = ref<TipoActividad[]>([]); const progreso = ref<Progreso | null>(null)
  const loading = ref(false); const error = ref(''); let wired = false

  const espacio = computed(() => espacios.value.find(x => x.id === idEspacio.value) ?? null)
  const porEstado = computed(() => Object.fromEntries(estados.value.map(e => [e.clave, tareas.value.filter(t => t.estadoClave === e.clave)])))
  /** Tipos agrupados por nivel, para los selectores de creación. */
  const tiposPorJerarquia = computed(() => ({
    epica: tipos.value.filter(t => t.activo && t.jerarquia === 'epica'),
    tarea: tipos.value.filter(t => t.activo && t.jerarquia === 'tarea'),
    subtarea: tipos.value.filter(t => t.activo && t.jerarquia === 'subtarea'),
  }))

  function query(params: Record<string, string | null | undefined>) {
    const s = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v) s.set(k, v) })
    const q = s.toString(); return q ? `?${q}` : ''
  }
  function wire() { if (wired) return; wired = true; presence.on('tarea.evento', () => void load(true)) }

  async function load(force = false) {
    if (loading.value && !force) return
    loading.value = true; error.value = ''
    try {
      const board = await api.get<{ espacios: Espacio[]; idEspacio: string; estados: Estado[]; tareas: Tarea[] }>(`/api/tareas/tablero${query({ idEspacio: idEspacio.value })}`)
      espacios.value = board.espacios; idEspacio.value = board.idEspacio
      estados.value = board.estados; tareas.value = board.tareas
      if (!tipos.value.length) void loadTipos()
      if (idEspacio.value) presence.subscribe(`tareas:espacio:${idEspacio.value}`)
      wire()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'No se pudo cargar el tablero.'
    } finally { loading.value = false }
  }

  async function loadTipos() { tipos.value = await api.get<TipoActividad[]>('/api/tareas/config/tipos'); return tipos.value }
  async function changeSpace(id: string) { idEspacio.value = id; seleccionada.value = null; detalle.value = null; await load(true) }
  async function open(task: Tarea | string) { const key = typeof task === 'string' ? task : task.clave; detalle.value = await api.get<any>(`/api/tareas/${key}`); seleccionada.value = detalle.value; return detalle.value }
  async function create(payload: Record<string, unknown>) { const t = await api.post<Tarea>('/api/tareas', { ...payload, espacioClave: payload.espacioClave ?? espacio.value?.clave }); await load(true); return t }
  async function update(key: string, payload: Record<string, unknown>) { const t = await api.patch<any>(`/api/tareas/${key}`, payload); await load(true); detalle.value = t; seleccionada.value = t; return t }
  async function transitions(key: string) { return api.get<Transicion[]>(`/api/tareas/${key}/transiciones`) }
  async function transition(key: string, id: string, comentario = '') { const t = await api.post<any>(`/api/tareas/${key}/transiciones/${id}`, { comentario }); await load(true); detalle.value = t; seleccionada.value = t; return t }
  async function comment(key: string, cuerpo: string) { const row = await api.post<any>(`/api/tareas/${key}/comentarios`, { cuerpo }); if (detalle.value?.comentarios) detalle.value.comentarios.push(row); return row }
  async function assign(key: string, idUsuario: string | null) { const t = await api.put<any>(`/api/tareas/${key}/asignado`, { idUsuario }); await load(true); detalle.value = t; return t }
  async function loadActivity() { actividad.value = await api.get<any[]>(`/api/tareas/actividad${query({ idEspacio: idEspacio.value })}`) }
  async function loadProgreso() { progreso.value = await api.get<Progreso>(`/api/tareas/progreso${query({ idEspacio: idEspacio.value })}`); return progreso.value }

  async function loadConfig() {
    const [base, esquemas, tiposRegla] = await Promise.all([
      api.get<Configuracion>('/api/tareas/config'),
      api.get<any[]>('/api/tareas/config/esquemas-permisos'),
      api.get<TipoRegla[]>('/api/tareas/config/tipos-regla'),
    ])
    configuracion.value = { ...base, esquemas, tiposRegla }
    tipos.value = base.tipos ?? []
    return configuracion.value
  }

  // --- Configuración ---
  async function createField(payload: Record<string, unknown>) { await api.post('/api/tareas/config/campos', payload); await loadConfig() }
  async function deleteField(id: string) { await api.delete(`/api/tareas/config/campos/${id}`); await loadConfig() }
  async function createRule(payload: Record<string, unknown>) { const r = await api.post('/api/tareas/config/reglas', payload); await loadConfig(); return r }
  async function updateRule(id: string, payload: Record<string, unknown>) { const r = await api.patch(`/api/tareas/config/reglas/${id}`, payload); await loadConfig(); return r }
  async function deleteRule(id: string) { await api.delete(`/api/tareas/config/reglas/${id}`); await loadConfig() }
  async function createFlow(payload: Record<string, unknown>) { const f = await api.post<any>('/api/tareas/config/flujos', payload); await loadConfig(); return f }
  async function saveStates(flowId: string, estadosFlujo: any[]) { const r = await api.put(`/api/tareas/config/flujos/${flowId}/estados`, { estados: estadosFlujo }); await loadConfig(); return r }
  async function saveTransitions(flowId: string, transiciones: any[]) { const r = await api.put(`/api/tareas/config/flujos/${flowId}/transiciones`, { transiciones }); await loadConfig(); return r }
  async function createType(payload: Record<string, unknown>) { const t = await api.post('/api/tareas/config/tipos', payload); await loadConfig(); return t }
  async function updateType(id: string, payload: Record<string, unknown>) { const t = await api.patch(`/api/tareas/config/tipos/${id}`, payload); await loadConfig(); return t }
  async function deleteType(id: string) { await api.delete(`/api/tareas/config/tipos/${id}`); await loadConfig() }
  async function createPermissionScheme(payload: Record<string, unknown>) { await api.post('/api/tareas/config/esquemas-permisos', payload); await loadConfig() }
  async function savePermissionRules(id: string, reglas: any[]) { await api.put(`/api/tareas/config/esquemas-permisos/${id}/reglas`, { reglas }); await loadConfig() }

  // --- Trazabilidad ---
  async function buscarObjetos(q: string) { return api.get<ObjetoLab[]>(`/api/tareas/objetos${query({ q })}`) }
  async function tareasDeObjeto(codigo: string) { return api.get<{ objeto: ObjetoLab; tareas: Tarea[] }>(`/api/tareas/objeto/${encodeURIComponent(codigo)}`) }
  async function vincularObjeto(key: string, codigo: string) { return update(key, { codigoObjeto: codigo }) }

  return {
    espacios, estados, tareas, idEspacio, espacio, seleccionada, detalle, actividad, configuracion,
    tipos, tiposPorJerarquia, progreso, loading, error, porEstado,
    load, loadTipos, changeSpace, open, create, update, transitions, transition, comment, assign,
    loadActivity, loadProgreso, loadConfig,
    createField, deleteField, createRule, updateRule, deleteRule, createFlow, saveStates, saveTransitions,
    createType, updateType, deleteType, createPermissionScheme, savePermissionRules,
    buscarObjetos, tareasDeObjeto, vincularObjeto,
  }
})
