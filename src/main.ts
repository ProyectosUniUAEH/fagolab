import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './assets/main.css'
import App from './App.vue'
import { router } from './router'
import { useAuthStore } from './stores/auth'
import { api } from './api'

const pinia = createPinia()
const auth = useAuthStore(pinia)

router.beforeEach(async (to) => {
  if (!auth.initialized) await auth.initialize()
  if (to.meta.public) {
    if (auth.authenticated && ['login', 'registro', 'configuracion-inicial'].includes(String(to.name))) return { name: 'dashboard' }
    return true
  }
  if (!auth.authenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (auth.user?.mustChangePassword && to.name !== 'perfil') {
    return { name: 'perfil', query: { changePassword: '1' } }
  }
  const permission = to.meta.permission as string | undefined
  if (permission && !auth.can(permission)) return { name: 'sin-permiso' }
  return true
})

router.afterEach((to) => {
  if (!to.meta.public && auth.authenticated) {
    void api.post('/api/auth/page-view', {
      path: to.fullPath,
      name: String(to.name ?? ''),
      title: String(to.meta.title ?? ''),
    }).catch(() => undefined)
  }
})

window.addEventListener('fagolab:session-expired', () => {
  if (router.currentRoute.value.name !== 'login') {
    router.replace({ name: 'login', query: { expired: '1', redirect: router.currentRoute.value.fullPath } })
  }
})

createApp(App).use(pinia).use(router).mount('#app')
