<script setup lang="ts">
import { computed, ref } from 'vue'

export interface PetriColony {
  id: string
  label: string
  description: string
  color: string
  size: number
  score: number
}

const props = defineProps<{ colonies: PetriColony[] }>()
const hovered = ref<PetriColony | null>(null)

function hash(value: string) {
  return [...value].reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0)
}

const dots = computed(() =>
  props.colonies.slice(0, 42).map((colony, index) => {
    const seed = Math.abs(hash(`${colony.id}-${index}`))
    const angle = ((seed % 360) * Math.PI) / 180
    const radius = 18 + ((seed >> 3) % 70)
    return {
      ...colony,
      x: 120 + Math.cos(angle) * radius,
      y: 120 + Math.sin(angle) * radius,
      delay: `${(seed % 18) / 10}s`,
    }
  }),
)
</script>

<template>
  <div class="petri-lab">
    <div class="petri-copy">
      <span class="petri-kicker">BIOVISUAL · SVG VIVO</span>
      <h3>Caja Petri digital</h3>
      <p>
        Cada colonia representa una muestra filtrada. El tamaño sigue la concentración y
        el halo expresa su score de pureza.
      </p>
      <div class="petri-legend">
        <span><i class="mint" /> alta pureza</span>
        <span><i class="amber" /> revisar</span>
        <span><i class="coral" /> repetir</span>
      </div>
      <div class="petri-insight">
        <b>{{ colonies.length }}</b>
        <span>colonias en la selección actual</span>
      </div>
    </div>

    <div class="dish-wrap">
      <svg viewBox="0 0 240 240" role="img" aria-label="Caja Petri animada con colonias">
        <defs>
          <radialGradient id="agar" cx="42%" cy="38%">
            <stop offset="0%" stop-color="#fafff8" />
            <stop offset="72%" stop-color="#dff4e9" />
            <stop offset="100%" stop-color="#b9ded3" />
          </radialGradient>
          <filter id="softGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle cx="120" cy="120" r="108" fill="rgba(255,255,255,.72)" stroke="#8ab9ad" stroke-width="3" />
        <circle cx="120" cy="120" r="96" fill="url(#agar)" stroke="rgba(255,255,255,.9)" stroke-width="2" />
        <path d="M46 82c32-40 104-54 149-12" fill="none" stroke="rgba(255,255,255,.76)" stroke-width="7" stroke-linecap="round" />
        <g
          v-for="dot in dots"
          :key="dot.id"
          class="colony"
          :style="{ '--delay': dot.delay }"
          @mouseenter="hovered = dot"
          @mouseleave="hovered = null"
        >
          <circle
            class="halo"
            :cx="dot.x"
            :cy="dot.y"
            :r="dot.size + 5"
            :fill="dot.color"
            :opacity="0.08 + dot.score / 900"
          />
          <circle
            :cx="dot.x"
            :cy="dot.y"
            :r="dot.size"
            :fill="dot.color"
            fill-opacity=".84"
            stroke="rgba(255,255,255,.8)"
            stroke-width="1.2"
            filter="url(#softGlow)"
          />
        </g>
      </svg>

      <div v-if="hovered" class="petri-tooltip">
        <b>{{ hovered.label }}</b>
        <span>{{ hovered.description || 'Colonia sin descripción' }}</span>
        <em>Pureza {{ hovered.score }}%</em>
      </div>
    </div>
  </div>
</template>

<style scoped>
.petri-lab {
  position: relative;
  display: grid;
  min-height: 430px;
  grid-template-columns: minmax(220px, 0.82fr) minmax(330px, 1.18fr);
  align-items: center;
  overflow: hidden;
  border: 1px solid rgba(33, 109, 91, 0.18);
  border-radius: 28px;
  background:
    radial-gradient(circle at 82% 28%, rgba(109, 205, 171, 0.23), transparent 24%),
    linear-gradient(135deg, #f8f4e8, #eef9f4 55%, #e4f4f3);
  box-shadow: 0 22px 60px rgba(23, 78, 69, 0.11);
}
.petri-lab::before {
  position: absolute;
  inset: 0;
  content: '';
  opacity: 0.26;
  background-image: radial-gradient(rgba(40, 110, 92, 0.22) 0.8px, transparent 0.8px);
  background-size: 18px 18px;
  mask-image: linear-gradient(90deg, #000, transparent 72%);
}
.petri-copy {
  position: relative;
  z-index: 2;
  padding: 34px;
}
.petri-kicker {
  color: #247f6c;
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.15em;
}
h3 {
  margin-top: 9px;
  font-family: var(--font-heading);
  font-size: clamp(1.65rem, 3vw, 2.5rem);
  line-height: 1;
}
p {
  margin: 14px 0 22px;
  color: #547069;
  font-size: 0.84rem;
  line-height: 1.65;
}
.petri-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  color: #5f756f;
  font-size: 0.7rem;
  font-weight: 700;
}
.petri-legend span { display: inline-flex; align-items: center; gap: 6px; }
.petri-legend i { width: 8px; height: 8px; border-radius: 50%; }
.mint { background: #2daa84; }
.amber { background: #d89a38; }
.coral { background: #d45f63; }
.petri-insight {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 26px;
}
.petri-insight b {
  color: #176c5a;
  font-family: var(--font-heading);
  font-size: 2rem;
}
.petri-insight span {
  max-width: 130px;
  color: #6a7e78;
  font-size: 0.68rem;
  line-height: 1.35;
}
.dish-wrap {
  position: relative;
  z-index: 1;
  display: grid;
  min-height: 430px;
  place-items: center;
}
svg {
  width: min(92%, 430px);
  overflow: visible;
  filter: drop-shadow(0 25px 35px rgba(42, 105, 91, 0.2));
  transform: rotate(-4deg);
}
.colony { cursor: crosshair; transform-origin: center; }
.colony .halo {
  transform-box: fill-box;
  transform-origin: center;
  animation: colony-pulse 3.6s var(--delay) ease-in-out infinite;
}
.petri-tooltip {
  position: absolute;
  right: 24px;
  bottom: 24px;
  display: flex;
  width: min(210px, 70%);
  flex-direction: column;
  padding: 12px 14px;
  border: 1px solid rgba(255,255,255,.72);
  border-radius: 14px;
  color: #274c44;
  background: rgba(255,255,255,.88);
  box-shadow: 0 14px 35px rgba(28, 76, 66, .15);
  backdrop-filter: blur(10px);
}
.petri-tooltip b { font-size: .78rem; }
.petri-tooltip span { margin: 3px 0 7px; color: #687d77; font-size: .68rem; }
.petri-tooltip em { color: #25806c; font-size: .66rem; font-style: normal; font-weight: 900; }
@keyframes colony-pulse {
  0%, 100% { transform: scale(.92); opacity: .08; }
  50% { transform: scale(1.45); opacity: .2; }
}
@media (prefers-reduced-motion: reduce) {
  .colony .halo { animation: none; }
}
@media (max-width: 780px) {
  .petri-lab { grid-template-columns: 1fr; }
  .petri-copy { padding: 26px 26px 0; }
  .dish-wrap { min-height: 350px; }
}
</style>
