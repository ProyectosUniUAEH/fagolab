<script setup lang="ts">
// Cladograma rectangular dibujado en SVG a mano: sin librerías, sin dependencias.
//
// El árbol llega como nodos anidados. Se recorre una vez para asignar a cada hoja su
// fila (orden vertical) y a cada nodo interno la media de sus hijos, que es lo que hace
// que las bifurcaciones queden centradas. La profundidad horizontal es la distancia
// acumulada desde la raíz, así que ramas largas = más divergencia.
import { computed } from 'vue'
import type { NodoArbol } from '../data/types'

const props = defineProps<{ arbol: NodoArbol; consulta: string }>()

const PASO_FILA = 30
const MARGEN_X = 14
const MARGEN_Y = 20
const ANCHO_ETIQUETA = 250

interface Trazo {
  nombre: string
  hoja: boolean
  x: number
  y: number
  padre: number // índice del padre en la lista; -1 en la raíz
  esConsulta: boolean
}

const layout = computed(() => {
  const trazos: Trazo[] = []
  let fila = 0
  let profundidadMax = 0

  // Una sola pasada recursiva. El índice del padre se guarda explícitamente en vez de
  // deducirlo comparando coordenadas: con distancias flotantes muy parecidas, comparar
  // posiciones emparejaba nodos equivocados.
  function recorrer(nodo: NodoArbol, profundidad: number, padre: number): number {
    const x = profundidad + (nodo.rama ?? 0)
    profundidadMax = Math.max(profundidadMax, x)

    const indice = trazos.length
    trazos.push({
      nombre: nodo.nombre,
      hoja: !!nodo.hoja,
      x,
      y: 0,
      padre,
      esConsulta: nodo.nombre === props.consulta,
    })

    if (nodo.hoja) {
      trazos[indice].y = fila++
      return indice
    }

    // Los hijos ocupan filas primero; el nodo interno se centra entre el primero y el último.
    const hijos = nodo.hijos.map((h) => recorrer(h, x, indice))
    const filasHijos = hijos.map((i) => trazos[i].y)
    trazos[indice].y = (Math.min(...filasHijos) + Math.max(...filasHijos)) / 2
    return indice
  }

  recorrer(props.arbol, 0, -1)

  // Las distancias son pequeñas (0.001–0.05); se escalan al ancho disponible.
  const anchoUtil = 300
  const escala = profundidadMax > 0 ? anchoUtil / profundidadMax : 1
  const alto = fila * PASO_FILA + MARGEN_Y * 2

  const px = (t: Trazo) => MARGEN_X + t.x * escala
  const py = (t: Trazo) => MARGEN_Y + t.y * PASO_FILA + PASO_FILA / 2

  return {
    trazos: trazos.map((t) => {
      const padre = t.padre >= 0 ? trazos[t.padre] : t
      return {
        ...t,
        px: px(t),
        py: py(t),
        pxPadre: t.padre >= 0 ? px(padre) : px(t),
        pyPadre: t.padre >= 0 ? py(padre) : py(t),
      }
    }),
    ancho: MARGEN_X + anchoUtil + ANCHO_ETIQUETA,
    alto,
  }
})
</script>

<template>
  <div class="arbol-caja">
    <svg
      :viewBox="`0 0 ${layout.ancho} ${layout.alto}`"
      :style="{ maxWidth: `${layout.ancho}px` }"
      role="img"
      :aria-label="`Árbol filogenético orientativo de ${consulta} frente a sus secuencias de referencia`"
    >
      <!-- Conectores en escuadra: vertical desde el padre, horizontal hasta el nodo -->
      <g fill="none" stroke-width="1.5">
        <template v-for="(t, i) in layout.trazos" :key="`c${i}`">
          <path
            :d="`M ${t.pxPadre} ${t.pyPadre} L ${t.pxPadre} ${t.py} L ${t.px} ${t.py}`"
            :stroke="t.esConsulta ? 'var(--teal)' : 'var(--line)'"
            :stroke-width="t.esConsulta ? 2.2 : 1.5"
          />
        </template>
      </g>

      <template v-for="(t, i) in layout.trazos" :key="`n${i}`">
        <circle
          v-if="t.hoja"
          :cx="t.px"
          :cy="t.py"
          :r="t.esConsulta ? 5 : 3.5"
          :fill="t.esConsulta ? 'var(--teal)' : 'var(--muted)'"
        />
        <text
          v-if="t.hoja"
          :x="t.px + 10"
          :y="t.py + 4"
          :class="{ consulta: t.esConsulta }"
        >{{ t.nombre }}</text>
      </template>
    </svg>
  </div>
</template>

<style scoped>
.arbol-caja { overflow-x: auto; padding: 4px 0; }
svg { display: block; width: 100%; height: auto; }
text { font-size: 12px; fill: var(--ink-soft); font-family: var(--font-body); }
text.consulta { fill: var(--teal-600); font-weight: 700; }
</style>
