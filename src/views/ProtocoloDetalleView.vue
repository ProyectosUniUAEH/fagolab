<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Icon from '../components/Icon.vue'
import { categorias, protocolos } from '../data/protocolos'

const route = useRoute()
const slug = computed(() => String(route.params.slug || ''))
const proto = computed(() => protocolos.find((p) => p.slug === slug.value))
const cat = computed(() => categorias.find((c) => c.nombre === proto.value?.categoria))
const acc = computed(() => 'acc-' + (cat.value?.acc ?? 0))
const pdfUrl = computed(() => `/protocolos/${slug.value}.pdf`)
</script>

<template>
  <div v-if="proto" :class="acc">
    <RouterLink to="/protocolos" class="volver"><Icon name="arrow" :size="15" /> Protocolos</RouterLink>

    <div class="proto-head">
      <span class="proto-ic"><Icon :name="cat?.icon || 'report'" :size="22" /></span>
      <div class="proto-meta">
        <span class="proto-cat">{{ proto.categoria }}</span>
        <h1>{{ proto.titulo }}</h1>
        <p class="sub">{{ proto.resumen }}</p>
        <span v-if="proto.adaptado" class="proto-tag">Adaptado por la Dra. Nydia</span>
      </div>
      <div class="proto-actions">
        <a class="pbtn" :href="pdfUrl" target="_blank" rel="noopener"><Icon name="arrow" :size="15" /> Abrir</a>
        <a class="pbtn solid" :href="pdfUrl" :download="proto.slug + '.pdf'"><Icon name="download" :size="15" /> Descargar</a>
      </div>
    </div>

    <div class="visor">
      <iframe :src="pdfUrl + '#view=FitH'" :title="proto.titulo"></iframe>
    </div>
  </div>

  <div v-else class="no-encontrado">
    <Icon name="report" :size="32" />
    <p>No encontramos ese protocolo.</p>
    <RouterLink to="/protocolos" class="pbtn solid">Ver todos los protocolos</RouterLink>
  </div>
</template>

<style scoped>
.acc-0 { --a-bg: #ddf3ec; --a-fg: #0e8d7e; }
.acc-1 { --a-bg: #e3eefb; --a-fg: #3074bf; }
.acc-2 { --a-bg: #ece7fb; --a-fg: #6f56c4; }
.acc-3 { --a-bg: #fcecdf; --a-fg: #c46a26; }
.acc-4 { --a-bg: #fbe8ef; --a-fg: #bd5380; }

.volver {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--a-fg, var(--teal-600));
  text-decoration: none;
  margin-bottom: 14px;
}
.volver svg {
  transform: rotate(180deg);
}
.volver:hover {
  text-decoration: underline;
}

.proto-head {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 18px;
}
.proto-ic {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  flex-shrink: 0;
  background: var(--a-bg);
  color: var(--a-fg);
}
.proto-meta {
  flex: 1;
  min-width: 0;
}
.proto-cat {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--a-fg);
}
.proto-meta h1 {
  font-size: 1.5rem;
  margin: 2px 0 4px;
  color: var(--ink);
}
.proto-meta .sub {
  font-size: 0.9rem;
  color: var(--ink-soft);
}
.proto-tag {
  display: inline-block;
  margin-top: 8px;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--a-bg);
  color: var(--a-fg);
}
.proto-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.pbtn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 11px;
  border: 1px solid var(--a-bg);
  background: var(--a-bg);
  color: var(--a-fg);
  font-size: 0.84rem;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.pbtn:hover {
  background: var(--a-fg);
  color: #fff;
}
.pbtn.solid {
  background: var(--a-fg);
  color: #fff;
  border-color: var(--a-fg);
}
.pbtn.solid:hover {
  filter: brightness(1.08);
}

.visor {
  border: 1px solid var(--line);
  border-radius: 16px;
  overflow: hidden;
  background: #f5f7f9;
  height: 78vh;
  min-height: 480px;
}
.visor iframe {
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
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

@media (max-width: 640px) {
  .proto-head {
    flex-wrap: wrap;
  }
  .proto-actions {
    width: 100%;
  }
}
</style>
