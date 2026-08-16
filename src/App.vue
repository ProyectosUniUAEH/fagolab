<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from './components/AppSidebar.vue'
import AppTopbar from './components/AppTopbar.vue'
import CommunicationRail from './components/CommunicationRail.vue'
import ThemeLab from './components/ThemeLab.vue'
import { useLabStore } from './stores/lab'
import { useAuthStore } from './stores/auth'
import { usePresenceStore } from './stores/presence'

const lab = useLabStore()
const auth = useAuthStore()
const presence = usePresenceStore()
const route = useRoute()
const publicPage = computed(() => !!route.meta.public)

onMounted(() => {
  if (auth.authenticated) {
    lab.load()
    presence.connect()
  }
})
watch(() => auth.authenticated, (active) => {
  if (active) {
    if (!lab.loaded) lab.load()
    presence.connect()
  } else {
    presence.disconnect()
  }
})
</script>

<template>
  <RouterView v-if="publicPage" />
  <div v-else class="shell">
    <AppSidebar />
    <div class="main">
      <AppTopbar />
      <main class="content">
        <!-- Banner de error de conexión con la API -->
        <div v-if="lab.error" class="api-banner err">
          <b>No se pudo conectar con la API.</b>
          <span>{{ lab.error }}</span>
          <button class="btn btn-sm" @click="lab.load()">Reintentar</button>
        </div>
        <RouterView v-slot="{ Component }">
          <component :is="Component" />
        </RouterView>
      </main>
    </div>
    <CommunicationRail />
    <ThemeLab />
  </div>
</template>

<style scoped>
.api-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  margin-bottom: 16px;
  font-size: 0.86rem;
}
.api-banner.err {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
}
.api-banner .btn {
  margin-left: auto;
}
</style>
