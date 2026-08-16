<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import Icon from '../components/Icon.vue'
import { api, ApiError } from '../api'
import { useAuthStore, type AccessGroup, type AccessRole, type AuthUser } from '../stores/auth'
import { usePresenceStore } from '../stores/presence'

type Tab = 'usuarios' | 'presencia' | 'roles' | 'grupos' | 'permisos' | 'auditoria' | 'sesiones'
type Effect = 'allow' | 'deny'
interface Overview {
  users: { total: number; pending: number; active: number }
  activeSessions: number
  events24h: number
  roles: number
  groups: number
}
interface AdminUser extends AuthUser {
  createdAt?: string
  directAccess: { permission: string; effect: Effect }[]
}
interface Role extends AccessRole {
  descripcion: string
  isSystem: boolean
  activo: boolean
  userCount: number
  permissions: string[]
}
interface Group extends AccessGroup {
  descripcion: string
  activo: boolean
  memberCount: number
  members: string[]
  roles: string[]
  permissions: { permission: string; effect: Effect }[]
}
interface Permission {
  id: string
  clave: string
  modulo: string
  recurso: string
  accion: string
  descripcion: string
  tipo: string
  frontendRoute?: string | null
  httpMethod?: string | null
  endpointPattern?: string | null
  metadata?: { endpoints?: { method: string; pattern: string }[] }
  risk: string
  activo: boolean
}
interface AuditEvent {
  id: string
  type: string
  action: string
  resource: string
  permission?: string
  method?: string
  path?: string
  statusCode?: number
  success: boolean
  ip?: string
  details?: Record<string, unknown>
  createdAt: string
  actorName: string
}
interface Session {
  id: string
  userId: string
  userName: string
  email: string
  issuedAt: string
  expiresAt: string
  lastSeenAt?: string
  revokedAt?: string
  ip?: string
  userAgent?: string
}

const auth = useAuthStore()
const presence = usePresenceStore()
const tab = ref<Tab>('usuarios')
const loading = ref(true)
const saving = ref(false)
const notice = ref('')
const error = ref('')
const overview = ref<Overview | null>(null)
const users = ref<AdminUser[]>([])
const roles = ref<Role[]>([])
const groups = ref<Group[]>([])
const permissions = ref<Permission[]>([])
const audit = ref<{ total: number; items: AuditEvent[] }>({ total: 0, items: [] })
const sessions = ref<Session[]>([])
const search = ref('')
const auditSearch = ref('')
const auditUser = ref('')
const accessTarget = ref<AdminUser | null>(null)
const profileTarget = ref<AdminUser | null>(null)
const roleTarget = ref<Role | null>(null)
const groupTarget = ref<Group | null>(null)
const temporaryPassword = ref('')
const createMode = ref<'' | 'user' | 'role' | 'group'>('')

const userForm = reactive({ name: '', email: '', cargo: '' })
const roleForm = reactive({ name: '', description: '' })
const groupForm = reactive({ name: '', description: '' })
const profileForm = reactive({ name: '', email: '', cargo: '' })
const roleMeta = reactive({ name: '', description: '', active: true })
const groupMeta = reactive({ name: '', description: '', active: true })
const accessDraft = reactive({
  roleIds: [] as string[],
  groupIds: [] as string[],
  permissions: [] as { permission: string; effect: Effect }[],
})
const rolePermissionDraft = ref<string[]>([])
const groupDraft = reactive({
  members: [] as string[],
  roles: [] as string[],
  permissions: [] as { permission: string; effect: Effect }[],
})

const tabs = computed(() => [
  { key: 'usuarios' as Tab, label: 'Usuarios', permission: 'security.users.view' },
  { key: 'presencia' as Tab, label: 'En línea', permission: 'security.presence.view' },
  { key: 'roles' as Tab, label: 'Roles', permission: 'security.roles.view' },
  { key: 'grupos' as Tab, label: 'Grupos', permission: 'security.groups.view' },
  { key: 'permisos' as Tab, label: 'Mapa de permisos', permission: 'security.permissions.view' },
  { key: 'auditoria' as Tab, label: 'Actividad', permission: 'security.audit.view' },
  { key: 'sesiones' as Tab, label: 'Sesiones', permission: 'security.sessions.view' },
].filter((item) => auth.can(item.permission)))
const superadminCount = computed(() => users.value.filter((user) => user.isSuperadmin && user.activo && user.status === 'activa').length)
const onlineIds = computed(() => new Set(presence.users.map((user) => user.id)))

const filteredUsers = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return users.value
  return users.value.filter((user) =>
    [user.nombre, user.correo, user.cargo, user.roles.map((role) => role.nombre).join(' ')]
      .join(' ')
      .toLowerCase()
      .includes(term),
  )
})
const permissionModules = computed(() => {
  const grouped = new Map<string, Permission[]>()
  for (const item of permissions.value) {
    const list = grouped.get(item.modulo) ?? []
    list.push(item)
    grouped.set(item.modulo, list)
  }
  return [...grouped.entries()]
})

function message(text: string) {
  notice.value = text
  window.setTimeout(() => {
    if (notice.value === text) notice.value = ''
  }, 5000)
}
function readableError(reason: unknown) {
  return reason instanceof ApiError ? reason.message : 'No fue posible completar la operación.'
}
function date(value?: string | null) {
  return value ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Sin actividad'
}
function toggle(list: string[], value: string) {
  const index = list.indexOf(value)
  if (index >= 0) list.splice(index, 1)
  else list.push(value)
}
function directEffect(list: { permission: string; effect: Effect }[], permission: string) {
  return list.find((item) => item.permission === permission)?.effect ?? ''
}
function setDirectEffect(
  list: { permission: string; effect: Effect }[],
  permission: string,
  effect: '' | Effect,
) {
  const index = list.findIndex((item) => item.permission === permission)
  if (!effect && index >= 0) list.splice(index, 1)
  else if (effect && index >= 0) list[index] = { permission, effect }
  else if (effect) list.push({ permission, effect })
}

async function loadAll() {
  loading.value = true
  error.value = ''
  const calls: Promise<unknown>[] = []
  if (auth.can('security.panel.view')) calls.push(api.get<Overview>('/api/auth/admin/overview').then((v) => (overview.value = v)))
  if (auth.can('security.users.view')) calls.push(api.get<AdminUser[]>('/api/auth/admin/users').then((v) => (users.value = v)))
  if (auth.can('security.roles.view')) calls.push(api.get<Role[]>('/api/auth/admin/roles').then((v) => (roles.value = v)))
  if (auth.can('security.groups.view')) calls.push(api.get<Group[]>('/api/auth/admin/groups').then((v) => (groups.value = v)))
  if (auth.can('security.permissions.view')) calls.push(api.get<Permission[]>('/api/auth/admin/permissions').then((v) => (permissions.value = v)))
  if (auth.can('security.audit.view')) calls.push(loadAudit())
  if (auth.can('security.sessions.view')) calls.push(api.get<Session[]>('/api/auth/admin/sessions').then((v) => (sessions.value = v)))
  const results = await Promise.allSettled(calls)
  const failed = results.find((result) => result.status === 'rejected')
  if (failed?.status === 'rejected') error.value = readableError(failed.reason)
  loading.value = false
}

async function loadAudit() {
  const params = new URLSearchParams({ limit: '150' })
  if (auditSearch.value.trim()) params.set('search', auditSearch.value.trim())
  if (auditUser.value) params.set('userId', auditUser.value)
  audit.value = await api.get<{ total: number; items: AuditEvent[] }>(`/api/auth/admin/audit?${params}`)
}

function openAccess(user: AdminUser) {
  accessTarget.value = user
  accessDraft.roleIds = user.roles.map((role) => role.id)
  accessDraft.groupIds = user.groups.map((group) => group.id)
  accessDraft.permissions = user.directAccess.map((item) => ({ ...item }))
}
async function saveAccess() {
  if (!accessTarget.value) return
  saving.value = true
  try {
    await api.put(`/api/auth/admin/users/${accessTarget.value.id}/access`, accessDraft)
    accessTarget.value = null
    await loadAll()
    await auth.refreshProfile()
    message('Accesos del usuario actualizados.')
  } catch (reason) {
    error.value = readableError(reason)
  } finally {
    saving.value = false
  }
}
async function approve(user: AdminUser) {
  try {
    const defaultRole = roles.value.find((role) => role.clave === 'tesista')
    await api.post(`/api/auth/admin/users/${user.id}/approve`, { roleIds: defaultRole ? [defaultRole.id] : [] })
    await loadAll()
    message('Solicitud aprobada con el rol Tesista.')
  } catch (reason) {
    error.value = readableError(reason)
  }
}
async function toggleUser(user: AdminUser) {
  try {
    await api.patch(`/api/auth/admin/users/${user.id}`, {
      active: !user.activo,
      status: user.activo ? 'suspendida' : 'activa',
    })
    await loadAll()
    message(user.activo ? 'Cuenta suspendida.' : 'Cuenta reactivada.')
  } catch (reason) {
    error.value = readableError(reason)
  }
}
async function toggleSuperadmin(user: AdminUser) {
  const enabled = !user.isSuperadmin
  if (!enabled && superadminCount.value <= 1) {
    error.value = 'Debe permanecer al menos una superadministradora activa.'
    return
  }
  const action = enabled ? 'dar acceso total de superadministradora a' : 'retirar el nivel de superadministradora de'
  if (!window.confirm(`¿Confirmas que deseas ${action} ${user.nombre}?`)) return
  try {
    await api.put(`/api/auth/admin/users/${user.id}/superadmin`, { enabled })
    if (user.id === auth.user?.id) await auth.refreshProfile()
    await loadAll()
    message(enabled ? 'Superadministradora agregada.' : 'Nivel de superadministradora retirado.')
  } catch (reason) {
    error.value = readableError(reason)
  }
}
function openProfile(user: AdminUser) {
  profileTarget.value = user
  Object.assign(profileForm, { name: user.nombre, email: user.correo, cargo: user.cargo ?? '' })
}
async function saveProfile() {
  if (!profileTarget.value) return
  saving.value = true
  try {
    await api.patch(`/api/auth/admin/users/${profileTarget.value.id}`, profileForm)
    profileTarget.value = null
    await loadAll()
    await auth.refreshProfile()
    message('Datos del usuario actualizados.')
  } catch (reason) {
    error.value = readableError(reason)
  } finally {
    saving.value = false
  }
}
async function resetPassword(user: AdminUser) {
  if (!window.confirm(`¿Reiniciar la contraseña de ${user.nombre}? Sus sesiones abiertas se cerrarán.`)) return
  try {
    const result = await api.post<{ temporaryPassword: string }>(`/api/auth/admin/users/${user.id}/reset-password`)
    temporaryPassword.value = result.temporaryPassword
  } catch (reason) {
    error.value = readableError(reason)
  }
}
async function createUser() {
  saving.value = true
  try {
    const result = await api.post<{ temporaryPassword: string }>('/api/auth/admin/users', userForm)
    temporaryPassword.value = result.temporaryPassword
    createMode.value = ''
    Object.assign(userForm, { name: '', email: '', cargo: '' })
    await loadAll()
  } catch (reason) {
    error.value = readableError(reason)
  } finally {
    saving.value = false
  }
}
function openRole(role: Role) {
  roleTarget.value = role
  rolePermissionDraft.value = [...role.permissions]
  Object.assign(roleMeta, { name: role.nombre, description: role.descripcion, active: role.activo })
}
async function saveRolePermissions() {
  if (!roleTarget.value) return
  saving.value = true
  try {
    if (auth.can('security.roles.update')) {
      await api.patch(`/api/auth/admin/roles/${roleTarget.value.id}`, roleMeta)
    }
    if (auth.can('security.roles.permissions.manage')) {
      await api.put(`/api/auth/admin/roles/${roleTarget.value.id}/permissions`, { permissions: rolePermissionDraft.value })
    }
    roleTarget.value = null
    await loadAll()
    message('Permisos del rol actualizados.')
  } catch (reason) {
    error.value = readableError(reason)
  } finally {
    saving.value = false
  }
}
async function createRole() {
  saving.value = true
  try {
    await api.post('/api/auth/admin/roles', roleForm)
    createMode.value = ''
    Object.assign(roleForm, { name: '', description: '' })
    await loadAll()
    message('Rol creado.')
  } catch (reason) {
    error.value = readableError(reason)
  } finally {
    saving.value = false
  }
}
function openGroup(group: Group) {
  groupTarget.value = group
  Object.assign(groupMeta, { name: group.nombre, description: group.descripcion, active: group.activo })
  groupDraft.members = [...group.members]
  groupDraft.roles = [...group.roles]
  groupDraft.permissions = group.permissions.map((item) => ({ ...item }))
}
async function saveGroup() {
  if (!groupTarget.value) return
  saving.value = true
  try {
    if (auth.can('security.groups.update')) {
      await api.patch(`/api/auth/admin/groups/${groupTarget.value.id}`, groupMeta)
    }
    if (auth.can('security.groups.access.manage')) {
      await api.put(`/api/auth/admin/groups/${groupTarget.value.id}/access`, groupDraft)
    }
    groupTarget.value = null
    await loadAll()
    message('Miembros y accesos del grupo actualizados.')
  } catch (reason) {
    error.value = readableError(reason)
  } finally {
    saving.value = false
  }
}
async function createGroup() {
  saving.value = true
  try {
    await api.post('/api/auth/admin/groups', groupForm)
    createMode.value = ''
    Object.assign(groupForm, { name: '', description: '' })
    await loadAll()
    message('Grupo creado.')
  } catch (reason) {
    error.value = readableError(reason)
  } finally {
    saving.value = false
  }
}
async function revokeSession(session: Session) {
  if (!window.confirm(`¿Cerrar la sesión de ${session.userName}?`)) return
  try {
    await api.del(`/api/auth/admin/sessions/${session.id}`)
    await loadAll()
    message('Sesión cerrada.')
  } catch (reason) {
    error.value = readableError(reason)
  }
}
onMounted(() => {
  presence.connect()
  loadAll()
})
</script>

<template>
  <div class="security-page">
    <div class="security-hero">
      <div>
        <span class="eyebrow"><Icon name="shield" :size="15" /> Centro de control</span>
        <h1>Seguridad y accesos</h1>
        <p>Administra quién entra, qué puede ver y qué acciones puede realizar. El backend valida los mismos permisos.</p>
      </div>
      <RouterLink class="btn" to="/perfil"><Icon name="user" :size="16" /> Ir a mi perfil</RouterLink>
    </div>

    <div v-if="notice" class="toast success"><Icon name="check-circle" :size="17" /> {{ notice }}</div>
    <div v-if="error" class="toast error"><Icon name="alert" :size="17" /> {{ error }} <button @click="error = ''">×</button></div>

    <div v-if="overview" class="metrics">
      <div><span>Usuarios activos</span><b>{{ overview.users.active }}</b><small>{{ overview.users.pending }} pendientes</small></div>
      <div><span>Conectados ahora</span><b>{{ presence.onlineCount }}</b><small>{{ presence.connected ? 'Actualización en vivo' : 'Reconectando…' }}</small></div>
      <div><span>Actividad 24 h</span><b>{{ overview.events24h }}</b><small>Eventos auditados</small></div>
      <div><span>Control de acceso</span><b>{{ overview.roles + overview.groups }}</b><small>{{ overview.roles }} roles · {{ overview.groups }} grupos</small></div>
    </div>

    <nav v-if="tabs.length" class="security-tabs" aria-label="Secciones de seguridad">
      <button v-for="item in tabs" :key="item.key" :class="{ active: tab === item.key }" @click="tab = item.key">
        {{ item.label }}
        <span v-if="item.key === 'usuarios' && overview?.users.pending">{{ overview.users.pending }}</span>
      </button>
    </nav>

    <div v-if="loading" class="card loading-card"><span></span><span></span><span></span></div>

    <section v-else-if="tabs.length && tab === 'usuarios'" class="card security-card">
      <header>
        <div><h2>Personas del laboratorio</h2><p>Las cuentas son personales; nunca es necesario compartir contraseña.</p></div>
        <div class="header-actions">
          <input v-model="search" class="mini-search" placeholder="Buscar persona…" />
          <button v-if="auth.can('security.users.create')" class="btn btn-primary" @click="createMode = 'user'"><Icon name="plus" :size="16" /> Agregar</button>
        </div>
      </header>
      <div class="table-wrap">
        <table class="data security-table">
          <thead><tr><th>Persona</th><th>Estado</th><th>Rol / grupo</th><th>Última actividad</th><th>Acciones</th></tr></thead>
          <tbody>
            <tr v-for="user in filteredUsers" :key="user.id">
              <td><div class="person"><span>{{ user.nombre.split(/\s+/).slice(0,2).map(x => x[0]).join('') }}</span><div><b>{{ user.nombre }}</b><small>{{ user.correo }}<template v-if="user.cargo"> · {{ user.cargo }}</template></small></div></div></td>
              <td><span class="badge" :class="user.status === 'activa' && user.activo ? 'b-teal' : user.status === 'pendiente' ? 'b-amber' : 'b-coral'">{{ user.status }}</span><span v-if="onlineIds.has(user.id)" class="online-mini"><i></i> En línea</span></td>
              <td><b class="role-text">{{ user.isSuperadmin ? 'Superadministradora' : user.roles.map(r => r.nombre).join(', ') || 'Sin rol' }}</b><small class="block">{{ user.groups.map(g => g.nombre).join(', ') || 'Sin grupo' }}</small></td>
              <td><span>{{ date(user.lastSeenAt || user.lastLoginAt) }}</span></td>
              <td><div class="row-actions">
                <button v-if="user.status === 'pendiente' && auth.can('security.users.approve')" class="tiny primary" @click="approve(user)">Aprobar</button>
                <button v-if="auth.can('security.users.update')" class="tiny" @click="openProfile(user)">Editar</button>
                <button v-if="auth.can('security.users.access.manage')" class="tiny" @click="openAccess(user)">Accesos</button>
                <button v-if="auth.can('security.users.password.reset')" class="tiny" @click="resetPassword(user)">Contraseña</button>
                <button v-if="auth.can('security.superadmins.manage')" class="tiny" :class="{ primary: !user.isSuperadmin }" :disabled="user.isSuperadmin && superadminCount <= 1" :title="user.isSuperadmin && superadminCount <= 1 ? 'Debe permanecer al menos una superadministradora' : ''" @click="toggleSuperadmin(user)">{{ user.isSuperadmin ? 'Quitar superadmin' : 'Hacer superadmin' }}</button>
                <button v-if="auth.can('security.users.update') && !user.isSuperadmin" class="tiny" @click="toggleUser(user)">{{ user.activo ? 'Suspender' : 'Activar' }}</button>
              </div></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-else-if="tab === 'presencia'" class="card security-card presence-panel">
      <header>
        <div><h2>Personas conectadas ahora</h2><p>La lista se actualiza al abrir, cerrar o perder una conexión. Una persona puede tener varias pestañas o dispositivos.</p></div>
        <span class="live-state" :class="{ offline: !presence.connected }"><i></i>{{ presence.connected ? 'En vivo' : 'Reconectando' }}</span>
      </header>
      <div v-if="presence.users.length" class="presence-grid">
        <article v-for="online in presence.users" :key="online.id">
          <div class="presence-avatar">
            <img v-if="online.avatarUri" :src="api.mediaUrl(online.avatarUri)" :alt="online.nombre" />
            <span v-else>{{ online.nombre.split(/\s+/).slice(0,2).map(x => x[0]).join('') }}</span>
            <i></i>
          </div>
          <div><h3>{{ online.nombre }}</h3><p>{{ online.cargo || 'Integrante del laboratorio' }}</p><span>{{ online.rol }}</span></div>
          <div class="presence-meta"><b>Conectada</b><span>{{ date(online.connectedAt) }}</span><small>{{ online.connections }} {{ online.connections === 1 ? 'conexión' : 'conexiones' }}</small></div>
        </article>
      </div>
      <div v-else class="empty">
        <Icon name="activity" :size="30" />
        <h3>No hay conexiones visibles</h3>
        <p>Cuando alguien abra FagoLab con una sesión válida aparecerá aquí.</p>
      </div>
    </section>

    <section v-else-if="tab === 'roles'" class="cards-section">
      <header class="section-header"><div><h2>Roles</h2><p>Un rol reúne permisos que se asignan a una o varias personas.</p></div><button v-if="auth.can('security.roles.create')" class="btn btn-primary" @click="createMode = 'role'"><Icon name="plus" :size="16" /> Nuevo rol</button></header>
      <div class="entity-grid">
        <article v-for="role in roles" :key="role.id" class="card entity-card">
          <div class="entity-icon"><Icon name="shield" :size="19" /></div>
          <div class="entity-copy"><h3>{{ role.nombre }}</h3><p>{{ role.descripcion }}</p><small>{{ role.userCount }} usuarios · {{ role.permissions.length }} permisos</small></div>
          <span v-if="role.isSystem" class="badge b-blue">Base</span>
          <span v-if="role.clave === 'administrador'" class="badge b-teal">Acceso completo</span>
          <button v-else-if="auth.can('security.roles.permissions.manage') || auth.can('security.roles.update')" class="btn btn-sm" @click="openRole(role)">Configurar</button>
        </article>
      </div>
    </section>

    <section v-else-if="tab === 'grupos'" class="cards-section">
      <header class="section-header"><div><h2>Grupos de trabajo</h2><p>Agrupa personas por tesis, proyecto, generación o laboratorio.</p></div><button v-if="auth.can('security.groups.create')" class="btn btn-primary" @click="createMode = 'group'"><Icon name="plus" :size="16" /> Nuevo grupo</button></header>
      <div v-if="groups.length" class="entity-grid">
        <article v-for="group in groups" :key="group.id" class="card entity-card">
          <div class="entity-icon violet"><Icon name="user" :size="19" /></div>
          <div class="entity-copy"><h3>{{ group.nombre }}</h3><p>{{ group.descripcion || 'Grupo de trabajo sin descripción.' }}</p><small>{{ group.memberCount }} miembros · {{ group.roles.length }} roles</small></div>
          <button v-if="auth.can('security.groups.access.manage') || auth.can('security.groups.update')" class="btn btn-sm" @click="openGroup(group)">Configurar</button>
        </article>
      </div>
      <div v-else class="empty card"><Icon name="user" :size="30" /><h3>Aún no hay grupos</h3><p>Crea uno para administrar de una vez a varias personas.</p></div>
    </section>

    <section v-else-if="tab === 'permisos'" class="permission-catalog">
      <div class="info-banner"><Icon name="shield" :size="18" /><span><b>Fuente de verdad.</b> Cada vista, acción y endpoint protegido aparece aquí. Cuando se agregue una funcionalidad nueva, su permiso debe registrarse en este catálogo.</span></div>
      <details v-for="[module, items] in permissionModules" :key="module" class="card module" open>
        <summary><span>{{ module }}</span><small>{{ items.length }} permisos</small></summary>
        <div class="permission-list">
          <article v-for="permission in items" :key="permission.clave">
            <div><b>{{ permission.descripcion }}</b><code>{{ permission.clave }}</code></div>
            <span class="risk" :class="permission.risk">{{ permission.risk }}</span>
            <div class="scope"><span v-if="permission.frontendRoute">Vista {{ permission.frontendRoute }}</span><span v-if="permission.httpMethod">{{ permission.httpMethod }} {{ permission.endpointPattern }}</span></div>
          </article>
        </div>
      </details>
    </section>

    <section v-else-if="tab === 'auditoria'" class="card security-card">
      <header><div><h2>Bitácora de actividad</h2><p>Registro append-only de visitas, sesiones, cambios, rechazos y acciones sensibles.</p></div><div class="audit-filters"><input v-model.trim="auditSearch" placeholder="Ruta, persona o recurso…" @keyup.enter="loadAudit" /><select v-model="auditUser" @change="loadAudit"><option value="">Todas las personas</option><option v-for="user in users" :key="user.id" :value="user.id">{{ user.nombre }}</option></select><button class="tiny primary" @click="loadAudit">Buscar</button><span class="badge b-blue">{{ audit.total }} eventos</span></div></header>
      <div class="timeline">
        <article v-for="event in audit.items" :key="event.id">
          <span class="event-dot" :class="{ failed: !event.success }"><Icon :name="event.success ? 'check' : 'alert'" :size="13" /></span>
          <div><b>{{ event.actorName }}</b> · {{ event.action }} <strong>{{ event.resource }}</strong><p>{{ event.method }} {{ event.path || event.type }}<template v-if="event.statusCode"> · HTTP {{ event.statusCode }}</template></p><details v-if="event.permission || event.ip || Object.keys(event.details || {}).length" class="event-details"><summary>Detalles</summary><span v-if="event.permission">Permiso: {{ event.permission }}</span><span v-if="event.ip">IP: {{ event.ip }}</span><code v-if="Object.keys(event.details || {}).length">{{ JSON.stringify(event.details) }}</code></details></div>
          <time>{{ date(event.createdAt) }}</time>
        </article>
      </div>
    </section>

    <section v-else-if="tab === 'sesiones'" class="card security-card">
      <header><div><h2>Sesiones de dispositivos</h2><p>Cierra inmediatamente una sesión desconocida o una cuenta que ya no deba acceder.</p></div></header>
      <div class="table-wrap"><table class="data security-table"><thead><tr><th>Usuario</th><th>Dispositivo / IP</th><th>Actividad</th><th>Estado</th><th></th></tr></thead><tbody>
        <tr v-for="session in sessions" :key="session.id"><td><b>{{ session.userName }}</b><small class="block">{{ session.email }}</small></td><td><span>{{ session.ip || 'IP no disponible' }}</span><small class="block agent">{{ session.userAgent || 'Dispositivo no identificado' }}</small></td><td>{{ date(session.lastSeenAt || session.issuedAt) }}</td><td><span class="badge" :class="session.revokedAt ? 'b-slate' : 'b-teal'">{{ session.revokedAt ? 'Cerrada' : 'Activa' }}</span></td><td><button v-if="!session.revokedAt && auth.can('security.sessions.revoke')" class="tiny" @click="revokeSession(session)">Cerrar</button></td></tr>
      </tbody></table></div>
    </section>

    <div v-if="profileTarget" class="modal-layer" @mousedown.self="profileTarget = null"><section class="modal">
      <header><div><span class="eyebrow">Datos de la cuenta</span><h2>Editar usuario</h2></div><button @click="profileTarget = null">×</button></header>
      <form class="modal-body form-stack" @submit.prevent="saveProfile">
        <label>Nombre completo<input v-model.trim="profileForm.name" required /></label>
        <label>Correo<input v-model.trim="profileForm.email" type="email" required /></label>
        <label>Cargo o función<input v-model.trim="profileForm.cargo" /></label>
        <footer><button type="button" class="btn" @click="profileTarget = null">Cancelar</button><button class="btn btn-primary" :disabled="saving">Guardar</button></footer>
      </form>
    </section></div>

    <div v-if="accessTarget" class="modal-layer" @mousedown.self="accessTarget = null"><section class="modal wide">
      <header><div><span class="eyebrow">Acceso individual</span><h2>{{ accessTarget.nombre }}</h2></div><button @click="accessTarget = null">×</button></header>
      <div class="modal-body">
        <div class="access-columns">
          <div><h3>Roles</h3><label v-for="role in roles" :key="role.id" class="check-row"><input type="checkbox" :checked="accessDraft.roleIds.includes(role.id)" @change="toggle(accessDraft.roleIds, role.id)" /><span><b>{{ role.nombre }}</b><small>{{ role.permissions.length }} permisos</small></span></label></div>
          <div><h3>Grupos</h3><label v-for="group in groups" :key="group.id" class="check-row"><input type="checkbox" :checked="accessDraft.groupIds.includes(group.id)" @change="toggle(accessDraft.groupIds, group.id)" /><span><b>{{ group.nombre }}</b><small>{{ group.descripcion }}</small></span></label><p v-if="!groups.length" class="muted">No hay grupos creados.</p></div>
        </div>
        <details class="advanced"><summary>Excepciones granulares</summary><p>Una denegación directa prevalece sobre roles y grupos. Úsala solo para excepciones.</p><div class="direct-list"><label v-for="permission in permissions" :key="permission.clave"><span>{{ permission.descripcion }}<code>{{ permission.clave }}</code></span><select :value="directEffect(accessDraft.permissions, permission.clave)" @change="setDirectEffect(accessDraft.permissions, permission.clave, ($event.target as HTMLSelectElement).value as '' | Effect)"><option value="">Heredar</option><option value="allow">Permitir</option><option value="deny">Denegar</option></select></label></div></details>
      </div>
      <footer><button class="btn" @click="accessTarget = null">Cancelar</button><button class="btn btn-primary" :disabled="saving" @click="saveAccess">Guardar accesos</button></footer>
    </section></div>

    <div v-if="roleTarget" class="modal-layer" @mousedown.self="roleTarget = null"><section class="modal wide">
      <header><div><span class="eyebrow">Matriz de permisos</span><h2>{{ roleTarget.nombre }}</h2></div><button @click="roleTarget = null">×</button></header>
      <div class="modal-body">
        <div v-if="auth.can('security.roles.update')" class="meta-editor">
          <label>Nombre<input v-model.trim="roleMeta.name" /></label>
          <label>Descripción<input v-model.trim="roleMeta.description" /></label>
          <label class="active-check"><input v-model="roleMeta.active" type="checkbox" /> Rol activo</label>
        </div>
        <div class="permission-editor">
          <div v-for="[module, items] in permissionModules" :key="module"><h3>{{ module }}</h3><label v-for="permission in items" :key="permission.clave" class="check-row"><input type="checkbox" :disabled="!auth.can('security.roles.permissions.manage')" :checked="rolePermissionDraft.includes(permission.clave)" @change="toggle(rolePermissionDraft, permission.clave)" /><span><b>{{ permission.descripcion }}</b><small>{{ permission.clave }}</small></span><i :class="permission.risk">{{ permission.risk }}</i></label></div>
        </div>
      </div>
      <footer><button class="btn" @click="roleTarget = null">Cancelar</button><button class="btn btn-primary" :disabled="saving" @click="saveRolePermissions">Guardar rol</button></footer>
    </section></div>

    <div v-if="groupTarget" class="modal-layer" @mousedown.self="groupTarget = null"><section class="modal wide">
      <header><div><span class="eyebrow">Grupo de trabajo</span><h2>{{ groupTarget.nombre }}</h2></div><button @click="groupTarget = null">×</button></header>
      <div class="modal-body">
        <div v-if="auth.can('security.groups.update')" class="meta-editor">
          <label>Nombre<input v-model.trim="groupMeta.name" /></label>
          <label>Descripción<input v-model.trim="groupMeta.description" /></label>
          <label class="active-check"><input v-model="groupMeta.active" type="checkbox" /> Grupo activo</label>
        </div>
        <div class="access-columns">
          <div><h3>Miembros</h3><label v-for="user in users.filter(u => u.status === 'activa')" :key="user.id" class="check-row"><input type="checkbox" :disabled="!auth.can('security.groups.access.manage')" :checked="groupDraft.members.includes(user.id)" @change="toggle(groupDraft.members, user.id)" /><span><b>{{ user.nombre }}</b><small>{{ user.correo }}</small></span></label></div>
          <div><h3>Roles heredados</h3><label v-for="role in roles" :key="role.id" class="check-row"><input type="checkbox" :disabled="!auth.can('security.groups.access.manage')" :checked="groupDraft.roles.includes(role.id)" @change="toggle(groupDraft.roles, role.id)" /><span><b>{{ role.nombre }}</b><small>{{ role.permissions.length }} permisos</small></span></label></div>
        </div>
        <details class="advanced"><summary>Excepciones del grupo</summary><p>Estas reglas se aplican a todos sus miembros. Una denegación prevalece sobre los roles.</p><div class="direct-list"><label v-for="permission in permissions" :key="permission.clave"><span>{{ permission.descripcion }}<code>{{ permission.clave }}</code></span><select :disabled="!auth.can('security.groups.access.manage')" :value="directEffect(groupDraft.permissions, permission.clave)" @change="setDirectEffect(groupDraft.permissions, permission.clave, ($event.target as HTMLSelectElement).value as '' | Effect)"><option value="">Heredar</option><option value="allow">Permitir</option><option value="deny">Denegar</option></select></label></div></details>
      </div>
      <footer><button class="btn" @click="groupTarget = null">Cancelar</button><button class="btn btn-primary" :disabled="saving" @click="saveGroup">Guardar grupo</button></footer>
    </section></div>

    <div v-if="createMode" class="modal-layer" @mousedown.self="createMode = ''"><section class="modal"><header><div><span class="eyebrow">Nuevo registro</span><h2>{{ createMode === 'user' ? 'Agregar usuario' : createMode === 'role' ? 'Crear rol' : 'Crear grupo' }}</h2></div><button @click="createMode = ''">×</button></header><form class="modal-body form-stack" @submit.prevent="createMode === 'user' ? createUser() : createMode === 'role' ? createRole() : createGroup()"><label>Nombre<input v-if="createMode === 'user'" v-model.trim="userForm.name" required /><input v-else-if="createMode === 'role'" v-model.trim="roleForm.name" required /><input v-else v-model.trim="groupForm.name" required /></label><template v-if="createMode === 'user'"><label>Correo<input v-model.trim="userForm.email" type="email" required /></label><label>Cargo o función<input v-model.trim="userForm.cargo" /></label></template><label v-else>Descripción<textarea v-if="createMode === 'role'" v-model.trim="roleForm.description"></textarea><textarea v-else v-model.trim="groupForm.description"></textarea></label><footer><button type="button" class="btn" @click="createMode = ''">Cancelar</button><button class="btn btn-primary" :disabled="saving">Crear</button></footer></form></section></div>

    <div v-if="temporaryPassword" class="modal-layer"><section class="modal"><header><div><span class="eyebrow">Se muestra una sola vez</span><h2>Contraseña temporal</h2></div></header><div class="modal-body"><p>Entrégala de forma privada. Al iniciar sesión, la persona tendrá que cambiarla.</p><code class="temporary">{{ temporaryPassword }}</code></div><footer><button class="btn btn-primary" @click="temporaryPassword = ''">Ya la guardé</button></footer></section></div>
  </div>
</template>

<style scoped>
.security-page{display:grid;gap:20px;max-width:1500px;margin:auto}.security-hero{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;padding:25px 28px;border-radius:22px;background:linear-gradient(120deg,#eefbf8,#eef5ff);border:1px solid #dcece9}.security-hero h1{font-size:1.7rem;margin:7px 0}.security-hero p{max-width:760px;color:var(--ink-soft);line-height:1.55}.eyebrow{display:flex;align-items:center;gap:7px;color:var(--teal-600);font-size:.72rem;font-weight:900;text-transform:uppercase;letter-spacing:.08em}.security-alert,.toast{display:flex;align-items:center;gap:9px;padding:12px 15px;border-radius:12px;font-size:.84rem}.security-alert{color:#8a5104;background:#fff5df;border:1px solid #f5dfac}.toast{position:fixed;right:25px;top:82px;z-index:100;box-shadow:var(--shadow)}.toast.success{color:#08766d;background:#eafff9}.toast.error{color:#a42119;background:#fff0ee}.toast button{margin-left:auto;color:inherit;font-size:1.1rem}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px}.metrics div{display:grid;gap:5px;padding:17px 19px;background:#fff;border:1px solid var(--line);border-radius:16px}.metrics span,.metrics small{color:var(--muted);font-size:.74rem}.metrics b{font-size:1.65rem}.security-tabs{display:flex;gap:4px;overflow:auto;padding:5px;background:#e9eef4;border-radius:13px}.security-tabs button{display:flex;align-items:center;gap:7px;padding:9px 15px;border-radius:9px;color:var(--muted);font-size:.8rem;font-weight:800;white-space:nowrap}.security-tabs button.active{color:var(--teal-600);background:#fff;box-shadow:var(--shadow-sm)}.security-tabs span{padding:1px 6px;border-radius:20px;color:#fff;background:var(--coral);font-size:.66rem}.security-card>header,.section-header{display:flex;justify-content:space-between;align-items:center;gap:18px;padding:19px 21px;border-bottom:1px solid var(--line)}.security-card h2,.section-header h2{font-size:1.05rem}.security-card header p,.section-header p{margin-top:4px;color:var(--muted);font-size:.78rem}.header-actions{display:flex;gap:9px}.mini-search{min-width:220px;padding:9px 11px;border:1px solid var(--line);border-radius:9px;outline:none}.security-table td{font-size:.8rem}.person{display:flex;align-items:center;gap:10px;min-width:240px}.person>span{display:grid;place-items:center;width:35px;height:35px;border-radius:10px;color:#fff;background:#188f84;font-weight:900}.person b,.person small,.block{display:block}.person small,.block{margin-top:3px;color:var(--muted);font-size:.71rem}.role-text{color:var(--ink);font-size:.78rem}.row-actions{display:flex;gap:5px}.tiny{padding:6px 9px;border:1px solid var(--line);border-radius:8px;color:var(--ink-soft);background:#fff;font-size:.69rem;font-weight:800;white-space:nowrap}.tiny:hover{background:var(--line-soft)}.tiny.primary{color:#fff;background:var(--teal);border-color:var(--teal)}.cards-section{display:grid;gap:14px}.section-header{padding:0 2px;border:0}.entity-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.entity-card{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:13px;padding:18px}.entity-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:12px;color:var(--teal-600);background:var(--teal-50)}.entity-icon.violet{color:var(--violet);background:var(--violet-50)}.entity-copy p{margin:4px 0;color:var(--muted);font-size:.75rem}.entity-copy small{color:var(--ink-soft);font-size:.7rem}.empty{display:grid;gap:8px;place-items:center}.permission-catalog{display:grid;gap:12px}.module{overflow:hidden}.module summary{display:flex;justify-content:space-between;padding:15px 18px;font-weight:900;list-style:none}.module summary small{color:var(--muted);font-weight:600}.permission-list{border-top:1px solid var(--line)}.permission-list article{display:grid;grid-template-columns:minmax(260px,1fr) auto minmax(240px,1fr);align-items:center;gap:14px;padding:11px 18px;border-bottom:1px solid var(--line-soft);font-size:.75rem}.permission-list article:last-child{border:0}.permission-list b,.permission-list code{display:block}.permission-list code,.direct-list code{margin-top:3px;color:var(--muted);font-size:.66rem}.scope{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;color:var(--muted);font-family:Consolas,monospace;font-size:.67rem}.risk,.permission-editor i{padding:3px 7px;border-radius:20px;font-style:normal;font-size:.62rem;font-weight:900;text-transform:uppercase}.risk.low,.permission-editor i.low{color:#08766d;background:#e9fbf6}.risk.medium,.permission-editor i.medium{color:#8a5104;background:#fff5df}.risk.high,.permission-editor i.high,.risk.critical,.permission-editor i.critical{color:#a42119;background:#fff0ee}.timeline{padding:3px 20px}.timeline article{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:start;padding:14px 0;border-bottom:1px solid var(--line-soft);font-size:.78rem}.timeline p{margin-top:4px;color:var(--muted);font-family:Consolas,monospace;font-size:.68rem}.timeline time{color:var(--muted);font-size:.68rem}.event-dot{display:grid;place-items:center;width:27px;height:27px;border-radius:50%;color:#08766d;background:#e9fbf6}.event-dot.failed{color:#a42119;background:#fff0ee}.agent{max-width:330px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.loading-card{display:grid;gap:12px;padding:25px}.loading-card span{height:45px;border-radius:10px;background:linear-gradient(90deg,#eef2f5,#f8fafb,#eef2f5);background-size:200%;animation:pulse 1.3s infinite}.modal-layer{position:fixed;inset:0;z-index:120;display:grid;place-items:center;padding:22px;background:rgba(10,30,42,.48);backdrop-filter:blur(4px)}.modal{width:min(500px,100%);max-height:90vh;display:flex;flex-direction:column;border-radius:20px;background:#fff;box-shadow:0 24px 70px rgba(10,30,42,.25);overflow:hidden}.modal.wide{width:min(950px,100%)}.modal>header{display:flex;justify-content:space-between;align-items:center;padding:19px 22px;border-bottom:1px solid var(--line)}.modal>header button{font-size:1.45rem;color:var(--muted)}.modal-body{overflow:auto;padding:21px}.modal>footer,.form-stack footer{display:flex;justify-content:flex-end;gap:9px;padding:15px 21px;border-top:1px solid var(--line)}.access-columns{display:grid;grid-template-columns:1fr 1fr;gap:24px}.access-columns h3,.permission-editor h3{margin-bottom:9px;font-size:.84rem}.check-row{display:flex;align-items:center;gap:10px;padding:9px;border-radius:9px}.check-row:hover{background:var(--line-soft)}.check-row input{width:17px;height:17px;accent-color:var(--teal)}.check-row span{min-width:0;flex:1}.check-row b,.check-row small{display:block}.check-row b{font-size:.76rem}.check-row small{margin-top:2px;color:var(--muted);font-size:.66rem}.advanced{margin-top:19px;border-top:1px solid var(--line);padding-top:15px}.advanced summary{font-weight:900;font-size:.8rem}.advanced>p,.muted{margin:6px 0 11px;color:var(--muted);font-size:.7rem}.direct-list{display:grid;max-height:310px;overflow:auto}.direct-list label{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:8px;border-bottom:1px solid var(--line-soft);font-size:.72rem}.direct-list select{padding:6px;border:1px solid var(--line);border-radius:7px}.permission-editor{display:grid;grid-template-columns:1fr 1fr;gap:20px}.form-stack{display:grid;gap:14px}.form-stack label{display:grid;gap:6px;color:var(--ink-soft);font-size:.76rem;font-weight:800}.form-stack input,.form-stack textarea{padding:10px 11px;border:1px solid var(--line);border-radius:9px;outline:none}.form-stack textarea{min-height:85px;resize:vertical}.form-stack small{color:var(--muted);font-size:.66rem;font-weight:500}.form-stack footer{margin:7px -21px -21px}.temporary{display:block;margin-top:15px;padding:16px;border-radius:11px;color:#064e48;background:#e9fbf6;font-size:1.15rem;text-align:center;word-break:break-all}@keyframes pulse{to{background-position:-200% 0}}
.personal-card{display:flex;align-items:center;gap:15px;padding:20px}.personal-card>div:nth-child(2){flex:1}.personal-card h2{font-size:1rem}.personal-card p{margin-top:5px;color:var(--muted);font-size:.78rem}.audit-filters{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.audit-filters input,.audit-filters select{padding:7px 9px;border:1px solid var(--line);border-radius:8px;background:#fff;font-size:.7rem}.event-details{margin-top:6px;color:var(--muted);font-size:.66rem}.event-details summary{cursor:pointer;font-weight:800}.event-details span,.event-details code{display:block;margin-top:3px;word-break:break-word}
.meta-editor{display:grid;grid-template-columns:1fr 2fr auto;gap:12px;align-items:end;margin-bottom:20px;padding:14px;border-radius:12px;background:var(--line-soft)}.meta-editor label{display:grid;gap:5px;color:var(--ink-soft);font-size:.7rem;font-weight:800}.meta-editor input:not([type=checkbox]){min-width:0;padding:8px 9px;border:1px solid var(--line);border-radius:8px;background:#fff}.meta-editor .active-check{display:flex;align-items:center;gap:7px;padding:9px;white-space:nowrap}.meta-editor .active-check input{accent-color:var(--teal)}
.tiny:disabled{opacity:.45;cursor:not-allowed}.online-mini{display:flex;align-items:center;gap:5px;margin-top:6px;color:#08766d;font-size:.63rem;font-weight:800}.online-mini i,.live-state i{width:7px;height:7px;border-radius:50%;background:#18aa79;box-shadow:0 0 0 3px #ddf6ec}.live-state{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:20px;color:#08766d;background:#e9fbf6;font-size:.68rem;font-weight:900}.live-state.offline{color:#8a5104;background:#fff5df}.live-state.offline i{background:#d99119;box-shadow:0 0 0 3px #ffedc7}.presence-grid{display:grid;gap:0;padding:2px 20px 14px}.presence-grid article{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:13px;padding:15px 3px;border-bottom:1px solid var(--line-soft)}.presence-grid article:last-child{border-bottom:0}.presence-avatar{position:relative;display:grid;place-items:center;width:44px;height:44px;border-radius:14px;overflow:visible;color:#fff;background:linear-gradient(135deg,#0d9488,#3177d6);font-size:.76rem;font-weight:900}.presence-avatar img{width:100%;height:100%;border-radius:14px;object-fit:cover}.presence-avatar i{position:absolute;right:-2px;bottom:-2px;width:11px;height:11px;border:3px solid #fff;border-radius:50%;background:#18aa79}.presence-grid h3{font-size:.82rem}.presence-grid p{margin-top:2px;color:var(--muted);font-size:.68rem}.presence-grid article>div:nth-child(2)>span{display:inline-block;margin-top:6px;padding:3px 7px;border-radius:15px;color:#47606b;background:var(--line-soft);font-size:.61rem;font-weight:800}.presence-meta{display:grid;justify-items:end;gap:3px}.presence-meta b{color:#08766d;font-size:.65rem}.presence-meta span,.presence-meta small{color:var(--muted);font-size:.62rem}.presence-panel>.empty{padding:40px}
.risk.normal,.risk.alto,.risk.critico,.permission-editor i.normal,.permission-editor i.alto,.permission-editor i.critico{color:#a42119;background:#fff0ee}.risk.normal,.permission-editor i.normal{color:#08766d;background:#e9fbf6}
@media(max-width:1050px){.metrics{grid-template-columns:repeat(2,1fr)}.entity-grid{grid-template-columns:1fr}.permission-list article{grid-template-columns:1fr auto}.scope{grid-column:1/-1;justify-content:flex-start}}@media(max-width:700px){.security-hero,.security-card>header,.section-header{align-items:stretch;flex-direction:column}.metrics{grid-template-columns:1fr 1fr}.header-actions{flex-direction:column}.mini-search{min-width:0}.access-columns,.permission-editor,.meta-editor{grid-template-columns:1fr}.permission-list article{grid-template-columns:1fr}.risk{width:max-content}.timeline article{grid-template-columns:auto 1fr}.timeline time{grid-column:2}.modal-layer{padding:8px}.row-actions{flex-wrap:wrap}.presence-grid article{grid-template-columns:auto 1fr}.presence-meta{grid-column:2;justify-items:start}}@media(max-width:430px){.metrics{grid-template-columns:1fr}}
</style>
