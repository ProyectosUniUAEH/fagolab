// Tipos del modelo de datos (espejo del esquema relacional homologado con el Excel).
// Cada entidad rastreable tiene un `codigo` legible que alimenta QR + código de barras.

export type Estado =
  | 'incubando'
  | 'con-crecimiento'
  | 'puro'
  | 'pendiente'
  | 'listo'
  | 'descartado'
  | 'positivo'
  | 'negativo'
  | 'repetir'

export interface Recepcion {
  id: string
  codigo: string // REC-2026-05-20-01
  fecha: string
  origen: string
  especie: string
  cientifico: string
  cantidadPeces: number
  motivo: string
  estado: 'abierto' | 'cerrado'
}

export interface Pez {
  id: string
  codigo: string // PEZ-001
  idRecepcion: string
  numeroEnLote: number
  pesoG: number
  longitudCm: number
  estadoClinico: string
  lesiones: string
  fotoUrl?: string
}

export interface Muestra {
  id: string
  codigo: string // MB-PEZ001-HG
  idPez: string
  organo: string // código catálogo (Hg, Rñ...)
  replica: string // a / b / c
  metodoToma: string
}

export interface CajaPetri {
  id: string
  codigo: string // CP-PEZ001-001
  idMuestra: string
  medio: string
  numero: number
  fechaSiembra: string
  estado: Estado
  morfologia?: string
  colorColonia?: string
  fotoUrl?: string | null
  nFotos?: number
  trazabilidad?: {
    reg?: { usuario: string; fecha: string; hora: string }
    est?: { usuario: string; fecha: string; hora: string }
  } | null
}

export interface Subcultivo {
  id: string
  codigo: string // SUB-PEZ001-001
  idCaja: string
  morfotipo: string
  color: string
  forma: string
  textura: string
  numero: number
  fechaSiembra: string
  estado: Estado
  aptoExtraccion: boolean
  fotoUrl?: string | null
  nFotos?: number
  trazabilidad?: {
    creado?: { usuario: string; fecha: string; hora: string }
    pureza?: { usuario: string; fecha: string; hora: string }
    apto?: { usuario: string; fecha: string; hora: string }
  } | null
}

export interface Extraccion {
  id: string
  codigo: string // EXT-PEZ001-001
  idSubcultivo: string
  metodo: string
  fecha: string
  estado: Estado
}

export interface Vial {
  id: string
  codigo: string // VIAL-PEZ001-001
  idExtraccion: string
  numero: number
  concentracionNgUl?: number
  estado: Estado
}

export interface Nanodrop {
  id: string
  codigo: string // ND-PEZ001-001
  idVial: string
  fecha: string
  ratio260_280: number | null
  ratio260_230: number | null
  concentracionNgUl: number | null
  calidad: 'optima' | 'aceptable' | 'baja'
  accion: string
  observaciones?: string
  decision?: {
    estado: 'enviada_pcr' | 'repetir'
    usuario: string
    fecha: string
    hora: string
  } | null
  // Trazabilidad editable: overrides por evento { usuario, fecha, hora }.
  trazabilidad?: {
    lectura?: { usuario: string; fecha: string; hora: string }
    muestra?: { usuario: string; fecha: string; hora: string }
    recepcion?: { usuario: string; fecha: string; hora: string }
  } | null
}

export interface Pcr {
  id: string
  codigo: string // PCR-PEZ001-001
  idVial: string
  genObjetivo: string
  fecha: string
  resultado: 'positivo' | 'negativo'
  tamanoBandaPb?: number
}

export type EstadoPozo = 'pendiente' | 'positivo' | 'negativo' | 'no_claro' | 'no_revisado'

export interface CarrilGel {
  numero: number
  idPcr?: string
  tipo: 'muestra' | 'marcador' | 'control' | 'blanco' | 'positivo'
  codigoVisible: string
  banda: boolean
  estado?: EstadoPozo
  tamanoPb?: number
}

export interface Gel {
  id: string
  codigo: string // GEL-2026-05-26-01
  fecha: string
  agarosaPct: number
  voltaje: number
  marcador: string
  imagenUrl?: string
  carriles: CarrilGel[]
}

export interface Etiqueta {
  codigo: string
  tipo: string
  titulo: string
  sub: string
}

// Control positivo guardado en la "caja de positivos" del laboratorio.
export interface ControlPositivo {
  id: string
  codigo: string // CPOS-001
  idVial?: string | null
  etiqueta: string // lo que dice el tubo físico
  organismo: string
  descripcion: string
  concentracionNgUl: number | null
  ubicacion: string
  estado: 'disponible' | 'agotado'
  vecesUsado: number
  fechaAgregado: string
  fechaAgotado: string | null
  observaciones: string
}

// Tubo de una corrida de PCR (muestra / blanco / control positivo).
export interface TuboCorrida {
  id: string
  numero: number
  tipo: 'muestra' | 'blanco' | 'positivo'
  frasco: string
  lote: string
  resultado: 'pendiente' | 'positivo' | 'negativo' | 'no_claro' | 'no_revisado'
  tamanoPb?: number | null
}

// Corrida de PCR: memoria de qué muestras / lotes ya se amplificaron.
export interface CorridaPcr {
  id: string
  codigo: string // CORR-20260611-01
  fecha: string
  responsable: string
  nMuestras: number
  nReacciones: number
  volFinal: number | null
  lotes: string
  estado: 'preparada' | 'corrida' | 'leida'
  controlPositivo?: string | null
  tubos: TuboCorrida[]
}

// Fila del reporte tipo "Resumen" del Excel de Pamela (reconstruida desde la BD).
export interface ReporteRow {
  lote: string
  frasco: string | null
  muestra: string
  numeroPez: number
  organo: string
  medio: string
  descripcion: string
  r280: number | null
  r230: number | null
  ngul: number | null
  muestreo: string
}
