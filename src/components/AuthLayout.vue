<script setup lang="ts">
import Icon from './Icon.vue'

defineProps<{
  eyebrow: string
  title: string
  description: string
}>()
</script>

<template>
  <main class="auth-page">
    <section class="auth-story">
      <div class="auth-brand">
        <span class="auth-brand-mark"><img src="/logo-fago.svg" alt="" /></span>
        <span><b>FagoLab</b><small>Laboratorio de Fagoterapia</small></span>
      </div>
      <div class="auth-story-copy">
        <span class="auth-secure"><Icon name="shield" :size="15" /> Acceso protegido y trazable</span>
        <h2>Cada muestra conserva su historia. Ahora cada acción también.</h2>
        <p>Sesiones seguras, permisos por rol y una bitácora completa para cuidar el trabajo del laboratorio.</p>
        <div class="auth-signals">
          <span><Icon name="route" :size="16" /> Trazabilidad</span>
          <span><Icon name="database" :size="16" /> Datos protegidos</span>
          <span><Icon name="user" :size="16" /> Acceso por persona</span>
        </div>
      </div>
      <img class="auth-agent" src="/robot-portada.png" alt="Agente de apoyo de FagoLab" />
      <div class="auth-orbit one"></div>
      <div class="auth-orbit two"></div>
    </section>

    <section class="auth-form-side">
      <div class="auth-form-card">
        <span class="auth-eyebrow">{{ eyebrow }}</span>
        <h1>{{ title }}</h1>
        <p class="auth-description">{{ description }}</p>
        <slot />
      </div>
      <p class="auth-foot"><Icon name="shield" :size="14" /> Las contraseñas se protegen con Argon2id y nunca pueden ser consultadas.</p>
    </section>
  </main>
</template>

<style scoped>
.auth-page { min-height: 100vh; display: grid; grid-template-columns: minmax(420px, 1.08fr) minmax(420px, .92fr); background: #f4f8fb; color: #102a3a; }
.auth-story { position: relative; min-height: 100vh; overflow: hidden; padding: 42px 54px; color: #fff; background: radial-gradient(circle at 72% 20%, rgba(87,224,191,.2), transparent 30%), linear-gradient(145deg, #073d43 0%, #0a5960 52%, #0d7580 100%); }
.auth-brand { position: relative; z-index: 2; display: flex; align-items: center; gap: 12px; }
.auth-brand-mark { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 15px; background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.2); }
.auth-brand-mark img { width: 34px; height: 34px; object-fit: contain; }
.auth-brand b,.auth-brand small { display: block; }.auth-brand b { font-size: 1.05rem; }.auth-brand small { margin-top: 2px; color: rgba(255,255,255,.67); font-size: .72rem; }
.auth-story-copy { position: relative; z-index: 2; max-width: 590px; margin-top: 14vh; }
.auth-secure { display: inline-flex; align-items: center; gap: 7px; padding: 7px 11px; border: 1px solid rgba(255,255,255,.18); border-radius: 99px; color: #b8f5e4; background: rgba(0,0,0,.09); font-size: .73rem; font-weight: 800; }
.auth-story h2 { max-width: 560px; margin: 22px 0 15px; font-size: clamp(2rem, 4vw, 3.65rem); line-height: 1.04; letter-spacing: -.045em; }
.auth-story-copy > p { max-width: 530px; color: rgba(238,255,250,.75); font-size: 1rem; line-height: 1.7; }
.auth-signals { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 26px; }.auth-signals span { display: inline-flex; align-items: center; gap: 7px; padding: 9px 12px; border-radius: 11px; background: rgba(255,255,255,.1); font-size: .75rem; font-weight: 800; }
.auth-agent { position: absolute; z-index: 1; right: -2%; bottom: -6%; width: min(48%, 420px); max-height: 48vh; object-fit: contain; filter: drop-shadow(0 22px 30px rgba(0,0,0,.2)); opacity: .95; }
.auth-orbit { position: absolute; border: 1px solid rgba(156,250,224,.18); border-radius: 50%; }.auth-orbit.one { width: 360px; height: 360px; right: -130px; top: 60px; }.auth-orbit.two { width: 520px; height: 520px; left: -280px; bottom: -230px; }
.auth-form-side { display: grid; place-items: center; align-content: center; padding: 42px; }
.auth-form-card { width: min(100%, 470px); padding: 36px; border: 1px solid #dce7ec; border-radius: 24px; background: rgba(255,255,255,.94); box-shadow: 0 24px 70px rgba(29,62,79,.1); }
.auth-eyebrow { color: #0e887e; font-size: .72rem; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
.auth-form-card h1 { margin: 9px 0 8px; font-size: 2rem; letter-spacing: -.035em; }.auth-description { margin: 0 0 25px; color: #687d89; font-size: .87rem; line-height: 1.55; }
.auth-foot { display: flex; align-items: center; gap: 7px; width: min(100%, 470px); margin: 17px 0 0; color: #70838d; font-size: .7rem; }
@media (max-width: 900px) { .auth-page { grid-template-columns: 1fr; }.auth-story { min-height: 280px; padding: 28px; }.auth-story-copy { margin-top: 44px; }.auth-story h2 { max-width: 560px; font-size: 2.15rem; }.auth-story-copy > p,.auth-signals { display: none; }.auth-agent { width: 210px; max-height: 220px; }.auth-form-side { padding: 26px 18px 40px; } }
@media (max-width: 520px) { .auth-story { min-height: 235px; }.auth-story-copy { margin-top: 30px; }.auth-story h2 { font-size: 1.65rem; max-width: 78%; }.auth-secure { font-size: .63rem; }.auth-form-card { padding: 25px 20px; border-radius: 19px; } }
</style>
