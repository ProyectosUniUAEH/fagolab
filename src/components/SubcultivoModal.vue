<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import Icon from './Icon.vue'
import { useLabStore } from '../stores/lab'
import { useAuthStore } from '../stores/auth'
import { MEDIOS, COLORES_COLONIA } from '../data/catalogs'
import type { CajaPetri } from '../data/types'

const props = defineProps<{ abierto: boolean; caja: CajaPetri | null }>()
const emit = defineEmits<{ cerrar: []; guardado: [n: number] }>()

const lab = useLabStore()
const auth = useAuthStore()

const formaOpts = ['circular', 'irregular', 'filamentosa', 'puntiforme', 'fusiforme']
const texturaOpts = ['cremosa', 'mucoide', 'seca', 'rugosa', 'membranosa']
const purezaOpts = ['puro', 'pendiente', 'descartado']
// Letras de morfotipo: A, B, C… una por colonia distinta observada en la placa.
const letra = (i: number) => String.fromCharCode(65 + i)

interface Fila {
  morfotipo: string
  color: string
  forma: string
  textura: string
  resultadoPureza: string
  aptoExtraccion: boolean
}

function filaNueva(i: number): Fila {
  return { morfotipo: letra(i), color: '', forma: '', textura: '', resultadoPureza: 'puro', aptoExtraccion: true }
}

const comun = reactive({ medio: 'TSA', fechaSiembra: new Date().toISOString().slice(0, 10) })
const filas = ref<Fila[]>([filaNueva(0)])
const guardando = ref(false)
const errorMsg = ref('')

// Cada vez que se abre, empieza limpio y hereda el medio de la caja de origen.
watch(
  () => props.abierto,
  (abierto) => {
    if (!abierto) return
    filas.value = [filaNueva(0)]
    comun.medio = props.caja?.medio || 'TSA'
    comun.fechaSiembra = new Date().toISOString().slice(0, 10)
    errorMsg.value = ''
  },
)

function agregarFila() {
  filas.value.push(filaNueva(filas.value.length))
}

function quitarFila(i: number) {
  filas.value.splice(i, 1)
}

async function guardar() {
  if (!props.caja || guardando.value) return
  if (!filas.value.length) {
    errorMsg.value = 'Agrega al menos un morfotipo.'
    return
  }
  guardando.value = true
  errorMsg.value = ''
  try {
    const res = await lab.crearSubcultivos(props.caja.id, {
      medio: comun.medio,
      fechaSiembra: comun.fechaSiembra,
      subcultivos: filas.value.map((f) => ({ ...f })),
    })
    emit('guardado', res.creados.length)
    emit('cerrar')
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : String(e)
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="abierto" class="modal-overlay" @click.self="emit('cerrar')">
      <div class="modal-card ancho" role="dialog" aria-modal="true" aria-label="Registrar subcultivos">
        <div class="modal-head">
          <div class="modal-icon"><Icon name="microscope" :size="20" /></div>
          <div>
            <h2>Registrar subcultivos</h2>
            <p class="sub">Caja de origen: <b>{{ caja?.codigo }}</b> · una fila por colonia seleccionada.</p>
          </div>
          <button class="modal-close" @click="emit('cerrar')" aria-label="Cerrar">&times;</button>
        </div>

        <div class="modal-body">
          <div class="grid cols-2" style="gap: 12px; margin-bottom: 16px">
            <div class="field">
              <label>Medio de resiembra</label>
              <select v-model="comun.medio">
                <option v-for="m in MEDIOS" :key="m.nombre" :value="m.nombre">{{ m.nombre }}</option>
              </select>
            </div>
            <div class="field">
              <label>Fecha de siembra</label>
              <input type="date" v-model="comun.fechaSiembra" />
            </div>
          </div>

          <div class="tabla-wrap">
            <table class="sub-tabla">
              <thead>
                <tr>
                  <th style="width: 34px">#</th>
                  <th style="width: 92px">Morfotipo</th>
                  <th>Color</th>
                  <th>Forma</th>
                  <th>Textura</th>
                  <th style="width: 110px">Pureza</th>
                  <th style="width: 74px">Apto</th>
                  <th style="width: 36px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(f, i) in filas" :key="i">
                  <td class="num">{{ i + 1 }}</td>
                  <td><input v-model="f.morfotipo" class="mini" maxlength="4" /></td>
                  <td>
                    <input v-model="f.color" class="mini" list="colores-colonia" placeholder="—" />
                  </td>
                  <td>
                    <select v-model="f.forma" class="mini">
                      <option value="">—</option>
                      <option v-for="o in formaOpts" :key="o" :value="o">{{ o }}</option>
                    </select>
                  </td>
                  <td>
                    <select v-model="f.textura" class="mini">
                      <option value="">—</option>
                      <option v-for="o in texturaOpts" :key="o" :value="o">{{ o }}</option>
                    </select>
                  </td>
                  <td>
                    <select v-model="f.resultadoPureza" class="mini">
                      <option v-for="o in purezaOpts" :key="o" :value="o">{{ o }}</option>
                    </select>
                  </td>
                  <td class="centro">
                    <input type="checkbox" v-model="f.aptoExtraccion" />
                  </td>
                  <td>
                    <button
                      class="quitar"
                      :disabled="filas.length === 1"
                      title="Quitar morfotipo"
                      @click="quitarFila(i)"
                    >
                      <Icon name="close" :size="13" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <datalist id="colores-colonia">
            <option v-for="c in COLORES_COLONIA" :key="c" :value="c" />
          </datalist>

          <button class="btn btn-sm agregar" @click="agregarFila">
            <Icon name="plus" :size="14" /> Agregar morfotipo
          </button>

          <p v-if="errorMsg" class="error-msg"><Icon name="shield" :size="14" /> {{ errorMsg }}</p>
        </div>

        <div class="modal-foot">
          <button class="btn btn-ghost" :disabled="guardando" @click="emit('cerrar')">Cancelar</button>
          <button v-if="auth.can('subcultivos.records.create')" class="btn btn-primary" :disabled="guardando" @click="guardar">
            <Icon name="check" :size="16" />
            {{ guardando ? 'Guardando…' : `Guardar ${filas.length} subcultivo${filas.length === 1 ? '' : 's'}` }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
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
  background: #fff;
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-lg, 0 20px 50px rgba(0, 0, 0, 0.25));
  overflow: hidden;
  animation: pop-in 0.18s cubic-bezier(0.2, 0.8, 0.3, 1);
}
.modal-card.ancho { max-width: 860px; }
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
.modal-head h2 { font-size: 1.1rem; line-height: 1.2; }
.modal-head .sub { font-size: 0.82rem; }
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
.modal-close:hover { color: var(--ink); }
.modal-body { padding: 20px 22px; }
.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 22px;
  border-top: 1px solid var(--line, #e8eef0);
  background: var(--bg-soft, #f8fafb);
}

.tabla-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 12px; }
.sub-tabla { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.sub-tabla th {
  padding: 9px 8px;
  text-align: left;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
  background: var(--bg);
  border-bottom: 1px solid var(--line);
  white-space: nowrap;
}
.sub-tabla td { padding: 6px 8px; border-bottom: 1px solid var(--line-soft); }
.sub-tabla tr:last-child td { border-bottom: none; }
.sub-tabla .num { color: var(--muted); font-weight: 700; text-align: center; }
.sub-tabla .centro { text-align: center; }
.mini {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--line);
  border-radius: 8px;
  font-size: 0.82rem;
  background: #fff;
}
.mini:focus { border-color: var(--teal); outline: none; }
.quitar {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: #fff;
  color: var(--muted);
  cursor: pointer;
}
.quitar:hover:not(:disabled) { border-color: var(--coral); color: var(--coral); }
.quitar:disabled { opacity: 0.4; cursor: not-allowed; }
.agregar { margin-top: 12px; }
.error-msg {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 14px;
  font-size: 0.85rem;
  color: var(--coral, #d6443a);
}

@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes pop-in {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
