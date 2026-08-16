// Cliente HTTP de fago-api.
// La URL base se resuelve en este orden:
//   1. VITE_API_URL (si se define al construir/servir)
//   2. Por hostname: localhost -> uvicorn local; dev-* -> API dev; resto -> API prod.
// Así el mismo build funciona en local, en dev (Tailscale/ingress) y en prod.

function resolveBaseUrl(): string {
  const env = (import.meta as any).env?.VITE_API_URL as string | undefined
  if (env) return env.replace(/\/$/, '')
  if ((import.meta as any).env?.DEV) return ''

  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    // Local / LAN: API en el mismo host puerto 8000
    if (host === 'localhost' || host === '127.0.0.1' || !host.includes('.') || host.startsWith('192.') || host.startsWith('10.') || host.startsWith('172.')) {
      return `http://${host}:8000`
    }
    // Kaanbal: nginx del front hace proxy same-origin a fagolab-api
    if (host.endsWith('.softwarefactory.site') || host === 'softwarefactory.site') {
      return ''
    }
    return 'https://fagolab-api.softwarefactory.site'
  }
  return 'http://localhost:8000'
}

export const API_BASE = resolveBaseUrl()

function websocketUrl(path: string): string {
  if (typeof window === 'undefined') return path
  const base = API_BASE || window.location.origin
  const url = new URL(path, base.endsWith('/') ? base : `${base}/`)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.toString()
}

export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, message: string, code = '') {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

function cookie(name: string): string {
  if (typeof document === 'undefined') return ''
  const prefix = `${encodeURIComponent(name)}=`
  const item = document.cookie.split('; ').find((part) => part.startsWith(prefix))
  return item ? decodeURIComponent(item.slice(prefix.length)) : ''
}

let refreshPromise: Promise<boolean> | null = null

async function refreshSession(): Promise<boolean> {
  if (refreshPromise) return refreshPromise
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRF-Token': cookie('fago_csrf') },
      })
      return res.ok
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()
  return refreshPromise
}

async function request<T>(path: string, init?: RequestInit, retry = true): Promise<T> {
  const method = (init?.method ?? 'GET').toUpperCase()
  const headers = new Headers(init?.headers)
  if (init?.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrf = cookie('fago_csrf')
    if (csrf) headers.set('X-CSRF-Token', csrf)
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    method,
    headers,
    credentials: 'include',
  })
  if (res.status === 401 && retry && !path.startsWith('/api/auth/login') && !path.startsWith('/api/auth/register') && !path.startsWith('/api/auth/bootstrap') && !path.startsWith('/api/auth/refresh')) {
    if (await refreshSession()) return request<T>(path, init, false)
    window.dispatchEvent(new CustomEvent('fagolab:session-expired'))
  }
  if (!res.ok) {
    let detail = res.statusText
    let code = ''
    try {
      const body = await res.json()
      detail = body.detail ?? detail
      code = body.code ?? ''
    } catch {
      /* respuesta sin cuerpo JSON */
    }
    throw new ApiError(res.status, detail, code)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),

  async uploadFile<T>(path: string, file: File, field = 'file'): Promise<T> {
    const fd = new FormData()
    fd.append(field, file)
    return request<T>(path, { method: 'POST', body: fd })
  },

  // Subida de imágenes: multipart/form-data (no fijar Content-Type, lo pone el navegador).
  async upload(
    file: File,
    codigoObjeto: string,
    rol = 'evidencia',
    esPrincipal = false,
  ): Promise<{ id: string; storageUri: string }> {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('codigoObjeto', codigoObjeto)
    fd.append('rol', rol)
    fd.append('esPrincipal', String(esPrincipal))
    return request<{ id: string; storageUri: string }>('/api/media', { method: 'POST', body: fd })
  },

  // Construye una URL absoluta a un archivo de media servido por la API (/media/...).
  mediaUrl: (storageUri: string) =>
    storageUri.startsWith('http') ? storageUri : `${API_BASE}${storageUri}`,
  wsUrl: websocketUrl,
}
