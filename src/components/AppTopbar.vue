<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { computed, ref } from 'vue'
import Icon from './Icon.vue'
import { useLabStore } from '../stores/lab'
import { useAuthStore } from '../stores/auth'
import { useNotificacionesStore, type Notificacion } from '../stores/notificaciones'

const route = useRoute()
const router = useRouter()
const lab = useLabStore()
const auth = useAuthStore()
const notificaciones = useNotificacionesStore()
notificaciones.wire()
const title = computed(() => (route.meta.title as string) || 'AquaBio')

type ResultadoBusqueda = { codigo: string; tipo: string; detalle: string }
const busqueda = ref('')
const resultadosVisibles = ref(false)
const termino = computed(() => busqueda.value.trim().toLocaleLowerCase())
const resultados = computed<ResultadoBusqueda[]>(() => {
  if (termino.value.length < 2) return []
  const incluye = (...valores: Array<string | number | undefined>) => valores.some((valor) => String(valor ?? '').toLocaleLowerCase().includes(termino.value))
  const peces = lab.state.peces.filter((pez) => incluye(pez.codigo, pez.numeroEnLote, lab.state.recepciones.find((r) => r.id === pez.idRecepcion)?.codigo)).map((pez) => ({ codigo: pez.codigo, tipo: 'Pez', detalle: `Lote ${lab.state.recepciones.find((r) => r.id === pez.idRecepcion)?.codigo ?? 'sin lote'}` }))
  const cajas = lab.state.cajas.filter((caja) => incluye(caja.codigo, caja.medio, lab.pezDeCaja(caja)?.codigo)).map((caja) => ({ codigo: caja.codigo, tipo: 'Caja Petri', detalle: `${lab.pezDeCaja(caja)?.codigo ?? 'Pez'} · ${caja.medio}` }))
  const subcultivos = lab.state.subcultivos.filter((sub) => incluye(sub.codigo, sub.morfotipo, lab.state.cajas.find((caja) => caja.id === sub.idCaja)?.codigo)).map((sub) => ({ codigo: sub.codigo, tipo: 'Subcultivo', detalle: `Origen: ${lab.state.cajas.find((caja) => caja.id === sub.idCaja)?.codigo ?? 'sin caja'}` }))
  const viales = lab.state.viales.filter((vial) => incluye(vial.codigo, lab.state.extracciones.find((ext) => ext.id === vial.idExtraccion)?.codigo)).map((vial) => ({ codigo: vial.codigo, tipo: 'Vial de ADN', detalle: lab.state.extracciones.find((ext) => ext.id === vial.idExtraccion)?.codigo ?? 'Sin extracción' }))
  return [...peces, ...cajas, ...subcultivos, ...viales].slice(0, 8)
})
function abrirResultado(resultado: ResultadoBusqueda) {
  busqueda.value = ''
  resultadosVisibles.value = false
  if (document.activeElement instanceof HTMLInputElement) document.activeElement.value = ''
  router.push({ name: 'ficha-qr', params: { codigo: resultado.codigo } })
}
function buscarPrimero() { if (resultados.value[0]) abrirResultado(resultados.value[0]) }

const menuAbierto = ref(false)
const avisosAbiertos = ref(false)

function alternarAvisos() {
  avisosAbiertos.value = !avisosAbiertos.value
  if (avisosAbiertos.value) notificaciones.marcarLeidas()
}

function abrirAviso(aviso: Notificacion) {
  avisosAbiertos.value = false
  if (aviso.destino) router.push(aviso.destino)
}

const cuando = (iso: string) => {
  const minutos = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (minutos < 1) return 'ahora'
  if (minutos < 60) return `hace ${minutos} min`
  if (minutos < 1440) return `hace ${Math.round(minutos / 60)} h`
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

async function cerrarSesion() {
  menuAbierto.value = false
  await auth.logout()
  router.push('/login')
}
</script>

<template>
  <header class="topbar">
    <div class="crumbs">
      <span>{{ lab.proyecto.nombre }}</span>
      <Icon name="chevron" :size="14" />
      <b>{{ title }}</b>
    </div>
    <div class="topbar-spacer"></div>
    <div v-if="auth.can('search.global.use')" class="topbar-search search-wrap" :class="{ focused: resultadosVisibles }" @input="busqueda = ($event.target as HTMLInputElement).value" @focusin="resultadosVisibles = true" @keydown.enter.prevent="buscarPrimero" @keydown.esc="resultadosVisibles = false">
      <Icon name="search" :size="16" />
      <input placeholder="Buscar código, pez, caja…" />
      <div v-if="resultadosVisibles && termino.length >= 2" class="search-results">
        <button v-for="resultado in resultados" :key="`${resultado.tipo}-${resultado.codigo}`" class="search-result" @mousedown.prevent="abrirResultado(resultado)">
          <span class="search-kind">{{ resultado.tipo }}</span>
          <span><b>{{ resultado.codigo }}</b><small>{{ resultado.detalle }}</small></span>
          <Icon name="arrow" :size="15" />
        </button>
        <p v-if="!resultados.length" class="search-empty">No hay coincidencias para “{{ busqueda }}”.</p>
        <p v-else class="search-hint">Enter abre el primer resultado.</p>
      </div>
    </div>
    <div class="avisos-wrap">
      <button
        class="icon-btn"
        :aria-expanded="avisosAbiertos"
        :aria-label="`Avisos${notificaciones.noLeidas ? `, ${notificaciones.noLeidas} sin leer` : ''}`"
        @click="alternarAvisos"
      >
        <Icon name="bell" :size="18" />
        <span v-if="notificaciones.noLeidas" class="dot"></span>
      </button>
      <div v-if="avisosAbiertos" class="avisos-panel">
        <header>
          <b>Avisos</b>
          <button v-if="notificaciones.items.length" class="link" @click="notificaciones.limpiar()">Limpiar</button>
        </header>
        <button
          v-for="aviso in notificaciones.items"
          :key="aviso.id"
          class="aviso"
          @click="abrirAviso(aviso)"
        >
          <span class="aviso-kind"><Icon :name="aviso.tipo === 'chat' ? 'message' : 'clipboard'" :size="14" /></span>
          <span class="aviso-copy"><b>{{ aviso.titulo }}</b><small>{{ aviso.texto }}</small></span>
          <time>{{ cuando(aviso.createdAt) }}</time>
        </button>
        <p v-if="!notificaciones.items.length" class="avisos-empty">
          Aquí aparecerán las tareas que te asignen y los cambios de estado que sigas.
        </p>
      </div>
    </div>
    <button class="icon-btn"><Icon name="help" :size="18" /></button>

    <div class="user-menu">
      <button class="user-chip" :aria-expanded="menuAbierto" @click="menuAbierto = !menuAbierto">
        <div class="avatar">
          <img v-if="auth.avatarUrl" :src="auth.avatarUrl" :alt="auth.user?.nombre" />
          <template v-else>{{ auth.initials }}</template>
        </div>
        <div class="who"><b>{{ auth.user?.nombre }}</b><br /><span>{{ auth.primaryRole }}</span></div>
        <Icon name="chevron" :size="14" class="user-chev" :class="{ open: menuAbierto }" />
      </button>

      <div v-if="menuAbierto" class="user-backdrop" @click="menuAbierto = false"></div>
      <div v-if="menuAbierto" class="user-dropdown">
        <div class="user-dropdown-label">Cuenta activa</div>
        <div class="account-summary">
          <div class="avatar sm">
            <img v-if="auth.avatarUrl" :src="auth.avatarUrl" :alt="auth.user?.nombre" />
            <template v-else>{{ auth.initials }}</template>
          </div>
          <div class="who">
            <b>{{ auth.user?.nombre }}</b><br />
            <span>{{ auth.user?.correo }}</span>
          </div>
        </div>
        <RouterLink to="/perfil" class="menu-action" @click="menuAbierto = false">
          <Icon name="user" :size="17" />
          Mi perfil
        </RouterLink>
        <RouterLink v-if="auth.can('security.panel.view')" to="/seguridad" class="menu-action" @click="menuAbierto = false">
          <Icon name="shield" :size="17" />
          Administrar seguridad
        </RouterLink>
        <button class="menu-action danger" @click="cerrarSesion">
          <Icon name="arrow" :size="17" />
          Cerrar sesiÃ³n
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.avisos-wrap { position: relative; }
.avisos-panel { position: absolute; top: calc(100% + 8px); right: 0; z-index: 46; width: min(360px, calc(100vw - 32px)); max-height: 420px; overflow: auto; padding: 6px; background: var(--panel, #fff); border: 1px solid var(--line); border-radius: 14px; box-shadow: 0 16px 40px rgba(15, 36, 56, .16); }
.avisos-panel > header { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px 10px; font-size: .8rem; }
.avisos-panel .link { color: var(--teal-600); font-size: .68rem; font-weight: 800; }
.aviso { display: grid; grid-template-columns: auto 1fr auto; align-items: start; gap: 9px; width: 100%; padding: 10px; border: 0; border-radius: 10px; background: transparent; text-align: left; cursor: pointer; }
.aviso:hover { background: var(--teal-50); }
.aviso-kind { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 9px; color: var(--teal-600); background: var(--teal-50); }
.aviso-copy b { display: block; font-size: .74rem; }
.aviso-copy small { display: block; margin-top: 2px; color: var(--muted); font-size: .67rem; line-height: 1.4; }
.aviso time { color: var(--muted); font-size: .62rem; white-space: nowrap; }
.avisos-empty { padding: 18px 12px; color: var(--muted); font-size: .7rem; line-height: 1.5; text-align: center; }
.search-wrap { position: relative; z-index: 45; }
.search-wrap.focused { border-color: var(--teal-400, #2dd4bf); box-shadow: 0 0 0 3px rgba(20, 184, 166, .12); }
.search-results { position: absolute; top: calc(100% + 8px); right: 0; width: min(390px, calc(100vw - 32px)); padding: 6px; background: var(--panel, #fff); border: 1px solid var(--line); border-radius: 14px; box-shadow: 0 16px 40px rgba(15, 36, 56, .16); }
.search-result { display: grid; grid-template-columns: 86px 1fr auto; align-items: center; gap: 10px; width: 100%; padding: 10px; border: 0; border-radius: 10px; color: var(--ink); background: transparent; text-align: left; cursor: pointer; }
.search-result:hover { background: var(--teal-50); }
.search-result b, .search-result small { display: block; }
.search-result b { font-family: Consolas, monospace; font-size: .82rem; }
.search-result small { margin-top: 2px; color: var(--muted); font-size: .74rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.search-kind { color: var(--teal-600); font-size: .7rem; font-weight: 800; }
.search-empty, .search-hint { margin: 6px 8px; color: var(--muted); font-size: .76rem; }
.search-hint { text-align: right; }
.user-menu {
  position: relative;
}
.user-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 12px;
  transition: background 0.15s ease;
}
.user-chip:hover {
  background: var(--line-soft);
}
.avatar {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
  overflow: hidden;
  font-weight: 800;
  font-size: 0.85rem;
  color: #fff;
  background: linear-gradient(135deg, #0f766e, #2f6fed);
}
.avatar.sm {
  width: 36px;
  height: 36px;
  font-size: 0.78rem;
}
.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.who {
  text-align: left;
  line-height: 1.25;
}
.who b {
  font-size: 0.86rem;
  color: var(--ink);
  font-weight: 700;
}
.who span {
  font-size: 0.74rem;
  color: var(--muted);
}
.user-chev {
  color: var(--muted);
  transition: transform 0.18s ease;
}
.user-chev.open {
  transform: rotate(90deg);
}

.user-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
}
.user-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 50;
  width: 290px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: 0 16px 40px rgba(15, 36, 56, 0.14);
  padding: 8px;
  animation: pop 0.15s ease;
}
.user-dropdown-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  padding: 6px 8px 8px;
}
.account-summary,
.menu-action {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px;
  border: none;
  border-radius: 11px;
  background: transparent;
  text-align: left;
  transition: background 0.14s ease;
}
.account-summary {
  margin-bottom: 6px;
  background: var(--line-soft);
}
.menu-action {
  color: var(--ink);
  text-decoration: none;
  cursor: pointer;
}
.menu-action:hover {
  background: var(--line-soft);
}
.menu-action.danger {
  color: #b42318;
}
@keyframes pop {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
