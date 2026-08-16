<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { api, ApiError } from '../api'
import { useAuthStore, type AuthUser } from '../stores/auth'
import Icon from './Icon.vue'

const auth = useAuthStore()
const editing = ref(false)
const saving = ref(false)
const uploading = ref<'' | 'avatar' | 'portada'>('')
const notice = ref('')
const error = ref('')
const avatarInput = ref<HTMLInputElement | null>(null)
const coverInput = ref<HTMLInputElement | null>(null)

const form = reactive({
  name: '',
  cargo: '',
  institucion: '',
  departamento: '',
  gradoAcademico: '',
  lineaInvestigacion: '',
  biografia: '',
  orcid: '',
  telefono: '',
  ubicacion: '',
  enlacePersonal: '',
})

const completion = computed(() => {
  const user = auth.user
  if (!user) return 0
  const fields = [
    user.avatarUri,
    user.cargo,
    user.institucion,
    user.departamento,
    user.gradoAcademico,
    user.lineaInvestigacion,
    user.biografia,
    user.orcid,
  ]
  return Math.round((fields.filter(Boolean).length / fields.length) * 100)
})
const coverStyle = computed(() =>
  auth.coverUrl ? { backgroundImage: `url("${auth.coverUrl}")` } : undefined,
)

function fillForm() {
  const user = auth.user
  if (!user) return
  Object.assign(form, {
    name: user.nombre ?? '',
    cargo: user.cargo ?? '',
    institucion: user.institucion ?? '',
    departamento: user.departamento ?? '',
    gradoAcademico: user.gradoAcademico ?? '',
    lineaInvestigacion: user.lineaInvestigacion ?? '',
    biografia: user.biografia ?? '',
    orcid: user.orcid ?? '',
    telefono: user.telefono ?? '',
    ubicacion: user.ubicacion ?? '',
    enlacePersonal: user.enlacePersonal ?? '',
  })
}

watch(() => auth.user?.id, fillForm, { immediate: true })

function readableError(reason: unknown) {
  return reason instanceof ApiError ? reason.message : 'No fue posible guardar los cambios.'
}
function flash(text: string) {
  notice.value = text
  window.setTimeout(() => {
    if (notice.value === text) notice.value = ''
  }, 4500)
}
function openEditor() {
  fillForm()
  error.value = ''
  editing.value = true
}
async function save() {
  saving.value = true
  error.value = ''
  try {
    auth.user = await api.patch<AuthUser>('/api/auth/profile', form)
    editing.value = false
    flash('Tu perfil fue actualizado.')
  } catch (reason) {
    error.value = readableError(reason)
  } finally {
    saving.value = false
  }
}
async function upload(kind: 'avatar' | 'portada', event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  uploading.value = kind
  error.value = ''
  try {
    auth.user = await api.uploadFile<AuthUser>(`/api/auth/profile/${kind}`, file)
    flash(kind === 'avatar' ? 'Foto de perfil actualizada.' : 'Foto de portada actualizada.')
  } catch (reason) {
    error.value = readableError(reason)
  } finally {
    uploading.value = ''
  }
}
async function removeImage(kind: 'avatar' | 'portada') {
  if (!window.confirm(`¿Quitar la foto de ${kind === 'avatar' ? 'perfil' : 'portada'}?`)) return
  uploading.value = kind
  error.value = ''
  try {
    auth.user = await api.del<AuthUser>(`/api/auth/profile/${kind}`)
    flash('La imagen fue retirada.')
  } catch (reason) {
    error.value = readableError(reason)
  } finally {
    uploading.value = ''
  }
}
</script>

<template>
  <section v-if="auth.user" class="profile-shell card">
    <div class="profile-cover" :class="{ custom: auth.coverUrl }" :style="coverStyle">
      <div class="cover-pattern" aria-hidden="true">
        <span></span><span></span><span></span><span></span>
      </div>
      <div class="cover-actions">
        <input ref="coverInput" class="sr-file" type="file" accept="image/jpeg,image/png,image/webp" @change="upload('portada', $event)" />
        <button class="photo-button" :disabled="!!uploading" @click="coverInput?.click()">
          <Icon name="image" :size="15" /> {{ auth.coverUrl ? 'Cambiar portada' : 'Agregar portada' }}
        </button>
        <button v-if="auth.coverUrl" class="photo-button icon-only" :disabled="!!uploading" title="Quitar portada" @click="removeImage('portada')">
          <Icon name="close" :size="15" />
        </button>
      </div>
    </div>

    <div class="profile-content">
      <div class="avatar-column">
        <div class="profile-avatar">
          <img v-if="auth.avatarUrl" :src="auth.avatarUrl" :alt="auth.user.nombre" />
          <span v-else>{{ auth.initials }}</span>
          <button :disabled="!!uploading" title="Cambiar foto de perfil" @click="avatarInput?.click()">
            <Icon name="image" :size="15" />
          </button>
          <input ref="avatarInput" class="sr-file" type="file" accept="image/jpeg,image/png,image/webp" @change="upload('avatar', $event)" />
        </div>
        <button v-if="auth.avatarUrl" class="remove-avatar" :disabled="!!uploading" @click="removeImage('avatar')">Quitar foto</button>
      </div>

      <div class="identity">
        <div class="identity-line">
          <div>
            <h2>{{ auth.user.nombre }}</h2>
            <p>{{ auth.user.cargo || auth.primaryRole }}</p>
          </div>
          <button class="btn btn-primary" @click="openEditor"><Icon name="edit" :size="15" /> Editar perfil</button>
        </div>
        <div class="profile-tags">
          <span><Icon name="shield" :size="13" /> {{ auth.primaryRole }}</span>
          <span v-for="group in auth.user.groups" :key="group.id"><Icon name="layers" :size="13" /> {{ group.nombre }}</span>
          <span v-if="auth.user.ubicacion"><Icon name="compass" :size="13" /> {{ auth.user.ubicacion }}</span>
        </div>
      </div>

      <div class="completion">
        <div><span>Perfil científico</span><b>{{ completion }}%</b></div>
        <div class="completion-track"><span :style="{ width: `${completion}%` }"></span></div>
        <small>{{ completion < 100 ? 'Completa tus datos para que el equipo te identifique mejor.' : 'Tu información principal está completa.' }}</small>
      </div>
    </div>

    <div class="profile-details">
      <div class="bio-block">
        <span class="detail-label">Acerca de mí</span>
        <p v-if="auth.user.biografia">{{ auth.user.biografia }}</p>
        <p v-else class="empty-copy">Agrega una breve presentación sobre tu trabajo o proyecto de investigación.</p>
      </div>
      <div class="research-grid">
        <div><span class="detail-label">Institución</span><b>{{ auth.user.institucion || 'Sin registrar' }}</b><small>{{ auth.user.departamento || 'Laboratorio o departamento pendiente' }}</small></div>
        <div><span class="detail-label">Formación</span><b>{{ auth.user.gradoAcademico || 'Sin registrar' }}</b><small>{{ auth.user.lineaInvestigacion || 'Línea de investigación pendiente' }}</small></div>
        <div><span class="detail-label">Contacto profesional</span><b>{{ auth.user.correo }}</b><small>{{ auth.user.telefono || 'Teléfono opcional' }}</small></div>
        <div>
          <span class="detail-label">Identificadores</span>
          <a v-if="auth.user.orcid" :href="`https://orcid.org/${auth.user.orcid}`" target="_blank" rel="noopener">ORCID {{ auth.user.orcid }}</a>
          <b v-else>ORCID sin registrar</b>
          <a v-if="auth.user.enlacePersonal" :href="auth.user.enlacePersonal" target="_blank" rel="noopener">Abrir enlace profesional</a>
          <small v-else>Enlace profesional opcional</small>
        </div>
      </div>
    </div>

    <p v-if="notice" class="profile-notice success"><Icon name="check-circle" :size="16" /> {{ notice }}</p>
    <p v-if="error && !editing" class="profile-notice error"><Icon name="alert" :size="16" /> {{ error }}</p>

    <div v-if="editing" class="profile-modal-layer" @mousedown.self="editing = false">
      <section class="profile-modal">
        <header>
          <div><span>Perfil personal</span><h2>Edita tu información</h2><p>Los roles, permisos y el correo los gestiona la administradora.</p></div>
          <button type="button" aria-label="Cerrar" @click="editing = false">×</button>
        </header>
        <form @submit.prevent="save">
          <div class="form-section">
            <div class="section-title"><Icon name="user" :size="17" /><div><h3>Identidad profesional</h3><p>Así te verá el equipo del laboratorio.</p></div></div>
            <div class="form-grid">
              <label class="wide">Nombre completo<input v-model.trim="form.name" minlength="2" maxlength="160" required /></label>
              <label>Cargo o función<input v-model.trim="form.cargo" maxlength="160" placeholder="Ej. Tesista de maestría" /></label>
              <label>Grado académico<input v-model.trim="form.gradoAcademico" maxlength="160" placeholder="Ej. Licenciatura en Biotecnología" /></label>
              <label>Institución<input v-model.trim="form.institucion" maxlength="200" placeholder="Universidad o centro" /></label>
              <label>Laboratorio / departamento<input v-model.trim="form.departamento" maxlength="200" placeholder="Área de trabajo" /></label>
              <label class="wide">Línea de investigación<input v-model.trim="form.lineaInvestigacion" maxlength="300" placeholder="Ej. Fagoterapia en acuicultura" /></label>
              <label class="wide">Biografía breve<textarea v-model.trim="form.biografia" maxlength="1000" rows="4" placeholder="Describe brevemente tu proyecto y experiencia."></textarea><small>{{ form.biografia.length }}/1000</small></label>
            </div>
          </div>
          <div class="form-section">
            <div class="section-title"><Icon name="link" :size="17" /><div><h3>Contacto e identificadores</h3><p>Todos estos datos son opcionales.</p></div></div>
            <div class="form-grid">
              <label>Teléfono<input v-model.trim="form.telefono" maxlength="40" inputmode="tel" placeholder="+52 000 000 0000" /></label>
              <label>Ubicación<input v-model.trim="form.ubicacion" maxlength="160" placeholder="Ciudad, país" /></label>
              <label>ORCID<input v-model.trim="form.orcid" maxlength="19" placeholder="0000-0000-0000-000X" /></label>
              <label>Enlace profesional<input v-model.trim="form.enlacePersonal" maxlength="500" type="url" placeholder="https://..." /></label>
              <label class="wide readonly">Correo de acceso<input :value="auth.user.correo" disabled /><small>Solicita a la administradora el cambio de correo.</small></label>
            </div>
          </div>
          <p v-if="error" class="form-error"><Icon name="alert" :size="16" /> {{ error }}</p>
          <footer><button type="button" class="btn" @click="editing = false">Cancelar</button><button class="btn btn-primary" :disabled="saving">{{ saving ? 'Guardando…' : 'Guardar cambios' }}</button></footer>
        </form>
      </section>
    </div>
  </section>
</template>

<style scoped>
.profile-shell{position:relative;overflow:hidden;border-radius:22px}.profile-cover{position:relative;height:150px;background:linear-gradient(120deg,#dff8f1 0%,#e8f3ff 55%,#eef0ff 100%);background-position:center;background-size:cover}.profile-cover.custom::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,44,52,.23),transparent 62%)}.cover-pattern{position:absolute;inset:0;overflow:hidden;opacity:.55}.cover-pattern span{position:absolute;width:130px;height:130px;border:1px solid rgba(13,148,136,.22);border-radius:50%}.cover-pattern span:nth-child(1){left:8%;top:-65px}.cover-pattern span:nth-child(2){left:18%;top:60px}.cover-pattern span:nth-child(3){right:15%;top:-45px}.cover-pattern span:nth-child(4){right:3%;top:74px}.cover-actions{position:absolute;z-index:2;right:16px;top:16px;display:flex;gap:7px}.photo-button{display:flex;align-items:center;gap:7px;padding:8px 11px;border:1px solid rgba(255,255,255,.72);border-radius:10px;color:#143c43;background:rgba(255,255,255,.9);box-shadow:0 5px 15px rgba(15,55,68,.1);font-size:.7rem;font-weight:800}.photo-button:hover{background:#fff}.photo-button.icon-only{padding:8px}.photo-button:disabled{opacity:.55}.sr-file{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}.profile-content{display:grid;grid-template-columns:auto minmax(0,1fr) 240px;gap:20px;align-items:center;padding:0 25px 20px}.avatar-column{align-self:start;display:grid;justify-items:center;margin-top:-48px;z-index:3}.profile-avatar{position:relative;display:grid;place-items:center;width:104px;height:104px;border:5px solid #fff;border-radius:28px;color:#fff;background:linear-gradient(135deg,#0d9488,#3177d6);box-shadow:0 9px 25px rgba(16,55,68,.18);font-size:1.7rem;font-weight:900;overflow:visible}.profile-avatar img{width:100%;height:100%;object-fit:cover;border-radius:23px}.profile-avatar>button{position:absolute;right:-7px;bottom:-7px;display:grid;place-items:center;width:34px;height:34px;border:3px solid #fff;border-radius:50%;color:#fff;background:#0d9488;box-shadow:0 5px 12px rgba(13,148,136,.25)}.remove-avatar{margin-top:10px;color:var(--muted);font-size:.64rem;text-decoration:underline}.identity{padding-top:18px;min-width:0}.identity-line{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.identity h2{font-size:1.32rem}.identity p{margin-top:4px;color:var(--muted);font-size:.8rem}.profile-tags{display:flex;gap:7px;flex-wrap:wrap;margin-top:13px}.profile-tags span{display:flex;align-items:center;gap:5px;padding:5px 8px;border-radius:20px;color:#47606b;background:var(--line-soft);font-size:.66rem;font-weight:700}.completion{display:grid;gap:7px;padding-top:18px}.completion>div:first-child{display:flex;justify-content:space-between;color:var(--ink-soft);font-size:.72rem}.completion-track{height:7px;border-radius:20px;background:#e5ecef;overflow:hidden}.completion-track span{display:block;height:100%;border-radius:inherit;background:#1a9c8e;transition:width .3s ease}.completion small{color:var(--muted);font-size:.64rem;line-height:1.4}.profile-details{display:grid;grid-template-columns:minmax(230px,.8fr) 2fr;gap:22px;padding:21px 25px 24px;border-top:1px solid var(--line-soft);background:#fbfcfd}.detail-label{display:block;margin-bottom:7px;color:var(--teal-600);font-size:.63rem;font-weight:900;text-transform:uppercase;letter-spacing:.07em}.bio-block p{color:var(--ink-soft);font-size:.76rem;line-height:1.65}.bio-block .empty-copy{color:var(--muted);font-style:italic}.research-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:17px 24px}.research-grid b,.research-grid small,.research-grid a{display:block;overflow:hidden;text-overflow:ellipsis}.research-grid b,.research-grid a{color:var(--ink);font-size:.74rem}.research-grid a{color:var(--teal-600);font-weight:800;text-decoration:none}.research-grid small{margin-top:4px;color:var(--muted);font-size:.66rem}.profile-notice{position:absolute;right:18px;bottom:18px;display:flex;align-items:center;gap:7px;padding:9px 12px;border-radius:10px;box-shadow:var(--shadow);font-size:.72rem;font-weight:800}.profile-notice.success{color:#08766d;background:#eafff9}.profile-notice.error{color:#a42119;background:#fff0ee}.profile-modal-layer{position:fixed;inset:0;z-index:150;display:grid;place-items:center;padding:20px;background:rgba(10,30,42,.52);backdrop-filter:blur(5px)}.profile-modal{width:min(820px,100%);max-height:92vh;overflow:auto;border-radius:22px;background:#fff;box-shadow:0 25px 75px rgba(10,30,42,.28)}.profile-modal>header{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;gap:15px;padding:20px 24px;border-bottom:1px solid var(--line);background:#fff}.profile-modal header span{color:var(--teal-600);font-size:.65rem;font-weight:900;text-transform:uppercase;letter-spacing:.08em}.profile-modal header h2{margin-top:5px;font-size:1.2rem}.profile-modal header p{margin-top:4px;color:var(--muted);font-size:.7rem}.profile-modal header>button{align-self:start;color:var(--muted);font-size:1.5rem}.form-section{padding:20px 24px;border-bottom:1px solid var(--line-soft)}.section-title{display:flex;align-items:flex-start;gap:10px;margin-bottom:15px;color:var(--teal-600)}.section-title h3{color:var(--ink);font-size:.86rem}.section-title p{margin-top:3px;color:var(--muted);font-size:.66rem}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}.form-grid label{display:grid;gap:6px;color:var(--ink-soft);font-size:.7rem;font-weight:800}.form-grid label.wide{grid-column:1/-1}.form-grid input,.form-grid textarea{min-width:0;padding:10px 11px;border:1px solid var(--line);border-radius:9px;color:var(--ink);background:#fff;outline:none;font:inherit;font-weight:500}.form-grid input:focus,.form-grid textarea:focus{border-color:var(--teal);box-shadow:0 0 0 3px var(--teal-100)}.form-grid textarea{resize:vertical}.form-grid small{color:var(--muted);font-size:.61rem;font-weight:500}.form-grid .readonly input{color:var(--muted);background:var(--line-soft)}.form-error{display:flex;align-items:center;gap:8px;margin:15px 24px 0;padding:10px 12px;border-radius:10px;color:#a42119;background:#fff0ee;font-size:.72rem}.profile-modal footer{position:sticky;bottom:0;display:flex;justify-content:flex-end;gap:9px;padding:15px 24px;border-top:1px solid var(--line);background:#fff}.btn{display:inline-flex;align-items:center;gap:7px}
@media(max-width:900px){.profile-content{grid-template-columns:auto 1fr}.completion{grid-column:2;padding-top:0}.profile-details{grid-template-columns:1fr}.identity-line{align-items:center}}@media(max-width:620px){.profile-cover{height:125px}.profile-content{grid-template-columns:1fr;padding:0 18px 18px}.avatar-column{justify-self:start}.identity{padding-top:0}.identity-line{align-items:flex-start;flex-direction:column}.completion{grid-column:1}.profile-details{padding:18px}.research-grid,.form-grid{grid-template-columns:1fr}.form-grid label.wide{grid-column:auto}.cover-actions{right:10px;top:10px}.photo-button{font-size:0;width:36px;height:36px;justify-content:center}.profile-modal-layer{padding:7px}.profile-modal{border-radius:16px}.form-section{padding:18px}.profile-modal>header,.profile-modal footer{padding:16px 18px}}
</style>
