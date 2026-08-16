<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import UserProfileCard from '../components/UserProfileCard.vue'
import { ApiError } from '../api'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const saving = ref(false)
const notice = ref('')
const error = ref('')
const password = reactive({ current: '', next: '', repeat: '' })

async function changePassword() {
  error.value = ''
  notice.value = ''
  if (password.next !== password.repeat) {
    error.value = 'Las contraseñas nuevas no coinciden.'
    return
  }
  saving.value = true
  try {
    await auth.changePassword(password.current, password.next)
    Object.assign(password, { current: '', next: '', repeat: '' })
    notice.value = 'Tu contraseña fue actualizada.'
    await router.replace({ name: 'perfil' })
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No fue posible cambiar la contraseña.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="profile-page">
    <header class="profile-hero">
      <div>
        <span><Icon name="user" :size="15" /> Cuenta personal</span>
        <h1>Mi perfil</h1>
        <p>Tu identidad profesional, fotografías y contraseña viven aquí, separadas de la administración del sistema.</p>
      </div>
      <div class="account-state"><i></i><span>Sesión protegida</span><b>{{ auth.primaryRole }}</b></div>
    </header>

    <div v-if="auth.user?.mustChangePassword" class="required-alert">
      <Icon name="alert" :size="20" />
      <div><b>Cambia tu contraseña temporal</b><p>Debes definir una contraseña personal antes de continuar con el laboratorio.</p></div>
    </div>

    <UserProfileCard />

    <section class="password-card card">
      <div class="password-copy">
        <div class="security-icon"><Icon name="shield" :size="24" /></div>
        <span>Seguridad de la cuenta</span>
        <h2>Cambiar contraseña</h2>
        <p>Usa una contraseña única de al menos 12 caracteres. Las demás sesiones se cerrarán automáticamente.</p>
        <ul>
          <li><Icon name="check-circle" :size="15" /> Hash Argon2id</li>
          <li><Icon name="check-circle" :size="15" /> Sesiones rotatorias</li>
          <li><Icon name="check-circle" :size="15" /> Registro en auditoría</li>
        </ul>
      </div>
      <form @submit.prevent="changePassword">
        <label>Contraseña actual<input v-model="password.current" type="password" autocomplete="current-password" required /></label>
        <label>Nueva contraseña<input v-model="password.next" type="password" autocomplete="new-password" minlength="12" required /><small>Mínimo 12 caracteres y al menos 3 tipos: mayúsculas, minúsculas, números o símbolos.</small></label>
        <label>Repetir nueva contraseña<input v-model="password.repeat" type="password" autocomplete="new-password" minlength="12" required /></label>
        <p v-if="error" class="form-message error"><Icon name="alert" :size="15" /> {{ error }}</p>
        <p v-if="notice" class="form-message success"><Icon name="check-circle" :size="15" /> {{ notice }}</p>
        <button class="btn btn-primary" :disabled="saving">{{ saving ? 'Actualizando…' : 'Actualizar contraseña' }}</button>
      </form>
    </section>
  </div>
</template>

<style scoped>
.profile-page{display:grid;gap:20px}.profile-hero{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:24px 27px;border:1px solid #dbe9e8;border-radius:20px;background:linear-gradient(110deg,#fff 20%,#eefbf8)}.profile-hero>div>span{display:flex;align-items:center;gap:7px;color:#087d73;font-size:.68rem;font-weight:900;text-transform:uppercase;letter-spacing:.08em}.profile-hero h1{margin-top:7px;font-size:1.65rem}.profile-hero p{max-width:680px;margin-top:7px;color:var(--muted);font-size:.8rem;line-height:1.55}.account-state{display:grid;grid-template-columns:auto auto;align-items:center;gap:2px 7px;min-width:180px;padding:12px 14px;border:1px solid #cfeae4;border-radius:14px;background:rgba(255,255,255,.84)}.account-state i{grid-row:1/3;width:9px;height:9px;border-radius:50%;background:#19a777;box-shadow:0 0 0 5px #dff7ed}.account-state span{color:var(--muted);font-size:.63rem}.account-state b{font-size:.73rem}.required-alert{display:flex;align-items:center;gap:12px;padding:14px 16px;border:1px solid #f1d49a;border-radius:14px;color:#8b570c;background:#fff8e8}.required-alert b{font-size:.8rem}.required-alert p{margin-top:2px;font-size:.7rem}.password-card{display:grid;grid-template-columns:minmax(250px,.8fr) minmax(300px,1.2fr);overflow:hidden;border-radius:20px}.password-copy{padding:25px;background:#f5fbfa}.security-icon{display:grid;place-items:center;width:48px;height:48px;margin-bottom:18px;border-radius:15px;color:#087d73;background:#dff7f1}.password-copy>span{color:#087d73;font-size:.64rem;font-weight:900;text-transform:uppercase;letter-spacing:.08em}.password-copy h2{margin-top:5px;font-size:1.15rem}.password-copy p{margin-top:8px;color:var(--muted);font-size:.73rem;line-height:1.6}.password-copy ul{display:grid;gap:7px;margin-top:18px;padding:0;list-style:none}.password-copy li{display:flex;align-items:center;gap:7px;color:#47606b;font-size:.69rem}.password-card form{display:grid;align-content:start;gap:13px;padding:25px}.password-card label{display:grid;gap:6px;color:var(--ink-soft);font-size:.7rem;font-weight:800}.password-card input{padding:11px 12px;border:1px solid var(--line);border-radius:10px;outline:none}.password-card input:focus{border-color:var(--teal);box-shadow:0 0 0 3px var(--teal-100)}.password-card small{color:var(--muted);font-size:.61rem;font-weight:500;line-height:1.45}.password-card .btn{justify-self:start;margin-top:3px}.form-message{display:flex;align-items:center;gap:7px;padding:9px 11px;border-radius:9px;font-size:.7rem;font-weight:700}.form-message.error{color:#a42119;background:#fff0ee}.form-message.success{color:#08766d;background:#e9fbf6}@media(max-width:800px){.profile-hero{align-items:flex-start;flex-direction:column}.account-state{width:100%}.password-card{grid-template-columns:1fr}}@media(max-width:520px){.profile-hero,.password-copy,.password-card form{padding:18px}}
</style>
