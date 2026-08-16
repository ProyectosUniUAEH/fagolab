<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AuthLayout from '../components/AuthLayout.vue'
import Icon from '../components/Icon.vue'
import { api } from '../api'

const closed = ref(true)
const checking = ref(true)

onMounted(async () => {
  try {
    const status = await api.get<{ signupEnabled?: boolean }>('/api/auth/registration-status')
    closed.value = !status.signupEnabled
  } finally {
    checking.value = false
  }
})
</script>

<template>
  <AuthLayout eyebrow="Acceso al laboratorio" title="Solicita una cuenta" description="El alta pública está cerrada a propósito: solo la administradora puede crear cuentas nuevas.">
    <p v-if="checking" class="state"><Icon name="clock" :size="16" /> Comprobando el sistema…</p>
    <div v-else class="closed">
      <Icon name="shield" :size="28" />
      <h3>Registro público desactivado</h3>
      <p>Después del primer arranque ya no se pueden crear cuentas desde aquí. Pide a Pamela o a la administradora que te dé de alta en Seguridad.</p>
      <RouterLink to="/login">Ir al inicio de sesión</RouterLink>
    </div>
  </AuthLayout>
</template>

<style scoped>
.state,.closed { text-align: center; color: #607780; }.state { display: flex; align-items: center; justify-content: center; gap: 7px; }.closed svg { color: #0b8178; }.closed h3 { color: #173b49; }.closed p { line-height: 1.5; }.closed a { color: #087d73; font-weight: 900; }
</style>
