<script setup lang="ts">
import Icon from './Icon.vue'
import { useLabStore } from '../stores/lab'
import { useAuthStore } from '../stores/auth'

const lab = useLabStore()
const auth = useAuthStore()

const groups = [
  {
    label: 'Flujo de trabajo',
    items: [
      { to: '/', icon: 'home', label: 'Inicio', permission: 'dashboard.main.view' },
      { to: '/proyecto', icon: 'help', label: 'Acerca del proyecto', permission: 'proyecto.info.view' },
      { to: '/recepciones', icon: 'fish', label: 'Recepciones', permission: 'recepciones.records.view' },
      { to: '/aislamiento', icon: 'plus', label: 'Nuevo aislamiento', permission: 'aislamiento.workflow.view' },
      { to: '/peces', icon: 'fish', label: 'Peces', permission: 'peces.records.view' },
    ],
  },
  {
    label: 'Cultivo & molecular',
    items: [
      { to: '/cajas', icon: 'dish', label: 'Cajas Petri', permission: 'cajas.records.view' },
      { to: '/subcultivos', icon: 'microscope', label: 'Subcultivos', permission: 'subcultivos.records.view' },
      { to: '/nanodrop', icon: 'droplet', label: 'NanoDrop', permission: 'nanodrop.readings.view' },
      { to: '/pcr', icon: 'dna', label: 'PCR', permission: 'pcr.runs.view' },
      { to: '/electroforesis', icon: 'wave', label: 'Electroforesis', permission: 'electroforesis.gels.view' },
    ],
  },
  {
    label: 'Conocimiento',
    items: [
      { to: '/protocolos', icon: 'report', label: 'Protocolos', permission: 'protocolos.content.view' },
      { to: '/biblioteca', icon: 'book', label: 'Biblioteca', permission: 'biblioteca.documents.view' },
      { to: '/modelos-ia', icon: 'brain', label: 'Modelos de IA', permission: 'modelos.content.view' },
    ],
  },
  {
    label: 'Organización',
    items: [
      { to: '/mensajes', icon: 'message', label: 'Mensajes', permission: 'chat.panel.view' },
      { to: '/tareas', icon: 'clipboard', label: 'Tareas', permission: 'tareas.panel.view' },
      { to: '/asistente', icon: 'sparkles', label: 'Asistente IA', permission: 'ia.panel.view' },
      { to: '/reportes', icon: 'table', label: 'Reportes', permission: 'reportes.analytics.view' },
      { to: '/etiquetas', icon: 'qr', label: 'Etiquetas QR', permission: 'etiquetas.labels.view' },
      { to: '/modelo', icon: 'database', label: 'Modelo de datos', permission: 'datos.database.view' },
    ],
  },
  {
    label: 'AdministraciÃ³n',
    items: [
      { to: '/seguridad', icon: 'shield', label: 'Seguridad y accesos', permission: 'security.panel.view' },
    ],
  },
]
</script>

<template>
  <aside class="sidebar">
    <div class="brand">
      <div class="brand-glyph">
        <img src="/logo-fago.svg" alt="FagoLab Logo" class="logo-fago" />
      </div>
      <div>
        <div class="brand-name">FagoLab</div>
        <div class="brand-sub">Laboratorio de Fagoterapia</div>
      </div>
    </div>

    <template v-for="g in groups" :key="g.label">
      <div v-if="g.items.some((it) => auth.can(it.permission))" class="nav-group-label">{{ g.label }}</div>
      <RouterLink v-for="it in g.items.filter((item) => auth.can(item.permission))" :key="it.to" :to="it.to" class="nav-item">
        <Icon :name="it.icon" :size="18" />
        <span>{{ it.label }}</span>
        <span v-if="it.to === '/cajas' && lab.kpis.conCrecimiento" class="nav-badge">{{ lab.kpis.conCrecimiento }}</span>
      </RouterLink>
    </template>

    <div class="sidebar-foot">
      <Icon name="shield" :size="18" />
      <div>
        <b>Trazabilidad activada</b><br />
        Todos los registros son auditables
      </div>
    </div>
  </aside>
</template>
