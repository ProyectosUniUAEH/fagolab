// Catálogos del laboratorio. Los órganos y medios viven en la BD (tablas `organos` y
// `medios_cultivo`) y el store los carga al iniciar con `setOrganos` / `setMedios`.
// Las listas de abajo son la semilla: lo que se ve mientras carga la API, y el respaldo
// si no hay backend. Son reactivas, así que las vistas que las importan se actualizan solas.

import { reactive } from 'vue'

export interface OrganoCat {
  codigo: string // código del Excel (Br, In, Hg...)
  nombre: string
}

// Códigos de órgano observados en el Excel de muestreo de Pamela.
export const ORGANOS: OrganoCat[] = reactive([
  { codigo: 'Hg', nombre: 'Hígado' },
  { codigo: 'Rñ', nombre: 'Riñón' },
  { codigo: 'Br', nombre: 'Branquia' },
  { codigo: 'In', nombre: 'Intestino' },
  { codigo: 'Cr', nombre: 'Corazón' },
  { codigo: 'Bz', nombre: 'Bazo' },
  { codigo: 'Ms', nombre: 'Músculo' },
  { codigo: 'Ln', nombre: 'Linfonodo' },
  { codigo: 'Ls', nombre: 'Lesión externa' },
])

export interface MedioCat {
  nombre: string
  completo: string
  tipo: 'nutritivo' | 'selectivo' | 'enriquecido'
  color: string
}

// Medios registrados en el Excel (TSA, TCBS, Sangre, ADA, SyM, Mac C.)
export const MEDIOS: MedioCat[] = reactive([
  { nombre: 'TSA', completo: 'Tryptic Soy Agar', tipo: 'nutritivo', color: '#0d9488' },
  { nombre: 'TCBS', completo: 'Thiosulfate Citrate Bile Salts Sucrose', tipo: 'selectivo', color: '#2f6fed' },
  { nombre: 'Sangre', completo: 'Agar Sangre', tipo: 'enriquecido', color: '#e2574c' },
  { nombre: 'ADA', completo: 'Agar Dextrosa Almidón', tipo: 'nutritivo', color: '#e0922f' },
  { nombre: 'SyM', completo: 'Sal y Manitol', tipo: 'selectivo', color: '#7c5cdb' },
  { nombre: 'Mac C.', completo: 'MacConkey', tipo: 'selectivo', color: '#d4429a' },
])

// Reemplazan el contenido en sitio para que las referencias importadas sigan siendo válidas.
export function setOrganos(lista: OrganoCat[]) {
  if (lista.length) ORGANOS.splice(0, ORGANOS.length, ...lista)
}

export function setMedios(lista: MedioCat[]) {
  if (lista.length) MEDIOS.splice(0, MEDIOS.length, ...lista)
}

export const ESPECIES = [
  { codigo: 'TIL', nombre: 'Tilapia', cientifico: 'Oreochromis niloticus' },
  { codigo: 'TRU', nombre: 'Trucha', cientifico: 'Oncorhynchus mykiss' },
  { codigo: 'BAG', nombre: 'Bagre', cientifico: 'Ictalurus punctatus' },
]

export const COLORES_COLONIA = ['blanca', 'amarilla', 'crema', 'beige', 'lila', 'marrón', 'iridiscente']
export const FORMAS_COLONIA = ['circular', 'redonda', 'irregular', 'puntiforme', 'filamentosa']
export const TEXTURAS_COLONIA = ['cremosa', 'iridiscente', 'aterciopelada', 'rasposa', 'aguada', 'gruesa', 'opaca']
export const BORDES_COLONIA = ['entero', 'ondulado', 'lobulado', 'filamentoso']
export const ELEVACIONES_COLONIA = ['convexa', 'plana', 'umbonada', 'pulvinada']

export const organoNombre = (cod: string) => ORGANOS.find((o) => o.codigo === cod)?.nombre ?? cod
export const medioColor = (nombre: string) => MEDIOS.find((m) => m.nombre === nombre)?.color ?? '#6b7d92'
