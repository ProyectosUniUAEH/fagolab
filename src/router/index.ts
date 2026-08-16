import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'

// Hash history: el deploy es estático (nginx) sin reglas de rewrite, así que
// hash routing evita 404 al recargar una ruta profunda.
const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: () => import('../views/LoginView.vue'), meta: { title: 'Iniciar sesión', public: true } },
  { path: '/registro', name: 'registro', component: () => import('../views/RegisterView.vue'), meta: { title: 'Solicitar acceso', public: true } },
  { path: '/configuracion-inicial', name: 'configuracion-inicial', component: () => import('../views/InitialSetupView.vue'), meta: { title: 'Configuración inicial', public: true } },
  { path: '/sin-permiso', name: 'sin-permiso', component: () => import('../views/ForbiddenView.vue'), meta: { title: 'Acceso restringido' } },
  { path: '/', name: 'dashboard', component: () => import('../views/DashboardView.vue'), meta: { title: 'Inicio', permission: 'dashboard.main.view' } },
  { path: '/proyecto', name: 'proyecto', component: () => import('../views/ProyectoView.vue'), meta: { title: 'Proyecto', permission: 'proyecto.info.view' } },
  { path: '/recepciones', name: 'recepciones', component: () => import('../views/RecepcionesView.vue'), meta: { title: 'Recepciones de lote', permission: 'recepciones.records.view' } },
  { path: '/aislamiento', name: 'aislamiento', component: () => import('../views/AislamientoWizard.vue'), meta: { title: 'Nuevo aislamiento', permission: 'aislamiento.workflow.view' } },
  { path: '/peces', name: 'peces', component: () => import('../views/PecesView.vue'), meta: { title: 'Peces', permission: 'peces.records.view' } },
  { path: '/cajas', name: 'cajas', component: () => import('../views/CajasView.vue'), meta: { title: 'Cajas Petri', permission: 'cajas.records.view' } },
  { path: '/subcultivos', name: 'subcultivos', component: () => import('../views/SubcultivosView.vue'), meta: { title: 'Subcultivos', permission: 'subcultivos.records.view' } },
  { path: '/nanodrop', name: 'nanodrop', component: () => import('../views/NanoDropView.vue'), meta: { title: 'NanoDrop', permission: 'nanodrop.readings.view' } },
  { path: '/pcr', name: 'pcr', component: () => import('../views/PcrView.vue'), meta: { title: 'PCR', permission: 'pcr.runs.view' } },
  { path: '/electroforesis', name: 'electroforesis', component: () => import('../views/ElectroforesisView.vue'), meta: { title: 'Electroforesis', permission: 'electroforesis.gels.view' } },
  { path: '/protocolos', name: 'protocolos', component: () => import('../views/ProtocolosView.vue'), meta: { title: 'Protocolos', permission: 'protocolos.content.view' } },
  { path: '/protocolos/categoria/:cat', name: 'protocolo-categoria', component: () => import('../views/ProtocoloCategoriaView.vue'), meta: { title: 'Protocolos', permission: 'protocolos.content.view' } },
  { path: '/protocolos/:slug', name: 'protocolo-detalle', component: () => import('../views/ProtocoloDetalleView.vue'), meta: { title: 'Protocolo', permission: 'protocolos.content.view' } },
  { path: '/reportes', name: 'reportes', component: () => import('../views/ReportesView.vue'), meta: { title: 'Reportes', permission: 'reportes.analytics.view' } },
  { path: '/modelos-ia', name: 'modelos-ia', component: () => import('../views/ModelosIaView.vue'), meta: { title: 'Modelos de IA', permission: 'modelos.content.view' } },
  { path: '/biblioteca', name: 'biblioteca', component: () => import('../views/BibliotecaView.vue'), meta: { title: 'Biblioteca', permission: 'biblioteca.documents.view' } },
  { path: '/mensajes', name: 'mensajes', component: () => import('../views/MensajesView.vue'), meta: { title: 'Mensajes', permission: 'chat.panel.view' } },
  { path: '/tareas', name: 'tareas', component: () => import('../views/TareasView.vue'), meta: { title: 'Tareas', permission: 'tareas.panel.view' } },
  { path: '/asistente', name: 'asistente', component: () => import('../views/AsistenteView.vue'), meta: { title: 'Asistente IA', permission: 'ia.panel.view' } },
  { path: '/etiquetas', name: 'etiquetas', component: () => import('../views/EtiquetasView.vue'), meta: { title: 'Etiquetas QR', permission: 'etiquetas.labels.view' } },
  { path: '/ficha/:codigo', name: 'ficha-qr', component: () => import('../views/FichaQrView.vue'), meta: { title: 'Ficha de laboratorio', permission: 'cajas.records.view' } },
  { path: '/modelo', name: 'modelo', component: () => import('../views/ModeloView.vue'), meta: { title: 'Modelo de datos', permission: 'datos.database.view' } },
  { path: '/perfil', name: 'perfil', component: () => import('../views/ProfileView.vue'), meta: { title: 'Mi perfil' } },
  { path: '/seguridad', name: 'seguridad', component: () => import('../views/SecurityAdminView.vue'), meta: { title: 'Seguridad y accesos', permission: 'security.panel.view' } },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})
