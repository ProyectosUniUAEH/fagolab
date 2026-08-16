<script setup lang="ts">
defineProps<{ steps: string[]; current: number }>()
const emit = defineEmits<{ (e: 'go', index: number): void }>()
</script>

<template>
  <div class="stepper">
    <template v-for="(s, i) in steps" :key="i">
      <div
        class="step"
        :class="{ done: i < current, active: i === current }"
        @click="i <= current && emit('go', i)"
        :style="{ cursor: i <= current ? 'pointer' : 'default' }"
      >
        <div class="num">
          <svg v-if="i < current" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-11" /></svg>
          <span v-else>{{ i + 1 }}</span>
        </div>
        <div class="ttl">{{ s }}</div>
      </div>
      <div v-if="i < steps.length - 1" class="step-line" :class="{ done: i < current }"></div>
    </template>
  </div>
</template>
