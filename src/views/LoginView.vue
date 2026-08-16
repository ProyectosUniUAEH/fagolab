<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthLayout from '../components/AuthLayout.vue'
import Icon from '../components/Icon.vue'
import { api, ApiError } from '../api'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const email = ref('')
const password = ref('')
const error = ref('')
const needsBootstrap = ref(false)

onMounted(async () => {
  try {
    const status = await api.get<{ needsBootstrap: boolean }>('/api/auth/registration-status')
    needsBootstrap.value = status.needsBootstrap
  } catch {
    needsBootstrap.value = false
  }
})

async function submit() {
  error.value = ''
  try {
    const user = await auth.login(email.value, password.value)
    if (user.mustChangePassword) {
      await router.push({ name: 'perfil', query: { changePassword: '1' } })
      return
    }
    await router.push(String(route.query.redirect || '/'))
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'No fue posible iniciar sesión.'
  }
}
</script>

<template>
  <AuthLayout eyebrow="Bienvenida de vuelta" title="Inicia sesión" description="Entra con tu cuenta personal para conservar la autoría y trazabilidad de cada registro.">
    <div v-if="route.query.expired" class="auth-note amber"><Icon name="clock" :size="15" /> Tu sesión terminó. Inicia sesión nuevamente.</div>
    <div v-if="needsBootstrap" class="auth-note setup">
      <span><b>Primera configuración</b> Todavía no existe una administradora.</span>
      <RouterLink to="/configuracion-inicial">Configurar</RouterLink>
    </div>
    <form class="auth-fields" @submit.prevent="submit">
      <label><span>Correo institucional</span><input v-model.trim="email" type="email" autocomplete="username" placeholder="nombre@universidad.mx" required /></label>
      <label><span>Contraseña</span><input v-model="password" type="password" autocomplete="current-password" placeholder="Tu contraseña" required /></label>
      <p v-if="error" class="auth-error"><Icon name="alert" :size="15" /> {{ error }}</p>
      <button class="auth-submit" type="submit" :disabled="auth.loading"><Icon name="shield" :size="17" /> {{ auth.loading ? 'Verificando…' : 'Entrar a FagoLab' }}</button>
    </form>
    <p class="auth-switch">¿Te integrarás al laboratorio? <RouterLink to="/registro">Solicita una cuenta</RouterLink></p>
    <p class="auth-help">Si olvidaste tu contraseña, solicita a la administradora que la reinicie.</p>
  </AuthLayout>
</template>

<style scoped>
.auth-fields { display: grid; gap: 16px; }.auth-fields label span { display: block; margin-bottom: 7px; color: #334d5b; font-size: .76rem; font-weight: 800; }.auth-fields input { width: 100%; padding: 12px 13px; border: 1px solid #d7e3e8; border-radius: 11px; outline: none; background: #f9fbfc; }.auth-fields input:focus { border-color: #20a89b; box-shadow: 0 0 0 3px rgba(32,168,155,.12); }
.auth-submit { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; margin-top: 3px; padding: 13px; border: 0; border-radius: 12px; color: #fff; background: #0b8178; font-weight: 900; cursor: pointer; }.auth-submit:disabled { opacity: .6; cursor: wait; }
.auth-error,.auth-note { display: flex; align-items: center; gap: 7px; padding: 10px 12px; border-radius: 10px; font-size: .75rem; }.auth-error { color: #b42318; background: #fff1f0; }.auth-note { margin: 0 0 16px; }.auth-note.amber { color: #9a5b0b; background: #fff7e7; }.auth-note.setup { justify-content: space-between; color: #205d70; background: #eaf7fb; }.auth-note.setup span b { display: block; }.auth-note a { color: #087d73; font-weight: 900; }
.auth-switch { margin: 20px 0 0; color: #71838d; text-align: center; font-size: .78rem; }.auth-switch a { color: #087d73; font-weight: 900; }.auth-help { margin: 13px 0 0; color: #8a9aa2; text-align: center; font-size: .68rem; }
</style>
