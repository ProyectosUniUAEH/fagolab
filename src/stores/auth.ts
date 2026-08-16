import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { api, ApiError } from '../api'

export interface AccessRole {
  id: string
  clave: string
  nombre: string
}

export interface AccessGroup {
  id: string
  clave: string
  nombre: string
}

export interface AuthUser {
  id: string
  nombre: string
  correo: string
  activo: boolean
  status: 'pendiente' | 'activa' | 'suspendida'
  isSuperadmin: boolean
  mustChangePassword: boolean
  cargo?: string | null
  avatarUri?: string | null
  portadaUri?: string | null
  institucion?: string | null
  departamento?: string | null
  gradoAcademico?: string | null
  lineaInvestigacion?: string | null
  biografia?: string | null
  orcid?: string | null
  telefono?: string | null
  ubicacion?: string | null
  enlacePersonal?: string | null
  lastLoginAt?: string | null
  lastSeenAt?: string | null
  updatedAt?: string | null
  roles: AccessRole[]
  groups: AccessGroup[]
  permissions: string[]
}

interface AuthResponse {
  user: AuthUser
  csrfToken: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const initialized = ref(false)
  const loading = ref(false)

  const authenticated = computed(() => !!user.value)
  const primaryRole = computed(() =>
    user.value?.isSuperadmin ? 'Superadministradora' : user.value?.roles[0]?.nombre ?? 'Sin rol',
  )
  const initials = computed(() =>
    (user.value?.nombre ?? 'FL')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join(''),
  )
  const avatarUrl = computed(() =>
    user.value?.avatarUri ? api.mediaUrl(user.value.avatarUri) : '',
  )
  const coverUrl = computed(() =>
    user.value?.portadaUri ? api.mediaUrl(user.value.portadaUri) : '',
  )

  function can(permission?: string | null) {
    if (!permission) return true
    return !!user.value && (user.value.isSuperadmin || user.value.permissions.includes(permission))
  }

  async function initialize() {
    if (initialized.value) return
    loading.value = true
    try {
      user.value = await api.get<AuthUser>('/api/auth/me')
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) console.warn('[auth] no se pudo restaurar la sesión:', error)
      user.value = null
    } finally {
      initialized.value = true
      loading.value = false
    }
  }

  async function login(email: string, password: string) {
    loading.value = true
    try {
      const result = await api.post<AuthResponse>('/api/auth/login', { email, password })
      user.value = result.user
      initialized.value = true
      return result.user
    } finally {
      loading.value = false
    }
  }

  async function bootstrap(payload: { name: string; email: string; password: string; cargo?: string }) {
    return api.post<{ ok: boolean; message: string }>('/api/auth/bootstrap', payload)
  }

  async function register(payload: { name: string; email: string; password: string; cargo?: string }) {
    return api.post<{ ok: boolean; message: string }>('/api/auth/register', payload)
  }

  async function logout() {
    try {
      await api.post('/api/auth/logout')
    } finally {
      user.value = null
      initialized.value = true
    }
  }

  async function refreshProfile() {
    user.value = await api.get<AuthUser>('/api/auth/me')
    return user.value
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    await api.post('/api/auth/change-password', { currentPassword, newPassword })
    await refreshProfile()
  }

  function expire() {
    user.value = null
    initialized.value = true
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('fagolab:session-expired', expire)
  }

  return {
    user,
    initialized,
    loading,
    authenticated,
    primaryRole,
    initials,
    avatarUrl,
    coverUrl,
    can,
    initialize,
    login,
    bootstrap,
    register,
    logout,
    refreshProfile,
    changePassword,
    expire,
  }
})
