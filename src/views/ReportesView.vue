<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Icon from '../components/Icon.vue'
import LabMotionGallery from '../components/reportes/LabMotionGallery.vue'
import PetriColonyAnimation, { type PetriColony } from '../components/reportes/PetriColonyAnimation.vue'
import ReportChartCard from '../components/reportes/ReportChartCard.vue'
import { useReportAnalytics } from '../composables/useReportAnalytics'
import { useLabStore } from '../stores/lab'
import { useAuthStore } from '../stores/auth'

const lab = useLabStore()
const auth = useAuthStore()
const activeTab = ref('panorama')
const filtersOpen = ref(false)
const page = ref(1)
const pageSize = 40

const source = computed(() => lab.reporte)
const analytics = useReportAnalytics(source)

const tabs = [
  { id: 'panorama', label: 'Panorama', icon: 'activity', count: 2 },
  { id: 'nanodrop', label: 'NanoDrop', icon: 'droplet', count: 3 },
  { id: 'trazabilidad', label: 'Trazabilidad', icon: 'layers', count: 3 },
  { id: 'comparativas', label: 'Comparativas', icon: 'chart', count: 3 },
  { id: 'biovisual', label: 'Biovisual', icon: 'dish', count: 4 },
  { id: 'others', label: 'Others', icon: 'phage', count: 6 },
  { id: 'datos', label: 'Datos', icon: 'table', count: 1 },
]

const metricCards = computed(() => [
  {
    label: 'Registros activos',
    value: analytics.metrics.value.total.toLocaleString('es-MX'),
    note: 'muestras en el filtro',
    icon: 'database',
    tone: 'mint',
  },
  {
    label: 'Lecturas NanoDrop',
    value: analytics.metrics.value.nanodrop.toLocaleString('es-MX'),
    note: `${Math.round(analytics.metrics.value.nanodrop / Math.max(1, analytics.metrics.value.total) * 100)}% de cobertura`,
    icon: 'droplet',
    tone: 'blue',
  },
  {
    label: 'Aptas para PCR',
    value: analytics.metrics.value.aptas.toLocaleString('es-MX'),
    note: 'pureza compatible',
    icon: 'dna',
    tone: 'violet',
  },
  {
    label: 'Repetir extracción',
    value: analytics.metrics.value.repetir.toLocaleString('es-MX'),
    note: 'requieren atención',
    icon: 'refresh',
    tone: 'coral',
  },
  {
    label: 'Promedio ng/µL',
    value: analytics.metrics.value.promedio.toLocaleString('es-MX', { maximumFractionDigits: 1 }),
    note: 'concentración media',
    icon: 'beaker',
    tone: 'amber',
  },
  {
    label: 'Score de pureza',
    value: `${analytics.metrics.value.score.toFixed(0)}%`,
    note: 'índice combinado',
    icon: 'target',
    tone: 'mint',
  },
])

const petriColonies = computed<PetriColony[]>(() =>
  analytics.rows.value.slice(0, 42).map((row) => ({
    id: row.id,
    label: `${row.muestra} · ${row.medio}`,
    description: row.descripcion,
    color: row.status === 'Apta PCR' ? '#22a67e' : row.status === 'Repetir extracción' ? '#d65f64' : '#d69a3d',
    size: Math.max(2.2, Math.min(7.5, Math.log10(Math.max(row.ngul || 1, 1)) * 2.1)),
    score: row.purityScore,
  })),
)

const totalPages = computed(() => Math.max(1, Math.ceil(analytics.rows.value.length / pageSize)))
const visibleRows = computed(() => analytics.rows.value.slice((page.value - 1) * pageSize, page.value * pageSize))

watch(() => analytics.rows.value.length, () => { page.value = 1 })

onMounted(() => {
  document.documentElement.classList.add('reportes-analytics')
  if (!lab.reporte.length) lab.cargarReporte()
})

onBeforeUnmount(() => document.documentElement.classList.remove('reportes-analytics'))

const fmt = (n: number | null) => (n == null ? '—' : Number(n).toFixed(2))
const fmtNg = (n: number | null) => (n == null ? '—' : Number(n).toFixed(1))
</script>

<template>
  <div class="analytics-page">
    <section class="analytics-hero">
      <div class="hero-orbit orbit-one" />
      <div class="hero-orbit orbit-two" />
      <div class="hero-content">
        <div class="hero-label"><span /> Visual Analytics Lab · FagoLab 2026</div>
        <h1>Los datos del laboratorio,<br><em>convertidos en descubrimientos.</em></h1>
        <p>
          Un catálogo vivo de visualizaciones científicas para explorar pureza, concentración,
          trazabilidad y patrones biológicos sin perder la tabla original.
        </p>
        <div class="hero-actions">
          <button class="hero-primary" type="button" @click="activeTab = 'nanodrop'">
            <Icon name="activity" :size="17" /> Explorar visualizaciones
          </button>
          <a v-if="auth.can('reportes.files.export')" class="hero-secondary" :href="lab.reporteExcelUrl" target="_blank" rel="noopener">
            <Icon name="download" :size="16" /> Descargar Excel
          </a>
          <a v-if="auth.can('reportes.files.export')" class="hero-secondary" :href="lab.reportePdfUrl" target="_blank" rel="noopener">
            <Icon name="report" :size="16" /> Descargar PDF
          </a>
        </div>
      </div>

      <div class="hero-lab-card">
        <div class="lab-card-head">
          <span>Calidad global</span>
          <i>LIVE</i>
        </div>
        <div class="quality-orb" :style="{ '--score': `${analytics.metrics.value.score * 3.6}deg` }">
          <div>
            <b>{{ analytics.metrics.value.score.toFixed(0) }}</b>
            <small>/ 100</small>
          </div>
        </div>
        <div class="lab-signals">
          <span><i class="signal mint" /> {{ analytics.metrics.value.aptas }} aptas</span>
          <span><i class="signal amber" /> {{ analytics.metrics.value.total - analytics.metrics.value.aptas - analytics.metrics.value.repetir }} en revisión</span>
          <span><i class="signal coral" /> {{ analytics.metrics.value.repetir }} repetir</span>
        </div>
      </div>

      <img class="quality-doll" src="/munequita-reportes.svg" alt="Científica señalando la calidad global" />
    </section>

    <section class="catalog-strip">
      <div>
        <b>21</b>
        <span>visualizaciones interactivas</span>
      </div>
      <div>
        <b>7</b>
        <span>familias analíticas</span>
      </div>
      <div>
        <b>{{ analytics.rows.value.length.toLocaleString('es-MX') }}</b>
        <span>registros en contexto</span>
      </div>
      <div class="catalog-mode">
        <span>
          <b>{{ analytics.demoMode.value ? 'Demo enriquecido' : 'Datos reales' }}</b>
          <small>{{ analytics.demoMode.value ? 'Completa campos faltantes de forma determinista' : 'Solo lecturas capturadas en laboratorio' }}</small>
        </span>
        <button
          type="button"
          role="switch"
          :aria-checked="analytics.demoMode.value"
          :class="{ active: analytics.demoMode.value }"
          @click="analytics.demoMode.value = !analytics.demoMode.value"
        >
          <i />
        </button>
      </div>
    </section>

    <section class="metric-grid">
      <article v-for="metric in metricCards" :key="metric.label" class="metric-card" :class="`metric-${metric.tone}`">
        <div class="metric-icon"><Icon :name="metric.icon" :size="18" /></div>
        <div>
          <span>{{ metric.label }}</span>
          <b>{{ metric.value }}</b>
          <small>{{ metric.note }}</small>
        </div>
        <svg viewBox="0 0 84 34" aria-hidden="true">
          <path d="M1 29C12 27 16 15 27 19s14 9 24 2S65 7 83 4" />
        </svg>
      </article>
    </section>

    <section class="control-deck">
      <div class="tab-rail" role="tablist" aria-label="Categorías de visualización">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          role="tab"
          :aria-selected="activeTab === tab.id"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <Icon :name="tab.icon" :size="16" />
          <span>{{ tab.label }}</span>
          <i>{{ tab.count }}</i>
        </button>
      </div>

      <button class="filter-toggle" type="button" :class="{ active: filtersOpen }" @click="filtersOpen = !filtersOpen">
        <Icon name="grid" :size="16" />
        Filtros globales
        <span v-if="analytics.activeFilterCount.value">{{ analytics.activeFilterCount.value }}</span>
      </button>
    </section>

    <Transition name="filter-slide">
      <section v-if="filtersOpen" class="filter-lab">
        <div class="filter-head">
          <div>
            <span>CONTROL DE MUESTRA</span>
            <h2>Enfoca todo el laboratorio visual</h2>
          </div>
          <button type="button" @click="analytics.resetFilters">
            <Icon name="refresh" :size="14" /> Restablecer
          </button>
        </div>
        <div class="filter-grid">
          <label class="filter-search">
            <span>Buscar</span>
            <div><Icon name="search" :size="14" /><input v-model="analytics.filters.search" placeholder="Lote, muestra, colonia..." /></div>
          </label>
          <label>
            <span>Lote</span>
            <select v-model="analytics.filters.lote">
              <option>Todos</option>
              <option v-for="lot in analytics.lots.value" :key="lot">{{ lot }}</option>
            </select>
          </label>
          <label>
            <span>Órgano</span>
            <select v-model="analytics.filters.organo">
              <option>Todos</option>
              <option v-for="org in analytics.organs.value" :key="org">{{ org }}</option>
            </select>
          </label>
          <label>
            <span>Medio</span>
            <select v-model="analytics.filters.medio">
              <option>Todos</option>
              <option v-for="medium in analytics.media.value" :key="medium">{{ medium }}</option>
            </select>
          </label>
          <label>
            <span>Estado</span>
            <select v-model="analytics.filters.status">
              <option>Todos</option>
              <option>Apta PCR</option>
              <option>Pendiente</option>
              <option>Repetir extracción</option>
            </select>
          </label>
          <label>
            <span>ng/µL mínimo</span>
            <input v-model.number="analytics.filters.minNg" type="number" min="0" placeholder="0" />
          </label>
          <label>
            <span>ng/µL máximo</span>
            <input v-model.number="analytics.filters.maxNg" type="number" min="0" placeholder="Sin límite" />
          </label>
        </div>
        <div class="filter-result">
          <i />
          {{ analytics.rows.value.length.toLocaleString('es-MX') }} registros alimentan todas las gráficas
        </div>
      </section>
    </Transition>

    <section v-if="activeTab === 'panorama'" class="chapter">
      <div class="chapter-head">
        <div><span>CAPÍTULO 01</span><h2>Panorama ejecutivo</h2></div>
        <p>Una lectura rápida del estado de la colección y su ritmo de crecimiento.</p>
      </div>
      <div class="chart-grid two">
        <ReportChartCard
          title="Mapa de decisiones"
          eyebrow="Pureza consolidada"
          description="Distribución de muestras aptas, pendientes y candidatas a repetir extracción."
          filename="fagolab-mapa-decisiones"
          badge="Datos reales"
          :option="analytics.options.status.value"
        />
        <ReportChartCard
          title="Pulso del laboratorio"
          eyebrow="Actividad temporal"
          description="Tendencia suavizada de registros durante los últimos meses de trabajo."
          filename="fagolab-pulso-laboratorio"
          tone="blue"
          :badge="analytics.demoMode.value ? 'Fecha modelada' : 'Serie real'"
          :option="analytics.options.trend.value"
        />
      </div>
      <div class="insight-ribbon">
        <Icon name="activity" :size="18" />
        <p>
          <b>Lectura automática:</b> {{ analytics.metrics.value.aptas }} muestras cumplen el perfil
          combinado de pureza y concentración para avanzar; {{ analytics.metrics.value.repetir }}
          presentan señales claras para revisar la extracción.
        </p>
      </div>
    </section>

    <section v-else-if="activeTab === 'nanodrop'" class="chapter">
      <div class="chapter-head">
        <div><span>CAPÍTULO 02</span><h2>Atlas de calidad NanoDrop</h2></div>
        <p>Pureza, concentración y dispersión vistas desde tres perspectivas complementarias.</p>
      </div>
      <div class="chart-grid featured">
        <ReportChartCard
          class="span-two"
          title="Constelación de pureza"
          eyebrow="Scatter bubble"
          description="260/280 contra 260/230; el tamaño expresa ng/µL y la zona verde marca el perfil ideal."
          filename="fagolab-constelacion-pureza"
          badge="Zona ideal"
          :option="analytics.options.scatter.value"
          tall
        />
        <ReportChartCard
          title="Distribución de concentración"
          eyebrow="Histograma"
          description="Frecuencia de lecturas por intervalo de concentración."
          filename="fagolab-histograma-concentracion"
          tone="blue"
          :option="analytics.options.histogram.value"
        />
        <ReportChartCard
          title="Variabilidad por órgano"
          eyebrow="Boxplot científico"
          description="Mediana, cuartiles y extremos de concentración por tejido."
          filename="fagolab-boxplot-organos"
          tone="violet"
          :option="analytics.options.boxplot.value"
        />
      </div>
    </section>

    <section v-else-if="activeTab === 'trazabilidad'" class="chapter">
      <div class="chapter-head">
        <div><span>CAPÍTULO 03</span><h2>La historia de cada muestra</h2></div>
        <p>Del muestreo al resultado: volumen, rutas y ritmo de actividad experimental.</p>
      </div>
      <div class="chart-grid featured">
        <ReportChartCard
          title="Embudo experimental"
          eyebrow="Conversión por etapa"
          description="Cuánto material avanza entre muestreo, cultivo, NanoDrop, PCR y gel."
          filename="fagolab-embudo"
          tone="blue"
          :option="analytics.options.funnel.value"
        />
        <ReportChartCard
          class="span-two"
          title="Ríos de trazabilidad"
          eyebrow="Sankey multinivel"
          description="Flujo agregado desde lote hacia órgano, medio de cultivo y decisión de calidad."
          filename="fagolab-sankey"
          badge="Interactivo"
          :option="analytics.options.sankey.value"
          tall
        />
        <ReportChartCard
          class="span-three"
          title="Calendario de actividad"
          eyebrow="Calendar heatmap"
          description="Intensidad diaria de captura para detectar jornadas, pausas y concentraciones de trabajo."
          filename="fagolab-calendario"
          tone="amber"
          :badge="analytics.demoMode.value ? 'Fecha modelada' : 'Fecha real'"
          :option="analytics.options.calendar.value"
        />
      </div>
    </section>

    <section v-else-if="activeTab === 'comparativas'" class="chapter">
      <div class="chapter-head">
        <div><span>CAPÍTULO 04</span><h2>Comparador de lotes</h2></div>
        <p>Contrasta rendimiento, cobertura y diversidad sin perder el detalle biológico.</p>
      </div>
      <div class="chart-grid featured">
        <ReportChartCard
          title="Firma multidimensional"
          eyebrow="Radar comparativo"
          description="Pureza, concentración, aptitud PCR, cobertura y diversidad en una sola huella."
          filename="fagolab-radar-lotes"
          tone="violet"
          :option="analytics.options.radar.value"
        />
        <ReportChartCard
          title="Lote × órgano"
          eyebrow="Heatmap"
          description="Densidad de registros por combinación para revelar vacíos y especialización."
          filename="fagolab-heatmap"
          tone="blue"
          :option="analytics.options.heatmap.value"
        />
        <ReportChartCard
          class="span-two"
          title="Decisiones por lote"
          eyebrow="Barras apiladas"
          description="Balance entre muestras aptas, pendientes y a repetir dentro de los lotes principales."
          filename="fagolab-barras-estados"
          badge="Comparativa"
          :option="analytics.options.stacked.value"
        />
      </div>
    </section>

    <section v-else-if="activeTab === 'biovisual'" class="chapter">
      <div class="chapter-head">
        <div><span>CAPÍTULO 05</span><h2>Biología convertida en interfaz</h2></div>
        <p>Visualizaciones experimentales que hacen tangible la estructura de los datos.</p>
      </div>

      <PetriColonyAnimation :colonies="petriColonies" />

      <div class="morphology-cloud">
        <div class="cloud-copy">
          <span>SEMÁNTICA DE COLONIAS</span>
          <h3>Morfologías que emergen</h3>
          <p>El tamaño de cada término refleja cuántas veces aparece en la descripción filtrada.</p>
        </div>
        <div class="word-cloud">
          <span
            v-for="term in analytics.morphologyTerms.value"
            :key="term.text"
            :class="`word-${term.tone}`"
            :style="{ fontSize: `${term.size}rem` }"
            :title="`${term.count} apariciones`"
          >
            {{ term.text }}
          </span>
        </div>
      </div>

      <div class="chart-grid two">
        <ReportChartCard
          title="Jerarquía biológica"
          eyebrow="Sunburst"
          description="Explora desde el lote hasta órgano y medio de cultivo en anillos concéntricos."
          filename="fagolab-sunburst"
          tone="amber"
          :option="analytics.options.sunburst.value"
          tall
        />
        <ReportChartCard
          title="Red del experimento"
          eyebrow="Network graph"
          description="Una vista navegable de las relaciones entre lotes, órganos, medios y resultados."
          filename="fagolab-red"
          tone="violet"
          badge="Arrastra y acerca"
          :option="analytics.options.graph.value"
          tall
        />
      </div>
    </section>

    <section v-else-if="activeTab === 'others'" class="chapter">
      <div class="chapter-head">
        <div><span>CAPÍTULO 06</span><h2>Others · Gabinete experimental</h2></div>
        <p>Escenas SVG animadas que convierten procesos del laboratorio en experiencias visuales.</p>
      </div>
      <LabMotionGallery
        :metrics="analytics.metrics.value"
        :terms="analytics.morphologyTerms.value"
      />
    </section>

    <section v-else class="chapter data-chapter">
      <div class="chapter-head">
        <div><span>CAPÍTULO 07</span><h2>Explorador de datos</h2></div>
        <p>La tabla consolidada original se mantiene como fuente verificable y exportable.</p>
      </div>

      <div class="data-card">
        <div class="data-toolbar">
          <div>
            <span class="data-status"><i /> {{ analytics.rows.value.length.toLocaleString('es-MX') }} registros visibles</span>
            <small>Página {{ page }} de {{ totalPages }}</small>
          </div>
          <div class="data-exports">
            <a v-if="auth.can('reportes.files.export')" :href="lab.reporteExcelUrl" target="_blank" rel="noopener"><Icon name="download" :size="15" /> Excel</a>
            <a v-if="auth.can('reportes.files.export')" :href="lab.reportePdfUrl" target="_blank" rel="noopener"><Icon name="report" :size="15" /> PDF</a>
          </div>
        </div>
        <div class="table-wrap">
          <table class="data">
            <thead>
              <tr>
                <th>Lote</th>
                <th>Nº (F)</th>
                <th>Muestra</th>
                <th>Órgano</th>
                <th>Medio</th>
                <th>Descripción de colonia</th>
                <th>260/280</th>
                <th>260/230</th>
                <th>ng/µL</th>
                <th>Decisión</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in visibleRows" :key="row.id">
                <td class="mono">{{ row.lote }}</td>
                <td class="mono">{{ row.frasco }}</td>
                <td class="mono strong">{{ row.muestra }}</td>
                <td>{{ row.organo }}</td>
                <td><span class="medium-pill">{{ row.medio }}</span></td>
                <td class="description-cell">{{ row.descripcion || '—' }}</td>
                <td><b>{{ fmt(row.r280) }}</b></td>
                <td>{{ fmt(row.r230) }}</td>
                <td>{{ fmtNg(row.ngul) }}</td>
                <td><span class="status-pill" :class="`status-${row.status.toLowerCase().replaceAll(' ', '-').replace('ó', 'o')}`">{{ row.status }}</span></td>
              </tr>
              <tr v-if="lab.reporteCargando">
                <td colspan="10" class="empty">Construyendo el laboratorio visual…</td>
              </tr>
              <tr v-else-if="!visibleRows.length">
                <td colspan="10" class="empty">No hay registros para esta combinación de filtros.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="pagination">
          <button type="button" :disabled="page === 1" @click="page--">Anterior</button>
          <span>{{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, analytics.rows.value.length) }} de {{ analytics.rows.value.length }}</span>
          <button type="button" :disabled="page === totalPages" @click="page++">Siguiente</button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.analytics-page {
  --lab-ink: #123447;
  --lab-mint: #1fa67e;
  --lab-blue: #397bd8;
  --lab-amber: #d29335;
  --lab-coral: #d85f65;
  --lab-violet: #8068da;
  display: flex;
  flex-direction: column;
  gap: 22px;
  color: var(--lab-ink);
}
.analytics-hero {
  position: relative;
  display: grid;
  min-height: 410px;
  grid-template-columns: minmax(0, 1.45fr) minmax(280px, .55fr);
  align-items: center;
  gap: 34px;
  overflow: hidden;
  padding: clamp(34px, 5vw, 62px);
  border-radius: 30px;
  color: #f7fffd;
  background:
    linear-gradient(112deg, rgba(7, 42, 48, .98), rgba(9, 74, 76, .94) 54%, rgba(30, 125, 105, .88)),
    radial-gradient(circle at 80% 20%, #4fd0aa, transparent 30%);
  box-shadow: 0 28px 70px rgba(10, 53, 60, .2);
}
.analytics-hero::before {
  position: absolute;
  inset: 0;
  content: '';
  opacity: .18;
  background-image:
    linear-gradient(rgba(255,255,255,.09) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.09) 1px, transparent 1px);
  background-size: 38px 38px;
  mask-image: linear-gradient(90deg, transparent, #000 65%);
}
.hero-orbit {
  position: absolute;
  border: 1px solid rgba(151, 255, 218, .2);
  border-radius: 50%;
}
.orbit-one { right: -90px; width: 420px; height: 420px; }
.orbit-two { right: 40px; width: 210px; height: 210px; }
.hero-content { position: relative; z-index: 2; }
.hero-label {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #91e5ca;
  font-size: .68rem;
  font-weight: 900;
  letter-spacing: .14em;
  text-transform: uppercase;
}
.hero-label span {
  width: 24px;
  height: 1px;
  background: #91e5ca;
}
.analytics-hero h1 {
  max-width: 800px;
  margin-top: 16px;
  color: #fff;
  font-family: var(--font-heading);
  font-size: clamp(2.35rem, 5vw, 4.45rem);
  font-weight: 700;
  line-height: .98;
  letter-spacing: -.045em;
}
.analytics-hero h1 em {
  color: #99e6cc;
  font-style: normal;
}
.analytics-hero p {
  max-width: 680px;
  margin: 20px 0 0;
  color: rgba(231, 252, 246, .75);
  font-size: .92rem;
  line-height: 1.7;
}
.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 27px;
}
.hero-actions button,
.hero-actions a {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 12px 17px;
  border-radius: 13px;
  font-size: .78rem;
  font-weight: 900;
  text-decoration: none;
}
.hero-primary { color: #0b4a43; background: #a6ecd5; }
.hero-secondary { color: #e5f9f3; border: 1px solid rgba(255,255,255,.24); background: rgba(255,255,255,.07); }
.hero-lab-card {
  position: relative;
  z-index: 2;
  padding: 19px;
  border: 1px solid rgba(255,255,255,.2);
  border-radius: 24px;
  background: rgba(3, 38, 44, .42);
  box-shadow: inset 0 1px rgba(255,255,255,.12), 0 24px 50px rgba(0,0,0,.16);
  backdrop-filter: blur(14px);
}
.lab-card-head {
  display: flex;
  justify-content: space-between;
  color: #dff9f1;
  font-size: .72rem;
  font-weight: 800;
}
.lab-card-head i {
  padding: 3px 6px;
  border-radius: 999px;
  color: #97efd1;
  background: rgba(105, 224, 182, .13);
  font-size: .56rem;
  font-style: normal;
  letter-spacing: .1em;
}
.quality-orb {
  display: grid;
  width: 154px;
  height: 154px;
  margin: 22px auto;
  place-items: center;
  border-radius: 50%;
  background: conic-gradient(#7ce2bf var(--score), rgba(255,255,255,.09) 0);
  box-shadow: 0 0 50px rgba(101, 226, 184, .12);
}
.quality-orb::before {
  width: 128px;
  height: 128px;
  border-radius: 50%;
  content: '';
  background: #0c4a4d;
  box-shadow: inset 0 0 25px rgba(0,0,0,.22);
}
.quality-orb div {
  position: absolute;
  display: flex;
  align-items: baseline;
  gap: 3px;
}
.quality-orb b { color: #fff; font-family: var(--font-heading); font-size: 2.5rem; }
.quality-orb small { color: #8ccdbd; font-size: .7rem; }
.lab-signals { display: grid; gap: 8px; }
.lab-signals span {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(235,255,249,.72);
  font-size: .68rem;
}
.signal { width: 7px; height: 7px; border-radius: 50%; }
.signal.mint { background: #6fe1bd; box-shadow: 0 0 10px #6fe1bd; }
.signal.amber { background: #efbc69; }
.signal.coral { background: #f08488; }
.quality-doll {
  position: absolute;
  bottom: 0;
  right: 300px;
  width: 168px;
  height: auto;
  z-index: 4;
  pointer-events: none;
  filter: drop-shadow(0 14px 22px rgba(0,0,0,.3));
}
.catalog-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(130px, .55fr)) minmax(300px, 1.35fr);
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: var(--panel);
  box-shadow: 0 12px 35px rgba(15,36,56,.05);
}
.catalog-strip > div {
  display: flex;
  min-height: 82px;
  align-items: center;
  gap: 11px;
  padding: 15px 20px;
  border-right: 1px solid var(--line-soft);
}
.catalog-strip > div > b { font-family: var(--font-heading); font-size: 1.65rem; }
.catalog-strip > div > span:not(.catalog-mode span) { color: var(--muted); font-size: .68rem; line-height: 1.35; }
.catalog-mode { justify-content: space-between; background: linear-gradient(110deg, var(--teal-50), var(--panel)); }
.catalog-mode span { display: flex; flex-direction: column; }
.catalog-mode span b { color: var(--teal-600); font-size: .76rem; }
.catalog-mode span small { margin-top: 3px; color: var(--muted); font-size: .62rem; }
.catalog-mode button {
  position: relative;
  width: 46px;
  height: 25px;
  flex: none;
  border-radius: 999px;
  background: var(--line);
}
.catalog-mode button i {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 19px;
  height: 19px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 7px rgba(0,0,0,.18);
  transition: transform .25s ease;
}
.catalog-mode button.active { background: var(--teal); }
.catalog-mode button.active i { transform: translateX(21px); }
.metric-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
}
.metric-card {
  --metric: var(--lab-mint);
  --metric-bg: #eaf8f3;
  position: relative;
  min-width: 0;
  overflow: hidden;
  padding: 16px;
  border: 1px solid color-mix(in srgb, var(--metric) 14%, var(--line));
  border-radius: 18px;
  background: var(--panel);
  box-shadow: 0 10px 28px rgba(15,36,56,.05);
}
.metric-blue { --metric: var(--lab-blue); --metric-bg: #edf4ff; }
.metric-violet { --metric: var(--lab-violet); --metric-bg: #f1effd; }
.metric-coral { --metric: var(--lab-coral); --metric-bg: #fff0f0; }
.metric-amber { --metric: var(--lab-amber); --metric-bg: #fff5e6; }
.metric-icon {
  display: grid;
  width: 34px;
  height: 34px;
  margin-bottom: 14px;
  place-items: center;
  border-radius: 11px;
  color: var(--metric);
  background: var(--metric-bg);
}
.metric-card span { display: block; color: var(--muted); font-size: .64rem; font-weight: 800; }
.metric-card b { display: block; margin-top: 5px; font-family: var(--font-heading); font-size: 1.55rem; }
.metric-card small { display: block; margin-top: 2px; color: var(--muted); font-size: .58rem; }
.metric-card svg {
  position: absolute;
  right: -8px;
  bottom: -2px;
  width: 84px;
  opacity: .22;
  fill: none;
  stroke: var(--metric);
  stroke-width: 2;
}
.control-deck {
  position: sticky;
  z-index: 20;
  top: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: color-mix(in srgb, var(--panel) 92%, transparent);
  box-shadow: 0 12px 32px rgba(15,36,56,.09);
  backdrop-filter: blur(16px);
}
.tab-rail { display: flex; gap: 4px; overflow-x: auto; }
.tab-rail button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 11px;
  border-radius: 11px;
  color: var(--muted);
  font-size: .7rem;
  font-weight: 800;
  white-space: nowrap;
}
.tab-rail button i {
  display: grid;
  min-width: 18px;
  height: 18px;
  place-items: center;
  border-radius: 6px;
  background: var(--line-soft);
  font-size: .55rem;
  font-style: normal;
}
.tab-rail button.active {
  color: #fff;
  background: linear-gradient(135deg, #176e68, #159178);
  box-shadow: 0 8px 18px rgba(17,120,103,.22);
}
.tab-rail button.active i { color: #0d6f5c; background: #b8f0dc; }
.filter-toggle {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex: none;
  padding: 9px 12px;
  border: 1px solid var(--line);
  border-radius: 11px;
  color: var(--ink-soft);
  background: var(--panel);
  font-size: .7rem;
  font-weight: 900;
}
.filter-toggle.active { color: var(--teal-600); border-color: var(--teal); background: var(--teal-50); }
.filter-toggle span {
  display: grid;
  min-width: 18px;
  height: 18px;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  background: var(--coral);
  font-size: .55rem;
}
.filter-lab {
  overflow: hidden;
  padding: 20px;
  border: 1px solid color-mix(in srgb, var(--teal) 18%, var(--line));
  border-radius: 22px;
  background:
    radial-gradient(circle at 100% 0, var(--teal-50), transparent 30%),
    var(--panel);
}
.filter-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 17px;
}
.filter-head span { color: var(--teal-600); font-size: .6rem; font-weight: 900; letter-spacing: .13em; }
.filter-head h2 { margin-top: 3px; font-size: 1.05rem; }
.filter-head button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 10px;
  color: var(--teal-600);
  background: var(--teal-50);
  font-size: .66rem;
  font-weight: 900;
}
.filter-grid {
  display: grid;
  grid-template-columns: 1.6fr repeat(6, minmax(105px, 1fr));
  gap: 10px;
}
.filter-grid label { display: flex; min-width: 0; flex-direction: column; gap: 5px; }
.filter-grid label > span { color: var(--muted); font-size: .6rem; font-weight: 900; }
.filter-grid input,
.filter-grid select {
  width: 100%;
  min-width: 0;
  height: 38px;
  padding: 0 10px;
  border: 1px solid var(--line);
  border-radius: 10px;
  color: var(--ink);
  background: var(--panel);
  font: inherit;
  font-size: .7rem;
  outline: none;
}
.filter-grid input:focus,
.filter-grid select:focus { border-color: var(--teal); box-shadow: 0 0 0 3px var(--teal-50); }
.filter-search > div {
  display: flex;
  align-items: center;
  height: 38px;
  padding-left: 10px;
  border: 1px solid var(--line);
  border-radius: 10px;
  color: var(--muted);
  background: var(--panel);
}
.filter-search > div input { height: 36px; border: 0; box-shadow: none; }
.filter-result {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 14px;
  color: var(--muted);
  font-size: .64rem;
}
.filter-result i { width: 7px; height: 7px; border-radius: 50%; background: var(--teal); box-shadow: 0 0 0 4px var(--teal-50); }
.filter-slide-enter-active, .filter-slide-leave-active { transition: .28s ease; }
.filter-slide-enter-from, .filter-slide-leave-to { opacity: 0; transform: translateY(-10px); }
.chapter { display: flex; flex-direction: column; gap: 18px; animation: chapter-in .42s ease both; }
.chapter-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  padding: 12px 4px 2px;
}
.chapter-head span { color: var(--teal-600); font-size: .62rem; font-weight: 900; letter-spacing: .14em; }
.chapter-head h2 { margin-top: 5px; font-size: clamp(1.45rem, 2.5vw, 2.1rem); }
.chapter-head p { max-width: 430px; margin: 0; color: var(--muted); font-size: .75rem; line-height: 1.55; text-align: right; }
.chart-grid { display: grid; gap: 16px; }
.chart-grid.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.chart-grid.featured { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.span-two { grid-column: span 2; }
.span-three { grid-column: span 3; }
.insight-ribbon {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 15px 18px;
  border: 1px solid #caeae0;
  border-radius: 16px;
  color: #32685d;
  background: linear-gradient(90deg, #edf9f5, #f9fcfb);
}
.insight-ribbon p { margin: 0; font-size: .73rem; line-height: 1.5; }
.morphology-cloud {
  display: grid;
  min-height: 260px;
  grid-template-columns: minmax(220px, .75fr) minmax(0, 1.25fr);
  align-items: center;
  gap: 28px;
  padding: 30px;
  border: 1px solid var(--line);
  border-radius: 24px;
  background:
    linear-gradient(120deg, rgba(245,241,226,.8), rgba(255,255,255,.94)),
    var(--panel);
  box-shadow: 0 16px 40px rgba(15,36,56,.06);
}
.cloud-copy span { color: var(--lab-amber); font-size: .62rem; font-weight: 900; letter-spacing: .14em; }
.cloud-copy h3 { margin-top: 6px; font-size: 1.55rem; }
.cloud-copy p { color: var(--muted); font-size: .75rem; line-height: 1.6; }
.word-cloud {
  display: flex;
  min-height: 180px;
  align-content: center;
  align-items: center;
  justify-content: center;
  gap: 7px 13px;
  flex-wrap: wrap;
  padding: 18px;
}
.word-cloud span {
  font-family: var(--font-heading);
  font-weight: 700;
  line-height: .95;
  cursor: help;
  transition: transform .2s ease, opacity .2s ease;
}
.word-cloud span:hover { z-index: 2; transform: scale(1.14) rotate(-2deg); }
.word-mint { color: #258d72; }
.word-blue { color: #3f72b5; }
.word-amber { color: #bd8331; }
.word-coral { color: #c35b5f; }
.word-violet { color: #7661b7; }
.data-card {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 22px;
  background: var(--panel);
  box-shadow: 0 16px 42px rgba(15,36,56,.07);
}
.data-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 17px;
  border-bottom: 1px solid var(--line);
}
.data-toolbar > div { display: flex; align-items: center; gap: 14px; }
.data-exports { display: flex; align-items: center; gap: 8px; }
.data-toolbar small { color: var(--muted); font-size: .64rem; }
.data-status { display: inline-flex; align-items: center; gap: 7px; color: var(--ink-soft); font-size: .7rem; font-weight: 800; }
.data-status i { width: 7px; height: 7px; border-radius: 50%; background: var(--teal); }
.data-toolbar a {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 12px;
  border-radius: 10px;
  color: #fff;
  background: var(--teal);
  font-size: .68rem;
  font-weight: 900;
  text-decoration: none;
}
.table-wrap { max-height: 650px; overflow: auto; }
table.data { min-width: 1120px; }
table.data thead { position: sticky; z-index: 2; top: 0; }
table.data th { font-size: .62rem; letter-spacing: .04em; }
table.data td { font-size: .7rem; }
.strong { font-weight: 900; }
.description-cell { max-width: 260px; color: var(--ink-soft); }
.medium-pill {
  display: inline-flex;
  padding: 4px 7px;
  border-radius: 7px;
  color: var(--blue);
  background: var(--blue-50);
  font-size: .62rem;
  font-weight: 900;
}
.status-pill {
  display: inline-flex;
  padding: 5px 8px;
  border-radius: 999px;
  font-size: .58rem;
  font-weight: 900;
  white-space: nowrap;
}
.status-apta-pcr { color: #16755b; background: #e5f7f0; }
.status-pendiente { color: #996719; background: #fff3dd; }
.status-repetir-extraccion { color: #af4449; background: #ffebeb; }
.pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid var(--line);
}
.pagination span { color: var(--muted); font-size: .65rem; }
.pagination button {
  padding: 7px 10px;
  border: 1px solid var(--line);
  border-radius: 9px;
  color: var(--ink-soft);
  background: var(--panel);
  font-size: .65rem;
  font-weight: 800;
}
.pagination button:disabled { opacity: .4; cursor: not-allowed; }
@keyframes chapter-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}
@media (max-width: 1180px) {
  .metric-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .filter-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .filter-search { grid-column: span 2; }
}
@media (max-width: 980px) {
  .analytics-hero { grid-template-columns: 1fr; }
  .hero-lab-card { display: grid; grid-template-columns: .8fr 1fr; align-items: center; }
  .lab-card-head { grid-column: span 2; }
  .quality-doll { display: none; }
  .quality-orb { width: 130px; height: 130px; }
  .quality-orb::before { width: 106px; height: 106px; }
  .catalog-strip { grid-template-columns: repeat(3, 1fr); }
  .catalog-mode { grid-column: span 3; }
  .chart-grid.featured { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .span-three { grid-column: span 2; }
}
@media (max-width: 760px) {
  :global(html.reportes-analytics .topbar) {
    width: 100%;
    max-width: 100vw;
    gap: 8px;
    overflow: hidden;
    padding: 10px 14px;
  }
  :global(html.reportes-analytics .topbar-search),
  :global(html.reportes-analytics .topbar > .icon-btn),
  :global(html.reportes-analytics .user-chip .who),
  :global(html.reportes-analytics .user-chev) {
    display: none;
  }
  :global(html.reportes-analytics .crumbs) {
    min-width: 0;
    font-size: .72rem;
  }
  :global(html.reportes-analytics .crumbs span) {
    overflow: hidden;
    max-width: 150px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  :global(html.reportes-analytics .user-chip) {
    padding: 0;
  }
  .analytics-page { gap: 16px; }
  .analytics-hero { min-height: auto; padding: 30px 24px; border-radius: 24px; }
  .analytics-hero h1 { font-size: 2.45rem; }
  .hero-lab-card { display: block; }
  .lab-card-head { grid-column: auto; }
  .metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .control-deck { top: 58px; align-items: stretch; flex-direction: column; }
  .filter-toggle { justify-content: center; }
  .filter-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .filter-search { grid-column: span 2; }
  .chart-grid.two,
  .chart-grid.featured { grid-template-columns: 1fr; }
  .span-two, .span-three { grid-column: auto; }
  .chapter-head { align-items: flex-start; flex-direction: column; }
  .chapter-head p { text-align: left; }
  .morphology-cloud { grid-template-columns: 1fr; }
}
@media (max-width: 520px) {
  .catalog-strip { grid-template-columns: 1fr; }
  .catalog-strip > div { min-height: 68px; border-right: 0; border-bottom: 1px solid var(--line-soft); }
  .catalog-mode { grid-column: auto; }
  .metric-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
  .metric-card { padding: 13px; }
  .filter-grid { grid-template-columns: 1fr; }
  .filter-search { grid-column: auto; }
  .filter-head { gap: 12px; }
  .data-toolbar { align-items: flex-start; gap: 12px; flex-direction: column; }
}
</style>
