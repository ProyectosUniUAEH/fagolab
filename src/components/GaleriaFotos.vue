<script setup lang="ts">
// Galería de fotos de un objeto del laboratorio (pez, caja, subcultivo, gel...).
// Lee las imágenes ya vinculadas por código y permite subir varias de una vez.
import { ref, watch } from 'vue'
import Icon from './Icon.vue'
import { api } from '../api'
import { useLabStore } from '../stores/lab'
import { useAuthStore } from '../stores/auth'

const props = withDefaults(
  defineProps<{
    codigo: string // código del objeto (CP-…, SUB-…, PEZ-…)
    rol?: string // rol del vínculo en media_vinculos
    titulo?: string
    vacioTexto?: string
  }>(),
  { rol: 'evidencia', titulo: 'Fotografía / evidencia', vacioTexto: 'Aún no hay fotos. Agrega una para documentar.' },
)

const emit = defineEmits<{ cambio: [n: number] }>()

const lab = useLabStore()
const auth = useAuthStore()

interface Media {
  id: string
  storageUri: string
  rol: string
  esPrincipal: boolean
}

const fotos = ref<Media[]>([])
const cargando = ref(false)
const subiendo = ref(false)
const error = ref('')
const ampliada = ref<string | null>(null)

const urlDe = (m: Media) => api.mediaUrl(m.storageUri)

async function cargar() {
  if (!props.codigo) {
    fotos.value = []
    return
  }
  cargando.value = true
  error.value = ''
  try {
    fotos.value = await api.get<Media[]>(`/api/media/objeto/${encodeURIComponent(props.codigo)}`)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    cargando.value = false
  }
}

watch(() => props.codigo, cargar, { immediate: true })

async function onArchivos(e: Event) {
  const input = e.target as HTMLInputElement
  const archivos = Array.from(input.files ?? [])
  input.value = ''
  if (!archivos.length || !props.codigo) return

  subiendo.value = true
  error.value = ''
  let fallidas = 0
  for (const [i, f] of archivos.entries()) {
    try {
      // La primera foto de un objeto sin fotos queda como principal.
      const principal = fotos.value.length === 0 && i === 0
      await api.upload(f, props.codigo, props.rol, principal)
    } catch {
      fallidas++
    }
  }
  await cargar()
  // Refresca el estado global para que las vistas muestren la miniatura.
  await lab.load()
  subiendo.value = false
  if (fallidas) error.value = `${fallidas} de ${archivos.length} fotos no se pudieron subir.`
  emit('cambio', fotos.value.length)
}

const borrandoId = ref<string | null>(null)

async function borrarFoto(m: Media) {
  if (borrandoId.value) return
  if (!confirm('¿Borrar esta foto? No se puede deshacer.')) return
  borrandoId.value = m.id
  error.value = ''
  try {
    await api.del(`/api/media/${m.id}`)
    await cargar()
    await lab.load()
    emit('cambio', fotos.value.length)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    borrandoId.value = null
  }
}
</script>

<template>
  <div class="gal">
    <div class="gal-head">
      <span class="gal-ic"><Icon name="image" :size="15" /></span>
      <span>{{ titulo }}</span>
      <span v-if="fotos.length" class="badge b-slate">{{ fotos.length }}</span>
      <label v-if="auth.can('media.files.create')" class="gal-btn" :class="{ off: subiendo }">
        <Icon name="upload" :size="14" />
        {{ subiendo ? 'Subiendo…' : 'Agregar foto' }}
        <input type="file" accept="image/*" multiple :disabled="subiendo" @change="onArchivos" />
      </label>
    </div>

    <p v-if="error" class="gal-error"><Icon name="shield" :size="14" /> {{ error }}</p>

    <div v-if="cargando" class="gal-vacio">Cargando fotos…</div>

    <div v-else-if="fotos.length" class="gal-grid">
      <div v-for="f in fotos" :key="f.id" class="gal-item">
        <button class="gal-abrir" @click="ampliada = urlDe(f)">
          <img :src="urlDe(f)" alt="" loading="lazy" />
        </button>
        <span v-if="f.esPrincipal" class="gal-principal">Principal</span>
        <button v-if="auth.can('media.files.delete')" class="gal-borrar" :disabled="borrandoId === f.id" title="Borrar foto" @click.stop="borrarFoto(f)">
          <Icon name="close" :size="12" />
        </button>
      </div>
    </div>

    <div v-else class="gal-vacio">
      <Icon name="image" :size="24" />
      <p>{{ vacioTexto }}</p>
    </div>

    <!-- Vista ampliada -->
    <Teleport to="body">
      <div v-if="ampliada" class="gal-lightbox" @click="ampliada = null">
        <img :src="ampliada" alt="" />
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.gal-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-weight: 700;
  font-size: 0.86rem;
  color: var(--ink);
}
.gal-ic {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: var(--blue-50);
  color: var(--blue);
}
.gal-btn {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: 9px;
  border: 1px solid var(--line);
  background: #fff;
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--ink-soft);
  cursor: pointer;
}
.gal-btn:hover { border-color: var(--teal); color: var(--teal); }
.gal-btn.off { opacity: 0.6; cursor: default; }
.gal-btn input { display: none; }

.gal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  gap: 8px;
}
.gal-item {
  position: relative;
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: hidden;
  aspect-ratio: 1;
  background: var(--bg);
}
.gal-abrir { display: block; width: 100%; height: 100%; padding: 0; border: none; background: none; cursor: zoom-in; }
.gal-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
.gal-borrar {
  position: absolute;
  top: 4px;
  right: 4px;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: rgba(15, 36, 56, 0.62);
  color: #fff;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
}
.gal-item:hover .gal-borrar { opacity: 1; }
.gal-borrar:hover { background: var(--coral); }
.gal-borrar:disabled { opacity: 0.5; }
.gal-principal {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  padding: 2px 0;
  text-align: center;
  font-size: 0.58rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #fff;
  background: var(--teal);
}
.gal-vacio {
  display: grid;
  place-items: center;
  gap: 6px;
  padding: 20px;
  border: 1px dashed var(--line);
  border-radius: 12px;
  color: var(--muted);
  font-size: 0.78rem;
  text-align: center;
}
.gal-error {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 0.78rem;
  color: var(--coral);
}
.gal-lightbox {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: grid;
  place-items: center;
  padding: 32px;
  background: rgba(10, 20, 28, 0.82);
  cursor: zoom-out;
}
.gal-lightbox img {
  max-width: 100%;
  max-height: 100%;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}
</style>
