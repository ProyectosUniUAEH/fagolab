<script setup lang="ts">
// Secuenciación: la etapa que continúa después del gel.
//
// El laboratorio llega hoy hasta electroforesis, así que esta vista sostiene tres
// procedencias a la vez y nunca las mezcla: lo experimental, lo descargado de NCBI y
// lo sintético. Cada tarjeta lo dice de frente.
import { computed, onMounted, onUnmounted, ref } from 'vue'

import ArbolFilogenetico from '../components/ArbolFilogenetico.vue'
import Icon from '../components/Icon.vue'
import { useAuthStore } from '../stores/auth'
import { useSecuenciacionStore, type ResultadoCarga } from '../stores/secuenciacion'
import type { ArchivoSecuencia, CandidatoSecuenciacion, OrigenDato } from '../data/types'

const auth = useAuthStore()
const seq = useSecuenciacionStore()

const modalAbierto = ref(false)
const guardando = ref(false)
const subiendo = ref(false)
const mensaje = ref('')
const errorForm = ref('')
const ultimaCarga = ref<ResultadoCarga | null>(null)
const previa = ref<{ nombre: string; texto: string } | null>(null)
const rolArchivo = ref<ArchivoSecuencia['rol']>('consenso')
const inputArchivo = ref<HTMLInputElement | null>(null)

const ORIGENES: { valor: OrigenDato; etiqueta: string; ayuda: string }[] = [
  {
    valor: 'experimental',
    etiqueta: 'Experimental',
    ayuda: 'La secuencia la generó este laboratorio a partir de una muestra propia.',
  },
  {
    valor: 'publico_ncbi',
    etiqueta: 'Dataset público NCBI',
    ayuda: 'Secuencia descargada de NCBI. Se guarda el accession para poder rastrearla.',
  },
  {
    valor: 'sintetico',
    etiqueta: 'Sintético / demo',
    ayuda: 'Datos creados para probar el pipeline. Nunca se interpretan como resultado real.',
  },
]

const form = ref({
  origenDato: 'experimental' as OrigenDato,
  idCarril: '' as string,
  fuenteExterna: '',
  accession: '',
  organismoDeclarado: '',
  plataforma: 'Illumina',
  tecnologia: 'Illumina MiSeq',
  tipoSecuenciacion: 'WGS',
  layout: 'paired-end',
  laboratorio: '',
  proveedor: '',
  fechaSecuenciacion: new Date().toISOString().slice(0, 10),
  notasProcedencia: '',
})

const origenActual = computed(() => ORIGENES.find((o) => o.valor === form.value.origenDato)!)
const esExperimental = computed(() => form.value.origenDato === 'experimental')

const claseOrigen: Record<OrigenDato, string> = {
  experimental: 'chip-exp',
  publico_ncbi: 'chip-pub',
  sintetico: 'chip-syn',
}

const claseSemaforo: Record<string, string> = {
  apta: 'sem-ok',
  revisar: 'sem-warn',
  insuficiente: 'sem-bad',
}

onMounted(async () => {
  await seq.cargar()
  if (seq.seleccionada) await seq.abrirSecuenciacion(seq.seleccionada)
})

onUnmounted(() => seq.detenerConsulta())

const baseBlast = ref<'16S' | 'nt'>('16S')

// El e-value se lee mejor en notación científica: los buenos son ceros o exponentes muy
// negativos, y "0" a secas se malinterpreta como "sin dato".
function formatoEvalue(valor: number | null): string {
  if (valor === null || valor === undefined) return '—'
  if (valor === 0) return '0.0'
  return valor < 0.001 ? valor.toExponential(1) : valor.toFixed(3)
}

async function analizar() {
  if (!seq.seleccionada) return
  mensaje.value = ''
  try {
    await seq.lanzarAnalisis(seq.seleccionada, { baseDatos: baseBlast.value })
  } catch (e) {
    mensaje.value = e instanceof Error ? e.message : String(e)
  }
}

// Demo guiada: un disparo ejecuta el pipeline completo y la vista solo acompaña el estado.
const contextoDemo = ref('fagoterapia en acuicultura de tilapia')
const maxArticulosDemo = ref(8)
const etiquetaDemo = ref('demo-video')

async function ejecutarDemo() {
  if (!seq.seleccionada) return
  mensaje.value = ''
  try {
    await seq.lanzarOrquestacion(seq.seleccionada, {
      contexto: contextoDemo.value,
      maxArticulos: maxArticulosDemo.value,
      temperatura: opcionesFicha.value.temperatura,
      seed: opcionesFicha.value.seed,
      etiqueta: etiquetaDemo.value,
    })
  } catch (e) {
    mensaje.value = e instanceof Error ? e.message : String(e)
  }
}

const naturalezaDemo: Record<string, { etiqueta: string; clase: string }> = {
  det: { etiqueta: 'Determinista', clase: 'flow-det' },
  ext: { etiqueta: 'Servicio externo', clase: 'flow-ext' },
  gen: { etiqueta: 'IA generativa', clase: 'flow-gen' },
}

function estadoPaso(paso: { estado: string }) {
  return paso.estado === 'completado' ? 'done' : paso.estado === 'en_curso' ? 'active' : paso.estado === 'fallido' ? 'failed' : ''
}

// ---- Ficha científica ----
// Los parámetros están a la vista a propósito: variar uno solo y comparar el resultado
// es el experimento, no un ajuste escondido en el backend.
const opcionesFicha = ref({
  conEvidencia: true,
  temperatura: 0.3,
  seed: 42 as number | null,
  etiquetaExperimento: '',
})

const ORDEN_SECCIONES = [
  'Resumen',
  'Interpretación del resultado',
  'Contraste con la literatura',
  'Relevancia para fagoterapia',
  'Limitaciones',
  'Preguntas para el siguiente experimento',
]

// El modelo devuelve las secciones en cualquier orden; aquí se presentan en el orden
// del proceso científico: observación → resultado → comparación → discusión.
const seccionesOrdenadas = computed(() => {
  const f = seq.ficha
  if (!f) return []
  const conocidas = ORDEN_SECCIONES.filter((s) => f.secciones[s])
  const extra = Object.keys(f.secciones).filter((s) => !ORDEN_SECCIONES.includes(s))
  return [...conocidas, ...extra].map((titulo) => ({ titulo, cuerpo: f.secciones[titulo] }))
})

async function generarFicha() {
  if (!seq.seleccionada) return
  mensaje.value = ''
  try {
    await seq.generarFicha(seq.seleccionada, {
      conEvidencia: opcionesFicha.value.conEvidencia,
      temperatura: opcionesFicha.value.temperatura,
      seed: opcionesFicha.value.seed,
      etiquetaExperimento: opcionesFicha.value.etiquetaExperimento,
    })
  } catch (e) {
    mensaje.value = e instanceof Error ? e.message : String(e)
  }
}

async function borrarFicha(id: string) {
  if (!seq.seleccionada || !confirm('¿Eliminar esta ficha?')) return
  await seq.eliminarFicha(id, seq.seleccionada)
}

async function construirArbol() {
  if (!seq.seleccionada) return
  mensaje.value = ''
  try {
    await seq.construirArbol(seq.seleccionada)
  } catch (e) {
    mensaje.value = e instanceof Error ? e.message : String(e)
  }
}

// ---- Experimento ----
const variableExp = ref('temperatura')
const valoresExp = ref('0.1, 0.5, 1.0')
const etiquetaExp = ref('muestreo')

const variableActual = computed(() => seq.variables.find((v) => v.clave === variableExp.value))

// Los valores se escriben como texto separado por comas: es más rápido que tres campos y
// deja claro que el experimento es una serie sobre una sola variable.
function parsearValores(): (number | boolean)[] {
  return valoresExp.value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => {
      if (v === 'true' || v === 'sí') return true
      if (v === 'false' || v === 'no') return false
      return Number(v)
    })
}

async function correrExperimento() {
  if (!seq.seleccionada) return
  mensaje.value = ''
  const valores = parsearValores()
  if (valores.length < 2) {
    mensaje.value = 'Un experimento necesita al menos dos valores para poder comparar.'
    return
  }
  try {
    await seq.lanzarExperimento(seq.seleccionada, {
      variable: variableExp.value,
      valores,
      etiqueta: etiquetaExp.value,
      base: {
        temperatura: opcionesFicha.value.temperatura,
        seed: opcionesFicha.value.seed,
        conEvidencia: opcionesFicha.value.conEvidencia,
      },
    })
  } catch (e) {
    mensaje.value = e instanceof Error ? e.message : String(e)
  }
}

// Comparación lado a lado: las fichas del mismo experimento, sección por sección.
const comparando = ref(false)
const seccionComparada = ref('Interpretación del resultado')

const fichasComparables = computed(() =>
  seq.fichas.filter((f) => f.etiquetaExperimento.startsWith(etiquetaExp.value)).slice(0, 4),
)

function abrirModal(candidato?: CandidatoSecuenciacion) {
  errorForm.value = ''
  if (candidato) {
    form.value.origenDato = 'experimental'
    form.value.idCarril = candidato.idCarril
  } else {
    form.value.idCarril = ''
  }
  modalAbierto.value = true
}

async function guardar() {
  errorForm.value = ''
  if (!esExperimental.value && !form.value.fuenteExterna.trim()) {
    errorForm.value = 'Declara la fuente del dato: sin eso el registro pierde su trazabilidad.'
    return
  }
  guardando.value = true
  try {
    const res = await seq.crear({ ...form.value })
    mensaje.value = `Secuenciación ${res.codigo} registrada.`
    modalAbierto.value = false
  } catch (e) {
    errorForm.value = e instanceof Error ? e.message : String(e)
  } finally {
    guardando.value = false
  }
}

async function onArchivo(evento: Event) {
  const input = evento.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !seq.seleccionada) return
  subiendo.value = true
  ultimaCarga.value = null
  mensaje.value = ''
  try {
    ultimaCarga.value = await seq.subirArchivo(seq.seleccionada, file, rolArchivo.value)
  } catch (e) {
    mensaje.value = e instanceof Error ? e.message : String(e)
  } finally {
    subiendo.value = false
    if (inputArchivo.value) inputArchivo.value.value = ''
  }
}

async function verPrevia(archivo: ArchivoSecuencia) {
  try {
    previa.value = { nombre: archivo.nombreArchivo, texto: await seq.vistaPrevia(archivo.id, 12) }
  } catch (e) {
    mensaje.value = e instanceof Error ? e.message : String(e)
  }
}

async function borrarArchivo(archivo: ArchivoSecuencia) {
  if (!confirm(`¿Eliminar ${archivo.nombreArchivo}?`)) return
  await seq.eliminarArchivo(archivo.id)
}

async function borrarSecuenciacion(id: string, codigo: string) {
  if (!confirm(`¿Eliminar la secuenciación ${codigo} y sus archivos?`)) return
  await seq.eliminar(id)
}

function tamano(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Métricas que vale la pena mostrar en la tarjeta, según el formato del archivo.
function resumenMetricas(archivo: ArchivoSecuencia): { etiqueta: string; valor: string }[] {
  const m = archivo.metricas as Record<string, number | string>
  if (archivo.formato === 'fastq') {
    return [
      { etiqueta: 'Lecturas', valor: Number(m.numLecturas ?? 0).toLocaleString('es-MX') },
      { etiqueta: 'Longitud media', valor: `${m.longitudMediaPb ?? '—'} pb` },
      { etiqueta: 'Calidad media', valor: `Q${m.calidadPromedio ?? '—'}` },
      { etiqueta: '% Q30', valor: `${m.pctQ30 ?? '—'} %` },
      { etiqueta: 'GC', valor: `${m.gcPct ?? '—'} %` },
    ]
  }
  return [
    { etiqueta: 'Secuencias', valor: String(m.numSecuencias ?? '—') },
    { etiqueta: 'Longitud', valor: `${Number(m.longitudTotalPb ?? 0).toLocaleString('es-MX')} pb` },
    { etiqueta: 'GC', valor: `${m.gcPct ?? '—'} %` },
    { etiqueta: 'Ambiguas (N)', valor: `${m.basesAmbiguasPct ?? 0} %` },
    { etiqueta: 'N50', valor: `${m.n50Pb ?? '—'} pb` },
  ]
}
</script>

<template>
  <div class="page-head">
    <div>
      <h1>Secuenciación</h1>
      <p class="sub">
        Después del gel: qué se mandó a secuenciar, qué archivo llegó y si esa secuencia
        sirve para analizarse. La validación y el control de calidad son deterministas,
        sin IA.
      </p>
    </div>
    <div class="actions">
      <button
        v-if="auth.can('secuenciacion.records.create')"
        class="btn btn-primary"
        @click="abrirModal()"
      >
        <Icon name="plus" :size="16" /> Nueva secuenciación
      </button>
    </div>
  </div>

  <p v-if="seq.error" class="aviso aviso-error">{{ seq.error }}</p>
  <p v-if="mensaje" class="aviso">{{ mensaje }}</p>

  <!-- Procedencia del dato: es el primer dato que debe ver cualquiera -->
  <div class="stats">
    <div class="stat">
      <div class="stat-num">{{ seq.kpis.total }}</div>
      <div class="stat-label">secuenciaciones</div>
    </div>
    <div class="stat">
      <div class="stat-num">{{ seq.kpis.experimentales }}</div>
      <div class="stat-label">experimentales</div>
    </div>
    <div class="stat">
      <div class="stat-num">{{ seq.kpis.publicas }}</div>
      <div class="stat-label">públicas (NCBI)</div>
    </div>
    <div class="stat">
      <div class="stat-num">{{ seq.kpis.sinteticas }}</div>
      <div class="stat-label">sintéticas</div>
    </div>
    <div class="stat">
      <div class="stat-num">{{ seq.kpis.conArchivo }}</div>
      <div class="stat-label">con archivo cargado</div>
    </div>
  </div>

  <!-- Candidatos que vienen del gel -->
  <section v-if="seq.candidatos.length" class="panel">
    <header class="panel-head">
      <h2>Candidatas del gel</h2>
      <span class="pill">{{ seq.candidatos.length }} con banda positiva</span>
    </header>
    <p class="panel-sub">
      Carriles con banda que aún no se envían a secuenciar. Registrar la secuenciación
      conserva la cadena completa: pez → caja → subcultivo → ADN → PCR → gel → secuencia.
    </p>
    <div class="cand-grid">
      <article v-for="c in seq.candidatos.slice(0, 12)" :key="c.idCarril" class="cand">
        <div class="cand-top">
          <strong>{{ c.codigoVisible || c.codigoVial }}</strong>
          <span class="pill pill-soft">{{ c.codigoGel }} · carril {{ c.carril }}</span>
        </div>
        <div class="cand-meta">
          {{ c.pez || '—' }} · {{ c.organo || '—' }} · {{ c.tamanoPb ?? '—' }} pb
        </div>
        <button
          v-if="auth.can('secuenciacion.records.create')"
          class="btn btn-ghost btn-sm"
          @click="abrirModal(c)"
        >
          Enviar a secuenciación
        </button>
      </article>
    </div>
  </section>

  <div class="split">
    <!-- Lista -->
    <section class="panel lista">
      <header class="panel-head">
        <h2>Secuenciaciones</h2>
      </header>
      <p v-if="!seq.secuenciaciones.length && !seq.loading" class="vacio">
        Todavía no hay secuenciaciones registradas.
      </p>
      <ul class="seq-list">
        <li
          v-for="s in seq.secuenciaciones"
          :key="s.id"
          :class="{ activa: s.id === seq.seleccionada }"
          @click="seq.abrirSecuenciacion(s.id)"
        >
          <div class="seq-top">
            <strong>{{ s.codigo }}</strong>
            <span class="chip" :class="claseOrigen[s.origenDato]">{{ s.origenEtiqueta }}</span>
          </div>
          <div class="seq-meta">
            {{ s.organismoDeclarado || s.pez || 'Sin organismo declarado' }} ·
            {{ s.tecnologia || s.plataforma || '—' }} · {{ s.estado }}
          </div>
          <div class="seq-meta muted">
            {{ s.archivos.length }} archivo(s)
            <template v-if="s.accession"> · {{ s.accession }}</template>
          </div>
        </li>
      </ul>
    </section>

    <!-- Detalle -->
    <section v-if="seq.actual" class="panel detalle">
      <header class="panel-head">
        <div>
          <h2>{{ seq.actual.codigo }}</h2>
          <span class="chip" :class="claseOrigen[seq.actual.origenDato]">
            {{ seq.actual.origenEtiqueta }}
          </span>
        </div>
        <button
          v-if="auth.can('secuenciacion.records.update')"
          class="btn btn-ghost btn-sm"
          @click="borrarSecuenciacion(seq.actual.id, seq.actual.codigo)"
        >
          <Icon name="close" :size="14" /> Eliminar
        </button>
      </header>

      <dl class="campos">
        <div><dt>Organismo declarado</dt><dd>{{ seq.actual.organismoDeclarado || '—' }}</dd></div>
        <div><dt>Plataforma</dt><dd>{{ seq.actual.plataforma || '—' }}</dd></div>
        <div><dt>Tecnología</dt><dd>{{ seq.actual.tecnologia || '—' }}</dd></div>
        <div><dt>Tipo</dt><dd>{{ seq.actual.tipoSecuenciacion || '—' }}</dd></div>
        <div><dt>Layout</dt><dd>{{ seq.actual.layout || '—' }}</dd></div>
        <div><dt>Estado</dt><dd>{{ seq.actual.estado }}</dd></div>
        <div v-if="seq.actual.codigoGel"><dt>Gel</dt><dd>{{ seq.actual.codigoGel }} · carril {{ seq.actual.carril }}</dd></div>
        <div v-if="seq.actual.pez"><dt>Muestra</dt><dd>{{ seq.actual.pez }} · {{ seq.actual.organo }}</dd></div>
        <div v-if="seq.actual.fuenteExterna"><dt>Fuente</dt><dd>{{ seq.actual.fuenteExterna }}</dd></div>
        <div v-if="seq.actual.accession"><dt>Accession</dt><dd>{{ seq.actual.accession }}</dd></div>
      </dl>

      <p v-if="seq.actual.notasProcedencia" class="nota-proc">
        {{ seq.actual.notasProcedencia }}
      </p>

      <!-- Carga de archivos -->
      <div v-if="auth.can('secuenciacion.files.manage')" class="carga">
        <label class="campo-rol">
          Rol del archivo
          <select v-model="rolArchivo">
            <option value="consenso">Consenso (FASTA)</option>
            <option value="contigs">Contigs (FASTA)</option>
            <option value="R1">Lecturas R1 (FASTQ)</option>
            <option value="R2">Lecturas R2 (FASTQ)</option>
            <option value="referencia">Referencia</option>
            <option value="otro">Otro</option>
          </select>
        </label>
        <input
          ref="inputArchivo"
          type="file"
          accept=".fasta,.fa,.fna,.fas,.fastq,.fq,.gz,.txt"
          :disabled="subiendo"
          @change="onArchivo"
        />
        <span v-if="subiendo" class="muted">Validando…</span>
      </div>

      <div v-if="ultimaCarga" class="resultado" :class="claseSemaforo[ultimaCarga.semaforo]">
        <strong>
          {{ ultimaCarga.valido ? `${ultimaCarga.formato?.toUpperCase()} válido` : 'Archivo inválido' }}
          · {{ ultimaCarga.semaforo }}
        </strong>
        <ul>
          <li v-for="(h, i) in ultimaCarga.hallazgos" :key="i">{{ h }}</li>
        </ul>
      </div>

      <!-- Archivos cargados -->
      <div v-for="a in seq.actual.archivos" :key="a.id" class="archivo">
        <div class="archivo-top">
          <div>
            <strong>{{ a.nombreArchivo }}</strong>
            <span class="pill pill-soft">{{ a.formato?.toUpperCase() }} · {{ a.rol }}</span>
            <span v-if="a.comprimido" class="pill pill-soft">gz</span>
          </div>
          <div class="archivo-acc">
            <span class="chip" :class="claseSemaforo[a.semaforo ?? 'insuficiente']">
              {{ a.estadoValidacion === 'invalido' ? 'inválido' : a.semaforo }}
            </span>
            <button class="btn btn-ghost btn-sm" @click="verPrevia(a)">
              <Icon name="eye" :size="14" /> Ver
            </button>
            <button
              v-if="auth.can('secuenciacion.files.manage')"
              class="btn btn-ghost btn-sm"
              @click="borrarArchivo(a)"
            >
              <Icon name="close" :size="14" />
            </button>
          </div>
        </div>
        <div v-if="a.estadoValidacion === 'valido'" class="metricas">
          <div v-for="m in resumenMetricas(a)" :key="m.etiqueta">
            <span class="m-label">{{ m.etiqueta }}</span>
            <span class="m-valor">{{ m.valor }}</span>
          </div>
        </div>
        <ul class="hallazgos">
          <li v-for="(h, i) in a.hallazgos" :key="i">{{ h }}</li>
        </ul>
        <div class="archivo-pie muted">
          {{ tamano(a.sizeBytes) }} · sha256 {{ (a.sha256 ?? '').slice(0, 12) }}… ·
          {{ a.creadoEn }}<template v-if="a.subidoPor"> · {{ a.subidoPor }}</template>
        </div>
      </div>

      <!-- Demo principal: un botón, nueve pasos y bitácora visible -->
      <section v-if="auth.can('analisis.orquestacion.run')" class="demo-flow">
        <div class="demo-flow-head">
          <div>
            <span class="eyebrow">MODO DEMO · ORQUESTACIÓN COMPLETA</span>
            <h2>Ejecuta el experimento completo</h2>
            <p>
              El agente decide las consultas; el código valida, mide y consulta NCBI. Observa
              cada transición en vivo y distingue qué produce cada carril.
            </p>
          </div>
          <button class="demo-launch" :disabled="seq.orquestando || !seq.actual?.archivos.some(a => a.estadoValidacion === 'valido' && a.formato === 'fasta')" @click="ejecutarDemo">
            <span class="launch-dot" :class="{ pulso: seq.orquestando }"></span>
            {{ seq.orquestando ? 'Ejecutando…' : 'Iniciar experimento' }}
          </button>
        </div>

        <div class="demo-config">
          <label><span>Contexto que recibe el agente</span><input v-model="contextoDemo" /></label>
          <label><span>Artículos máximos</span><input v-model.number="maxArticulosDemo" type="number" min="1" max="20" /></label>
          <label><span>Etiqueta de corrida</span><input v-model="etiquetaDemo" /></label>
        </div>

        <div class="legend-flow">
          <span class="flow-det">● Código determinista</span>
          <span class="flow-ext">● NCBI / PubMed</span>
          <span class="flow-gen">● Modelo generativo</span>
          <span class="flow-hint">El modelo nunca calcula un hecho</span>
        </div>

        <div v-if="seq.corrida?.tipo === 'orquestacion'" class="flow-run">
          <div class="flow-run-top">
            <div><strong>{{ seq.corrida.estado === 'completada' ? 'Experimento completado' : seq.corrida.progreso || 'Preparando…' }}</strong><small>{{ seq.corrida.creadaEn }}</small></div>
            <span class="run-timer" :class="{ running: seq.orquestando }">{{ seq.corrida.estado }}</span>
          </div>
          <div class="step-track">
            <article v-for="paso in (seq.corrida.pasos || [])" :key="paso.clave" class="flow-step" :class="[naturalezaDemo[paso.naturaleza]?.clase, estadoPaso(paso)]">
              <div class="step-index">{{ paso.etiqueta }}</div>
              <div class="step-copy"><strong>{{ paso.titulo }}</strong><small>{{ naturalezaDemo[paso.naturaleza]?.etiqueta }}</small><em v-if="paso.detalle">{{ paso.detalle }}</em></div>
              <span class="step-state">{{ paso.estado === 'completado' ? '✓' : paso.estado === 'en_curso' ? '…' : paso.estado === 'fallido' ? '!' : '·' }}</span>
            </article>
          </div>
          <details class="flow-log" :open="seq.orquestando">
            <summary>Bitácora en vivo · {{ (seq.corrida.bitacora || []).length }} eventos</summary>
            <div v-for="(evento, i) in (seq.corrida.bitacora || []).slice().reverse()" :key="`${evento.hora}-${i}`" class="log-line">
              <time>{{ evento.hora }}</time><span :class="naturalezaDemo[evento.naturaleza]?.clase">{{ evento.titulo }}</span><p>{{ evento.detalle }}</p>
            </div>
          </details>
        </div>
      </section>

      <!-- Identificación taxonómica: hechos medidos, todavía sin IA -->
      <div class="analisis">
        <div class="analisis-head">
          <div>
            <h3>Identificación taxonómica</h3>
            <p class="muted">
              BLAST contra NCBI. Los resultados son medidos, no interpretados: el modelo
              generativo entra después, y solo para explicarlos.
            </p>
          </div>
          <div class="analisis-acc">
            <select v-model="baseBlast" :disabled="seq.analizando">
              <option value="16S">16S curada (rápida)</option>
              <option value="nt">Nucleótidos general (lenta)</option>
            </select>
            <button
              v-if="auth.can('analisis.corridas.create')"
              class="btn btn-primary"
              :disabled="seq.analizando"
              @click="analizar"
            >
              <Icon name="search" :size="15" />
              {{ seq.analizando ? 'Analizando…' : 'Analizar' }}
            </button>
          </div>
        </div>

        <div v-if="seq.corrida" class="corrida" :class="{ fallo: seq.corrida.estado === 'fallida' }">
          <div class="corrida-top">
            <span class="chip" :class="seq.corrida.estado === 'fallida' ? 'sem-bad' : seq.analizando ? 'sem-warn' : 'sem-ok'">
              {{ seq.corrida.estado }}
            </span>
            <span>{{ seq.corrida.error || seq.corrida.progreso }}</span>
          </div>
          <div v-if="seq.corrida.referenciaExterna" class="muted">
            Trabajo NCBI {{ seq.corrida.referenciaExterna }} ·
            {{ seq.corrida.resultado?.baseDatos || '' }} · {{ seq.corrida.creadaEn }}
          </div>
        </div>

        <div v-if="seq.corrida?.resultado?.taxonomia" class="taxonomia">
          <span class="tax-label">Linaje del hit principal</span>
          <div class="tax-linaje">
            <span v-for="n in seq.corrida.resultado.taxonomia.linaje" :key="n.nombre" class="tax-nodo">
              {{ n.nombre }}
            </span>
            <span class="tax-nodo tax-final">{{ seq.corrida.resultado.taxonomia.nombreCientifico }}</span>
          </div>
        </div>

        <div v-if="seq.hits.length" class="tabla-hits">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Organismo</th><th>Identidad</th><th>Cobertura</th>
                <th>E-value</th><th>Bit score</th><th>Accession</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="h in seq.hits" :key="h.ranking" :class="{ principal: h.ranking === 1 }">
                <td>{{ h.ranking }}</td>
                <td class="org">{{ h.organismo }}</td>
                <td class="num">{{ h.identidadPct ?? '—' }} %</td>
                <td class="num">{{ h.coberturaPct ?? '—' }} %</td>
                <td class="num">{{ formatoEvalue(h.eValue) }}</td>
                <td class="num">{{ h.bitScore ?? '—' }}</td>
                <td>
                  <a
                    :href="`https://www.ncbi.nlm.nih.gov/nuccore/${h.accession}`"
                    target="_blank"
                    rel="noopener noreferrer"
                  >{{ h.accession }}</a>
                </td>
              </tr>
            </tbody>
          </table>
          <p class="muted pie-hits">
            {{ seq.hits[0].baseDatos }} · consultado el {{ seq.hits[0].fechaCorrida }}.
            Mayor similitud no equivale a identidad confirmada de especie.
          </p>
        </div>
      </div>

      <!-- Árbol filogenético orientativo -->
      <div v-if="seq.hits.length >= 2" class="arbol-bloque">
        <div class="analisis-head">
          <div>
            <h3>Árbol filogenético</h3>
            <p class="muted">
              Ubica la secuencia frente a las referencias de sus coincidencias. Distancias
              por k-meros, sin alineamiento múltiple: es orientativo, no publicable.
            </p>
          </div>
          <button
            v-if="auth.can('analisis.corridas.create')"
            class="btn btn-ghost"
            :disabled="seq.construyendoArbol"
            @click="construirArbol"
          >
            <Icon name="flow" :size="15" />
            {{ seq.construyendoArbol ? 'Construyendo…' : 'Construir árbol' }}
          </button>
        </div>

        <p v-if="seq.corridaArbol && seq.corridaArbol.estado !== 'completada'" class="corrida">
          {{ seq.corridaArbol.error || seq.corridaArbol.progreso }}
        </p>

        <template v-if="seq.arbol">
          <ArbolFilogenetico :arbol="seq.arbol.arbol" :consulta="seq.arbol.etiquetaConsulta" />
          <p class="muted limitacion">{{ seq.arbol.metodo }}. {{ seq.arbol.limitacion }}</p>
          <details class="newick">
            <summary>Newick</summary>
            <pre>{{ seq.arbol.newick }}</pre>
          </details>
        </template>
      </div>

      <!-- Ficha científica: aquí, y solo aquí, escribe el modelo -->
      <div class="ficha-bloque">
        <div class="analisis-head">
          <div>
            <h3>Ficha científica <span class="chip chip-ia">generada por IA</span></h3>
            <p class="muted">
              El modelo lee la evidencia de arriba —QC, hits de BLAST, taxonomía y
              literatura— y redacta la interpretación. No calcula ni decide la especie.
            </p>
          </div>
        </div>

        <div v-if="auth.can('ficha.records.create')" class="params">
          <label class="param">
            <span>Temperatura</span>
            <input v-model.number="opcionesFicha.temperatura" type="number" min="0" max="1.5" step="0.1" />
            <em>dispersión del muestreo</em>
          </label>
          <label class="param">
            <span>Seed</span>
            <input v-model.number="opcionesFicha.seed" type="number" placeholder="—" />
            <em>reproducibilidad</em>
          </label>
          <label class="param">
            <span>Etiqueta</span>
            <input v-model="opcionesFicha.etiquetaExperimento" placeholder="base" />
            <em>agrupa el experimento</em>
          </label>
          <label class="param param-check">
            <span>
              <input v-model="opcionesFicha.conEvidencia" type="checkbox" />
              Con evidencia
            </span>
            <em>desmárcalo para ver alucinar al modelo</em>
          </label>
          <button class="btn btn-primary" :disabled="seq.generando" @click="generarFicha">
            <Icon name="sparkles" :size="15" />
            {{ seq.generando ? 'Generando…' : 'Generar ficha' }}
          </button>
        </div>

        <!-- Fichas anteriores: comparar es el experimento -->
        <div v-if="seq.fichas.length > 1" class="versiones">
          <span class="muted">Comparar:</span>
          <button
            v-for="f in seq.fichas"
            :key="f.id"
            class="version"
            :class="{ activa: f.id === seq.fichaActiva, sinev: !f.conEvidencia }"
            @click="seq.fichaActiva = f.id"
          >
            {{ f.etiquetaExperimento || 'sin etiqueta' }} · T{{ f.temperatura }}
            <template v-if="!f.conEvidencia"> · sin evidencia</template>
          </button>
        </div>

        <article v-if="seq.ficha" class="ficha" :class="{ 'sin-evidencia': !seq.ficha.conEvidencia }">
          <p v-if="!seq.ficha.conEvidencia" class="alerta-control">
            <Icon name="alert" :size="15" />
            Ficha generada <strong>sin evidencia</strong>, como control del experimento.
            Su contenido no está respaldado por ningún dato de este sistema y puede ser
            inventado. No usar como resultado.
          </p>

          <section v-for="s in seccionesOrdenadas" :key="s.titulo" class="ficha-sec">
            <h4>{{ s.titulo }}</h4>
            <p>{{ s.cuerpo }}</p>
          </section>

          <footer class="ficha-pie">
            <div class="pie-fila">
              <span><strong>Modelo</strong> {{ seq.ficha.modelo }}</span>
              <span><strong>Temperatura</strong> {{ seq.ficha.temperatura }}</span>
              <span v-if="seq.ficha.seed !== null"><strong>Seed</strong> {{ seq.ficha.seed }}</span>
              <span><strong>Tokens</strong> {{ seq.ficha.tokensEntrada }} → {{ seq.ficha.tokensSalida }}</span>
              <span v-if="seq.ficha.duracionMs"><strong>Tiempo</strong> {{ (seq.ficha.duracionMs / 1000).toFixed(1) }} s</span>
            </div>
            <div v-if="seq.ficha.evidenciaSha256" class="pie-fila">
              <span><strong>Evidencia</strong> sha256 {{ seq.ficha.evidenciaSha256.slice(0, 16) }}…</span>
              <span>{{ seq.ficha.evidenciaResumen.hits }} hits · {{ seq.ficha.evidenciaResumen.articulos }} artículos</span>
            </div>
            <div v-if="seq.ficha.evidenciaResumen.pmids?.length" class="pie-fuentes">
              <strong>Fuentes citables:</strong>
              <a
                v-for="p in seq.ficha.evidenciaResumen.pmids"
                :key="p"
                :href="`https://pubmed.ncbi.nlm.nih.gov/${p}/`"
                target="_blank"
                rel="noopener noreferrer"
              >PMID {{ p }}</a>
            </div>
            <div class="pie-fila muted">
              <span>{{ seq.ficha.creadaEn }}</span>
              <span v-if="seq.ficha.generadaPor">{{ seq.ficha.generadaPor }}</span>
              <button
                v-if="auth.can('ficha.records.delete')"
                class="btn btn-ghost btn-sm"
                @click="borrarFicha(seq.ficha.id)"
              >
                <Icon name="close" :size="13" /> Eliminar
              </button>
            </div>
          </footer>
        </article>

        <p v-else-if="!seq.generando" class="vacio">
          Todavía no hay ficha. Con BLAST ya corrido, genera la interpretación.
        </p>
      </div>

      <!-- Experimento: una sola variable a la vez -->
      <div v-if="auth.can('ficha.records.create')" class="exp-bloque">
        <div class="analisis-head">
          <div>
            <h3>Experimento</h3>
            <p class="muted">
              Misma evidencia, una sola variable modificada, resultados comparados.
              Los demás parámetros quedan fijos en los valores de arriba.
            </p>
          </div>
        </div>

        <div class="params">
          <label class="param">
            <span>Variable</span>
            <select v-model="variableExp">
              <option v-for="v in seq.variables" :key="v.clave" :value="v.clave">{{ v.etiqueta }}</option>
            </select>
          </label>
          <label class="param">
            <span>Valores</span>
            <input v-model="valoresExp" placeholder="0.1, 0.5, 1.0" style="width: 170px" />
            <em>separados por comas</em>
          </label>
          <label class="param">
            <span>Etiqueta</span>
            <input v-model="etiquetaExp" placeholder="muestreo" />
          </label>
          <button class="btn btn-primary" :disabled="seq.experimentando" @click="correrExperimento">
            <Icon name="activity" :size="15" />
            {{ seq.experimentando ? 'Corriendo…' : 'Correr experimento' }}
          </button>
        </div>

        <p v-if="variableActual" class="explicacion">{{ variableActual.explicacion }}</p>

        <p v-if="seq.corridaExperimento && seq.corridaExperimento.estado !== 'completada'" class="corrida">
          {{ seq.corridaExperimento.error || seq.corridaExperimento.progreso }}
        </p>

        <div v-if="fichasComparables.length > 1" class="comparar">
          <div class="comparar-head">
            <label class="param">
              <span>Sección a comparar</span>
              <select v-model="seccionComparada">
                <option v-for="s in ORDEN_SECCIONES" :key="s" :value="s">{{ s }}</option>
              </select>
            </label>
            <button class="btn btn-ghost btn-sm" @click="comparando = !comparando">
              {{ comparando ? 'Ocultar comparación' : `Comparar ${fichasComparables.length} fichas` }}
            </button>
          </div>

          <div v-if="comparando" class="columnas">
            <article v-for="f in fichasComparables" :key="f.id" class="columna">
              <header>
                <strong>{{ f.etiquetaExperimento || 'sin etiqueta' }}</strong>
                <span class="muted">
                  T{{ f.temperatura }}<template v-if="f.seed !== null"> · seed {{ f.seed }}</template>
                  <template v-if="!f.conEvidencia"> · sin evidencia</template>
                </span>
              </header>
              <p>{{ f.secciones[seccionComparada] || '—' }}</p>
              <footer class="muted">{{ f.tokensSalida }} tokens</footer>
            </article>
          </div>
        </div>
      </div>
    </section>
  </div>

  <!-- Vista previa cruda: aquí se ve que un FASTQ trae calidad y un FASTA no -->
  <div v-if="previa" class="modal-fondo" @click.self="previa = null">
    <div class="modal">
      <header class="modal-head">
        <h3>{{ previa.nombre }}</h3>
        <button class="btn btn-ghost btn-sm" @click="previa = null"><Icon name="close" :size="16" /></button>
      </header>
      <pre class="previa">{{ previa.texto }}</pre>
      <p class="muted">
        Primeras líneas del archivo. En FASTQ cada lectura ocupa 4 líneas: identificador,
        bases, separador y calidad Phred. En FASTA solo hay encabezado y bases.
      </p>
    </div>
  </div>

  <!-- Alta -->
  <div v-if="modalAbierto" class="modal-fondo" @click.self="modalAbierto = false">
    <div class="modal">
      <header class="modal-head">
        <h3>Nueva secuenciación</h3>
        <button class="btn btn-ghost btn-sm" @click="modalAbierto = false">
          <Icon name="close" :size="16" />
        </button>
      </header>

      <label class="campo">
        Procedencia del dato
        <select v-model="form.origenDato">
          <option v-for="o in ORIGENES" :key="o.valor" :value="o.valor">{{ o.etiqueta }}</option>
        </select>
        <small>{{ origenActual.ayuda }}</small>
      </label>

      <label v-if="esExperimental" class="campo">
        Carril de gel candidato
        <select v-model="form.idCarril">
          <option value="">Sin enlazar a un gel</option>
          <option v-for="c in seq.candidatos" :key="c.idCarril" :value="c.idCarril">
            {{ c.codigoGel }} · carril {{ c.carril }} · {{ c.codigoVisible || c.codigoVial }}
          </option>
        </select>
      </label>

      <template v-else>
        <label class="campo">
          Fuente <small>obligatoria para datos no experimentales</small>
          <input v-model="form.fuenteExterna" placeholder="NCBI SRA / NCBI Nucleotide" />
        </label>
        <label class="campo">
          Accession
          <input v-model="form.accession" placeholder="SRR29206948 / NR_119039.1" />
        </label>
      </template>

      <label class="campo">
        Organismo declarado
        <input v-model="form.organismoDeclarado" placeholder="Aeromonas hydrophila" />
      </label>

      <div class="fila">
        <label class="campo">
          Plataforma
          <input v-model="form.plataforma" placeholder="Illumina" />
        </label>
        <label class="campo">
          Tecnología
          <input v-model="form.tecnologia" placeholder="Illumina MiSeq" />
        </label>
      </div>

      <div class="fila">
        <label class="campo">
          Tipo
          <select v-model="form.tipoSecuenciacion">
            <option value="WGS">WGS (genoma completo)</option>
            <option value="16S rRNA">16S rRNA</option>
            <option value="amplicon">Amplicón</option>
            <option value="metagenoma">Metagenoma</option>
          </select>
        </label>
        <label class="campo">
          Layout
          <select v-model="form.layout">
            <option value="paired-end">Paired-end</option>
            <option value="single-end">Single-end</option>
          </select>
        </label>
      </div>

      <div class="fila">
        <label class="campo">
          Fecha
          <input v-model="form.fechaSecuenciacion" type="date" />
        </label>
        <label class="campo">
          Laboratorio / proveedor
          <input v-model="form.laboratorio" placeholder="Servicio de secuenciación" />
        </label>
      </div>

      <label class="campo">
        Nota de procedencia
        <textarea
          v-model="form.notasProcedencia"
          rows="2"
          placeholder="Ej.: secuencia pública usada para validar el pipeline mientras concluye la secuenciación propia."
        />
      </label>

      <p v-if="errorForm" class="aviso aviso-error">{{ errorForm }}</p>

      <footer class="modal-pie">
        <button class="btn btn-ghost" @click="modalAbierto = false">Cancelar</button>
        <button class="btn btn-primary" :disabled="guardando" @click="guardar">
          {{ guardando ? 'Guardando…' : 'Registrar' }}
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-bottom: 18px; }
.page-head h1 { font-family: var(--font-heading); font-size: 26px; margin: 0 0 6px; color: var(--ink); }
.sub { color: var(--muted); margin: 0; max-width: 68ch; line-height: 1.5; }

.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 18px; }
.stat { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 14px 16px; box-shadow: var(--shadow-sm); }
.stat-num { font-family: var(--font-heading); font-size: 26px; color: var(--ink); }
.stat-label { color: var(--muted); font-size: 13px; }

.panel { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 18px 20px; box-shadow: var(--shadow-sm); margin-bottom: 18px; }
.panel-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 8px; }
.panel-head h2 { font-family: var(--font-heading); font-size: 17px; margin: 0; color: var(--ink); }
.panel-sub { color: var(--muted); font-size: 13px; margin: 0 0 14px; line-height: 1.5; }

.split { display: grid; grid-template-columns: minmax(280px, 340px) 1fr; gap: 18px; align-items: start; }
@media (max-width: 900px) { .split { grid-template-columns: 1fr; } }

.seq-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; max-height: 70vh; overflow: auto; }
.seq-list li { border: 1px solid var(--line); border-radius: var(--radius); padding: 10px 12px; cursor: pointer; transition: border-color .15s, background .15s; }
.seq-list li:hover { border-color: var(--teal); }
.seq-list li.activa { border-color: var(--teal); background: var(--teal-50); }
.seq-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 4px; }
.seq-meta { font-size: 12px; color: var(--ink-soft); }
.seq-meta.muted { color: var(--muted); }

.cand-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 10px; }
.cand { border: 1px solid var(--line); border-radius: var(--radius); padding: 10px 12px; display: grid; gap: 6px; }
.cand-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.cand-meta { font-size: 12px; color: var(--muted); }

.campos { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px 16px; margin: 12px 0; }
.campos dt { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); }
.campos dd { margin: 2px 0 0; color: var(--ink); font-size: 14px; }
.nota-proc { background: var(--amber-50); border-left: 3px solid var(--amber); padding: 8px 12px; border-radius: 8px; font-size: 13px; color: var(--ink-soft); }

.carga { display: flex; flex-wrap: wrap; align-items: end; gap: 12px; padding: 14px 0; border-top: 1px solid var(--line-soft); margin-top: 12px; }
.campo-rol { display: grid; gap: 4px; font-size: 12px; color: var(--muted); }

.resultado { border-radius: var(--radius); padding: 10px 14px; margin-bottom: 14px; font-size: 13px; }
.resultado ul { margin: 6px 0 0; padding-left: 18px; }

.archivo { border: 1px solid var(--line); border-radius: var(--radius); padding: 12px 14px; margin-bottom: 10px; }
.archivo-top { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
.archivo-acc { display: flex; align-items: center; gap: 6px; }
.archivo-pie { font-size: 11px; margin-top: 8px; }
.metricas { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px; margin: 10px 0; }
.m-label { display: block; font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .03em; }
.m-valor { font-family: var(--font-heading); font-size: 15px; color: var(--ink); }
.hallazgos { margin: 6px 0 0; padding-left: 18px; font-size: 12px; color: var(--ink-soft); }

/* ---- Identificación taxonómica ---- */
.analisis { border-top: 1px solid var(--line-soft); margin-top: 16px; padding-top: 16px; }
.analisis-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
.analisis-head h3 { font-family: var(--font-heading); font-size: 15px; margin: 0 0 3px; color: var(--ink); }
.analisis-head p { margin: 0; max-width: 52ch; line-height: 1.45; }
.analisis-acc { display: flex; align-items: center; gap: 8px; }
.analisis-acc select { border: 1px solid var(--line); border-radius: 8px; padding: 7px 9px; font: inherit; font-size: 13px; background: #fff; color: var(--ink); }

.corrida { background: var(--line-soft); border-radius: 10px; padding: 10px 13px; margin-top: 12px; font-size: 13px; }
.corrida.fallo { background: var(--coral-50); }
.corrida-top { display: flex; align-items: center; gap: 9px; color: var(--ink-soft); }

.taxonomia { margin-top: 12px; }
.tax-label { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); }
.tax-linaje { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; margin-top: 5px; }
.tax-nodo { font-size: 12px; background: var(--line-soft); color: var(--ink-soft); padding: 2px 9px; border-radius: 999px; }
.tax-nodo + .tax-nodo::before { content: '›'; color: var(--muted); margin-right: 8px; margin-left: -4px; }
.tax-final { background: var(--teal-100); color: var(--teal-600); font-weight: 600; }

.tabla-hits { margin-top: 14px; overflow-x: auto; }
.tabla-hits table { border-collapse: collapse; width: 100%; min-width: 620px; font-size: 13px; }
.tabla-hits th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); font-weight: 500; padding: 7px 10px; border-bottom: 1px solid var(--line); }
.tabla-hits td { padding: 8px 10px; border-bottom: 1px solid var(--line-soft); color: var(--ink-soft); }
.tabla-hits tr.principal td { background: var(--teal-50); color: var(--ink); font-weight: 600; }
.tabla-hits td.org { color: var(--ink); font-style: italic; }
.tabla-hits td.num { text-align: right; font-variant-numeric: tabular-nums; }
.tabla-hits a { color: var(--blue); text-decoration: none; }
.tabla-hits a:hover { text-decoration: underline; }
.pie-hits { margin-top: 9px; }

/* ---- Árbol filogenético ---- */
.arbol-bloque { border-top: 1px solid var(--line-soft); margin-top: 18px; padding-top: 16px; }
.limitacion { margin-top: 8px; line-height: 1.5; max-width: 70ch; }
.newick { margin-top: 10px; font-size: 12px; }
.newick summary { cursor: pointer; color: var(--muted); }
.newick pre { background: var(--line-soft); padding: 10px 12px; border-radius: 8px; overflow-x: auto; font-size: 11px; margin-top: 7px; }

/* ---- Experimento ---- */
.exp-bloque { border-top: 1px solid var(--line-soft); margin-top: 18px; padding-top: 16px; }
.exp-bloque select { border: 1px solid var(--line); border-radius: 8px; padding: 7px 9px; font: inherit; font-size: 13px; background: #fff; color: var(--ink); }
.explicacion { font-size: 13px; color: var(--ink-soft); background: var(--violet-50); border-left: 3px solid var(--violet); padding: 9px 13px; border-radius: 8px; margin: 0 0 12px; line-height: 1.5; max-width: 74ch; }
.comparar { margin-top: 14px; }
.comparar-head { display: flex; align-items: flex-end; gap: 14px; flex-wrap: wrap; margin-bottom: 12px; }
.columnas { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
.columna { border: 1px solid var(--line); border-radius: var(--radius); padding: 13px 15px; display: flex; flex-direction: column; gap: 8px; }
.columna header { display: grid; gap: 2px; }
.columna header strong { font-size: 13px; color: var(--ink); }
.columna p { margin: 0; font-size: 13px; line-height: 1.55; color: var(--ink-soft); white-space: pre-wrap; }
.columna footer { font-size: 11px; }

/* ---- Ficha científica ---- */
.ficha-bloque { border-top: 1px solid var(--line-soft); margin-top: 18px; padding-top: 16px; }
.chip-ia { background: var(--violet-50); color: var(--violet); margin-left: 6px; }

.params { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 14px; margin: 14px 0; }
.param { display: grid; gap: 3px; font-size: 12px; color: var(--muted); }
.param > span { color: var(--ink-soft); font-weight: 600; }
.param input[type="number"], .param input[type="text"], .param input:not([type]) {
  border: 1px solid var(--line); border-radius: 8px; padding: 7px 9px; font: inherit;
  font-size: 13px; width: 118px; background: #fff; color: var(--ink);
}
.param em { font-style: normal; font-size: 11px; color: var(--muted); }
.param-check > span { display: flex; align-items: center; gap: 6px; font-weight: 600; }

.versiones { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; margin-bottom: 14px; }
.version { border: 1px solid var(--line); background: #fff; border-radius: 999px; padding: 4px 12px; font: inherit; font-size: 12px; cursor: pointer; color: var(--ink-soft); }
.version.activa { border-color: var(--violet); background: var(--violet-50); color: var(--violet); font-weight: 600; }
.version.sinev { border-style: dashed; }

.ficha { border: 1px solid var(--violet); border-radius: var(--radius); padding: 18px 20px; background: #fff; }
.ficha.sin-evidencia { border-color: var(--coral); border-style: dashed; }
.alerta-control { display: flex; align-items: flex-start; gap: 8px; background: var(--coral-50); color: var(--coral); padding: 10px 13px; border-radius: 9px; font-size: 13px; margin: 0 0 16px; line-height: 1.45; }
.ficha-sec + .ficha-sec { margin-top: 16px; }
.ficha-sec h4 { font-family: var(--font-heading); font-size: 14px; margin: 0 0 5px; color: var(--violet); }
.ficha-sec p { margin: 0; font-size: 14px; line-height: 1.62; color: var(--ink-soft); white-space: pre-wrap; }

.ficha-pie { margin-top: 18px; padding-top: 13px; border-top: 1px solid var(--line-soft); display: grid; gap: 7px; }
.pie-fila { display: flex; flex-wrap: wrap; gap: 16px; font-size: 12px; color: var(--ink-soft); align-items: center; }
.pie-fila strong { color: var(--muted); font-weight: 600; text-transform: uppercase; font-size: 10.5px; letter-spacing: .04em; margin-right: 3px; }
.pie-fuentes { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; font-size: 12px; }
.pie-fuentes strong { color: var(--muted); font-weight: 600; text-transform: uppercase; font-size: 10.5px; letter-spacing: .04em; }
.pie-fuentes a { color: var(--blue); text-decoration: none; }
.pie-fuentes a:hover { text-decoration: underline; }

.chip { font-size: 11px; padding: 2px 8px; border-radius: 999px; font-weight: 600; white-space: nowrap; }
.chip-exp { background: var(--teal-100); color: var(--teal-600); }
.chip-pub { background: var(--blue-50); color: var(--blue); }
.chip-syn { background: var(--violet-50); color: var(--violet); }
.sem-ok { background: var(--teal-50); color: var(--teal-600); }
.sem-warn { background: var(--amber-50); color: var(--amber); }
.sem-bad { background: var(--coral-50); color: var(--coral); }

.pill { font-size: 11px; color: var(--muted); }
.pill-soft { background: var(--line-soft); padding: 2px 8px; border-radius: 999px; margin-left: 6px; }
.muted { color: var(--muted); font-size: 12px; }
.vacio { color: var(--muted); font-size: 13px; }

.aviso { background: var(--teal-50); color: var(--teal-600); padding: 8px 12px; border-radius: 8px; font-size: 13px; }
.aviso-error { background: var(--coral-50); color: var(--coral); }

.modal-fondo { position: fixed; inset: 0; background: rgba(15, 36, 56, .45); display: grid; place-items: center; padding: 20px; z-index: 60; }
.modal { background: var(--panel); border-radius: var(--radius-lg); padding: 20px 22px; width: min(620px, 100%); max-height: 88vh; overflow: auto; box-shadow: var(--shadow-lg); }
.modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.modal-head h3 { font-family: var(--font-heading); margin: 0; font-size: 18px; }
.modal-pie { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }
.campo { display: grid; gap: 4px; margin-bottom: 12px; font-size: 13px; color: var(--ink-soft); }
.campo small { color: var(--muted); font-size: 11px; }
.campo input, .campo select, .campo textarea, .campo-rol select { border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; font: inherit; color: var(--ink); background: #fff; }
.fila { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.previa { background: #0f2438; color: #d8e5f0; padding: 12px 14px; border-radius: 10px; font-size: 12px; overflow-x: auto; white-space: pre; }

.btn { border: 1px solid var(--line); background: #fff; border-radius: 9px; padding: 8px 12px; font: inherit; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; color: var(--ink); }
.btn:hover { border-color: var(--teal); }
.btn-primary { background: var(--teal); border-color: var(--teal); color: #fff; }
.btn-primary:disabled { opacity: .6; cursor: default; }
.btn-ghost { background: transparent; }
.btn-sm { padding: 5px 9px; font-size: 12px; }

/* ---- Demo guiada: el flujo es el protagonista de la grabación ---- */
.demo-flow { margin: 24px 0 18px; border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 20px; background: linear-gradient(135deg, var(--panel), var(--line-soft)); box-shadow: var(--shadow-sm); }
.demo-flow-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; }
.demo-flow-head h2 { margin: 4px 0 5px; font-family: var(--font-heading); font-size: 21px; color: var(--ink); }
.demo-flow-head p { margin: 0; max-width: 66ch; color: var(--ink-soft); font-size: 13px; line-height: 1.5; }
.eyebrow { color: var(--violet); font-size: 10px; font-weight: 700; letter-spacing: .11em; }
.demo-launch { min-width: 170px; border: 0; border-radius: 12px; padding: 12px 16px; background: var(--violet); color: #fff; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; box-shadow: 0 8px 18px rgba(111, 68, 160, .22); }
.demo-launch:disabled { opacity: .7; cursor: default; }
.launch-dot { display: inline-block; width: 8px; height: 8px; margin-right: 7px; border-radius: 99px; background: #fff; }
.launch-dot.pulso { animation: flow-pulse 1s infinite; }
@keyframes flow-pulse { 50% { opacity: .3; transform: scale(.65); } }
.demo-config { display: grid; grid-template-columns: minmax(240px, 1fr) 130px 170px; gap: 10px; margin: 18px 0 13px; }
.demo-config label { display: grid; gap: 4px; font-size: 11px; color: var(--muted); font-weight: 600; }
.demo-config input { width: 100%; border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; background: var(--panel); color: var(--ink); font: inherit; font-size: 12px; }
.legend-flow { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; padding: 10px 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); font-size: 11px; font-weight: 600; }
.flow-det { color: var(--teal-600); }.flow-ext { color: var(--amber); }.flow-gen { color: var(--violet); }.flow-hint { margin-left: auto; color: var(--muted); font-weight: 400; }
.flow-run { margin-top: 15px; }
.flow-run-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; color: var(--ink); }
.flow-run-top strong { display: block; font-size: 13px; }.flow-run-top small { display: block; color: var(--muted); font-size: 11px; margin-top: 2px; }
.run-timer { text-transform: uppercase; letter-spacing: .06em; color: var(--muted); font-size: 10px; font-weight: 700; }.run-timer.running { color: var(--violet); }
.step-track { display: grid; grid-template-columns: repeat(9, minmax(112px, 1fr)); gap: 7px; overflow-x: auto; padding-bottom: 5px; }
.flow-step { position: relative; min-height: 114px; border: 1px solid var(--line); border-top: 3px solid var(--line); border-radius: 10px; padding: 9px; background: var(--panel); transition: transform .25s, box-shadow .25s, border-color .25s; }
.flow-step.flow-det { border-top-color: var(--teal); }.flow-step.flow-ext { border-top-color: var(--amber); }.flow-step.flow-gen { border-top-color: var(--violet); }
.flow-step.active { transform: translateY(-4px); box-shadow: 0 8px 18px rgba(61, 52, 78, .13); animation: step-glow 1.3s ease-in-out infinite alternate; }.flow-step.done { opacity: .82; }
@keyframes step-glow { to { box-shadow: 0 0 0 3px rgba(125, 83, 172, .12), 0 9px 20px rgba(61, 52, 78, .14); } }
.step-index { width: 22px; height: 22px; display: grid; place-items: center; border-radius: 7px; background: var(--line-soft); color: var(--ink-soft); font-size: 10px; font-weight: 700; }
.step-copy { display: grid; gap: 4px; margin-top: 7px; }.step-copy strong { font-size: 11px; line-height: 1.25; color: var(--ink); }.step-copy small { font-size: 9px; text-transform: uppercase; letter-spacing: .05em; }.step-copy em { color: var(--muted); font-size: 10px; line-height: 1.25; font-style: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.step-state { position: absolute; top: 10px; right: 9px; color: var(--muted); font-weight: 700; }.flow-step.done .step-state { color: var(--teal-600); }.flow-step.active .step-state { color: var(--violet); }.flow-step.failed .step-state { color: var(--coral); }
.flow-log { margin-top: 15px; border-top: 1px solid var(--line); padding-top: 10px; }.flow-log summary { cursor: pointer; color: var(--ink-soft); font-size: 12px; font-weight: 600; }.log-line { display: grid; grid-template-columns: 58px 150px 1fr; gap: 8px; align-items: baseline; padding: 6px 0; border-bottom: 1px solid var(--line-soft); font-size: 11px; }.log-line time { color: var(--muted); font-variant-numeric: tabular-nums; }.log-line p { margin: 0; color: var(--ink-soft); }
@media (max-width: 720px) { .demo-flow-head { flex-direction: column; }.demo-launch { width: 100%; }.demo-config { grid-template-columns: 1fr; }.flow-hint { width: 100%; margin-left: 0; }.step-track { grid-template-columns: repeat(9, 150px); }.log-line { grid-template-columns: 52px 1fr; }.log-line p { grid-column: 2; } }
</style>
