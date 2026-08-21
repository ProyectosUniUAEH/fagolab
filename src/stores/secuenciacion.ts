// Store de secuenciación: la etapa que continúa después del gel.
//
// Vive aparte de `lab.ts` a propósito: la carga inicial de la app no debe crecer con
// cada módulo nuevo, y las vistas del flujo clásico no dependen de estos datos.
import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'

import type {
  ArchivoSecuencia,
  CandidatoSecuenciacion,
  CorridaAnalisis,
  FichaAnalisis,
  HitBlast,
  ResultadoArbol,
  Secuenciacion,
  VariableExperimento,
} from '../data/types'

// Parámetros del experimento: se varía uno solo a la vez y se comparan las fichas.
export interface OpcionesFicha {
  conEvidencia?: boolean
  temperatura?: number
  topP?: number
  seed?: number | null
  maxArticulos?: number
  etiquetaExperimento?: string
}
import { api, API_BASE } from '../api'
import { useAuthStore } from './auth'

// Resultado que devuelve la API al subir un archivo: validación + QC ya calculados.
export interface ResultadoCarga {
  id: string
  nombreArchivo: string
  formato: 'fasta' | 'fastq' | null
  valido: boolean
  comprimido: boolean
  semaforo: 'apta' | 'revisar' | 'insuficiente'
  metricas: Record<string, never> | Record<string, number | string | boolean | string[]>
  hallazgos: string[]
}

export const useSecuenciacionStore = defineStore('secuenciacion', () => {
  const auth = useAuthStore()

  const secuenciaciones = ref<Secuenciacion[]>([])
  const candidatos = ref<CandidatoSecuenciacion[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const seleccionada = ref<string | null>(null)

  const kpis = reactive({ total: 0, experimentales: 0, publicas: 0, sinteticas: 0, conArchivo: 0 })

  const actual = computed(
    () => secuenciaciones.value.find((s) => s.id === seleccionada.value) ?? null,
  )

  function recalcular() {
    kpis.total = secuenciaciones.value.length
    kpis.experimentales = secuenciaciones.value.filter((s) => s.origenDato === 'experimental').length
    kpis.publicas = secuenciaciones.value.filter((s) => s.origenDato === 'publico_ncbi').length
    kpis.sinteticas = secuenciaciones.value.filter((s) => s.origenDato === 'sintetico').length
    kpis.conArchivo = secuenciaciones.value.filter((s) => s.archivos.length > 0).length
  }

  async function cargar() {
    if (!auth.can('secuenciacion.records.view')) return
    loading.value = true
    error.value = null
    try {
      const [lista, cands] = await Promise.all([
        api.get<Secuenciacion[]>('/api/secuenciaciones'),
        api.get<CandidatoSecuenciacion[]>('/api/secuenciaciones/candidatos'),
      ])
      secuenciaciones.value = lista
      candidatos.value = cands
      recalcular()
      if (seleccionada.value && !lista.some((s) => s.id === seleccionada.value)) {
        seleccionada.value = lista[0]?.id ?? null
      }
      if (!seleccionada.value) seleccionada.value = lista[0]?.id ?? null
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  async function crear(payload: Partial<Secuenciacion> & { idCarril?: string }) {
    const res = await api.post<{ id: string; codigo: string }>('/api/secuenciaciones', payload)
    await cargar()
    seleccionada.value = res.id
    return res
  }

  async function actualizar(id: string, payload: Partial<Secuenciacion>) {
    await api.patch(`/api/secuenciaciones/${id}`, payload)
    await cargar()
  }

  async function eliminar(id: string) {
    await api.del(`/api/secuenciaciones/${id}`)
    if (seleccionada.value === id) seleccionada.value = null
    await cargar()
  }

  // La validación y el QC los hace el backend al recibir el archivo; aquí solo se
  // muestra el resultado. Un archivo inválido también se guarda, con su motivo.
  async function subirArchivo(id: string, file: File, rol: ArchivoSecuencia['rol']) {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('rol', rol)
    const res = await fetch(`${API_BASE}/api/secuenciaciones/${id}/archivos`, {
      method: 'POST',
      body: fd,
      credentials: 'include',
      headers: { 'X-CSRF-Token': leerCookie('fago_csrf') },
    })
    if (!res.ok) {
      const detalle = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(detalle.detail ?? 'No se pudo subir el archivo')
    }
    const resultado = (await res.json()) as ResultadoCarga
    await cargar()
    return resultado
  }

  async function eliminarArchivo(idArchivo: string) {
    await api.del(`/api/secuenciaciones/archivos/${idArchivo}`)
    await cargar()
  }

  // ---- Análisis automatizado ----
  // BLAST tarda minutos, así que la corrida se consulta con la misma cadencia que NCBI
  // pide para su servicio. El intervalo vive aquí y no en el componente para que la vista
  // no tenga que saber nada del ritmo del servicio externo.
  const hits = ref<HitBlast[]>([])
  const corrida = ref<CorridaAnalisis | null>(null)
  const analizando = ref(false)
  let consulta: ReturnType<typeof setTimeout> | null = null

  const orquestando = ref(false)
  const definicionOrquestacion = ref<{ pasos: unknown[]; conexiones: { desde: string; hasta: string; etiqueta: string }[] } | null>(null)
  let consultaOrquestacion: ReturnType<typeof setTimeout> | null = null

  function detenerConsulta() {
    for (const t of [consulta, consultaArbol, consultaExp, consultaOrquestacion]) if (t) clearTimeout(t)
    consulta = consultaArbol = consultaExp = consultaOrquestacion = null
  }

  async function cargarDefinicionOrquestacion() {
    try {
      definicionOrquestacion.value = await api.get('/api/orquestacion/definicion')
    } catch {
      definicionOrquestacion.value = null
    }
  }

  function seguirOrquestacion(idCorrida: string, idSecuenciacion: string) {
    if (consultaOrquestacion) clearTimeout(consultaOrquestacion)
    consultaOrquestacion = setTimeout(async () => {
      try {
        const estado = await api.get<CorridaAnalisis>(`/api/analisis/${idCorrida}`)
        corrida.value = estado
        if (['registrada', 'en_curso'].includes(estado.estado)) {
          seguirOrquestacion(idCorrida, idSecuenciacion)
          return
        }
        orquestando.value = false
        await Promise.all([cargarHits(idSecuenciacion), cargarFichas(idSecuenciacion), cargar()])
      } catch {
        orquestando.value = false
      }
    }, 1200)
  }

  async function lanzarOrquestacion(id: string, opciones: { contexto?: string; maxArticulos?: number; temperatura?: number; seed?: number | null; etiqueta?: string } = {}) {
    orquestando.value = true
    corrida.value = null
    try {
      const res = await api.post<{ id: string }>(`/api/secuenciaciones/${id}/orquestar`, opciones)
      seguirOrquestacion(res.id, id)
      return res
    } catch (e) {
      orquestando.value = false
      throw e
    }
  }

  async function cargarHits(id: string) {
    if (!auth.can('analisis.corridas.view')) return
    try {
      hits.value = await api.get<HitBlast[]>(`/api/secuenciaciones/${id}/hits`)
    } catch {
      hits.value = []
    }
  }

  async function cargarUltimaCorrida(id: string) {
    if (!auth.can('analisis.corridas.view')) return
    try {
      const lista = await api.get<CorridaAnalisis[]>(`/api/secuenciaciones/${id}/analisis`)
      corrida.value = lista[0] ?? null
      if (corrida.value && ['registrada', 'en_curso'].includes(corrida.value.estado)) {
        analizando.value = true
        seguirCorrida(corrida.value.id, id)
      }
    } catch {
      corrida.value = null
    }
  }

  function seguirCorrida(idCorrida: string, idSecuenciacion: string) {
    detenerConsulta()
    consulta = setTimeout(async () => {
      try {
        const estado = await api.get<CorridaAnalisis>(`/api/analisis/${idCorrida}`)
        corrida.value = estado
        if (['registrada', 'en_curso'].includes(estado.estado)) {
          seguirCorrida(idCorrida, idSecuenciacion)
          return
        }
        analizando.value = false
        if (estado.estado === 'completada') {
          await cargarHits(idSecuenciacion)
          await cargar()
        }
      } catch {
        analizando.value = false
      }
    }, 6000)
  }

  async function lanzarAnalisis(id: string, opciones: { baseDatos?: string; maxHits?: number } = {}) {
    analizando.value = true
    corrida.value = null
    try {
      const res = await api.post<{ id: string }>(`/api/secuenciaciones/${id}/analisis`, opciones)
      seguirCorrida(res.id, id)
      return res
    } catch (e) {
      analizando.value = false
      throw e
    }
  }

  // ---- Árbol filogenético ----
  const arbol = ref<ResultadoArbol | null>(null)
  const corridaArbol = ref<CorridaAnalisis | null>(null)
  const construyendoArbol = ref(false)
  let consultaArbol: ReturnType<typeof setTimeout> | null = null

  function seguirArbol(idCorrida: string) {
    if (consultaArbol) clearTimeout(consultaArbol)
    consultaArbol = setTimeout(async () => {
      try {
        const estado = await api.get<CorridaAnalisis & { resultado: ResultadoArbol }>(
          `/api/analisis/${idCorrida}`,
        )
        corridaArbol.value = estado
        if (['registrada', 'en_curso'].includes(estado.estado)) {
          seguirArbol(idCorrida)
          return
        }
        construyendoArbol.value = false
        if (estado.estado === 'completada' && estado.resultado?.newick) {
          arbol.value = estado.resultado
        }
      } catch {
        construyendoArbol.value = false
      }
    }, 6000)
  }

  async function construirArbol(id: string) {
    construyendoArbol.value = true
    arbol.value = null
    try {
      const res = await api.post<{ id: string }>(`/api/secuenciaciones/${id}/arbol`, {})
      seguirArbol(res.id)
      return res
    } catch (e) {
      construyendoArbol.value = false
      throw e
    }
  }

  // ---- Experimentos: una variable a la vez ----
  const variables = ref<VariableExperimento[]>([])
  const corridaExperimento = ref<CorridaAnalisis | null>(null)
  const experimentando = ref(false)
  let consultaExp: ReturnType<typeof setTimeout> | null = null

  async function cargarVariables() {
    if (variables.value.length || !auth.can('ficha.records.view')) return
    try {
      const res = await api.get<{ variables: VariableExperimento[] }>('/api/experimentos/variables')
      variables.value = res.variables
    } catch {
      variables.value = []
    }
  }

  function seguirExperimento(idCorrida: string, idSecuenciacion: string) {
    if (consultaExp) clearTimeout(consultaExp)
    consultaExp = setTimeout(async () => {
      try {
        const estado = await api.get<CorridaAnalisis>(`/api/analisis/${idCorrida}`)
        corridaExperimento.value = estado
        if (['registrada', 'en_curso'].includes(estado.estado)) {
          seguirExperimento(idCorrida, idSecuenciacion)
          return
        }
        experimentando.value = false
        await cargarFichas(idSecuenciacion)
      } catch {
        experimentando.value = false
      }
    }, 6000)
  }

  async function lanzarExperimento(
    id: string,
    config: { variable: string; valores: (number | boolean)[]; etiqueta?: string; base?: OpcionesFicha },
  ) {
    experimentando.value = true
    corridaExperimento.value = null
    try {
      const res = await api.post<{ id: string }>(`/api/secuenciaciones/${id}/experimento`, config)
      seguirExperimento(res.id, id)
      return res
    } catch (e) {
      experimentando.value = false
      throw e
    }
  }

  // ---- Ficha científica: el único paso generativo ----
  const fichas = ref<FichaAnalisis[]>([])
  const fichaActiva = ref<string | null>(null)
  const generando = ref(false)

  const ficha = computed(
    () => fichas.value.find((f) => f.id === fichaActiva.value) ?? fichas.value[0] ?? null,
  )

  async function cargarFichas(id: string) {
    if (!auth.can('ficha.records.view')) return
    try {
      fichas.value = await api.get<FichaAnalisis[]>(`/api/secuenciaciones/${id}/fichas`)
      fichaActiva.value = fichas.value[0]?.id ?? null
    } catch {
      fichas.value = []
    }
  }

  async function generarFicha(id: string, opciones: OpcionesFicha = {}) {
    generando.value = true
    try {
      const nueva = await api.post<FichaAnalisis>(`/api/secuenciaciones/${id}/ficha`, opciones)
      await cargarFichas(id)
      fichaActiva.value = nueva.id
      return nueva
    } finally {
      generando.value = false
    }
  }

  async function eliminarFicha(idFicha: string, idSecuenciacion: string) {
    await api.del(`/api/fichas/${idFicha}`)
    await cargarFichas(idSecuenciacion)
  }

  async function abrirSecuenciacion(id: string) {
    seleccionada.value = id
    detenerConsulta()
    corrida.value = null
    hits.value = []
    fichas.value = []
    fichaActiva.value = null
    arbol.value = null
    corridaArbol.value = null
    corridaExperimento.value = null
    analizando.value = false
    construyendoArbol.value = false
    experimentando.value = false
    await Promise.all([cargarHits(id), cargarUltimaCorrida(id), cargarFichas(id), cargarVariables(), cargarDefinicionOrquestacion()])
  }

  async function vistaPrevia(idArchivo: string, lineas = 12): Promise<string> {
    const res = await fetch(
      `${API_BASE}/api/secuenciaciones/archivos/${idArchivo}/vista-previa?lineas=${lineas}`,
      { credentials: 'include' },
    )
    if (!res.ok) throw new Error('No se pudo leer el archivo')
    return res.text()
  }

  return {
    secuenciaciones,
    candidatos,
    loading,
    error,
    seleccionada,
    actual,
    kpis,
    cargar,
    crear,
    actualizar,
    eliminar,
    subirArchivo,
    eliminarArchivo,
    vistaPrevia,
    hits,
    corrida,
    analizando,
    cargarHits,
    lanzarAnalisis,
    abrirSecuenciacion,
    detenerConsulta,
    fichas,
    ficha,
    fichaActiva,
    generando,
    cargarFichas,
    generarFicha,
    eliminarFicha,
    arbol,
    corridaArbol,
    construyendoArbol,
    construirArbol,
    variables,
    corridaExperimento,
    experimentando,
    lanzarExperimento,
    cargarVariables,
    orquestando,
    definicionOrquestacion,
    lanzarOrquestacion,
  }
})

function leerCookie(nombre: string): string {
  if (typeof document === 'undefined') return ''
  const prefijo = `${encodeURIComponent(nombre)}=`
  const item = document.cookie.split('; ').find((p) => p.startsWith(prefijo))
  return item ? decodeURIComponent(item.slice(prefijo.length)) : ''
}
