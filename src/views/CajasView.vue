<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import Icon from '../components/Icon.vue'
import SubcultivoModal from '../components/SubcultivoModal.vue'
import GaleriaFotos from '../components/GaleriaFotos.vue'
import { useLabStore } from '../stores/lab'
import { useAuthStore } from '../stores/auth'
import { organoNombre, medioColor, MEDIOS } from '../data/catalogs'
import type { CajaPetri } from '../data/types'

const lab = useLabStore()
const auth = useAuthStore()

// ---- Filtros + búsqueda ----
const busqueda = ref('')
const filtroMedio = ref('')
const filtroEstado = ref('')
const filtroOrgano = ref('')

const pezCod = (c: CajaPetri) => lab.pezDeCaja(c)?.codigo ?? ''

const organos = computed(() => {
  const m = new Map<string, string>()
  for (const c of lab.state.cajas) {
    const o = lab.organoDeCaja(c)
    if (o) m.set(o, organoNombre(o))
  }
  return [...m.entries()].map(([code, name]) => ({ code, name }))
})

const cajasFiltradas = computed(() =>
  lab.state.cajas.filter((c) => {
    if (filtroMedio.value && c.medio !== filtroMedio.value) return false
    if (filtroEstado.value) {
      if (filtroEstado.value === 'pendientes') {
        if (c.estado !== 'incubando' && c.estado !== 'descartado') return false
      } else if (c.estado !== filtroEstado.value) return false
    }
    if (filtroOrgano.value && lab.organoDeCaja(c) !== filtroOrgano.value) return false
    if (busqueda.value) {
      const q = busqueda.value.toLowerCase()
      const ok =
        c.codigo.toLowerCase().includes(q) ||
        organoNombre(lab.organoDeCaja(c)).toLowerCase().includes(q) ||
        pezCod(c).toLowerCase().includes(q)
      if (!ok) return false
    }
    return true
  }),
)

// Click en una tarjeta de estadística: filtra (o quita el filtro si ya estaba).
function filtrarEstado(val: string) {
  filtroEstado.value = filtroEstado.value === val ? '' : val
}

function limpiarFiltros() {
  busqueda.value = ''
  filtroMedio.value = ''
  filtroEstado.value = ''
  filtroOrgano.value = ''
}

// ---- Paginación ----
const page = ref(1)
const perPage = ref(10)
const totalPaginas = computed(() => Math.max(1, Math.ceil(cajasFiltradas.value.length / perPage.value)))
const desde = computed(() => (cajasFiltradas.value.length ? (page.value - 1) * perPage.value + 1 : 0))
const hasta = computed(() => Math.min(page.value * perPage.value, cajasFiltradas.value.length))
const cajasPagina = computed(() => cajasFiltradas.value.slice((page.value - 1) * perPage.value, page.value * perPage.value))
watch([busqueda, filtroMedio, filtroEstado, filtroOrgano, perPage], () => (page.value = 1))

const paginas = computed(() => {
  const t = totalPaginas.value
  const p = page.value
  const out: number[] = []
  for (const n of [1, p - 1, p, p + 1, t]) if (n >= 1 && n <= t && !out.includes(n)) out.push(n)
  return out.sort((a, b) => a - b)
})

// ---- Estado visual ----
const estadoMap: Record<string, { label: string; cls: string }> = {
  'con-crecimiento': { label: 'con crecimiento', cls: 'e-ok' },
  'sin-crecimiento': { label: 'sin crecimiento', cls: 'e-no' },
  incubando: { label: 'pendiente', cls: 'e-pend' },
  descartado: { label: 'descartado', cls: 'e-desc' },
}
const estadoDe = (c: CajaPetri) => estadoMap[c.estado] || { label: c.estado, cls: 'e-pend' }

function fechaCorta(iso?: string) {
  if (!iso) return '—'
  const p = iso.split('-')
  return p.length >= 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso
}

// ---- Estadísticas ----
const stats = computed(() => {
  const all = lab.state.cajas
  const total = all.length
  const con = all.filter((c) => c.estado === 'con-crecimiento').length
  const sin = all.filter((c) => c.estado === 'sin-crecimiento').length
  const pend = all.filter((c) => c.estado === 'incubando' || c.estado === 'descartado').length
  const pct = (n: number) => (total ? (Math.round((n / total) * 1000) / 10).toFixed(1) : '0')
  return { total, con, sin, pend, pctCon: pct(con), pctSin: pct(sin), pctPend: pct(pend) }
})

// ---- Selección + detalle ----
const seleccion = ref<CajaPetri | null>(null)
const editando = ref(false)
function seleccionar(c: CajaPetri) {
  seleccion.value = c
  editando.value = false
}

const obs = reactive({
  fecha: new Date().toISOString().slice(0, 10),
  hayCrecimiento: true,
  numeroMorfotipos: 1,
  morfologia: '',
  color: '',
  forma: 'circular',
  borde: 'entero',
  elevacion: 'convexa',
  observaciones: '',
})
const guardando = ref(false)
const okMsg = ref('')
const errMsg = ref('')

// ---- Subcultivos derivados de la caja seleccionada ----
const modalSubAbierto = ref(false)

const subcultivosDeCaja = computed(() =>
  seleccion.value ? lab.state.subcultivos.filter((s) => s.idCaja === seleccion.value!.id) : [],
)

// load() reemplaza los arrays completos: hay que volver a apuntar a la caja por su código,
// o el panel se queda mostrando un objeto huérfano (sin la foto o el subcultivo recién creado).
function reSincronizarSeleccion() {
  const cod = seleccion.value?.codigo
  if (cod) seleccion.value = lab.state.cajas.find((c) => c.codigo === cod) ?? seleccion.value
}

function onSubcultivosGuardados(n: number) {
  okMsg.value = `${n} subcultivo${n === 1 ? '' : 's'} registrado${n === 1 ? '' : 's'}.`
  reSincronizarSeleccion()
}

const borrando = ref(false)
async function borrarCaja() {
  if (!seleccion.value || borrando.value) return
  if (!confirm(`¿Borrar la caja ${seleccion.value.codigo}? No se puede deshacer.`)) return
  borrando.value = true
  errMsg.value = ''
  okMsg.value = ''
  try {
    await lab.eliminarCaja(seleccion.value.id)
    seleccion.value = null
  } catch (e) {
    errMsg.value = e instanceof Error ? e.message : String(e)
  } finally {
    borrando.value = false
  }
}

// ---- Trazabilidad editable (persona · fecha · hora) ----
const usuarios = ['Pamela Bardales G', 'Dra. Nydia Edith Reyes Rodríguez']
const editTraza = ref(false)
interface TEvento { usuario: string; fecha: string; hora: string }
const trazaStore = reactive<Record<string, { reg: TEvento; est: TEvento }>>({})
function trazaDe(c: CajaPetri) {
  if (!trazaStore[c.id]) {
    const f = c.fechaSiembra || new Date().toISOString().slice(0, 10)
    const t = c.trazabilidad || {}
    trazaStore[c.id] = {
      reg: { usuario: usuarios[0], fecha: f, hora: '09:00', ...(t.reg || {}) },
      est: { usuario: usuarios[0], fecha: f, hora: '09:00', ...(t.est || {}) },
    }
  }
  return trazaStore[c.id]
}
const traza = computed(() => (seleccion.value ? trazaStore[seleccion.value.id] : null))

async function guardarTraza() {
  if (!seleccion.value || !traza.value) return
  const cod = seleccion.value.codigo
  errMsg.value = ''
  try {
    await lab.actualizarCajaTrazabilidad(seleccion.value.id, traza.value)
    seleccion.value = lab.state.cajas.find((c) => c.codigo === cod) ?? null
    editTraza.value = false
    okMsg.value = 'Trazabilidad guardada.'
  } catch (e) {
    errMsg.value = e instanceof Error ? e.message : String(e)
  }
}

watch(seleccion, (c) => {
  okMsg.value = ''
  errMsg.value = ''
  editTraza.value = false
  obs.morfologia = c?.morfologia ?? ''
  obs.color = c?.colorColonia ?? ''
  obs.hayCrecimiento = c?.estado !== 'sin-crecimiento'
  if (c) trazaDe(c)
})

async function guardarObs() {
  if (!seleccion.value) return
  guardando.value = true
  okMsg.value = ''
  errMsg.value = ''
  try {
    await lab.registrarObservacion(seleccion.value.id, {
      fecha: obs.fecha,
      hayCrecimiento: obs.hayCrecimiento,
      numeroMorfotipos: obs.hayCrecimiento ? obs.numeroMorfotipos : 0,
      morfologia: obs.hayCrecimiento ? obs.morfologia : undefined,
      color: obs.hayCrecimiento ? obs.color : undefined,
      forma: obs.hayCrecimiento ? obs.forma : undefined,
      borde: obs.hayCrecimiento ? obs.borde : undefined,
      elevacion: obs.hayCrecimiento ? obs.elevacion : undefined,
      observaciones: obs.observaciones,
    })
    const cod = seleccion.value.codigo
    seleccion.value = lab.state.cajas.find((c) => c.codigo === cod) ?? null
    okMsg.value = 'Observación registrada.'
    editando.value = false
  } catch (e) {
    errMsg.value = e instanceof Error ? e.message : String(e)
  } finally {
    guardando.value = false
  }
}

</script>

<template>
  <div class="page-head">
    <div class="ph-left">
      <span class="ph-ic"><img src="/cajas/cajas-petri.png" alt="" /></span>
      <div>
        <h1>Cajas Petri</h1>
        <p class="sub">Gestiona tus cajas Petri y registra observaciones de colonias y fotografías.</p>
      </div>
    </div>
  </div>

  <!-- Estadísticas -->
  <div class="stats">
    <button type="button" class="stat" :class="{ active: filtroEstado === '' }" @click="filtroEstado = ''">
      <img class="stat-ic" src="/cajas/total-de-cajas.png" alt="" />
      <div class="s-tx"><div class="stat-num">{{ stats.total.toLocaleString() }}</div><div class="stat-label">Total de cajas</div></div>
    </button>
    <button type="button" class="stat" :class="{ active: filtroEstado === 'con-crecimiento' }" @click="filtrarEstado('con-crecimiento')">
      <img class="stat-ic" src="/cajas/con-crecimiento.png" alt="" />
      <div class="s-tx"><div class="stat-num">{{ stats.con.toLocaleString() }}</div><div class="stat-label">Con crecimiento</div></div>
      <span class="stat-pct p-green">{{ stats.pctCon }}%</span>
    </button>
    <button type="button" class="stat" :class="{ active: filtroEstado === 'sin-crecimiento' }" @click="filtrarEstado('sin-crecimiento')">
      <img class="stat-ic" src="/cajas/sin-crecimiento.png" alt="" />
      <div class="s-tx"><div class="stat-num">{{ stats.sin.toLocaleString() }}</div><div class="stat-label">Sin crecimiento</div></div>
      <span class="stat-pct p-orange">{{ stats.pctSin }}%</span>
    </button>
    <button type="button" class="stat" :class="{ active: filtroEstado === 'pendientes' }" @click="filtrarEstado('pendientes')">
      <img class="stat-ic" src="/cajas/pendientes.png" alt="" />
      <div class="s-tx"><div class="stat-num">{{ stats.pend.toLocaleString() }}</div><div class="stat-label">Pendientes</div></div>
      <span class="stat-pct p-blue">{{ stats.pctPend }}%</span>
    </button>
  </div>

  <!-- Filtros -->
  <div class="filtros">
    <div class="f-search">
      <Icon name="search" :size="16" />
      <input v-model="busqueda" placeholder="Buscar código, pez, órgano…" />
    </div>
    <select v-model="filtroMedio" class="f-sel">
      <option value="">Medio · Todos</option>
      <option v-for="m in MEDIOS" :key="m.nombre" :value="m.nombre">{{ m.nombre }}</option>
    </select>
    <select v-model="filtroEstado" class="f-sel">
      <option value="">Estado · Todos</option>
      <option value="con-crecimiento">Con crecimiento</option>
      <option value="sin-crecimiento">Sin crecimiento</option>
      <option value="pendientes">Pendientes</option>
    </select>
    <select v-model="filtroOrgano" class="f-sel">
      <option value="">Órgano · Todos</option>
      <option v-for="o in organos" :key="o.code" :value="o.code">{{ o.name }}</option>
    </select>
    <button class="f-clear" @click="limpiarFiltros"><Icon name="refresh" :size="15" /> Limpiar filtros</button>
  </div>

  <div class="split">
    <!-- Tabla -->
    <div class="card tabla-card">
      <table class="ctab">
        <thead>
          <tr><th>Código</th><th>Pez</th><th>Órgano</th><th>Medio</th><th>Estado</th><th>Registrado</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="c in cajasPagina" :key="c.id" :class="{ sel: seleccion?.id === c.id }" @click="seleccionar(c)">
            <td class="mono cod">{{ c.codigo }}</td>
            <td class="mono">{{ pezCod(c) }}</td>
            <td>{{ organoNombre(lab.organoDeCaja(c)) }}</td>
            <td><span class="medio" :style="{ background: medioColor(c.medio) + '22', color: medioColor(c.medio) }">{{ c.medio }}</span></td>
            <td><span class="est-txt" :class="estadoDe(c).cls"><span class="edot"></span>{{ estadoDe(c).label }}</span></td>
            <td class="fecha">{{ fechaCorta(c.fechaSiembra) }}</td>
            <td><Icon name="chevron" :size="15" class="rowgo" /></td>
          </tr>
          <tr v-if="!cajasPagina.length"><td colspan="7" class="vacio">No hay cajas con esos filtros.</td></tr>
        </tbody>
      </table>

      <div class="pager">
        <span class="pager-info">Mostrando {{ desde }} a {{ hasta }} de {{ cajasFiltradas.length.toLocaleString() }} cajas</span>
        <div class="pager-ctrl">
          <button class="pg" :disabled="page === 1" @click="page--">«</button>
          <template v-for="(n, i) in paginas" :key="n">
            <span v-if="i > 0 && n - paginas[i - 1] > 1" class="pg-gap">…</span>
            <button class="pg" :class="{ on: n === page }" @click="page = n">{{ n }}</button>
          </template>
          <button class="pg" :disabled="page === totalPaginas" @click="page++">»</button>
        </div>
        <select v-model.number="perPage" class="f-sel sm">
          <option :value="10">10 por página</option>
          <option :value="25">25 por página</option>
          <option :value="50">50 por página</option>
        </select>
      </div>
    </div>

    <!-- Detalle -->
    <div class="card detalle">
      <template v-if="seleccion">
        <div class="det-head">
          <span class="det-ava"><Icon name="dish" :size="22" /></span>
          <div class="det-id">
            <div class="det-cod">{{ seleccion.codigo }}</div>
            <div class="det-meta">Órgano: {{ organoNombre(lab.organoDeCaja(seleccion)) }} · Pez: {{ pezCod(seleccion) }} · Medio: {{ seleccion.medio }}</div>
          </div>
          <span class="est-txt" :class="estadoDe(seleccion).cls"><span class="edot"></span>{{ estadoDe(seleccion).label }}</span>
          <button v-if="auth.can('cajas.records.delete')" class="det-borrar" :disabled="borrando" title="Borrar caja" @click="borrarCaja">
            <Icon name="close" :size="15" />
          </button>
        </div>

        <div v-if="okMsg" class="aviso ok"><Icon name="check" :size="15" /> {{ okMsg }}</div>
        <div v-if="errMsg" class="aviso err"><Icon name="shield" :size="15" /> {{ errMsg }}</div>

        <!-- Subcultivos derivados de esta caja -->
        <div class="sec">
          <div class="sec-head">
            <span class="sec-ic i-teal"><Icon name="microscope" :size="15" /></span>
            <span>Subcultivos</span>
            <span v-if="subcultivosDeCaja.length" class="badge b-teal" style="margin-left: 6px">{{ subcultivosDeCaja.length }}</span>
            <button v-if="auth.can('subcultivos.records.create')" class="sec-btn" @click="modalSubAbierto = true">
              <Icon name="plus" :size="14" /> Registrar subcultivo
            </button>
          </div>
          <div class="sec-body">
            <ul v-if="subcultivosDeCaja.length" class="sub-lista">
              <li v-for="s in subcultivosDeCaja" :key="s.id">
                <span class="mono">{{ s.codigo }}</span>
                <span class="badge b-slate">Morfotipo {{ s.morfotipo }}</span>
                <span class="badge" :class="s.estado === 'puro' ? 'b-teal' : 'b-amber'">{{ s.estado }}</span>
                <span v-if="s.aptoExtraccion" class="sub-apto"><Icon name="check" :size="12" /> apto</span>
              </li>
            </ul>
            <p v-else class="sec-hint">
              Aún no hay subcultivos de esta caja. Regístralos cuando salga de la incubadora y veas colonias aisladas.
            </p>
          </div>
        </div>

        <!-- Estado -->
        <div class="sec">
          <div class="sec-head"><span class="sec-ic i-teal"><Icon name="check" :size="15" /></span><span>Estado</span>
            <button v-if="auth.can('cajas.records.update')" class="sec-btn" @click="editando = !editando"><Icon name="edit" :size="14" /> Cambiar estado</button>
          </div>
          <div class="sec-body estado-row">
            <span class="check-circle" :class="estadoDe(seleccion).cls"><Icon name="check" :size="14" /></span>
            <div>
              <div class="estado-nombre">{{ estadoDe(seleccion).label }}</div>
              <span class="sec-hint">Registrado el {{ fechaCorta(seleccion.fechaSiembra) }}</span>
            </div>
          </div>
        </div>

        <!-- Observación de colonia -->
        <div class="sec">
          <div class="sec-head"><span class="sec-ic i-purple"><Icon name="eye" :size="15" /></span><span>Observación de colonia</span>
            <button v-if="auth.can('cajas.records.update')" class="sec-btn" @click="editando = !editando"><Icon name="plus" :size="14" /> Agregar observación</button>
          </div>
          <div class="sec-body">
            <p v-if="!editando && seleccion.morfologia" class="obs-text">{{ seleccion.morfologia }}<template v-if="seleccion.colorColonia"> · {{ seleccion.colorColonia }}</template></p>
            <p v-else-if="!editando" class="obs-vacio">Sin observación registrada.</p>

            <div v-if="editando" class="obs-form">
              <div class="chips">
                <button class="chip" :class="{ on: obs.hayCrecimiento }" @click="obs.hayCrecimiento = true">Sí, creció</button>
                <button class="chip" :class="{ on: !obs.hayCrecimiento }" @click="obs.hayCrecimiento = false">Sin crecimiento</button>
              </div>
              <template v-if="obs.hayCrecimiento">
                <textarea rows="2" v-model="obs.morfologia" placeholder="Descripción de la colonia (morfología)"></textarea>
                <div class="grid2">
                  <input v-model="obs.color" placeholder="Color" />
                  <select v-model="obs.forma"><option>circular</option><option>irregular</option><option>filamentosa</option><option>puntiforme</option></select>
                  <select v-model="obs.borde"><option>entero</option><option>ondulado</option><option>lobulado</option><option>filamentoso</option></select>
                  <select v-model="obs.elevacion"><option>convexa</option><option>plana</option><option>elevada</option><option>umbonada</option></select>
                </div>
              </template>
              <textarea rows="2" v-model="obs.observaciones" placeholder="Observaciones libres"></textarea>
              <div class="obs-acc">
                <button class="btn-primary2" :disabled="guardando" @click="guardarObs"><Icon name="save" :size="15" /> {{ guardando ? 'Guardando…' : 'Guardar' }}</button>
                <button class="btn-ghost2" @click="editando = false">Cancelar</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Fotografía / evidencia -->
        <div class="sec">
          <div class="sec-body">
            <GaleriaFotos
              :codigo="seleccion.codigo"
              rol="foto-placa"
              titulo="Fotografía / evidencia"
              vacio-texto="Agrega una o varias fotos de la caja Petri para documentar el crecimiento."
              @cambio="reSincronizarSeleccion"
            />
          </div>
        </div>

        <!-- Trazabilidad -->
        <div class="sec">
          <div class="sec-head"><span class="sec-ic i-teal"><Icon name="activity" :size="15" /></span><span>Trazabilidad</span>
            <button v-if="auth.can('cajas.records.update')" class="sec-btn" @click="editTraza ? guardarTraza() : (editTraza = true)"><Icon :name="editTraza ? 'check' : 'edit'" :size="14" /> {{ editTraza ? 'Guardar' : 'Editar' }}</button>
          </div>
          <div v-if="traza" class="sec-body traza" :class="{ editing: editTraza }">
            <!-- Registrada -->
            <div class="traza-step">
              <span class="traza-ic i-teal"><Icon name="user" :size="15" /></span>
              <div v-if="!editTraza" class="traza-info"><b>Registrada</b><span>{{ fechaCorta(traza.reg.fecha) }} · {{ traza.reg.hora }} · {{ traza.reg.usuario }}</span></div>
              <div v-else class="traza-form">
                <b>Registrada</b>
                <select v-model="traza.reg.usuario"><option v-for="u in usuarios" :key="u" :value="u">{{ u }}</option></select>
                <div class="traza-dt"><input type="date" v-model="traza.reg.fecha" /><input type="time" v-model="traza.reg.hora" /></div>
              </div>
            </div>

            <Icon name="chevron" :size="14" class="traza-arrow" />

            <!-- Estado -->
            <div class="traza-step">
              <span class="traza-ic i-green"><Icon name="check" :size="15" /></span>
              <div v-if="!editTraza" class="traza-info"><b>Estado: {{ estadoDe(seleccion).label }}</b><span>{{ fechaCorta(traza.est.fecha) }} · {{ traza.est.hora }} · {{ traza.est.usuario }}</span></div>
              <div v-else class="traza-form">
                <b>Estado: {{ estadoDe(seleccion).label }}</b>
                <select v-model="traza.est.usuario"><option v-for="u in usuarios" :key="u" :value="u">{{ u }}</option></select>
                <div class="traza-dt"><input type="date" v-model="traza.est.fecha" /><input type="time" v-model="traza.est.hora" /></div>
              </div>
            </div>

            <template v-if="seleccion.morfologia && !editTraza">
              <Icon name="chevron" :size="14" class="traza-arrow" />
              <div class="traza-step">
                <span class="traza-ic i-purple"><Icon name="eye" :size="15" /></span>
                <div class="traza-info"><b>Observación agregada</b><span>{{ fechaCorta(traza.est.fecha) }} · {{ traza.est.usuario }}</span></div>
              </div>
            </template>
          </div>
        </div>
      </template>

      <div v-else class="det-vacio">
        <img src="/cajas/cajita.png" alt="" />
        <p>Selecciona una caja</p>
        <span>Elige una caja de la lista para ver su detalle, estado y trazabilidad.</span>
      </div>
    </div>
  </div>

  <SubcultivoModal
    :abierto="modalSubAbierto"
    :caja="seleccion"
    @cerrar="modalSubAbierto = false"
    @guardado="onSubcultivosGuardados"
  />
</template>

<style scoped>
.page-head .ph-left {
  display: flex;
  align-items: center;
  gap: 14px;
}
.ph-ic {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 15px;
  flex-shrink: 0;
  background: var(--teal-50);
  overflow: hidden;
}
.ph-ic img {
  width: 40px;
  height: 40px;
  object-fit: contain;
}

/* ---- Estadísticas ---- */
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
  margin: 16px 0;
}
.stat {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 16px 18px;
  cursor: pointer;
  text-align: left;
  width: 100%;
  font: inherit;
  transition: transform 0.14s ease, box-shadow 0.14s ease, border-color 0.14s ease;
}
.stat:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 22px rgba(15, 36, 56, 0.07);
}
.stat.active {
  border-color: var(--teal-600);
  box-shadow: 0 0 0 1px var(--teal-600);
}
.stat-ic {
  width: 64px;
  height: 64px;
  object-fit: contain;
  flex-shrink: 0;
}
.s-tx { flex: 1; min-width: 0; }
.stat-num {
  font-size: 1.55rem;
  font-weight: 800;
  line-height: 1;
  color: var(--ink);
  font-family: "Sora", sans-serif;
}
.stat-label {
  font-size: 0.82rem;
  color: var(--muted);
  margin-top: 4px;
}
.stat-pct {
  font-size: 0.74rem;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
}
.p-green { background: #e6f6ec; color: #1f9d57; }
.p-orange { background: #fdece3; color: #d2682f; }
.p-blue { background: #e6f0fb; color: #3074bf; }

/* ---- Filtros ---- */
.filtros {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.f-search {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 200px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 11px;
  padding: 0 12px;
  color: var(--muted);
}
.f-search input {
  border: none;
  outline: none;
  background: transparent;
  padding: 9px 0;
  width: 100%;
  font-size: 0.86rem;
  color: var(--ink);
}
.f-sel {
  border: 1px solid var(--line);
  border-radius: 11px;
  padding: 8px 12px;
  background: #fff;
  font-size: 0.84rem;
  color: var(--ink);
  cursor: pointer;
}
.f-sel.sm {
  padding: 6px 10px;
  font-size: 0.8rem;
}
.f-clear {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: transparent;
  color: var(--teal-600);
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
}

/* ---- Split maestro-detalle ---- */
.split {
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  gap: 16px;
  align-items: start;
}
@media (max-width: 1080px) {
  .split { grid-template-columns: 1fr; }
}

/* ---- Tabla ---- */
.tabla-card {
  padding: 0;
  overflow: hidden;
}
.ctab {
  width: 100%;
  border-collapse: collapse;
}
.ctab thead th {
  text-align: left;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--muted);
  padding: 12px 14px;
  border-bottom: 1px solid var(--line);
}
.ctab tbody td {
  padding: 11px 14px;
  border-bottom: 1px solid var(--line-soft);
  font-size: 0.84rem;
  color: var(--ink-soft);
}
.ctab tbody tr {
  cursor: pointer;
  transition: background 0.12s ease;
}
.ctab tbody tr:hover {
  background: var(--teal-50);
}
.ctab tbody tr.sel {
  background: var(--teal-50);
  box-shadow: inset 3px 0 0 var(--teal-600);
}
.cod {
  font-weight: 700;
  color: var(--ink);
}
.medio {
  font-size: 0.74rem;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 7px;
}
/* Estado como punto + texto (sin pastilla) */
.est-txt {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
  background: transparent;
}
.est-txt .edot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.est-txt.e-ok { color: #1f9d57; }
.est-txt.e-no { color: #6b7d92; }
.est-txt.e-pend { color: #c98a1e; }
.est-txt.e-desc { color: #d2682f; }

/* Círculo de check (cuerpo de Estado) */
.check-circle {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  flex-shrink: 0;
}
.check-circle.e-ok { background: #e6f6ec; color: #1f9d57; }
.check-circle.e-no { background: #eef1f5; color: #6b7d92; }
.check-circle.e-pend { background: #fdf0db; color: #c98a1e; }
.check-circle.e-desc { background: #fdece3; color: #d2682f; }
.estado-nombre {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--ink);
}
.fecha {
  font-size: 0.78rem;
  color: var(--muted);
}
.rowgo {
  color: var(--muted);
}
.vacio {
  text-align: center;
  color: var(--muted);
  padding: 30px;
}

/* ---- Paginación ---- */
.pager {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 12px 14px;
}
.pager-info {
  font-size: 0.78rem;
  color: var(--muted);
}
.pager-ctrl {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}
.pg {
  min-width: 30px;
  height: 30px;
  border: 1px solid var(--line);
  background: #fff;
  border-radius: 8px;
  font-size: 0.8rem;
  color: var(--ink-soft);
  cursor: pointer;
}
.pg.on {
  background: var(--teal-600);
  border-color: var(--teal-600);
  color: #fff;
  font-weight: 700;
}
.pg:disabled {
  opacity: 0.4;
  cursor: default;
}
.pg-gap {
  color: var(--muted);
  padding: 0 2px;
}

/* ---- Detalle ---- */
.detalle {
  padding: 16px;
}
.det-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--line-soft);
}
.det-borrar {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  border: 1px solid var(--line);
  background: #fff;
  color: var(--muted);
  cursor: pointer;
  flex: none;
}
.det-borrar:hover:not(:disabled) { border-color: var(--coral); color: var(--coral); }
.det-borrar:disabled { opacity: 0.5; cursor: default; }
.det-ava {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--teal-50);
  color: var(--teal-600);
}
.det-id {
  flex: 1;
  min-width: 0;
}
.det-cod {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--ink);
  font-family: "Sora", sans-serif;
}
.det-meta {
  font-size: 0.78rem;
  color: var(--muted);
}

.aviso {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.82rem;
  padding: 8px 12px;
  border-radius: 10px;
  margin-top: 12px;
}
.aviso.ok { background: #e6f6ec; color: #1f9d57; }
.aviso.err { background: #fdece3; color: #d2682f; }

.sec {
  margin-top: 16px;
}
.sec-head {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 8px;
}
.sec-ic {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 9px;
  flex-shrink: 0;
}
.i-teal { background: var(--teal-50); color: var(--teal-600); }
.i-purple { background: #efe9fb; color: #6f56c4; }
.i-blue { background: #e6f0fb; color: #3074bf; }
.i-green { background: #e6f6ec; color: #1f9d57; }
.sec-head > span {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--ink);
}
.sec-btn {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid var(--line);
  background: #fff;
  border-radius: 9px;
  padding: 5px 11px;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--teal-600);
  cursor: pointer;
}
.sec-btn:hover {
  background: var(--teal-50);
}
.sec-body {
  background: var(--bg, #f6f9fb);
  border-radius: 12px;
  padding: 12px 14px;
}
.estado-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.sec-hint {
  font-size: 0.76rem;
  color: var(--muted);
}
.sub-lista {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sub-lista li {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--bg);
  font-size: 0.8rem;
}
.sub-apto {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--teal-600);
  font-weight: 700;
  font-size: 0.74rem;
}
.obs-text {
  font-size: 0.85rem;
  color: var(--ink-soft);
  line-height: 1.5;
  margin: 0;
}
.obs-vacio {
  font-size: 0.82rem;
  color: var(--muted);
  margin: 0;
}
.obs-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.obs-form textarea,
.obs-form input,
.obs-form select {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 9px;
  padding: 8px 10px;
  font-size: 0.84rem;
  background: #fff;
  font-family: inherit;
}
.grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.chips {
  display: flex;
  gap: 8px;
}
.chip {
  border: 1px solid var(--line);
  background: #fff;
  border-radius: 9px;
  padding: 7px 13px;
  font-size: 0.82rem;
  cursor: pointer;
  color: var(--ink-soft);
}
.chip.on {
  background: var(--teal-600);
  border-color: var(--teal-600);
  color: #fff;
  font-weight: 700;
}
.obs-acc {
  display: flex;
  gap: 8px;
}
.btn-primary2 {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--teal-600);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 8px 15px;
  font-size: 0.84rem;
  font-weight: 700;
  cursor: pointer;
}
.btn-ghost2 {
  border: 1px solid var(--line);
  background: #fff;
  border-radius: 10px;
  padding: 8px 15px;
  font-size: 0.84rem;
  cursor: pointer;
  color: var(--ink-soft);
}

/* Foto vacía */
.foto-vacio {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 4px;
  padding: 8px;
}
.foto-vacio img {
  width: 96px;
  height: 96px;
  object-fit: contain;
  opacity: 0.95;
}
.foto-vacio p {
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--ink-soft);
  margin: 4px 0 0;
}
.foto-vacio span {
  font-size: 0.76rem;
  color: var(--muted);
  max-width: 280px;
}

/* Trazabilidad */
.traza {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.traza-step {
  display: flex;
  align-items: center;
  gap: 8px;
}
.traza-ic {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  flex-shrink: 0;
}
.traza-step b {
  display: block;
  font-size: 0.8rem;
  color: var(--ink);
}
.traza-step span {
  font-size: 0.72rem;
  color: var(--muted);
}
.traza-arrow {
  color: var(--muted);
  flex-shrink: 0;
}
.traza.editing {
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
}
.traza.editing .traza-arrow {
  display: none;
}
.traza.editing .traza-step {
  align-items: flex-start;
}
.traza-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 0;
}
.traza-form b {
  font-size: 0.8rem;
  color: var(--ink);
}
.traza-form select,
.traza-form input {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 6px 9px;
  font-size: 0.82rem;
  background: #fff;
  font-family: inherit;
  width: 100%;
}
.traza-dt {
  display: flex;
  gap: 6px;
}
.traza-dt input {
  flex: 1;
}

.det-vacio {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  padding: 50px 20px;
}
.det-vacio img {
  width: 80px;
  height: 80px;
  object-fit: contain;
}
.det-vacio p {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--ink-soft);
  margin: 6px 0 0;
}
.det-vacio span {
  font-size: 0.8rem;
  color: var(--muted);
  max-width: 260px;
}
</style>
