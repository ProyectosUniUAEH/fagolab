<script setup lang="ts">
import { computed, ref } from 'vue'
import Icon from '../components/Icon.vue'
import { useLabStore } from '../stores/lab'

/* ------------------------------------------------------------------ *
 * Sección informativa del proyecto (landing interna).
 * Solo contenido explicativo y de trazabilidad — sin datos experimentales.
 * Fuente: contexto_proyecto_medios_fagoterapia.md
 * ------------------------------------------------------------------ */

const lab = useLabStore()

// Foto real opcional del hero. Si colocas un archivo en `public/hero-peces.jpg`
// (o cambias la ruta a .png), se usa automáticamente; si no existe (404), el
// `@error` cae a la ilustración SVG. Se enlaza con :src para que Vite no intente
// resolverlo como import estático en build.
// Hero: foto de portada (bacteriófagos atacando una bacteria)
const heroFotoSrc = '/portada.jpg'
const heroVideoSrc = '/video/acerca-portada.mp4'

// "Resumen del proyecto": objetivo en banda horizontal + 3 secciones con foto.
// Las fotos viven en public/proyecto/ (ver README ahí). Si una foto falta (404),
// `@error` activa el fallback: el bloque tintado con su icono.
const objetivo = {
  titulo: 'Una alternativa biotecnológica frente a la resistencia microbiana',
  texto:
    'Evaluar la fagoterapia como una alternativa biotecnológica para el control de patógenos bacterianos de importancia en la producción agrícola, considerando que la resistencia microbiana representa un reto creciente no solo para la salud humana, sino también para el sector pecuario. Esta problemática puede generar pérdidas económicas, afectar la sanidad animal y comprometer la seguridad alimentaria en el estado de Hidalgo.',
  img: '/proyecto/objetivo.webp',
}

const secciones = computed(() => [
  {
    key: 'enfoque',
    icon: 'microscope',
    titulo: 'Enfoque',
    texto:
      'Bacterias de importancia acuícola: Aeromonas spp., Vibrio spp., Pseudomonas spp., Staphylococcus spp. y Gram negativas.',
    tint: 'violet',
    img: '/proyecto/enfoque.png',
  },
  {
    key: 'impacto',
    icon: 'shield',
    titulo: 'Impacto',
    texto:
      'Apoya la fagoterapia y el control de patógenos para una mejor sanidad acuícola y trazabilidad de cada muestra.',
    tint: 'blue',
    img: '/proyecto/impacto.webp',
  },
  {
    key: 'trazabilidad',
    icon: 'activity',
    titulo: 'Trazabilidad activa',
    texto: `${lab.kpis.cajas} cajas · ${lab.kpis.viales} viales · ${lab.kpis.nanodrop} lecturas registradas en el sistema.`,
    tint: 'teal',
    img: '/proyecto/trazabilidad.webp',
  },
])

// Control de fallback de imágenes: marca qué fotos fallaron al cargar.
const imgError = ref<Record<string, boolean>>({})
function onImgError(key: string) {
  imgError.value[key] = true
}

// Institución y sede del proyecto. Imágenes en public/sede/ (logo con tratamiento
// "contain"; fotos con "cover"; el laboratorio sin foto usa icono de acento).
const institucion = {
  descripcion: 'Este proyecto se desarrolla en la Universidad Autónoma del Estado de Hidalgo, dentro del Instituto de Ciencias Agropecuarias, ICAP, en el edificio de Veterinaria, específicamente en el Laboratorio de Genética y Genómica.',
  sedes: [
    { key: 'universidad', label: 'Universidad', nombre: 'Universidad Autónoma del Estado de Hidalgo', tipo: 'logo', img: '/sede/universidad.webp' },
    { key: 'instituto', label: 'Instituto', nombre: 'Instituto de Ciencias Agropecuarias (ICAP)', tipo: 'foto', img: '/sede/icap.jpg' },
    { key: 'edificio', label: 'Edificio', nombre: 'Edificio de Veterinaria · Hospital Veterinario', tipo: 'foto', img: '/sede/veterinaria.jpg' },
    { key: 'laboratorio', label: 'Laboratorio', nombre: 'Laboratorio de Genética y Genómica', tipo: 'icono', icon: 'dna' },
  ] as { key: string; label: string; nombre: string; tipo: 'logo' | 'foto' | 'icono'; img?: string; icon?: string }[],
}

// Flujo de trabajo (5 fases de alto nivel) — con iconos PNG
const flujo = [
  { icono: '/iconos/muestreo.png', nombre: 'Muestreo', sub: 'Recolección y registro de muestras por lote, pez, órgano y origen del muestreo.', tint: 'teal' },
  { icono: '/iconos/aislamiento.png', nombre: 'Aislamiento', sub: 'Siembra en medios de cultivo, obtención de colonias y descripción macroscópica inicial.', tint: 'aqua' },
  { icono: '/iconos/caracterizacion.png', nombre: 'Caracterización', sub: 'Subcultivo, purificación de colonias y observación de características fenotípicas.', tint: 'blue' },
  { icono: '/iconos/biologia-molecular.png', nombre: 'Biología molecular', sub: 'Extracción de ADN, cuantificación por NanoDrop, PCR y análisis por electroforesis.', tint: 'violet' },
  { icono: '/iconos/analisis-reportes.png', nombre: 'Análisis & Reportes', sub: 'Integración de resultados, trazabilidad de muestras, identificación molecular y generación de reportes.', tint: 'coral' },
]

// Leyenda de tipos de medio (chips de color)
type TipoMedio = 'Nutritivo' | 'Selectivo' | 'Diferencial' | 'Enriquecido'
const tipoClase: Record<TipoMedio, string> = {
  Nutritivo: 'b-teal',
  Selectivo: 'b-blue',
  Diferencial: 'b-violet',
  Enriquecido: 'b-amber',
}
// Color base de cada tipo para la leyenda (punto + nombre).
const tipoColor: Record<TipoMedio, string> = {
  Nutritivo: 'teal',
  Selectivo: 'blue',
  Diferencial: 'violet',
  Enriquecido: 'amber',
}
const leyenda: { tipo: TipoMedio; desc: string }[] = [
  { tipo: 'Nutritivo', desc: 'Medio general: recupera un amplio rango de microorganismos.' },
  { tipo: 'Selectivo', desc: 'Inhibe flora acompañante para favorecer un grupo objetivo.' },
  { tipo: 'Diferencial', desc: 'Distingue colonias por reacciones visibles (color, hemólisis...).' },
  { tipo: 'Enriquecido', desc: 'Aporta nutrientes extra para bacterias exigentes.' },
]

// Medios de cultivo principales (con fotos reales).
const medios: {
  abrev: string
  nombre: string
  objetivo: string
  tipos: TipoMedio[]
  texto: string
  imagen: string
}[] = [
  {
    abrev: 'TSA',
    nombre: 'Agar TSA (Tryptic Soy)',
    objetivo: 'Amplio rango · uso general',
    tipos: ['Nutritivo'],
    texto:
      'Medio de crecimiento general. Sirve para recuperar colonias variadas y mantener cultivos, pero no selecciona un grupo específico.',
    imagen: '/medios/medio-1.png',
  },
  {
    abrev: 'TCBS',
    nombre: 'Agar TCBS',
    objetivo: 'Vibrio spp.',
    tipos: ['Selectivo', 'Diferencial'],
    texto:
      'Usado para aislamiento presuntivo de Vibrio, asociadas a ambientes acuáticos y peces. Diferencia colonias por fermentación de sacarosa y cambios de color.',
    imagen: '/medios/medio-2.png',
  },
  {
    abrev: 'MacConkey',
    nombre: 'Agar MacConkey',
    objetivo: 'Gram negativas · enterobacterias',
    tipos: ['Selectivo', 'Diferencial'],
    texto:
      'Inhibe muchas Gram positivas y diferencia Gram negativas fermentadoras y no fermentadoras de lactosa. Apoya la búsqueda de bacterias entéricas o ambientales.',
    imagen: '/medios/medio-3.png',
  },
  {
    abrev: 'Pseudomonas',
    nombre: 'Agar Pseudomonas (cetrimida)',
    objetivo: 'Pseudomonas spp.',
    tipos: ['Selectivo'],
    texto:
      'Orienta el aislamiento de Pseudomonas. En el Excel actual también pueden crecer en TSA, Sangre o MacConkey; un medio dirigido como cetrimida enfoca su búsqueda si está disponible y autorizado.',
    imagen: '/medios/medio-4.png',
  },
  {
    abrev: 'Blood',
    nombre: 'Agar sangre (Blood)',
    objetivo: 'Bacterias exigentes · hemólisis',
    tipos: ['Enriquecido', 'Diferencial'],
    texto:
      'Favorece el crecimiento de bacterias más exigentes y permite observar patrones de hemólisis. No es selectivo por sí solo.',
    imagen: '/medios/medio-5.png',
  },
]

const enlaceDra = 'https://www.uaeh.edu.mx/campus/icap/nucleo-academico/nydia-edith-reyes-rodriguez.html'
</script>

<template>
  <!-- ====================== HERO ====================== -->
  <section class="hero">
    <!-- Video/fondo tenue del hero -->
    <video
      class="hero-video"
      :poster="heroFotoSrc"
      autoplay
      muted
      loop
      playsinline
      aria-hidden="true"
    >
      <source :src="heroVideoSrc" type="video/mp4" />
    </video>

    <!-- Escena ilustrada (respaldo si falla la foto): luz submarina + patrón molecular + peces + caja Petri -->
    <svg class="hero-scene" viewBox="0 0 760 420" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="hg" x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0" stop-color="#d6eff2" />
          <stop offset="0.5" stop-color="#e6f6fa" />
          <stop offset="1" stop-color="#f4fbfd" />
        </linearGradient>
        <radialGradient id="dishG" cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stop-color="#fffef8" />
          <stop offset="1" stop-color="#e9efd6" />
        </radialGradient>
        <linearGradient id="fishA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#8fd6cb" />
          <stop offset="0.5" stop-color="#4aa7b4" />
          <stop offset="1" stop-color="#2c7f9e" />
        </linearGradient>
        <linearGradient id="fishB" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#a7e0d6" />
          <stop offset="1" stop-color="#52a9c4" />
        </linearGradient>
        <pattern id="hex" width="46" height="40" patternUnits="userSpaceOnUse">
          <path d="M23 1 L43 12 L43 28 L23 39 L3 28 L3 12 Z" fill="none" stroke="#9fd6d6" stroke-width="1" opacity="0.32" />
        </pattern>
        <!-- pez reutilizable (mira a la derecha) -->
        <symbol id="pez" viewBox="-30 0 170 64">
          <path d="M0,32 C16,12 52,8 86,12 C108,15 124,22 134,32 C124,42 108,49 86,52 C52,56 16,52 0,32 Z" fill="url(#fishA)" />
          <path d="M2,32 L-26,14 L-16,32 L-26,50 Z" fill="url(#fishA)" />
          <path d="M52,12 C66,2 86,2 100,11 L92,18 C80,11 66,11 56,18 Z" fill="url(#fishB)" opacity="0.9" />
          <path d="M58,52 C70,60 84,60 94,53 L88,47 C78,52 68,52 60,47 Z" fill="url(#fishB)" opacity="0.8" />
          <path d="M96,34 C106,44 112,50 107,53 C99,49 90,42 88,37 Z" fill="#3f93a8" opacity="0.55" />
          <path d="M86,18 q30 14 0 28" fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.4" />
          <path d="M70,16 q26 16 0 32 M54,18 q22 14 0 28" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.22" />
          <circle cx="112" cy="28" r="5" fill="#0b3a4a" />
          <circle cx="113.6" cy="26.4" r="1.6" fill="#fff" opacity="0.85" />
        </symbol>
      </defs>

      <rect width="760" height="420" fill="url(#hg)" />
      <!-- rayos de luz submarina -->
      <g fill="#ffffff" opacity="0.18">
        <polygon points="120,0 200,0 90,420 40,420" />
        <polygon points="320,0 360,0 250,420 220,420" />
        <polygon points="540,0 610,0 470,420 430,420" />
      </g>
      <rect width="760" height="420" fill="url(#hex)" opacity="0.45" />

      <!-- burbujas -->
      <g fill="#bfe7ea" opacity="0.6">
        <circle cx="120" cy="90" r="6"><animate attributeName="cy" values="90;60;90" dur="7s" repeatCount="indefinite" /></circle>
        <circle cx="300" cy="330" r="9"><animate attributeName="cy" values="330;300;330" dur="9s" repeatCount="indefinite" /></circle>
        <circle cx="500" cy="120" r="5"><animate attributeName="cy" values="120;95;120" dur="6s" repeatCount="indefinite" /></circle>
        <circle cx="210" cy="200" r="4"><animate attributeName="cy" values="200;176;200" dur="8s" repeatCount="indefinite" /></circle>
      </g>

      <!-- peces -->
      <use href="#pez" class="fish fish-1" width="150" height="56" x="-75" y="-28" />
      <use href="#pez" class="fish fish-2" width="104" height="39" x="-52" y="-19" />
      <use href="#pez" class="fish fish-3" width="78" height="29" x="-39" y="-14" opacity="0.9" />

      <!-- caja Petri sostenida con guante -->
      <g transform="translate(622 244)">
        <ellipse cx="6" cy="122" rx="96" ry="18" fill="#0b3a4a" opacity="0.06" />
        <!-- guante -->
        <path d="M-110 56 q46 44 132 44 q34 0 60 -12 l10 64 q-30 16 -78 16 q-96 0 -150 -56 Z" fill="#dfeaf2" />
        <path d="M-110 56 q46 44 132 44 q34 0 60 -12" fill="none" stroke="#c5d6e3" stroke-width="2" opacity="0.7" />
        <circle r="106" fill="#cfe6ea" opacity="0.45" />
        <circle r="98" fill="url(#dishG)" stroke="#cdd9b6" stroke-width="3" />
        <circle r="98" fill="none" stroke="#ffffff" stroke-width="6" opacity="0.5" />
        <g fill="#3f8f6b" opacity="0.82">
          <circle cx="-40" cy="-30" r="6" /><circle cx="-12" cy="18" r="9" /><circle cx="28" cy="-22" r="5" />
          <circle cx="44" cy="26" r="7" /><circle cx="-26" cy="44" r="4" /><circle cx="10" cy="-48" r="4" />
          <circle cx="56" cy="-6" r="4" /><circle cx="-58" cy="6" r="5" /><circle cx="22" cy="52" r="5" /><circle cx="-44" cy="-54" r="3" />
        </g>
        <g fill="#2f8fb8" opacity="0.5">
          <circle cx="-6" cy="-12" r="3" /><circle cx="34" cy="6" r="3" /><circle cx="-40" cy="24" r="3" /><circle cx="14" cy="32" r="2.5" /><circle cx="48" cy="-30" r="2.5" />
        </g>
      </g>
    </svg>

    <!-- velo para legibilidad del texto sobre la imagen -->
    <div class="hero-scrim" aria-hidden="true"></div>

    <div class="hero-body">
      <span class="hero-kicker"><Icon name="shield" :size="14" /> Sanidad acuícola · Fagoterapia</span>
      <h1>Fagoterapia como una <span class="hl">alternativa</span> en el control de patógenos de importancia en la producción acuícola</h1>
      <p class="hero-sub">
        Del aislamiento bacteriano al análisis molecular en un flujo digital integrado para
        sanidad acuícola y fagoterapia.
      </p>
      <div class="hero-chips">
        <span class="hero-chip"><Icon name="dish" :size="14" /> Aislamiento</span>
        <span class="hero-chip"><Icon name="dna" :size="14" /> Biología molecular</span>
        <span class="hero-chip purple"><Icon name="shield" :size="14" /> Fagoterapia</span>
      </div>
    </div>
  </section>

  <!-- ====================== RESUMEN DEL PROYECTO ====================== -->
  <div class="section-title"><Icon name="layers" :size="16" /> Resumen del proyecto</div>

  <!-- Objetivo del proyecto — banda horizontal (texto + foto de cultivo) -->
  <div class="card objetivo-band">
    <div class="objetivo-text">
      <span class="objetivo-badge"><Icon name="target" :size="14" /> Objetivo del proyecto</span>
      <h3>{{ objetivo.titulo }}</h3>
      <p>{{ objetivo.texto }}</p>
    </div>
    <div class="objetivo-photo ph tint-teal">
      <img
        v-if="!imgError.objetivo"
        :src="objetivo.img"
        alt="Cultivo de tilapia en estanques"
        @error="onImgError('objetivo')"
      />
      <Icon v-else name="target" :size="40" class="ph-ic" />
    </div>
  </div>

  <!-- Enfoque · Impacto · Trazabilidad — tarjetas con foto -->
  <div class="secciones-grid">
    <div v-for="s in secciones" :key="s.key" class="card sec-card">
      <div class="sec-photo ph" :class="'tint-' + s.tint">
        <img
          v-if="!imgError[s.key]"
          :src="s.img"
          :alt="s.titulo"
          @error="onImgError(s.key)"
        />
        <Icon v-else :name="s.icon" :size="34" class="ph-ic" />
      </div>
      <div class="sec-body">
        <span class="sec-label" :class="'cl-' + s.tint"><span class="dot"></span>{{ s.titulo }}</span>
        <p>{{ s.texto }}</p>
      </div>
    </div>
  </div>

  <!-- ====================== INSTITUCIÓN Y SEDE ====================== -->
  <div class="card institucion-card">
    <div class="institucion-header">
      <Icon name="database" :size="24" class="institucion-icon" />
      <h3>Institución y sede del proyecto</h3>
    </div>
    <p class="institucion-desc">{{ institucion.descripcion }}</p>
    <div class="sede-grid">
      <div v-for="s in institucion.sedes" :key="s.key" class="sede-card">
        <div class="sede-media" :class="['sede-' + s.tipo, s.tipo === 'icono' ? 'tint-teal' : '']">
          <template v-if="s.tipo === 'icono'">
            <Icon :name="s.icon || 'database'" :size="30" class="ph-ic" />
          </template>
          <template v-else>
            <img
              v-if="!imgError[s.key]"
              :src="s.img"
              :alt="s.nombre"
              :class="s.tipo === 'logo' ? 'logo-img' : 'foto-img'"
              @error="onImgError(s.key)"
            />
            <Icon v-else name="database" :size="30" class="ph-ic dark" />
          </template>
        </div>
        <div class="sede-body">
          <span class="sede-label">{{ s.label }}</span>
          <p class="sede-nombre">{{ s.nombre }}</p>
        </div>
      </div>
    </div>
  </div>

  <!-- ====================== FLUJO DE TRABAJO ====================== -->
  <div class="section-title" style="margin-top: 30px"><Icon name="arrow" :size="16" /> Flujo de trabajo</div>
  <div class="card flow-card">
    <div class="flow">
      <template v-for="(f, i) in flujo" :key="f.nombre">
        <div class="flow-step" :style="`--d:${i * 70}ms`">
          <div class="flow-node" :class="'tint-' + f.tint">
            <img :src="f.icono" :alt="f.nombre" class="flow-icon" />
            <span class="flow-n">{{ i + 1 }}</span>
          </div>
          <h4>{{ f.nombre }}</h4>
          <p>{{ f.sub }}</p>
        </div>
        <div v-if="i < flujo.length - 1" class="flow-link" aria-hidden="true">
          <Icon name="chevron" :size="16" />
        </div>
      </template>
    </div>
  </div>

  <!-- ====================== MEDIOS DE CULTIVO ====================== -->
  <div class="section-title" style="margin-top: 30px"><Icon name="dish" :size="16" /> Medios de cultivo principales</div>

  <div class="leyenda">
    <div v-for="l in leyenda" :key="l.tipo" class="ley-card">
      <span class="ley-dot" :class="'lc-' + tipoColor[l.tipo]"></span>
      <div class="ley-text">
        <span class="ley-tipo" :class="'ct-' + tipoColor[l.tipo]">{{ l.tipo }}</span>
        <span class="ley-desc">{{ l.desc }}</span>
      </div>
    </div>
  </div>

  <div class="medios-grid">
    <div v-for="m in medios" :key="m.abrev" class="card medio-card">
      <!-- Foto real del medio de cultivo -->
      <div class="medio-imagen">
        <img :src="m.imagen" :alt="m.nombre" />
        <span class="medio-abrev-overlay">{{ m.abrev }}</span>
      </div>
      <div class="medio-body">
        <div class="medio-tipos">
          <span v-for="t in m.tipos" :key="t" class="badge" :class="tipoClase[t]">{{ t }}</span>
        </div>
        <h3>{{ m.nombre }}</h3>
        <div class="medio-target"><Icon name="microscope" :size="14" /> {{ m.objetivo }}</div>
        <p>{{ m.texto }}</p>
      </div>
    </div>
  </div>

  <!-- ====================== NOTA CIENTÍFICA ====================== -->
  <div class="card nota-cientifica">
    <div class="nota-ic"><Icon name="shield" :size="20" /></div>
    <div>
      <h3>Nota científica</h3>
      <p>
        La identificación por medio de cultivo es <b>presuntiva</b>. La confirmación requiere
        pruebas moleculares, secuenciación o pruebas bioquímicas complementarias.
      </p>
    </div>
  </div>

  <!-- ====================== TARJETA ACADÉMICA ====================== -->
  <div class="section-title" style="margin-top: 30px"><Icon name="help" :size="16" /> Asesoría académica</div>
  <div class="card academic">
    <div class="acad-avatar">
      <img
        v-if="!imgError.doctora"
        src="/sede/doctora.jpg"
        alt="Dra. Nydia Edith Reyes Rodríguez"
        @error="onImgError('doctora')"
      />
      <span v-else>NR</span>
    </div>
    <div class="acad-body">
      <span class="acad-tag">Referencia / orientación académica</span>
      <h3>Dra. Nydia Edith Reyes Rodríguez</h3>
      <p class="acad-inst">Instituto de Ciencias Agropecuarias · Universidad Autónoma del Estado de Hidalgo (UAEH)</p>
      <p class="acad-text">
        Proyecto desarrollado con orientación académica en microbiología, biología molecular y
        sanidad acuícola, integrando trazabilidad digital para el seguimiento de muestras, colonias
        bacterianas y resultados moleculares.
      </p>
      <a class="btn btn-primary acad-link" :href="enlaceDra" target="_blank" rel="noopener noreferrer">
        <Icon name="arrow" :size="15" /> Ver página institucional
      </a>
    </div>
  </div>

  <p class="foot-note">Sección informativa y de trazabilidad. No muestra datos experimentales ni resultados.</p>
</template>

<style scoped>
/* ---------- HERO ---------- */
.hero {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-lg);
  padding: 44px 40px;
  margin-bottom: 30px;
  min-height: 320px;
  background: linear-gradient(120deg, #e7f6f8 0%, #eef9fb 60%, #f5fbfd 100%);
  border: 1px solid #dcecef;
  box-shadow: var(--shadow);
}
.hero-scene {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  display: none; /* Fallback SVG, no se muestra si hay foto */
}
.hero-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  z-index: 1;
  opacity: 0.46; /* fondo tenue: aporta movimiento sin competir con el título */
  filter: saturate(0.9) contrast(0.92);
}
/* velo: aclara la zona del texto (izquierda) para legibilidad sobre la foto */
.hero-scrim {
  position: absolute;
  inset: 0;
  z-index: 2;
  background: linear-gradient(100deg, color-mix(in srgb, var(--panel) 97%, var(--teal-50)) 0%, color-mix(in srgb, var(--panel) 92%, var(--teal-50)) 40%, color-mix(in srgb, var(--panel) 58%, transparent) 64%, transparent 84%);
}
.hero-body {
  position: relative;
  z-index: 3;
  max-width: 540px;
}
.hero-kicker {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 12px;
  border-radius: 99px;
  background: #ffffffcc;
  color: var(--teal-600);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(4px);
}
.hero h1 {
  font-size: 2.2rem;
  line-height: 1.08;
  margin: 16px 0 0;
  color: var(--ink);
}
.hero h1 .hl {
  color: var(--teal-600);
}
.hero-sub {
  color: var(--ink-soft);
  font-size: 1rem;
  line-height: 1.55;
  margin-top: 12px;
  max-width: 440px;
}
.hero-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  margin-top: 20px;
}
.hero-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid var(--line);
  color: var(--teal-600);
  font-size: 0.82rem;
  font-weight: 700;
  box-shadow: var(--shadow-sm);
}
.hero-chip.purple {
  color: var(--violet);
}
/* peces flotando */
.fish {
  animation: swim 16s ease-in-out infinite;
}
.fish-1 {
  transform: translate(330px, 150px);
}
.fish-2 {
  transform: translate(250px, 250px);
  animation-duration: 13s;
  animation-delay: -3s;
}
.fish-3 {
  transform: translate(430px, 310px);
  animation-duration: 19s;
  animation-delay: -7s;
}
@keyframes swim {
  0%, 100% { transform: translate(var(--x, 330px), 150px); }
}
.fish-1 { animation-name: swim1; }
.fish-2 { animation-name: swim2; }
.fish-3 { animation-name: swim3; }
@keyframes swim1 {
  0% { transform: translate(300px, 150px); }
  50% { transform: translate(360px, 132px); }
  100% { transform: translate(300px, 150px); }
}
@keyframes swim2 {
  0% { transform: translate(230px, 250px); }
  50% { transform: translate(290px, 236px); }
  100% { transform: translate(230px, 250px); }
}
@keyframes swim3 {
  0% { transform: translate(410px, 312px); }
  50% { transform: translate(460px, 300px); }
  100% { transform: translate(410px, 312px); }
}

/* ---------- RESUMEN ---------- */
.resumen-grid {
  margin-bottom: 6px;
}

/* Banda horizontal del objetivo */
.objetivo-band {
  display: flex;
  gap: 0;
  padding: 0;
  overflow: hidden;
  margin-bottom: 18px;
}
.objetivo-text {
  flex: 1.2;
  padding: 26px 30px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.objetivo-badge {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 99px;
  background: var(--teal-50);
  color: var(--teal-600);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  margin-bottom: 12px;
}
.objetivo-text h3 {
  font-size: 1.18rem;
  line-height: 1.3;
  color: var(--ink);
}
.objetivo-text p {
  font-size: 0.9rem;
  color: var(--ink-soft);
  line-height: 1.6;
  margin-top: 9px;
}
.objetivo-photo {
  flex: 0.85;
  min-width: 220px;
  min-height: 210px;
  border-left: 1px solid var(--line);
}

/* Marco de foto reutilizable (con fallback tintado detrás) */
.ph {
  position: relative;
  display: grid;
  place-items: center;
}
.ph img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.ph-ic {
  color: #fff;
  opacity: 0.92;
  z-index: 1;
}

/* Tarjetas Enfoque / Impacto / Trazabilidad */
.secciones-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 6px;
}
.sec-card {
  padding: 0;
  overflow: hidden;
  transition: transform 0.16s, box-shadow 0.16s;
}
.sec-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow);
}
.sec-photo {
  height: 150px;
}
.sec-body {
  padding: 14px 16px 18px;
}
.sec-label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 0.82rem;
  font-weight: 700;
  margin-bottom: 6px;
}
.sec-label .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}
.cl-violet { color: var(--violet); }
.cl-blue { color: var(--blue); }
.cl-teal { color: var(--teal-600); }
.sec-body p {
  font-size: 0.84rem;
  color: var(--ink-soft);
  line-height: 1.5;
}
.sum-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 20px;
  transition: transform 0.16s, box-shadow 0.16s;
}
.sum-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow);
}
.sum-card h3 {
  font-size: 0.98rem;
}
.sum-card p {
  font-size: 0.84rem;
  color: var(--ink-soft);
  line-height: 1.5;
}

/* Contenedores de icono con degradado por categoría */
.sum-ic {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 14px;
  color: #fff;
  box-shadow: var(--shadow-sm);
}
.flow-node {
  display: grid;
  place-items: center;
  width: 80px;
  height: 80px;
  border-radius: 16px;
  color: #fff;
  box-shadow: var(--shadow-sm);
  padding: 8px;
}
.tint-teal { background: linear-gradient(135deg, #0f766e, #19b39e); }
.tint-blue { background: linear-gradient(135deg, #2f6fed, #5b9bff); }
.tint-violet { background: linear-gradient(135deg, #7c5cdb, #a385ec); }
.tint-amber { background: linear-gradient(135deg, #e0922f, #f0b45e); }
.tint-aqua { background: linear-gradient(135deg, #0ea5a5, #4fd0d0); }
.tint-mint { background: linear-gradient(135deg, #2fb38a, #74d6b4); }
.tint-coral { background: linear-gradient(135deg, #e2574c, #f08a82); }

/* ---------- FLUJO ---------- */
.flow-card {
  padding: 24px 20px;
}
.flow {
  display: flex;
  align-items: stretch;
  gap: 4px;
  overflow-x: auto;
  padding-bottom: 6px;
}
.flow-step {
  flex: 1 0 158px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px;
  animation: fade-up 0.5s ease both;
  animation-delay: var(--d);
}
.flow-node {
  position: relative;
}
.flow-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
  max-width: 64px;
  max-height: 64px;
}
.flow-n {
  position: absolute;
  top: -6px;
  right: -6px;
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  color: var(--ink);
  font-family: "Sora", sans-serif;
  font-size: 0.68rem;
  font-weight: 800;
  box-shadow: var(--shadow-sm);
}
.flow-step h4 {
  font-size: 0.9rem;
}
.flow-step p {
  font-size: 0.78rem;
  color: var(--muted);
  line-height: 1.45;
}
.flow-link {
  display: flex;
  align-items: center;
  color: var(--teal);
  opacity: 0.5;
  flex: 0 0 auto;
}
@keyframes fade-up {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ---------- INSTITUCIÓN ---------- */
.institucion-card {
  padding: 24px;
  background: linear-gradient(120deg, #f0f9fc 0%, #e8f7fb 100%);
  border: 1px solid #c5e3eb;
  margin-bottom: 30px;
}
.institucion-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.institucion-icon {
  color: var(--teal-600);
}
.institucion-header h3 {
  font-size: 1.1rem;
  color: var(--ink);
}
.institucion-desc {
  font-size: 0.95rem;
  color: var(--ink-soft);
  line-height: 1.6;
  margin-bottom: 16px;
}
.sede-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
  margin-top: 16px;
}
.sede-card {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 14px;
  overflow: hidden;
  transition: transform 0.16s, box-shadow 0.16s;
}
.sede-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow);
}
.sede-media {
  height: 124px;
  display: grid;
  place-items: center;
  position: relative;
  overflow: hidden;
}
.sede-foto {
  background: #eef3f7;
}
.foto-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.sede-logo {
  background: #fff;
  padding: 16px;
}
.logo-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
}
.ph-ic.dark {
  color: var(--teal-600);
}
.sede-body {
  padding: 12px 14px 14px;
}
.sede-label {
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--teal-600);
  margin-bottom: 4px;
}
.sede-nombre {
  font-size: 0.88rem;
  color: var(--ink);
  margin: 0;
  font-weight: 600;
  line-height: 1.35;
}

/* ---------- MEDIOS ---------- */
.leyenda {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 10px;
  margin-bottom: 18px;
}
.ley-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
}
.ley-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  margin-top: 5px;
  flex-shrink: 0;
}
.ley-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ley-tipo {
  font-size: 0.84rem;
  font-weight: 700;
}
.ley-desc {
  font-size: 0.82rem;
  color: var(--ink-soft);
  line-height: 1.45;
}
.lc-teal { background: var(--teal-600); }
.lc-blue { background: var(--blue); }
.lc-violet { background: var(--violet); }
.lc-amber { background: var(--amber); }
.ct-teal { color: var(--teal-600); }
.ct-blue { color: var(--blue); }
.ct-violet { color: var(--violet); }
.ct-amber { color: var(--amber); }
.medios-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}
.medio-card {
  padding: 0;
  overflow: hidden;
  transition: transform 0.16s, box-shadow 0.16s;
}
.medio-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow);
}
/* Foto real del medio de cultivo (cabecera de la tarjeta) */
.medio-imagen {
  position: relative;
  height: 160px;
  overflow: hidden;
  background: #f5f5f5;
}
.medio-imagen img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.medio-abrev-overlay {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
  font-family: "Sora", sans-serif;
  font-weight: 800;
  font-size: 0.95rem;
  color: #fff;
  background: rgba(0, 0, 0, 0.6);
  padding: 4px 10px;
  border-radius: 6px;
  backdrop-filter: blur(4px);
}

.medio-body {
  padding: 14px 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.medio-tipos {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.medio-body h3 {
  font-size: 0.95rem;
  line-height: 1.3;
}
.medio-target {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--ink-soft);
  font-style: italic;
}
.medio-body p {
  font-size: 0.82rem;
  color: var(--muted);
  line-height: 1.5;
}

/* ---------- NOTA CIENTÍFICA ---------- */
.nota-cientifica {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 20px;
  margin-top: 22px;
  background: linear-gradient(120deg, var(--amber-50), #fffdf8);
  border: 1px solid #f6e2bf;
}
.nota-ic {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 13px;
  flex-shrink: 0;
  background: linear-gradient(135deg, var(--amber), #f0b45e);
  color: #fff;
}
.nota-cientifica h3 {
  font-size: 0.96rem;
  margin-bottom: 5px;
}
.nota-cientifica p {
  font-size: 0.88rem;
  color: var(--ink-soft);
  line-height: 1.55;
}

/* ---------- ACADÉMICA ---------- */
.academic {
  display: flex;
  gap: 20px;
  padding: 24px;
  align-items: flex-start;
  background: linear-gradient(120deg, #fff, var(--blue-50));
}
.acad-avatar {
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  border-radius: 18px;
  flex-shrink: 0;
  overflow: hidden;
  font-family: "Sora", sans-serif;
  font-weight: 800;
  font-size: 1.3rem;
  color: #fff;
  background: linear-gradient(135deg, #0f766e, #1c7fb8);
  box-shadow: var(--shadow-sm);
}
.acad-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.acad-tag {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--blue);
  margin-bottom: 6px;
}
.acad-body h3 {
  font-size: 1.15rem;
}
.acad-inst {
  font-size: 0.85rem;
  color: var(--ink-soft);
  font-weight: 600;
  margin-top: 4px;
}
.acad-text {
  font-size: 0.86rem;
  color: var(--muted);
  line-height: 1.55;
  margin-top: 10px;
  max-width: 640px;
}
.acad-link {
  margin-top: 16px;
}
.foot-note {
  text-align: center;
  font-size: 0.78rem;
  color: var(--muted);
  margin: 26px 0 8px;
}

/* ---------- RESPONSIVE ---------- */
@media (max-width: 1040px) {
  .resumen-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 760px) {
  .hero {
    padding: 30px 22px;
  }
  .hero h1 {
    font-size: 1.6rem;
  }
  .hero-scene {
    opacity: 0.5;
  }
  .resumen-grid {
    grid-template-columns: 1fr;
  }
  .objetivo-band {
    flex-direction: column;
  }
  .objetivo-photo {
    min-height: 170px;
    border-left: none;
    border-top: 1px solid var(--line);
  }
  .academic,
  .nota-cientifica {
    flex-direction: column;
    gap: 14px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .fish,
  .flow-step {
    animation: none;
  }
}
</style>
