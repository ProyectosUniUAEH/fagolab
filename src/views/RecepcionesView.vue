<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import { useLabStore } from '../stores/lab'
import { useAuthStore } from '../stores/auth'
import type { Recepcion } from '../data/types'

const lab = useLabStore()
const auth = useAuthStore()
const router = useRouter()
const pecesDeRecepcion = (id: string) => lab.state.peces.filter((p) => p.idRecepcion === id).length

// Fecha legible: "2026-06-13" -> "13 jun 2026"
const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
function fechaBonita(iso: string) {
  if (!iso) return ''
  const p = iso.split('-')
  if (p.length < 3) return iso
  return `${parseInt(p[2], 10)} ${meses[parseInt(p[1], 10) - 1] ?? ''} ${p[0]}`
}
// % de peces procesados respecto a los declarados (0 si no hay declarados).
function pctProcesados(r: { id: string; cantidadPeces: number }) {
  if (!r.cantidadPeces || r.cantidadPeces <= 0) return 0
  return Math.min(100, Math.round((pecesDeRecepcion(r.id) / r.cantidadPeces) * 100))
}

// --- Modal "Nueva recepción" ---
const modalAbierto = ref(false)
const guardando = ref(false)
const errorMsg = ref('')

const hoy = new Date().toISOString().slice(0, 10)

const form = reactive({
  fecha: hoy,
  origen: '',
  especie: 'Tilapia',
  cientifico: 'Oreochromis niloticus',
  cantidadPeces: 1,
  motivo: '',
})

// Cuando trae un id, el modal está editando esa recepción; si es null, crea una nueva.
const editandoId = ref<string | null>(null)

function abrirModal() {
  errorMsg.value = ''
  editandoId.value = null
  form.fecha = hoy
  form.origen = ''
  form.especie = 'Tilapia'
  form.cientifico = 'Oreochromis niloticus'
  form.cantidadPeces = 1
  form.motivo = ''
  modalAbierto.value = true
}

function abrirEdicion(r: Recepcion) {
  errorMsg.value = ''
  editandoId.value = r.id
  form.fecha = r.fecha
  form.origen = r.origen
  form.especie = r.especie
  form.cientifico = r.cientifico
  form.cantidadPeces = r.cantidadPeces
  form.motivo = r.motivo ?? ''
  modalAbierto.value = true
}

function cerrarModal() {
  if (guardando.value) return
  modalAbierto.value = false
}

async function guardar() {
  errorMsg.value = ''
  if (!form.fecha) {
    errorMsg.value = 'La fecha es obligatoria.'
    return
  }
  if (!form.origen.trim()) {
    errorMsg.value = 'El origen es obligatorio.'
    return
  }
  if (!form.cantidadPeces || form.cantidadPeces < 1) {
    errorMsg.value = 'La cantidad de peces debe ser al menos 1.'
    return
  }
  guardando.value = true
  try {
    const datos = {
      fecha: form.fecha,
      origen: form.origen.trim(),
      especie: form.especie.trim(),
      cientifico: form.cientifico.trim(),
      cantidadPeces: form.cantidadPeces,
      motivo: form.motivo.trim(),
    }
    if (editandoId.value) await lab.actualizarRecepcion(editandoId.value, datos)
    else await lab.crearRecepcion(datos)
    modalAbierto.value = false
  } catch (e) {
    errorMsg.value =
      e instanceof Error ? e.message : `No se pudo ${editandoId.value ? 'actualizar' : 'crear'} la recepción.`
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <div class="page-head">
    <div>
      <h1>Recepciones de lote</h1>
      <p class="sub">Llegada de lotes de peces desde granjas y unidades de cultivo.</p>
    </div>
    <div class="actions">
      <button v-if="auth.can('recepciones.records.create')" class="btn btn-primary" @click="abrirModal"><Icon name="plus" :size="16" /> Nueva recepción</button>
    </div>
  </div>

  <div class="rec-grid">
    <article v-for="(r, i) in lab.state.recepciones" :key="r.id" class="rec-card" :class="'acc-' + (i % 5)">
      <header class="rec-head">
        <div class="rec-avatar"><Icon name="fish" :size="20" /></div>
        <div class="rec-id">
          <span class="rec-codigo">{{ r.codigo }}</span>
          <span class="rec-fecha">{{ fechaBonita(r.fecha) }}</span>
        </div>
        <span class="rec-estado" :class="'st-' + (r.estado || 'abierto')">
          <span class="dot"></span>{{ r.estado }}
        </span>
      </header>

      <dl class="rec-rows">
        <div class="rec-row">
          <dt><Icon name="fish" :size="14" /> Especie</dt>
          <dd>{{ r.especie }} <i v-if="r.cientifico" class="sci">{{ r.cientifico }}</i></dd>
        </div>
        <div class="rec-row">
          <dt><Icon name="wave" :size="14" /> Origen</dt>
          <dd>{{ r.origen || '—' }}</dd>
        </div>
        <div class="rec-row">
          <dt><Icon name="report" :size="14" /> Motivo</dt>
          <dd>{{ r.motivo || '—' }}</dd>
        </div>
        <div class="rec-row">
          <dt><Icon name="activity" :size="14" /> Procesados</dt>
          <dd class="rec-proc">
            <span v-if="r.cantidadPeces > 0" class="rec-bar">
              <span class="rec-bar-fill" :style="{ width: pctProcesados(r) + '%' }"></span>
            </span>
            <span class="rec-frac">{{ pecesDeRecepcion(r.id) }}<span class="sep">de</span>{{ r.cantidadPeces }} peces</span>
          </dd>
        </div>
      </dl>

      <div class="rec-acciones">
        <button v-if="auth.can('aislamiento.workflow.create')" class="rec-cta" @click="router.push({ path: '/aislamiento', query: { recepcion: r.id } })">
          <Icon name="plus" :size="15" /> Registrar aislamiento
        </button>
        <button v-if="auth.can('recepciones.records.update')" class="rec-editar" title="Editar recepción" @click="abrirEdicion(r)">
          <Icon name="edit" :size="15" />
        </button>
      </div>
    </article>

    <div v-if="!lab.state.recepciones.length" class="rec-empty">
      <div class="rec-avatar lg"><Icon name="fish" :size="28" /></div>
      <p>Aún no hay recepciones registradas.</p>
      <button v-if="auth.can('recepciones.records.create')" class="rec-cta solid" @click="abrirModal"><Icon name="plus" :size="16" /> Crear la primera recepción</button>
    </div>
  </div>

  <!-- Modal: Nueva recepción -->
  <Teleport to="body">
    <div v-if="modalAbierto" class="modal-overlay" @click.self="cerrarModal">
      <div class="modal-card" role="dialog" aria-modal="true" aria-label="Nueva recepción">
        <div class="modal-head">
          <div class="modal-icon"><Icon name="fish" :size="20" /></div>
          <div>
            <h2>{{ editandoId ? 'Editar recepción' : 'Nueva recepción de lote' }}</h2>
            <p class="sub">
              {{ editandoId ? 'Corrige los datos del lote ya registrado.' : 'Registra la llegada de un lote de peces.' }}
            </p>
          </div>
          <button class="modal-close" @click="cerrarModal" aria-label="Cerrar">&times;</button>
        </div>

        <div class="modal-body">
          <div class="grid cols-2" style="gap: 12px">
            <div class="field">
              <label>Fecha de recepción <span class="req">*</span></label>
              <input type="date" v-model="form.fecha" />
            </div>
            <div class="field">
              <label>Cantidad de peces <span class="req">*</span></label>
              <input type="number" min="1" v-model.number="form.cantidadPeces" />
            </div>
            <div class="field" style="grid-column: 1/-1">
              <label>Origen (granja / unidad de cultivo) <span class="req">*</span></label>
              <input v-model="form.origen" placeholder="p. ej. Granja Bv, Unidad Re…" />
            </div>
            <div class="field">
              <label>Especie</label>
              <input v-model="form.especie" placeholder="Tilapia" />
            </div>
            <div class="field">
              <label>Nombre científico</label>
              <input v-model="form.cientifico" placeholder="Oreochromis niloticus" />
            </div>
            <div class="field" style="grid-column: 1/-1">
              <label>Motivo del envío</label>
              <input v-model="form.motivo" placeholder="p. ej. Muestreo 6, mortalidad, monitoreo…" />
            </div>
          </div>

          <p v-if="errorMsg" class="error-msg"><Icon name="shield" :size="14" /> {{ errorMsg }}</p>
        </div>

        <div class="modal-foot">
          <button class="btn btn-ghost" @click="cerrarModal" :disabled="guardando">Cancelar</button>
          <button class="btn btn-primary" @click="guardar" :disabled="guardando">
            <Icon name="check" :size="16" />
            {{ guardando ? 'Guardando…' : editandoId ? 'Guardar cambios' : 'Crear recepción' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* ---------- Tarjetas de recepción (estilo Notion, ligero) ---------- */
/* Acentos pastel que rotan por tarjeta: menta · cielo · lila · durazno · rosa */
.acc-0 { --a-bg: #ddf3ec; --a-fg: #0e8d7e; --a-mid: #6fd0bc; }
.acc-1 { --a-bg: #e3eefb; --a-fg: #3074bf; --a-mid: #93bdeb; }
.acc-2 { --a-bg: #ece7fb; --a-fg: #6f56c4; --a-mid: #b3aae8; }
.acc-3 { --a-bg: #fcecdf; --a-fg: #c46a26; --a-mid: #f1ad82; }
.acc-4 { --a-bg: #fbe8ef; --a-fg: #bd5380; --a-mid: #ed9cbb; }

.rec-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}
.rec-card {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 16px 18px;
  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
}
.rec-card:hover {
  transform: translateY(-2px);
  border-color: #cfe3e0;
  box-shadow: 0 8px 24px rgba(15, 36, 56, 0.07);
}

/* Cabecera: avatar + código + estado */
.rec-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}
.rec-avatar {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  flex-shrink: 0;
  color: var(--a-fg, var(--teal-600));
  background: var(--a-bg, var(--teal-50));
}
.rec-avatar.lg {
  width: 56px;
  height: 56px;
  border-radius: 16px;
}
.rec-id {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.rec-codigo {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--ink);
  letter-spacing: 0.01em;
}
.rec-fecha {
  font-size: 0.78rem;
  color: var(--muted);
}
.rec-estado {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 11px;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 700;
  text-transform: capitalize;
}
.rec-estado .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}
.st-abierto {
  background: var(--teal-50);
  color: var(--teal-600);
}
.st-cerrado,
.st-cerrada {
  background: #eef1f5;
  color: var(--muted);
}

/* Filas etiqueta-valor */
.rec-rows {
  margin: 12px 0 0;
}
.rec-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 9px 0;
  border-top: 1px solid var(--line-soft);
}
.rec-row dt {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 96px;
  font-size: 0.78rem;
  color: var(--muted);
}
.rec-row dt svg {
  color: var(--a-fg, var(--teal-600));
  opacity: 0.75;
}
.rec-row dd {
  margin: 0;
  flex: 1;
  font-size: 0.86rem;
  color: var(--ink);
  min-width: 0;
}
.rec-row .sci {
  color: var(--muted);
  font-style: italic;
}

/* Procesados: barra + fracción */
.rec-proc {
  display: flex;
  align-items: center;
  gap: 10px;
}
.rec-bar {
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: var(--line-soft);
  overflow: hidden;
  max-width: 130px;
}
.rec-bar-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--a-mid, #5dcaa5);
  transition: width 0.3s ease;
}
.rec-frac {
  font-size: 0.8rem;
  color: var(--ink-soft);
  white-space: nowrap;
}
.rec-frac .sep {
  margin: 0 4px;
  color: var(--muted);
  font-size: 0.74rem;
}

/* Botón ligero (no pesado) */
.rec-acciones {
  display: flex;
  gap: 8px;
  align-items: stretch;
}
.rec-acciones .rec-cta { flex: 1; }
.rec-editar {
  margin-top: 14px;
  display: grid;
  place-items: center;
  width: 40px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: #fff;
  color: var(--muted);
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease;
}
.rec-editar:hover {
  border-color: var(--a-fg, var(--teal-600));
  color: var(--a-fg, var(--teal-600));
}
.rec-cta {
  margin-top: 14px;
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 9px 14px;
  border: 1px solid transparent;
  border-radius: 11px;
  background: var(--a-bg, var(--teal-50));
  color: var(--a-fg, var(--teal-600));
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}
.rec-cta:hover {
  background: var(--a-fg, var(--teal-600));
  color: #fff;
}
.rec-cta.solid {
  width: auto;
  background: var(--teal-600);
  border-color: var(--teal-600);
  color: #fff;
}
.rec-cta.solid:hover {
  background: var(--teal);
}

/* Estado vacío */
.rec-empty {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  text-align: center;
  color: var(--muted);
  padding: 48px 20px;
  background: #fff;
  border: 1px dashed var(--line);
  border-radius: 16px;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(15, 30, 40, 0.42);
  backdrop-filter: blur(3px);
  animation: fade-in 0.15s ease;
}
.modal-card {
  width: 100%;
  max-width: 560px;
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
  padding: 20px 22px;
  border-bottom: 1px solid var(--line, #e8eef0);
}
.modal-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  flex-shrink: 0;
  color: #fff;
  background: linear-gradient(135deg, var(--teal, #0f766e), #14b8a6);
}
.modal-head h2 {
  font-size: 1.1rem;
  line-height: 1.2;
}
.modal-head .sub {
  font-size: 0.82rem;
}
.modal-close {
  margin-left: auto;
  align-self: flex-start;
  border: none;
  background: transparent;
  font-size: 1.6rem;
  line-height: 1;
  color: var(--muted);
  cursor: pointer;
  padding: 0 4px;
}
.modal-close:hover {
  color: var(--ink);
}
.modal-body {
  padding: 20px 22px;
}
.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 22px;
  border-top: 1px solid var(--line, #e8eef0);
  background: var(--bg-soft, #f8fafb);
}
.error-msg {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 14px;
  font-size: 0.85rem;
  color: var(--coral, #d6443a);
}
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes pop-in {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@media (max-width: 560px) {
  .modal-body .grid.cols-2 {
    grid-template-columns: 1fr;
  }
}
</style>
