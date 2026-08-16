<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import Icon from '../Icon.vue'

interface MotionMetrics {
  total: number
  nanodrop: number
  aptas: number
  repetir: number
  promedio: number
  score: number
}

interface MorphologyTerm {
  text: string
  count: number
}

const props = defineProps<{
  metrics: MotionMetrics
  terms: MorphologyTerm[]
}>()

const paused = ref(false)
const activeSpecimen = ref(0)
const gallery = ref<HTMLElement | null>(null)

const aptRate = computed(() => Math.round(props.metrics.aptas / Math.max(1, props.metrics.total) * 100))
const repeatRate = computed(() => Math.round(props.metrics.repetir / Math.max(1, props.metrics.total) * 100))
const readRate = computed(() => Math.round(props.metrics.nanodrop / Math.max(1, props.metrics.total) * 100))
const phageCount = computed(() => Math.max(5, Math.min(11, Math.round(aptRate.value / 9))))
const bacteriaCount = computed(() => Math.max(3, Math.min(8, Math.round(repeatRate.value / 3) + 3)))
const dnaBases = computed(() => {
  const alphabet = ['A', 'T', 'G', 'C']
  return Array.from({ length: 13 }, (_, index) => ({
    left: alphabet[(index + Math.round(props.metrics.score)) % 4],
    right: alphabet[(index + Math.round(props.metrics.promedio)) % 4],
  }))
})
const gelLanes = computed(() =>
  Array.from({ length: 8 }, (_, index) => ({
    x: 48 + index * 36,
    bandOne: 72 + ((props.metrics.aptas + index * 19) % 118),
    bandTwo: 92 + ((props.metrics.nanodrop + index * 31) % 126),
    intensity: 0.42 + ((props.metrics.score + index * 7) % 50) / 100,
    positive: index < Math.max(1, Math.round(aptRate.value / 14)),
  })),
)
const colonySeeds = computed(() =>
  Array.from({ length: 18 }, (_, index) => ({
    x: 48 + ((index * 73 + props.metrics.total) % 245),
    y: 42 + ((index * 47 + props.metrics.aptas) % 175),
    radius: 3 + ((index * 11 + Math.round(props.metrics.score)) % 10),
    delay: `${(index % 8) * -0.42}s`,
    tone: index % 3,
  })),
)
const specimens = computed(() => [
  { label: 'Alta pureza', value: `${props.metrics.score.toFixed(0)}%`, tone: 'mint' },
  { label: 'Aptitud PCR', value: `${aptRate.value}%`, tone: 'cyan' },
  { label: 'Cobertura', value: `${readRate.value}%`, tone: 'violet' },
])

function cycleSpecimen() {
  activeSpecimen.value = (activeSpecimen.value + 1) % specimens.value.length
}

watch(paused, async (isPaused) => {
  await nextTick()
  gallery.value?.querySelectorAll<SVGSVGElement>('svg').forEach((svg) => {
    if (isPaused) svg.pauseAnimations()
    else svg.unpauseAnimations()
  })
})
</script>

<template>
  <section ref="gallery" class="motion-gallery" :class="{ paused }">
    <header class="motion-intro">
      <div>
        <span class="motion-kicker"><i /> LABORATORIO DE MOVIMIENTO</span>
        <h3>Experimentos que cuentan historias</h3>
        <p>
          Seis visualizaciones SVG creadas para FagoLab. No representan gráficas convencionales:
          son pequeñas escenas científicas alimentadas por la selección actual.
        </p>
      </div>
      <button type="button" class="motion-toggle" :aria-pressed="paused" @click="paused = !paused">
        <Icon :name="paused ? 'activity' : 'minus-circle'" :size="15" />
        {{ paused ? 'Reanudar laboratorio' : 'Pausar movimiento' }}
      </button>
    </header>

    <div class="motion-grid">
      <article class="motion-card phage-card">
        <div class="motion-copy">
          <span>SIMULACIÓN 01 · FAGOTERAPIA</span>
          <h4>Asalto bacteriófago</h4>
          <p>Los fagos localizan, se adhieren e inyectan material genético sobre una colonia bacteriana.</p>
        </div>
        <div class="scene-stat">
          <b>{{ phageCount }}</b><span>fagos activos</span>
        </div>
        <svg viewBox="0 0 420 300" role="img" aria-label="Bacteriófagos animados atacando bacterias">
          <defs>
            <radialGradient id="phage-field" cx="50%" cy="45%">
              <stop offset="0" stop-color="#173e42" />
              <stop offset="1" stop-color="#071f28" />
            </radialGradient>
            <filter id="phage-glow"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <path id="orbit-a" d="M30 170C92 22 332 16 390 160S300 288 176 276 12 238 30 170Z" />
          </defs>
          <rect width="420" height="300" rx="26" fill="url(#phage-field)" />
          <g class="microscope-grid" opacity=".18">
            <path v-for="n in 8" :key="`v${n}`" :d="`M${n * 52} 0V300`" />
            <path v-for="n in 6" :key="`h${n}`" :d="`M0 ${n * 50}H420`" />
          </g>
          <g class="bacterium bacterium-main">
            <rect x="142" y="112" width="138" height="72" rx="36" fill="#de6c72" />
            <rect x="149" y="119" width="124" height="58" rx="29" fill="#f28e8f" opacity=".72" />
            <path d="M164 145c18-22 42 22 58 0s30-7 38 5" fill="none" stroke="#8f344c" stroke-width="5" stroke-linecap="round" />
            <circle v-for="n in 9" :key="n" :cx="157 + (n * 13) % 105" :cy="128 + (n * 17) % 38" r="2.4" fill="#ffe8d8" opacity=".72" />
            <circle class="lysis-wave" cx="211" cy="148" r="42" fill="none" stroke="#ffcf91" stroke-width="2" />
          </g>
          <g v-for="n in bacteriaCount" :key="`bac${n}`" class="bacterium-minor" :transform="`translate(${30 + (n * 67) % 340} ${38 + (n * 83) % 215}) rotate(${n * 27})`">
            <rect x="-18" y="-8" width="36" height="16" rx="8" fill="#b64d61" opacity=".48" />
          </g>
          <g v-for="n in phageCount" :key="`phage${n}`" class="phage-unit" :style="{ '--delay': `${-n * .67}s` }">
            <animateMotion :dur="`${5.8 + n * .15}s`" repeatCount="indefinite" rotate="auto">
              <mpath href="#orbit-a" />
            </animateMotion>
            <polygon points="0,-11 9,-5 9,5 0,11 -9,5 -9,-5" fill="#79e4c4" stroke="#d8fff2" stroke-width="1" filter="url(#phage-glow)" />
            <path d="M0 11v15m-8 9 8-9 8 9M0 26l-12 5m12-5 12 5" fill="none" stroke="#8af0d1" stroke-width="2" stroke-linecap="round" />
          </g>
          <g class="injection" transform="translate(210 85)">
            <path d="M0 0v38" stroke="#fff1a8" stroke-width="2" stroke-dasharray="4 5" />
            <circle cx="0" cy="38" r="3" fill="#fff1a8" />
          </g>
          <text x="24" y="274" fill="#77cbb8" font-size="10" letter-spacing="2">INFECTION CYCLE · {{ aptRate }}% RESPONSE</text>
        </svg>
      </article>

      <article class="motion-card dna-card">
        <div class="motion-copy">
          <span>SIMULACIÓN 02 · IDENTIDAD MOLECULAR</span>
          <h4>Escáner de doble hélice</h4>
          <p>Una lectura molecular estilizada que recorre pares de bases y resalta regiones de interés.</p>
        </div>
        <div class="dna-readout">
          <small>SECUENCIA</small><b>16S rRNA</b><em>{{ props.metrics.score.toFixed(0) }}% integridad</em>
        </div>
        <svg viewBox="0 0 420 300" role="img" aria-label="Doble hélice de ADN animada">
          <defs>
            <linearGradient id="dna-bg" x1="0" x2="1" y1="0" y2="1">
              <stop stop-color="#eef1ff" />
              <stop offset="1" stop-color="#e5fbf8" />
            </linearGradient>
            <linearGradient id="helix-a" x1="0" x2="1"><stop stop-color="#725ce0" /><stop offset="1" stop-color="#3ab8b1" /></linearGradient>
            <filter id="dna-soft"><feGaussianBlur stdDeviation="5" /></filter>
          </defs>
          <rect width="420" height="300" rx="26" fill="url(#dna-bg)" />
          <path d="M65 24C350 56 82 110 350 145S80 238 357 278" fill="none" stroke="#6d5bd0" stroke-width="7" stroke-linecap="round" opacity=".9" />
          <path d="M350 24C75 58 340 109 68 148S340 237 62 278" fill="none" stroke="#28a9a2" stroke-width="7" stroke-linecap="round" opacity=".86" />
          <g class="base-pairs">
            <g v-for="(base, index) in dnaBases" :key="index" :transform="`translate(0 ${31 + index * 19})`">
              <line :x1="100 + Math.sin(index * .9) * 42" :x2="315 - Math.sin(index * .9) * 42" y1="0" y2="0" stroke="#99a5c9" stroke-width="2" stroke-dasharray="3 3" />
              <circle :cx="100 + Math.sin(index * .9) * 42" cy="0" r="8" :fill="index % 2 ? '#7b68de' : '#4cbeb6'" />
              <circle :cx="315 - Math.sin(index * .9) * 42" cy="0" r="8" :fill="index % 2 ? '#4cbeb6' : '#7b68de'" />
              <text :x="100 + Math.sin(index * .9) * 42" y="3" fill="white" font-size="7" text-anchor="middle">{{ base.left }}</text>
              <text :x="315 - Math.sin(index * .9) * 42" y="3" fill="white" font-size="7" text-anchor="middle">{{ base.right }}</text>
            </g>
          </g>
          <rect class="dna-scanner" x="46" y="20" width="328" height="28" rx="14" fill="#73efd0" opacity=".16" />
          <line class="dna-scan-line" x1="48" x2="372" y1="34" y2="34" stroke="#20a889" stroke-width="2" filter="url(#dna-soft)" />
          <g class="sequence-code" fill="#51627e" font-size="8" font-family="monospace">
            <text x="18" y="38">001</text><text x="18" y="101">064</text><text x="18" y="164">128</text><text x="18" y="227">192</text>
          </g>
        </svg>
      </article>

      <article class="motion-card gel-card">
        <div class="motion-copy">
          <span>SIMULACIÓN 03 · ELECTROFORESIS</span>
          <h4>Gel fluorescente vivo</h4>
          <p>Las bandas migran y se revelan como una lectura nocturna de las muestras amplificadas.</p>
        </div>
        <div class="gel-legend"><i /> {{ Math.max(1, Math.round(aptRate / 14)) }} carriles positivos</div>
        <svg viewBox="0 0 420 300" role="img" aria-label="Gel de electroforesis con bandas fluorescentes animadas">
          <defs>
            <radialGradient id="gel-bg"><stop stop-color="#122f51" /><stop offset="1" stop-color="#061525" /></radialGradient>
            <filter id="band-glow"><feGaussianBlur stdDeviation="5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          <rect width="420" height="300" rx="26" fill="url(#gel-bg)" />
          <rect x="42" y="38" width="316" height="218" rx="14" fill="#0c2742" stroke="#315a79" stroke-width="2" />
          <rect x="52" y="48" width="296" height="198" rx="8" fill="#0b1d36" opacity=".9" />
          <g v-for="lane in gelLanes" :key="lane.x">
            <rect :x="lane.x" y="52" width="22" height="185" rx="5" fill="#4b78a0" opacity=".07" />
            <rect :x="lane.x + 2" y="57" width="18" height="8" rx="2" fill="#50f2db" opacity=".28" />
            <rect class="gel-band primary-band" :x="lane.x" :y="lane.bandOne" width="22" height="5" rx="2.5" :fill="lane.positive ? '#79ffe2' : '#69a7ff'" :opacity="lane.intensity" filter="url(#band-glow)" />
            <rect class="gel-band secondary-band" :x="lane.x + 3" :y="lane.bandTwo" width="16" height="4" rx="2" fill="#b985ff" :opacity="lane.intensity * .72" filter="url(#band-glow)" />
            <text :x="lane.x + 11" y="275" text-anchor="middle" fill="#668aa8" font-size="8">{{ (lane.x - 12) / 36 }}</text>
          </g>
          <path class="electric-wave" d="M24 24h54l12 8 18-16 16 16 20-8h252" fill="none" stroke="#50e4d1" stroke-width="2" stroke-dasharray="7 8" opacity=".48" />
          <text x="43" y="25" fill="#68d7cc" font-size="9" letter-spacing="1.6">120 V · PCR-16S · UV TRANSILLUMINATOR</text>
        </svg>
      </article>

      <article class="motion-card micro-card">
        <div class="motion-copy">
          <span>SIMULACIÓN 04 · MICROFLUÍDICA</span>
          <h4>Clasificador de muestras</h4>
          <p>Partículas digitales recorren canales y se separan según la decisión de calidad.</p>
        </div>
        <div class="flow-values">
          <span><i class="mint" />{{ aptRate }}%</span>
          <span><i class="amber" />{{ 100 - aptRate - repeatRate }}%</span>
          <span><i class="coral" />{{ repeatRate }}%</span>
        </div>
        <svg viewBox="0 0 420 300" role="img" aria-label="Chip microfluídico animado clasificando muestras">
          <defs>
            <linearGradient id="micro-bg" x1="0" x2="1"><stop stop-color="#f2faf8" /><stop offset="1" stop-color="#e8f2fb" /></linearGradient>
            <filter id="drop-glow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <path id="flow-in" d="M18 150H188" />
            <path id="flow-good" d="M188 150C235 150 222 65 285 65H400" />
            <path id="flow-review" d="M188 150H400" />
            <path id="flow-repeat" d="M188 150C235 150 222 235 285 235H400" />
          </defs>
          <rect width="420" height="300" rx="26" fill="url(#micro-bg)" />
          <g class="chip-traces" fill="none" stroke-linecap="round">
            <path d="M18 150H188" stroke="#75aeb9" stroke-width="24" opacity=".18" />
            <path d="M188 150C235 150 222 65 285 65H400" stroke="#2bb18a" stroke-width="24" opacity=".18" />
            <path d="M188 150H400" stroke="#d49a3d" stroke-width="24" opacity=".18" />
            <path d="M188 150C235 150 222 235 285 235H400" stroke="#da676c" stroke-width="24" opacity=".18" />
            <path d="M18 150H188M188 150C235 150 222 65 285 65H400M188 150H400M188 150C235 150 222 235 285 235H400" stroke="#fff" stroke-width="12" opacity=".82" />
          </g>
          <g v-for="n in 7" :key="`in${n}`" class="flow-drop" :style="{ '--delay': `${-n * .48}s` }">
            <circle r="6" fill="#3e9eb4" filter="url(#drop-glow)" />
            <animateMotion dur="3.4s" repeatCount="indefinite"><mpath href="#flow-in" /></animateMotion>
          </g>
          <g v-for="n in 5" :key="`good${n}`" class="flow-drop">
            <circle r="6" fill="#25ad84" />
            <animateMotion :begin="`${n * -.72}s`" dur="3.6s" repeatCount="indefinite"><mpath href="#flow-good" /></animateMotion>
          </g>
          <g v-for="n in 3" :key="`review${n}`" class="flow-drop">
            <circle r="6" fill="#d79b3e" />
            <animateMotion :begin="`${n * -1.1}s`" dur="4s" repeatCount="indefinite"><mpath href="#flow-review" /></animateMotion>
          </g>
          <g v-for="n in 2" :key="`repeat${n}`" class="flow-drop">
            <circle r="6" fill="#d96369" />
            <animateMotion :begin="`${n * -1.6}s`" dur="4.2s" repeatCount="indefinite"><mpath href="#flow-repeat" /></animateMotion>
          </g>
          <circle cx="188" cy="150" r="27" fill="#fff" stroke="#5aa4a8" stroke-width="3" />
          <circle class="sorter-core" cx="188" cy="150" r="13" fill="#53c7b4" opacity=".74" />
          <text x="312" y="49" fill="#24866d" font-size="9" font-weight="700">APTA PCR</text>
          <text x="312" y="134" fill="#a57224" font-size="9" font-weight="700">REVISIÓN</text>
          <text x="312" y="219" fill="#ad4f54" font-size="9" font-weight="700">REPETIR</text>
        </svg>
      </article>

      <article class="motion-card growth-card">
        <div class="motion-copy">
          <span>SIMULACIÓN 05 · CULTIVO</span>
          <h4>Incubación en cámara rápida</h4>
          <p>Una placa comienza casi vacía y desarrolla morfotipos con ritmos y halos diferentes.</p>
        </div>
        <div class="growth-clock"><i /> 24 h virtuales</div>
        <svg viewBox="0 0 420 300" role="img" aria-label="Crecimiento animado de colonias en una caja Petri">
          <defs>
            <radialGradient id="agar-motion"><stop stop-color="#fffdf2" /><stop offset=".72" stop-color="#e9efc9" /><stop offset="1" stop-color="#cbd5a6" /></radialGradient>
            <filter id="colony-shadow"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity=".2" /></filter>
          </defs>
          <rect width="420" height="300" rx="26" fill="#eff3df" />
          <circle cx="210" cy="151" r="124" fill="#fff" stroke="#a9b591" stroke-width="3" filter="url(#colony-shadow)" />
          <circle cx="210" cy="151" r="112" fill="url(#agar-motion)" stroke="#fff" stroke-width="2" />
          <path d="M122 94c39-47 117-57 176-21" fill="none" stroke="white" stroke-width="9" stroke-linecap="round" opacity=".7" />
          <g v-for="seed in colonySeeds" :key="`${seed.x}-${seed.y}`" class="growing-colony" :style="{ '--delay': seed.delay }">
            <circle :cx="seed.x + 48" :cy="seed.y + 20" :r="seed.radius + 6" :fill="seed.tone === 0 ? '#f3cd73' : seed.tone === 1 ? '#e88f8f' : '#92cdb2'" opacity=".12" />
            <circle :cx="seed.x + 48" :cy="seed.y + 20" :r="seed.radius" :fill="seed.tone === 0 ? '#dba848' : seed.tone === 1 ? '#cf686b' : '#4ba47e'" stroke="#fff8dc" stroke-width="1.5" />
          </g>
          <circle class="incubator-ring" cx="210" cy="151" r="118" fill="none" stroke="#55a987" stroke-width="3" stroke-dasharray="16 14" />
          <text x="210" y="286" text-anchor="middle" fill="#718066" font-size="9" letter-spacing="1.4">{{ props.terms.slice(0, 4).map(t => t.text).join(' · ').toUpperCase() }}</text>
        </svg>
      </article>

      <article class="motion-card organism-card" @click="cycleSpecimen">
        <div class="motion-copy">
          <span>SIMULACIÓN 06 · SANIDAD ACUÍCOLA</span>
          <h4>Mapa terapéutico vivo</h4>
          <p>Un pez digital conecta focos bacterianos con pulsos de tratamiento y respuesta molecular.</p>
        </div>
        <button type="button" class="specimen-readout" @click.stop="cycleSpecimen">
          <span>{{ specimens[activeSpecimen].label }}</span>
          <b>{{ specimens[activeSpecimen].value }}</b>
          <Icon name="refresh" :size="13" />
        </button>
        <svg viewBox="0 0 420 300" role="img" aria-label="Pez animado con focos bacterianos y pulsos de fagoterapia">
          <defs>
            <linearGradient id="fish-bg" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#e4f6f5" /><stop offset="1" stop-color="#dceaf5" /></linearGradient>
            <linearGradient id="fish-body" x1="0" x2="1"><stop stop-color="#2a918e" /><stop offset="1" stop-color="#58b9a4" /></linearGradient>
            <filter id="fish-glow"><feGaussianBlur stdDeviation="5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          <rect width="420" height="300" rx="26" fill="url(#fish-bg)" />
          <g class="water-lines" fill="none" stroke="#72b7c0" opacity=".22">
            <path d="M0 52c45-20 70 20 115 0s70 20 115 0 70 20 115 0 70 20 115 0" />
            <path d="M0 250c45-20 70 20 115 0s70 20 115 0 70 20 115 0 70 20 115 0" />
          </g>
          <g class="fish">
            <path d="M75 155c49-72 162-94 242-28 23-18 48-28 76-24-17 25-22 45-1 78-30 3-53-7-75-25-73 65-191 66-242-1Z" fill="url(#fish-body)" />
            <path d="M166 102c28-31 61-39 84-42-10 26-14 40-8 55" fill="#237e82" opacity=".76" />
            <path d="M175 205c20 24 43 30 66 34-8-23-9-36-1-51" fill="#237e82" opacity=".66" />
            <circle cx="119" cy="132" r="9" fill="#e8fffa" /><circle cx="119" cy="132" r="4" fill="#173d4c" />
            <path d="M90 164c16 8 29 8 43 0" fill="none" stroke="#176369" stroke-width="3" stroke-linecap="round" />
            <path d="M155 113c28 34 28 71 1 97M188 99c24 36 25 74 1 111M224 95c22 36 23 73 2 107" fill="none" stroke="#9be0cf" stroke-width="2" opacity=".5" />
          </g>
          <g v-for="(pos, index) in [[171,140],[231,167],[278,127],[201,188]]" :key="index" class="infection-focus">
            <circle :cx="pos[0]" :cy="pos[1]" r="7" fill="#de646a" filter="url(#fish-glow)" />
            <circle class="focus-wave" :cx="pos[0]" :cy="pos[1]" r="14" fill="none" stroke="#e66c72" stroke-width="2" :style="{ '--delay': `${index * -.55}s` }" />
          </g>
          <g class="therapy-pulses">
            <path d="M25 72C105 53 119 119 171 140" fill="none" stroke="#6f67da" stroke-width="2" stroke-dasharray="5 7" />
            <path d="M390 42C326 51 306 91 278 127" fill="none" stroke="#6f67da" stroke-width="2" stroke-dasharray="5 7" />
            <circle r="6" fill="#796de3"><animateMotion dur="3s" repeatCount="indefinite" path="M25 72C105 53 119 119 171 140" /></circle>
            <circle r="6" fill="#796de3"><animateMotion begin="-1.4s" dur="3.5s" repeatCount="indefinite" path="M390 42C326 51 306 91 278 127" /></circle>
          </g>
          <g transform="translate(34 231)">
            <circle cx="0" cy="0" r="18" fill="#fff" opacity=".74" />
            <path d="M0-9a7 7 0 110 14 7 7 0 010-14Zm0 14v10m-6 7 6-7 6 7" fill="none" stroke="#7164d8" stroke-width="2" />
          </g>
          <text x="62" y="236" fill="#4a6c7a" font-size="9" font-weight="700">PHAGE RESPONSE ACTIVE</text>
        </svg>
      </article>
    </div>

    <footer class="motion-footer">
      <div><i class="live-dot" /><span>Escenas sincronizadas con {{ props.metrics.total.toLocaleString('es-MX') }} registros</span></div>
      <p>Diseñadas con SVG, CSS y datos de FagoLab. Sin videos ni imágenes prerenderizadas.</p>
    </footer>
  </section>
</template>

<style scoped>
.motion-gallery {
  --motion-ink: #153a48;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.motion-intro {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 30px;
  padding: 26px 28px;
  overflow: hidden;
  border: 1px solid rgba(32, 134, 112, .16);
  border-radius: 24px;
  background:
    radial-gradient(circle at 86% 22%, rgba(77, 218, 175, .18), transparent 23%),
    linear-gradient(115deg, #f8f4e9, #edf8f5 58%, #e8f3f6);
}
.motion-intro > div { max-width: 740px; }
.motion-kicker {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #238169;
  font-size: .64rem;
  font-weight: 900;
  letter-spacing: .15em;
}
.motion-kicker i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #37b88f;
  box-shadow: 0 0 0 5px rgba(55, 184, 143, .11);
}
.motion-intro h3 {
  margin-top: 10px;
  color: var(--motion-ink);
  font-size: clamp(1.65rem, 3vw, 2.5rem);
}
.motion-intro p {
  margin: 10px 0 0;
  color: #61777c;
  font-size: .78rem;
  line-height: 1.65;
}
.motion-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: none;
  padding: 10px 13px;
  border: 1px solid rgba(35, 129, 105, .18);
  border-radius: 12px;
  color: #287963;
  background: rgba(255,255,255,.72);
  font-size: .68rem;
  font-weight: 900;
}
.motion-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.motion-card {
  position: relative;
  min-width: 0;
  min-height: 470px;
  overflow: hidden;
  border: 1px solid rgba(29, 76, 88, .12);
  border-radius: 26px;
  background: #fff;
  box-shadow: 0 18px 46px rgba(15, 53, 65, .09);
  transition: transform .3s ease, box-shadow .3s ease;
}
.motion-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 26px 60px rgba(15, 53, 65, .14);
}
.motion-card > svg {
  position: absolute;
  inset: auto 0 0;
  width: 100%;
  height: auto;
  display: block;
}
.motion-copy {
  position: relative;
  z-index: 4;
  max-width: 72%;
  padding: 22px 24px 0;
}
.motion-copy span {
  color: #26826d;
  font-size: .57rem;
  font-weight: 900;
  letter-spacing: .13em;
}
.motion-copy h4 {
  margin: 6px 0 0;
  color: var(--motion-ink);
  font-family: var(--font-heading);
  font-size: 1.24rem;
}
.motion-copy p {
  margin: 7px 0 0;
  color: #6a7d83;
  font-size: .7rem;
  line-height: 1.5;
}
.scene-stat,
.dna-readout,
.gel-legend,
.growth-clock,
.specimen-readout {
  position: absolute;
  z-index: 5;
  top: 22px;
  right: 22px;
}
.scene-stat { display: flex; align-items: baseline; gap: 5px; color: #83e8cb; }
.scene-stat b { font-size: 1.65rem; }
.scene-stat span { max-width: 42px; font-size: .55rem; line-height: 1.1; }
.phage-card .motion-copy h4 { color: #f4fffc; }
.phage-card .motion-copy p { color: #93b9b5; }
.phage-card .motion-copy span { color: #71d8bd; }
.microscope-grid path { stroke: #5bb7a8; stroke-width: 1; }
.bacterium-main { transform-origin: 211px 148px; animation: bacteria-breathe 3.2s ease-in-out infinite; }
.lysis-wave { transform-origin: 211px 148px; animation: lysis 2.6s ease-out infinite; }
.bacterium-minor { animation: bacterial-drift 5s ease-in-out infinite alternate; }
.injection { animation: inject 1.6s ease-in-out infinite; }
.dna-readout {
  display: flex;
  align-items: flex-end;
  flex-direction: column;
  color: #5d589a;
}
.dna-readout small { font-size: .5rem; letter-spacing: .12em; }
.dna-readout b { font-size: .85rem; }
.dna-readout em { margin-top: 2px; color: #6d8294; font-size: .55rem; font-style: normal; }
.dna-scanner,
.dna-scan-line { animation: dna-scan 4s ease-in-out infinite; }
.base-pairs > g { animation: base-pulse 2.6s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: center; }
.gel-card .motion-copy h4 { color: #eef9ff; }
.gel-card .motion-copy p { color: #7897b3; }
.gel-card .motion-copy span { color: #5edacb; }
.gel-legend { display: flex; align-items: center; gap: 6px; color: #70d8ce; font-size: .58rem; font-weight: 800; }
.gel-legend i { width: 7px; height: 7px; border-radius: 50%; background: #73ffe2; box-shadow: 0 0 10px #73ffe2; }
.primary-band { animation: band-shimmer 2.8s ease-in-out infinite; }
.secondary-band { animation: band-shimmer 3.7s -1.2s ease-in-out infinite; }
.electric-wave { animation: dash-flow 3s linear infinite; }
.flow-values {
  position: absolute;
  z-index: 5;
  top: 24px;
  right: 22px;
  display: flex;
  gap: 8px;
}
.flow-values span { display: flex; align-items: center; gap: 3px; color: #57717a; font-size: .56rem; font-weight: 900; }
.flow-values i { width: 6px; height: 6px; border-radius: 50%; }
.flow-values .mint { background: #28ae86; }
.flow-values .amber { background: #d49a3d; }
.flow-values .coral { background: #d96369; }
.sorter-core { transform-origin: 188px 150px; animation: sorter 1.7s ease-in-out infinite; }
.growth-clock { display: flex; align-items: center; gap: 6px; color: #778368; font-size: .58rem; font-weight: 900; }
.growth-clock i { width: 9px; height: 9px; border: 2px solid #6ca788; border-top-color: transparent; border-radius: 50%; animation: rotate 1.3s linear infinite; }
.growing-colony { transform-box: fill-box; transform-origin: center; animation: colony-grow 4.6s var(--delay) ease-in-out infinite; }
.incubator-ring { transform-origin: 210px 151px; animation: rotate 20s linear infinite; }
.organism-card { cursor: pointer; }
.specimen-readout {
  display: grid;
  min-width: 106px;
  grid-template-columns: 1fr auto;
  gap: 0 8px;
  padding: 8px 10px;
  border: 1px solid rgba(42, 126, 125, .15);
  border-radius: 12px;
  color: #2f6e73;
  background: rgba(255,255,255,.7);
  text-align: left;
}
.specimen-readout span { font-size: .5rem; font-weight: 800; }
.specimen-readout b { grid-row: 2; font-size: .98rem; }
.specimen-readout svg { grid-column: 2; grid-row: 1 / 3; align-self: center; }
.fish { transform-origin: 220px 150px; animation: fish-swim 4s ease-in-out infinite; }
.focus-wave { transform-box: fill-box; transform-origin: center; animation: focus-pulse 2.3s var(--delay) ease-out infinite; }
.water-lines path { animation: dash-flow 7s linear infinite; stroke-dasharray: 16 10; }
.motion-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 12px 4px 0;
  color: #738489;
  font-size: .63rem;
}
.motion-footer div { display: flex; align-items: center; gap: 8px; }
.motion-footer p { margin: 0; }
.live-dot { width: 7px; height: 7px; border-radius: 50%; background: #31b58b; box-shadow: 0 0 0 4px rgba(49,181,139,.12); animation: live 1.5s ease-in-out infinite; }
.paused :deep(*) {
  animation-play-state: paused !important;
}
@keyframes bacteria-breathe { 50% { transform: scale(1.035); } }
@keyframes lysis { 0% { transform: scale(.2); opacity: .8; } 100% { transform: scale(2.4); opacity: 0; } }
@keyframes bacterial-drift { to { transform: translate(5px, -6px); } }
@keyframes inject { 50% { opacity: .25; transform: translateY(10px); } }
@keyframes dna-scan { 0%,100% { transform: translateY(0); } 50% { transform: translateY(230px); } }
@keyframes base-pulse { to { opacity: .62; transform: scale(.96); } }
@keyframes band-shimmer { 50% { opacity: 1; transform: scaleX(1.15); transform-origin: center; } }
@keyframes dash-flow { to { stroke-dashoffset: -70; } }
@keyframes sorter { 50% { transform: scale(1.28); opacity: .42; } }
@keyframes colony-grow { 0%,100% { transform: scale(.15); opacity: .2; } 62%,82% { transform: scale(1); opacity: 1; } }
@keyframes rotate { to { transform: rotate(360deg); } }
@keyframes fish-swim { 50% { transform: translateX(8px) rotate(1deg); } }
@keyframes focus-pulse { from { transform: scale(.2); opacity: .9; } to { transform: scale(2.3); opacity: 0; } }
@keyframes live { 50% { opacity: .35; } }
@media (prefers-reduced-motion: reduce) {
  .motion-gallery :deep(*) { animation: none !important; }
}
@media (max-width: 940px) {
  .motion-grid { grid-template-columns: 1fr; }
  .motion-card { min-height: 500px; }
}
@media (max-width: 620px) {
  .motion-intro { align-items: flex-start; flex-direction: column; padding: 22px; }
  .motion-card { min-height: 430px; }
  .motion-copy { max-width: 75%; padding: 18px 18px 0; }
  .motion-copy p { display: none; }
  .scene-stat,
  .dna-readout,
  .gel-legend,
  .flow-values,
  .growth-clock,
  .specimen-readout { top: 18px; right: 16px; }
  .motion-footer { align-items: flex-start; flex-direction: column; }
}
</style>
