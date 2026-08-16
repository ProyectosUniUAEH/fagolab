import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '../api'
import { usePresenceStore } from './presence'

export type AgentMode = 'ask' | 'agente' | 'super'

export interface IaConversation { id: string; titulo: string; modo: AgentMode; shellHabilitado: boolean; ultimoMensaje?: string | null; updatedAt: string; tokensEntrada?: number; tokensSalida?: number; costoAcumulado?: number }
export interface IaMessage { id: string; rol: 'system' | 'user' | 'assistant' | 'tool'; contenido?: string | null; toolCalls?: unknown[]; metadata?: Record<string, unknown>; createdAt: string; tokensEntrada?: number; tokensSalida?: number; costo?: number }
export interface IaConversationDetail extends IaConversation { idUsuario: string; mensajes: IaMessage[] }
export interface IaToolProposal { id: string; nombre: string; argumentos: Record<string, unknown>; estado: string; requiereAprobacion?: boolean; riesgo?: string; descripcion?: string; runId?: string }
export interface IaConfig { id: string; proveedor: string; baseUrl: string; modelo: string; apiKeyPista?: string | null; habilitado: boolean; maxIteraciones: number; temperatura: number; precios?: Record<string, number>; verificadoAt?: string | null; verificadoOk?: boolean | null; verificadoDetalle?: string | null }
export interface IaPolicy { id: string; nombre: string; promptSistema: string; reglas: unknown[]; dominiosPermitidos: string[]; dominiosBloqueados: string[]; herramientasHabilitadas: string[]; comandosBloqueados: string[]; maxIteraciones: number; activa: boolean }
export interface IaConnector { id: string; clave: string; nombre: string; tipo: string; baseUrl: string; apiKeyPista?: string; configuracion?: Record<string, unknown>; habilitado: boolean }
export interface IaUsage { conversaciones: number; tokensEntrada: number; tokensSalida: number; costo: number }

type SocketEvent = Record<string, any>

export const useIaStore = defineStore('ia', () => {
  const presence = usePresenceStore()
  const conversations = ref<IaConversation[]>([])
  const selected = ref<IaConversationDetail | null>(null)
  const activeRunId = ref<string | null>(null)
  const proposals = ref<IaToolProposal[]>([])
  const reasoning = ref('')
  const loading = ref(false)
  const sending = ref(false)
  const error = ref('')
  const config = ref<IaConfig | null>(null)
  const policies = ref<IaPolicy[]>([])
  const connectors = ref<IaConnector[]>([])
  const usage = ref<IaUsage | null>(null)
  let wired = false
  let subscribedChannel = ''

  const isRunning = computed(() => !!activeRunId.value)
  const canUseAgent = computed(() => !!selected.value)

  function channelId(event: SocketEvent) {
    const channel = String(event.channel || '')
    return channel.startsWith('ia:conversacion:') ? channel.slice('ia:conversacion:'.length) : ''
  }

  function streamingMessage(runId: string) {
    if (!selected.value) return null
    let message = selected.value.mensajes.find((item) => item.id === `stream-${runId}`)
    if (!message) {
      message = { id: `stream-${runId}`, rol: 'assistant', contenido: '', metadata: {}, createdAt: new Date().toISOString() }
      selected.value.mensajes.push(message)
    }
    return message
  }

  function wire() {
    if (wired) return
    wired = true
    presence.on('ia.run.started', (raw) => {
      const event = raw as SocketEvent
      if (channelId(event) !== selected.value?.id) return
      activeRunId.value = event.runId
      reasoning.value = ''
    })
    presence.on('ia.delta', (raw) => {
      const event = raw as SocketEvent
      if (channelId(event) !== selected.value?.id) return
      const message = streamingMessage(String(event.runId || activeRunId.value || 'pending'))
      if (message) message.contenido = `${message.contenido || ''}${event.delta || ''}`
    })
    presence.on('ia.razonamiento', (raw) => {
      const event = raw as SocketEvent
      if (channelId(event) === selected.value?.id) reasoning.value += String(event.delta || '')
    })
    presence.on('ia.tool.propuesta', (raw) => {
      const event = raw as SocketEvent
      if (channelId(event) !== selected.value?.id || !event.llamada) return
      proposals.value = [...proposals.value.filter((item) => item.id !== event.llamada.id), { ...event.llamada, runId: event.runId, riesgo: event.riesgo, descripcion: event.descripcion }]
    })
    presence.on('ia.tool.resultado', (raw) => {
      const event = raw as SocketEvent
      if (channelId(event) !== selected.value?.id) return
      proposals.value = proposals.value.map((item) => item.id === event.llamadaId ? { ...item, estado: 'ejecutada' } : item)
    })
    presence.on('ia.uso', (raw) => {
      const event = raw as SocketEvent
      if (channelId(event) !== selected.value?.id || !selected.value) return
      selected.value.tokensEntrada = (selected.value.tokensEntrada || 0) + Number(event.tokensEntrada || 0)
      selected.value.tokensSalida = (selected.value.tokensSalida || 0) + Number(event.tokensSalida || 0)
      selected.value.costoAcumulado = (selected.value.costoAcumulado || 0) + Number(event.costo || 0)
    })
    presence.on('ia.mensaje', (raw) => {
      const event = raw as SocketEvent
      if (channelId(event) !== selected.value?.id) return
      const message = streamingMessage(String(event.runId || activeRunId.value || 'pending'))
      if (message) message.contenido = String(event.contenido || message.contenido || '')
    })
    presence.on('ia.error', (raw) => {
      const event = raw as SocketEvent
      if (channelId(event) === selected.value?.id) error.value = String(event.detalle || 'El agente no pudo completar la ejecución.')
    })
    presence.on('ia.run.finished', (raw) => {
      const event = raw as SocketEvent
      if (channelId(event) !== selected.value?.id) return
      activeRunId.value = null
      void refreshSelected()
      void load()
    })
  }

  async function load() {
    loading.value = true; error.value = ''
    try {
      conversations.value = await api.get<IaConversation[]>('/api/ia/conversaciones')
      wire()
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'No se pudieron cargar las conversaciones.'
    } finally { loading.value = false }
  }

  async function select(conversation: IaConversation | string) {
    const id = typeof conversation === 'string' ? conversation : conversation.id
    if (subscribedChannel) presence.unsubscribe(subscribedChannel)
    selected.value = await api.get<IaConversationDetail>(`/api/ia/conversaciones/${id}`)
    subscribedChannel = `ia:conversacion:${id}`
    presence.subscribe(subscribedChannel)
    proposals.value = []
    reasoning.value = ''
    return selected.value
  }

  async function refreshSelected() {
    if (!selected.value) return null
    return select(selected.value.id)
  }

  async function create(mode: AgentMode, title = '') {
    const conversation = await api.post<IaConversation>('/api/ia/conversaciones', { modo: mode, titulo: title || undefined })
    conversations.value = [conversation, ...conversations.value]
    await select(conversation)
    return conversation
  }

  async function send(content: string) {
    if (!selected.value || !content.trim() || sending.value) return
    sending.value = true; error.value = ''
    const body = content.trim()
    selected.value.mensajes.push({ id: `local-${Date.now()}`, rol: 'user', contenido: body, createdAt: new Date().toISOString() })
    try {
      const result = await api.post<{ ok: boolean; runId: string }>(`/api/ia/conversaciones/${selected.value.id}/mensajes`, { contenido: body })
      activeRunId.value = result.runId
    } catch (cause) {
      selected.value.mensajes = selected.value.mensajes.filter((message) => message.contenido !== body || !message.id.startsWith('local-'))
      error.value = cause instanceof Error ? cause.message : 'No se pudo enviar el mensaje.'
    } finally { sending.value = false }
  }

  async function cancel() {
    if (!selected.value || !activeRunId.value) return
    await api.post(`/api/ia/conversaciones/${selected.value.id}/cancelar`, { runId: activeRunId.value })
  }

  async function resolveProposal(proposal: IaToolProposal, approved: boolean) {
    await api.post(`/api/ia/llamadas/${proposal.id}/${approved ? 'aprobar' : 'rechazar'}`)
    proposals.value = proposals.value.map((item) => item.id === proposal.id ? { ...item, estado: approved ? 'aprobada' : 'rechazada' } : item)
  }

  async function setShell(enabled: boolean, confirmation = '') {
    if (!selected.value) return
    const result = await api.put<{ id: string; shellHabilitado: boolean }>(`/api/ia/conversaciones/${selected.value.id}/shell`, { habilitado: enabled, confirmacion: confirmation })
    selected.value.shellHabilitado = result.shellHabilitado
  }

  async function loadAdmin() {
    const [nextConfig, nextPolicies, nextConnectors, nextUsage] = await Promise.all([
      api.get<IaConfig>('/api/ia/configuracion'), api.get<IaPolicy[]>('/api/ia/politicas'),
      api.get<IaConnector[]>('/api/ia/conectores'), api.get<IaUsage>('/api/ia/uso'),
    ])
    config.value = nextConfig; policies.value = nextPolicies; connectors.value = nextConnectors; usage.value = nextUsage
  }
  async function saveConfig(payload: Partial<IaConfig> & { apiKey?: string }) { config.value = await api.put<IaConfig>('/api/ia/configuracion', payload); return config.value }
  async function testConfig() { return api.post<{ ok: boolean; detalle: string }>('/api/ia/configuracion/probar') }
  async function savePolicy(policy: IaPolicy) { const saved = await api.put<IaPolicy>(`/api/ia/politicas/${policy.id}`, policy); policies.value = [saved]; return saved }
  async function saveConnector(connector: IaConnector & { apiKey?: string }) { const saved = await api.patch<IaConnector>(`/api/ia/conectores/${connector.id}`, connector); connectors.value = connectors.value.map((item) => item.id === saved.id ? { ...item, ...saved } : item); return saved }

  return { conversations, selected, activeRunId, proposals, reasoning, loading, sending, error, config, policies, connectors, usage, isRunning, canUseAgent, load, select, refreshSelected, create, send, cancel, resolveProposal, setShell, loadAdmin, saveConfig, testConfig, savePolicy, saveConnector }
})
