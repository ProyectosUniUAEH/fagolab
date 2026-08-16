<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthLayout from '../components/AuthLayout.vue'
import Icon from '../components/Icon.vue'
import { api, ApiError } from '../api'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const allowed = ref(false)
const checking = ref(true)
const form = ref({ name: '', email: '', cargo: 'Responsable del laboratorio', password: '', confirm: '' })
const error = ref('')

onMounted(async () => {
  try {
    allowed.value = (await api.get<{ needsBootstrap: boolean }>('/api/auth/registration-status')).needsBootstrap
  } finally {
    checking.value = false
  }
})

async function submit() {
  error.value = ''
  if (form.value.password !== form.value.confirm) { error.value = 'Las contraseñas no coinciden.'; return }
  try {
    await auth.bootstrap(form.value)
    await auth.login(form.value.email, form.value.password)
    await router.push('/')
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'No se pudo completar la configuración.'
  }
}
</script>

<template>
  <AuthLayout eyebrow="Configuración protegida" title="Crea la primera administradora" description="Esta pantalla solo funciona desde la laptop servidor y se desactiva después de crear la primera cuenta.">
    <p v-if="checking" class="state"><Icon name="clock" :size="16" /> Comprobando el sistema…</p>
    <div v-else-if="!allowed" class="closed"><Icon name="shield" :size="28" /><h3>Configuración completada</h3><p>La plataforma ya tiene una administradora.</p><RouterLink to="/login">Ir al inicio de sesión</RouterLink></div>
    <form v-else class="auth-fields" @submit.prevent="submit">
      <label><span>Nombre completo</span><input v-model.trim="form.name" required /></label>
      <label><span>Correo</span><input v-model.trim="form.email" type="email" required /></label>
      <label><span>Cargo</span><input v-model.trim="form.cargo" /></label>
      <label><span>Contraseña principal</span><input v-model="form.password" type="password" minlength="12" required /></label>
      <label><span>Confirmar contraseña</span><input v-model="form.confirm" type="password" minlength="12" required /></label>
      <p v-if="error" class="auth-error"><Icon name="alert" :size="15" /> {{ error }}</p>
      <button class="auth-submit" type="submit">Crear administración segura</button>
    </form>
  </AuthLayout>
</template>

<style scoped>
.auth-fields { display: grid; gap: 12px; }.auth-fields label span { display: block; margin-bottom: 6px; color: #334d5b; font-size: .74rem; font-weight: 800; }.auth-fields input { width: 100%; padding: 11px 12px; border: 1px solid #d7e3e8; border-radius: 10px; background: #f9fbfc; outline: none; }.auth-fields input:focus { border-color: #20a89b; box-shadow: 0 0 0 3px rgba(32,168,155,.12); }.auth-submit { width: 100%; padding: 13px; border: 0; border-radius: 12px; color: #fff; background: #0b8178; font-weight: 900; cursor: pointer; }.auth-error,.state { display: flex; align-items: center; gap: 7px; margin: 0; padding: 10px 12px; border-radius: 10px; font-size: .74rem; }.auth-error { color: #b42318; background: #fff1f0; }.state { color: #23687a; background: #eaf7fb; }.closed { text-align: center; color: #607780; }.closed svg { color: #0b8178; }.closed h3 { color: #173b49; }.closed a { color: #087d73; font-weight: 900; }
</style>
