import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '../api'
import { usePresenceStore } from './presence'

export interface ChatMember { id: string; nombre: string; cargo?: string | null; avatarUri?: string | null; rol?: string }
export interface ChatMessage {
  id: string; idConversacion: string; tipo: string; cuerpo: string; adjuntos?: unknown[]; metadata?: unknown
  respondeA?: string | null; createdAt: string; editadoAt?: string | null; eliminadoAt?: string | null
  autorId?: string | null; autorNombre?: string | null; autorAvatarUri?: string | null
  reacciones: { emoji: string; usuarios: string[] }[]
}
export interface ChatConversation {
  id: string; tipo: 'directa' | 'grupo'; nombre?: string | null; ultimoMensajeAt?: string | null; noLeidos?: number
  ultimoMensaje?: string | null; ultimoMensajeAutor?: string | null; interlocutor?: ChatMember | null
  fijada?: boolean; miembros?: ChatMember[]
}

export const useChatStore = defineStore('chat', () => {
  const presence = usePresenceStore()
  const conversations = ref<ChatConversation[]>([])
  const selectedId = ref<string | null>(null)
  const messagesByConversation = ref<Record<string, ChatMessage[]>>({})
  const loading = ref(false)
  const loadingMessages = ref(false)
  const error = ref('')
  const loaded = ref(false)
  let cleanups: (() => void)[] = []

  const selected = computed(() => conversations.value.find(item => item.id === selectedId.value) ?? null)
  const messages = computed(() => selectedId.value ? messagesByConversation.value[selectedId.value] ?? [] : [])
  const unreadTotal = computed(() => conversations.value.reduce((sum, item) => sum + (item.noLeidos ?? 0), 0))

  function mergeConversation(item: ChatConversation) {
    const index = conversations.value.findIndex(row => row.id === item.id)
    if (index >= 0) conversations.value[index] = { ...conversations.value[index], ...item }
    else conversations.value.unshift(item)
  }
  function mergeMessage(message: ChatMessage) {
    const list = messagesByConversation.value[message.idConversacion] ?? []
    const index = list.findIndex(row => row.id === message.id)
    if (index >= 0) list[index] = message
    else list.push(message)
    list.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    messagesByConversation.value[message.idConversacion] = list
    const conversation = conversations.value.find(row => row.id === message.idConversacion)
    if (conversation) Object.assign(conversation, { ultimoMensaje: message.cuerpo, ultimoMensajeAt: message.createdAt, ultimoMensajeAutor: message.autorNombre })
  }
  function wireRealtime() {
    if (cleanups.length) return
    cleanups = [
      presence.on('chat.message', (event) => mergeMessage(event.message as ChatMessage)),
      presence.on('chat.message.updated', (event) => mergeMessage(event.message as ChatMessage)),
      presence.on('chat.message.deleted', (event) => mergeMessage(event.message as ChatMessage)),
      presence.on('chat.conversation', (event) => { mergeConversation(event.conversation as ChatConversation); void load() }),
      presence.on('chat.unread', () => void load()),
    ]
  }
  async function load(force = false) {
    if (loading.value || (loaded.value && !force)) return
    loading.value = true; error.value = ''
    try {
      conversations.value = await api.get<ChatConversation[]>('/api/chat/conversaciones')
      loaded.value = true; wireRealtime()
    } catch (cause) { error.value = cause instanceof Error ? cause.message : 'No se pudieron cargar los mensajes.' }
    finally { loading.value = false }
  }
  async function select(conversationId: string) {
    selectedId.value = conversationId
    presence.subscribe(`conversacion:${conversationId}`)
    if (!messagesByConversation.value[conversationId]) await loadMessages(conversationId)
    await markRead(conversationId)
  }
  async function openDirect(userId: string) {
    const conversation = await api.post<ChatConversation>('/api/chat/conversaciones', { idUsuario: userId })
    mergeConversation(conversation); await select(conversation.id); return conversation
  }
  async function createGroup(nombre: string, miembros: string[]) {
    const conversation = await api.post<ChatConversation>('/api/chat/grupos', { nombre, miembros })
    mergeConversation(conversation); await select(conversation.id); return conversation
  }
  async function loadMessages(conversationId: string) {
    loadingMessages.value = true
    try { messagesByConversation.value[conversationId] = (await api.get<{ items: ChatMessage[] }>(`/api/chat/conversaciones/${conversationId}/mensajes`)).items }
    finally { loadingMessages.value = false }
  }
  async function sendMessage(cuerpo: string, respondeA?: string | null) {
    if (!selectedId.value) return
    const message = await api.post<ChatMessage>(`/api/chat/conversaciones/${selectedId.value}/mensajes`, { cuerpo, respondeA })
    mergeMessage(message)
  }
  async function markRead(conversationId = selectedId.value) {
    if (!conversationId) return
    const list = messagesByConversation.value[conversationId] ?? []
    const last = list.at(-1)
    await api.post(`/api/chat/conversaciones/${conversationId}/leido`, { idMensaje: last?.id })
    const conversation = conversations.value.find(row => row.id === conversationId)
    if (conversation) conversation.noLeidos = 0
  }
  async function react(messageId: string, emoji: string) {
    mergeMessage(await api.post<ChatMessage>(`/api/chat/mensajes/${messageId}/reacciones`, { emoji }))
  }
  return { conversations, selectedId, selected, messages, loading, loadingMessages, error, loaded, unreadTotal, load, select, openDirect, createGroup, loadMessages, sendMessage, markRead, react }
})
