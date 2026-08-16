<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Icon from '../components/Icon.vue'
import { categorias, protocolos } from '../data/protocolos'

const route = useRoute()
const catSlug = computed(() => String(route.params.cat || ''))
const cat = computed(() => categorias.find((c) => c.slug === catSlug.value))
const items = computed(() => protocolos.filter((p) => p.categoria === cat.value?.nombre))
const acc = computed(() => 'acc-' + (cat.value?.acc ?? 0))
</script>

<template>
  <div v-if="cat" :class="acc">
    <RouterLink to="/protocolos" class="volver"><Icon name="arrow" :size="15" /> Protocolos</RouterLink>

    <div class="cat-head">
      <div class="cat-img">
        <img v-if="cat.img" :src="cat.img" :alt="cat.nombre" />
        <Icon v-else :name="cat.icon" :size="34" />
      </div>
      <div class="cat-meta">
        <h1>{{ cat.nombre }}</h1>
        <p class="sub">{{ cat.descripcion }}</p>
        <div class="cat-tags">
          <span class="chip-count">{{ items.length }} {{ items.length === 1 ? 'protocolo' : 'protocolos' }}</span>
          <span class="estado" :class="'est-' + cat.estado.toLowerCase().replace(' ', '').replace('ó', 'o')">{{ cat.estado }}</span>
        </div>
      </div>
    </div>

    <div class="plist">
      <RouterLink
        v-for="(p, i) in items"
        :key="p.slug"
        :to="`/protocolos/${p.slug}`"
        class="pitem"
      >
        <span class="pitem-n">{{ i + 1 }}</span>
        <span class="pitem-text">
          <span class="pitem-titulo">
            {{ p.titulo }}
            <span v-if="p.adaptado" class="pitem-tag">Dra. Nydia</span>
          </span>
          <span class="pitem-resumen">{{ p.resumen }}</span>
        </span>
        <span class="pitem-go"><Icon name="arrow" :size="16" /></span>
      </RouterLink>
    </div>
  </div>

  <div v-else class="no-encontrado">
    <Icon name="report" :size="32" />
    <p>No encontramos esa categoría.</p>
    <RouterLink to="/protocolos" class="chip-count">Ver todos los protocolos</RouterLink>
  </div>
</template>

<style scoped>
.acc-0 { --a-bg: #e2f5ee; --a-fg: #0e8d7e; }
.acc-1 { --a-bg: #e6f0fb; --a-fg: #3074bf; }
.acc-2 { --a-bg: #efe9fb; --a-fg: #6f56c4; }
.acc-3 { --a-bg: #fcecdf; --a-fg: #c46a26; }
.acc-4 { --a-bg: #fbe8ef; --a-fg: #bd5380; }

.volver {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--a-fg);
  text-decoration: none;
  margin-bottom: 16px;
}
.volver svg {
  transform: rotate(180deg);
}
.volver:hover {
  text-decoration: underline;
}

.cat-head {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 20px;
}
.cat-img {
  display: grid;
  place-items: center;
  width: 96px;
  height: 96px;
  border-radius: 20px;
  flex-shrink: 0;
  overflow: hidden;
  background: var(--a-bg);
  color: var(--a-fg);
}
.cat-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.cat-meta {
  flex: 1;
  min-width: 0;
}
.cat-meta h1 {
  font-size: 1.6rem;
  margin: 0 0 4px;
  color: var(--ink);
}
.cat-meta .sub {
  font-size: 0.9rem;
  color: var(--ink-soft);
  line-height: 1.5;
  max-width: 640px;
}
.cat-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
}
.chip-count {
  font-size: 0.78rem;
  font-weight: 700;
  padding: 4px 11px;
  border-radius: 999px;
  background: var(--a-bg);
  color: var(--a-fg);
  text-decoration: none;
}
.estado {
  font-size: 0.76rem;
  font-weight: 700;
  padding: 4px 11px;
  border-radius: 999px;
}
.est-validado { background: #e6f6ec; color: #1f9d57; }
.est-activo { background: #e6f0fb; color: #3074bf; }
.est-enrevision { background: #fdf0db; color: #c98a1e; }
.est-pendiente { background: #fdece3; color: #d2682f; }

.plist {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pitem {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 14px 16px;
  text-decoration: none;
  color: inherit;
  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
}
.pitem:hover {
  transform: translateY(-2px);
  border-color: var(--a-fg);
  box-shadow: 0 8px 22px rgba(15, 36, 56, 0.07);
}
.pitem-n {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  flex-shrink: 0;
  background: var(--a-bg);
  color: var(--a-fg);
  font-weight: 800;
  font-size: 0.85rem;
}
.pitem-text {
  flex: 1;
  min-width: 0;
}
.pitem-titulo {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--ink);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.pitem-tag {
  font-size: 0.64rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--a-fg);
  color: #fff;
}
.pitem-resumen {
  display: block;
  font-size: 0.8rem;
  color: var(--ink-soft);
  line-height: 1.45;
  margin-top: 2px;
}
.pitem-go {
  color: var(--muted);
  flex-shrink: 0;
  transition: transform 0.15s ease, color 0.15s ease;
}
.pitem:hover .pitem-go {
  color: var(--a-fg);
  transform: translateX(3px);
}

.no-encontrado {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  text-align: center;
  color: var(--muted);
  padding: 60px 20px;
}
</style>
