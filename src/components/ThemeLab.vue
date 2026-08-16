<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import Icon from './Icon.vue'

type ThemeKey = 'aqua' | 'pastel' | 'notion' | 'night' | 'field'
type PaletteKey = ThemeKey | 'rose' | 'lavender'
type FontKey = 'manrope' | 'plex' | 'fraunces' | 'system'
type DensityKey = 'comfortable' | 'compact' | 'airy'
type RadiusKey = 'soft' | 'crisp' | 'pill'
type SurfaceKey = 'clean' | 'paper' | 'glass'

const STORAGE_KEY = 'fagolab-theme-lab-v1'

const themePresets: Record<ThemeKey, { name: string; label: string; mood: string; palette: PaletteKey; heading: FontKey; body: FontKey; density: DensityKey; radius: RadiusKey; surface: SurfaceKey }> = {
  aqua: { name: 'Aqua Institucional', label: 'Universidad + laboratorio', mood: 'serio, claro, acuícola', palette: 'aqua', heading: 'manrope', body: 'manrope', density: 'comfortable', radius: 'soft', surface: 'glass' },
  pastel: { name: 'Bio Pastel', label: 'Cute biotec', mood: 'amable, estudiantil', palette: 'pastel', heading: 'plex', body: 'plex', density: 'airy', radius: 'pill', surface: 'paper' },
  notion: { name: 'Cuaderno Notion', label: 'bitácora académica', mood: 'ordenado, heredable', palette: 'notion', heading: 'fraunces', body: 'system', density: 'comfortable', radius: 'crisp', surface: 'paper' },
  night: { name: 'Molecular Nocturno', label: 'modo análisis', mood: 'profundo, fluorescente', palette: 'night', heading: 'plex', body: 'plex', density: 'compact', radius: 'soft', surface: 'clean' },
  field: { name: 'Campo Acuícola', label: 'granja + ciencia', mood: 'natural, cálido', palette: 'field', heading: 'fraunces', body: 'manrope', density: 'comfortable', radius: 'soft', surface: 'paper' },
}

const palettes: Record<PaletteKey, Record<string, string>> = {
  aqua: { '--teal': '#0d9488', '--teal-600': '#0f766e', '--teal-50': '#ecfdf8', '--teal-100': '#d1faf0', '--blue': '#2f6fed', '--blue-50': '#eaf1ff', '--amber': '#e0922f', '--amber-50': '#fff5e6', '--coral': '#e2574c', '--coral-50': '#fdebe9', '--violet': '#7c5cdb', '--violet-50': '#f1ecfd', '--ink': '#0f2438', '--ink-soft': '#3b4d63', '--muted': '#6b7d92', '--line': '#e6ecf2', '--line-soft': '#eef2f6', '--bg': '#f4f7fb', '--panel': '#ffffff' },
  pastel: { '--teal': '#67c9b8', '--teal-600': '#238c7c', '--teal-50': '#effaf6', '--teal-100': '#d8f3ec', '--blue': '#7aa7e8', '--blue-50': '#eef5ff', '--amber': '#eda66f', '--amber-50': '#fff2e8', '--coral': '#ee8f9c', '--coral-50': '#fff0f3', '--violet': '#a78be8', '--violet-50': '#f4efff', '--ink': '#26364a', '--ink-soft': '#526276', '--muted': '#7c8ca0', '--line': '#e8edf4', '--line-soft': '#f3f6f9', '--bg': '#f8fbfb', '--panel': '#ffffff' },
  notion: { '--teal': '#3f9a8b', '--teal-600': '#2f766e', '--teal-50': '#eef7f4', '--teal-100': '#dceee9', '--blue': '#4d7fb8', '--blue-50': '#eef4fb', '--amber': '#c78a43', '--amber-50': '#fbf3e9', '--coral': '#c76355', '--coral-50': '#f9eee9', '--violet': '#8067b2', '--violet-50': '#f1eef8', '--ink': '#1f2933', '--ink-soft': '#4a5563', '--muted': '#7a8491', '--line': '#e4e1dc', '--line-soft': '#f3f0eb', '--bg': '#f7f4ef', '--panel': '#fffdf8' },
  night: { '--teal': '#2dd4bf', '--teal-600': '#5eead4', '--teal-50': '#102b34', '--teal-100': '#164651', '--blue': '#60a5fa', '--blue-50': '#122840', '--amber': '#fbbf24', '--amber-50': '#332711', '--coral': '#fb7185', '--coral-50': '#371b25', '--violet': '#c084fc', '--violet-50': '#2b1c44', '--ink': '#e8f2f8', '--ink-soft': '#b8c7d3', '--muted': '#8fa3b4', '--line': '#203545', '--line-soft': '#182b38', '--bg': '#071923', '--panel': '#0d2430' },
  field: { '--teal': '#508f70', '--teal-600': '#38684f', '--teal-50': '#eff7ef', '--teal-100': '#dcefdc', '--blue': '#477995', '--blue-50': '#eef5f8', '--amber': '#c9873d', '--amber-50': '#fff3e3', '--coral': '#cc6b53', '--coral-50': '#fbede8', '--violet': '#7c6aa8', '--violet-50': '#f1eef7', '--ink': '#20312a', '--ink-soft': '#53655c', '--muted': '#7b8b82', '--line': '#e1e9df', '--line-soft': '#f1f6ef', '--bg': '#f3f7ef', '--panel': '#fffef8' },
  rose: { '--teal': '#d66f93', '--teal-600': '#a84870', '--teal-50': '#fff0f5', '--teal-100': '#fbd8e6', '--blue': '#6e9bd7', '--blue-50': '#edf4ff', '--amber': '#e6a15b', '--amber-50': '#fff2e6', '--coral': '#e15f5f', '--coral-50': '#fff0ef', '--violet': '#a178d6', '--violet-50': '#f5efff', '--ink': '#352635', '--ink-soft': '#675568', '--muted': '#8e7d8d', '--line': '#eee2ea', '--line-soft': '#f8f0f5', '--bg': '#fbf6f8', '--panel': '#ffffff' },
  lavender: { '--teal': '#8f7cf1', '--teal-600': '#6350c8', '--teal-50': '#f3f0ff', '--teal-100': '#e6ddff', '--blue': '#69a8d7', '--blue-50': '#eef7ff', '--amber': '#e0ad58', '--amber-50': '#fff5df', '--coral': '#e584a4', '--coral-50': '#fff0f6', '--violet': '#8f7cf1', '--violet-50': '#f3f0ff', '--ink': '#282540', '--ink-soft': '#5b5871', '--muted': '#817f95', '--line': '#e7e2f3', '--line-soft': '#f4f1fb', '--bg': '#f8f6fd', '--panel': '#ffffff' },
}

const fonts: Record<FontKey, string> = { manrope: '"Manrope", ui-sans-serif, system-ui, sans-serif', plex: '"IBM Plex Sans", "Manrope", ui-sans-serif, system-ui, sans-serif', fraunces: '"Fraunces", "Sora", Georgia, serif', system: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }
const state = reactive({ theme: 'aqua' as ThemeKey, palette: 'aqua' as PaletteKey, heading: 'manrope' as FontKey, body: 'manrope' as FontKey, density: 'comfortable' as DensityKey, radius: 'soft' as RadiusKey, surface: 'glass' as SurfaceKey })
const abierto = ref(false)
const themeList = computed(() => Object.entries(themePresets).map(([key, value]) => ({ key: key as ThemeKey, ...value })))
function applyState() { const root = document.documentElement; Object.entries(palettes[state.palette]).forEach(([key, value]) => root.style.setProperty(key, value)); root.style.setProperty('--font-body', fonts[state.body]); root.style.setProperty('--font-heading', fonts[state.heading]); root.dataset.density = state.density; root.dataset.radius = state.radius; root.dataset.surface = state.surface; root.dataset.theme = state.palette; localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) }
function setTheme(key: ThemeKey) { const preset = themePresets[key]; state.theme = key; state.palette = preset.palette; state.heading = preset.heading; state.body = preset.body; state.density = preset.density; state.radius = preset.radius; state.surface = preset.surface }
function resetMix() { setTheme('aqua') }
onMounted(() => { const saved = localStorage.getItem(STORAGE_KEY); if (saved) { try { Object.assign(state, JSON.parse(saved)) } catch { setTheme('aqua') } } applyState() })
watch(state, applyState, { deep: true })
</script>

<template>
  <div class="theme-lab">
    <button class="theme-fab" :class="{ open: abierto }" type="button" @click="abierto = !abierto" aria-label="Abrir selector de temas"><Icon name="activity" :size="20" /><span>Temas</span></button>
    <section v-if="abierto" class="theme-panel" aria-label="Selector de identidad visual">
      <div class="theme-head"><div><b>Laboratorio de temas</b><span>Prueba identidades sin tocar tus datos</span></div><button class="theme-close" type="button" @click="abierto = false" aria-label="Cerrar"><Icon name="check" :size="16" /></button></div>
      <div class="theme-presets"><button v-for="t in themeList" :key="t.key" type="button" class="theme-card" :class="[{ active: state.theme === t.key }, `preview-${t.palette}`]" @click="setTheme(t.key)"><span class="swatches"><i></i><i></i><i></i></span><b>{{ t.name }}</b><small>{{ t.label }}</small><em>{{ t.mood }}</em></button></div>
      <div class="mix-title">Mezclar</div>
      <div class="mix-grid">
        <label>Paleta<select v-model="state.palette"><option value="aqua">Aqua institucional</option><option value="pastel">Bio pastel</option><option value="notion">Cuaderno Notion</option><option value="night">Molecular nocturno</option><option value="field">Campo acuícola</option><option value="rose">Rosa fagoterapia</option><option value="lavender">Lavanda molecular</option></select></label>
        <label>Títulos<select v-model="state.heading"><option value="manrope">Moderno limpio</option><option value="plex">Científico técnico</option><option value="fraunces">Editorial académico</option><option value="system">Sistema neutro</option></select></label>
        <label>Texto<select v-model="state.body"><option value="manrope">Manrope amigable</option><option value="plex">IBM Plex científico</option><option value="system">Sistema ligero</option></select></label>
        <label>Espaciado<select v-model="state.density"><option value="compact">Compacto</option><option value="comfortable">Cómodo</option><option value="airy">Aireado</option></select></label>
        <label>Esquinas<select v-model="state.radius"><option value="crisp">Recto elegante</option><option value="soft">Suave</option><option value="pill">Cute redondo</option></select></label>
        <label>Superficie<select v-model="state.surface"><option value="clean">Limpio</option><option value="paper">Papel académico</option><option value="glass">Cristal suave</option></select></label>
      </div>
      <div class="theme-actions"><button type="button" @click="resetMix">Restaurar Aqua</button><span>Se guarda automáticamente en este navegador.</span></div>
    </section>
  </div>
</template>

<style scoped>
.theme-lab{position:fixed;right:22px;bottom:22px;z-index:80;font-family:var(--font-body,"Manrope",sans-serif)}.theme-fab{display:inline-flex;align-items:center;gap:9px;padding:12px 16px;border-radius:999px;color:#fff;background:linear-gradient(135deg,var(--teal),var(--blue));box-shadow:0 18px 42px rgba(15,36,56,.22);font-weight:800;border:1px solid rgba(255,255,255,.35)}.theme-fab.open{transform:translateY(-2px)}.theme-panel{position:absolute;right:0;bottom:58px;width:min(420px,calc(100vw - 28px));max-height:min(78vh,720px);overflow:auto;padding:14px;border-radius:22px;border:1px solid var(--line);background:color-mix(in srgb,var(--panel) 94%,transparent);box-shadow:0 24px 70px rgba(15,36,56,.22);backdrop-filter:blur(18px)}.theme-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px}.theme-head b{display:block;color:var(--ink);font-size:.98rem}.theme-head span,.theme-actions span{display:block;margin-top:3px;color:var(--muted);font-size:.75rem}.theme-close{display:grid;place-items:center;width:30px;height:30px;border-radius:10px;color:var(--teal-600);background:var(--teal-50)}.theme-presets{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.theme-card{text-align:left;padding:12px;border-radius:16px;border:1px solid var(--line);background:var(--panel);color:var(--ink)}.theme-card.active{border-color:var(--teal);box-shadow:0 0 0 3px var(--teal-100)}.theme-card b,.theme-card small,.theme-card em{display:block}.theme-card b{margin-top:8px;font-size:.84rem}.theme-card small{margin-top:2px;color:var(--ink-soft);font-size:.72rem}.theme-card em{margin-top:6px;color:var(--muted);font-size:.68rem;font-style:normal}.swatches{display:flex;gap:5px}.swatches i{width:22px;height:22px;border-radius:8px;border:1px solid rgba(15,36,56,.08)}.preview-aqua .swatches i:nth-child(1){background:#0d9488}.preview-aqua .swatches i:nth-child(2){background:#2f6fed}.preview-aqua .swatches i:nth-child(3){background:#f4f7fb}.preview-pastel .swatches i:nth-child(1){background:#67c9b8}.preview-pastel .swatches i:nth-child(2){background:#ee8f9c}.preview-pastel .swatches i:nth-child(3){background:#f8fbfb}.preview-notion .swatches i:nth-child(1){background:#3f9a8b}.preview-notion .swatches i:nth-child(2){background:#c78a43}.preview-notion .swatches i:nth-child(3){background:#f7f4ef}.preview-night .swatches i:nth-child(1){background:#071923}.preview-night .swatches i:nth-child(2){background:#2dd4bf}.preview-night .swatches i:nth-child(3){background:#c084fc}.preview-field .swatches i:nth-child(1){background:#508f70}.preview-field .swatches i:nth-child(2){background:#c9873d}.preview-field .swatches i:nth-child(3){background:#f3f7ef}.mix-title{margin:14px 0 8px;font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);font-weight:900}.mix-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.mix-grid label{display:flex;flex-direction:column;gap:5px;font-size:.72rem;color:var(--muted);font-weight:800}.mix-grid select{width:100%;min-width:0;padding:9px 10px;border:1px solid var(--line);border-radius:12px;color:var(--ink);background:var(--panel);outline:none}.theme-actions{display:flex;align-items:center;gap:10px;margin-top:12px;padding-top:12px;border-top:1px solid var(--line-soft)}.theme-actions button{flex:none;padding:9px 12px;border-radius:12px;background:var(--teal-50);color:var(--teal-600);font-weight:900}@media (max-width:620px){.theme-lab{right:14px;bottom:14px}.theme-presets,.mix-grid{grid-template-columns:1fr}}
</style>
