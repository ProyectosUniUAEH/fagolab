<script setup lang="ts">
const props = defineProps<{ name: string; size?: number }>()
const s = props.size ?? 18

// Minimal inline icon set (stroke-based, feather-like) keyed by name.
const paths: Record<string, string> = {
  home: 'M3 11l9-8 9 8M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10',
  fish: 'M6.5 12c3-5 9-6 14-3 0 0-2 3-2 3s2 3 2 3c-5 3-11 2-14-3zM3 12c1-1 3-1 3 0s-2 1-3 0z',
  flask: 'M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3M7 15h10',
  dish: 'M12 4a8 4 0 100 8 8 4 0 100-8zM4 8v4a8 4 0 0016 0V8',
  microscope: 'M6 18h8M9 18V9M9 9a3 3 0 003-3M14 6l3 3-2 2-3-3M5 21h10',
  droplet: 'M12 3s6 6 6 11a6 6 0 01-12 0c0-5 6-11 6-11z',
  dna: 'M5 3c0 6 14 6 14 12M19 3c0 6-14 6-14 12M7 5h10M7 19h10M9 9h6M9 15h6',
  wave: 'M3 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0M3 17c2-4 4-4 6 0s4 4 6 0 4-4 6 0',
  layers: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5',
  report: 'M7 3h7l5 5v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1zM14 3v5h5M9 13h6M9 17h6',
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h3v3h-3zM19 19h1v1h-1zM14 19h1v1h-1zM19 14h1v3h-1z',
  search: 'M11 4a7 7 0 105 12 7 7 0 00-5-12zM20 20l-4-4',
  bell: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0',
  help: 'M12 3a9 9 0 100 18 9 9 0 000-18zM9.5 9a2.5 2.5 0 014 2c0 1.5-2 2-2 3.5M12 17h.01',
  plus: 'M12 5v14M5 12h14',
  print: 'M6 9V3h12v6M6 18H4a1 1 0 01-1-1v-5a1 1 0 011-1h16a1 1 0 011 1v5a1 1 0 01-1 1h-2M6 14h12v7H6z',
  tag: 'M3 11l8-8 10 10-8 8-10-10zM7 7h.01',
  save: 'M5 3h12l4 4v14H5a2 2 0 01-2-2V5a2 2 0 012-2zM7 3v6h8V3M7 21v-7h10v7',
  upload: 'M12 16V4M7 9l5-5 5 5M5 20h14',
  chevron: 'M9 6l6 6-6 6',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  check: 'M5 12l5 5 9-11',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z',
  beaker: 'M9 3h6M10 3v5l-4 10a1.5 1.5 0 001.4 2h11.2a1.5 1.5 0 001.4-2L17 8V3',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  database: 'M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zM4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  download: 'M12 4v12M7 11l5 5 5-5M5 20h14',
  table: 'M3 5h18v14H3zM3 10h18M3 15h18M9 5v14M15 5v14',
  target: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 8a4 4 0 100 8 4 4 0 000-8zM12 11.5a.5.5 0 100 1 .5.5 0 000-1',
  activity: 'M3 12h4l2.5 7 5-14 2.5 7h4',
  flask2: 'M9 2v6l-5 9a2 2 0 002 3h12a2 2 0 002-3l-5-9V2M7 14h10',
  phage: 'M12 2a4 4 0 110 8 4 4 0 010-8zM12 10v8M9 16a2 2 0 01-2 2M15 16a2 2 0 001 2M12 20v2',
  leaf: 'M11 20A7 7 0 019 6c4-2 9-2 11-2 0 5-1 11-7 13M9 14c2-3 5-5 8-6',
  clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2',
  'minus-circle': 'M12 3a9 9 0 100 18 9 9 0 000-18zM8 12h8',
  box: 'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8',
  user: 'M12 11a4 4 0 100-8 4 4 0 000 8zM5 21c0-3.9 3.1-6 7-6s7 2.1 7 6',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z',
  image: 'M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4M9 9.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0',
  edit: 'M4 20h4L18 10l-4-4L4 16v4zM14 6l4 4',
  refresh: 'M21 12a9 9 0 11-3-6.7M21 4v4h-4',
  close: 'M6 6l12 12M18 6L6 18',
  brain: 'M9 4a3 3 0 00-3 3 3 3 0 00-1 5 3 3 0 002 4 3 3 0 005 1V4a2 2 0 00-3 0M15 4a3 3 0 013 3 3 3 0 011 5 3 3 0 01-2 4 3 3 0 01-5 1',
  sparkles: 'M12 3l1.8 4.5L18 9l-4.2 1.5L12 15l-1.8-4.5L6 9l4.2-1.5zM18 14l.9 2.2L21 17l-2.1.8L18 20l-.9-2.2L15 17l2.1-.8z',
  flow: 'M4 6h6v4H4zM14 14h6v4h-6zM10 8h4a2 2 0 012 2v4',
  book: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM19 3v18',
  alert: 'M12 3l9 16H3zM12 10v4M12 17h.01',
  compass: 'M12 3a9 9 0 100 18 9 9 0 000-18zM15.5 8.5l-2 5-5 2 2-5z',
  calendar: 'M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1zM4 10h16M8 3v4M16 3v4',
  'check-circle': 'M12 3a9 9 0 100 18 9 9 0 000-18zM8 12l3 3 5-6',
  route: 'M6 19a2 2 0 100-4 2 2 0 000 4zM18 9a2 2 0 100-4 2 2 0 000 4zM6 15V9a3 3 0 013-3h6M9 18h6a3 3 0 003-3V9',
  link: 'M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1',
  users: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  message: 'M21 15a4 4 0 01-4 4H8l-5 3V7a4 4 0 014-4h10a4 4 0 014 4zM8 9h8M8 13h5',
  clipboard: 'M9 5h6M9 3h6a1 1 0 011 1v2H8V4a1 1 0 011-1zM7 5H5v16h14V5h-2M8 11h8M8 15h6',
}
</script>

<template>
  <svg
    :width="s"
    :height="s"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[name] || paths.grid" />
  </svg>
</template>
