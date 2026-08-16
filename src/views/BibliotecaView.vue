<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import Icon from '../components/Icon.vue'
import { api, API_BASE } from '../api'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()

interface Documento {
  id: string
  titulo: string
  autores: string
  anio: number | null
  fuente: string
  categoria: string
  notas: string
  doi: string
  archivoUri: string | null
  archivoNombre: string | null
  sizeBytes: number | null
  creadoEn: string
}

// Las tres colecciones que pidió la investigadora.
const CATEGORIAS = [
  { key: 'referencia_doctora', label: 'Referencias de la doctora', icon: 'book', desc: 'Bibliografía que la Dra. ha usado en sus investigaciones.' },
  { key: 'referencia_mi_articulo', label: 'Referencias de mi artículo', icon: 'edit', desc: 'Fuentes del artículo que estoy escribiendo.' },
  { key: 'publicado', label: 'Publicados (doctora y tesistas)', icon: 'check-circle', desc: 'Artículos ya publicados por la Dra. y sus tesistas.' },
] as const

const docs = ref<Documento[]>([])
const cargando = ref(false)
const filtroCat = ref<string>('todas')
const busqueda = ref('')

async function cargar() {
  cargando.value = true
  try {
    docs.value = await api.get<Documento[]>('/api/biblioteca')
  } catch {
    docs.value = []
  } finally {
    cargando.value = false
  }
}
onMounted(cargar)

const filtrados = computed(() => {
  const q = busqueda.value.trim().toLowerCase()
  return docs.value.filter((d) => {
    if (filtroCat.value !== 'todas' && d.categoria !== filtroCat.value) return false
    if (q && ![d.titulo, d.autores, d.fuente, d.notas].join(' ').toLowerCase().includes(q)) return false
    return true
  })
})

const conteo = (cat: string) => docs.value.filter((d) => d.categoria === cat).length
const catLabel = (key: string) => CATEGORIAS.find((c) => c.key === key)?.label ?? key
const catIcon = (key: string) => CATEGORIAS.find((c) => c.key === key)?.icon ?? 'book'

function urlPdf(d: Documento) {
  return d.archivoUri ? (d.archivoUri.startsWith('http') ? d.archivoUri : `${API_BASE}${d.archivoUri}`) : ''
}
function peso(bytes: number | null) {
  if (!bytes) return ''
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// ---- Modal para agregar / editar ----
const modal = ref(false)
const editandoId = ref<string | null>(null)
const guardando = ref(false)
const errorMsg = ref('')
const archivo = ref<File | null>(null)
const form = reactive({
  titulo: '', autores: '', anio: '' as number | string, fuente: '',
  categoria: 'referencia_doctora', doi: '', notas: '',
})

function abrirNuevo() {
  editandoId.value = null
  archivo.value = null
  errorMsg.value = ''
  Object.assign(form, { titulo: '', autores: '', anio: '', fuente: '', categoria: filtroCat.value !== 'todas' ? filtroCat.value : 'referencia_doctora', doi: '', notas: '' })
  modal.value = true
}
function abrirEdicion(d: Documento) {
  editandoId.value = d.id
  archivo.value = null
  errorMsg.value = ''
  Object.assign(form, { titulo: d.titulo, autores: d.autores, anio: d.anio ?? '', fuente: d.fuente, categoria: d.categoria, doi: d.doi, notas: d.notas })
  modal.value = true
}
function onArchivo(e: Event) {
  archivo.value = (e.target as HTMLInputElement).files?.[0] ?? null
}

async function guardar() {
  if (!form.titulo.trim()) { errorMsg.value = 'El título es obligatorio.'; return }
  guardando.value = true
  errorMsg.value = ''
  try {
    if (editandoId.value) {
      // Editar solo cambia los datos (el PDF se conserva).
      await api.patch(`/api/biblioteca/${editandoId.value}`, {
        titulo: form.titulo, autores: form.autores, anio: form.anio,
        fuente: form.fuente, categoria: form.categoria, doi: form.doi, notas: form.notas,
      })
    } else {
      const fd = new FormData()
      fd.append('titulo', form.titulo)
      fd.append('autores', form.autores)
      fd.append('anio', String(form.anio ?? ''))
      fd.append('fuente', form.fuente)
      fd.append('categoria', form.categoria)
      fd.append('doi', form.doi)
      fd.append('notas', form.notas)
      if (archivo.value) fd.append('file', archivo.value)
      const res = await fetch(`${API_BASE}/api/biblioteca`, { method: 'POST', body: fd })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail ?? res.statusText)
    }
    modal.value = false
    await cargar()
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : String(e)
  } finally {
    guardando.value = false
  }
}

async function borrar(d: Documento) {
  if (!confirm(`¿Quitar «${d.titulo}» de la biblioteca? No se puede deshacer.`)) return
  try {
    await api.del(`/api/biblioteca/${d.id}`)
    await cargar()
  } catch {
    /* ignore */
  }
}
</script>

<template>
  <!-- Portada -->
  <section class="bib-hero">
    <div class="bib-hero-glow" />
    <div class="bib-hero-txt">
      <span class="bib-eyebrow"><Icon name="book" :size="14" /> Biblioteca de fagoterapia</span>
      <h1>Bibliografía del laboratorio</h1>
      <p>Artículos y referencias en PDF sobre fagoterapia: lo que la doctora ha usado, las fuentes de tu artículo, y lo ya publicado por el equipo. Todo en un solo lugar, buscable y con sus datos.</p>
      <button v-if="auth.can('biblioteca.documents.create')" class="bib-cta" @click="abrirNuevo"><Icon name="plus" :size="16" /> Agregar referencia</button>
    </div>
    <div class="bib-hero-books">
      <span class="bk b1"></span><span class="bk b2"></span><span class="bk b3"></span><span class="bk b4"></span>
    </div>
  </section>

  <!-- Filtros por categoría -->
  <div class="bib-cats">
    <button class="bib-cat" :class="{ on: filtroCat === 'todas' }" @click="filtroCat = 'todas'">
      <Icon name="layers" :size="18" />
      <div><b>Todas</b><span>{{ docs.length }} referencias</span></div>
    </button>
    <button v-for="c in CATEGORIAS" :key="c.key" class="bib-cat" :class="{ on: filtroCat === c.key }" @click="filtroCat = c.key">
      <Icon :name="c.icon" :size="18" />
      <div><b>{{ c.label }}</b><span>{{ conteo(c.key) }} · {{ c.desc }}</span></div>
    </button>
  </div>

  <!-- Buscador -->
  <div class="bib-search">
    <Icon name="search" :size="16" />
    <input v-model="busqueda" placeholder="Buscar por título, autor o revista…" />
    <span class="bib-count">{{ filtrados.length }} resultado{{ filtrados.length === 1 ? '' : 's' }}</span>
  </div>

  <!-- Lista -->
  <div v-if="cargando" class="bib-vacio">Cargando biblioteca…</div>
  <div v-else-if="!filtrados.length" class="bib-vacio">
    <Icon name="book" :size="34" />
    <p>{{ docs.length ? 'No hay referencias con ese filtro.' : 'Tu biblioteca está vacía.' }}</p>
    <button v-if="auth.can('biblioteca.documents.create')" class="bib-cta" @click="abrirNuevo"><Icon name="plus" :size="16" /> Agregar la primera</button>
  </div>

  <div v-else class="bib-grid">
    <article v-for="d in filtrados" :key="d.id" class="bib-card" :class="d.categoria">
      <div class="bib-card-top">
        <span class="bib-pdf" :class="{ nofile: !d.archivoUri }">
          <Icon :name="d.archivoUri ? 'report' : 'book'" :size="20" />
        </span>
        <span class="bib-tag">{{ catLabel(d.categoria) }}</span>
        <div class="bib-acc">
          <button v-if="auth.can('biblioteca.documents.update')" title="Editar" @click="abrirEdicion(d)"><Icon name="edit" :size="14" /></button>
          <button v-if="auth.can('biblioteca.documents.delete')" title="Quitar" class="del" @click="borrar(d)"><Icon name="close" :size="14" /></button>
        </div>
      </div>
      <h3>{{ d.titulo }}</h3>
      <p v-if="d.autores" class="bib-aut">{{ d.autores }}</p>
      <p class="bib-meta">
        <span v-if="d.fuente">{{ d.fuente }}</span>
        <span v-if="d.anio" class="bib-anio">{{ d.anio }}</span>
      </p>
      <p v-if="d.notas" class="bib-notas">{{ d.notas }}</p>
      <div class="bib-foot">
        <a v-if="d.archivoUri" :href="urlPdf(d)" target="_blank" rel="noopener" class="bib-abrir">
          <Icon name="report" :size="14" /> Abrir PDF <span v-if="d.sizeBytes" class="bib-peso">{{ peso(d.sizeBytes) }}</span>
        </a>
        <span v-else class="bib-sinpdf">Sin PDF adjunto</span>
        <a v-if="d.doi" :href="`https://doi.org/${d.doi}`" target="_blank" rel="noopener" class="bib-doi"><Icon name="link" :size="12" /> DOI</a>
      </div>
    </article>
  </div>

  <!-- Modal agregar / editar -->
  <Teleport to="body">
    <div v-if="modal" class="bib-overlay" @click.self="modal = false">
      <div class="bib-modal" role="dialog" aria-modal="true">
        <div class="bib-mhead">
          <div class="bib-mic"><Icon name="book" :size="20" /></div>
          <div><h2>{{ editandoId ? 'Editar referencia' : 'Agregar referencia' }}</h2>
            <p class="sub">{{ editandoId ? 'Actualiza los datos (el PDF se conserva).' : 'Sube el PDF y sus datos.' }}</p></div>
          <button class="bib-close" @click="modal = false">&times;</button>
        </div>
        <div class="bib-mbody">
          <div class="field"><label>Título <span class="req">*</span></label><input v-model="form.titulo" placeholder="Título del artículo" /></div>
          <div class="grid cols-2" style="gap: 12px">
            <div class="field"><label>Autores</label><input v-model="form.autores" placeholder="Apellido A. et al." /></div>
            <div class="field"><label>Año</label><input type="number" v-model="form.anio" placeholder="2024" /></div>
          </div>
          <div class="grid cols-2" style="gap: 12px">
            <div class="field"><label>Revista / fuente</label><input v-model="form.fuente" placeholder="Scientific Reports" /></div>
            <div class="field"><label>DOI</label><input v-model="form.doi" placeholder="10.1038/..." /></div>
          </div>
          <div class="field">
            <label>Categoría</label>
            <select v-model="form.categoria">
              <option v-for="c in CATEGORIAS" :key="c.key" :value="c.key">{{ c.label }}</option>
            </select>
          </div>
          <div class="field"><label>Notas</label><textarea rows="2" v-model="form.notas" placeholder="Notas opcionales…"></textarea></div>
          <div v-if="!editandoId" class="field">
            <label>Archivo PDF</label>
            <label class="bib-drop">
              <input type="file" accept="application/pdf,.pdf" style="display:none" @change="onArchivo" />
              <Icon name="upload" :size="22" />
              <span>{{ archivo ? archivo.name : 'Haz clic para elegir el PDF (opcional)' }}</span>
            </label>
          </div>
          <p v-if="errorMsg" class="bib-err"><Icon name="shield" :size="14" /> {{ errorMsg }}</p>
        </div>
        <div class="bib-mfoot">
          <button class="btn btn-ghost" :disabled="guardando" @click="modal = false">Cancelar</button>
          <button class="btn btn-primary" :disabled="guardando" @click="guardar">
            <Icon name="check" :size="16" /> {{ guardando ? 'Guardando…' : editandoId ? 'Guardar cambios' : 'Agregar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Portada */
.bib-hero {
  position: relative; overflow: hidden;
  display: flex; align-items: center; justify-content: space-between; gap: 24px;
  padding: 34px 36px; border-radius: 24px; margin-bottom: 22px;
  background: linear-gradient(120deg, #1f2a52, #3a2b73 60%, #5b3fb0);
  color: #fff;
}
.bib-hero-glow { position: absolute; right: -60px; top: -60px; width: 260px; height: 260px; border-radius: 50%; background: radial-gradient(circle, rgba(160,130,255,.45), transparent 65%); }
.bib-hero-txt { position: relative; z-index: 1; max-width: 640px; }
.bib-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: .72rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #c9bcff; }
.bib-hero h1 { font-family: var(--font-heading); font-size: clamp(1.8rem, 3.5vw, 2.6rem); line-height: 1.05; margin: 12px 0 10px; }
.bib-hero p { color: rgba(255,255,255,.82); font-size: .92rem; line-height: 1.6; max-width: 560px; }
.bib-cta { display: inline-flex; align-items: center; gap: 8px; margin-top: 18px; padding: 11px 20px; border: none; border-radius: 12px; background: #fff; color: #3a2b73; font-weight: 800; font-size: .88rem; cursor: pointer; }
.bib-cta:hover { transform: translateY(-1px); }
.bib-hero-books { position: relative; z-index: 1; display: flex; align-items: flex-end; gap: 7px; height: 100px; }
.bib-hero-books .bk { width: 22px; border-radius: 4px 4px 2px 2px; background: rgba(255,255,255,.85); box-shadow: 0 6px 18px rgba(0,0,0,.25); }
.bk.b1 { height: 74px; background: #a7f3d0; } .bk.b2 { height: 96px; background: #c9bcff; } .bk.b3 { height: 62px; background: #fde68a; } .bk.b4 { height: 84px; background: #fca5a5; }

/* Categorías */
.bib-cats { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 16px; }
.bib-cat { display: flex; align-items: center; gap: 12px; text-align: left; padding: 14px 16px; border: 1px solid var(--line); border-radius: 14px; background: #fff; cursor: pointer; transition: all .15s; }
.bib-cat:hover { border-color: var(--violet); }
.bib-cat.on { border-color: var(--violet); box-shadow: 0 0 0 3px var(--violet-50); }
.bib-cat > svg { color: var(--violet); flex: none; }
.bib-cat b { display: block; font-size: .86rem; color: var(--ink); }
.bib-cat span { font-size: .74rem; color: var(--muted); display: block; line-height: 1.35; margin-top: 2px; }

/* Buscador */
.bib-search { display: flex; align-items: center; gap: 10px; padding: 11px 16px; border: 1px solid var(--line); border-radius: 12px; background: #fff; margin-bottom: 18px; }
.bib-search svg { color: var(--muted); }
.bib-search input { flex: 1; border: none; outline: none; font-size: .9rem; background: none; }
.bib-count { font-size: .76rem; color: var(--muted); white-space: nowrap; }

/* Lista */
.bib-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.bib-card { display: flex; flex-direction: column; padding: 18px; border: 1px solid var(--line); border-radius: 16px; background: #fff; box-shadow: var(--shadow-sm); transition: all .15s; border-top: 3px solid var(--violet); }
.bib-card:hover { transform: translateY(-2px); box-shadow: var(--shadow); }
.bib-card.referencia_doctora { border-top-color: #7c5cdb; }
.bib-card.referencia_mi_articulo { border-top-color: #0d9488; }
.bib-card.publicado { border-top-color: #e0922f; }
.bib-card-top { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.bib-pdf { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 11px; background: var(--violet-50); color: var(--violet); flex: none; }
.bib-pdf.nofile { background: var(--bg); color: var(--muted); }
.bib-tag { font-size: .66rem; font-weight: 800; text-transform: uppercase; letter-spacing: .03em; color: var(--muted); }
.bib-acc { margin-left: auto; display: flex; gap: 5px; }
.bib-acc button { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 7px; border: 1px solid var(--line); background: #fff; color: var(--muted); cursor: pointer; }
.bib-acc button:hover { border-color: var(--violet); color: var(--violet); }
.bib-acc button.del:hover { border-color: var(--coral); color: var(--coral); }
.bib-card h3 { font-size: .96rem; line-height: 1.35; color: var(--ink); margin-bottom: 6px; }
.bib-aut { font-size: .8rem; color: var(--ink-soft); margin-bottom: 4px; }
.bib-meta { display: flex; align-items: center; gap: 8px; font-size: .76rem; color: var(--muted); margin-bottom: 8px; flex-wrap: wrap; }
.bib-anio { font-weight: 800; color: var(--violet); }
.bib-notas { font-size: .78rem; color: var(--ink-soft); line-height: 1.5; margin-bottom: 12px; }
.bib-foot { margin-top: auto; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.bib-abrir { display: inline-flex; align-items: center; gap: 6px; padding: 8px 13px; border-radius: 10px; background: var(--violet); color: #fff; font-size: .78rem; font-weight: 700; text-decoration: none; }
.bib-abrir:hover { filter: brightness(.95); }
.bib-peso { opacity: .8; font-weight: 600; }
.bib-sinpdf { font-size: .76rem; color: var(--muted); font-style: italic; }
.bib-doi { display: inline-flex; align-items: center; gap: 4px; font-size: .74rem; color: var(--violet); font-weight: 700; text-decoration: none; }

.bib-vacio { display: grid; place-items: center; gap: 10px; padding: 46px; text-align: center; color: var(--muted); border: 1px dashed var(--line); border-radius: 16px; }

/* Modal */
.bib-overlay { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 20px; background: rgba(15,30,40,.45); backdrop-filter: blur(3px); }
.bib-modal { width: 100%; max-width: 560px; max-height: 92vh; overflow-y: auto; background: #fff; border-radius: 18px; box-shadow: 0 20px 50px rgba(0,0,0,.25); }
.bib-mhead { display: flex; align-items: center; gap: 12px; padding: 20px 22px; border-bottom: 1px solid var(--line); }
.bib-mic { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; color: #fff; background: linear-gradient(135deg, var(--violet), #9d7bf0); flex: none; }
.bib-mhead h2 { font-size: 1.1rem; }
.bib-mhead .sub { font-size: .82rem; }
.bib-close { margin-left: auto; align-self: flex-start; border: none; background: none; font-size: 1.6rem; color: var(--muted); cursor: pointer; }
.bib-mbody { padding: 20px 22px; display: flex; flex-direction: column; gap: 12px; }
.bib-drop { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 20px; border: 2px dashed var(--line); border-radius: 12px; color: var(--muted); cursor: pointer; text-align: center; font-size: .82rem; }
.bib-drop:hover { border-color: var(--violet); color: var(--violet); }
.bib-err { display: flex; align-items: center; gap: 6px; font-size: .82rem; color: var(--coral); }
.bib-mfoot { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 22px; border-top: 1px solid var(--line); background: var(--bg); }

@media (max-width: 620px) { .bib-hero-books { display: none; } }
</style>
