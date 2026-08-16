import QRCode from 'qrcode'
import JsBarcode from 'jsbarcode'

// Genera el valor QR de un objeto rastreable. En producción esto resolvería a una
// URL del tipo https://lab.aquabio/o/<codigo> para abrir la ficha al escanear.
export function qrPayload(codigo: string, tipo: string) {
  void tipo
  const base = typeof window === 'undefined' ? '' : window.location.origin
  return `${base}/#/ficha/${encodeURIComponent(codigo)}`
}

export async function qrDataUrl(value: string, size = 132): Promise<string> {
  return QRCode.toDataURL(value, {
    width: size,
    margin: 0,
    errorCorrectionLevel: 'M',
    color: { dark: '#0f2438', light: '#ffffff' },
  })
}

// CODE128 solo admite ASCII; normaliza acentos/ñ (Rña → Rna) para que códigos
// con caracteres como "Rñ" (riñón) puedan codificarse en el código de barras.
// El QR y el código legible conservan el valor original con tildes.
function asciiSafe(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^ -~]/g, '')
}

// Dibuja un código de barras CODE128 dentro de un <svg> existente.
export function renderBarcode(svgEl: SVGElement, value: string) {
  JsBarcode(svgEl, asciiSafe(value), {
    format: 'CODE128',
    displayValue: false,
    margin: 0,
    height: 34,
    lineColor: '#0f2438',
  })
}
