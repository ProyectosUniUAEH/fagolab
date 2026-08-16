<script setup lang="ts">
import { ref, computed } from 'vue'
import Icon from '../components/Icon.vue'
import GelRegistro from '../components/GelRegistro.vue'
import { useLabStore } from '../stores/lab'
import { api } from '../api'
import { useAuthStore } from '../stores/auth'

const lab = useLabStore()
const auth = useAuthStore()
const tab = ref<'registrar' | 'geles' | 'resultados'>(
  auth.can('electroforesis.gels.create') ? 'registrar' : 'geles',
)

// Clasifica todas las muestras (no blancos/controles/marcadores) corridas en geles
// según su resultado de electroforesis: positivas a la bacteria buscada, negativas,
// y las que aún no se pueden asignar (no concluyente / pendiente / sin revisar).
interface MuestraResultado {
  codigo: string
  gen?: string
  gel: string
  fecha: string
  pozo: number
  tamanoPb?: number
  estado: string
}
const clasificacion = computed(() => {
  const pcrById = new Map(lab.state.pcr.map((p) => [p.id, p]))
  const positivas: MuestraResultado[] = []
  const negativas: MuestraResultado[] = []
  const sinDeterminar: MuestraResultado[] = []
  for (const g of lab.state.geles) {
    for (const c of g.carriles) {
      if (c.tipo !== 'muestra') continue // solo muestras reales
      const pcr = c.idPcr ? pcrById.get(c.idPcr) : undefined
      const estado = c.estado || (c.banda ? 'positivo' : 'pendiente')
      const item: MuestraResultado = {
        codigo: c.codigoVisible,
        gen: pcr?.genObjetivo,
        gel: g.codigo,
        fecha: g.fecha,
        pozo: c.numero,
        tamanoPb: c.tamanoPb,
        estado,
      }
      if (estado === 'positivo') positivas.push(item)
      else if (estado === 'negativo') negativas.push(item)
      else sinDeterminar.push(item)
    }
  }
  return { positivas, negativas, sinDeterminar }
})

const estadoLabel: Record<string, string> = {
  pendiente: 'Pendiente',
  positivo: 'Positivo',
  negativo: 'Negativo',
  no_claro: 'No claro',
  no_revisado: 'Sin revisar',
}
const estadoBadge: Record<string, string> = {
  pendiente: 'b-slate',
  positivo: 'b-teal',
  negativo: 'b-coral',
  no_claro: 'b-amber',
  no_revisado: 'b-slate',
}
const tipoBadge: Record<string, string> = {
  marcador: 'b-violet',
  blanco: 'b-slate',
  positivo: 'b-amber',
  control: 'b-slate',
  muestra: 'b-blue',
}
const tipoLabel: Record<string, string> = {
  marcador: 'marcador',
  blanco: 'blanco −',
  positivo: 'control +',
  control: 'control',
  muestra: 'muestra',
}

// Posición vertical de la banda según tamaño en pb (escala log invertida: más grande = más arriba).
function bandaY(pb?: number) {
  if (!pb) return 0
  const min = 100, max = 3000
  const t = (Math.log10(max) - Math.log10(Math.min(Math.max(pb, min), max))) / (Math.log10(max) - Math.log10(min))
  return 14 + t * 150 // dentro del área del gel (alto ~178)
}
const ladder = [3000, 2000, 1500, 1000, 700, 500, 300, 100]
</script>

<template>
  <section class="electro-hero">
    <div class="electro-copy">
      <span class="eyebrow"><Icon name="wave" :size="15" /> Cuarto de electroforesis</span>
      <h1>Electroforesis</h1>
      <p>
        Registra el gel pozo por pozo, sube la foto del fotodocumentador y visualiza las bandas con una ruta más clara
        para cuidar la evidencia y la bioseguridad.
      </p>
      <div class="hero-pills">
        <span><Icon name="shield" :size="14" /> Doble guante</span>
        <span><Icon name="droplet" :size="14" /> Bromuro / contaminantes</span>
        <span><Icon name="beaker" :size="14" /> Buffer y agarosa listos</span>
      </div>
    </div>
  </section>

  <section class="safety-card" aria-label="Científica dando advertencias de seguridad">
    <div class="sc-header">
      <span class="sc-chip"><Icon name="shield" :size="14" /> Bioseguridad</span>
      <div class="sc-titles">
        <h2>Cuarto de electroforesis</h2>
        <p>Cuida la evidencia y tu seguridad en esta área.</p>
      </div>
    </div>

    <div class="sc-body">
      <div class="sc-figure">
        <span class="sc-halo" aria-hidden="true"></span>
        <div class="talking-scientist" aria-hidden="true">
        <svg viewBox="0 0 240 380" role="img">
          <defs>
            <radialGradient id="skin" cx="42%" cy="38%" r="70%">
              <stop offset="0%" stop-color="#ffe2d2" />
              <stop offset="100%" stop-color="#f6c2a8" />
            </radialGradient>
            <linearGradient id="hairg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#3a2c40" />
              <stop offset="100%" stop-color="#241a2c" />
            </linearGradient>
            <linearGradient id="coatg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#ffffff" />
              <stop offset="100%" stop-color="#e8eef4" />
            </linearGradient>
            <linearGradient id="scrubg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#2bb39a" />
              <stop offset="100%" stop-color="#179e84" />
            </linearGradient>
            <linearGradient id="gloveg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#b9a9f0" />
              <stop offset="100%" stop-color="#9b86e6" />
            </linearGradient>
          </defs>

          <g class="chat-sparkles">
            <path d="M28 66l5 12 12 5-12 5-5 12-5-12-12-5 12-5z" />
            <path d="M210 92l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" />
            <path d="M206 250l6 13 13 6-13 6-6 13-6-13-13-6 13-6z" />
          </g>

          <ellipse class="doll-shadow" cx="120" cy="362" rx="68" ry="11" />

          <g class="doll-body">
            <path class="hair-back" d="M64 120 C44 70 78 26 120 24 C162 26 196 70 176 120 C190 180 184 250 168 286 C160 250 170 188 156 150 L84 150 C70 188 80 250 72 286 C56 250 50 180 64 120 Z" />

            <path class="leg" d="M104 250 h14 v104 h-14 z" />
            <path class="leg" d="M122 250 h14 v104 h-14 z" />
            <path class="shoe" d="M98 350 h24 c4 0 6 3 6 8 v6 h-34 v-6 c0-3 2-8 4-8 z" />
            <path class="shoe" d="M118 350 h24 c4 0 6 3 6 8 v6 h-34 v-6 c0-3 2-8 4-8 z" />

            <path class="scrub" d="M92 168 C92 150 148 150 148 168 L150 256 H90 Z" />

            <path class="coat" d="M86 165 C92 138 148 138 154 165 L176 296 C150 312 90 312 64 296 Z" />
            <path class="coat-lapel" d="M120 150 L98 168 L116 232 Z" />
            <path class="coat-lapel" d="M120 150 L142 168 L124 232 Z" />
            <path class="coat-line" d="M120 168 V300" />
            <circle class="coat-btn" cx="120" cy="214" r="2.6" />
            <circle class="coat-btn" cx="120" cy="240" r="2.6" />

            <path class="arm-down" d="M92 176 C70 196 64 232 70 266" />
            <ellipse class="glove" cx="70" cy="272" rx="13" ry="14" />

            <g class="arm-point">
              <path class="arm-up" d="M150 174 C182 164 196 132 196 104" />
              <ellipse class="glove" cx="196" cy="98" rx="13" ry="14" />
              <path class="finger" d="M196 90 v-16" />
            </g>
          </g>

          <g class="doll-head">
            <path class="neck" d="M108 138 h24 v18 h-24 z" />
            <ellipse class="face" cx="120" cy="96" rx="46" ry="48" />
            <ellipse class="ear" cx="76" cy="100" rx="8" ry="10" />
            <ellipse class="ear" cx="164" cy="100" rx="8" ry="10" />

            <path class="hair-front" d="M74 96 C66 48 104 30 120 30 C136 30 174 48 166 96 C168 74 150 58 140 60 C150 70 150 86 146 92 C140 70 120 64 120 64 C120 64 100 70 94 92 C90 86 90 70 100 60 C90 58 72 74 74 96 Z" />

            <g class="brows">
              <path d="M98 78 q10 -6 20 -1" />
              <path d="M122 77 q10 -5 20 1" />
            </g>
            <g class="eyes">
              <circle cx="106" cy="92" r="5.4" />
              <circle cx="134" cy="92" r="5.4" />
              <circle class="eye-spark" cx="108" cy="90" r="1.7" />
              <circle class="eye-spark" cx="136" cy="90" r="1.7" />
            </g>
            <circle class="blush" cx="92" cy="108" r="7" />
            <circle class="blush" cx="148" cy="108" r="7" />
            <path class="nose" d="M120 100 v8" />
            <path class="mouth" d="M110 116 q10 9 20 0" />

            <g class="goggles">
              <rect class="lens" x="92" y="80" width="24" height="20" rx="9" />
              <rect class="lens" x="124" y="80" width="24" height="20" rx="9" />
              <path class="goggle-bridge" d="M116 90 h8" />
              <path class="goggle-strap" d="M92 86 C80 84 74 86 70 92" />
              <path class="goggle-strap" d="M148 86 C160 84 166 86 170 92" />
            </g>
          </g>
        </svg>
        </div>
      </div>

      <ol class="sc-steps">
        <li>
          <span class="sc-num n-amber">1</span>
          <div class="sc-step-txt">
            <b>Puede haber contaminación por bromuro</b>
            <span>Trabaja siempre con precaución.</span>
          </div>
        </li>
        <li>
          <span class="sc-num n-purple">2</span>
          <div class="sc-step-txt">
            <b>Usa doble guante en esta área</b>
            <span>Protege tu piel del bromuro y reactivos.</span>
          </div>
        </li>
        <li>
          <span class="sc-num n-coral">3</span>
          <div class="sc-step-txt">
            <b>Evita trasladar objetos</b>
            <span>El material de este cuarto no sale a otras áreas.</span>
          </div>
        </li>
        <li>
          <span class="sc-num n-teal">4</span>
          <div class="sc-step-txt">
            <b>Si se acaba el buffer o el gel de agarosa</b>
            <span>Consulta los protocolos y avisa antes a la doctora.</span>
          </div>
        </li>
      </ol>
    </div>

    <div class="sc-foot">
      <Icon name="shield" :size="15" /> Protege tus muestras, tu espacio y tu seguridad.
    </div>
  </section>

  <div class="tabs no-print">
    <button v-if="auth.can('electroforesis.gels.create')" class="tab" :class="{ on: tab === 'registrar' }" @click="tab = 'registrar'">
      <Icon name="grid" :size="16" /> Registrar gel
    </button>
    <button class="tab" :class="{ on: tab === 'geles' }" @click="tab = 'geles'">
      <Icon name="wave" :size="16" /> Geles registrados
      <span v-if="lab.state.geles.length" class="tab-count">{{ lab.state.geles.length }}</span>
    </button>
    <button class="tab" :class="{ on: tab === 'resultados' }" @click="tab = 'resultados'">
      <Icon name="check" :size="16" /> Resultados
      <span v-if="clasificacion.positivas.length" class="tab-count">{{ clasificacion.positivas.length }}</span>
    </button>
  </div>

  <GelRegistro v-if="tab === 'registrar'" />

  <template v-else-if="tab === 'geles'">
  <div v-if="!lab.state.geles.length" class="empty" style="padding: 30px">
    Todavía no hay geles registrados. Ve a <b>Registrar gel</b> para crear el primero.
  </div>
  <div v-for="g in lab.state.geles" :key="g.id" class="grid cols-2" style="margin-bottom: 18px">
    <div class="card">
      <div class="card-head"><div class="ic"><Icon name="wave" :size="16" /></div><h3>{{ g.codigo }}</h3>
        <span class="badge b-slate" style="margin-left: auto">{{ g.agarosaPct }}% agarosa · {{ g.voltaje }} V</span>
      </div>
      <div class="card-pad">
        <!-- Gel renderizado -->
        <div style="background: #14181f; border-radius: 12px; padding: 16px; position: relative">
          <svg :viewBox="`0 0 ${g.carriles.length * 60 + 50} 200`" style="width: 100%; height: 220px">
            <!-- escala de pb -->
            <g v-for="pb in ladder" :key="pb">
              <text :x="2" :y="bandaY(pb) + 4" fill="#5b6b7d" font-size="9">{{ pb }}</text>
            </g>
            <!-- carriles -->
            <g v-for="(c, i) in g.carriles" :key="c.numero">
              <text :x="50 + i * 60 + 22" y="12" fill="#8ba0b5" font-size="9" text-anchor="middle">{{ c.numero }}</text>
              <rect :x="50 + i * 60" y="14" width="44" height="172" rx="3" fill="#1b212b" />
              <!-- marcador: escalera -->
              <template v-if="c.tipo === 'marcador'">
                <rect v-for="pb in ladder" :key="pb" :x="50 + i * 60 + 4" :y="bandaY(pb)" width="36" height="3" rx="1.5" fill="#7fd3c6" opacity="0.85" />
              </template>
              <!-- banda de muestra -->
              <rect v-else-if="c.banda" :x="50 + i * 60 + 4" :y="bandaY(c.tamanoPb)" width="36" height="6" rx="2" fill="#5ef0d6">
                <animate attributeName="opacity" values="0.6;1;0.6" dur="2.5s" repeatCount="indefinite" />
              </rect>
            </g>
          </svg>
          <div style="display: flex; gap: 0; padding: 0 0 0 50px">
            <div v-for="c in g.carriles" :key="c.numero" style="width: 60px; text-align: center">
              <span style="font-size: 0.62rem; color: #8ba0b5; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap" :title="c.codigoVisible">{{ c.codigoVisible }}</span>
            </div>
          </div>
        </div>
        <div v-if="g.imagenUrl" class="real-foto">
          <span class="foto-label"><Icon name="upload" :size="14" /> Foto del fotodocumentador</span>
          <img :src="api.mediaUrl(g.imagenUrl)" alt="Foto real del gel" />
        </div>
        <div v-else class="info-banner amber" style="margin-top: 14px">
          <Icon name="upload" :size="16" />
          <span>Este gel no tiene foto. Súbela desde <b>Registrar gel</b> para guardar la evidencia del transiluminador.</span>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><div class="ic"><Icon name="report" :size="16" /></div><h3>Carriles y bandas detectadas</h3></div>
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>Pozo</th><th>Muestra</th><th>Tipo</th><th>Resultado</th><th>Tamaño (pb)</th></tr></thead>
          <tbody>
            <tr v-for="c in g.carriles" :key="c.numero">
              <td><b>{{ c.numero }}</b></td>
              <td class="mono">{{ c.codigoVisible }}</td>
              <td><span class="badge" :class="tipoBadge[c.tipo] || 'b-blue'">{{ tipoLabel[c.tipo] || c.tipo }}</span></td>
              <td><span class="badge" :class="estadoBadge[c.estado || (c.banda ? 'positivo' : 'pendiente')]">{{ estadoLabel[c.estado || (c.banda ? 'positivo' : 'pendiente')] }}</span></td>
              <td>{{ c.tamanoPb ?? '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="card-pad">
        <div class="section-title"><Icon name="dna" :size="16" /> Siguiente paso: secuenciación</div>
        <p class="sub">Las bandas positivas se envían a secuenciar (Sanger / NGS). El resultado se identifica contra <b>NCBI BLAST</b> y se guarda en <b>resultados_blast</b> — futura automatización con Airflow.</p>
      </div>
    </div>
  </div>
  </template>

  <!-- ===================== RESULTADOS ===================== -->
  <template v-else-if="tab === 'resultados'">
    <div class="info-banner teal" style="margin-bottom: 16px">
      <Icon name="check" :size="16" />
      <span>Clasificación de las muestras corridas en electroforesis. Los <b>blancos</b>, <b>controles</b> y <b>marcadores</b> no se incluyen: solo las muestras del estudio.</span>
    </div>

    <!-- Resumen -->
    <div class="res-kpis">
      <div class="res-kpi pos">
        <div class="rk-num">{{ clasificacion.positivas.length }}</div>
        <div class="rk-lbl">Positivas a la bacteria buscada</div>
      </div>
      <div class="res-kpi neg">
        <div class="rk-num">{{ clasificacion.negativas.length }}</div>
        <div class="rk-lbl">Negativas</div>
      </div>
      <div class="res-kpi ind">
        <div class="rk-num">{{ clasificacion.sinDeterminar.length }}</div>
        <div class="rk-lbl">Sin determinar / no concluyente</div>
      </div>
    </div>

    <div class="grid cols-2">
      <!-- Positivas -->
      <div class="card res-col">
        <div class="card-head">
          <div class="ic ic-pos"><Icon name="check" :size="16" /></div>
          <h3>Positivas a la bacteria buscada</h3>
          <span class="badge b-teal" style="margin-left: auto">{{ clasificacion.positivas.length }}</span>
        </div>
        <div class="card-pad">
          <p class="sub" style="margin-bottom: 12px">Muestras con banda del tamaño esperado: candidatas a confirmación por secuenciación.</p>
          <div v-if="!clasificacion.positivas.length" class="empty-mini">Aún no hay muestras positivas registradas.</div>
          <div v-for="m in clasificacion.positivas" :key="m.gel + '-' + m.pozo" class="res-item pos">
            <div class="ri-main">
              <span class="mono ri-cod">{{ m.codigo }}</span>
              <span v-if="m.gen" class="ri-gen"><Icon name="dna" :size="12" /> {{ m.gen }}</span>
            </div>
            <div class="ri-meta">
              <span>{{ m.gel }} · pozo {{ m.pozo }}</span>
              <span v-if="m.tamanoPb" class="ri-pb">{{ m.tamanoPb }} pb</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Negativas + sin determinar -->
      <div class="card res-col">
        <div class="card-head">
          <div class="ic ic-neg"><Icon name="wave" :size="16" /></div>
          <h3>Negativas y sin asignar</h3>
          <span class="badge b-slate" style="margin-left: auto">{{ clasificacion.negativas.length + clasificacion.sinDeterminar.length }}</span>
        </div>
        <div class="card-pad">
          <!-- Negativas -->
          <div class="res-sub-title"><span class="dot neg"></span> Negativas <small>({{ clasificacion.negativas.length }})</small></div>
          <p class="sub" style="margin: 4px 0 10px">No amplificaron la bacteria buscada.</p>
          <div v-if="!clasificacion.negativas.length" class="empty-mini">Sin muestras negativas.</div>
          <div v-for="m in clasificacion.negativas" :key="m.gel + '-' + m.pozo" class="res-item neg">
            <div class="ri-main"><span class="mono ri-cod">{{ m.codigo }}</span></div>
            <div class="ri-meta"><span>{{ m.gel }} · pozo {{ m.pozo }}</span></div>
          </div>

          <!-- Sin determinar -->
          <div class="res-sub-title" style="margin-top: 18px"><span class="dot ind"></span> Sin determinar / no concluyente <small>({{ clasificacion.sinDeterminar.length }})</small></div>
          <p class="sub" style="margin: 4px 0 10px">Banda no clara, pendiente o sin revisar: no se puede asignar todavía. Requiere repetir o secuenciar.</p>
          <div v-if="!clasificacion.sinDeterminar.length" class="empty-mini">Nada pendiente por determinar.</div>
          <div v-for="m in clasificacion.sinDeterminar" :key="m.gel + '-' + m.pozo" class="res-item ind">
            <div class="ri-main">
              <span class="mono ri-cod">{{ m.codigo }}</span>
              <span class="badge" :class="estadoBadge[m.estado]" style="font-size: 0.62rem">{{ estadoLabel[m.estado] }}</span>
            </div>
            <div class="ri-meta"><span>{{ m.gel }} · pozo {{ m.pozo }}</span></div>
          </div>
        </div>
      </div>
    </div>
  </template>
</template>

<style scoped>
.electro-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 250px;
  gap: 22px;
  align-items: center;
  padding: 26px;
  margin-bottom: 18px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background:
    radial-gradient(circle at 82% 18%, rgba(126, 255, 227, .26), transparent 28%),
    linear-gradient(135deg, var(--panel), color-mix(in srgb, var(--blue-50) 70%, #fff));
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}
.electro-copy h1 {
  margin-top: 14px;
  font-size: 2.15rem;
}
.electro-copy p {
  max-width: 760px;
  margin-top: 10px;
  color: var(--ink-soft);
  line-height: 1.55;
}
.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 12px;
  border-radius: 999px;
  background: #fff;
  color: var(--teal-600);
  font-weight: 800;
  font-size: .78rem;
  box-shadow: var(--shadow-sm);
}
.hero-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  margin-top: 18px;
}
.hero-pills span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255,255,255,.82);
  border: 1px solid var(--line);
  color: var(--ink-soft);
  font-size: .8rem;
  font-weight: 800;
}
/* ---------- Tarjeta de seguridad ---------- */
.safety-card {
  position: relative;
  margin-bottom: 18px;
  border-radius: var(--radius-lg);
  background: var(--panel);
  border: 1px solid var(--line);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}
.sc-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 24px;
  background: linear-gradient(120deg, var(--teal-600), #14b8a6);
  color: #fff;
}
.sc-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex: none;
  padding: 7px 14px;
  border-radius: 999px;
  background: rgba(255,255,255,.2);
  color: #fff;
  font-size: .76rem;
  font-weight: 800;
  letter-spacing: .02em;
}
.sc-titles h2 { margin: 0; font-size: 1.15rem; color: #fff; }
.sc-titles p { margin: 2px 0 0; font-size: .82rem; color: rgba(255,255,255,.85); }

.sc-body {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 26px;
  align-items: center;
  padding: 24px 28px;
}
.sc-figure {
  position: relative;
  display: grid;
  place-items: center;
  align-self: stretch;
  min-width: 0;
}
.sc-halo {
  position: absolute;
  inset: 50% auto auto 50%;
  width: 210px;
  height: 210px;
  transform: translate(-50%, -46%);
  border-radius: 50%;
  background: radial-gradient(circle at 50% 42%, #e7f6f1 0%, #eef0fb 62%, transparent 72%);
}
.sc-halo::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px dashed rgba(15,118,110,.18);
  animation: halo-spin 22s linear infinite;
}
.talking-scientist {
  position: relative;
  display: grid;
  place-items: end center;
  min-width: 0;
}
.talking-scientist svg {
  width: 210px;
  overflow: visible;
  filter: drop-shadow(0 16px 22px rgba(67,42,107,.16));
}

/* ----- Científica ----- */
.doll-body { animation: doll-float 4s ease-in-out infinite; transform-origin: 120px 250px; }
.doll-head { animation: doll-head-talk 3.4s ease-in-out infinite; transform-origin: 120px 140px; }
.doll-shadow { fill: rgba(67,42,107,.14); }
.hair-back { fill: #2c2233; }
.hair-front { fill: #3a2c44; }
.neck { fill: #f3bda3; }
.face { fill: url(#skin); stroke: #f0b59b; stroke-width: 1.5; }
.ear { fill: #f6c2a8; }
.brows { fill: none; stroke: #5a4636; stroke-width: 3; stroke-linecap: round; }
.eyes { fill: #2a2030; animation: doll-blink 5s ease-in-out infinite; transform-origin: 120px 92px; }
.eye-spark { fill: #fff; }
.blush { fill: #ff9aa4; opacity: .4; }
.nose { fill: none; stroke: #e09e84; stroke-width: 2.4; stroke-linecap: round; }
.mouth { fill: none; stroke: #c2596a; stroke-width: 3; stroke-linecap: round; animation: mouth-talk 1.4s ease-in-out infinite; transform-origin: 120px 116px; }
.lens { fill: rgba(193,232,255,.5); stroke: #45c0d8; stroke-width: 3; }
.goggle-bridge, .goggle-strap { fill: none; stroke: #45c0d8; stroke-width: 3; stroke-linecap: round; }
.coat { fill: url(#coatg); stroke: #d7c9ef; stroke-width: 1.5; }
.coat-lapel { fill: #f4f0fb; }
.coat-line { fill: none; stroke: #d7c9ef; stroke-width: 1.8; }
.coat-btn { fill: #c9b9ee; }
.scrub { fill: url(#scrubg); }
.leg { fill: url(#scrubg); }
.shoe { fill: #fff; stroke: #2bb39a; stroke-width: 2; }
.arm-down, .arm-up { fill: none; stroke: url(#coatg); stroke: #f4f0fb; stroke-width: 20; stroke-linecap: round; }
.arm-point { animation: doll-point 2.6s ease-in-out infinite; transform-origin: 150px 174px; }
.finger { fill: none; stroke: #9b86e6; stroke-width: 9; stroke-linecap: round; }
.glove { fill: url(#gloveg); stroke: #7d68d6; stroke-width: 1.5; }
.chat-sparkles path { fill: #b9a9f0; animation: chat-sparkle 2.6s ease-in-out infinite; }
.chat-sparkles path:nth-child(2) { fill: #ffce6b; animation-delay: .5s; }
.chat-sparkles path:nth-child(3) { fill: #5dcaa5; animation-delay: 1s; }

/* ----- Contenido del póster ----- */
/* Lista numerada tipo línea de tiempo */
.sc-steps {
  list-style: none;
  position: relative;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.sc-steps::before {
  content: "";
  position: absolute;
  left: 17px;
  top: 12px;
  bottom: 12px;
  width: 2px;
  background: var(--line);
}
.sc-steps li {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  z-index: 1;
}
.sc-num {
  display: grid;
  place-items: center;
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-family: "Sora", sans-serif;
  font-weight: 800;
  font-size: .95rem;
  color: #fff;
  box-shadow: 0 0 0 4px var(--panel);
}
.n-amber { background: #e9a121; }
.n-purple { background: #7d68d6; }
.n-coral { background: var(--coral); }
.n-teal { background: var(--teal-600); }
.sc-step-txt { padding-top: 2px; }
.sc-step-txt b { display: block; color: var(--ink); font-size: .92rem; }
.sc-step-txt span { display: block; margin-top: 2px; color: var(--ink-soft); font-size: .8rem; line-height: 1.4; }

.sc-foot {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 13px 24px;
  background: #f6f4fb;
  border-top: 1px solid var(--line);
  color: #5a3da0;
  font-weight: 800;
  font-size: .85rem;
}
.sc-foot svg { color: #7d68d6; }
.tabs {
  display: inline-flex;
  gap: 4px;
  background: var(--line-soft);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 18px;
}
.tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  border-radius: 9px;
  font-weight: 700;
  font-size: 0.86rem;
  color: var(--muted);
  transition: all 0.15s;
}
.tab svg {
  color: var(--muted);
}
.tab.on {
  background: #fff;
  color: var(--teal-600);
  box-shadow: var(--shadow-sm);
}
.tab.on svg {
  color: var(--teal);
}
.tab-count {
  display: inline-grid;
  place-items: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--teal-100);
  color: var(--teal-600);
  font-size: 0.7rem;
  font-weight: 800;
}
.real-foto {
  margin-top: 14px;
}
.foto-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--muted);
  margin-bottom: 8px;
}
.real-foto img {
  width: 100%;
  border-radius: 12px;
  background: #14181f;
}

/* ---------- Resultados ---------- */
.res-kpis {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 18px;
}
.res-kpi {
  border-radius: 14px;
  padding: 18px 20px;
  border: 1px solid var(--line);
  background: #fff;
}
.res-kpi .rk-num {
  font-family: "Sora", sans-serif;
  font-weight: 800;
  font-size: 1.9rem;
  line-height: 1;
}
.res-kpi .rk-lbl {
  font-size: 0.8rem;
  color: var(--muted);
  margin-top: 6px;
  font-weight: 600;
}
.res-kpi.pos {
  background: linear-gradient(135deg, #e6f7f1, #f3fcf8);
  border-color: #bfe6d7;
}
.res-kpi.pos .rk-num {
  color: var(--teal-600);
}
.res-kpi.neg {
  background: linear-gradient(135deg, #fdeceb, #fef6f5);
  border-color: #f3c9c4;
}
.res-kpi.neg .rk-num {
  color: var(--coral);
}
.res-kpi.ind {
  background: linear-gradient(135deg, #fdf4e3, #fffdf8);
  border-color: #f1ddb2;
}
.res-kpi.ind .rk-num {
  color: #c2871d;
}
.ic-pos {
  background: var(--teal-100) !important;
  color: var(--teal-600) !important;
}
.ic-neg {
  background: var(--coral-50) !important;
  color: var(--coral) !important;
}
.res-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--line);
  margin-bottom: 8px;
  border-left-width: 3px;
}
.res-item.pos {
  border-left-color: var(--teal);
  background: #f6fcfa;
}
.res-item.neg {
  border-left-color: var(--coral);
  background: #fdf8f7;
}
.res-item.ind {
  border-left-color: #e0a93a;
  background: #fffdf7;
}
.ri-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.ri-cod {
  font-weight: 700;
  font-size: 0.86rem;
}
.ri-gen {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--teal-600);
  background: var(--teal-100);
  padding: 2px 8px;
  border-radius: 99px;
}
.ri-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.74rem;
  color: var(--muted);
  text-align: right;
  white-space: nowrap;
}
.ri-pb {
  font-weight: 700;
  color: var(--ink-soft);
}
.res-sub-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  font-size: 0.9rem;
}
.res-sub-title small {
  color: var(--muted);
  font-weight: 600;
}
.res-sub-title .dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}
.res-sub-title .dot.neg {
  background: var(--coral);
}
.res-sub-title .dot.ind {
  background: #e0a93a;
}
.empty-mini {
  font-size: 0.82rem;
  color: var(--muted);
  padding: 10px 0;
  font-style: italic;
}
@media (max-width: 700px) {
  .res-kpis {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 980px) {
  .electro-hero {
    grid-template-columns: 1fr;
  }
  .sc-body {
    grid-template-columns: 190px 1fr;
    gap: 18px;
  }
  .talking-scientist svg { width: 190px; }
}
@media (max-width: 620px) {
  .sc-body {
    grid-template-columns: 1fr;
    justify-items: center;
  }
  .sc-figure { margin-bottom: 6px; }
}
@keyframes halo-spin {
  to { transform: rotate(360deg); }
}
@keyframes doll-float {
  0%, 100% { transform: translateY(0) rotate(-.6deg); }
  50% { transform: translateY(-5px) rotate(.6deg); }
}
@keyframes doll-head-talk {
  0%, 100% { transform: translateY(0) rotate(-1deg); }
  45% { transform: translateY(-3px) rotate(1deg); }
}
@keyframes doll-blink {
  0%, 88%, 100% { transform: scaleY(1); }
  91%, 94% { transform: scaleY(.08); }
}
@keyframes mouth-talk {
  0%, 100% { transform: scaleY(.65); }
  50% { transform: scaleY(1.2); }
}
@keyframes doll-point {
  0%, 100% { transform: rotate(-2deg); }
  50% { transform: rotate(5deg) translateX(2px); }
}
@keyframes glove-pop {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}
@keyframes chat-sparkle {
  0%, 100% { opacity: .28; transform: scale(.75) rotate(0deg); }
  50% { opacity: 1; transform: scale(1.14) rotate(18deg); }
}
@keyframes speech-pop {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
</style>
