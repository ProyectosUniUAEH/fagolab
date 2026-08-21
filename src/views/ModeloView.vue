<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import Icon from '../components/Icon.vue'
import { api, API_BASE } from '../api'
import { useLabStore } from '../stores/lab'
import { useAuthStore } from '../stores/auth'

const lab = useLabStore()
const auth = useAuthStore()

// --- Control de datos (pruebas y backups) ---
interface EstadoBD {
  tablas: number
  filas: number
  detalle: { tabla: string; filas: number }[]
  seedDisponible: boolean
}
const estado = ref<EstadoBD | null>(null)
const cargandoEstado = ref(false)
const trabajando = ref(false)
const msg = reactive({ tipo: '' as '' | 'ok' | 'error', texto: '' })
const fileInput = ref<HTMLInputElement | null>(null)

// Modal de confirmación reutilizable
const confirmar = reactive({
  abierto: false,
  titulo: '',
  mensaje: '',
  textoBoton: 'Confirmar',
  peligro: false,
  accion: (() => {}) as () => void | Promise<void>,
})
function pedirConfirmacion(cfg: { titulo: string; mensaje: string; textoBoton: string; peligro?: boolean; accion: () => void | Promise<void> }) {
  confirmar.titulo = cfg.titulo
  confirmar.mensaje = cfg.mensaje
  confirmar.textoBoton = cfg.textoBoton
  confirmar.peligro = !!cfg.peligro
  confirmar.accion = cfg.accion
  confirmar.abierto = true
}
async function ejecutarConfirmacion() {
  const accion = confirmar.accion
  confirmar.abierto = false
  await accion()
}

async function cargarEstado() {
  cargandoEstado.value = true
  try {
    estado.value = await api.get<EstadoBD>('/api/admin/estado')
  } catch (e) {
    setMsg('error', e instanceof Error ? e.message : 'No se pudo leer el estado.')
  } finally {
    cargandoEstado.value = false
  }
}

function setMsg(tipo: 'ok' | 'error', texto: string) {
  msg.tipo = tipo
  msg.texto = texto
}

// 1. Exportar (descarga directa por Content-Disposition del backend)
function exportarSql() {
  setMsg('ok', 'Generando respaldo… la descarga comenzará en unos segundos.')
  window.location.href = `${API_BASE}/api/admin/exportar`
}

// ---- Copias de seguridad automáticas (se guardan en la propia computadora) ----
interface Respaldo {
  archivo: string
  bytes: number
  fecha: string
}
const respaldos = ref<Respaldo[]>([])
const cargandoRespaldos = ref(false)

async function cargarRespaldos() {
  cargandoRespaldos.value = true
  try {
    respaldos.value = await api.get<Respaldo[]>('/api/admin/respaldos')
  } catch {
    /* sin conexión: se deja vacío */
  } finally {
    cargandoRespaldos.value = false
  }
}

async function crearRespaldo() {
  trabajando.value = true
  setMsg('ok', 'Guardando copia de seguridad…')
  try {
    const res = await api.post<{ archivo: string }>('/api/admin/respaldos')
    await cargarRespaldos()
    setMsg('ok', `Copia guardada: ${res.archivo}`)
  } catch (e) {
    setMsg('error', e instanceof Error ? e.message : 'No se pudo guardar la copia.')
  } finally {
    trabajando.value = false
  }
}

function confirmarRestaurarRespaldo(r: Respaldo) {
  pedirConfirmacion({
    titulo: 'Restaurar esta copia',
    mensaje: `Se reemplazarán TODOS los datos actuales por los de la copia del ${fechaBonita(r.fecha)}. Lo de ahora se perderá. ¿Continuar?`,
    textoBoton: 'Sí, restaurar',
    peligro: true,
    accion: () => restaurarRespaldo(r),
  })
}

async function restaurarRespaldo(r: Respaldo) {
  trabajando.value = true
  setMsg('ok', 'Restaurando copia…')
  try {
    await api.post('/api/admin/respaldos/restaurar', { archivo: r.archivo })
    await cargarEstado()
    await lab.load()
    setMsg('ok', 'Copia restaurada. La base refleja ese respaldo.')
  } catch (e) {
    setMsg('error', e instanceof Error ? e.message : 'No se pudo restaurar la copia.')
  } finally {
    trabajando.value = false
  }
}

// Formatea fecha ISO "2026-07-23T12:41" -> "23 jul 2026, 12:41"
const _meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
function fechaBonita(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return `${d.getDate()} ${_meses[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
function pesoBonito(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// 2. Importar (subir un .sql)
function abrirSelectorSql() {
  fileInput.value?.click()
}
async function alElegirSql(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // permite re-elegir el mismo archivo
  if (!file) return
  pedirConfirmacion({
    titulo: 'Importar respaldo SQL',
    mensaje: `Se reemplazarán TODOS los datos actuales por el contenido de «${file.name}». Esta acción no se puede deshacer. ¿Continuar?`,
    textoBoton: 'Sí, importar',
    peligro: true,
    accion: () => importarSql(file),
  })
}
async function importarSql(file: File) {
  trabajando.value = true
  setMsg('ok', `Importando ${file.name}…`)
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`${API_BASE}/api/admin/importar`, { method: 'POST', body: fd })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.detail ?? res.statusText)
    }
    await cargarEstado()
    await lab.load()
    setMsg('ok', 'Respaldo importado correctamente. Datos restaurados.')
  } catch (e) {
    setMsg('error', e instanceof Error ? e.message : 'No se pudo importar el SQL.')
  } finally {
    trabajando.value = false
  }
}

// 3. Cargar datos semilla (restaura el snapshot del Excel)
function confirmarSembrar() {
  pedirConfirmacion({
    titulo: 'Cargar datos semilla',
    mensaje: 'Se reemplazarán los datos experimentales por la semilla del Excel. Las cuentas, permisos y la auditoría se conservarán. ¿Continuar?',
    textoBoton: 'Sí, cargar semilla',
    peligro: true,
    accion: sembrar,
  })
}
async function sembrar() {
  trabajando.value = true
  setMsg('ok', 'Cargando datos semilla…')
  try {
    await api.post('/api/admin/sembrar')
    await cargarEstado()
    await lab.load()
    setMsg('ok', 'Datos semilla cargados. La base refleja el Excel de la maestra.')
  } catch (e) {
    setMsg('error', e instanceof Error ? e.message : 'No se pudo cargar la semilla.')
  } finally {
    trabajando.value = false
  }
}

// 4. Limpiar los datos experimentales
function confirmarLimpiar() {
  pedirConfirmacion({
    titulo: '¿Limpiar los datos experimentales?',
    mensaje: 'Se borrarán muestras, cultivos y resultados para probar desde cero. Las cuentas, permisos, sesiones y la auditoría permanecerán protegidas. Te conviene exportar un respaldo antes.',
    textoBoton: 'Sí, limpiar experimento',
    peligro: true,
    accion: limpiar,
  })
}
async function limpiar() {
  trabajando.value = true
  setMsg('ok', 'Limpiando la base de datos…')
  try {
    await api.post('/api/admin/limpiar')
    await cargarEstado()
    await lab.load()
    setMsg('ok', 'Base de datos limpia. Lista para pruebas desde cero.')
  } catch (e) {
    setMsg('error', e instanceof Error ? e.message : 'No se pudo limpiar la base.')
  } finally {
    trabajando.value = false
  }
}

onMounted(() => {
  cargarEstado()
  cargarRespaldos()
})

// Cadena principal de trazabilidad (1 → N en cada paso).
const cadena = [
  { tabla: 'proyectos', label: 'Proyecto', icon: 'beaker', desc: 'Campaña de fagoterapia' },
  { tabla: 'recepciones_lote', label: 'Recepción de lote', icon: 'fish', desc: 'Llega el lote de peces' },
  { tabla: 'peces', label: 'Pez', icon: 'fish', desc: 'Peso, longitud, lesiones, foto' },
  { tabla: 'muestras_biologicas', label: 'Muestra biológica', icon: 'microscope', desc: 'Órgano / tejido / lesión' },
  { tabla: 'cajas_petri', label: 'Caja Petri', icon: 'dish', desc: 'Siembra en medio · QR' },
  { tabla: 'colonias_seleccionadas', label: 'Colonia', icon: 'grid', desc: 'Morfotipo seleccionado' },
  { tabla: 'subcultivos_petri', label: 'Subcultivo', icon: 'layers', desc: 'Purificación (subcaja) · QR' },
  { tabla: 'extracciones_adn', label: 'Extracción ADN', icon: 'dna', desc: 'CTAB / kit' },
  { tabla: 'viales_adn', label: 'Vial ADN', icon: 'droplet', desc: 'Material molecular · QR' },
  { tabla: 'lecturas_nanodrop', label: 'NanoDrop', icon: 'droplet', desc: '260/280, 260/230, ng/µL' },
  { tabla: 'pcr_reacciones', label: 'PCR', icon: 'dna', desc: 'Amplificación 16S' },
  { tabla: 'geles_electroforesis', label: 'Electroforesis', icon: 'wave', desc: 'Bandas + imagen' },
  { tabla: 'secuenciaciones', label: 'Secuenciación', icon: 'report', desc: 'Sanger / NGS' },
  { tabla: 'resultados_blast', label: 'BLAST / NCBI', icon: 'search', desc: 'Identificación de cepa' },
]

const transversales = [
  { tabla: 'objetos_laboratorio', desc: 'Cada cosa rastreable tiene un código único. Raíz de QR y etiquetas.', icon: 'database' },
  { tabla: 'etiquetas_fisicas', desc: 'valor_qr + valor_barcode por objeto. Se agrupan en lotes_impresion para hojas A4.', icon: 'qr' },
  { tabla: 'media_archivos', desc: 'El archivo de imagen + metadatos técnicos (hash, tamaño, captura).', icon: 'upload' },
  { tabla: 'media_vinculos', desc: 'Conecta una imagen con CUALQUIER objeto. Un pez/caja/gel → N fotos sin tocar el esquema.', icon: 'layers' },
  { tabla: 'anotaciones_media', desc: 'Regiones marcadas sobre la imagen (humano o IA). Base de visión por computadora.', icon: 'grid' },
  { tabla: 'campos_plantilla', desc: 'Campos dinámicos marcados como features para IA, sin migraciones de tabla.', icon: 'report' },
  { tabla: 'dataset_snapshots', desc: 'Congela datasets reproducibles para entrenar modelos (MLOps).', icon: 'database' },
  { tabla: 'eventos_auditoria', desc: 'Bitácora inmutable de cada cambio. Trazabilidad de extremo a extremo.', icon: 'shield' },
]
</script>

<template>
  <div class="page-head">
    <div>
      <h1>Modelo de datos</h1>
      <p class="sub">40 tablas relacionadas. Cadena de trazabilidad 1→N homologada con el Excel de muestreo.</p>
    </div>
  </div>

  <!-- ===================== CONTROL DE DATOS ===================== -->
  <div class="card admin-card">
    <div class="card-head">
      <div class="ic ic-admin"><Icon name="database" :size="16" /></div>
      <h3>Control de datos · pruebas y backups</h3>
      <span class="badge b-slate" style="margin-left: auto">{{ auth.user?.isSuperadmin ? 'superadministradora' : 'requiere permisos' }}</span>
    </div>
    <div class="card-pad">
      <div class="admin-estado">
        <div class="ae-num">
          <b>{{ estado ? estado.filas.toLocaleString('es-MX') : '—' }}</b>
          <span>registros</span>
        </div>
        <div class="ae-sep"></div>
        <div class="ae-num">
          <b>{{ estado ? estado.tablas : '—' }}</b>
          <span>tablas</span>
        </div>
        <div class="ae-sep"></div>
        <div class="ae-num">
          <b :class="estado?.seedDisponible ? 'ok' : 'no'">{{ estado ? (estado.seedDisponible ? 'Sí' : 'No') : '—' }}</b>
          <span>semilla guardada</span>
        </div>
        <button class="btn btn-ghost btn-sm" style="margin-left: auto" :disabled="cargandoEstado" @click="cargarEstado">
          <Icon name="arrow" :size="14" /> Actualizar
        </button>
      </div>

      <div class="admin-acciones">
        <button v-if="auth.can('datos.backups.manage')" class="admin-btn export" :disabled="trabajando" @click="exportarSql">
          <div class="ab-ic"><Icon name="download" :size="20" /></div>
          <div class="ab-txt"><b>Exportar respaldo</b><span>Descarga un .sql de los datos experimentales, sin contraseñas.</span></div>
        </button>

        <button v-if="auth.can('datos.database.restore')" class="admin-btn import" :disabled="trabajando" @click="abrirSelectorSql">
          <div class="ab-ic"><Icon name="upload" :size="20" /></div>
          <div class="ab-txt"><b>Importar respaldo</b><span>Sube un .sql exportado y restaura ese estado.</span></div>
        </button>

        <button v-if="auth.can('datos.database.seed')" class="admin-btn seed" :disabled="trabajando" @click="confirmarSembrar">
          <div class="ab-ic"><Icon name="database" :size="20" /></div>
          <div class="ab-txt"><b>Cargar datos semilla</b><span>Restaura los datos del Excel de la maestra.</span></div>
        </button>

        <button v-if="auth.can('datos.database.delete_all')" class="admin-btn wipe" :disabled="trabajando" @click="confirmarLimpiar">
          <div class="ab-ic"><Icon name="shield" :size="20" /></div>
          <div class="ab-txt"><b>Limpiar experimento</b><span>Empieza pruebas desde cero sin borrar usuarios ni seguridad.</span></div>
        </button>
      </div>

      <input ref="fileInput" type="file" accept=".sql,application/sql,text/plain" style="display: none" @change="alElegirSql" />

      <div v-if="msg.texto" class="admin-msg" :class="msg.tipo">
        <Icon :name="msg.tipo === 'error' ? 'shield' : 'check'" :size="15" /> {{ msg.texto }}
      </div>
    </div>
  </div>

  <!-- Copias de seguridad automáticas -->
  <div class="card resp-card" style="margin-bottom: 18px">
    <div class="card-head">
      <div class="ic"><Icon name="shield" :size="16" /></div>
      <h3>Copias de seguridad</h3>
      <button v-if="auth.can('datos.backups.manage')" class="resp-nueva" :disabled="trabajando" @click="crearRespaldo">
        <Icon name="plus" :size="15" /> Guardar copia ahora
      </button>
    </div>
    <div class="card-pad">
      <div class="info-banner teal" style="margin-bottom: 14px">
        <Icon name="check" :size="16" />
        <span>Se guarda una copia <b>automática cada día</b> al abrir FagoLab, en tu computadora. También puedes guardar una manual antes de un cambio grande.</span>
      </div>

      <div v-if="cargandoRespaldos" class="resp-vacio">Cargando copias…</div>
      <div v-else-if="!respaldos.length" class="resp-vacio">Aún no hay copias guardadas.</div>
      <ul v-else class="resp-lista">
        <li v-for="r in respaldos" :key="r.archivo">
          <span class="resp-ic"><Icon name="save" :size="15" /></span>
          <div class="resp-info">
            <b>{{ fechaBonita(r.fecha) }}</b>
            <span>{{ pesoBonito(r.bytes) }} · {{ r.archivo }}</span>
          </div>
          <button v-if="auth.can('datos.database.restore')" class="resp-restaurar" :disabled="trabajando" @click="confirmarRestaurarRespaldo(r)">
            <Icon name="refresh" :size="14" /> Restaurar
          </button>
        </li>
      </ul>
    </div>
  </div>

  <div class="card" style="margin-bottom: 18px">
    <div class="card-head"><div class="ic"><Icon name="layers" :size="16" /></div><h3>Cadena principal de trazabilidad</h3></div>
    <div class="card-pad">
      <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: stretch">
        <template v-for="(c, i) in cadena" :key="c.tabla">
          <div style="display: flex; flex-direction: column; gap: 4px; padding: 12px 14px; border: 1px solid var(--line); border-radius: 12px; min-width: 150px; background: #fff">
            <div style="display: flex; align-items: center; gap: 8px">
              <div style="display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; background: var(--teal-50); color: var(--teal)"><Icon :name="c.icon" :size="15" /></div>
              <b style="font-size: 0.86rem">{{ c.label }}</b>
            </div>
            <code class="mono" style="font-size: 0.72rem; color: var(--blue)">{{ c.tabla }}</code>
            <span class="sub" style="font-size: 0.74rem">{{ c.desc }}</span>
          </div>
          <div v-if="i < cadena.length - 1" style="display: grid; place-items: center; color: var(--muted)"><Icon name="arrow" :size="16" /></div>
        </template>
      </div>
    </div>
  </div>

  <div class="grid cols-2" style="margin-bottom: 18px">
    <div class="info-banner teal">
      <Icon name="qr" :size="18" />
      <div><b>Identidad y etiquetas</b><br />Todo objeto rastreable existe en <code>objetos_laboratorio</code> con un código único, lo que permite generar QR y códigos de barra consistentes para imprimir y escanear en el laboratorio.</div>
    </div>
    <div class="info-banner amber">
      <Icon name="upload" :size="18" />
      <div><b>Por qué NO usar columnas foto_1, foto_2…</b><br />Las imágenes viven en <code>media_archivos</code> + <code>media_vinculos</code>. Así un pez, una caja o un gel tienen fotos ilimitadas sin cambiar la estructura, y la IA puede anotarlas por región.</div>
    </div>
  </div>

  <div class="card">
    <div class="card-head"><div class="ic"><Icon name="database" :size="16" /></div><h3>Tablas transversales (identidad, imágenes, IA/MLOps)</h3></div>
    <div class="card-pad grid cols-2">
      <div v-for="t in transversales" :key="t.tabla" style="display: flex; gap: 12px; padding: 12px; border: 1px solid var(--line-soft); border-radius: 12px">
        <div style="display: grid; place-items: center; width: 34px; height: 34px; border-radius: 9px; background: var(--violet-50); color: var(--violet); flex: none"><Icon :name="t.icon" :size="18" /></div>
        <div>
          <code class="mono" style="color: var(--blue); font-size: 0.78rem">{{ t.tabla }}</code>
          <p class="sub" style="font-size: 0.78rem; margin-top: 2px">{{ t.desc }}</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal de confirmación -->
  <Teleport to="body">
    <div v-if="confirmar.abierto" class="modal-overlay" @click.self="confirmar.abierto = false">
      <div class="modal-card" role="dialog" aria-modal="true">
        <div class="modal-head">
          <div class="modal-icon" :class="{ peligro: confirmar.peligro }">
            <Icon :name="confirmar.peligro ? 'shield' : 'help'" :size="20" />
          </div>
          <h2>{{ confirmar.titulo }}</h2>
        </div>
        <div class="modal-body"><p>{{ confirmar.mensaje }}</p></div>
        <div class="modal-foot">
          <button class="btn btn-ghost" @click="confirmar.abierto = false">Cancelar</button>
          <button class="btn" :class="confirmar.peligro ? 'btn-danger' : 'btn-primary'" @click="ejecutarConfirmacion">
            {{ confirmar.textoBoton }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.resp-card .card-head { display: flex; align-items: center; }
.resp-nueva { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; border: none; background: var(--teal); color: #fff; font-weight: 700; font-size: 0.82rem; cursor: pointer; }
.resp-nueva:hover:not(:disabled) { filter: brightness(0.95); }
.resp-nueva:disabled { opacity: 0.6; cursor: default; }
.resp-vacio { padding: 16px; text-align: center; color: var(--muted); font-size: 0.85rem; }
.resp-lista { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; max-height: 340px; overflow-y: auto; }
.resp-lista li { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 11px; background: #fff; }
.resp-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; background: var(--teal-50); color: var(--teal-600); flex: none; }
.resp-info { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.resp-info b { font-size: 0.88rem; color: var(--ink); }
.resp-info span { font-size: 0.75rem; color: var(--muted); }
.resp-restaurar { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 9px; border: 1px solid var(--line); background: #fff; color: var(--ink-soft); font-weight: 700; font-size: 0.78rem; cursor: pointer; }
.resp-restaurar:hover:not(:disabled) { border-color: var(--teal); color: var(--teal-600); }
.resp-restaurar:disabled { opacity: 0.5; cursor: default; }

.admin-card {
  margin-bottom: 18px;
  border: 1px solid #d8e6ea;
}
.ic-admin {
  background: var(--teal-50) !important;
  color: var(--teal-600) !important;
}
.admin-estado {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 14px 16px;
  background: var(--line-soft);
  border-radius: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.ae-num {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}
.ae-num b {
  font-family: "Sora", sans-serif;
  font-size: 1.3rem;
}
.ae-num b.ok { color: var(--teal-600); }
.ae-num b.no { color: var(--muted); }
.ae-num span {
  font-size: 0.72rem;
  color: var(--muted);
  margin-top: 2px;
}
.ae-sep {
  width: 1px;
  align-self: stretch;
  background: var(--line);
}
.admin-acciones {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.admin-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fff;
  text-align: left;
  transition: transform 0.14s, box-shadow 0.14s, border-color 0.14s;
}
.admin-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow);
}
.admin-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.ab-ic {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 12px;
  flex: none;
  color: #fff;
}
.ab-txt {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.ab-txt b { font-size: 0.92rem; }
.ab-txt span {
  font-size: 0.78rem;
  color: var(--muted);
  line-height: 1.35;
}
.admin-btn.export .ab-ic { background: linear-gradient(135deg, #2f6fed, #5b9bff); }
.admin-btn.export:hover:not(:disabled) { border-color: #5b9bff; }
.admin-btn.import .ab-ic { background: linear-gradient(135deg, #7c5cdb, #a385ec); }
.admin-btn.import:hover:not(:disabled) { border-color: #a385ec; }
.admin-btn.seed .ab-ic { background: linear-gradient(135deg, #0f766e, #19b39e); }
.admin-btn.seed:hover:not(:disabled) { border-color: #19b39e; }
.admin-btn.wipe .ab-ic { background: linear-gradient(135deg, #e2574c, #f08a82); }
.admin-btn.wipe:hover:not(:disabled) { border-color: #f08a82; }

.admin-msg {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
}
.admin-msg.ok {
  background: var(--teal-50);
  color: var(--teal-600);
}
.admin-msg.error {
  background: var(--coral-50);
  color: var(--coral);
}

/* Botón peligro */
.btn-danger {
  background: var(--coral);
  color: #fff;
}
.btn-danger:hover {
  background: #c8473d;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(15, 30, 40, 0.45);
  backdrop-filter: blur(3px);
  animation: fade-in 0.15s ease;
}
.modal-card {
  width: 100%;
  max-width: 480px;
  background: #fff;
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-lg, 0 20px 50px rgba(0, 0, 0, 0.25));
  overflow: hidden;
  animation: pop-in 0.18s cubic-bezier(0.2, 0.8, 0.3, 1);
}
.modal-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 22px 0;
}
.modal-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  flex: none;
  color: #fff;
  background: linear-gradient(135deg, var(--teal), #14b8a6);
}
.modal-icon.peligro {
  background: linear-gradient(135deg, var(--coral), #f08a82);
}
.modal-head h2 {
  font-size: 1.05rem;
  line-height: 1.25;
}
.modal-body {
  padding: 14px 22px 4px;
}
.modal-body p {
  font-size: 0.9rem;
  color: var(--ink-soft);
  line-height: 1.55;
}
.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 18px 22px;
}
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes pop-in {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@media (max-width: 640px) {
  .admin-acciones {
    grid-template-columns: 1fr;
  }
}
</style>
