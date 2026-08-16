<script setup lang="ts">
import { computed, ref } from 'vue'
import Icon from '../components/Icon.vue'
import {
  SUPERVISADOS, NO_SUPERVISADOS, ARTICULOS, FUENTES_PUBLICAS,
  MADUREZ_LABEL, MADUREZ_DESC, type ModeloIA, type Articulo,
} from '../data/modelosIa'

const articuloPorId = computed(() => Object.fromEntries(ARTICULOS.map((a) => [a.id, a])) as Record<string, Articulo>)

const filtros = [
  { id: 'todos', label: 'Todos' },
  { id: 'supervisado', label: 'Supervisado' },
  { id: 'no-supervisado', label: 'No supervisado' },
  { id: 'listo', label: 'Aplicable pronto' },
  { id: 'estrella', label: '★ Clave para fagoterapia' },
]
const filtro = ref('todos')
const abierto = ref<string | null>('s1')

const todos = [...SUPERVISADOS, ...NO_SUPERVISADOS]
const lista = computed(() => {
  if (filtro.value === 'todos') return todos
  if (filtro.value === 'listo') return todos.filter((m) => m.madurez === 'listo')
  if (filtro.value === 'estrella') return todos.filter((m) => m.estrella)
  return todos.filter((m) => m.tipo === filtro.value)
})
const toggle = (id: string) => (abierto.value = abierto.value === id ? null : id)

function madurezClass(m: ModeloIA) {
  return m.madurez === 'listo' ? 'b-teal' : m.madurez === 'historial' ? 'b-amber' : 'b-coral'
}
</script>

<template>
  <section class="ia-hero">
    <div class="ia-hero-orbit orbit-a" />
    <div class="ia-hero-orbit orbit-b" />
    <div class="ia-hero-grid" />
    <Icon name="sparkles" :size="26" class="ia-hero-spark spark-1" />
    <Icon name="sparkles" :size="16" class="ia-hero-spark spark-2" />
    <Icon name="dna" :size="120" class="ia-hero-dna" />

    <div class="ia-hero-content">
      <div class="ia-hero-eyebrow"><span /> Inteligencia del laboratorio</div>
      <h1 class="ia-hero-title">Modelos de IA<br />para tu <em>fagoterapia</em></h1>
      <p class="ia-hero-sub">
        Cada decisión que hoy se toma a ojo puede volverse un modelo que aprende contigo.
        No reemplazan a los investigadores — les sugieren, ellos confirman, y esa confirmación entrena al siguiente.
      </p>

      <div class="ia-hero-porque">
        <div class="porque-card">
          <div class="porque-ic"><Icon name="help" :size="18" /></div>
          <div>
            <span class="porque-k">¿Por qué?</span>
            <p>En el Excel el conocimiento se perdía. En FagoLab cada registro se acumula y se vuelve dato entrenable.</p>
          </div>
        </div>
        <div class="porque-card">
          <div class="porque-ic"><Icon name="target" :size="18" /></div>
          <div>
            <span class="porque-k">¿Para qué?</span>
            <p>Para anticipar resultados, ahorrar reactivos y tiempo, y acercar el fago correcto a cada bacteria.</p>
          </div>
        </div>
      </div>

      <div class="ia-hero-stats">
        <div class="ia-stat"><b>{{ todos.length }}</b><span>modelos proyectados</span></div>
        <div class="ia-stat"><b>{{ SUPERVISADOS.length }}</b><span>supervisados</span></div>
        <div class="ia-stat"><b>{{ NO_SUPERVISADOS.length }}</b><span>no supervisados</span></div>
      </div>
    </div>

    <div class="ia-hero-visual">
      <div class="ia-visual-glow" />
      <img src="/robot-portada.png" alt="Mascota IA de FagoLab" class="ia-hero-robot" />
      <div class="ia-visual-chip chip-a"><Icon name="dna" :size="13" /> ADN apto</div>
      <div class="ia-visual-chip chip-b"><Icon name="dish" :size="13" /> Morfotipo</div>
      <div class="ia-visual-chip chip-c"><Icon name="phage" :size="13" /> Fago–hospedador</div>
    </div>
  </section>

  <!-- Idea central -->
  <div class="key-banner">
    <div class="key-ic"><Icon name="sparkles" :size="22" /></div>
    <div>
      <b>Tu app es la máquina de etiquetar.</b>
      Cada vez que registras "este ADN es apto", "esta colonia es el patógeno" o "esta PCR dio banda",
      creas un ejemplo de entrenamiento. En el Excel ese conocimiento se perdía; en FagoLab se acumula.
      Por eso la digitalización es el primer paso, y la IA es la cosecha.
    </div>
  </div>

  <!-- Paradigmas -->
  <div class="grid cols-2 para-grid">
    <article class="para-card sup">
      <div class="para-deco" />
      <div class="para-body">
        <span class="para-tag"><Icon name="target" :size="13" /> Supervisado</span>
        <h3>Predice una respuesta</h3>
        <p>Aprende de ejemplos del pasado <b>con la respuesta ya conocida</b> (qué especie, si el ADN sirve, si habrá lisis) y la predice en casos nuevos. <b>Necesita historial etiquetado</b> — el que la app va juntando.</p>
      </div>
      <div class="para-robot-wrap">
        <img src="/robot-supervisado.png" alt="" class="para-robot" />
      </div>
    </article>
    <article class="para-card nosup">
      <div class="para-deco" />
      <div class="para-body">
        <span class="para-tag"><Icon name="sparkles" :size="13" /> No supervisado</span>
        <h3>Encuentra estructura</h3>
        <p>No necesita respuestas: <b>descubre grupos, patrones y rarezas</b> por su cuenta (morfotipos, fagos afines, anomalías). <b>Da fruto antes</b>, con pocos datos.</p>
      </div>
      <div class="para-robot-wrap">
        <img src="/robot-no-supervisado.png" alt="" class="para-robot" />
      </div>
    </article>
  </div>

  <!-- Filtros -->
  <div class="tabbar">
    <button v-for="f in filtros" :key="f.id" class="tab" :class="{ on: filtro === f.id }" @click="filtro = f.id">{{ f.label }}</button>
    <span class="count">{{ lista.length }} modelos</span>
  </div>

  <!-- Modelos -->
  <div class="modelos">
    <article v-for="m in lista" :key="m.id" class="modelo" :class="[m.tipo, { open: abierto === m.id, star: m.estrella }]">
      <button class="modelo-head" @click="toggle(m.id)">
        <div class="m-ic" :class="{ 'm-ic-plain': m.id === 'u1' }">
          <img v-if="m.id === 'u1'" src="/cajas/caja-petri-transparente.png" alt="" class="m-ic-img" />
          <Icon v-else :name="m.icon" :size="19" />
        </div>
        <div class="m-titles">
          <div class="m-top">
            <span class="badge" :class="m.tipo === 'supervisado' ? 'b-blue' : 'b-violet'">{{ m.tipo === 'supervisado' ? 'Supervisado' : 'No supervisado' }}</span>
            <span class="badge" :class="madurezClass(m)">{{ MADUREZ_LABEL[m.madurez] }}</span>
            <span v-if="m.estrella" class="star-tag">★ Clave</span>
          </div>
          <h3>{{ m.titulo }}</h3>
          <p>{{ m.problema }}</p>
        </div>
        <Icon name="chevron" :size="18" class="caret" />
        <template v-if="m.id === 'u1'">
          <Icon name="sparkles" :size="16" class="head-decor-spark spark-a" />
          <Icon name="sparkles" :size="11" class="head-decor-spark spark-b" />
          <img src="/cajas/caja-petri-transparente.png" alt="" class="head-decor-dish" />
        </template>
      </button>

      <transition name="exp">
        <div v-if="abierto === m.id" class="modelo-body">
          <div class="ba">
            <div class="ba-col sin">
              <div class="ba-badge"><Icon name="close" :size="17" /></div>
              <div class="ba-text">
                <span class="ba-label">Sin modelo</span>
                <p>{{ m.sinModelo }}</p>
              </div>
              <img v-if="m.id === 'u1'" src="/cajas/caja-petri-transparente.png" alt="" class="ba-decor ba-decor-sin" />
            </div>
            <div class="ba-col con">
              <div class="ba-badge"><Icon name="check" :size="17" /></div>
              <div class="ba-text">
                <span class="ba-label">Con modelo</span>
                <p>{{ m.conModelo }}</p>
              </div>
              <img v-if="m.id === 'u1'" src="/cajas/caja-petri-transparente.png" alt="" class="ba-decor ba-decor-con" />
            </div>
          </div>

          <div class="ahorro">
            <div class="ahorro-badge"><Icon name="sparkles" :size="16" /></div>
            <div class="ahorro-text">
              <span class="ahorro-label">¿Qué ahorra y por qué?</span>
              <p>{{ m.ahorro }}</p>
            </div>
            <Icon name="chart" :size="26" class="ahorro-decor" />
          </div>

          <div v-if="m.id === 'u1'" class="asistente-panel">
            <Icon name="dna" :size="90" class="asistente-decor decor-dna" />
            <div class="asistente-decor decor-mol">
              <span class="mol-dot d1"></span><span class="mol-dot d2"></span><span class="mol-dot d3"></span>
              <span class="mol-dot d4"></span><span class="mol-dot d5"></span>
            </div>
            <img src="/agente-ia.png" alt="Agente de IA de FagoLab" class="asistente-img" />
            <div class="asistente-content">
              <span class="asistente-eyebrow">Tu asistente de IA en este módulo</span>
              <p class="asistente-msg">
                Te ayuda a unificar el vocabulario, comparar observaciones con <b>BacDive</b> y sugerir
                descripciones más claras.
              </p>
              <a href="https://bacdive.dsmz.de/" target="_blank" rel="noopener" class="asistente-link">
                <Icon name="microscope" :size="16" /> Explorar BacDive
              </a>
              <div class="asistente-warning">
                <Icon name="alert" :size="15" />
                <span>Sugerencia estadística, no diagnóstico. Confirmar con PCR o secuenciación.</span>
              </div>
            </div>
          </div>

          <div class="pipe">
            <span class="block-label"><Icon name="flow" :size="14" /> Cómo se construye (pipeline)</span>
            <div class="pipe-steps">
              <template v-for="(s, i) in m.pipeline" :key="i">
                <div class="pipe-step"><span class="pn">{{ i + 1 }}</span><span class="pt">{{ s }}</span></div>
                <Icon v-if="i < m.pipeline.length - 1" name="arrow" :size="14" class="pipe-arrow" />
              </template>
            </div>
          </div>

          <div class="meta-grid">
            <div class="meta">
              <span class="block-label"><Icon name="database" :size="13" /> Tus datos</span>
              <p class="mono-soft">{{ m.datos }}</p>
            </div>
            <div class="meta" v-if="m.datosPublicos.length">
              <span class="block-label"><Icon name="compass" :size="13" /> Datos públicos</span>
              <div class="chips-row"><span v-for="d in m.datosPublicos" :key="d" class="data-chip">{{ d }}</span></div>
            </div>
          </div>

          <div class="madurez-note">
            <Icon name="clock" :size="13" />
            <span>{{ MADUREZ_DESC[m.madurez] }}</span>
          </div>

          <div v-if="m.literatura.length" class="lit">
            <span class="block-label"><Icon name="book" :size="13" /> Basado en tu literatura</span>
            <div class="lit-chips">
              <template v-for="aid in m.literatura" :key="aid">
                <a v-if="articuloPorId[aid]"
                   :href="`https://doi.org/${articuloPorId[aid].doi}`" target="_blank" rel="noopener"
                   class="lit-chip" :class="{ local: articuloPorId[aid].local }">
                  <Icon name="link" :size="11" />
                  {{ articuloPorId[aid].autores.split(' ')[0] }} {{ articuloPorId[aid].anio }}
                  <span v-if="articuloPorId[aid].local" class="mx">🇲🇽</span>
                </a>
              </template>
            </div>
          </div>

        </div>
      </transition>
    </article>
  </div>

  <!-- Datos públicos -->
  <div class="section-block">
    <h2 class="block-title"><Icon name="compass" :size="18" /> Datos públicos que potencian estos modelos</h2>
    <p class="block-intro">Bases abiertas y gratuitas que aportan conocimiento del mundo (genomas, fenotipos, resistencia) sin tener que generarlo desde cero. Muchos modelos arrancan apoyándose en ellas.</p>
    <div class="grid cols-4 source-grid">
      <a v-for="f in FUENTES_PUBLICAS" :key="f.nombre" :href="f.url" target="_blank" rel="noopener" class="source-card">
        <div class="src-ic"><Icon :name="f.icon" :size="18" /></div>
        <b>{{ f.nombre }}</b>
        <span>{{ f.desc }}</span>
      </a>
    </div>
  </div>

  <!-- Literatura base -->
  <div class="section-block">
    <h2 class="block-title"><Icon name="book" :size="18" /> Literatura base (lo que has leído)</h2>
    <p class="block-intro">Cada modelo se ancla en evidencia publicada. Estos son los artículos que sustentan la propuesta — incluido un estudio mexicano de fagos en peces.</p>
    <div class="grid cols-2 lit-grid">
      <a v-for="a in ARTICULOS" :key="a.id" :href="`https://doi.org/${a.doi}`" target="_blank" rel="noopener" class="lit-card" :class="{ local: a.local }">
        <div class="lit-top">
          <span class="lit-rev">{{ a.revista }} · {{ a.anio }}</span>
          <span v-if="a.local" class="lit-mx">🇲🇽 México</span>
        </div>
        <b>{{ a.titulo }}</b>
        <p class="lit-tema">{{ a.tema }}</p>
        <div class="lit-foot"><span class="lit-aut">{{ a.autores }}</span><span class="lit-doi"><Icon name="link" :size="11" /> {{ a.doi }}</span></div>
      </a>
    </div>
  </div>

  <div class="closing">
    <Icon name="shield" :size="18" />
    <div>
      <b>Reality check honesto.</b> Lo supervisado necesita cientos de ejemplos etiquetados; hoy se están
      acumulando. Varios modelos arrancan mejor como reglas simples y suben a IA solo si hacen falta. Lo no
      supervisado da fruto antes. El valor del primer año es la trazabilidad y los reportes — la IA es la cosecha.
    </div>
  </div>
</template>

<style scoped>
/* ---------- Portada / Hero ---------- */
.ia-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(300px, .65fr);
  align-items: center;
  gap: 30px;
  overflow: hidden;
  margin-bottom: 26px;
  padding: clamp(30px, 4vw, 52px);
  border-radius: 28px;
  color: #f4f2ff;
  background:
    linear-gradient(120deg, #241a52 0%, #3a2782 46%, #5b3fb0 78%, #7c5cdb 100%),
    radial-gradient(circle at 82% 18%, rgba(124, 92, 219, .6), transparent 34%);
  box-shadow: 0 26px 64px rgba(46, 28, 110, .28);
}
.ia-hero-grid {
  position: absolute; inset: 0; opacity: .16; pointer-events: none;
  background-image:
    linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px);
  background-size: 40px 40px;
  mask-image: linear-gradient(90deg, #000, transparent 72%);
}
.ia-hero-orbit { position: absolute; border: 1px solid rgba(196, 181, 253, .28); border-radius: 50%; pointer-events: none; }
.orbit-a { right: -110px; top: -80px; width: 460px; height: 460px; }
.orbit-b { right: 30px; top: 60px; width: 240px; height: 240px; border-color: rgba(196, 181, 253, .18); }
.ia-hero-dna { position: absolute; left: -22px; bottom: -30px; color: #b9a4f5; opacity: .16; pointer-events: none; }
.ia-hero-spark { position: absolute; color: #f5d878; pointer-events: none; filter: drop-shadow(0 0 8px rgba(245, 216, 120, .5)); }
.spark-1 { top: 42px; right: 44%; }
.spark-2 { bottom: 60px; right: 38%; }

.ia-hero-content { position: relative; z-index: 2; }
.ia-hero-eyebrow { display: flex; align-items: center; gap: 9px; font-size: .68rem; font-weight: 900; letter-spacing: .14em; text-transform: uppercase; color: #d3c6fb; }
.ia-hero-eyebrow span { width: 26px; height: 1px; background: #d3c6fb; }
.ia-hero-title { margin-top: 15px; font-family: var(--font-heading); font-size: clamp(2.1rem, 4.4vw, 3.7rem); font-weight: 800; line-height: 1; letter-spacing: -.04em; color: #fff; }
.ia-hero-title em { font-style: normal; background: linear-gradient(100deg, #b9f5e4, #7ee0c8); -webkit-background-clip: text; background-clip: text; color: transparent; }
.ia-hero-sub { max-width: 560px; margin-top: 16px; font-size: .92rem; line-height: 1.65; color: rgba(238, 234, 255, .82); }

.ia-hero-porque { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 24px; max-width: 620px; }
.porque-card { display: flex; gap: 12px; align-items: flex-start; padding: 14px 16px; border-radius: 15px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.14); backdrop-filter: blur(8px); }
.porque-ic { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; flex: none; background: rgba(185, 245, 228, .18); color: #b9f5e4; }
.porque-k { display: block; font-size: .82rem; font-weight: 800; color: #fff; margin-bottom: 3px; }
.porque-card p { font-size: .76rem; line-height: 1.5; color: rgba(232, 228, 252, .78); }

.ia-hero-stats { display: flex; flex-wrap: wrap; gap: 26px; margin-top: 26px; }
.ia-stat { display: flex; flex-direction: column; }
.ia-stat b { font-family: var(--font-heading); font-size: 1.9rem; font-weight: 800; line-height: 1; color: #fff; }
.ia-stat span { margin-top: 5px; font-size: .72rem; font-weight: 600; letter-spacing: .02em; color: rgba(211, 198, 251, .8); }

.ia-hero-visual { position: relative; z-index: 2; display: grid; place-items: center; min-height: 260px; }
.ia-visual-glow { position: absolute; width: 320px; height: 320px; border-radius: 50%; background: radial-gradient(circle, rgba(185, 245, 228, .4), transparent 66%); filter: blur(6px); }
.ia-hero-robot { position: relative; z-index: 1; display: block; width: 100%; max-width: 320px; height: auto; filter: drop-shadow(0 18px 30px rgba(20, 12, 55, .45)); }
.ia-visual-chip { position: absolute; z-index: 2; display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 99px; font-size: .74rem; font-weight: 800; color: #33235e; background: rgba(255,255,255,.94); box-shadow: 0 8px 20px rgba(20, 12, 55, .28); }
.ia-visual-chip svg { color: var(--violet); }
.chip-a { top: 14%; left: -4%; }
.chip-b { top: 46%; right: -6%; }
.chip-c { bottom: 10%; left: 2%; }

@media (max-width: 860px) {
  .ia-hero { grid-template-columns: 1fr; text-align: left; }
  .ia-hero-visual { order: -1; min-height: 200px; }
  .ia-hero-robot { max-width: 220px; }
  .ia-hero-porque { grid-template-columns: 1fr; }
  .spark-1, .spark-2 { display: none; }
}

.key-banner { display: flex; gap: 14px; align-items: flex-start; padding: 16px 18px; border-radius: 16px; margin-bottom: 20px; background: linear-gradient(120deg, var(--teal-50), #fff); border: 1px solid var(--teal-100); font-size: 0.88rem; line-height: 1.6; color: var(--ink-soft); }
.key-banner b { color: var(--teal-600); }
.key-ic { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 13px; background: var(--teal); color: #fff; flex: none; }

.para-grid { margin-bottom: 22px; gap: 16px; }
.para-card { position: relative; display: flex; align-items: center; gap: 12px; padding: 22px; border-radius: 20px; overflow: hidden; border: 1px solid var(--line); box-shadow: var(--shadow-sm); min-height: 190px; transition: transform .18s, box-shadow .18s; }
.para-card:hover { transform: translateY(-3px); box-shadow: var(--shadow); }
.para-card.sup { background: linear-gradient(120deg, #eaf1ff 0%, #f6f9ff 55%, #fff 100%); border-color: #d7e4fb; }
.para-card.nosup { background: linear-gradient(120deg, #f3eefe 0%, #faf7ff 55%, #fff 100%); border-color: #e5dcfb; }
.para-deco { position: absolute; border-radius: 50%; pointer-events: none; }
.para-card.sup .para-deco { top: -40px; left: -40px; width: 150px; height: 150px; background: radial-gradient(circle, rgba(47,111,237,.16), transparent 70%); }
.para-card.nosup .para-deco { top: -40px; left: -40px; width: 150px; height: 150px; background: radial-gradient(circle, rgba(124,92,219,.16), transparent 70%); }
.para-body { position: relative; z-index: 1; flex: 1; min-width: 0; }
.para-tag { display: inline-flex; align-items: center; gap: 6px; padding: 4px 11px; border-radius: 99px; font-size: .68rem; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 9px; }
.para-card.sup .para-tag { background: var(--blue); color: #fff; }
.para-card.nosup .para-tag { background: var(--violet); color: #fff; }
.para-card h3 { font-family: var(--font-heading); font-size: 1.28rem; font-weight: 800; letter-spacing: -.02em; margin-bottom: 8px; color: var(--ink); }
.para-card.sup h3 { color: #1c47a8; }
.para-card.nosup h3 { color: #5a3aa8; }
.para-card p { color: var(--ink-soft); font-size: 0.83rem; line-height: 1.6; }
.para-robot-wrap { position: relative; z-index: 1; flex: none; align-self: stretch; display: flex; align-items: flex-end; }
.para-robot { width: 128px; height: auto; filter: drop-shadow(0 10px 18px rgba(40, 30, 90, .2)); }

.tabbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 18px; }
.tab { padding: 9px 15px; border-radius: 11px; border: 1px solid var(--line); background: var(--panel); color: var(--ink-soft); font-weight: 700; font-size: 0.84rem; }
.tab.on { background: linear-gradient(135deg, var(--teal), var(--teal-600)); color: #fff; border-color: transparent; }
.count { margin-left: auto; color: var(--muted); font-size: 0.8rem; font-weight: 600; }

.modelos { display: grid; gap: 12px; margin-bottom: 36px; }
.modelo { border: 1px solid var(--line); border-radius: 16px; background: var(--panel); overflow: hidden; box-shadow: var(--shadow-sm); transition: box-shadow .2s; }
.modelo.open { box-shadow: var(--shadow); }
.modelo.supervisado { border-left: 4px solid var(--blue); }
.modelo.no-supervisado { border-left: 4px solid var(--violet); }
.modelo.star { border-left-width: 5px; }
.modelo.star.supervisado { border-left-color: #2563eb; }
.modelo-head { position: relative; display: flex; align-items: flex-start; gap: 14px; width: 100%; text-align: left; padding: 16px 18px; overflow: hidden; }
.head-decor-dish { position: absolute; top: 8px; right: 46px; width: 76px; height: auto; pointer-events: none; }
.head-decor-spark { position: absolute; color: #f5c451; pointer-events: none; }
.head-decor-spark.spark-a { top: 4px; right: 128px; }
.head-decor-spark.spark-b { top: 46px; right: 156px; }
.m-ic { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; flex: none; }
.supervisado .m-ic { background: var(--blue-50); color: var(--blue); }
.no-supervisado .m-ic { background: var(--violet-50); color: var(--violet); }
.m-titles { flex: 1; min-width: 0; }
.m-top { display: flex; gap: 7px; align-items: center; margin-bottom: 6px; flex-wrap: wrap; }
.star-tag { font-size: 0.64rem; font-weight: 900; color: #b8860b; background: #fff7e0; padding: 2px 8px; border-radius: 99px; }
.m-titles h3 { font-size: 1rem; line-height: 1.25; }
.m-titles p { margin-top: 5px; color: var(--muted); font-size: 0.8rem; line-height: 1.5; }
.caret { color: var(--muted); flex: none; margin-top: 8px; transition: transform .2s; }
.modelo.open .caret { transform: rotate(90deg); }

.modelo-body { padding: 4px 18px 20px; }
.ba { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
.ba-col { position: relative; display: flex; gap: 12px; align-items: flex-start; padding: 16px; border-radius: 14px; overflow: hidden; }
.ba-col.sin { background: var(--coral-50); }
.ba-col.con { background: var(--teal-50); }
.ba-badge { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 50%; flex: none; }
.ba-col.sin .ba-badge { background: #fbdad7; color: var(--coral); }
.ba-col.con .ba-badge { background: #cdf1e3; color: var(--teal-600); }
.ba-text { flex: 1; min-width: 0; position: relative; z-index: 1; }
.ba-label { display: block; font-size: 0.92rem; font-weight: 800; margin-bottom: 4px; }
.ba-col.sin .ba-label { color: var(--coral); }
.ba-col.con .ba-label { color: var(--teal-600); }
.ba-col p { font-size: 0.82rem; line-height: 1.55; color: var(--ink-soft); }
.ba-decor { position: absolute; right: -14px; bottom: -18px; width: 88px; height: auto; opacity: 0.4; pointer-events: none; }
.ba-decor-sin { filter: hue-rotate(300deg) saturate(1.3); }
.ba-decor-con { filter: hue-rotate(70deg) saturate(0.9); }
.ahorro { position: relative; display: flex; gap: 12px; align-items: flex-start; padding: 14px 16px; border-radius: 14px; background: var(--amber-50); margin-bottom: 14px; overflow: hidden; }
.ahorro-badge { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; background: #fce6b0; color: #b8860b; flex: none; }
.ahorro-text { flex: 1; min-width: 0; }
.ahorro-label { display: block; font-size: 0.88rem; font-weight: 800; color: #7c5310; margin-bottom: 3px; }
.ahorro-text p { font-size: 0.82rem; line-height: 1.55; color: #9a6a1a; }
.ahorro-decor { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); color: #f0c674; pointer-events: none; }

.block-label { display: inline-flex; align-items: center; gap: 6px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ink); margin-bottom: 9px; }
.pipe { margin-bottom: 14px; }
.pipe-steps { display: flex; flex-wrap: wrap; align-items: stretch; gap: 8px; }
.pipe-step { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 10px; background: var(--bg); border: 1px solid var(--line); max-width: 230px; }
.pn { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; background: var(--teal); color: #fff; font-size: 0.7rem; font-weight: 800; flex: none; }
.pt { font-size: 0.78rem; color: var(--ink-soft); font-weight: 600; line-height: 1.3; }
.pipe-arrow { color: var(--muted); align-self: center; flex: none; }

.meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 12px; }
.mono-soft { font-family: "SFMono-Regular", "Consolas", monospace; font-size: 0.76rem; color: var(--ink-soft); line-height: 1.5; }
.chips-row { display: flex; flex-wrap: wrap; gap: 6px; }
.data-chip { padding: 4px 10px; border-radius: 8px; background: var(--blue-50); color: var(--blue); font-size: 0.72rem; font-weight: 700; }
.madurez-note { display: flex; gap: 7px; align-items: flex-start; font-size: 0.78rem; color: var(--muted); margin-bottom: 12px; line-height: 1.5; }
.lit { border-top: 1px dashed var(--line); padding-top: 12px; }
.lit-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.lit-chip { display: inline-flex; align-items: center; gap: 5px; padding: 5px 11px; border-radius: 99px; background: var(--violet-50); color: var(--violet); font-size: 0.74rem; font-weight: 700; }
.lit-chip:hover { filter: brightness(0.96); }
.lit-chip.local { background: #e7f7ee; color: #1c7a4a; }
.lit-chip .mx { font-size: 0.7rem; }

.section-block { margin: 12px 0 28px; }
.block-title { display: flex; align-items: center; gap: 9px; font-size: 1.15rem; margin-bottom: 6px; }
.block-intro { color: var(--muted); font-size: 0.85rem; line-height: 1.55; max-width: 760px; margin-bottom: 16px; }
.source-grid { gap: 12px; }
.source-card { display: flex; flex-direction: column; gap: 6px; padding: 16px; border-radius: 14px; background: var(--panel); border: 1px solid var(--line); box-shadow: var(--shadow-sm); transition: all .15s; }
.source-card:hover { transform: translateY(-2px); border-color: var(--teal); box-shadow: var(--shadow); }
.src-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; background: var(--teal-50); color: var(--teal); margin-bottom: 4px; }
.source-card b { font-size: 0.86rem; color: var(--ink); }
.source-card span { font-size: 0.76rem; color: var(--muted); line-height: 1.45; }

.lit-grid { gap: 14px; }
.lit-card { display: flex; flex-direction: column; gap: 7px; padding: 18px; border-radius: 16px; background: var(--panel); border: 1px solid var(--line); box-shadow: var(--shadow-sm); transition: all .15s; }
.lit-card:hover { transform: translateY(-2px); box-shadow: var(--shadow); border-color: var(--violet); }
.lit-card.local { border-color: #b6e6cb; background: linear-gradient(120deg, #f0fbf5, #fff); }
.lit-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.lit-rev { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--violet); }
.lit-card.local .lit-rev { color: #1c7a4a; }
.lit-mx { font-size: 0.68rem; font-weight: 800; color: #1c7a4a; background: #e7f7ee; padding: 2px 8px; border-radius: 99px; }
.lit-card b { font-size: 0.92rem; line-height: 1.35; color: var(--ink); }
.lit-tema { font-size: 0.78rem; color: var(--ink-soft); line-height: 1.5; }
.lit-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 2px; flex-wrap: wrap; }
.lit-aut { font-size: 0.74rem; color: var(--muted); }
.lit-doi { display: inline-flex; align-items: center; gap: 4px; font-size: 0.7rem; color: var(--violet); font-weight: 700; }

.closing { display: flex; gap: 12px; align-items: flex-start; padding: 18px 20px; border-radius: 16px; background: var(--ink); color: #e7eef5; font-size: 0.86rem; line-height: 1.6; }
.closing b { color: #fff; }
.closing svg { color: var(--teal); flex: none; margin-top: 2px; }

.m-ic-plain { width: 56px; height: 56px; background: none; }
.m-ic-img { width: 56px; height: 56px; object-fit: contain; }

.asistente-panel { position: relative; display: flex; gap: 20px; align-items: center; padding: 24px; border-radius: 18px; margin-bottom: 14px; background: linear-gradient(135deg, #fbfbff 0%, #f3f1ff 100%); border: 1px solid #e6e1fb; overflow: hidden; }
.asistente-img { width: 280px; height: auto; flex: none; position: relative; z-index: 1; filter: drop-shadow(0 8px 16px rgba(80, 70, 160, 0.15)); }
.asistente-content { flex: 1; min-width: 0; position: relative; z-index: 1; }
.asistente-eyebrow { display: block; font-size: 1.08rem; font-weight: 800; color: var(--violet); margin-bottom: 8px; }
.asistente-msg { font-size: 0.88rem; color: var(--ink-soft); line-height: 1.65; margin-bottom: 14px; }
.asistente-msg b { color: var(--violet); }
.asistente-link { display: inline-flex; align-items: center; gap: 8px; padding: 13px 24px; border-radius: 99px; background: var(--violet); color: #fff; font-size: 0.9rem; font-weight: 800; text-decoration: none; transition: all .15s; margin-bottom: 14px; }
.asistente-link:hover { filter: brightness(0.95); transform: translateY(-1px); box-shadow: 0 6px 16px rgba(124, 92, 219, 0.3); }
.asistente-warning { display: flex; gap: 7px; align-items: flex-start; font-size: 0.78rem; color: #9a6a1a; line-height: 1.5; }
.asistente-warning svg { flex: none; margin-top: 1px; color: #e0a020; }

.asistente-decor { position: absolute; pointer-events: none; }
.decor-dna { color: var(--violet); opacity: 0.1; left: -10px; bottom: -14px; }
.decor-mol { width: 90px; height: 90px; right: 16px; top: 16px; opacity: 0.15; }
.mol-dot { position: absolute; width: 7px; height: 7px; border-radius: 50%; border: 2px solid var(--violet); }
.mol-dot.d1 { top: 0; left: 40px; } .mol-dot.d2 { top: 30px; left: 0; } .mol-dot.d3 { top: 30px; left: 80px; }
.mol-dot.d4 { top: 65px; left: 20px; } .mol-dot.d5 { top: 65px; left: 60px; }

.exp-enter-active, .exp-leave-active { transition: opacity .2s; }
.exp-enter-from, .exp-leave-to { opacity: 0; }
@media (max-width: 720px) {
  .ba, .meta-grid { grid-template-columns: 1fr; }
  .asistente-panel { flex-direction: column; align-items: center; text-align: center; }
  .asistente-img { width: 200px; }
  .head-decor-dish, .head-decor-spark { display: none; }
}
</style>
