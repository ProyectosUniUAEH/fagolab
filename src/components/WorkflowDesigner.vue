<script setup lang="ts">
/**
 * Diseñador visual de flujos, al estilo del editor de Jira.
 *
 * Los estados son nodos que se arrastran por el lienzo y las transiciones son flechas
 * entre ellos. Se crea una transición arrastrando desde el conector de un nodo hasta
 * otro, y al seleccionar una flecha se editan sus condiciones, validaciones y
 * post-funciones — las mismas reglas que evalúa el motor al mover una actividad.
 */
import { computed, ref, watch } from 'vue'
import Icon from './Icon.vue'
import type { Estado, TipoRegla } from '../stores/tareas'

const props = defineProps<{
  flujoId: string
  estados: Estado[]
  transiciones: any[]
  reglas: any[]
  tiposRegla: TipoRegla[]
  editable: boolean
}>()

const emit = defineEmits<{
  (e: 'guardar-estados', estados: any[]): void
  (e: 'guardar-transiciones', transiciones: any[]): void
  (e: 'crear-regla', payload: Record<string, unknown>): void
  (e: 'editar-regla', id: string, payload: Record<string, unknown>): void
  (e: 'eliminar-regla', id: string): void
  (e: 'aviso', texto: string): void
}>()

const ANCHO_NODO = 168
const ALTO_NODO = 58
const LIENZO = { ancho: 1600, alto: 720 }

const COLOR_CATEGORIA: Record<string, string> = {
  por_hacer: '#5b6b7a',
  en_progreso: '#2f7fd4',
  hecho: '#1f8f7a',
}
const ETIQUETA_CATEGORIA: Record<string, string> = {
  por_hacer: 'Por hacer',
  en_progreso: 'En progreso',
  hecho: 'Hecho',
}
const ETIQUETA_FASE: Record<string, string> = {
  condicion: 'Condición',
  validador: 'Validación',
  post_funcion: 'Post-función',
}

/** Posiciones locales: se editan al arrastrar y se persisten al soltar. */
const posiciones = ref<Record<string, { x: number; y: number }>>({})
const seleccion = ref<{ tipo: 'estado' | 'transicion'; id: string } | null>(null)
const arrastre = ref<{ id: string; dx: number; dy: number } | null>(null)
const conectando = ref<{ desde: string; x: number; y: number } | null>(null)
const lienzo = ref<SVGSVGElement | null>(null)

const estadosDelFlujo = computed(() => props.estados.filter((e) => e.idFlujo === props.flujoId))
const transicionesDelFlujo = computed(() => props.transiciones.filter((t) => t.idFlujo === props.flujoId))

watch(
  () => [props.flujoId, estadosDelFlujo.value.map((e) => e.id).join(',')].join('|'),
  () => {
    const mapa: Record<string, { x: number; y: number }> = {}
    estadosDelFlujo.value.forEach((estado, indice) => {
      mapa[estado.id] = {
        x: Number(estado.posX ?? 60 + indice * 230),
        y: Number(estado.posY ?? 120 + (indice % 2) * 130),
      }
    })
    posiciones.value = mapa
    seleccion.value = null
  },
  { immediate: true },
)

const pos = (id: string) => posiciones.value[id] ?? { x: 0, y: 0 }
const centro = (id: string) => ({ x: pos(id).x + ANCHO_NODO / 2, y: pos(id).y + ALTO_NODO / 2 })

/** Punto donde la flecha toca el borde del nodo, para que no quede tapada por él. */
function borde(desde: { x: number; y: number }, hacia: { x: number; y: number }) {
  const dx = hacia.x - desde.x
  const dy = hacia.y - desde.y
  if (!dx && !dy) return desde
  const escalaX = dx ? (ANCHO_NODO / 2 + 6) / Math.abs(dx) : Infinity
  const escalaY = dy ? (ALTO_NODO / 2 + 6) / Math.abs(dy) : Infinity
  const escala = Math.min(escalaX, escalaY)
  return { x: desde.x + dx * escala, y: desde.y + dy * escala }
}

interface Arista { id: string; d: string; etiqueta: string; lx: number; ly: number; global: boolean; reglas: number }

const aristas = computed<Arista[]>(() => {
  const pares = new Map<string, number>()
  return transicionesDelFlujo.value.map((tr) => {
    const destino = centro(tr.idEstadoDestino)
    const esGlobal = !tr.idEstadoOrigen
    const origen = esGlobal
      ? { x: destino.x, y: Math.max(28, destino.y - 150) }
      : centro(tr.idEstadoOrigen)

    // Dos transiciones entre el mismo par se separan para que ambas se lean.
    const clavePar = [tr.idEstadoOrigen || 'any', tr.idEstadoDestino].sort().join(':')
    const repetidas = pares.get(clavePar) ?? 0
    pares.set(clavePar, repetidas + 1)
    const curva = 26 + repetidas * 34

    const a = esGlobal ? origen : borde(origen, destino)
    const b = borde(destino, origen)
    const mx = (a.x + b.x) / 2
    const my = (a.y + b.y) / 2
    const nx = -(b.y - a.y)
    const ny = b.x - a.x
    const largo = Math.hypot(nx, ny) || 1
    const cx = mx + (nx / largo) * curva
    const cy = my + (ny / largo) * curva

    return {
      id: tr.id,
      d: `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`,
      etiqueta: tr.nombre,
      lx: (mx + cx) / 2,
      ly: (my + cy) / 2,
      global: esGlobal,
      reglas: props.reglas.filter((r) => r.idTransicion === tr.id).length,
    }
  })
})

const transicionSeleccionada = computed(() =>
  seleccion.value?.tipo === 'transicion'
    ? transicionesDelFlujo.value.find((t) => t.id === seleccion.value!.id) ?? null
    : null,
)
const estadoSeleccionado = computed(() =>
  seleccion.value?.tipo === 'estado'
    ? estadosDelFlujo.value.find((e) => e.id === seleccion.value!.id) ?? null
    : null,
)
const reglasDeSeleccion = computed(() =>
  transicionSeleccionada.value
    ? props.reglas
        .filter((r) => r.idTransicion === transicionSeleccionada.value!.id)
        .sort((a, b) => a.fase.localeCompare(b.fase) || a.orden - b.orden)
    : [],
)

function puntoLienzo(event: PointerEvent) {
  const caja = lienzo.value?.getBoundingClientRect()
  if (!caja) return { x: 0, y: 0 }
  const escala = LIENZO.ancho / caja.width
  return { x: (event.clientX - caja.left) * escala, y: (event.clientY - caja.top) * escala }
}

function iniciarArrastre(estado: Estado, event: PointerEvent) {
  if (!props.editable) return
  seleccion.value = { tipo: 'estado', id: estado.id }
  const punto = puntoLienzo(event)
  arrastre.value = { id: estado.id, dx: punto.x - pos(estado.id).x, dy: punto.y - pos(estado.id).y }
  ;(event.target as Element).setPointerCapture?.(event.pointerId)
}

function iniciarConexion(estado: Estado, event: PointerEvent) {
  if (!props.editable) return
  event.stopPropagation()
  const punto = puntoLienzo(event)
  conectando.value = { desde: estado.id, x: punto.x, y: punto.y }
  ;(event.target as Element).setPointerCapture?.(event.pointerId)
}

function moverPuntero(event: PointerEvent) {
  const punto = puntoLienzo(event)
  if (arrastre.value) {
    posiciones.value[arrastre.value.id] = {
      x: Math.max(8, Math.min(LIENZO.ancho - ANCHO_NODO - 8, punto.x - arrastre.value.dx)),
      y: Math.max(8, Math.min(LIENZO.alto - ALTO_NODO - 8, punto.y - arrastre.value.dy)),
    }
  } else if (conectando.value) {
    conectando.value = { ...conectando.value, x: punto.x, y: punto.y }
  }
}

function nodoEn(punto: { x: number; y: number }) {
  return estadosDelFlujo.value.find((estado) => {
    const p = pos(estado.id)
    return punto.x >= p.x && punto.x <= p.x + ANCHO_NODO && punto.y >= p.y && punto.y <= p.y + ALTO_NODO
  })
}

function soltarPuntero(event: PointerEvent) {
  if (arrastre.value) {
    guardarPosiciones()
    arrastre.value = null
    return
  }
  if (!conectando.value) return
  const destino = nodoEn(puntoLienzo(event))
  const desde = conectando.value.desde
  conectando.value = null
  if (!destino || destino.id === desde) return
  crearTransicion(desde, destino.id)
}

function guardarPosiciones() {
  emit(
    'guardar-estados',
    estadosDelFlujo.value.map((estado) => ({
      id: estado.id, clave: estado.clave, nombre: estado.nombre, categoria: estado.categoria,
      color: estado.color, orden: estado.orden, esInicial: estado.esInicial,
      posX: Math.round(pos(estado.id).x), posY: Math.round(pos(estado.id).y),
    })),
  )
}

function claveDesde(texto: string) {
  // NFD separa la tilde de la letra y el filtro a-z0-9 la descarta, así "Enviar a revisión"
  // se convierte en "enviar_a_revision" sin depender de literales acentuados en el código.
  return texto.trim().toLowerCase().normalize('NFD')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function crearTransicion(idOrigen: string, idDestino: string) {
  const nombre = window.prompt('Nombre de la transición (lo verá el equipo en el botón):')
  if (!nombre?.trim()) return
  const clave = claveDesde(nombre)
  if (transicionesDelFlujo.value.some((t) => t.clave === clave)) {
    emit('aviso', `Ya existe una transición con la clave «${clave}».`)
    return
  }
  emit('guardar-transiciones', [
    ...transicionesDelFlujo.value.map((t) => ({
      id: t.id, clave: t.clave, nombre: t.nombre, idEstadoOrigen: t.idEstadoOrigen,
      idEstadoDestino: t.idEstadoDestino, orden: t.orden, activo: t.activo,
    })),
    { clave, nombre: nombre.trim(), idEstadoOrigen: idOrigen, idEstadoDestino: idDestino, orden: transicionesDelFlujo.value.length },
  ])
}

function eliminarTransicion(id: string) {
  if (!window.confirm('¿Eliminar esta transición y sus reglas?')) return
  emit(
    'guardar-transiciones',
    transicionesDelFlujo.value.filter((t) => t.id !== id).map((t) => ({
      id: t.id, clave: t.clave, nombre: t.nombre, idEstadoOrigen: t.idEstadoOrigen,
      idEstadoDestino: t.idEstadoDestino, orden: t.orden, activo: t.activo,
    })),
  )
  seleccion.value = null
}

function agregarEstado() {
  const nombre = window.prompt('Nombre del nuevo estado:')
  if (!nombre?.trim()) return
  const clave = claveDesde(nombre)
  if (estadosDelFlujo.value.some((e) => e.clave === clave)) {
    emit('aviso', `Ya existe un estado con la clave «${clave}».`)
    return
  }
  emit('guardar-estados', [
    ...estadosDelFlujo.value.map((estado) => ({
      id: estado.id, clave: estado.clave, nombre: estado.nombre, categoria: estado.categoria,
      color: estado.color, orden: estado.orden, esInicial: estado.esInicial,
      posX: Math.round(pos(estado.id).x), posY: Math.round(pos(estado.id).y),
    })),
    {
      clave, nombre: nombre.trim(), categoria: 'por_hacer', orden: estadosDelFlujo.value.length,
      esInicial: !estadosDelFlujo.value.length, posX: 60 + estadosDelFlujo.value.length * 60, posY: 320,
    },
  ])
}

function cambiarCategoria(estado: Estado, categoria: string) {
  emit(
    'guardar-estados',
    estadosDelFlujo.value.map((item) => ({
      id: item.id, clave: item.clave, nombre: item.nombre,
      categoria: item.id === estado.id ? categoria : item.categoria,
      color: item.color, orden: item.orden,
      esInicial: item.esInicial, posX: Math.round(pos(item.id).x), posY: Math.round(pos(item.id).y),
    })),
  )
}

function marcarInicial(estado: Estado) {
  emit(
    'guardar-estados',
    estadosDelFlujo.value.map((item) => ({
      id: item.id, clave: item.clave, nombre: item.nombre, categoria: item.categoria,
      color: item.color, orden: item.orden, esInicial: item.id === estado.id,
      posX: Math.round(pos(item.id).x), posY: Math.round(pos(item.id).y),
    })),
  )
}

// --- Editor de reglas de la transición seleccionada ---
const nuevaRegla = ref({ fase: 'condicion', tipo: '', configuracion: {} as Record<string, any>, mensajeError: '' })
const tiposDeFase = computed(() => props.tiposRegla.filter((t) => t.fase === nuevaRegla.value.fase))
const definicionNueva = computed(() => props.tiposRegla.find((t) => t.tipo === nuevaRegla.value.tipo) ?? null)
const camposNueva = computed(() => Object.entries(definicionNueva.value?.esquema?.properties ?? {}))

watch(() => nuevaRegla.value.fase, () => { nuevaRegla.value.tipo = ''; nuevaRegla.value.configuracion = {} })
watch(() => nuevaRegla.value.tipo, () => { nuevaRegla.value.configuracion = {} })

function agregarRegla() {
  if (!transicionSeleccionada.value || !nuevaRegla.value.tipo) return
  emit('crear-regla', {
    idTransicion: transicionSeleccionada.value.id,
    fase: nuevaRegla.value.fase,
    tipo: nuevaRegla.value.tipo,
    configuracion: nuevaRegla.value.configuracion,
    mensajeError: nuevaRegla.value.mensajeError || undefined,
    orden: reglasDeSeleccion.value.length,
  })
  nuevaRegla.value = { fase: nuevaRegla.value.fase, tipo: '', configuracion: {}, mensajeError: '' }
}

const nombreRegla = (tipo: string) => props.tiposRegla.find((t) => t.tipo === tipo)?.nombre ?? tipo
const resumenConfig = (config: Record<string, any>) =>
  Object.entries(config || {}).map(([k, v]) => `${k}: ${v}`).join(' · ')
</script>

<template>
<div class="designer">
  <div class="canvas-wrap">
    <header class="canvas-bar">
      <span class="hint">
        <Icon name="flow" :size="14" />
        {{ editable ? 'Arrastra los estados para ordenarlos y tira del conector para crear una transición.' : 'Vista de solo lectura del flujo.' }}
      </span>
      <button v-if="editable" class="mini" @click="agregarEstado"><Icon name="plus" :size="13" /> Estado</button>
    </header>

    <svg
      ref="lienzo"
      class="canvas"
      :viewBox="`0 0 ${LIENZO.ancho} ${LIENZO.alto}`"
      @pointermove="moverPuntero"
      @pointerup="soltarPuntero"
      @pointerleave="soltarPuntero"
      @click="seleccion = null"
    >
      <defs>
        <marker id="flecha" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--muted)" />
        </marker>
        <marker id="flecha-activa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--teal)" />
        </marker>
        <pattern id="rejilla" width="40" height="40" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="rgba(120,140,160,.22)" />
        </pattern>
      </defs>

      <rect :width="LIENZO.ancho" :height="LIENZO.alto" fill="url(#rejilla)" />

      <!-- Transiciones -->
      <g v-for="arista in aristas" :key="arista.id" class="edge" :class="{ activa: seleccion?.id === arista.id }">
        <path :d="arista.d" class="edge-hit" @click.stop="seleccion = { tipo: 'transicion', id: arista.id }" />
        <path
          :d="arista.d"
          class="edge-line"
          :class="{ global: arista.global }"
          :marker-end="seleccion?.id === arista.id ? 'url(#flecha-activa)' : 'url(#flecha)'"
        />
        <g class="edge-label" @click.stop="seleccion = { tipo: 'transicion', id: arista.id }">
          <rect :x="arista.lx - arista.etiqueta.length * 3.6 - 16" :y="arista.ly - 12" :width="arista.etiqueta.length * 7.2 + 32" height="24" rx="12" />
          <text :x="arista.lx" :y="arista.ly + 4" text-anchor="middle">{{ arista.etiqueta }}</text>
          <circle v-if="arista.reglas" :cx="arista.lx + arista.etiqueta.length * 3.6 + 10" :cy="arista.ly - 9" r="8" class="edge-badge" />
          <text v-if="arista.reglas" :x="arista.lx + arista.etiqueta.length * 3.6 + 10" :y="arista.ly - 6" text-anchor="middle" class="edge-badge-text">{{ arista.reglas }}</text>
        </g>
      </g>

      <!-- Conexión en curso -->
      <path
        v-if="conectando"
        class="edge-line dragging"
        :d="`M ${centro(conectando.desde).x} ${centro(conectando.desde).y} L ${conectando.x} ${conectando.y}`"
        marker-end="url(#flecha-activa)"
      />

      <!-- Estados -->
      <g
        v-for="estado in estadosDelFlujo"
        :key="estado.id"
        class="node"
        :class="{ activo: seleccion?.id === estado.id, movible: editable }"
        :transform="`translate(${pos(estado.id).x},${pos(estado.id).y})`"
        @pointerdown="iniciarArrastre(estado, $event)"
        @click.stop="seleccion = { tipo: 'estado', id: estado.id }"
      >
        <rect :width="ANCHO_NODO" :height="ALTO_NODO" rx="14" class="node-box" />
        <rect :width="6" :height="ALTO_NODO" rx="3" :fill="COLOR_CATEGORIA[estado.categoria]" />
        <text x="18" y="24" class="node-title">{{ estado.nombre }}</text>
        <text x="18" y="42" class="node-meta">{{ ETIQUETA_CATEGORIA[estado.categoria] }}</text>
        <g v-if="estado.esInicial" :transform="`translate(${ANCHO_NODO - 30},14)`">
          <circle r="9" cx="9" cy="9" class="node-start" />
          <text x="9" y="13" text-anchor="middle" class="node-start-text">▶</text>
        </g>
        <circle
          v-if="editable"
          :cx="ANCHO_NODO"
          :cy="ALTO_NODO / 2"
          r="8"
          class="node-handle"
          @pointerdown.stop="iniciarConexion(estado, $event)"
        />
      </g>
    </svg>
  </div>

  <!-- Panel lateral -->
  <aside class="inspector">
    <template v-if="transicionSeleccionada">
      <header class="inspector-head">
        <div>
          <span class="kicker">Transición</span>
          <h4>{{ transicionSeleccionada.nombre }}</h4>
          <p>
            {{ estadosDelFlujo.find((e) => e.id === transicionSeleccionada!.idEstadoOrigen)?.nombre || 'Cualquier estado' }}
            →
            {{ estadosDelFlujo.find((e) => e.id === transicionSeleccionada!.idEstadoDestino)?.nombre }}
          </p>
        </div>
        <button v-if="editable" class="mini danger" @click="eliminarTransicion(transicionSeleccionada.id)"><Icon name="close" :size="13" /></button>
      </header>

      <p class="inspector-note">
        La <b>condición</b> decide si la transición se ofrece. La <b>validación</b> se comprueba al
        ejecutarla y la bloquea con su mensaje. La <b>post-función</b> actúa después.
      </p>

      <div v-for="fase in ['condicion', 'validador', 'post_funcion']" :key="fase" class="rule-group">
        <h5>{{ ETIQUETA_FASE[fase] }}</h5>
        <div v-for="regla in reglasDeSeleccion.filter((r) => r.fase === fase)" :key="regla.id" class="rule">
          <div>
            <b>{{ nombreRegla(regla.tipo) }}</b>
            <small v-if="resumenConfig(regla.configuracion)">{{ resumenConfig(regla.configuracion) }}</small>
            <small v-if="regla.mensajeError" class="rule-msg">“{{ regla.mensajeError }}”</small>
          </div>
          <button v-if="editable" class="mini danger" @click="emit('eliminar-regla', regla.id)"><Icon name="close" :size="12" /></button>
        </div>
        <p v-if="!reglasDeSeleccion.filter((r) => r.fase === fase).length" class="rule-empty">Sin reglas.</p>
      </div>

      <form v-if="editable" class="rule-form" @submit.prevent="agregarRegla">
        <h5>Añadir regla</h5>
        <select v-model="nuevaRegla.fase">
          <option value="condicion">Condición</option>
          <option value="validador">Validación</option>
          <option value="post_funcion">Post-función</option>
        </select>
        <select v-model="nuevaRegla.tipo" required>
          <option value="" disabled>Elige el tipo…</option>
          <option v-for="t in tiposDeFase" :key="t.tipo" :value="t.tipo">{{ t.nombre }}</option>
        </select>
        <p v-if="definicionNueva" class="rule-help">{{ definicionNueva.descripcion }}</p>
        <label v-for="[clave, esquema] in camposNueva" :key="clave" class="rule-field">
          <span>{{ esquema.title || clave }}<i v-if="definicionNueva?.esquema?.required?.includes(clave)">*</i></span>
          <select v-if="esquema.enum" v-model="nuevaRegla.configuracion[clave]">
            <option value="" disabled>Elige…</option>
            <option v-for="opcion in esquema.enum" :key="opcion" :value="opcion">{{ opcion }}</option>
          </select>
          <input v-else v-model="nuevaRegla.configuracion[clave]" :placeholder="clave" />
        </label>
        <input v-model.trim="nuevaRegla.mensajeError" placeholder="Mensaje que verá quien la ejecute" />
        <button class="mini primary" type="submit"><Icon name="plus" :size="13" /> Añadir</button>
      </form>
    </template>

    <template v-else-if="estadoSeleccionado">
      <header class="inspector-head">
        <div>
          <span class="kicker">Estado</span>
          <h4>{{ estadoSeleccionado.nombre }}</h4>
          <p><code>{{ estadoSeleccionado.clave }}</code></p>
        </div>
      </header>
      <label class="rule-field">
        <span>Categoría</span>
        <select :value="estadoSeleccionado.categoria" :disabled="!editable" @change="cambiarCategoria(estadoSeleccionado, ($event.target as HTMLSelectElement).value)">
          <option value="por_hacer">Por hacer</option>
          <option value="en_progreso">En progreso</option>
          <option value="hecho">Hecho</option>
        </select>
      </label>
      <p class="inspector-note">La categoría decide en qué columna del tablero cae y cuándo se marca la actividad como completada.</p>
      <button v-if="editable && !estadoSeleccionado.esInicial" class="mini" @click="marcarInicial(estadoSeleccionado)">
        <Icon name="check" :size="13" /> Marcar como estado inicial
      </button>
      <p v-else-if="estadoSeleccionado.esInicial" class="rule-help">Es el estado con el que nacen las actividades de este flujo.</p>
    </template>

    <div v-else class="inspector-empty">
      <span><Icon name="flow" :size="24" /></span>
      <p>Selecciona un estado o una transición para ver y editar sus reglas.</p>
    </div>
  </aside>
</div>
</template>

<style scoped>
.designer{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:14px;align-items:start}
.canvas-wrap{border:1px solid var(--line);border-radius:14px;background:var(--panel);overflow:hidden}
.canvas-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-bottom:1px solid var(--line)}
.hint{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:.68rem}
.canvas{display:block;width:100%;height:auto;touch-action:none;background:var(--bg)}
.node{cursor:pointer}.node.movible{cursor:grab}
.node-box{fill:var(--panel);stroke:var(--line);stroke-width:1.5}
.node.activo .node-box{stroke:var(--teal);stroke-width:2.5}
.node-title{font-size:13px;font-weight:800;fill:var(--ink)}
.node-meta{font-size:10.5px;fill:var(--muted)}
.node-start{fill:var(--teal-50);stroke:var(--teal)}
.node-start-text{font-size:8px;fill:var(--teal-600)}
.node-handle{fill:var(--panel);stroke:var(--teal);stroke-width:2;cursor:crosshair}
.node-handle:hover{fill:var(--teal-50)}
.edge-line{fill:none;stroke:var(--muted);stroke-width:2}
.edge-line.global{stroke-dasharray:6 5}
.edge-line.dragging{stroke:var(--teal);stroke-dasharray:5 5}
.edge-hit{fill:none;stroke:transparent;stroke-width:18;cursor:pointer}
.edge.activa .edge-line{stroke:var(--teal);stroke-width:3}
.edge-label{cursor:pointer}
.edge-label rect{fill:var(--panel);stroke:var(--line)}
.edge.activa .edge-label rect{stroke:var(--teal)}
.edge-label text{font-size:11px;font-weight:700;fill:var(--ink-soft)}
.edge-badge{fill:var(--amber-50);stroke:#e0a23c}
.edge-badge-text{font-size:9px;font-weight:800;fill:#8a5104}
.inspector{display:grid;align-content:start;gap:12px;padding:14px;border:1px solid var(--line);border-radius:14px;background:var(--panel);max-height:720px;overflow:auto}
.inspector-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
.kicker{color:var(--teal-600);font-size:.6rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
.inspector-head h4{margin-top:3px;font-size:.92rem}
.inspector-head p{margin-top:3px;color:var(--muted);font-size:.68rem}
.inspector-note{padding:9px 10px;border-radius:9px;color:var(--ink-soft);background:var(--line-soft);font-size:.66rem;line-height:1.5}
.rule-group h5{margin-bottom:6px;color:var(--muted);font-size:.63rem;text-transform:uppercase;letter-spacing:.06em}
.rule{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;padding:8px 9px;margin-bottom:5px;border:1px solid var(--line);border-radius:9px}
.rule b{font-size:.72rem}
.rule small{display:block;margin-top:2px;color:var(--muted);font-size:.63rem}
.rule-msg{font-style:italic}
.rule-empty{color:var(--muted);font-size:.65rem}
.rule-form{display:grid;gap:7px;padding-top:11px;border-top:1px solid var(--line)}
.rule-form h5{color:var(--muted);font-size:.63rem;text-transform:uppercase;letter-spacing:.06em}
.rule-form select,.rule-form input,.rule-field select,.rule-field input{padding:8px;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--ink);font-size:.72rem;outline:0}
.rule-help{color:var(--muted);font-size:.65rem;line-height:1.45}
.rule-field{display:grid;gap:4px;font-size:.68rem;font-weight:700}
.rule-field i{color:#c8452f;font-style:normal}
.mini{display:inline-flex;align-items:center;justify-content:center;gap:5px;padding:7px 9px;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--ink-soft);font-size:.68rem;font-weight:800}
.mini:hover{border-color:var(--teal);background:var(--teal-50)}
.mini.primary{color:#fff;background:var(--teal);border-color:var(--teal)}
.mini.danger{color:#a42119;border-color:transparent}
.mini.danger:hover{background:#fff0ee;border-color:#f0c8c2}
.inspector-empty{display:grid;place-items:center;gap:9px;padding:40px 14px;text-align:center}
.inspector-empty span{display:grid;place-items:center;width:48px;height:48px;border-radius:15px;color:var(--teal-600);background:var(--teal-50)}
.inspector-empty p{color:var(--muted);font-size:.7rem;line-height:1.5}
@media(max-width:1000px){.designer{grid-template-columns:1fr}.inspector{max-height:none}}
</style>
