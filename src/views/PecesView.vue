<script setup lang="ts">
import Icon from '../components/Icon.vue'
import { useLabStore } from '../stores/lab'
import { organoNombre } from '../data/catalogs'
import { api } from '../api'

const lab = useLabStore()
const fotoUrl = (uri?: string) => (uri ? api.mediaUrl(uri) : null)
const recCodigo = (id: string) => lab.state.recepciones.find((r) => r.id === id)?.codigo ?? '—'
const organos = (idPez: string) => lab.muestrasDePez(idPez).map((m) => organoNombre(m.organo))
const cajasDePez = (idPez: string) =>
  lab.muestrasDePez(idPez).reduce((acc, m) => acc + lab.cajasDeMuestra(m.id).length, 0)
</script>

<template>
  <div class="page-head">
    <div>
      <h1>Peces</h1>
      <p class="sub">Cada pez es un objeto trazable con sus muestras, cajas y linaje molecular.</p>
    </div>
  </div>

  <div class="card">
    <div class="table-wrap">
      <table class="data">
        <thead>
          <tr><th>Foto</th><th>Código</th><th>Recepción</th><th>Peso</th><th>Longitud</th><th>Estado</th><th>Órganos muestreados</th><th>Cajas</th><th>Lesiones</th></tr>
        </thead>
        <tbody>
          <tr v-for="p in lab.state.peces" :key="p.id">
            <td>
              <img v-if="fotoUrl(p.fotoUrl)" :src="fotoUrl(p.fotoUrl)!" alt="foto" style="width: 46px; height: 46px; object-fit: cover; border-radius: 8px" />
              <span v-else class="badge b-slate" title="sin foto"><Icon name="fish" :size="14" /></span>
            </td>
            <td class="mono" style="font-weight: 700">{{ p.codigo }}</td>
            <td class="mono">{{ recCodigo(p.idRecepcion) }}</td>
            <td>{{ p.pesoG }} g</td>
            <td>{{ p.longitudCm }} cm</td>
            <td><span class="badge b-coral">{{ p.estadoClinico }}</span></td>
            <td>
              <span v-for="o in organos(p.id)" :key="o" class="badge b-slate" style="margin: 1px">{{ o }}</span>
            </td>
            <td><b>{{ cajasDePez(p.id) }}</b></td>
            <td style="max-width: 220px; color: var(--muted)">{{ p.lesiones }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
