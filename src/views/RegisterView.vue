<script setup lang="ts">
import { ref } from 'vue'
import AuthLayout from '../components/AuthLayout.vue'
import Icon from '../components/Icon.vue'
import { ApiError } from '../api'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const form = ref({ name: '', email: '', cargo: 'Tesista', password: '', confirm: '' })
const error = ref('')
const sent = ref(false)

async function submit() {
  error.value = ''
  if (form.value.password !== form.value.confirm) { error.value = 'Las contraseñas no coinciden.'; return }
  try {
    await auth.register(form.value)
    sent.value = true
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'No se pudo enviar la solicitud.'
  }
}
</script>

<template>
  <AuthLayout eyebrow="Acceso al laboratorio" title="Solicita una cuenta" description="Tu solicitud quedará pendiente hasta que una administradora confirme tu identidad y tus permisos.">
    <div v-if="sent" class="success-state">
      <span><Icon name="check-circle" :size="30" /></span>
      <h3>Solicitud enviada</h3>
      <p>La administradora podrá aprobarla y asignarte un rol o grupo.</p>
      <RouterLink to="/login">Volver al inicio de sesión</RouterLink>
    </div>
    <form v-else class="auth-fields" @submit.prevent="submit">
      <div class="two"><label><span>Nombre completo</span><input v-model.trim="form.name" autocomplete="name" required /></label><label><span>Cargo</span><input v-model.trim="form.cargo" placeholder="Tesista" /></label></div>
      <label><span>Correo</span><input v-model.trim="form.email" type="email" autocomplete="email" required /></label>
      <label><span>Contraseña</span><input v-model="form.password" type="password" autocomplete="new-password" minlength="12" placeholder="Mínimo 12 caracteres" required /></label>
      <label><span>Confirmar contraseña</span><input v-model="form.confirm" type="password" autocomplete="new-password" required /></label>
      <small>Usa al menos 12 caracteres y combina tres tipos: mayúsculas, minúsculas, números o símbolos.</small>
      <p v-if="error" class="auth-error"><Icon name="alert" :size="15" /> {{ error }}</p>
      <button class="auth-submit" type="submit">Enviar solicitud</button>
    </form>
    <p v-if="!sent" class="auth-switch">¿Ya tienes cuenta? <RouterLink to="/login">Inicia sesión</RouterLink></p>
  </AuthLayout>
</template>

<style scoped>
.auth-fields { display: grid; gap: 13px; }.two { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; }.auth-fields label span { display: block; margin-bottom: 6px; color: #334d5b; font-size: .74rem; font-weight: 800; }.auth-fields input { width: 100%; padding: 11px 12px; border: 1px solid #d7e3e8; border-radius: 10px; outline: none; background: #f9fbfc; }.auth-fields input:focus { border-color: #20a89b; box-shadow: 0 0 0 3px rgba(32,168,155,.12); }.auth-fields small { color: #788b95; font-size: .66rem; line-height: 1.45; }
.auth-submit { width: 100%; padding: 13px; border: 0; border-radius: 12px; color: #fff; background: #0b8178; font-weight: 900; cursor: pointer; }.auth-error { display: flex; align-items: center; gap: 7px; margin: 0; padding: 10px 12px; border-radius: 10px; color: #b42318; background: #fff1f0; font-size: .74rem; }.auth-switch { margin: 19px 0 0; color: #71838d; text-align: center; font-size: .78rem; }.auth-switch a { color: #087d73; font-weight: 900; }
.success-state { padding: 18px 0 5px; text-align: center; }.success-state > span { display: grid; place-items: center; width: 62px; height: 62px; margin: auto; border-radius: 18px; color: #087d73; background: #e4f7f1; }.success-state h3 { margin: 15px 0 7px; }.success-state p { color: #70838d; font-size: .82rem; line-height: 1.5; }.success-state a { display: inline-flex; margin-top: 14px; padding: 11px 15px; border-radius: 11px; color: #fff; background: #0b8178; font-size: .78rem; font-weight: 900; text-decoration: none; }
@media (max-width: 500px) { .two { grid-template-columns: 1fr; } }
</style>
