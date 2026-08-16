# Guía de Usuario — AquaBio (Laboratorio de Fagoterapia Acuícola)

Bienvenida, Pamela. Esta es tu aplicación para registrar el muestreo y los análisis de bacterias de peces en el laboratorio, sustituyendo el Excel que usas actualmente.

## 🏠 Inicio (Dashboard)

Al abrir la app, ves un resumen de tu trabajo:
- **Peces:** cuántos individuos procesaste
- **Cajas Petri:** cuántos cultivos has preparado
- **Con crecimiento:** cajas que mostraron colonias (el dato central)
- **NanoDrop:** cuántas lecturas de pureza de ADN has tomado
- Gráficas del progreso por medio (ADA, SyM, TSA…) y calidad por órgano

## 📋 Flujo de trabajo

### 1️⃣ **Recepciones**  
Cuando recibas un lote de peces nuevos:
1. Haz clic en **Recepciones**
2. Haz clic en **Nueva Recepción**
3. Completa:
   - Origen (p.ej., "Estanque Granja X")
   - Especie (Tilapia, Trucha…)
   - Cantidad de peces
   - Motivo del envío (p.ej., "Muestreo Muestreo 4")

Presiona **Guardar**. El sistema genera automáticamente un código REC-YYYYMMDD-NN.

### 2️⃣ **Nuevo Aislamiento**
Por cada pez, registra sus muestras, cajas y fotos:
1. Ve a **Nuevo aislamiento**
2. **Paso 1: Datos del pez**
   - Selecciona la recepción que creaste
   - Peso (g), longitud (cm)
   - Estado clínico (enfermo, sano…)
   - Lesiones visibles
   - **Foto del pez** (sube aquí)
3. **Paso 2-4: Órganos y medios**
   - Marca qué órganos muestreaste (Branquia, Intestino, Hígado…)
   - Marca qué medios de cultivo usaste (ADA, SyM, TSA…)
4. **Paso 5-7: Confirmación y siembra**
   - Verifica y avanza
   - La app genera automáticamente códigos para el pez (PEZ-NNN), muestras (MB-…) y cajas (CP-…)
   - Todos con QR y código de barras imprimibles

El sistema crea N cajas (1 por cada medio × órgano).

### 3️⃣ **Cajas Petri** ⭐ (El corazón del Excel)
Aquí registras lo más importante: **la descripción de la colonia** que creció en cada caja.

1. Ve a **Cajas Petri**
2. Selecciona una caja de la lista (o búscala por código)
3. En el panel derecho, llena:
   - **¿Hubo crecimiento?** (sí/no)
   - **Descripción** (p.ej., "colonias amarillas, mucosas")
   - Color, forma, borde, elevación (opcional, para más detalle)
   - **Foto de la placa** (sube aquí)
4. Presiona **Guardar observación**

⚠️ **Esto es lo que tu Excel capturaba en la fila de "Descripción de la Colonia".**  
Aquí se guarda permanentemente, vinculado al frasco (F-number), medio, órgano y replica.

### 4️⃣ **Subcultivos** → **NanoDrop** → **PCR** → **Electroforesis**
Una vez observada una caja con colonias:
1. Crea un **Subcultivo** (selecciona la caja, elige colonia representativa)
2. Haz una **Extracción de ADN**
3. Lee con **NanoDrop** → aquí entran tus ratios (260/280, 260/230, ng/µL)
4. Si la calidad es buena, procede a **PCR** (amplificación del 16S rRNA)
5. Corre un **Gel** (electroforesis) con los productos PCR

Cada paso genera códigos únicos y etiquetas QR.

### 5️⃣ **Reportes** 📊
Ve a **Reportes** para ver tu trabajo consolidado:
- Tabla con todas tus muestras (igual que tu hoja "Resumen" del Excel)
- Columnas: Lote | Nº(F) | Muestra | Órgano | Medio | Descripción | 260/280 | 260/230 | ng/µL
- Búsqueda en vivo (filtra por lote, muestra, órgano, medio)
- **Botón "Descargar Excel"** → descarga un `.xlsx` con la misma forma que tu Excel actual

## 🏷️ Etiquetas QR

Ve a **Etiquetas QR** para imprimir las etiquetas de los códigos que generaste:
- Pez (PEZ-NNN)
- Muestra (MB-…)
- Caja (CP-…)
- Vial (F-number)
- Gel (GEL-…)

Imprime y pega en los tubos, cajas, placas. El QR contiene el código completo para escanear después.

## 💾 Modelo de Datos

Ve a **Modelo de Datos** para ver la estructura de la BD (para referencia técnica).

## ⚡ Tips rápidos

✅ **El sistema genera códigos automáticamente** — no tienes que escribir PEZ-001 a mano.  
✅ **Subes fotos directamente** — el pez, la placa, el gel.  
✅ **Búsqueda en vivo en todas las listas** — filtra por código, órgano, medio.  
✅ **Los datos están indexados** — cada objeto es rastreable desde el pez hasta el resultado PCR.  
✅ **Descarga el reporte Excel en cualquier momento** — para compartir, respaldar, o analizar en Excel si lo necesitas.  
✅ **Etiquetas QR listas para imprimir** — ya generadas, lisas para pegar.  

## 🔐 Seguridad y Trazabilidad

Todos tus registros quedan guardados y auditables. No hay ediciones "ocultas". Si necesitas corregir algo, se registra como una nueva observación.

## 📞 Soporte

Si algo no funciona:
1. Revisa el menú **Modelo de Datos** para entender la estructura
2. Recarga la página (F5)
3. Contacta al equipo técnico

---

**¡Bienvenida a AquaBio!** Ahora tu muestreo está digitalizado, trazable y listo para análisis.
