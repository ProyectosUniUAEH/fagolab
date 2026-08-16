<script setup lang="ts">
import { ref, watchEffect, onMounted } from 'vue'
import { qrPayload, qrDataUrl, renderBarcode } from '../composables/useLabels'

const props = defineProps<{
  codigo: string
  tipo: string
  titulo?: string
  sub?: string
  qrSize?: number
}>()

const qrSrc = ref('')
const barcodeRef = ref<SVGSVGElement | null>(null)

watchEffect(async () => {
  qrSrc.value = await qrDataUrl(qrPayload(props.codigo, props.tipo), props.qrSize ?? 96)
})

function drawBarcode() {
  if (barcodeRef.value) renderBarcode(barcodeRef.value, props.codigo)
}
onMounted(drawBarcode)
watchEffect(() => {
  props.codigo
  // redibuja al cambiar el código
  if (barcodeRef.value) drawBarcode()
})
</script>

<template>
  <div class="label-card">
    <img v-if="qrSrc" class="qr" :src="qrSrc" :width="qrSize ?? 96" :height="qrSize ?? 96" alt="QR" />
    <div class="meta" style="flex: 1">
      <div class="code">{{ titulo ?? codigo }}</div>
      <div class="sub" v-if="titulo">{{ codigo }}</div>
      <div class="sub" v-if="sub">{{ sub }}</div>
      <svg ref="barcodeRef" class="bar" style="margin-top: 6px"></svg>
    </div>
  </div>
</template>
