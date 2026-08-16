<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api'
import { useChatStore } from '../stores/chat'
import { useIaStore } from '../stores/ia'
import { usePresenceStore } from '../stores/presence'
import { useTareasStore } from '../stores/tareas'
import { useAuthStore } from '../stores/auth'
import Icon from './Icon.vue'

type RailTab = 'personas' | 'actividades' | 'asistente'
const STORAGE_V1 = 'fagolab-communication-rail-v1'
const STORAGE_KEY = 'fagolab-communication-rail-v2'
const router = useRouter(); const presence = usePresenceStore(); const chat = useChatStore(); const tareas = useTareasStore(); const ia = useIaStore(); const auth = useAuthStore()
const open = ref(false); const tab = ref<RailTab>('personas'); const search = ref(''); const draft = ref(''); const creating = ref(false)
const taskDraft = ref(''); const agentDraft = ref('')
const filteredPeople = computed(() => presence.people.filter(p => [p.nombre, p.cargo, p.rol].filter(Boolean).some(v => v!.toLocaleLowerCase('es').includes(search.value.trim().toLocaleLowerCase('es')))))
const myTasks = computed(() => tareas.tareas.filter(t => !t.idAsignado || t.idAsignado === auth.user?.id).slice(0, 8))
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]?.toUpperCase()).join('') }
function avatar(uri?: string | null) { return uri ? api.mediaUrl(uri) : '' }
function label(c: { nombre?: string | null; tipo: string; interlocutor?: { nombre: string } | null }) { return c.tipo === 'directa' ? c.interlocutor?.nombre || 'Conversación directa' : c.nombre || 'Grupo sin nombre' }
async function openPerson(id: string) { await chat.openDirect(id); tab.value = 'personas' }
async function send() { if (!draft.value.trim()) return; const text = draft.value; draft.value = ''; try { await chat.sendMessage(text) } catch { draft.value = text } }
async function quickTask() { if (!taskDraft.value.trim()) return; const title = taskDraft.value; taskDraft.value = ''; try { await tareas.create({ titulo: title, idAsignado: auth.user?.id }); } catch { taskDraft.value = title } }
async function sendAgent() { if (!agentDraft.value.trim()) return; if (!ia.selected) await ia.create('ask', 'Consulta rápida'); const text = agentDraft.value; agentDraft.value = ''; await ia.send(text) }
function loadTab() { if (tab.value === 'personas') void chat.load(true); if (tab.value === 'actividades') void tareas.load(true); if (tab.value === 'asistente') void ia.load() }
function openRail() { open.value = true; void presence.loadDirectory(true); loadTab() }
function closeRail() { open.value = false }
onMounted(() => { try { const v2 = localStorage.getItem(STORAGE_KEY); const saved = JSON.parse(v2 || localStorage.getItem(STORAGE_V1) || '{}'); open.value = !!saved.open; tab.value = ['personas','actividades','asistente'].includes(saved.tab) ? saved.tab : 'personas'; if (!v2) localStorage.removeItem(STORAGE_V1) } catch {} if (open.value) openRail() })
watch([open, tab], () => { localStorage.setItem(STORAGE_KEY, JSON.stringify({ open: open.value, tab: tab.value })); if (open.value) loadTab() })
</script>

<template>
  <div class="communication-rail no-print" :class="{ open }">
    <button v-if="!open" class="rail-toggle" type="button" @click="openRail"><Icon name="message" :size="21" /><span>Equipo</span><b v-if="chat.unreadTotal">{{ chat.unreadTotal }}</b></button>
    <button v-if="open" class="rail-backdrop" type="button" aria-label="Cerrar" @click="closeRail" />
    <aside v-if="open" class="rail-panel" aria-label="Comunidad del laboratorio">
      <header><div><h2>Comunidad del laboratorio</h2><small><i :class="{ offline: !presence.connected }" />{{ presence.connected ? 'En vivo' : 'Reconectando…' }}</small></div><button type="button" @click="closeRail"><Icon name="close" :size="18" /></button></header>
      <nav><button :class="{ active: tab === 'personas' }" @click="tab='personas'"><Icon name="users" :size="16" /> Personas</button><button :class="{ active: tab === 'actividades' }" @click="tab='actividades'"><Icon name="clipboard" :size="16" /> Actividades</button><button :class="{ active: tab === 'asistente' }" @click="tab='asistente'"><Icon name="sparkles" :size="16" /> Asistente</button></nav>
      <section v-if="tab === 'personas'" class="chat-section">
        <template v-if="chat.selected">
          <div class="conversation-head"><button type="button" @click="chat.selectedId=null"><Icon name="arrow" :size="16" /></button><div><b>{{ label(chat.selected) }}</b><small>{{ chat.selected.tipo === 'grupo' ? `${chat.selected.miembros?.length ?? 0} integrantes` : 'Mensaje directo' }}</small></div><button type="button" title="Abrir página" @click="router.push('/mensajes');closeRail()"><Icon name="expand" :size="16" /></button></div>
          <div class="messages"><p v-if="chat.loadingMessages" class="hint">Cargando mensajes…</p><article v-for="message in chat.messages" :key="message.id" :class="{ mine: message.autorId === undefined }"><b>{{ message.autorNombre || 'Sistema' }}</b><p>{{ message.cuerpo }}</p><small>{{ new Date(message.createdAt).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'}) }}</small></article><p v-if="!chat.messages.length && !chat.loadingMessages" class="hint">Aún no hay mensajes. Saluda al equipo.</p></div>
          <form class="composer" @submit.prevent="send"><textarea v-model="draft" rows="2" placeholder="Escribe un mensaje…" @keydown.enter.exact.prevent="send" /><button class="btn btn-primary" type="submit" :disabled="!draft.trim()"><Icon name="arrow" :size="16" /></button></form>
        </template>
        <template v-else>
          <div class="section-tools"><b>Conversaciones</b><button type="button" title="Ver todo" @click="router.push('/mensajes');closeRail()"><Icon name="expand" :size="16" /></button></div>
          <div class="conversation-list"><button v-for="conversation in chat.conversations" :key="conversation.id" type="button" class="conversation-row" @click="chat.select(conversation.id)"><span class="avatar">{{ initials(label(conversation)) }}</span><span><b>{{ label(conversation) }}</b><small>{{ conversation.ultimoMensaje || 'Sin mensajes todavía' }}</small></span><em v-if="conversation.noLeidos">{{ conversation.noLeidos }}</em></button><p v-if="!chat.conversations.length && !chat.loading" class="hint">Selecciona una persona para iniciar una conversación.</p></div>
          <label class="search"><Icon name="search" :size="15" /><input v-model="search" placeholder="Buscar persona…" /></label>
          <div class="people"><button v-for="person in filteredPeople" :key="person.id" type="button" :disabled="person.isCurrent || creating" @click="openPerson(person.id)"><span class="avatar"><img v-if="person.avatarUri" :src="avatar(person.avatarUri)" :alt="person.nombre" /><template v-else>{{ initials(person.nombre) }}</template><i :class="{ offline: !person.online }" /></span><span><b>{{ person.nombre }} <em v-if="person.isCurrent">Tú</em></b><small>{{ person.cargo || person.rol }} · {{ person.online ? 'En línea' : 'Desconectado' }}</small></span></button></div>
        </template>
      </section>
      <section v-else-if="tab === 'actividades'" class="compact-pane">
        <div class="section-tools"><b>Mis tareas</b><button type="button" title="Abrir tablero" @click="router.push('/tareas');closeRail()"><Icon name="expand" :size="16" /></button></div>
        <form v-if="auth.can('tareas.items.create')" class="quick-create" @submit.prevent="quickTask"><input v-model="taskDraft" placeholder="Crear tarea rápida…" /><button class="btn btn-primary" :disabled="!taskDraft.trim()"><Icon name="plus" :size="15" /></button></form>
        <div class="compact-list"><button v-for="task in myTasks" :key="task.id" @click="router.push('/tareas');closeRail()"><code>{{ task.clave }}</code><b>{{ task.titulo }}</b><small>{{ task.estadoNombre }} · {{ task.asignadoNombre || 'Sin asignar' }}</small></button><p v-if="!myTasks.length" class="hint">No hay tareas pendientes para mostrar.</p></div>
      </section>
      <section v-else class="compact-pane">
        <div class="section-tools"><b>FagoLab IA</b><button type="button" title="Abrir asistente" @click="router.push('/asistente');closeRail()"><Icon name="expand" :size="16" /></button></div>
        <label class="agent-select"><span>Conversación</span><select :value="ia.selected?.id || ''" @change="ia.select(($event.target as HTMLSelectElement).value)"><option value="">Nueva consulta rápida</option><option v-for="item in ia.conversations" :key="item.id" :value="item.id">{{ item.titulo || 'Sin título' }}</option></select></label>
        <div class="mini-agent-messages"><article v-for="message in ia.selected?.mensajes.slice(-6) || []" :key="message.id" :class="message.rol"><b>{{ message.rol === 'user' ? 'Tú' : 'FagoLab IA' }}</b><p>{{ message.contenido }}</p></article><p v-if="!ia.selected" class="hint">Pregunta por datos, tareas o protocolos.</p></div>
        <form class="composer" @submit.prevent="sendAgent"><textarea v-model="agentDraft" rows="2" placeholder="Pregunta al asistente…" @keydown.enter.exact.prevent="sendAgent" /><button class="btn btn-primary" :disabled="!agentDraft.trim() || ia.sending"><Icon name="arrow" :size="16" /></button></form>
      </section>
    </aside>
  </div>
</template>

<style scoped>
.communication-rail{position:fixed;inset:0;z-index:90;pointer-events:none}.rail-toggle,.rail-panel,.rail-backdrop{pointer-events:auto}.rail-toggle{position:absolute;right:0;top:50%;display:grid;place-items:center;gap:4px;width:58px;padding:12px 5px;transform:translateY(-50%);border:1px solid var(--line);border-right:0;border-radius:16px 0 0 16px;color:var(--teal-600);background:var(--panel);box-shadow:var(--shadow)}.rail-toggle span{font-size:.65rem;font-weight:800}.rail-toggle b,.conversation-row em{display:grid;place-items:center;min-width:19px;height:19px;border-radius:99px;color:#fff;background:var(--teal);font-size:.6rem;font-style:normal}.rail-panel{position:absolute;right:14px;top:74px;bottom:18px;display:flex;flex-direction:column;width:min(390px,calc(100vw - 28px));overflow:hidden;border:1px solid var(--line);border-radius:22px;background:var(--panel);box-shadow:0 24px 70px #0f243838}.rail-panel header{display:flex;justify-content:space-between;padding:18px}.rail-panel h2{font-size:.95rem}.rail-panel header small{display:flex;align-items:center;gap:6px;margin-top:4px;color:var(--muted);font-size:.68rem}.rail-panel header i{width:7px;height:7px;border-radius:50%;background:#18aa79}.rail-panel header i.offline{background:var(--amber)}.rail-panel header button,.conversation-head button,.section-tools button{display:grid;place-items:center;width:32px;height:32px;border-radius:9px;color:var(--muted);background:var(--line-soft)}nav{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin:0 15px 12px;padding:4px;border-radius:11px;background:var(--line-soft)}nav button{display:flex;justify-content:center;align-items:center;gap:6px;padding:8px;border-radius:8px;color:var(--muted);font-size:.72rem;font-weight:800}nav button.active{color:var(--teal-600);background:var(--panel);box-shadow:var(--shadow-sm)}.chat-section{display:flex;flex:1;min-height:0;flex-direction:column;padding:0 13px 13px}.section-tools,.conversation-head{display:flex;align-items:center;gap:9px;padding:5px 5px 10px}.section-tools b,.conversation-head b{font-size:.78rem}.section-tools button:last-child,.conversation-head button:last-child{margin-left:auto}.conversation-head>div{display:grid;gap:2px}.conversation-head small{color:var(--muted);font-size:.62rem}.conversation-list,.people,.messages{min-height:0;overflow:auto}.conversation-row,.people>button{display:flex;align-items:center;gap:9px;width:100%;padding:9px 5px;border-bottom:1px solid var(--line-soft);text-align:left}.conversation-row>span:nth-child(2),.people>button>span:nth-child(2){display:grid;min-width:0;gap:3px}.conversation-row b,.people b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.73rem}.conversation-row small,.people small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:.62rem}.conversation-row em{margin-left:auto}.avatar{position:relative;display:grid;place-items:center;flex:none;width:35px;height:35px;border-radius:11px;color:#fff;background:linear-gradient(135deg,var(--teal),var(--blue));font-size:.63rem;font-weight:900}.avatar img{width:100%;height:100%;border-radius:inherit;object-fit:cover}.avatar i{position:absolute;right:-1px;bottom:-1px;width:9px;height:9px;border:2px solid var(--panel);border-radius:50%;background:#18aa79}.avatar i.offline{background:#aeb9c5}.search{display:flex;align-items:center;gap:6px;margin:10px 1px 4px;padding:8px;border:1px solid var(--line);border-radius:10px;color:var(--muted)}.search input,.composer textarea{width:100%;border:0;outline:0;background:transparent;color:var(--ink)}.search input{font-size:.7rem}.people{flex:1}.people em{padding:1px 4px;border-radius:6px;color:var(--teal-600);background:var(--teal-50);font-size:.55rem;font-style:normal}.messages{display:flex;flex:1;flex-direction:column;gap:8px;padding:5px}.messages article{align-self:flex-start;max-width:83%;padding:8px 10px;border-radius:11px 11px 11px 2px;background:var(--line-soft)}.messages article.mine{align-self:flex-end;border-radius:11px 11px 2px;background:var(--teal-50)}.messages b{font-size:.62rem}.messages p{margin:3px 0;font-size:.72rem;line-height:1.35;white-space:pre-wrap}.messages small{color:var(--muted);font-size:.57rem}.hint{padding:20px 10px;color:var(--muted);text-align:center;font-size:.7rem}.composer{display:flex;gap:7px;padding-top:9px;border-top:1px solid var(--line)}.composer textarea{resize:none;padding:8px;border:1px solid var(--line);border-radius:10px;font-size:.72rem}.composer button{width:36px;padding:0}.activities{display:grid;place-items:center;align-content:center;gap:10px;flex:1;padding:30px;text-align:center;color:var(--teal-600)}.activities h3{color:var(--ink);font-size:.9rem}.activities p{color:var(--muted);font-size:.7rem;line-height:1.5}.rail-backdrop{display:none}@media(max-width:620px){.rail-backdrop{display:block;position:absolute;inset:0;border:0;background:#10273a55}.rail-panel{top:8px;right:8px;bottom:8px;width:calc(100vw - 16px)}.rail-toggle{top:auto;bottom:78px}}@media print{.communication-rail{display:none!important}}
</style>

<style scoped>
.rail-panel nav {
  grid-template-columns: repeat(3, 1fr);
}
.compact-pane {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  padding: 0 13px 13px;
}
.quick-create {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}
.quick-create input,
.agent-select select {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--panel);
  font-size: .7rem;
}
.quick-create button {
  width: 36px;
  padding: 0;
}
.compact-list {
  min-height: 0;
  overflow: auto;
}
.compact-list > button {
  display: grid;
  width: 100%;
  gap: 3px;
  padding: 10px 6px;
  border-bottom: 1px solid var(--line-soft);
  text-align: left;
}
.compact-list code {
  color: var(--teal-600);
  font-size: .6rem;
  font-weight: 800;
}
.compact-list b {
  font-size: .72rem;
}
.compact-list small {
  color: var(--muted);
  font-size: .61rem;
}
.agent-select {
  display: grid;
  gap: 4px;
  margin-bottom: 8px;
  color: var(--muted);
  font-size: .62rem;
}
.mini-agent-messages {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 7px;
  overflow: auto;
  padding: 5px;
}
.mini-agent-messages article {
  align-self: flex-start;
  max-width: 86%;
  padding: 8px;
  border-radius: 10px;
  background: var(--line-soft);
}
.mini-agent-messages article.user {
  align-self: flex-end;
  background: var(--teal-50);
}
.mini-agent-messages b {
  font-size: .6rem;
}
.mini-agent-messages p {
  margin-top: 3px;
  white-space: pre-wrap;
  font-size: .68rem;
  line-height: 1.35;
}
</style>
