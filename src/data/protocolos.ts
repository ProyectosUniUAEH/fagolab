/* Catálogo de protocolos del laboratorio.
 * Los PDF viven en public/protocolos/<slug>.pdf
 * `adaptado: true` marca los protocolos adaptados por la Dra. Nydia.
 * Usado por ProtocolosView (lista) y ProtocoloDetalleView (visor). */

export interface Protocolo {
  slug: string
  titulo: string
  categoria: string
  resumen: string
  adaptado?: boolean
}

export type Estado = 'Validado' | 'Activo' | 'En revisión' | 'Pendiente'

export interface Categoria {
  nombre: string
  slug: string
  icon: string
  acc: number // índice de acento pastel (0..4)
  estado: Estado
  descripcion: string // "para qué sirve" esta categoría
  img?: string // portada en /protocolos/portadas/
}

export const categorias: Categoria[] = [
  {
    nombre: 'Siembra y cultivo',
    slug: 'siembra-y-cultivo',
    icon: 'dish',
    acc: 0,
    estado: 'Validado',
    descripcion: 'Cómo preparar los medios y sembrar las bacterias para obtener colonias separadas y puras, punto de partida de todo el análisis.',
    img: '/protocolos/portadas/siembra-y-cultivo.png',
  },
  {
    nombre: 'Extracción y purificación de ADN',
    slug: 'extraccion-y-purificacion-de-adn',
    icon: 'droplet',
    acc: 3,
    estado: 'Validado',
    descripcion: 'Métodos para liberar el ADN bacteriano y limpiarlo de impurezas, dejándolo listo para amplificar por PCR.',
    img: '/protocolos/portadas/extraccion-y-purificacion-de-adn.png',
  },
  {
    nombre: 'PCR y electroforesis',
    slug: 'pcr-y-electroforesis',
    icon: 'dna',
    acc: 2,
    estado: 'Activo',
    descripcion: 'Amplificación de genes marcadores (como el 16S) y su visualización en gel para confirmar la identidad bacteriana.',
    img: '/protocolos/portadas/pcr-y-electroforesis.png',
  },
  {
    nombre: 'Conservación',
    slug: 'conservacion',
    icon: 'flask',
    acc: 1,
    estado: 'En revisión',
    descripcion: 'Resguardo de las cepas bacterianas para mantenerlas viables a largo plazo y poder recuperarlas cuando se necesiten.',
    img: '/protocolos/portadas/conservacion.png',
  },
  {
    nombre: 'Diagnóstico',
    slug: 'diagnostico',
    icon: 'microscope',
    acc: 4,
    estado: 'Pendiente',
    descripcion: 'Análisis complementarios sobre las muestras para detectar agentes de interés, como parásitos.',
    img: '/protocolos/portadas/diagnostico.png',
  },
  {
    nombre: 'Equipo y seguridad',
    slug: 'equipo-y-seguridad',
    icon: 'shield',
    acc: 0,
    estado: 'Activo',
    descripcion: 'Operación correcta y segura del equipo del laboratorio, como el autoclave para esterilización.',
    img: '/protocolos/portadas/equipo-y-seguridad.png',
  },
]

export const protocolos: Protocolo[] = [
  {
    slug: 'preparacion-de-medios-de-cultivo',
    titulo: 'Preparación de medios de cultivo',
    categoria: 'Siembra y cultivo',
    resumen: 'Pesado, hidratación, esterilización y vaciado de medios en cajas Petri.',
  },
  {
    slug: 'siembra-en-estrias',
    titulo: 'Siembra en estrías',
    categoria: 'Siembra y cultivo',
    resumen: 'Técnica de estriado para obtener colonias separadas.',
  },
  {
    slug: 'siembra-por-agotamiento-en-estrias',
    titulo: 'Siembra por agotamiento en estrías',
    categoria: 'Siembra y cultivo',
    resumen: 'Agotamiento del inóculo en cuadrantes para aislar colonias puras.',
  },
  {
    slug: 'siembra-en-picadura-o-puncion',
    titulo: 'Siembra en picadura o punción',
    categoria: 'Siembra y cultivo',
    resumen: 'Inoculación por punción en medios semisólidos.',
  },
  {
    slug: 'extraccion-de-adn-por-choque-termico',
    titulo: 'Extracción de ADN por choque térmico',
    categoria: 'Extracción y purificación de ADN',
    resumen: 'Lisis bacteriana por calor para liberar ADN sin kit.',
  },
  {
    slug: 'extraccion-por-kit-de-sangre',
    titulo: 'Extracción por kit de sangre',
    categoria: 'Extracción y purificación de ADN',
    resumen: 'Extracción de ADN con kit comercial a partir de muestra.',
  },
  {
    slug: 'kit-de-purificacion-a-partir-de-gel',
    titulo: 'Kit de purificación a partir de gel',
    categoria: 'Extracción y purificación de ADN',
    resumen: 'Recuperación y purificación de ADN desde una banda de gel.',
  },
  {
    slug: 'kit-de-purificacion-a-partir-de-reaccion',
    titulo: 'Kit de purificación a partir de reacción',
    categoria: 'Extracción y purificación de ADN',
    resumen: 'Limpieza de producto de PCR directamente de la reacción.',
  },
  {
    slug: 'solucion-fenol-azucarada',
    titulo: 'Solución fenol azucarada',
    categoria: 'Extracción y purificación de ADN',
    resumen: 'Preparación del reactivo para extracción de ácidos nucleicos.',
  },
  {
    slug: 'pcr-16s',
    titulo: 'PCR 16S',
    categoria: 'PCR y electroforesis',
    resumen: 'Amplificación del gen ribosomal 16S para identificación bacteriana.',
  },
  {
    slug: 'preparacion-de-gel-agarosa',
    titulo: 'Preparación de gel de agarosa',
    categoria: 'PCR y electroforesis',
    resumen: 'Preparación del gel para correr la electroforesis.',
  },
  {
    slug: 'preparacion-de-tbe-al-10',
    titulo: 'Preparación de TBE al 10%',
    categoria: 'PCR y electroforesis',
    resumen: 'Buffer TBE concentrado para electroforesis en gel.',
  },
  {
    slug: 'caldo-de-crioconservacion',
    titulo: 'Caldo de crioconservación',
    categoria: 'Conservación',
    resumen: 'Medio con crioprotector para resguardar cepas a largo plazo.',
  },
  {
    slug: 'coproparasitologico',
    titulo: 'Coproparasitológico',
    categoria: 'Diagnóstico',
    resumen: 'Análisis de muestra para detección de parásitos.',
  },
  {
    slug: 'uso-de-autoclave',
    titulo: 'Uso de autoclave',
    categoria: 'Equipo y seguridad',
    resumen: 'Operación segura del autoclave para esterilización.',
  },
]
