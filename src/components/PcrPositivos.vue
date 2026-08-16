<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import Icon from './Icon.vue'
import { useLabStore } from '../stores/lab'
import { useAuthStore } from '../stores/auth'

/* ------------------------------------------------------------------ *
 * Caja de positivos: los tubos apartados que dan positivo y sirven de
 * control + en cada PCR. Se ven como una caja de tubos; se marca cuándo
 * uno se agota (recordatorio para repetir la extracción).
 * ------------------------------------------------------------------ */

const lab = useLabStore()
const auth = useAuthStore()

const disponibles = computed(() => lab.state.positivos.filter((p) => p.estado === 'disponible'))
const agotados = computed(() => lab.state.positivos.filter((p) => p.estado === 'agotado'))

// ---- Alta de un positivo ----
const mostrarForm = ref(false)
const form = reactive({
  etiqueta: '',
  organismo: '',
  descripcion: '',
  concentracionNgUl: null as number | null,
  ubicacion: '',
  codigoVial: '',
})
const guardando = ref(false)
const error = ref<string | null>(null)

function resetForm() {
  form.etiqueta = ''
  form.organismo = ''
  form.descripcion = ''
  form.concentracionNgUl = null
  form.ubicacion = ''
  form.codigoVial = ''
}

async function agregar() {
  if (!form.etiqueta.trim()) {
    error.value = 'Ponle al menos una etiqueta al tubo.'
    return
  }
  guardando.value = true
  error.value = null
  try {
    await lab.crearControlPositivo({
      etiqueta: form.etiqueta.trim(),
      organismo: form.organismo.trim() || undefined,
      descripcion: form.descripcion.trim() || undefined,
      concentracionNgUl: form.concentracionNgUl,
      ubicacion: form.ubicacion.trim() || undefined,
      codigoVial: form.codigoVial.trim() || undefined,
    })
    resetForm()
    mostrarForm.value = false
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    guardando.value = false
  }
}

async function marcarAgotado(id: string) {
  await lab.actualizarControlPositivo(id, { estado: 'agotado' })
}
async function reactivar(id: string) {
  await lab.actualizarControlPositivo(id, { estado: 'disponible' })
}
</script>

<template>
  <div class="info-banner amber" style="margin-bottom: 18px">
    <Icon name="shield" :size="16" />
    <span>
      Aquí viven tus <b>controles positivos</b>: los tubos que ya sabes que dan positivo y reutilizas
      como control + en cada PCR. Cuando uno se acabe, márcalo <b>agotado</b> para acordarte de repetir la extracción.
    </span>
  </div>

  <div class="pos-head">
    <div class="counts">
      <span class="pill ok"><b>{{ disponibles.length }}</b> disponibles</span>
      <span class="pill off"><b>{{ agotados.length }}</b> agotados</span>
    </div>
    <button v-if="auth.can('pcr.controls.manage')" class="btn btn-primary" @click="mostrarForm = !mostrarForm">
      <Icon name="plus" :size="15" /> Agregar positivo
    </button>
  </div>

  <!-- Form de alta -->
  <div v-if="mostrarForm" class="card add-card">
    <div class="card-head"><div class="ic"><Icon name="plus" :size="16" /></div><h3>Nuevo control positivo</h3></div>
    <div class="card-pad add-grid">
      <div class="field">
        <label>Etiqueta del tubo *</label>
        <input v-model="form.etiqueta" placeholder="P-Aeromonas ZZ1" />
      </div>
      <div class="field">
        <label>Organismo / cepa</label>
        <input v-model="form.organismo" placeholder="Aeromonas hydrophila" />
      </div>
      <div class="field">
        <label>Ubicación en la caja</label>
        <input v-model="form.ubicacion" placeholder="Caja positivos · A1" />
      </div>
      <div class="field">
        <label>Concentración (ng/µL)</label>
        <input type="number" step="0.1" min="0" v-model.number="form.concentracionNgUl" placeholder="85.4" />
      </div>
      <div class="field">
        <label>Vial del sistema (opcional)</label>
        <input v-model="form.codigoVial" placeholder="F123 / VIAL-…" />
      </div>
      <div class="field full">
        <label>Notas</label>
        <input v-model="form.descripcion" placeholder="De dónde salió, lote original, etc." />
      </div>
      <div class="add-actions full">
        <button class="btn btn-primary" :disabled="guardando" @click="agregar">
          <Icon name="save" :size="15" /> {{ guardando ? 'Guardando…' : 'Guardar en la caja' }}
        </button>
        <button class="btn" @click="mostrarForm = false">Cancelar</button>
        <span v-if="error" class="err">{{ error }}</span>
      </div>
    </div>
  </div>

  <!-- Caja: disponibles -->
  <div class="section-title" style="margin: 6px 0 12px"><Icon name="shield" :size="16" /> Disponibles</div>
  <div v-if="!disponibles.length" class="empty" style="padding: 26px">
    Tu caja está vacía. Agrega los tubos que usas como control positivo.
  </div>
  <div v-else class="tube-grid">
    <div v-for="cp in disponibles" :key="cp.id" class="tube">
      <div class="tube-top">
        <span class="cap" />
        <span class="badge b-amber">{{ cp.codigo }}</span>
      </div>
      <h4 :title="cp.etiqueta">{{ cp.etiqueta }}</h4>
      <p v-if="cp.organismo" class="org">{{ cp.organismo }}</p>
      <dl>
        <div v-if="cp.ubicacion"><dt>Ubicación</dt><dd>{{ cp.ubicacion }}</dd></div>
        <div v-if="cp.concentracionNgUl != null"><dt>Conc.</dt><dd>{{ cp.concentracionNgUl }} ng/µL</dd></div>
        <div><dt>Usado</dt><dd>{{ cp.vecesUsado }}×</dd></div>
      </dl>
      <button v-if="auth.can('pcr.controls.manage')" class="btn btn-sm btn-ghost-coral" @click="marcarAgotado(cp.id)">
        <Icon name="bell" :size="14" /> Marcar agotado
      </button>
    </div>
  </div>

  <!-- Caja: agotados -->
  <template v-if="agotados.length">
    <div class="section-title" style="margin: 22px 0 12px"><Icon name="bell" :size="16" /> Agotados · repetir extracción</div>
    <div class="tube-grid">
      <div v-for="cp in agotados" :key="cp.id" class="tube spent">
        <div class="tube-top">
          <span class="cap" />
          <span class="badge b-coral">agotado</span>
        </div>
        <h4 :title="cp.etiqueta">{{ cp.etiqueta }}</h4>
        <p v-if="cp.organismo" class="org">{{ cp.organismo }}</p>
        <dl>
          <div v-if="cp.fechaAgotado"><dt>Agotado</dt><dd>{{ cp.fechaAgotado }}</dd></div>
          <div><dt>Usado</dt><dd>{{ cp.vecesUsado }}×</dd></div>
        </dl>
        <button v-if="auth.can('pcr.controls.manage')" class="btn btn-sm" @click="reactivar(cp.id)">
          <Icon name="check" :size="14" /> Reactivar
        </button>
      </div>
    </div>
  </template>
</template>

<style scoped>
.pos-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.counts {
  display: flex;
  gap: 10px;
}
.pill {
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 0.84rem;
  font-weight: 600;
  background: var(--line-soft);
  color: var(--ink-soft);
}
.pill b {
  font-family: "Sora", sans-serif;
}
.pill.ok {
  background: var(--teal-50);
  color: var(--teal-600);
}
.pill.off {
  background: var(--coral-50);
  color: var(--coral);
}

.add-card {
  margin-bottom: 20px;
}
.add-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 14px;
}
.add-grid .full {
  grid-column: 1 / -1;
}
@media (max-width: 760px) {
  .add-grid {
    grid-template-columns: 1fr;
  }
}
.add-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.err {
  color: var(--coral);
  font-size: 0.84rem;
  font-weight: 600;
}

.tube-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 14px;
}
.tube {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 14px;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: transform 0.12s, box-shadow 0.12s;
}
.tube:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow);
}
.tube.spent {
  opacity: 0.72;
  background: var(--line-soft);
}
.tube-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.cap {
  width: 26px;
  height: 12px;
  border-radius: 4px 4px 2px 2px;
  background: linear-gradient(180deg, var(--amber), var(--amber-600, #d98a00));
}
.tube.spent .cap {
  background: var(--line);
}
.tube h4 {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tube .org {
  font-size: 0.78rem;
  font-style: italic;
  color: var(--muted);
  margin: -4px 0 0;
}
.tube dl {
  display: grid;
  gap: 3px;
  margin: 2px 0 6px;
}
.tube dl div {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
}
.tube dt {
  color: var(--muted);
}
.tube dd {
  font-weight: 600;
  color: var(--ink-soft);
}
.btn-ghost-coral {
  color: var(--coral);
  border-color: var(--coral-50);
}
.btn-ghost-coral:hover {
  background: var(--coral-50);
}
</style>
