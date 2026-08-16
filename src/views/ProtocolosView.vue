<script setup lang="ts">
import { computed } from 'vue'
import Icon from '../components/Icon.vue'
import { categorias, protocolos, type Estado } from '../data/protocolos'

const grupos = computed(() =>
  categorias.map((c) => ({ ...c, items: protocolos.filter((p) => p.categoria === c.nombre) })),
)

// Tarjetas de estadística (derivadas de los datos reales).
const stats = computed(() => {
  const protoDe = (estados: Estado[]) =>
    categorias
      .filter((c) => estados.includes(c.estado))
      .reduce((n, c) => n + protocolos.filter((p) => p.categoria === c.nombre).length, 0)
  return {
    protocolos: protocolos.length,
    categorias: categorias.length,
    validados: protoDe(['Validado']),
    enRevision: protoDe(['En revisión', 'Pendiente']),
  }
})

const estadoClase: Record<Estado, string> = {
  Validado: 'est-ok',
  Activo: 'est-active',
  'En revisión': 'est-review',
  Pendiente: 'est-pending',
}
</script>

<template>
  <div class="page-head">
    <div>
      <h1>Protocolos</h1>
      <p class="sub">Procedimientos del laboratorio · {{ stats.protocolos }} protocolos documentados.</p>
    </div>
  </div>

  <!-- Tarjetas de estadística -->
  <div class="stats">
    <div class="stat">
      <img class="stat-ic" src="/protocolos/iconos/protocolos.png" alt="" />
      <div>
        <div class="stat-num">{{ stats.protocolos }}</div>
        <div class="stat-label">protocolos</div>
        <div class="stat-sub">documentados</div>
      </div>
    </div>
    <div class="stat">
      <img class="stat-ic" src="/protocolos/iconos/categorias.png" alt="" />
      <div>
        <div class="stat-num">{{ stats.categorias }}</div>
        <div class="stat-label">categorías</div>
        <div class="stat-sub">organizadas</div>
      </div>
    </div>
    <div class="stat">
      <img class="stat-ic" src="/protocolos/iconos/validos.png" alt="" />
      <div>
        <div class="stat-num">{{ stats.validados }}</div>
        <div class="stat-label">validados</div>
        <div class="stat-sub">listos para usar</div>
      </div>
    </div>
    <div class="stat">
      <img class="stat-ic" src="/protocolos/iconos/en-revision.png" alt="" />
      <div>
        <div class="stat-num">{{ stats.enRevision }}</div>
        <div class="stat-label">en revisión</div>
        <div class="stat-sub">pendientes</div>
      </div>
    </div>
  </div>

  <!-- Categorías -->
  <div class="cats">
    <RouterLink
      v-for="g in grupos"
      :key="g.slug"
      :to="`/protocolos/categoria/${g.slug}`"
      class="ccard"
      :class="'acc-' + g.acc"
    >
      <div class="ccard-img">
        <img v-if="g.img" :src="g.img" :alt="g.nombre" />
        <Icon v-else :name="g.icon" :size="32" />
      </div>
      <div class="ccard-body">
        <div class="ccard-name">{{ g.nombre }}</div>
        <div class="ccard-count">{{ g.items.length }} {{ g.items.length === 1 ? 'protocolo' : 'protocolos' }}</div>
        <span class="estado" :class="estadoClase[g.estado]">
          <Icon v-if="g.estado === 'Validado'" name="check" :size="13" />
          <span v-else class="edot"></span>
          {{ g.estado }}
        </span>
      </div>
      <span class="ccard-go"><Icon name="arrow" :size="18" /></span>
    </RouterLink>
  </div>

  <!-- Trazabilidad -->
  <div class="traza">
    <span class="traza-ic"><Icon name="shield" :size="20" /></span>
    <div class="traza-text">
      <b>Trazabilidad garantizada</b>
      <span>Cada protocolo está documentado, versionado y vinculado a registros para asegurar la integridad y el cumplimiento.</span>
    </div>
    <RouterLink to="/modelo" class="traza-btn"><Icon name="chart" :size="15" /> Ver trazabilidad</RouterLink>
  </div>
</template>

<style scoped>
.acc-0 { --a-bg: #e2f5ee; --a-fg: #0e8d7e; }
.acc-1 { --a-bg: #e6f0fb; --a-fg: #3074bf; }
.acc-2 { --a-bg: #efe9fb; --a-fg: #6f56c4; }
.acc-3 { --a-bg: #fcecdf; --a-fg: #c46a26; }
.acc-4 { --a-bg: #fbe8ef; --a-fg: #bd5380; }

/* ---------- Estadísticas ---------- */
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}
.stat {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 16px 18px;
}
.stat-ic {
  width: 54px;
  height: 54px;
  object-fit: contain;
  flex-shrink: 0;
}
.stat-num {
  font-size: 1.7rem;
  font-weight: 800;
  line-height: 1;
  color: var(--ink);
  font-family: "Sora", sans-serif;
}
.stat-label {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--ink);
  margin-top: 2px;
}
.stat-sub {
  font-size: 0.76rem;
  color: var(--muted);
}

/* ---------- Categorías ---------- */
.cats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(330px, 1fr));
  gap: 16px;
}
.ccard {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 14px 16px;
  text-decoration: none;
  color: inherit;
  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
}
.ccard:hover {
  transform: translateY(-2px);
  border-color: var(--a-fg);
  box-shadow: 0 10px 26px rgba(15, 36, 56, 0.08);
}
.ccard-img {
  display: grid;
  place-items: center;
  width: 84px;
  height: 84px;
  border-radius: 16px;
  flex-shrink: 0;
  background: var(--a-bg);
  color: var(--a-fg);
  overflow: hidden;
}
.ccard-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.ccard-body {
  flex: 1;
  min-width: 0;
}
.ccard-name {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--ink);
  line-height: 1.25;
}
.ccard-count {
  font-size: 0.82rem;
  color: var(--muted);
  margin: 3px 0 8px;
}
.estado {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 11px;
  border-radius: 999px;
  font-size: 0.76rem;
  font-weight: 700;
}
.estado .edot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}
.est-ok { background: #e6f6ec; color: #1f9d57; }
.est-active { background: #e6f0fb; color: #3074bf; }
.est-review { background: #fdf0db; color: #c98a1e; }
.est-pending { background: #fdece3; color: #d2682f; }

.ccard-go {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--a-bg);
  color: var(--a-fg);
  transition: transform 0.16s ease;
}
.ccard:hover .ccard-go {
  transform: translateX(3px);
}

/* ---------- Trazabilidad ---------- */
.traza {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 18px;
  padding: 16px 18px;
  border-radius: 18px;
  background: linear-gradient(120deg, #eef9fb, #f3fbf9);
  border: 1px solid #d7ebec;
}
.traza-ic {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  flex-shrink: 0;
  color: #fff;
  background: linear-gradient(135deg, #0f766e, #14b8a6);
}
.traza-text {
  flex: 1;
  min-width: 0;
}
.traza-text b {
  font-size: 0.95rem;
  color: var(--ink);
}
.traza-text span {
  display: block;
  font-size: 0.82rem;
  color: var(--ink-soft);
  line-height: 1.45;
}
.traza-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 15px;
  border-radius: 11px;
  border: 1px solid var(--teal-100);
  background: #fff;
  color: var(--teal-600);
  font-size: 0.84rem;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background 0.15s ease, color 0.15s ease;
}
.traza-btn:hover {
  background: var(--teal-600);
  color: #fff;
}

@media (max-width: 680px) {
  .traza {
    flex-wrap: wrap;
  }
}
</style>
