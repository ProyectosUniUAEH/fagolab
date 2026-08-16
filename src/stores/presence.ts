import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '../api'
import { useAuthStore } from './auth'

export interface DirectoryUser {
  id: string
  nombre: string
  cargo?: string | null
  avatarUri?: string | null
  rol: string
}

export interface OnlineUser extends DirectoryUser {
  connectedAt: string
  lastSeenAt: string
  connections: number
}

export interface PresencePerson extends DirectoryUser {
  online: boolean
  isCurrent: boolean
  connectedAt?: string
  lastSeenAt?: string
  connections: number
}

interface RealtimeMessage {
  type: string
  users?: OnlineUser[]
  canViewRoster?: boolean
  at?: string
  [key: string]: unknown
}

export const usePresenceStore = defineStore('presence', () => {
  const auth = useAuthStore()
  const connected = ref(false)
  const canViewRoster = ref(false)
  const users = ref<OnlineUser[]>([])
  const directory = ref<DirectoryUser[]>([])
  const directoryLoading = ref(false)
  const directoryError = ref('')
  const lastEventAt = ref<string | null>(null)
  const reconnectAttempt = ref(0)
  let socket: WebSocket | null = null
  let heartbeatTimer: number | undefined
  let reconnectTimer: number | undefined
  let stopped = true
  const listeners = new Map<string, Set<(message: RealtimeMessage) => void>>()
  const channels = new Set<string>()

  const onlineCount = computed(() => users.value.length)
  const people = computed<PresencePerson[]>(() => {
    const onlineById = new Map(users.value.map((user) => [user.id, user]))
    const merged = directory.value.map((person) => {
      const live = onlineById.get(person.id)
      onlineById.delete(person.id)
      return {
        ...person,
        ...live,
        online: !!live,
        isCurrent: person.id === auth.user?.id,
        connections: live?.connections ?? 0,
      }
    })
    for (const live of onlineById.values()) {
      merged.push({
        ...live,
        online: true,
        isCurrent: live.id === auth.user?.id,
      })
    }
    return merged.sort((a, b) =>
      Number(b.online) - Number(a.online)
      || Number(b.isCurrent) - Number(a.isCurrent)
      || a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }),
    )
  })
  const totalCount = computed(() => people.value.length)
  const status = computed(() => connected.value ? 'conectado' : reconnectAttempt.value ? 'reconectando' : 'desconectado')

  async function loadDirectory(force = false) {
    if (!auth.authenticated || directoryLoading.value || (!force && directory.value.length)) return
    directoryLoading.value = true
    directoryError.value = ''
    try {
      directory.value = await api.get<DirectoryUser[]>('/api/auth/directory')
    } catch {
      directoryError.value = 'No se pudo actualizar el directorio.'
    } finally {
      directoryLoading.value = false
    }
  }

  function clearTimers() {
    if (heartbeatTimer) window.clearInterval(heartbeatTimer)
    if (reconnectTimer) window.clearTimeout(reconnectTimer)
    heartbeatTimer = undefined
    reconnectTimer = undefined
  }

  function heartbeat() {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'presence.heartbeat' }))
    }
  }

  function send(message: Record<string, unknown>) {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
  }

  function subscribe(channel: string) {
    channels.add(channel)
    send({ type: 'channel.subscribe', channel })
  }

  function unsubscribe(channel: string) {
    channels.delete(channel)
    send({ type: 'channel.unsubscribe', channel })
  }

  function on(type: string, handler: (message: RealtimeMessage) => void) {
    const handlers = listeners.get(type) ?? new Set()
    handlers.add(handler)
    listeners.set(type, handlers)
    return () => {
      handlers.delete(handler)
      if (!handlers.size) listeners.delete(type)
    }
  }

  function scheduleReconnect() {
    if (stopped || !auth.authenticated || reconnectTimer) return
    const delay = Math.min(15_000, 1_000 * 2 ** Math.min(reconnectAttempt.value, 4))
    reconnectAttempt.value += 1
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = undefined
      connect()
    }, delay)
  }

  function connect() {
    if (typeof window === 'undefined' || !auth.authenticated) return
    void loadDirectory()
    if (socket && [WebSocket.OPEN, WebSocket.CONNECTING].includes(socket.readyState)) return
    stopped = false
    const activeSocket = new WebSocket(api.wsUrl('/ws/presence'))
    socket = activeSocket

    activeSocket.onopen = () => {
      if (socket !== activeSocket) return
      connected.value = true
      reconnectAttempt.value = 0
      heartbeat()
      heartbeatTimer = window.setInterval(heartbeat, 25_000)
      for (const channel of channels) send({ type: 'channel.subscribe', channel })
    }
    activeSocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as RealtimeMessage
        lastEventAt.value = new Date().toISOString()
        if (message.type === 'presence.ready') {
          canViewRoster.value = !!message.canViewRoster
        }
        if (message.type === 'presence.snapshot' && Array.isArray(message.users)) {
          users.value = message.users
        }
        for (const handler of listeners.get(message.type) ?? []) handler(message)
      } catch {
        // Un mensaje ajeno al contrato no debe romper la conexión.
      }
    }
    activeSocket.onclose = async (event) => {
      if (socket !== activeSocket) return
      connected.value = false
      if (heartbeatTimer) window.clearInterval(heartbeatTimer)
      heartbeatTimer = undefined
      socket = null
      users.value = []
      if (event.code === 4401 && auth.authenticated) {
        try {
          await auth.refreshProfile()
        } catch {
          auth.expire()
        }
      }
      scheduleReconnect()
    }
    activeSocket.onerror = () => {
      activeSocket.close()
    }
  }

  function disconnect() {
    stopped = true
    clearTimers()
    const current = socket
    socket = null
    if (current && current.readyState < WebSocket.CLOSING) current.close(1000, 'Sesión cerrada')
    connected.value = false
    canViewRoster.value = false
    users.value = []
    directory.value = []
    directoryError.value = ''
    reconnectAttempt.value = 0
    channels.clear()
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') heartbeat()
    })
  }

  return {
    connected,
    canViewRoster,
    users,
    directory,
    directoryLoading,
    directoryError,
    lastEventAt,
    onlineCount,
    people,
    totalCount,
    status,
    loadDirectory,
    connect,
    disconnect,
    heartbeat,
    send,
    subscribe,
    unsubscribe,
    on,
  }
})
