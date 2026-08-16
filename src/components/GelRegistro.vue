<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import Icon from './Icon.vue'
import { useLabStore } from '../stores/lab'
import { api } from '../api'
import { useAuthStore } from '../stores/auth'

/* ------------------------------------------------------------------ *
 * Registro de un gel de electroforesis, pozo por pozo.
 *  - Eliges una corrida de PCR y el sistema autogenera los pozos en orden:
 *    1º Blanco / control −, 2º Control positivo, 3º+ las muestras.
 *  - El marcador queda como dato del gel (no como pozo).
 *  - Marcas el resultado de cada pozo (pendiente / positivo / negativo /
 *    no claro / sin revisar) y subes la foto del fotodocumentador.
 *  - Al guardar, un pozo de muestra positivo/negativo actualiza el
 *    resultado de esa muestra en toda la cadena.
 * ------------------------------------------------------------------ */

const lab = useLabStore()
const auth = useAuthStore()

type EstadoPozo = 'pendiente' | 'positivo' | 'negativo' | 'no_claro' | 'no_revisado'
type TipoPozo = 'blanco' | 'positivo' | 'muestra' | 'marcador'

interface Carril {
  numero: number
  tipo: TipoPozo
  idPcr: string | null
  idControlPositivo: string | null
  codigoVisible: string
  estado: EstadoPozo
  tamanoPb: number | null
  notas: string
}

const ESTADOS: { v: EstadoPozo; label: string }[] = [
  { v: 'pendiente', label: 'Pendiente' },
  { v: 'positivo', label: 'Positivo' },
  { v: 'negativo', label: 'Negativo' },
  { v: 'no_claro', label: 'No claro' },
  { v: 'no_revisado', label: 'Sin revisar' },
]

const NOTA_CARGA_DEFAULT =
  'Carga sugerida registrada por el usuario: 2 µL de buffer green y 5 µL del tubo con mix y ADN.'

const params = reactive({
  fecha: new Date().toISOString().slice(0, 10),
  agarosaPct: 1.2,
  voltaje: 90,
  marcador: '1 Kb Plus',
  observaciones: NOTA_CARGA_DEFAULT,
})

const carriles = ref<Carril[]>([])
const corridaSel = ref<string>('')
const controlPositivoId = ref<string>('')
const cargandoPozos = ref(false)

const corridasDisponibles = computed(() => lab.state.corridas)
const positivosDisponibles = computed(() => lab.state.positivos.filter((p) => p.estado === 'disponible'))

function renumerar() {
  carriles.value.forEach((c, i) => (c.numero = i + 1))
}

// Trae la plantilla de pozos del backend (orden: blanco, positivo, muestras).
async function cargarDesdeCorrida() {
  if (!corridaSel.value) return
  cargandoPozos.value = true
  error.value = null
  try {
    const data = await api.get<{
      notaSugerida: string
      pozos: {
        numero: number
        tipo: TipoPozo
        idPcr: string | null
        idControlPositivo: string | null
        codigoVisible: string
        estado: EstadoPozo
        tamanoPb: number | null
      }[]
    }>(`/api/pcr/corridas/${corridaSel.value}/pozos`)
    carriles.value = data.pozos.map((p) => ({
      numero: p.numero,
      tipo: p.tipo,
      idPcr: p.idPcr,
      idControlPositivo: p.idControlPositivo,
      codigoVisible: p.codigoVisible,
      estado: p.estado,
      tamanoPb: p.tamanoPb,
      notas: '',
    }))
    // Sincroniza el selector de control positivo con el pozo generado.
    const posWell = carriles.value.find((c) => c.tipo === 'positivo')
    controlPositivoId.value = posWell?.idControlPositivo ?? ''
    if (!params.observaciones?.trim()) params.observaciones = data.notaSugerida
    renumerar()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    cargandoPozos.value = false
  }
}

// Cambia el control positivo (de la caja) aplicado al pozo de control +.
function aplicarControlPositivo() {
  const pos = carriles.value.find((c) => c.tipo === 'positivo')
  if (!pos) return
  const cp = lab.state.positivos.find((p) => p.id === controlPositivoId.value)
  pos.idControlPositivo = controlPositivoId.value || null
  pos.codigoVisible = cp ? cp.etiqueta : 'Control +'
}

function agregarPozo(tipo: TipoPozo = 'muestra') {
  carriles.value.push({
    numero: 0,
    tipo,
    idPcr: null,
    idControlPositivo: null,
    codigoVisible: '',
    estado: 'pendiente',
    tamanoPb: null,
    notas: '',
  })
  renumerar()
}
function quitarPozo(i: number) {
  carriles.value.splice(i, 1)
  renumerar()
}
function onEstadoChange(c: Carril) {
  if (c.estado === 'positivo' && c.tamanoPb == null) c.tamanoPb = 1500
  if (c.estado !== 'positivo') c.tamanoPb = c.estado === 'no_claro' ? c.tamanoPb : null
}

// ---- Guardado ----
const guardando = ref(false)
const error = ref<string | null>(null)
const gelGuardado = ref<{ id: string; codigo: string } | null>(null)
const subiendo = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const nMuestras = computed(() => carriles.value.filter((c) => c.tipo === 'muestra').length)
const nPositivos = computed(() => carriles.value.filter((c) => c.estado === 'positivo').length)
const nPendientes = computed(() => carriles.value.filter((c) => c.estado === 'pendiente' || c.estado === 'no_revisado').length)

// Validación: necesita al menos un pozo; las muestras deberían tener etiqueta.
const validacion = computed(() => {
  if (!carriles.value.length) return 'Carga una corrida o agrega pozos.'
  const sinEtiqueta = carriles.value.some((c) => c.tipo === 'muestra' && !c.codigoVisible.trim())
  if (sinEtiqueta) return 'Hay muestras sin etiqueta.'
  return null
})

async function guardar() {
  if (validacion.value) {
    error.value = validacion.value
    return
  }
  guardando.value = true
  error.value = null
  try {
    const res = await lab.crearGel({
      fecha: params.fecha,
      agarosaPct: params.agarosaPct,
      voltaje: params.voltaje,
      marcador: params.marcador,
      observaciones: params.observaciones || undefined,
      idCorridaPcr: corridaSel.value || undefined,
      carriles: carriles.value.map((c) => ({
        numero: c.numero,
        tipo: c.tipo,
        idPcr: c.idPcr,
        idControlPositivo: c.idControlPositivo,
        codigoVisible: c.codigoVisible || `Pozo ${c.numero}`,
        estado: c.estado,
        tamanoPb: c.estado === 'positivo' ? c.tamanoPb : null,
        observaciones: c.notas || undefined,
      })),
    })
    gelGuardado.value = res
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    guardando.value = false
  }
}

async function subirFoto(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !gelGuardado.value) return
  subiendo.value = true
  error.value = null
  try {
    await lab.subirImagen(file, gelGuardado.value.codigo, 'gel', true)
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    subiendo.value = false
  }
}

function nuevoGel() {
  gelGuardado.value = null
  corridaSel.value = ''
  controlPositivoId.value = ''
  carriles.value = []
  params.observaciones = NOTA_CARGA_DEFAULT
}

const fotoUrl = computed(() => {
  if (!gelGuardado.value) return null
  const g = lab.state.geles.find((x) => x.codigo === gelGuardado.value!.codigo)
  return g?.imagenUrl ? api.mediaUrl(g.imagenUrl) : null
})

const tipoLabel: Record<TipoPozo, string> = {
  blanco: 'Blanco −',
  positivo: 'Control +',
  muestra: 'Muestra',
  marcador: 'Marcador',
}
</script>

<template>
  <section class="gel-intro">
    <div>
      <span class="gel-step-label"><Icon name="wave" :size="15" /> Registro guiado del gel</span>
      <h2>Arma la cámara, revisa carriles y guarda evidencia</h2>
      <p>
        El sistema arma los pozos desde una corrida: primero blanco, después control positivo y luego las muestras.
        El marcador queda como dato del gel y la foto del fotodocumentador se sube al finalizar.
      </p>
    </div>
    <div class="gel-mini-kpis">
      <span><b>{{ carriles.length }}</b> pozos</span>
      <span><b>{{ nPositivos }}</b> positivos</span>
      <span><b>{{ nPendientes }}</b> pendientes</span>
    </div>
  </section>

  <!-- Estado: gel ya guardado -> subir foto -->
  <div v-if="gelGuardado" class="card saved-card">
    <div class="card-head">
      <div class="ic"><Icon name="check" :size="16" /></div>
      <h3>Gel {{ gelGuardado.codigo }} guardado</h3>
      <button class="btn btn-sm" style="margin-left: auto" @click="nuevoGel"><Icon name="plus" :size="14" /> Registrar otro</button>
    </div>
    <div class="card-pad" style="display: grid; gap: 14px">
      <div class="info-banner teal" style="margin: 0">
        <Icon name="check" :size="16" />
        <span>{{ nPositivos }} pozo(s) positivos quedaron reflejados en sus muestras.</span>
      </div>

      <div class="upload-zone">
        <img v-if="fotoUrl" :src="fotoUrl" alt="Foto del gel" class="gel-foto" />
        <template v-else>
          <Icon name="upload" :size="26" />
          <p>Sube la foto del transiluminador / fotodocumentador</p>
        </template>
        <button v-if="auth.can('media.files.create')" class="btn btn-primary" :disabled="subiendo" @click="fileInput?.click()">
          <Icon name="upload" :size="15" /> {{ subiendo ? 'Subiendo…' : fotoUrl ? 'Cambiar foto' : 'Subir foto del gel' }}
        </button>
        <input ref="fileInput" type="file" accept="image/*" style="display: none" @change="subirFoto" />
      </div>
      <div v-if="error" class="info-banner amber" style="margin: 0">{{ error }}</div>
    </div>
  </div>

  <!-- Estado: armando el gel -->
  <div v-else class="gel-layout">
    <!-- Parámetros + cargar desde corrida -->
    <div class="gel-left-column">
      <div class="card gel-card-soft">
        <div class="section-head"><span>1</span><div><b>Elige la corrida</b><small>usa una PCR guardada para generar pozos</small></div></div>
        <div class="card-pad soft-pad">
          <div class="field">
            <label>Corrida de PCR</label>
            <div class="load-row">
              <select v-model="corridaSel">
                <option value="">— Elige una corrida —</option>
                <option v-for="c in corridasDisponibles" :key="c.id" :value="c.id">
                  {{ c.codigo }} · {{ c.lotes || 'sin lote' }} · {{ c.nMuestras }} muestras
                </option>
              </select>
              <button class="btn btn-primary" :disabled="!corridaSel || cargandoPozos" @click="cargarDesdeCorrida">
                {{ cargandoPozos ? '…' : 'Armar pozos' }}
              </button>
            </div>
            <span class="hint">Genera el blanco, el control positivo y todas las muestras en orden. También puedes agregar pozos a mano.</span>
          </div>

          <div v-if="carriles.length" class="field">
            <label>Control positivo (de la caja)</label>
            <select v-model="controlPositivoId" @change="aplicarControlPositivo">
              <option value="">— Sin asignar (genérico) —</option>
              <option v-for="cp in positivosDisponibles" :key="cp.id" :value="cp.id">
                {{ cp.etiqueta }}{{ cp.organismo ? ' · ' + cp.organismo : '' }}
              </option>
            </select>
            <span class="hint">Se usa para el pozo de control +.</span>
          </div>
        </div>
      </div>

      <div class="card gel-card-soft">
        <div class="section-head"><span>2</span><div><b>Datos del gel</b><small>condiciones de corrida y observaciones</small></div></div>
        <div class="card-pad gel-params">
          <div class="field"><label>Fecha</label><input type="date" v-model="params.fecha" /></div>
          <div class="field"><label>Agarosa (%)</label><input type="number" step="0.1" min="0.5" v-model.number="params.agarosaPct" /></div>
          <div class="field"><label>Voltaje (V)</label><input type="number" step="5" min="10" v-model.number="params.voltaje" /></div>
          <div class="field"><label>Marcador</label><input v-model="params.marcador" /></div>
          <div class="field full"><label>Notas del gel</label><textarea v-model="params.observaciones" rows="2" class="notes-area"></textarea></div>
        </div>
      </div>
    </div>

    <!-- Editor de pozos -->
    <div class="card gel-editor-card">
      <div class="section-head editor-head">
        <span>3</span>
        <div><b>Pozos y lectura</b><small>marca resultado, banda y notas por carril</small></div>
        <span class="badge b-teal">{{ nPositivos }} positivos</span>
      </div>
      <div class="card-pad editor-pad">
        <div class="chamber-preview" :class="{ empty: !carriles.length }">
          <div class="chamber-copy">
            <b>Cámara de carga</b>
            <span>{{ carriles.length ? 'Vista rápida de carriles cargados' : 'Aún no hay pozos cargados' }}</span>
          </div>
          <div class="chamber-gel">
            <span v-for="c in carriles" :key="c.numero" class="chamber-lane" :class="[c.tipo, c.estado]" :title="`${c.numero}. ${c.codigoVisible || 'Sin etiqueta'}`">
              <i v-if="c.estado === 'positivo'"></i>
            </span>
            <span v-if="!carriles.length" class="chamber-placeholder">Carga una corrida</span>
          </div>
        </div>
        <div v-if="!carriles.length" class="empty" style="padding: 26px">
          Elige una corrida y pulsa <b>Armar pozos</b>, o agrega pozos a mano.
        </div>

        <div v-for="(c, i) in carriles" :key="i" class="lane" :class="c.tipo">
          <div class="lane-main">
            <span class="lane-n">{{ c.numero }}</span>
            <select v-model="c.tipo" class="lane-tipo">
              <option value="blanco">Blanco −</option>
              <option value="positivo">Control +</option>
              <option value="muestra">Muestra</option>
              <option value="marcador">Marcador</option>
            </select>
            <input v-model="c.codigoVisible" class="lane-cod" placeholder="Etiqueta" />
            <select v-model="c.estado" class="lane-estado" :class="'st-' + c.estado" @change="onEstadoChange(c)">
              <option v-for="e in ESTADOS" :key="e.v" :value="e.v">{{ e.label }}</option>
            </select>
            <input v-if="c.estado === 'positivo'" type="number" class="lane-pb" v-model.number="c.tamanoPb" placeholder="pb" />
            <span v-else class="lane-pb-empty">—</span>
            <button class="x" @click="quitarPozo(i)" aria-label="quitar">×</button>
          </div>
          <input v-model="c.notas" class="lane-notas" placeholder="Notas del pozo (opcional)" />
        </div>

        <div class="add-row">
          <button class="btn btn-sm" @click="agregarPozo('muestra')"><Icon name="plus" :size="14" /> Pozo</button>
        </div>

        <div class="save-foot">
          <button v-if="auth.can('electroforesis.gels.create')" class="btn btn-primary" :disabled="!!validacion || guardando" @click="guardar">
            <Icon name="save" :size="15" /> {{ guardando ? 'Guardando…' : 'Guardar gel' }}
          </button>
          <span v-if="validacion" class="hint">{{ validacion }}</span>
          <span v-else-if="error" class="err">{{ error }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gel-intro {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 18px;
  margin-bottom: 18px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: linear-gradient(135deg, var(--panel), color-mix(in srgb, var(--teal-50) 70%, #fff));
  box-shadow: var(--shadow-sm);
}
.gel-step-label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 11px;
  border-radius: 999px;
  background: #fff;
  color: var(--teal-600);
  font-size: .76rem;
  font-weight: 900;
}
.gel-intro h2 {
  margin-top: 12px;
  font-size: 1.35rem;
}
.gel-intro p {
  margin-top: 7px;
  color: var(--ink-soft);
  line-height: 1.45;
}
.gel-mini-kpis {
  display: grid;
  grid-template-columns: repeat(3, 92px);
  gap: 8px;
}
.gel-mini-kpis span {
  display: grid;
  gap: 2px;
  justify-items: center;
  padding: 10px 8px;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: rgba(255,255,255,.82);
  color: var(--muted);
  font-size: .72rem;
  font-weight: 800;
}
.gel-mini-kpis b {
  color: var(--teal-600);
  font-size: 1.25rem;
  line-height: 1;
}
.gel-layout {
  display: grid;
  grid-template-columns: minmax(320px, .82fr) minmax(420px, 1.18fr);
  gap: 18px;
  align-items: start;
}
@media (max-width: 1080px) {
  .gel-layout {
    grid-template-columns: 1fr;
  }
}
.gel-left-column {
  display: grid;
  gap: 18px;
  align-content: start;
}
.gel-card-soft,
.gel-editor-card {
  border-color: color-mix(in srgb, var(--line) 78%, var(--teal-100));
}
.section-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 18px 0;
}
.section-head > span:first-child {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 11px;
  background: var(--teal-50);
  color: var(--teal-600);
  font-weight: 900;
}
.section-head b {
  display: block;
  color: var(--ink);
}
.section-head small {
  display: block;
  color: var(--muted);
  font-size: .74rem;
  margin-top: 1px;
}
.editor-head .badge {
  margin-left: auto;
}
.soft-pad,
.editor-pad {
  display: grid;
  gap: 12px;
}
.gel-params {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.gel-params .full {
  grid-column: 1 / -1;
}
.notes-area {
  resize: vertical;
  font-family: inherit;
}
.load-row {
  display: flex;
  gap: 8px;
}
.load-row select {
  flex: 1;
}
.chamber-preview {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 14px;
  align-items: center;
  padding: 14px;
  border-radius: 18px;
  border: 1px solid #d9edf4;
  background: linear-gradient(135deg, #f4fbfd, #fff);
}
.chamber-copy b {
  display: block;
  color: var(--ink);
}
.chamber-copy span {
  display: block;
  margin-top: 4px;
  color: var(--muted);
  font-size: .78rem;
  line-height: 1.35;
}
.chamber-gel {
  min-height: 78px;
  display: flex;
  align-items: stretch;
  gap: 6px;
  padding: 12px;
  border-radius: 15px;
  background:
    radial-gradient(circle at 50% 30%, rgba(126,255,227,.2), transparent 35%),
    #152134;
  box-shadow: inset 0 0 0 1px rgba(126,255,227,.18);
  overflow-x: auto;
}
.chamber-lane {
  position: relative;
  display: block;
  flex: 0 0 18px;
  border-radius: 7px;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.08);
}
.chamber-lane.marcador {
  background: rgba(139,167,255,.22);
}
.chamber-lane.blanco {
  background: rgba(255,255,255,.12);
}
.chamber-lane.positivo {
  background: rgba(255,203,117,.22);
}
.chamber-lane.positivo i,
.chamber-lane.positivo::after {
  background: #7effe3;
}
.chamber-lane i,
.chamber-lane.positivo::after {
  content: "";
  position: absolute;
  left: 3px;
  right: 3px;
  height: 5px;
  border-radius: 999px;
  background: #7effe3;
  top: 42%;
  box-shadow: 0 0 10px rgba(126,255,227,.92);
  animation: band-pulse 1.8s ease-in-out infinite;
}
.chamber-lane.no_claro i {
  background: #ffd27d;
  box-shadow: 0 0 10px rgba(255,210,125,.85);
}
.chamber-placeholder {
  margin: auto;
  color: rgba(255,255,255,.56);
  font-size: .8rem;
  font-weight: 800;
}

.lane {
  display: grid;
  gap: 6px;
  padding: 10px;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: #fff;
  box-shadow: 0 8px 18px rgba(15,36,56,.04);
}
.lane.blanco {
  background: var(--line-soft);
}
.lane.positivo {
  background: var(--amber-50);
  border-color: var(--amber-100, #ffe2b0);
}
.lane.marcador {
  background: var(--blue-50);
}
.lane-main {
  display: grid;
  grid-template-columns: 26px 104px 1fr 118px auto 22px;
  gap: 8px;
  align-items: center;
}
.lane-n {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 7px;
  background: #fff;
  border: 1px solid var(--line);
  font-weight: 800;
  font-size: 0.78rem;
  color: var(--muted);
}
.lane-tipo,
.lane-cod,
.lane-pb,
.lane-estado {
  padding: 6px 8px;
  border: 1px solid var(--line);
  border-radius: 8px;
  font-size: 0.82rem;
  outline: none;
  background: #fff;
}
.lane-cod {
  font-family: "Consolas", monospace;
  font-weight: 600;
}
.lane-pb {
  width: 64px;
  text-align: right;
  font-family: "Consolas", monospace;
}
.lane-pb-empty {
  width: 64px;
  text-align: center;
  color: var(--line);
}
.lane-estado {
  font-weight: 700;
}
.lane-estado.st-positivo {
  color: var(--teal-600);
  border-color: var(--teal-100);
  background: var(--teal-50);
}
.lane-estado.st-negativo {
  color: var(--coral);
  border-color: var(--coral-50);
  background: var(--coral-50);
}
.lane-estado.st-no_claro {
  color: var(--amber-700, #a86a00);
  background: var(--amber-50);
}
.lane-notas {
  padding: 5px 8px;
  border: 1px dashed var(--line);
  border-radius: 7px;
  font-size: 0.76rem;
  outline: none;
  background: transparent;
  color: var(--ink-soft);
}
.add-row {
  display: flex;
  gap: 8px;
}

.save-foot {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 6px;
}
.err {
  color: var(--coral);
  font-size: 0.84rem;
  font-weight: 600;
}

.saved-card {
  border-color: var(--teal-100);
}
.upload-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 26px;
  border: 2px dashed var(--line);
  border-radius: 14px;
  color: var(--muted);
  text-align: center;
}
.upload-zone p {
  margin: 0;
  font-size: 0.86rem;
}
.gel-foto {
  max-width: 100%;
  max-height: 320px;
  border-radius: 12px;
  background: #14181f;
}
@media (max-width: 720px) {
  .gel-intro,
  .chamber-preview {
    grid-template-columns: 1fr;
  }
  .gel-mini-kpis {
    grid-template-columns: repeat(3, 1fr);
  }
  .lane-main {
    grid-template-columns: 26px 1fr;
  }
  .lane-tipo,
  .lane-cod,
  .lane-pb,
  .lane-estado,
  .lane-pb-empty {
    width: 100%;
    grid-column: span 2;
  }
}
@keyframes band-pulse {
  0%, 100% { opacity: .55; transform: scaleX(.82); }
  50% { opacity: 1; transform: scaleX(1); }
}
</style>
