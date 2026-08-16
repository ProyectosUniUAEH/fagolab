<script setup lang="ts">
import Icon from '../components/Icon.vue'
</script>

<template>
  <main class="forbidden">
    <div class="forbidden-card">
      <span><Icon name="shield" :size="32" /></span>
      <p class="eyebrow">Permiso requerido</p>
      <h1>Esta sección está restringida</h1>
      <p>Tu sesión funciona correctamente, pero tu rol o grupo no incluye acceso a esta vista. Una administradora puede modificarlo desde Seguridad.</p>
      <RouterLink class="btn btn-primary" to="/">Volver al inicio</RouterLink>
    </div>
  </main>
</template>

<style scoped>
.forbidden { min-height: 70vh; display: grid; place-items: center; padding: 28px; }.forbidden-card { width: min(100%, 600px); padding: 42px; border: 1px solid var(--line); border-radius: 24px; background: linear-gradient(145deg,#fff,var(--teal-50)); box-shadow: var(--shadow-lg); text-align: center; }.forbidden-card > span { display: grid; place-items: center; width: 70px; height: 70px; margin: auto; border-radius: 20px; color: #9a5b0b; background: #fff4d8; }.forbidden h1 { margin: 9px 0; }.forbidden p:not(.eyebrow) { max-width: 490px; margin: 0 auto 23px; color: var(--muted); line-height: 1.6; }
</style>
