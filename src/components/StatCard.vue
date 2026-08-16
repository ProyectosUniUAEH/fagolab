<script setup lang="ts">
import Icon from './Icon.vue'

defineProps<{
  label: string
  value: string | number
  icon: string
  tone?: 'teal' | 'blue' | 'amber' | 'coral' | 'violet'
  delta?: string
  sub?: string
}>()

const tones: Record<string, { bg: string; fg: string }> = {
  teal: { bg: 'var(--teal-50)', fg: 'var(--teal)' },
  blue: { bg: 'var(--blue-50)', fg: 'var(--blue)' },
  amber: { bg: 'var(--amber-50)', fg: 'var(--amber)' },
  coral: { bg: 'var(--coral-50)', fg: 'var(--coral)' },
  violet: { bg: 'var(--violet-50)', fg: 'var(--violet)' },
}
</script>

<template>
  <div class="card stat">
    <div class="top">
      <div class="ic" :style="{ background: tones[tone ?? 'teal'].bg, color: tones[tone ?? 'teal'].fg }">
        <Icon :name="icon" :size="20" />
      </div>
      <span class="label">{{ label }}</span>
    </div>
    <div class="value">{{ value }}</div>
    <div style="display: flex; gap: 8px; align-items: center">
      <span v-if="delta" class="delta up">{{ delta }}</span>
      <span v-if="sub" class="delta flat">{{ sub }}</span>
    </div>
  </div>
</template>
