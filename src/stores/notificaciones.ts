import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from './auth'
import { usePresenceStore } from './presence'

/**
 * Avisos personales del laboratorio.
 *
 * El backend ya publicaba `tarea.notificacion` en el canal `usuario:{id}` (al que cada
 * conexión se suscribe sola), pero nadie lo escuchaba en el navegador: el aviso llegaba
 * y se perdía. Esta store lo recoge y alimenta la campana del encabezado.
 */
export interface Notificacion {
  id: string
  tipo: 'tarea' | 'chat'
  titulo: string
  texto: string
  /** Ruta a la que navegar al pulsar el aviso. */
  destino?: string
  createdAt: string
  leida: boolean
}

const MAXIMO = 50
const STORAGE_KEY = 'fagolab-notificaciones-v1'

export const useNotificacionesStore = defineStore('notificaciones', () => {
  const presence = usePresenceStore()
  const auth = useAuthStore()
  const items = ref<Notificacion[]>([])
  let wired = false

  const noLeidas = computed(() => items.value.filter((n) => !n.leida).length)

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.value.slice(0, MAXIMO)))
    } catch {
      // Un almacenamiento lleno no debe romper la sesión.
    }
  }

  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      if (Array.isArray(saved)) items.value = saved.slice(0, MAXIMO)
    } catch {
      items.value = []
    }
  }

  function push(nueva: Omit<Notificacion, 'id' | 'leida' | 'createdAt'> & { createdAt?: string }) {
    items.value.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      leida: false,
      createdAt: nueva.createdAt || new Date().toISOString(),
      ...nueva,
    })
    if (items.value.length > MAXIMO) items.value.length = MAXIMO
    persist()
  }

  function marcarLeidas() {
    items.value.forEach((n) => { n.leida = true })
    persist()
  }

  function limpiar() {
    items.value = []
    persist()
  }

  /** Se engancha al socket compartido; no abre una conexión propia. */
  function wire() {
    if (wired) return
    wired = true
    restore()
    presence.on('tarea.notificacion', (evento: any) => {
      push({
        tipo: 'tarea',
        titulo: evento.tareaClave ? `${evento.tareaClave} · ${evento.titulo ?? ''}`.trim() : 'Actividad',
        texto: evento.texto || 'Tienes una actualización en una actividad.',
        destino: '/tareas',
      })
    })
    presence.on('chat.message', (evento: any) => {
      // Los mensajes propios y los de la conversación abierta no generan aviso: sería ruido.
      const mensaje = evento.message
      if (!mensaje || mensaje.autorId === auth.user?.id) return
      if (document.visibilityState === 'visible' && window.location.hash.startsWith('#/mensajes')) return
      push({
        tipo: 'chat',
        titulo: mensaje.autorNombre || 'Mensaje nuevo',
        texto: (mensaje.cuerpo || 'Te enviaron un adjunto.').slice(0, 120),
        destino: '/mensajes',
      })
    })
  }

  return { items, noLeidas, wire, push, marcarLeidas, limpiar }
})
