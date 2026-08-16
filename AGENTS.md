# AGENTS — fago (frontend)

> Contrato de trabajo para agentes y humanos sobre **fago**, el frontend Vue de la
> app de fagoterapia acuícola de Pamela. Léelo antes de tocar código.
> Repo gemelo (backend, con el detalle de BD/flujo/seguridad): `../fago-api/AGENTS.md`.

## 1. Qué es esto

UI para que **Pamela / la doctora** registren su muestreo de laboratorio sin Excel:
recepción del pez → foto y características → órganos → cajas Petri (con QR/código de
barras) → **observación de colonia** → subcultivo → ADN → NanoDrop → PCR → gel.

**El "Excel" vive en la vista Cajas:** seleccionar una caja y registrar su
**observación de colonia** (¿creció? + morfología/color/forma) es el dato central que la
doctora captura. El resto del flujo lo envuelve. La UX de la científica es la prioridad.

## 2. Stack y arquitectura

Vue 3 + TypeScript + Vite + Pinia + vue-router (hash) + qrcode + jsbarcode + chart.js.
Frontend (`fago`) ↔ API (`fago-api`) ↔ Postgres (`fago-bd-postgres`), desplegado en
**Kaanbal Engine**. Ver tabla de entornos y pipeline en `../fago-api/AGENTS.md §2`.

### Resolución de la URL de la API (`src/api.ts`)
1. `import.meta.env.VITE_API_URL` si está definida.
2. Si no, por hostname: `localhost`/`127.0.0.1` → `http://localhost:8000`;
   `dev-*` → `https://dev-fago-api.futurefarms.mx`; resto → `https://fago-api.futurefarms.mx`.

## 3. Flujo de trabajo (contrato del proyecto)

```
local (listo y verificado)  →  push a develop (dev)  →  merge manual develop→main (prod)
```

1. **Local**: `npm run dev` (Vite) + `uvicorn` del backend, ambos contra la **BD dev**
   por Tailscale. La UI local pega a `http://localhost:8000`.
2. **Antes de `git push`**: `npm run build` debe pasar (compila la app). Para el backend,
   además construir la imagen Docker.
3. **Push a `develop`** → CI → Docker Hub → infra-gitops (dev) → ArgoCD → dev.
4. **Merge manual `develop` → `main`** (usuario) → prod.

> El trabajo no se cierra solo con ediciones locales: una entrega a dev/prod está completa
> cuando Argo está Synced/Healthy y la app valida en runtime.

## 4. Setup local

```bash
cd "fago"
npm install
npm run dev        # http://localhost:5173 (cualquier puerto local está permitido por CORS)
npm run build      # debe pasar antes de push
```

## 5. Mapa del código

- `src/api.ts` — cliente fetch (`api.get/post/upload/mediaUrl`), resuelve base URL por entorno.
- `src/stores/lab.ts` — store Pinia. `load()` trae todos los endpoints en paralelo y llena el
  estado reactivo. Escrituras async: `registrarAislamiento`, `registrarObservacion`,
  `crearRecepcion`, `subirImagen` (POST + recarga). Selectores y computeds (`kpis`,
  `cajasPorMedio`, `calidadPorOrgano`) trabajan sobre el estado.
- `src/stores/auth.ts` + `src/stores/presence.ts` — sesión, ACL de interfaz y canal
  WebSocket autenticado con heartbeat/reconexión.
- `src/data/types.ts` — interfaces camelCase **espejo exacto** de lo que devuelve la API.
  Si cambia un campo, coordinar con los alias SQL de `../fago-api/app/repo*.py`.
- `src/data/catalogs.ts` — ORGANOS (9) y MEDIOS (6) con colores + helpers.
- `src/App.vue` — llama `lab.load()` en `onMounted` y muestra banner si la API falla.
- `src/stores/chat.ts`, `tareas.ts`, `ia.ts` — colaboración sobre el único socket de `presence.ts`.
- `src/views/MensajesView.vue` — chat completo; el rail conserva el modo compacto.
- `src/views/TareasView.vue` — Kanban, lista, actividad, detalle y configuración de flujo/permisos.
- `src/views/AsistenteView.vue` — modos Preguntar/Agente/Super y configuración del proveedor.
- `src/views/` — 11 vistas. La mayoría **solo leen** el estado del store; por eso, mientras el
  store mantenga su interfaz pública, las vistas funcionan sin cambios.
  - `AislamientoWizard.vue` — alta de pez + cajas (7 pasos) + subida de foto del pez.
  - `CajasView.vue` — **núcleo Excel**: observación de colonia + foto de la placa.
  - `PecesView.vue` — incluye miniatura de foto (`fotoUrl`).
  - `ProfileView.vue` + `UserProfileCard.vue` — perfil científico, avatar/portada y
    contraseña de cualquier usuario, accesible desde la foto del encabezado.
  - `SecurityAdminView.vue` — usuarios, superadmins, roles, grupos, permisos, auditoría,
    sesiones y presencia en vivo.

## 6. Convenciones (no regresar)

1. **El store es la única fuente**: las vistas no llaman a `fetch` directo; usan el store.
   Tras una escritura, el store hace `load()` para reflejar el estado real de la BD.
2. **Interfaz estable del store**: si añades datos, no rompas `state`, `proyecto`, selectores
   ni computeds existentes — varias vistas dependen de ellos.
3. **camelCase**: los tipos del front y los alias del backend deben coincidir. La API ya
   devuelve la forma final; no transformar en el cliente.
4. **Imágenes visibles aunque no se usen aún**: la subida/visualización de media debe seguir
   presente en la UI (foto de pez, foto de placa, gel) — el usuario quiere mostrar que ya
   está disponible.
5. **UX de la científica primero**: pasos claros, lenguaje del laboratorio, el código del pez
   lo asigna el backend (campo automático), no se piden entidades técnicas a mano.
6. **Un solo WebSocket**: chat, tareas y agente se suscriben mediante `presence.on/subscribe/send`;
   ningún store abre su propio socket.
7. **Mutaciones colaborativas por HTTP**: el socket solo entrega eventos. Los stores escriben por
   `api.post/patch/put/del` para conservar ACL, CSRF y auditoría.
8. **Tareas legales solamente**: antes de arrastrar una tarjeta o pintar un botón, consultar
   `/api/tareas/{clave}/transiciones`; la UI no inventa transiciones.
9. **Secretos del agente**: los inputs de llave son de reemplazo y se vacían al guardar. La UI solo
   muestra `apiKeyPista`, nunca intenta recuperar el valor existente.

## 7. Seguridad

No hay secretos en este repo (la BD vive detrás de la API). No introducir credenciales ni
URLs sensibles en el código. Trabajar solo contra repos de `futurefarms-softwarefactory`.
