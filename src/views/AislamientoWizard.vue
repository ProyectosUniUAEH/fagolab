<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import StepFlow from '../components/StepFlow.vue'
import LabelCard from '../components/LabelCard.vue'
import Icon from '../components/Icon.vue'
import StatCard from '../components/StatCard.vue'
import { useLabStore } from '../stores/lab'
import { useAuthStore } from '../stores/auth'
import { ORGANOS, MEDIOS, organoNombre } from '../data/catalogs'

const lab = useLabStore()
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

// El flujo termina en el etiquetado. Los subcultivos y la extracción de ADN ocurren días
// después (cuando las cajas salen de la incubadora) y se registran desde sus secciones.
const steps = [
  'Recepción del pez',
  'Foto y características',
  'Vísceras / órganos',
  'Generación de cajas Petri',
  'Etiquetado QR',
]
const current = ref(0)

const hoy = new Date().toISOString().slice(0, 10)

const form = reactive({
  idRecepcion: '',
  fecha: hoy,
  pesoG: null as number | null,
  longitudCm: null as number | null,
  estadoClinico: 'enfermo',
  lesiones: '',
  // Paso 2 — características clínicas (columnas ya existentes en la tabla peces).
  coloracion: '',
  branquias: '',
  ojos: '',
  piel: '',
  abdomen: '',
  diagnostico: '',
  organos: ['Hg', 'Rñ'] as string[],
  medios: ['TSA', 'TCBS'] as string[],
  // Valor inicial de cada casilla de la matriz; se ajusta por combinación en el paso 4.
  cajasPorMuestra: 1,
})

// El código del pez lo asigna el backend; aquí mostramos el siguiente previsto.
const codigoMuestra = computed(() => `PEZ-${String(lab.state.peces.length + 1).padStart(3, '0')}`)

// Preselecciona la recepción indicada en la URL (al venir desde Recepciones) o la primera.
watch(
  () => lab.state.recepciones.length,
  () => {
    if (form.idRecepcion) return
    const pedida = route.query.recepcion as string | undefined
    if (pedida && lab.state.recepciones.some((r) => r.id === pedida)) {
      form.idRecepcion = pedida
      return
    }
    if (lab.state.recepciones[0]) form.idRecepcion = lab.state.recepciones[0].id
  },
  { immediate: true },
)

// ---- Matriz de cajas por combinación órgano × medio ----
// matriz[organo][medio] = nº de cajas. Un 0 significa que esa combinación no se siembra.
const matriz = reactive<Record<string, Record<string, number>>>({})

function sincronizarMatriz() {
  for (const org of form.organos) {
    if (!matriz[org]) matriz[org] = {}
    for (const medio of form.medios) {
      // Solo rellena lo nuevo: respeta lo que la investigadora ya ajustó a mano.
      if (matriz[org][medio] === undefined) {
        // Arranca con lo que se usó la última vez para esta combinación.
        matriz[org][medio] = lab.preferenciasSiembra[org]?.[medio] ?? form.cajasPorMuestra
      }
    }
  }
}
watch(() => [form.organos.slice(), form.medios.slice()], sincronizarMatriz, { immediate: true, deep: true })

// Las preferencias llegan de la API después del primer render: al llegar, rellena las
// casillas que aún tienen el valor por defecto (sin pisar lo que ya se haya escrito).
watch(
  () => lab.preferenciasSiembra,
  (prefs) => {
    for (const org of form.organos) {
      for (const medio of form.medios) {
        const guardado = prefs[org]?.[medio]
        if (guardado !== undefined && matriz[org]?.[medio] === form.cajasPorMuestra) {
          matriz[org][medio] = guardado
        }
      }
    }
  },
  { deep: true },
)

const cajasDe = (org: string, medio: string) => matriz[org]?.[medio] ?? 0

function setCajas(org: string, medio: string, valor: number | string) {
  if (!matriz[org]) matriz[org] = {}
  const n = Math.floor(Number(valor))
  matriz[org][medio] = Number.isFinite(n) ? Math.max(0, Math.min(99, n)) : 0
}

function aplicarATodo(n: number) {
  for (const org of form.organos) for (const medio of form.medios) setCajas(org, medio, n)
}

const totalCajas = computed(() =>
  form.organos.reduce((acc, org) => acc + form.medios.reduce((a, m) => a + cajasDe(org, m), 0), 0),
)

// Un órgano sin cajas en ningún medio no llegó a sembrarse: no genera muestra biológica.
const organosActivos = computed(() => form.organos.filter((org) => form.medios.some((m) => cajasDe(org, m) > 0)))

// Identificadores previstos (mismo orden que usa el backend: órgano → medio → réplica).
const identificadores = computed(() => {
  const out: { codigo: string; organo: string; medio: string }[] = []
  let n = 0
  for (const org of form.organos) {
    if (!form.medios.some((m) => cajasDe(org, m) > 0)) continue
    for (const medio of form.medios) {
      for (let k = 0; k < cajasDe(org, medio); k++) {
        n++
        out.push({ codigo: `CP-${codigoMuestra.value}-${String(n).padStart(3, '0')}`, organo: org, medio })
      }
    }
  }
  return out
})

function toggle(arr: string[], v: string) {
  const i = arr.indexOf(v)
  if (i >= 0) arr.splice(i, 1)
  else arr.push(v)
}

// ---- Alta de órganos y medios nuevos (quedan disponibles para futuros peces) ----
const nuevoOrgano = ref('')
const nuevoMedio = ref('')
const guardandoCat = ref(false)
const errorCat = ref('')

async function agregarOrgano() {
  const nombre = nuevoOrgano.value.trim()
  if (!nombre || guardandoCat.value) return
  guardandoCat.value = true
  errorCat.value = ''
  try {
    const creado = await lab.crearOrgano(nombre)
    if (!form.organos.includes(creado.codigo)) form.organos.push(creado.codigo)
    nuevoOrgano.value = ''
  } catch (e) {
    errorCat.value = e instanceof Error ? e.message : String(e)
  } finally {
    guardandoCat.value = false
  }
}

async function agregarMedio() {
  const nombre = nuevoMedio.value.trim()
  if (!nombre || guardandoCat.value) return
  guardandoCat.value = true
  errorCat.value = ''
  try {
    const creado = await lab.crearMedio(nombre)
    if (!form.medios.includes(creado.nombre)) form.medios.push(creado.nombre)
    nuevoMedio.value = ''
  } catch (e) {
    errorCat.value = e instanceof Error ? e.message : String(e)
  } finally {
    guardandoCat.value = false
  }
}

// ---- Fotos del pez (varias) ----
// Se guardan en memoria y se suben tras crear, cuando ya existe el código del pez.
const fotos = ref<{ file: File; url: string }[]>([])

function onFotos(e: Event) {
  const input = e.target as HTMLInputElement
  for (const f of Array.from(input.files ?? [])) fotos.value.push({ file: f, url: URL.createObjectURL(f) })
  input.value = '' // permite volver a elegir el mismo archivo
}

function quitarFoto(i: number) {
  URL.revokeObjectURL(fotos.value[i].url)
  fotos.value.splice(i, 1)
}

const creado = ref(false)
const creando = ref(false)
const errorCrear = ref<string | null>(null)
const avisoFotos = ref('')
const pezCreado = ref('')
const cajasCreadas = ref<{ codigo: string; organo: string; medio: string }[]>([])

// Antes de crear se imprimen los códigos previstos; después, los que devolvió el backend.
const etiquetas = computed(() => (creado.value && cajasCreadas.value.length ? cajasCreadas.value : identificadores.value))

async function crear() {
  creando.value = true
  errorCrear.value = null
  try {
    const res = await lab.registrarAislamiento({
      idRecepcion: form.idRecepcion,
      pesoG: form.pesoG ?? undefined,
      longitudCm: form.longitudCm ?? undefined,
      estadoClinico: form.estadoClinico,
      lesiones: form.lesiones,
      organos: form.organos,
      medios: form.medios,
      cajasPorMuestra: form.cajasPorMuestra,
      fechaSiembra: form.fecha,
      matriz: JSON.parse(JSON.stringify(matriz)),
      coloracion: form.coloracion,
      branquias: form.branquias,
      ojos: form.ojos,
      piel: form.piel,
      abdomen: form.abdomen,
      diagnostico: form.diagnostico,
    })
    pezCreado.value = res.pez.codigo
    cajasCreadas.value = res.cajas ?? []

    let fallidas = 0
    for (const [i, f] of fotos.value.entries()) {
      try {
        await lab.subirImagen(f.file, res.pez.codigo, 'foto-pez', i === 0)
      } catch {
        fallidas++
      }
    }
    avisoFotos.value = fallidas ? `${fallidas} de ${fotos.value.length} fotos no se pudieron subir.` : ''
    creado.value = true
  } catch (e) {
    errorCrear.value = e instanceof Error ? e.message : String(e)
  } finally {
    creando.value = false
  }
}

function imprimir() {
  window.print()
}

// Evita avanzar sin los datos mínimos de cada paso.
const puedeAvanzar = computed(() => {
  if (current.value === 0) return !!form.idRecepcion && !!form.fecha
  if (current.value === 2) return form.organos.length > 0 && form.medios.length > 0
  if (current.value === 3) return totalCajas.value > 0
  return true
})

const avisoPaso = ref('')
function motivoPendiente() {
  if (current.value === 0) return 'Selecciona la recepción del lote y confirma la fecha de aislamiento.'
  if (current.value === 2) return 'Selecciona al menos un órgano y un medio de cultivo.'
  if (current.value === 3) return 'Indica al menos una caja Petri en la matriz de siembra.'
  return ''
}
function next() {
  if (!puedeAvanzar.value) { avisoPaso.value = motivoPendiente(); return }
  avisoPaso.value = ''
  if (current.value < steps.length - 1) current.value++
}
function irPaso(destino: number) {
  if (destino <= current.value) { avisoPaso.value = ''; current.value = destino; return }
  if (destino > current.value + 1) { avisoPaso.value = 'Avanza paso a paso para confirmar los datos obligatorios.'; return }
  if (!puedeAvanzar.value) { avisoPaso.value = motivoPendiente(); return }
  avisoPaso.value = ''
  current.value = destino
}
function prev() {
  if (current.value > 0) current.value--
}
</script>

<template>
  <div class="page-head no-print">
    <div>
      <h1>Registro de aislamiento bacteriano</h1>
      <p class="sub">Aislamientos › Nuevo aislamiento › {{ steps[current] }}</p>
    </div>
    <div class="actions">
      <button class="btn btn-primary" @click="router.push('/cajas')"><Icon name="dish" :size="16" /> Ver cajas</button>
    </div>
  </div>

  <div class="card card-pad no-print" style="margin-bottom: 18px">
    <StepFlow :steps="steps" :current="current" @go="irPaso" />
  </div>

  <!-- KPIs rápidos -->
  <div class="grid cols-3 no-print" style="margin-bottom: 18px">
    <StatCard label="Cajas a generar" :value="totalCajas" icon="dish" tone="teal" :sub="`${organosActivos.length} órganos × ${form.medios.length} medios`" />
    <StatCard label="Órganos muestreados" :value="organosActivos.length" icon="microscope" tone="blue" sub="vísceras / lesión" />
    <StatCard label="Etiquetas QR" :value="totalCajas" icon="qr" tone="violet" sub="listas para imprimir" />
  </div>

  <!-- ============ PASO 1: Recepción del pez ============ -->
  <div v-if="current === 0" class="grid cols-2 no-print">
    <div class="card">
      <div class="card-head"><div class="ic"><Icon name="fish" :size="16" /></div><h3>Datos de la muestra (pez)</h3></div>
      <div class="card-pad grid cols-2">
        <div class="field"><label>Código de muestra (automático)</label><input :value="codigoMuestra" readonly /></div>
        <div class="field"><label>Fecha de aislamiento <span class="req">*</span></label><input type="date" v-model="form.fecha" /></div>
        <div class="field">
          <label>Recepción / lote <span class="req">*</span></label>
          <select v-model="form.idRecepcion">
            <option v-for="r in lab.state.recepciones" :key="r.id" :value="r.id">{{ r.codigo }} · {{ r.especie }}</option>
          </select>
        </div>
        <div class="field"><label>Estado clínico</label>
          <select v-model="form.estadoClinico"><option>enfermo</option><option>moribundo</option><option>recién muerto</option></select>
        </div>
        <div class="field" style="grid-column: 1 / -1"><label>Observaciones clínicas / características</label><textarea rows="3" v-model="form.lesiones"></textarea></div>
        <div class="field"><label>Peso (g)</label><input type="number" step="0.1" v-model.number="form.pesoG" /></div>
        <div class="field"><label>Longitud (cm)</label><input type="number" step="0.1" v-model.number="form.longitudCm" /></div>
      </div>
    </div>
    <div class="card">
      <div class="card-head">
        <div class="ic"><Icon name="upload" :size="16" /></div>
        <h3>Fotos del pez</h3>
        <span v-if="fotos.length" class="badge b-teal" style="margin-left: auto">{{ fotos.length }}</span>
      </div>
      <div class="card-pad">
        <div class="info-banner teal" style="margin-bottom: 14px">
          <Icon name="shield" :size="16" />
          <span>Puedes adjuntar <b>varias fotos</b> (lateral, dorsal, lesión). Se vincularán a <b>{{ codigoMuestra }}</b> al registrar el aislamiento; la primera queda como principal.</span>
        </div>

        <div v-if="fotos.length" class="fotos-grid">
          <div v-for="(f, i) in fotos" :key="f.url" class="foto-item">
            <img :src="f.url" :alt="`foto ${i + 1}`" />
            <button class="foto-quitar" title="Quitar" @click="quitarFoto(i)"><Icon name="close" :size="13" /></button>
            <span v-if="i === 0" class="foto-principal">Principal</span>
          </div>
        </div>

        <label class="foto-drop">
          <input type="file" accept="image/*" multiple style="display: none" @change="onFotos" />
          <Icon name="upload" :size="26" />
          <p style="margin-top: 8px; font-weight: 600">
            {{ fotos.length ? 'Añadir más fotos' : 'Haz clic para seleccionar fotos' }}
          </p>
          <p style="font-size: 0.78rem">JPG o PNG · puedes elegir varias a la vez</p>
        </label>
      </div>
    </div>
  </div>

  <!-- ============ PASO 2: Foto y características ============ -->
  <div v-else-if="current === 1" class="card card-pad no-print">
    <h3 style="margin-bottom: 6px">Características morfométricas y clínicas</h3>
    <p class="sub" style="margin-bottom: 18px">Se guardan en la ficha del pez. Todos los campos son opcionales.</p>
    <div class="grid cols-3">
      <div class="field"><label>Coloración anormal</label><input v-model="form.coloracion" placeholder="ej. melanosis dorsal" /></div>
      <div class="field"><label>Branquias</label><input v-model="form.branquias" placeholder="pálidas / con moco" /></div>
      <div class="field"><label>Ojos</label><input v-model="form.ojos" placeholder="exoftalmia" /></div>
      <div class="field"><label>Piel / aletas</label><input v-model="form.piel" placeholder="úlceras, erosión" /></div>
      <div class="field"><label>Abdomen</label><input v-model="form.abdomen" placeholder="distensión, ascitis" /></div>
      <div class="field"><label>Diagnóstico presuntivo</label><input v-model="form.diagnostico" placeholder="septicemia bacteriana" /></div>
    </div>
  </div>

  <!-- ============ PASO 3: Vísceras / órganos ============ -->
  <div v-else-if="current === 2" class="grid cols-2 no-print">
    <div class="card">
      <div class="card-head"><div class="ic"><Icon name="microscope" :size="16" /></div><h3>Órganos / tejidos a sembrar</h3></div>
      <div class="card-pad">
        <p class="sub" style="margin-bottom: 12px">Cada órgano genera una <b>muestra biológica</b> independiente y trazable.</p>
        <div class="chips">
          <button v-for="o in ORGANOS" :key="o.codigo" class="chip" :class="{ on: form.organos.includes(o.codigo) }" @click="toggle(form.organos, o.codigo)">
            {{ o.nombre }}
          </button>
        </div>
        <form v-if="auth.can('aislamiento.catalogs.manage')" class="cat-nuevo" @submit.prevent="agregarOrgano">
          <input v-model="nuevoOrgano" placeholder="Añadir órgano nuevo…" :disabled="guardandoCat" />
          <button class="btn btn-sm" type="submit" :disabled="!nuevoOrgano.trim() || guardandoCat">
            <Icon name="plus" :size="14" /> Añadir
          </button>
        </form>
      </div>
    </div>
    <div class="card">
      <div class="card-head"><div class="ic"><Icon name="dish" :size="16" /></div><h3>Medios de cultivo</h3></div>
      <div class="card-pad">
        <p class="sub" style="margin-bottom: 12px">Medios nutritivos y selectivos disponibles en el laboratorio.</p>
        <div class="chips">
          <button v-for="m in MEDIOS" :key="m.nombre" class="chip" :class="{ on: form.medios.includes(m.nombre) }" @click="toggle(form.medios, m.nombre)">
            {{ m.nombre }}
          </button>
        </div>
        <form v-if="auth.can('aislamiento.catalogs.manage')" class="cat-nuevo" @submit.prevent="agregarMedio">
          <input v-model="nuevoMedio" placeholder="Añadir medio nuevo…" :disabled="guardandoCat" />
          <button class="btn btn-sm" type="submit" :disabled="!nuevoMedio.trim() || guardandoCat">
            <Icon name="plus" :size="14" /> Añadir
          </button>
        </form>
        <div v-if="errorCat" class="info-banner amber" style="margin-top: 12px">
          <Icon name="alert" :size="16" /><span>{{ errorCat }}</span>
        </div>
        <div class="info-banner" style="margin-top: 16px">
          <Icon name="layers" :size="16" />
          <span>Los que añadas quedan guardados y disponibles para los siguientes peces.</span>
        </div>
      </div>
    </div>
  </div>

  <!-- ============ PASO 4: Generación de cajas Petri ============ -->
  <div v-else-if="current === 3" class="grid cols-2 no-print">
    <div>
      <div class="card" style="margin-bottom: 18px">
        <div class="card-head">
          <div class="ic"><Icon name="dish" :size="16" /></div>
          <h3>Cajas por órgano y medio</h3>
        </div>
        <div class="card-pad">
          <p class="sub" style="margin-bottom: 14px">
            Indica cuántas cajas sembrar en cada combinación. Un <b>0</b> significa que esa combinación no se siembra.
          </p>

          <div class="matriz-wrap">
            <table class="matriz">
              <thead>
                <tr>
                  <th>Órgano</th>
                  <th v-for="m in form.medios" :key="m">{{ m }}</th>
                  <th class="tot">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="org in form.organos" :key="org" :class="{ vacio: !form.medios.some((m) => cajasDe(org, m) > 0) }">
                  <th>{{ organoNombre(org) }}</th>
                  <td v-for="m in form.medios" :key="m">
                    <input
                      type="number"
                      min="0"
                      max="99"
                      :value="cajasDe(org, m)"
                      @input="setCajas(org, m, ($event.target as HTMLInputElement).value)"
                    />
                  </td>
                  <td class="tot">{{ form.medios.reduce((a, m) => a + cajasDe(org, m), 0) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <th>Total</th>
                  <td v-for="m in form.medios" :key="m">{{ form.organos.reduce((a, org) => a + cajasDe(org, m), 0) }}</td>
                  <td class="tot">{{ totalCajas }}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div class="aplicar-todo">
            <span class="sub">Aplicar a todas:</span>
            <button v-for="n in [1, 2, 3, 5]" :key="n" class="btn btn-sm" @click="aplicarATodo(n)">{{ n }}</button>
            <button class="btn btn-sm" @click="aplicarATodo(0)">Vaciar</button>
          </div>

          <div v-if="totalCajas === 0" class="info-banner amber" style="margin-top: 16px">
            <Icon name="alert" :size="16" /><span>Indica al menos una caja para poder continuar.</span>
          </div>
          <div v-else class="info-banner teal" style="margin-top: 16px">
            <Icon name="qr" :size="16" />
            <span>Se generarán <b>{{ totalCajas }} identificadores únicos</b>, cada uno con su QR y código de barras.</span>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><div class="ic"><Icon name="layers" :size="16" /></div><h3>Relación de trazabilidad</h3></div>
        <div class="card-pad" style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap">
          <span class="flow-pill"><Icon name="fish" :size="14" /> 1 pez</span>
          <Icon name="arrow" :size="16" class="flow-arrow" />
          <span class="flow-pill"><Icon name="microscope" :size="14" /> {{ organosActivos.length }} muestras</span>
          <Icon name="arrow" :size="16" class="flow-arrow" />
          <span class="flow-pill"><Icon name="dish" :size="14" /> {{ totalCajas }} cajas</span>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-head"><div class="ic"><Icon name="check" :size="16" /></div><h3>Identificadores generados ({{ totalCajas }})</h3></div>
      <div class="table-wrap" style="max-height: 420px; overflow-y: auto">
        <table class="data">
          <thead><tr><th>#</th><th>Código de caja</th><th>Órgano</th><th>Medio</th><th>Estado</th></tr></thead>
          <tbody>
            <tr v-for="(id, i) in identificadores" :key="id.codigo">
              <td>{{ i + 1 }}</td>
              <td class="mono">{{ id.codigo }}</td>
              <td>{{ organoNombre(id.organo) }}</td>
              <td><span class="badge b-slate">{{ id.medio }}</span></td>
              <td><span class="badge b-teal">Nuevo</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- ============ PASO 5: Etiquetado QR y registro ============ -->
  <div v-else-if="current === 4">
    <!-- Confirmar y registrar -->
    <div v-if="!creado" class="card card-pad no-print" style="margin-bottom: 18px">
      <h3 style="margin-bottom: 6px">Confirmar y registrar el aislamiento</h3>
      <p class="sub" style="margin-bottom: 18px">
        Se registrará el pez, sus {{ organosActivos.length }} muestras biológicas y {{ totalCajas }} cajas Petri con sus etiquetas.
      </p>
      <div class="grid cols-2" style="margin-bottom: 20px">
        <div class="flow-pill">Pez: <b>{{ codigoMuestra }}</b></div>
        <div class="flow-pill">Cajas: <b>{{ totalCajas }}</b></div>
        <div class="flow-pill">Órganos: <b>{{ organosActivos.map(organoNombre).join(', ') || '—' }}</b></div>
        <div class="flow-pill">Fecha: <b>{{ form.fecha }}</b></div>
      </div>
      <div v-if="errorCrear" class="info-banner amber" style="margin-bottom: 14px">
        <Icon name="shield" :size="16" /><span>{{ errorCrear }}</span>
      </div>
      <button v-if="auth.can('aislamiento.workflow.create')" class="btn btn-primary" :disabled="creando || totalCajas === 0" @click="crear">
        <Icon name="check" :size="16" /> {{ creando ? 'Registrando…' : `Registrar pez y ${totalCajas} cajas` }}
      </button>
    </div>

    <!-- Registrado -->
    <div v-else class="card card-pad no-print" style="margin-bottom: 18px; text-align: center">
      <div class="ok-circulo"><Icon name="check" :size="32" /></div>
      <h3>Aislamiento registrado</h3>
      <p class="sub" style="margin-top: 8px">
        {{ pezCreado }} · {{ cajasCreadas.length }} cajas Petri creadas con trazabilidad completa.
      </p>
      <p v-if="avisoFotos" class="sub" style="color: var(--coral); margin-top: 6px">{{ avisoFotos }}</p>
      <div style="display: flex; gap: 10px; justify-content: center; margin-top: 16px">
        <button class="btn btn-primary" @click="router.push('/cajas')"><Icon name="dish" :size="16" /> Ver cajas Petri</button>
        <button class="btn" @click="imprimir"><Icon name="print" :size="16" /> Imprimir etiquetas</button>
      </div>
    </div>

    <!-- Hoja de etiquetas (lo único que sale al imprimir) -->
    <div class="card print-sheet">
      <div class="card-head no-print">
        <div class="ic"><Icon name="qr" :size="16" /></div>
        <h3>Etiquetas ({{ etiquetas.length }})</h3>
        <div style="margin-left: auto">
          <button class="btn btn-sm" :disabled="!etiquetas.length" @click="imprimir">
            <Icon name="print" :size="14" /> Imprimir
          </button>
        </div>
      </div>
      <div class="card-pad">
        <div class="info-banner amber no-print" style="margin-bottom: 16px">
          <Icon name="tag" :size="16" />
          <span>Cada caja lleva un QR (abre la ficha al escanear) + código de barras CODE128 para lectores de laboratorio. Pega la etiqueta en la tapa de la caja.</span>
        </div>
        <div v-if="etiquetas.length" class="grid cols-3">
          <LabelCard
            v-for="e in etiquetas"
            :key="e.codigo"
            :codigo="e.codigo"
            tipo="caja_petri"
            :titulo="creado ? pezCreado : codigoMuestra"
            :sub="`${organoNombre(e.organo)} · ${e.medio} · ${form.fecha}`"
          />
        </div>
        <p v-else class="sub" style="text-align: center; padding: 20px 0">
          Define las cajas en el paso anterior para generar las etiquetas.
        </p>
      </div>
    </div>
  </div>

  <!-- Navegación -->
  <div class="card card-pad no-print" style="margin-top: 18px; display: flex; justify-content: space-between; align-items: center">
    <button class="btn" :disabled="current === 0" @click="prev"><Icon name="chevron" :size="16" style="transform: rotate(180deg)" /> Anterior</button>
    <span v-if="avisoPaso" class="step-warning"><Icon name="alert" :size="15" /> {{ avisoPaso }}</span>
    <span v-else class="sub">Paso {{ current + 1 }} de {{ steps.length }}</span>
    <button v-if="current < steps.length - 1" class="btn btn-primary" @click="next">
      Siguiente paso <Icon name="chevron" :size="16" />
    </button>
    <span v-else style="width: 120px"></span>
  </div>
</template>

<style scoped>
/* Fotos del pez (paso 1) */
.fotos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 10px; margin-bottom: 14px; }
.foto-item { position: relative; border-radius: 10px; overflow: hidden; border: 1px solid var(--line); aspect-ratio: 1; }
.foto-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
.foto-quitar { position: absolute; top: 4px; right: 4px; display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; border: none; background: rgba(15, 36, 56, 0.7); color: #fff; cursor: pointer; }
.foto-quitar:hover { background: var(--coral); }
.foto-principal { position: absolute; left: 0; bottom: 0; width: 100%; padding: 3px 0; text-align: center; font-size: 0.62rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: #fff; background: var(--teal); }
.foto-drop { display: block; border: 2px dashed var(--line); border-radius: 14px; padding: 22px; text-align: center; color: var(--muted); cursor: pointer; }
.foto-drop:hover { border-color: var(--teal); color: var(--teal); }

/* Alta de órgano / medio (paso 3) */
.cat-nuevo { display: flex; gap: 8px; margin-top: 14px; }
.cat-nuevo input { flex: 1; min-width: 0; }

/* Matriz órgano × medio (paso 4) */
.matriz-wrap { overflow-x: auto; }
.matriz { width: 100%; border-collapse: collapse; font-size: 0.84rem; }
.matriz th, .matriz td { padding: 8px 10px; text-align: center; border-bottom: 1px solid var(--line-soft); }
.matriz thead th { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); white-space: nowrap; }
.matriz tbody th, .matriz tfoot th { text-align: left; font-weight: 700; color: var(--ink); white-space: nowrap; }
.matriz tbody tr.vacio th, .matriz tbody tr.vacio td { opacity: 0.45; }
.matriz input { width: 58px; padding: 6px; text-align: center; border-radius: 8px; border: 1px solid var(--line); }
.matriz input:focus { border-color: var(--teal); outline: none; }
.matriz .tot { font-weight: 800; color: var(--teal-600); }
.matriz tfoot td { font-weight: 700; border-top: 1px solid var(--line); border-bottom: none; }
.aplicar-todo { display: flex; align-items: center; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
.step-warning { display: flex; align-items: center; gap: 6px; max-width: 55%; color: #b45309; font-size: .78rem; font-weight: 700; }

.ok-circulo { display: grid; place-items: center; width: 64px; height: 64px; border-radius: 50%; background: var(--teal-50); color: var(--teal); margin: 0 auto 14px; }
</style>
