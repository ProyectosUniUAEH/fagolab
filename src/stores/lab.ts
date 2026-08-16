import { defineStore } from 'pinia'
import { reactive, computed, ref } from 'vue'
import type {
  Recepcion,
  Pez,
  Muestra,
  CajaPetri,
  Subcultivo,
  Extraccion,
  Vial,
  Nanodrop,
  Pcr,
  Gel,
  ControlPositivo,
  CorridaPcr,
  ReporteRow,
} from '../data/types'
import { ORGANOS, MEDIOS, setOrganos, setMedios } from '../data/catalogs'
import type { OrganoCat, MedioCat } from '../data/catalogs'
import { api, API_BASE } from '../api'
import { useAuthStore } from './auth'

interface LabState {
  recepciones: Recepcion[]
  peces: Pez[]
  muestras: Muestra[]
  cajas: CajaPetri[]
  subcultivos: Subcultivo[]
  extracciones: Extraccion[]
  viales: Vial[]
  nanodrop: Nanodrop[]
  pcr: Pcr[]
  geles: Gel[]
  positivos: ControlPositivo[]
  corridas: CorridaPcr[]
}

function emptyState(): LabState {
  return {
    recepciones: [],
    peces: [],
    muestras: [],
    cajas: [],
    subcultivos: [],
    extracciones: [],
    viales: [],
    nanodrop: [],
    pcr: [],
    geles: [],
    positivos: [],
    corridas: [],
  }
}

export const useLabStore = defineStore('lab', () => {
  const auth = useAuthStore()
  const state = reactive<LabState>(emptyState())

  const proyecto = reactive({
    codigo: 'FAGO-ACUA-2026',
    nombre: 'Fagoterapia como una alternativa en el control de patógenos de importancia en la producción acuícola',
    especie: 'Oreochromis niloticus',
    responsable: 'Pamela Bardales G',
    institucion: 'Instituto de Ciencias Agropecuarias, UAEH',
  })

  const loading = ref(false)
  const loaded = ref(false)
  const error = ref<string | null>(null)

  // ---- Carga inicial desde la API (reemplaza los datos semilla locales) ----
  async function load() {
    loading.value = true
    error.value = null
    try {
      const [
        proy,
        recepciones,
        peces,
        muestras,
        cajas,
        subcultivos,
        extracciones,
        viales,
        nanodrop,
        pcr,
        geles,
        positivos,
        corridas,
      ] = await Promise.all([
        auth.can('proyecto.info.view') ? api.get<typeof proyecto>('/api/proyecto') : Promise.resolve(proyecto),
        auth.can('recepciones.records.view') ? api.get<Recepcion[]>('/api/recepciones') : Promise.resolve([]),
        auth.can('peces.records.view') ? api.get<Pez[]>('/api/peces') : Promise.resolve([]),
        auth.can('peces.records.view') ? api.get<Muestra[]>('/api/muestras') : Promise.resolve([]),
        auth.can('cajas.records.view') ? api.get<CajaPetri[]>('/api/cajas') : Promise.resolve([]),
        auth.can('subcultivos.records.view') ? api.get<Subcultivo[]>('/api/subcultivos') : Promise.resolve([]),
        auth.can('subcultivos.records.view') ? api.get<Extraccion[]>('/api/extracciones') : Promise.resolve([]),
        auth.can('nanodrop.readings.view') ? api.get<Vial[]>('/api/viales') : Promise.resolve([]),
        auth.can('nanodrop.readings.view') ? api.get<Nanodrop[]>('/api/nanodrop') : Promise.resolve([]),
        auth.can('pcr.runs.view') ? api.get<Pcr[]>('/api/pcr') : Promise.resolve([]),
        auth.can('electroforesis.gels.view') ? api.get<Gel[]>('/api/geles') : Promise.resolve([]),
        auth.can('pcr.runs.view') ? api.get<ControlPositivo[]>('/api/positivos') : Promise.resolve([]),
        auth.can('pcr.runs.view') ? api.get<CorridaPcr[]>('/api/pcr/corridas') : Promise.resolve([]),
      ])
      Object.assign(proyecto, proy)
      state.recepciones = recepciones
      state.peces = peces
      state.muestras = muestras
      state.cajas = cajas
      state.subcultivos = subcultivos
      state.extracciones = extracciones
      state.viales = viales
      state.nanodrop = nanodrop
      state.pcr = pcr
      state.geles = geles
      state.positivos = positivos
      state.corridas = corridas
      loaded.value = true
      if (auth.can('aislamiento.workflow.view')) void cargarCatalogos()
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      console.error('[lab] error al cargar datos de la API:', e)
    } finally {
      loading.value = false
    }
  }

  // ---- Catálogos (órganos y medios, editables desde la app) ----

  // Se cargan aparte del resto: si fallan, la app sigue con las listas semilla.
  async function cargarCatalogos() {
    try {
      const [organos, medios] = await Promise.all([
        api.get<OrganoCat[]>('/api/catalogos/organos'),
        api.get<MedioCat[]>('/api/catalogos/medios'),
      ])
      setOrganos(organos)
      setMedios(medios)
      await cargarPreferenciasSiembra()
    } catch (e) {
      console.warn('[lab] no se pudieron cargar los catálogos, se usan los de respaldo:', e)
    }
  }

  async function crearOrgano(nombre: string, codigo?: string) {
    const creado = await api.post<OrganoCat>('/api/catalogos/organos', { nombre, codigo })
    await cargarCatalogos()
    return creado
  }

  // Cajas por combinación órgano × medio usadas la última vez (punto de partida del wizard).
  const preferenciasSiembra = ref<Record<string, Record<string, number>>>({})

  async function cargarPreferenciasSiembra() {
    try {
      preferenciasSiembra.value = await api.get<Record<string, Record<string, number>>>(
        '/api/catalogos/preferencias-siembra',
      )
    } catch (e) {
      console.warn('[lab] no se pudieron cargar las preferencias de siembra:', e)
    }
  }

  async function crearMedio(nombre: string, completo?: string, tipo?: string) {
    const creado = await api.post<MedioCat>('/api/catalogos/medios', { nombre, completo, tipo })
    await cargarCatalogos()
    return creado
  }

  // ---- Escrituras (POST a la API + recarga) ----

  // Crea un pez + sus muestras + las cajas Petri de la matriz órgano × medio.
  async function registrarAislamiento(payload: {
    idRecepcion: string
    pesoG?: number | null
    longitudCm?: number | null
    estadoClinico: string
    lesiones: string
    organos: string[]
    medios: string[]
    cajasPorMuestra: number
    fechaSiembra: string
    // Cajas por combinación: matriz[organo][medio]. Sin ella, el backend usa cajasPorMuestra.
    matriz?: Record<string, Record<string, number>>
    coloracion?: string
    branquias?: string
    ojos?: string
    piel?: string
    abdomen?: string
    diagnostico?: string
  }) {
    const res = await api.post<{
      pez: { id: string; codigo: string }
      cajas: { id: string; codigo: string; medio: string; organo: string }[]
    }>('/api/aislamiento', payload)
    await load()
    return res
  }

  // Registra la observación de colonia de una caja (el núcleo del Excel).
  async function registrarObservacion(
    idCaja: string,
    payload: {
      fecha: string
      hayCrecimiento: boolean
      numeroMorfotipos?: number
      morfologia?: string
      color?: string
      forma?: string
      borde?: string
      elevacion?: string
      hemolisis?: string
      observaciones?: string
    },
  ) {
    const res = await api.post<{ id: string }>(`/api/cajas/${idCaja}/observacion`, payload)
    await load()
    return res
  }

  // Guarda la trazabilidad editable de una caja (registrada/estado).
  async function actualizarCajaTrazabilidad(idCaja: string, trazabilidad: unknown) {
    const res = await api.patch<{ id: string }>(`/api/cajas/${idCaja}/trazabilidad`, { trazabilidad })
    await load()
    return res
  }

  // Borra una caja Petri (el backend rechaza si tiene subcultivos derivados).
  async function eliminarCaja(idCaja: string) {
    const res = await api.del<{ ok: boolean }>(`/api/cajas/${idCaja}`)
    await load()
    return res
  }

  // Borra un subcultivo (el backend rechaza si ya tiene extracción de ADN).
  async function eliminarSubcultivo(idSub: string) {
    const res = await api.del<{ ok: boolean }>(`/api/subcultivos/${idSub}`)
    await load()
    return res
  }

  // Registra varias colonias de una misma caja Petri (cada una genera su subcultivo).
  async function crearSubcultivos(
    idCaja: string,
    payload: {
      medio: string
      fechaSiembra: string
      subcultivos: {
        morfotipo: string
        color?: string
        forma?: string
        borde?: string
        elevacion?: string
        textura?: string
        resultadoPureza?: string
        aptoExtraccion?: boolean
      }[]
    },
  ) {
    const res = await api.post<{ creados: { id: string; codigo: string; morfotipo: string }[] }>(
      `/api/cajas/${idCaja}/subcultivos`,
      payload,
    )
    await load()
    return res
  }

  // Extrae ADN de un subcultivo apto: crea la extracción y su vial (pendiente de NanoDrop).
  async function extraerAdn(
    idSubcultivo: string,
    payload: { fecha?: string; metodo?: string; concentracionNgUl?: number | null } = {},
  ) {
    const res = await api.post<{
      extraccion: { id: string; codigo: string }
      vial: { id: string; codigo: string }
    }>(`/api/subcultivos/${idSubcultivo}/extraccion`, payload)
    await load()
    return res
  }

  // Registra una lectura NanoDrop de un vial. El backend calcula la calidad y la acción.
  async function registrarNanodrop(
    idVial: string,
    payload: { ratio260_280: number; ratio260_230: number; concentracionNgUl?: number | null; fecha?: string },
  ) {
    const res = await api.post<{ id: string; codigo: string }>(`/api/viales/${idVial}/nanodrop`, payload)
    await load()
    return res
  }

  // Actualiza la ficha de un subcultivo (color, forma, textura, pureza, apto, trazabilidad).
  async function actualizarSubcultivo(
    idSub: string,
    payload: {
      color?: string
      forma?: string
      textura?: string
      estado?: string
      aptoExtraccion?: boolean
      trazabilidad?: unknown
    },
  ) {
    const res = await api.patch<{ id: string }>(`/api/subcultivos/${idSub}`, payload)
    await load()
    return res
  }

  // Actualiza campos editables de una lectura NanoDrop (observaciones, decisión).
  async function actualizarNanodrop(
    idLectura: string,
    payload: {
      observaciones?: string
      decision?: unknown
      trazabilidad?: unknown
      ratio260_280?: number
      ratio260_230?: number
      concentracionNgUl?: number | null
    },
  ) {
    const res = await api.patch<{ id: string }>(`/api/nanodrop/${idLectura}`, payload)
    await load()
    return res
  }

  // Crea una recepción de lote.
  async function crearRecepcion(payload: {
    fecha: string
    origen: string
    especie: string
    cientifico: string
    cantidadPeces: number
    motivo: string
  }) {
    const res = await api.post<{ id: string; codigo: string }>('/api/recepciones', payload)
    await load()
    return res
  }

  // Corrige los datos de una recepción ya registrada.
  async function actualizarRecepcion(
    idRecepcion: string,
    payload: Partial<{
      fecha: string
      origen: string
      especie: string
      cientifico: string
      cantidadPeces: number
      motivo: string
    }>,
  ) {
    const res = await api.patch<{ id: string; codigo: string }>(`/api/recepciones/${idRecepcion}`, payload)
    await load()
    return res
  }

  // Sube una imagen y la vincula a un objeto por su código (pez, caja, gel...).
  async function subirImagen(file: File, codigoObjeto: string, rol = 'evidencia', esPrincipal = false) {
    const res = await api.upload(file, codigoObjeto, rol, esPrincipal)
    await load()
    return res
  }

  // ---- Caja de positivos -----------------------------------------------------------
  async function crearControlPositivo(payload: {
    etiqueta: string
    organismo?: string
    descripcion?: string
    concentracionNgUl?: number | null
    ubicacion?: string
    codigoVial?: string
    observaciones?: string
  }) {
    const res = await api.post<{ id: string; codigo: string }>('/api/positivos', payload)
    await load()
    return res
  }

  // Marca un control positivo como agotado / disponible (recordatorio para re-extraer).
  async function actualizarControlPositivo(
    id: string,
    payload: { estado?: 'disponible' | 'agotado'; observaciones?: string },
  ) {
    const res = await api.patch<{ id: string }>(`/api/positivos/${id}`, payload)
    await load()
    return res
  }

  // ---- Corridas de PCR (memoria de muestras / lotes ya amplificados) ----------------
  async function crearCorridaPcr(payload: {
    fecha: string
    volFinal: number
    volMolde: number
    usarBlanco: boolean
    usarPositivo: boolean
    margenError: number
    idControlPositivo?: string | null
    receta: Record<string, unknown>
    muestras: { frasco: string; lote: string; muestra: string }[]
    observaciones?: string
  }) {
    const res = await api.post<{ id: string; codigo: string; nReacciones: number; nTubos: number }>(
      '/api/pcr/corridas',
      payload,
    )
    await load()
    return res
  }

  // ---- Electroforesis: registrar un gel con sus carriles ----------------------------
  async function crearGel(payload: {
    fecha: string
    agarosaPct: number
    voltaje: number
    marcador?: string
    responsable?: string
    observaciones?: string
    idCorridaPcr?: string
    carriles: {
      numero: number
      tipo: 'muestra' | 'marcador' | 'blanco' | 'positivo'
      idPcr?: string | null
      idControlPositivo?: string | null
      codigoVisible: string
      estado: 'pendiente' | 'positivo' | 'negativo' | 'no_claro' | 'no_revisado'
      tamanoPb?: number | null
      observaciones?: string
    }[]
  }) {
    const res = await api.post<{ id: string; codigo: string }>('/api/geles', payload)
    await load()
    return res
  }

  // ---- Reportes (export tipo Excel) ----
  const reporte = ref<ReporteRow[]>([])
  const reporteCargando = ref(false)

  async function cargarReporte() {
    reporteCargando.value = true
    try {
      reporte.value = await api.get<ReporteRow[]>('/api/reportes/resumen')
    } finally {
      reporteCargando.value = false
    }
  }

  // URL de descarga del .xlsx (lo sirve la API; abrir en nueva pestaña).
  const reporteExcelUrl = `${API_BASE}/api/reportes/excel`
  const reportePdfUrl = `${API_BASE}/api/reportes/pdf`

  // ---- Selectores ----
  const cajasDeMuestra = (idMuestra: string) => state.cajas.filter((c) => c.idMuestra === idMuestra)
  const muestrasDePez = (idPez: string) => state.muestras.filter((m) => m.idPez === idPez)
  const organoDeCaja = (c: CajaPetri) => state.muestras.find((m) => m.id === c.idMuestra)?.organo ?? ''
  const pezDeCaja = (c: CajaPetri) => {
    const m = state.muestras.find((mm) => mm.id === c.idMuestra)
    return state.peces.find((p) => p.id === m?.idPez)
  }

  const kpis = computed(() => ({
    peces: state.peces.length,
    cajas: state.cajas.length,
    conCrecimiento: state.cajas.filter((c) => c.estado === 'con-crecimiento').length,
    subcultivos: state.subcultivos.length,
    viales: state.viales.length,
    nanodrop: state.nanodrop.length,
    pcrPositivos: state.pcr.filter((p) => p.resultado === 'positivo').length,
  }))

  // Distribución de cajas por medio (para gráfica del dashboard).
  const cajasPorMedio = computed(() =>
    MEDIOS.map((m) => ({
      medio: m.nombre,
      color: m.color,
      total: state.cajas.filter((c) => c.medio === m.nombre).length,
    })).filter((x) => x.total > 0),
  )

  // Calidad de ADN promedio por órgano (NanoDrop) para gráfica.
  const calidadPorOrgano = computed(() => {
    return ORGANOS.map((o) => {
      const cajasOrg = state.cajas.filter((c) => organoDeCaja(c) === o.codigo).map((c) => c.id)
      const subs = state.subcultivos.filter((s) => cajasOrg.includes(s.idCaja)).map((s) => s.id)
      const exts = state.extracciones.filter((e) => subs.includes(e.idSubcultivo)).map((e) => e.id)
      const vials = state.viales.filter((v) => exts.includes(v.idExtraccion)).map((v) => v.id)
      const reads = state.nanodrop.filter((n) => vials.includes(n.idVial))
      const avg = reads.length ? reads.reduce((a, n) => a + n.ratio260_280, 0) / reads.length : 0
      return { organo: o.nombre, valor: Number(avg.toFixed(2)), n: reads.length }
    }).filter((x) => x.n > 0)
  })

  return {
    state,
    proyecto,
    loading,
    loaded,
    error,
    load,
    cargarCatalogos,
    crearOrgano,
    crearMedio,
    preferenciasSiembra,
    cargarPreferenciasSiembra,
    registrarAislamiento,
    registrarObservacion,
    actualizarCajaTrazabilidad,
    crearSubcultivos,
    eliminarCaja,
    eliminarSubcultivo,
    extraerAdn,
    registrarNanodrop,
    actualizarSubcultivo,
    actualizarNanodrop,
    crearRecepcion,
    actualizarRecepcion,
    subirImagen,
    crearControlPositivo,
    actualizarControlPositivo,
    crearCorridaPcr,
    crearGel,
    reporte,
    reporteCargando,
    cargarReporte,
    reporteExcelUrl,
    reportePdfUrl,
    cajasDeMuestra,
    muestrasDePez,
    organoDeCaja,
    pezDeCaja,
    kpis,
    cajasPorMedio,
    calidadPorOrgano,
  }
})
