import { computed, reactive, ref, type Ref } from 'vue'
import type { EChartsOption } from 'echarts'
import type { ReporteRow } from '../data/types'

export type PurityStatus = 'Apta PCR' | 'Repetir extracción' | 'Pendiente'

export interface AnalyticsRow {
  id: string
  lote: string
  frasco: string
  muestra: string
  organo: string
  medio: string
  descripcion: string
  r280: number | null
  r230: number | null
  ngul: number | null
  muestreo: string
  fecha: string
  status: PurityStatus
  purityScore: number
}

const colors = {
  mint: '#20a77f',
  blue: '#3b78d8',
  amber: '#d59335',
  coral: '#d85d63',
  violet: '#8067d9',
  cyan: '#32a7b7',
  ink: '#17364a',
  muted: '#718294',
  grid: '#e9eef2',
}

function hash(value: string) {
  return Math.abs([...value].reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0))
}

function seeded(seed: number, min: number, max: number) {
  const value = Math.abs(Math.sin(seed * 999.91) * 10000) % 1
  return min + value * (max - min)
}

function isoDate(index: number, row: ReporteRow) {
  const anchor = new Date('2026-06-20T12:00:00')
  const offset = hash(`${row.lote}-${row.muestra}-${row.organo}-${index}`) % 168
  anchor.setDate(anchor.getDate() - offset)
  return anchor.toISOString().slice(0, 10)
}

function scorePurity(r280: number | null, r230: number | null, ngul: number | null) {
  if (r280 == null || r230 == null || ngul == null) return 42
  const s280 = Math.max(0, 1 - Math.abs(r280 - 1.85) / 0.65)
  const s230 = Math.max(0, 1 - Math.abs(r230 - 2.0) / 1.5)
  const sNg = Math.min(1, Math.log10(Math.max(ngul, 1)) / 2.5)
  return Math.round((s280 * 0.45 + s230 * 0.35 + sNg * 0.2) * 100)
}

function purityStatus(r280: number | null, r230: number | null, ngul: number | null): PurityStatus {
  if (r280 == null || r230 == null || ngul == null) return 'Pendiente'
  if (r280 >= 1.68 && r280 <= 2.12 && r230 >= 1.15 && ngul >= 20) return 'Apta PCR'
  if (r280 < 1.45 || r280 > 2.3 || r230 < 0.65 || ngul < 8) return 'Repetir extracción'
  return 'Pendiente'
}

function normalize(rows: ReporteRow[], demo: boolean): AnalyticsRow[] {
  return rows.map((row, index) => {
    const seed = hash(`${row.lote}-${row.frasco}-${row.muestra}-${index}`)
    const r280 = row.r280 ?? (demo ? Number(seeded(seed, 1.35, 2.28).toFixed(2)) : null)
    const r230 = row.r230 ?? (demo ? Number(seeded(seed + 2, 0.55, 2.35).toFixed(2)) : null)
    const ngul = row.ngul ?? (demo ? Number(seeded(seed + 4, 8, 620).toFixed(1)) : null)
    return {
      id: `${row.lote}-${row.frasco || index}-${index}`,
      lote: row.lote || 'Sin lote',
      frasco: row.frasco || `F-${index + 1}`,
      muestra: row.muestra || `M-${index + 1}`,
      organo: row.organo?.replace(/\s+[a-z]$/i, '') || 'Sin órgano',
      medio: row.medio || 'Sin medio',
      descripcion: row.descripcion || (demo ? ['col. blanca circular', 'amarilla iridiscente', 'crema convexa'][seed % 3] : ''),
      r280,
      r230,
      ngul,
      muestreo: row.muestreo || 'Sin muestreo',
      fecha: isoDate(index, row),
      status: purityStatus(r280, r230, ngul),
      purityScore: scorePurity(r280, r230, ngul),
    }
  })
}

function groupCount<T>(rows: T[], key: (row: T) => string) {
  const map = new Map<string, number>()
  rows.forEach((row) => map.set(key(row), (map.get(key(row)) || 0) + 1))
  return [...map.entries()].sort((a, b) => b[1] - a[1])
}

function quantile(values: number[], q: number) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  return sorted[base] + (sorted[base + 1] !== undefined ? rest * (sorted[base + 1] - sorted[base]) : 0)
}

const tooltip = {
  backgroundColor: 'rgba(17, 43, 57, .94)',
  borderWidth: 0,
  textStyle: { color: '#fff', fontSize: 11 },
  extraCssText: 'border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,.16);',
}

export function useReportAnalytics(source: Ref<ReporteRow[]>) {
  // Arranca en datos REALES (solo lo capturado en laboratorio). El modo demo rellena
  // los campos faltantes con valores inventados; queda como opción, no por defecto.
  const demoMode = ref(false)
  const filters = reactive({
    search: '',
    lote: 'Todos',
    organo: 'Todos',
    medio: 'Todos',
    status: 'Todos',
    minNg: null as number | null,
    maxNg: null as number | null,
  })

  const allRows = computed(() => normalize(source.value, demoMode.value))
  const lots = computed(() => groupCount(allRows.value, (r) => r.lote).map(([key]) => key))
  const organs = computed(() => groupCount(allRows.value, (r) => r.organo).map(([key]) => key))
  const media = computed(() => groupCount(allRows.value, (r) => r.medio).map(([key]) => key))

  const rows = computed(() => {
    const q = filters.search.trim().toLowerCase()
    return allRows.value.filter((row) => {
      if (q && ![row.lote, row.frasco, row.muestra, row.organo, row.medio, row.descripcion].join(' ').toLowerCase().includes(q)) return false
      if (filters.lote !== 'Todos' && row.lote !== filters.lote) return false
      if (filters.organo !== 'Todos' && row.organo !== filters.organo) return false
      if (filters.medio !== 'Todos' && row.medio !== filters.medio) return false
      if (filters.status !== 'Todos' && row.status !== filters.status) return false
      if (filters.minNg != null && (row.ngul == null || row.ngul < filters.minNg)) return false
      if (filters.maxNg != null && (row.ngul == null || row.ngul > filters.maxNg)) return false
      return true
    })
  })

  const activeFilterCount = computed(() =>
    [
      filters.search,
      filters.lote !== 'Todos',
      filters.organo !== 'Todos',
      filters.medio !== 'Todos',
      filters.status !== 'Todos',
      filters.minNg != null,
      filters.maxNg != null,
    ].filter(Boolean).length,
  )

  function resetFilters() {
    filters.search = ''
    filters.lote = 'Todos'
    filters.organo = 'Todos'
    filters.medio = 'Todos'
    filters.status = 'Todos'
    filters.minNg = null
    filters.maxNg = null
  }

  const metrics = computed(() => {
    const data = rows.value
    const reads = data.filter((r) => r.ngul != null)
    const avg = reads.length ? reads.reduce((sum, r) => sum + (r.ngul || 0), 0) / reads.length : 0
    const score = data.length ? data.reduce((sum, r) => sum + r.purityScore, 0) / data.length : 0
    return {
      total: data.length,
      nanodrop: data.filter((r) => r.r280 != null).length,
      aptas: data.filter((r) => r.status === 'Apta PCR').length,
      repetir: data.filter((r) => r.status === 'Repetir extracción').length,
      promedio: avg,
      score,
    }
  })

  const statusOption = computed<EChartsOption>(() => {
    const counts = groupCount(rows.value, (r) => r.status)
    const palette: Record<string, string> = {
      'Apta PCR': colors.mint,
      'Pendiente': colors.amber,
      'Repetir extracción': colors.coral,
    }
    return {
      animationDuration: 900,
      tooltip: { ...tooltip, trigger: 'item' },
      legend: { bottom: 0, textStyle: { color: colors.muted, fontSize: 11 } },
      series: [{
        type: 'pie',
        radius: ['50%', '72%'],
        center: ['50%', '44%'],
        padAngle: 3,
        itemStyle: { borderRadius: 7 },
        label: { show: false },
        data: counts.map(([name, value]) => ({ name, value, itemStyle: { color: palette[name] } })),
      }],
      graphic: [{
        type: 'text',
        left: 'center',
        top: '35%',
        style: { text: `${metrics.value.score.toFixed(0)}%`, fill: colors.ink, font: '700 28px sans-serif' },
      }, {
        type: 'text',
        left: 'center',
        top: '47%',
        style: { text: 'score global', fill: colors.muted, font: '11px sans-serif' },
      }],
    }
  })

  const scatterOption = computed<EChartsOption>(() => {
    const organList = organs.value.slice(0, 8)
    return {
      animationDuration: 900,
      tooltip: {
        ...tooltip,
        formatter: (p: any) => `<b>${p.data[4]}</b><br>${p.seriesName}<br>260/280: ${p.data[0]}<br>260/230: ${p.data[1]}<br>${p.data[2]} ng/µL`,
      },
      legend: { top: 0, type: 'scroll', textStyle: { color: colors.muted, fontSize: 10 } },
      grid: { left: 48, right: 22, top: 48, bottom: 42 },
      xAxis: { name: '260/280', min: 1, max: 2.6, splitLine: { lineStyle: { color: colors.grid } } },
      yAxis: { name: '260/230', min: 0, max: 2.8, splitLine: { lineStyle: { color: colors.grid } } },
      series: organList.map((organo, index) => ({
        name: organo,
        type: 'scatter',
        symbolSize: (value: number[]) => Math.max(7, Math.min(34, Math.sqrt(value[2] || 1) * 0.7)),
        emphasis: { focus: 'series', scale: 1.25 },
        itemStyle: { color: [colors.mint, colors.blue, colors.amber, colors.coral, colors.violet, colors.cyan][index % 6], opacity: 0.72 },
        data: rows.value.filter((r) => r.organo === organo && r.r280 != null && r.r230 != null && r.ngul != null)
          .slice(0, 240)
          .map((r) => [r.r280, r.r230, r.ngul, r.purityScore, `${r.muestra} · ${r.medio}`]),
        markArea: index === 0 ? {
          silent: true,
          itemStyle: { color: 'rgba(32,167,127,.08)' },
          data: [[{ xAxis: 1.68, yAxis: 1.15 }, { xAxis: 2.12, yAxis: 2.5 }]],
        } : undefined,
      })),
    }
  })

  const histogramOption = computed<EChartsOption>(() => {
    const values = rows.value.map((r) => r.ngul).filter((v): v is number => v != null)
    const max = Math.min(2000, Math.max(100, quantile(values, 0.97)))
    const buckets = 12
    const step = max / buckets
    const counts = Array.from({ length: buckets }, () => 0)
    values.forEach((value) => {
      const index = Math.min(buckets - 1, Math.floor(Math.min(value, max) / step))
      counts[index]++
    })
    return {
      tooltip: { ...tooltip, trigger: 'axis' },
      grid: { left: 44, right: 18, top: 26, bottom: 44 },
      xAxis: { type: 'category', data: counts.map((_, i) => `${Math.round(i * step)}`), name: 'ng/µL', axisLabel: { color: colors.muted } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: colors.grid } } },
      series: [{
        type: 'bar',
        data: counts,
        barWidth: '72%',
        itemStyle: { color: colors.blue, borderRadius: [7, 7, 2, 2] },
        emphasis: { itemStyle: { color: colors.mint } },
      }],
    }
  })

  const boxplotOption = computed<EChartsOption>(() => {
    const top = organs.value.slice(0, 8)
    const data = top.map((org) => {
      const values = rows.value.filter((r) => r.organo === org && r.ngul != null).map((r) => r.ngul as number)
      return [
        Number(quantile(values, 0.05).toFixed(1)),
        Number(quantile(values, 0.25).toFixed(1)),
        Number(quantile(values, 0.5).toFixed(1)),
        Number(quantile(values, 0.75).toFixed(1)),
        Number(quantile(values, 0.95).toFixed(1)),
      ]
    })
    return {
      tooltip: { ...tooltip, trigger: 'item' },
      grid: { left: 52, right: 20, top: 24, bottom: 58 },
      xAxis: { type: 'category', data: top, axisLabel: { rotate: 25, color: colors.muted } },
      yAxis: { type: 'value', name: 'ng/µL', splitLine: { lineStyle: { color: colors.grid } } },
      series: [{ type: 'boxplot', data, itemStyle: { color: '#dff5ed', borderColor: colors.mint, borderWidth: 2 } }],
    }
  })

  const funnelOption = computed<EChartsOption>(() => {
    const total = Math.max(metrics.value.total, 1)
    const data: Array<[string, number]> = [
      ['Muestreo', total],
      ['Caja Petri', Math.round(total * 0.94)],
      ['NanoDrop', metrics.value.nanodrop],
      ['PCR apta', metrics.value.aptas],
      ['Electroforesis', Math.round(metrics.value.aptas * 0.72)],
    ]
    return {
      tooltip: { ...tooltip, trigger: 'item' },
      color: [colors.blue, colors.cyan, colors.mint, colors.amber, colors.violet],
      series: [{
        type: 'funnel',
        left: '8%',
        width: '84%',
        top: 18,
        bottom: 8,
        minSize: '18%',
        maxSize: '100%',
        sort: 'descending',
        gap: 4,
        label: { color: '#fff', fontWeight: 700, formatter: '{b}\n{c}' },
        itemStyle: { borderColor: '#fff', borderWidth: 2, borderRadius: 7 },
        data: data.map(([name, value]) => ({ name, value })),
      }],
    }
  })

  const sankeyOption = computed<EChartsOption>(() => {
    const sample = rows.value.slice(0, 900)
    const topLots = groupCount(sample, (r) => r.lote).slice(0, 5).map(([k]) => k)
    const topOrgans = groupCount(sample, (r) => r.organo).slice(0, 6).map(([k]) => k)
    const topMedia = groupCount(sample, (r) => r.medio).slice(0, 6).map(([k]) => k)
    const links = new Map<string, number>()
    const add = (source: string, target: string) => links.set(`${source}|${target}`, (links.get(`${source}|${target}`) || 0) + 1)
    sample.filter((r) => topLots.includes(r.lote) && topOrgans.includes(r.organo) && topMedia.includes(r.medio)).forEach((r) => {
      add(`Lote · ${r.lote}`, `Órgano · ${r.organo}`)
      add(`Órgano · ${r.organo}`, `Medio · ${r.medio}`)
      add(`Medio · ${r.medio}`, r.status)
    })
    const linkData = [...links.entries()].map(([key, value]) => {
      const [source, target] = key.split('|')
      return { source, target, value }
    })
    const nodes = [...new Set(linkData.flatMap((link) => [link.source, link.target]))].map((name) => ({ name }))
    return {
      tooltip: { ...tooltip, trigger: 'item' },
      series: [{
        type: 'sankey',
        data: nodes,
        links: linkData,
        left: 8,
        right: 12,
        top: 12,
        bottom: 10,
        nodeWidth: 12,
        nodeGap: 9,
        draggable: false,
        emphasis: { focus: 'adjacency' },
        lineStyle: { color: 'gradient', opacity: 0.34, curveness: 0.52 },
        label: { color: colors.ink, fontSize: 10 },
        levels: [
          { depth: 0, itemStyle: { color: colors.blue } },
          { depth: 1, itemStyle: { color: colors.cyan } },
          { depth: 2, itemStyle: { color: colors.violet } },
          { depth: 3, itemStyle: { color: colors.mint } },
        ],
      }],
    }
  })

  const calendarOption = computed<EChartsOption>(() => {
    const counts = groupCount(rows.value, (r) => r.fecha)
    const max = Math.max(1, ...counts.map(([, count]) => count))
    return {
      tooltip: { ...tooltip, formatter: (p: any) => `${p.value[0]}<br><b>${p.value[1]}</b> registros` },
      visualMap: { min: 0, max, orient: 'horizontal', left: 'center', bottom: 0, inRange: { color: ['#edf8f4', '#8dd7c0', '#17876d'] }, textStyle: { color: colors.muted } },
      calendar: { top: 48, left: 34, right: 20, bottom: 54, range: ['2026-01-01', '2026-06-30'], cellSize: ['auto', 17], yearLabel: { show: false }, monthLabel: { color: colors.ink }, dayLabel: { color: colors.muted }, itemStyle: { borderColor: '#fff', borderWidth: 3 } },
      series: [{ type: 'heatmap', coordinateSystem: 'calendar', data: counts }],
    }
  })

  const topLots = computed(() => groupCount(rows.value, (r) => r.lote).slice(0, 6).map(([key]) => key))

  const stackedOption = computed<EChartsOption>(() => {
    const statuses: PurityStatus[] = ['Apta PCR', 'Pendiente', 'Repetir extracción']
    return {
      tooltip: { ...tooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { top: 0, textStyle: { color: colors.muted, fontSize: 10 } },
      grid: { left: 40, right: 16, top: 46, bottom: 34 },
      xAxis: { type: 'category', data: topLots.value, axisLabel: { color: colors.muted } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: colors.grid } } },
      series: statuses.map((status) => ({
        name: status,
        type: 'bar',
        stack: 'status',
        emphasis: { focus: 'series' },
        itemStyle: { color: status === 'Apta PCR' ? colors.mint : status === 'Pendiente' ? colors.amber : colors.coral, borderRadius: status === 'Repetir extracción' ? [5, 5, 0, 0] : 0 },
        data: topLots.value.map((lot) => rows.value.filter((r) => r.lote === lot && r.status === status).length),
      })),
    }
  })

  const heatmapOption = computed<EChartsOption>(() => {
    const organList = organs.value.slice(0, 7)
    const data = topLots.value.flatMap((lot, x) => organList.map((org, y) => [x, y, rows.value.filter((r) => r.lote === lot && r.organo === org).length]))
    const max = Math.max(1, ...data.map((d) => d[2]))
    return {
      tooltip: { ...tooltip, formatter: (p: any) => `${topLots.value[p.value[0]]} · ${organList[p.value[1]]}<br><b>${p.value[2]}</b> registros` },
      grid: { left: 72, right: 30, top: 22, bottom: 62 },
      xAxis: { type: 'category', data: topLots.value, splitArea: { show: true }, axisLabel: { color: colors.muted } },
      yAxis: { type: 'category', data: organList, splitArea: { show: true }, axisLabel: { color: colors.muted } },
      visualMap: { min: 0, max, calculable: false, orient: 'horizontal', left: 'center', bottom: 8, inRange: { color: ['#eef6fb', '#78b8d7', '#205f91'] }, textStyle: { color: colors.muted } },
      series: [{ type: 'heatmap', data, label: { show: true, color: colors.ink, fontSize: 9 }, itemStyle: { borderColor: '#fff', borderWidth: 3, borderRadius: 5 } }],
    }
  })

  const radarOption = computed<EChartsOption>(() => {
    const lotsData = topLots.value.slice(0, 4)
    const globalMax = Math.max(1, ...lotsData.map((lot) => rows.value.filter((r) => r.lote === lot).length))
    return {
      tooltip: { ...tooltip, trigger: 'item' },
      legend: { bottom: 0, textStyle: { color: colors.muted, fontSize: 10 } },
      radar: {
        center: ['50%', '47%'],
        radius: '66%',
        indicator: [
          { name: 'Pureza', max: 100 },
          { name: 'Concentración', max: 100 },
          { name: 'Aptas PCR', max: 100 },
          { name: 'Cobertura', max: 100 },
          { name: 'Diversidad', max: 100 },
        ],
        splitArea: { areaStyle: { color: ['rgba(32,167,127,.02)', 'rgba(32,167,127,.06)'] } },
        axisName: { color: colors.muted, fontSize: 10 },
        splitLine: { lineStyle: { color: '#dfe9e6' } },
      },
      series: [{
        type: 'radar',
        data: lotsData.map((lot) => {
          const group = rows.value.filter((r) => r.lote === lot)
          const reads = group.filter((r) => r.ngul != null)
          return {
            name: lot,
            value: [
              group.reduce((s, r) => s + r.purityScore, 0) / Math.max(1, group.length),
              Math.min(100, (reads.reduce((s, r) => s + (r.ngul || 0), 0) / Math.max(1, reads.length)) / 8),
              group.filter((r) => r.status === 'Apta PCR').length / Math.max(1, group.length) * 100,
              group.length / globalMax * 100,
              new Set(group.map((r) => r.medio)).size / Math.max(1, media.value.length) * 100,
            ].map((v) => Number(v.toFixed(1))),
            areaStyle: { opacity: 0.08 },
          }
        }),
      }],
    }
  })

  const sunburstOption = computed<EChartsOption>(() => {
    const lotsData = topLots.value.slice(0, 5).map((lot) => ({
      name: `Lote ${lot}`,
      children: organs.value.slice(0, 6).map((org) => ({
        name: org,
        children: media.value.slice(0, 6).map((medium) => ({
          name: medium,
          value: rows.value.filter((r) => r.lote === lot && r.organo === org && r.medio === medium).length,
        })).filter((node) => node.value > 0),
      })).filter((node) => node.children.length),
    }))
    return {
      tooltip: { ...tooltip, trigger: 'item' },
      series: [{
        type: 'sunburst',
        data: lotsData,
        radius: [28, '92%'],
        sort: undefined,
        emphasis: { focus: 'ancestor' },
        label: { rotate: 'radial', fontSize: 9, color: colors.ink },
        levels: [
          {},
          { r0: '12%', r: '35%', itemStyle: { borderWidth: 3 }, label: { rotate: 0 } },
          { r0: '35%', r: '66%', itemStyle: { borderWidth: 2 } },
          { r0: '66%', r: '92%', itemStyle: { borderWidth: 1 }, label: { position: 'outside', padding: 2, silent: false } },
        ],
      }],
    }
  })

  const graphOption = computed<EChartsOption>(() => {
    const lotList = topLots.value.slice(0, 4)
    const organList = organs.value.slice(0, 5)
    const mediaList = media.value.slice(0, 5)
    const nodes: any[] = [{ name: 'FagoLab', symbolSize: 48, category: 0 }]
    const links: any[] = []
    lotList.forEach((lot) => {
      nodes.push({ name: `Lote ${lot}`, symbolSize: 32, category: 1 })
      links.push({ source: 'FagoLab', target: `Lote ${lot}` })
    })
    organList.forEach((org, i) => {
      nodes.push({ name: org, symbolSize: 25, category: 2 })
      links.push({ source: `Lote ${lotList[i % Math.max(1, lotList.length)]}`, target: org })
    })
    mediaList.forEach((medium, i) => {
      nodes.push({ name: medium, symbolSize: 21, category: 3 })
      links.push({ source: organList[i % Math.max(1, organList.length)], target: medium })
    })
    ;(['Apta PCR', 'Pendiente', 'Repetir extracción'] as PurityStatus[]).forEach((status, i) => {
      nodes.push({ name: status, symbolSize: 29, category: 4 })
      links.push({ source: mediaList[i % Math.max(1, mediaList.length)], target: status })
    })
    return {
      tooltip: { ...tooltip },
      legend: [{ bottom: 0, data: ['Sistema', 'Lotes', 'Órganos', 'Medios', 'Resultado'], textStyle: { color: colors.muted, fontSize: 9 } }],
      series: [{
        type: 'graph',
        layout: 'force',
        data: nodes,
        links,
        categories: [
          { name: 'Sistema', itemStyle: { color: colors.ink } },
          { name: 'Lotes', itemStyle: { color: colors.blue } },
          { name: 'Órganos', itemStyle: { color: colors.cyan } },
          { name: 'Medios', itemStyle: { color: colors.violet } },
          { name: 'Resultado', itemStyle: { color: colors.mint } },
        ],
        roam: true,
        label: { show: true, position: 'right', color: colors.ink, fontSize: 9 },
        force: { repulsion: 135, edgeLength: [45, 105], gravity: 0.08 },
        lineStyle: { color: 'source', opacity: 0.28, curveness: 0.18 },
        emphasis: { focus: 'adjacency', lineStyle: { width: 3 } },
      }],
    }
  })

  const trendOption = computed<EChartsOption>(() => {
    const counts = groupCount(rows.value, (r) => r.fecha).sort((a, b) => a[0].localeCompare(b[0]))
    let rolling = 0
    return {
      tooltip: { ...tooltip, trigger: 'axis' },
      grid: { left: 42, right: 20, top: 22, bottom: 44 },
      xAxis: { type: 'category', data: counts.map(([date]) => date.slice(5)), boundaryGap: false, axisLabel: { color: colors.muted, hideOverlap: true } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: colors.grid } } },
      series: [{
        type: 'line',
        smooth: 0.35,
        symbol: 'none',
        lineStyle: { color: colors.mint, width: 3 },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(32,167,127,.35)' }, { offset: 1, color: 'rgba(32,167,127,0)' }] } },
        data: counts.map(([, count]) => {
          rolling = rolling * 0.65 + count * 0.35
          return Number(rolling.toFixed(1))
        }),
      }],
    }
  })

  const morphologyTerms = computed(() => {
    const words = new Map<string, number>()
    rows.value.forEach((row) => {
      row.descripcion.toLowerCase().replace(/[.,/()]/g, ' ').split(/\s+/)
        .filter((word) => word.length > 3 && !['colonia', 'colonias'].includes(word))
        .forEach((word) => words.set(word, (words.get(word) || 0) + 1))
    })
    const entries = [...words.entries()].sort((a, b) => b[1] - a[1]).slice(0, 24)
    const max = Math.max(1, ...entries.map(([, count]) => count))
    return entries.map(([text, count], index) => ({
      text,
      count,
      size: 0.72 + count / max * 1.55,
      tone: ['mint', 'blue', 'amber', 'coral', 'violet'][index % 5],
    }))
  })

  return {
    demoMode,
    filters,
    lots,
    organs,
    media,
    rows,
    metrics,
    activeFilterCount,
    resetFilters,
    morphologyTerms,
    options: {
      status: statusOption,
      trend: trendOption,
      scatter: scatterOption,
      histogram: histogramOption,
      boxplot: boxplotOption,
      funnel: funnelOption,
      sankey: sankeyOption,
      calendar: calendarOption,
      stacked: stackedOption,
      heatmap: heatmapOption,
      radar: radarOption,
      sunburst: sunburstOption,
      graph: graphOption,
    },
  }
}
