// Catálogo de modelos de IA proyectados sobre el laboratorio de fagoterapia de Pamela.
// Aterrizado a su flujo real (pez → caja Petri → subcultivo → ADN → NanoDrop → PCR →
// gel → secuenciación → BLAST) y a la literatura que ella lee. Cada modelo explica:
// qué problema resuelve, el antes/después, qué ahorra y por qué, qué datos necesita
// (propios y públicos) y qué tan cerca está de aplicarse.

export type Madurez = 'listo' | 'historial' | 'futuro'

export const MADUREZ_LABEL: Record<Madurez, string> = {
  listo: 'Aplicable pronto',
  historial: 'Requiere más historial',
  futuro: 'Visión a futuro',
}
export const MADUREZ_DESC: Record<Madurez, string> = {
  listo: 'Se puede empezar con reglas simples o herramientas que ya existen, y poco dato.',
  historial: 'Necesita acumular cientos de ejemplos etiquetados — la app los va juntando.',
  futuro: 'Requiere secuenciación/genómica o ensayos in vivo; es la dirección a la que apunta el proyecto.',
}

// --- Artículos que Pamela ha leído (base de la propuesta) ---
export interface Articulo {
  id: string
  titulo: string
  autores: string
  anio: number
  revista: string
  doi: string
  tema: string
  local?: boolean
}

export const ARTICULOS: Articulo[] = [
  {
    id: 'quiroz26', local: true,
    titulo: 'Bacteriófagos aislados de peces: una alternativa biotecnológica para el control de enfermedades en acuicultura',
    autores: 'Quiroz Ballesteros P. et al.', anio: 2026,
    revista: 'Bol. de Ciencias Agropecuarias del ICAP (UAEH, México)',
    doi: '10.29057/icap.v12i23.16522',
    tema: 'Fagos de peces para control de enfermedades en acuicultura (estudio mexicano).',
  },
  {
    id: 'karthika23',
    titulo: 'Two novel phages PSPa and APPa inhibit P. aeruginosa and mitigate its virulence in a Zebrafish model',
    autores: 'Karthika C. et al.', anio: 2023, revista: 'Scientific Reports',
    doi: '10.1038/s41598-023-45313-x',
    tema: 'Aislamiento de fagos, genoma (66 kb, 92 ORFs) y especificidad de hospedador (96% de 28 aislados MDR).',
  },
  {
    id: 'plumet24',
    titulo: 'Zebrafish as an effective model for evaluating phage therapy in bacterial infections',
    autores: 'Plumet L. et al.', anio: 2024, revista: 'Microbiology Spectrum / mBio',
    doi: '10.1128/spectrum.04253-23',
    tema: 'Pez cebra como modelo para evaluar la eficacia de la fagoterapia in vivo.',
  },
  {
    id: 'lin25',
    titulo: 'Phage–Antibiotic Synergy Enhances Biofilm Eradication and Survival in a Zebrafish Model of P. aeruginosa Infection',
    autores: 'Lin L.-C., Tsai Y.-C., Lin N.-T.', anio: 2025, revista: 'Int. J. Mol. Sci.',
    doi: '10.3390/ijms26115337',
    tema: 'Sinergia fago–antibiótico contra biopelículas; supervivencia en pez cebra.',
  },
  {
    id: 'zhao25',
    titulo: 'Current Trends in Approaches to Prevent and Control Antimicrobial Resistance in Aquatic Veterinary Medicine',
    autores: 'Zhao D. et al.', anio: 2025, revista: 'Pathogens',
    doi: '10.3390/pathogens14070681',
    tema: 'Revisión de resistencia antimicrobiana (AMR) en acuicultura y alternativas (incl. fagos).',
  },
  {
    id: 'kho22',
    titulo: 'Whole-genome sequencing of Pseudomonas koreensis isolated from diseased Tor tambroides',
    autores: 'Kho C.J.Y. et al.', anio: 2022, revista: 'Research Square (preprint)',
    doi: '10.21203/rs.3.rs-1917087/v1',
    tema: 'Secuenciación de genoma completo de un patógeno de peces y genes de virulencia.',
  },
  {
    id: 'yan23',
    titulo: 'Biological Characterization of Pseudomonas fluorescens Phage Pf17397_F_PD1 and Its Application in Food Preservation',
    autores: 'Yan N. et al.', anio: 2023, revista: 'Journal of Food Protection',
    doi: '10.1016/j.jfp.2023.100130',
    tema: 'Fago aislado de intestino de pez; cinética de lisis (latencia 18 min) y anotación de genoma.',
  },
  {
    id: 'radke24',
    titulo: 'Characterization and Genomics of Pectinolytic Bacteria Isolated from Soft Rot Symptomatic Produce',
    autores: 'Radke K. et al.', anio: 2024, revista: 'Pathogens',
    doi: '10.3390/pathogens13121096',
    tema: 'Caracterización fenotípica + genómica para identificar y clasificar bacterias aisladas.',
  },
]

// --- Fuentes de datos públicas y gratuitas que potencian los modelos ---
export interface FuentePublica { nombre: string; desc: string; icon: string; url: string }

export const FUENTES_PUBLICAS: FuentePublica[] = [
  { nombre: 'NCBI GenBank / RefSeq', desc: 'Secuencias y genomas de referencia para identificar especies por ADN.', icon: 'dna', url: 'https://www.ncbi.nlm.nih.gov/' },
  { nombre: 'SILVA / NCBI 16S', desc: 'Base de genes 16S rRNA para identificación bacteriana.', icon: 'dna', url: 'https://www.arb-silva.de/' },
  { nombre: 'PhageScope', desc: '870k+ genomas de fagos con anotación, estilo de vida y asignación de hospedador.', icon: 'phage', url: 'https://phagescope.deepomics.org/' },
  { nombre: 'iPHoP', desc: 'Marco de IA que predice el hospedador de un fago a partir de su genoma.', icon: 'target', url: 'https://bitbucket.org/srouxjgi/iphop/' },
  { nombre: 'PhagesDB / INPHARED', desc: 'Colecciones curadas de fagos y sus hospedadores conocidos.', icon: 'phage', url: 'https://phagesdb.org/' },
  { nombre: 'CARD / ResFinder', desc: 'Bases de genes de resistencia antimicrobiana (AMR).', icon: 'shield', url: 'https://card.mcmaster.ca/' },
  { nombre: 'BacDive', desc: 'Fenotipos bacterianos (morfología, medios, condiciones) para ~97k cepas.', icon: 'microscope', url: 'https://bacdive.dsmz.de/' },
  { nombre: 'Open-Meteo / temperatura del agua', desc: 'Clima y temperatura para correlacionar brotes con la estación.', icon: 'droplet', url: 'https://open-meteo.com/' },
]

export interface ModeloIA {
  id: string
  tipo: 'supervisado' | 'no-supervisado'
  titulo: string
  icon: string
  problema: string
  sinModelo: string
  conModelo: string
  ahorro: string
  pipeline: string[]
  datos: string
  datosPublicos: string[]
  literatura: string[]
  madurez: Madurez
  estrella?: boolean
}

export const SUPERVISADOS: ModeloIA[] = [
  {
    id: 's1', tipo: 'supervisado', titulo: 'Aptitud del ADN para PCR desde el NanoDrop', icon: 'droplet',
    problema: 'Decidir si una extracción de ADN sirve para PCR se hace "a ojo" con los ratios 260/280 y 260/230.',
    sinModelo: 'A veces se corre una PCR con ADN impuro que falla; otras se descarta ADN que sí servía.',
    conModelo: 'Aprende de las decisiones que Pamela ya registra (apta/repetir) y sugiere el veredicto al capturar la lectura.',
    ahorro: 'Cada PCR fallida son reactivos (master mix, primers, taq) + ~1 día perdido + repetir extracción. El modelo lo evita antes de gastar la reacción. Empezar incluso con un umbral simple ya recorta fallos.',
    pipeline: ['Tomar lecturas NanoDrop con su decisión real', 'Variables: ng/µL, 260/280, 260/230', 'Entrenar clasificador (o regla)', 'Sugerir apta/repetir al capturar', 'Pamela confirma → nueva etiqueta'],
    datos: 'lecturas_nanodrop + la decisión apta/repetir (ya se registra).',
    datosPublicos: ['Umbrales de pureza publicados (260/280 ≈ 1.8)'],
    literatura: ['radke24'], madurez: 'listo',
  },
  {
    id: 's2', tipo: 'supervisado', titulo: 'Predecir si la PCR dará banda antes de correrla', icon: 'dna',
    problema: 'No se sabe si una PCR funcionó hasta correr el gel, un día después.',
    sinModelo: 'Se invierte master mix, termociclador y un gel en reacciones que no amplifican.',
    conModelo: 'Estima la probabilidad de banda usando medio, morfología, NanoDrop y método de extracción.',
    ahorro: 'Evita gastar PCR + gel (~2 días y reactivos) en muestras condenadas; prioriza las prometedoras. La ganancia real se mide comparando contra la tasa de éxito histórica.',
    pipeline: ['Etiqueta = banda sí/no en el gel', 'Variables del subcultivo y la extracción', 'Entrenar clasificador', 'Marcar reacciones de bajo éxito esperado', 'Reordenar la cola de PCR'],
    datos: 'pcr_reacciones + carriles_gel (resultado) + nanodrop + caja/medio.',
    datosPublicos: [],
    literatura: ['radke24', 'kho22'], madurez: 'historial',
  },
  {
    id: 's3', tipo: 'supervisado', titulo: 'Morfología de colonia → especie probable', icon: 'dish',
    problema: 'Saber qué bacteria es tarda 1–2 semanas (toda la cadena molecular hasta BLAST).',
    sinModelo: 'Hay que procesar todo a ciegas y esperar la secuenciación para saber qué se tenía.',
    conModelo: 'Desde la descripción de la colonia (color, forma, borde, textura, medio) propone la especie más probable.',
    ahorro: 'Da una apuesta el día 1 para priorizar qué colonias vale la pena subcultivar y secuenciar, en vez de gastar medios y tiempo en todas por igual. No reemplaza la confirmación: la adelanta.',
    pipeline: ['Reunir observaciones de colonia con su especie final (BLAST)', 'Codificar la morfología', 'Entrenar clasificador', 'Sugerir especie + confianza al observar', 'Confirmar con la cadena molecular'],
    datos: 'observaciones_caja_petri + resultados_blast (etiqueta).',
    datosPublicos: ['BacDive (fenotipos/morfología por especie)'],
    literatura: ['radke24', 'quiroz26'], madurez: 'historial',
  },
  {
    id: 's4', tipo: 'supervisado', titulo: 'Identificación de especie desde la secuencia (16S / genoma)', icon: 'dna',
    problema: 'BLAST es manual y a veces ambiguo entre especies cercanas.',
    sinModelo: 'La asignación de especie depende de inspeccionar resultados de BLAST uno por uno.',
    conModelo: 'Un clasificador entrenado sobre referencias asigna especie/cepa a la secuencia con una confianza.',
    ahorro: 'Acelera y estandariza la identificación, reduce ambigüedad entre especies parecidas, y deja un registro reproducible. Aprovecha bases públicas enormes sin trabajo manual.',
    pipeline: ['Tomar la secuencia (16S o genoma)', 'Comparar contra referencias públicas', 'Clasificar especie/cepa', 'Reportar confianza', 'Anexar al registro del aislado'],
    datos: 'secuenciaciones + resultados_blast.',
    datosPublicos: ['NCBI GenBank/RefSeq', 'SILVA / NCBI 16S', 'BacDive'],
    literatura: ['kho22', 'radke24'], madurez: 'listo',
  },
  {
    id: 's5', tipo: 'supervisado', estrella: true, titulo: 'Predicción fago–hospedador: ¿qué fago lisa a qué bacteria?', icon: 'phage',
    problema: 'Encontrar el fago correcto para una bacteria patógena se hace probando combinaciones a ciegas en el banco.',
    sinModelo: 'Cribado manual de muchos fagos contra muchos aislados: costoso en tiempo, medios y placas.',
    conModelo: 'A partir de rasgos genómicos del fago y de la bacteria predice si habrá lisis, acotando las pruebas a las más prometedoras.',
    ahorro: 'Es el corazón de la fagoterapia. En vez de probar todas las combinaciones (un fago efectivo en el 96% de aislados, como reporta Karthika, no se halla por suerte), el modelo prioriza candidatos y reduce el cribado de banco a una fracción. Acelera llegar a un fago útil para un brote.',
    pipeline: ['Reunir pares fago–bacteria con resultado de lisis (spot test)', 'Extraer rasgos genómicos de ambos', 'Entrenar el predictor', 'Rankear fagos candidatos para una bacteria', 'Confirmar en banco los top y retroalimentar'],
    datos: 'aislamientos_bacterianos + ensayos de lisis (a registrar) + genomas.',
    datosPublicos: ['PhageScope', 'iPHoP', 'PhagesDB / INPHARED', 'NCBI GenBank'],
    literatura: ['karthika23', 'quiroz26', 'yan23', 'plumet24'], madurez: 'futuro',
  },
  {
    id: 's6', tipo: 'supervisado', titulo: 'Predecir resistencia antimicrobiana (AMR) desde el genoma', icon: 'shield',
    problema: 'Saber si una cepa resiste antibióticos requiere antibiogramas largos.',
    sinModelo: 'Sin el perfil de resistencia es difícil justificar cuándo conviene un fago en lugar de un antibiótico.',
    conModelo: 'Detecta genes de resistencia en el genoma y predice el perfil AMR de la cepa.',
    ahorro: 'Prioriza los casos donde el fago es la mejor opción (cepas multirresistentes) y aporta el argumento clínico/regulatorio. Acelera frente al antibiograma y usa bases públicas ya existentes.',
    pipeline: ['Tomar el genoma del aislado', 'Buscar genes AMR en bases públicas', 'Predecir el perfil de resistencia', 'Marcar cepas MDR candidatas a fago', 'Adjuntar al expediente del aislado'],
    datos: 'secuenciaciones + aislamientos_bacterianos.',
    datosPublicos: ['CARD', 'ResFinder', 'NCBI AMRFinderPlus'],
    literatura: ['zhao25'], madurez: 'listo',
  },
  {
    id: 's7', tipo: 'supervisado', titulo: 'Detectar contaminación en una caja Petri', icon: 'alert',
    problema: 'Una caja contaminada o con flora mixta puede pasar desapercibida y avanzar a subcultivo.',
    sinModelo: 'Se subcultiva y procesa material inútil, perdiendo medios y ~1 semana.',
    conModelo: 'Marca cajas con morfología/medio incongruentes como posible contaminación para revisión.',
    ahorro: 'Corta el desperdicio temprano: evita subcultivar, extraer y correr PCR sobre algo contaminado. Es revisión asistida, la decisión final sigue siendo humana.',
    pipeline: ['Reunir cajas etiquetadas (limpia/contaminada)', 'Codificar morfología + medio', 'Entrenar detector', 'Señalar cajas sospechosas', 'Confirmar y retroalimentar'],
    datos: 'observaciones_caja_petri + estado de la caja.',
    datosPublicos: ['BacDive'],
    literatura: ['radke24'], madurez: 'historial',
  },
  {
    id: 's8', tipo: 'supervisado', titulo: 'Lectura automática de geles (visión por computadora)', icon: 'wave',
    problema: 'Interpretar geles de electroforesis es lento, subjetivo y varía entre personas.',
    sinModelo: 'Cada quien lee las bandas a su criterio; el tamaño en pb se estima a ojo.',
    conModelo: 'Desde la foto del gel detecta carriles, presencia de banda y estima el tamaño en pares de bases.',
    ahorro: 'Lectura objetiva, consistente y trazable; libera horas y reduce errores de interpretación. La app ya guarda fotos (media_archivos), así que el insumo existe.',
    pipeline: ['Reunir fotos de gel etiquetadas (banda/tamaño)', 'Entrenar modelo de visión', 'Detectar carriles y bandas', 'Estimar tamaño en pb', 'Adjuntar resultado al carril'],
    datos: 'geles_electroforesis + carriles_gel + media_archivos (fotos).',
    datosPublicos: ['Modelos de visión preentrenados'],
    literatura: ['kho22'], madurez: 'historial',
  },
  {
    id: 's9', tipo: 'supervisado', titulo: 'Contar y clasificar colonias en foto de caja', icon: 'image',
    problema: 'Contar colonias y distinguir morfotipos a ojo es tedioso y poco reproducible.',
    sinModelo: 'El conteo manual consume tiempo de microscopio y no queda registrado de forma uniforme.',
    conModelo: 'Desde la foto cuenta colonias y separa morfotipos automáticamente.',
    ahorro: 'Conteo rápido, reproducible y trazable; libera tiempo y estandariza el criterio entre sesiones y personas.',
    pipeline: ['Reunir fotos de cajas anotadas', 'Entrenar modelo de visión', 'Detectar y contar colonias', 'Clasificar morfotipos', 'Guardar conteo en la observación'],
    datos: 'media_archivos (fotos de caja) + observaciones_caja_petri.',
    datosPublicos: ['Modelos de visión preentrenados'],
    literatura: ['radke24'], madurez: 'historial',
  },
  {
    id: 's10', tipo: 'supervisado', titulo: 'Predecir el rendimiento de extracción de ADN', icon: 'beaker',
    problema: 'A veces se empieza con poco material y la extracción se queda corta para PCR.',
    sinModelo: 'Se descubre el bajo rendimiento al final, ya gastada la muestra y los reactivos.',
    conModelo: 'Estima los ng/µL esperados según órgano/tipo de muestra y método de extracción.',
    ahorro: 'Permite planear cuánta muestra inicial usar y elegir el método adecuado; menos extracciones fallidas y repeticiones.',
    pipeline: ['Tomar extracciones con su rendimiento (NanoDrop)', 'Variables: tipo de muestra, método', 'Entrenar regresión', 'Predecir el rendimiento esperado', 'Sugerir ajuste de material/método'],
    datos: 'extracciones_adn + lecturas_nanodrop + muestras_biologicas.',
    datosPublicos: [],
    literatura: [], madurez: 'listo',
  },
  {
    id: 's11', tipo: 'supervisado', estrella: true, titulo: 'Predecir eficacia in vivo (modelo pez cebra)', icon: 'fish',
    problema: 'Llevar cada combinación fago–bacteria a un ensayo en pez cebra es caro y lento.',
    sinModelo: 'Se prueban muchas dosis/combinaciones in vivo sin un criterio para priorizar.',
    conModelo: 'Aprende de ensayos (dosis, MOI, fago, bacteria, ± antibiótico) qué combinaciones elevan la supervivencia.',
    ahorro: 'Prioriza qué pocas combinaciones llevar al ensayo in vivo, ahorrando animales, tiempo y reactivos. La sinergia fago–antibiótico (Lin 2025) y el modelo pez cebra (Plumet 2024) son justo el terreno de esta predicción.',
    pipeline: ['Registrar ensayos in vivo con su resultado', 'Variables: fago, bacteria, dosis, MOI, sinergia', 'Entrenar modelo de supervivencia', 'Rankear combinaciones a ensayar', 'Validar in vivo y retroalimentar'],
    datos: 'Resultados de ensayos in vivo (a registrar) + aislados + fagos.',
    datosPublicos: ['Literatura de dosis/MOI publicadas'],
    literatura: ['plumet24', 'lin25', 'karthika23'], madurez: 'futuro',
  },
]

export const NO_SUPERVISADOS: ModeloIA[] = [
  {
    id: 'u1', tipo: 'no-supervisado', titulo: 'Agrupar morfotipos de colonia', icon: 'layers',
    problema: 'El vocabulario para describir colonias es libre e inconsistente entre personas y días.',
    sinModelo: 'No se pueden comparar ni sumar descripciones; cada quien escribe distinto.',
    conModelo: 'Agrupa por similitud las observaciones y revela los morfotipos recurrentes.',
    ahorro: 'Descubre "siempre aparecen estos 5–6 tipos" y estandariza cómo se describen las colonias. Mejora todos los reportes y prepara el dato para los modelos supervisados. No necesita etiquetas → aplicable ya.',
    pipeline: ['Reunir observaciones de colonia', 'Codificar color/forma/textura', 'Clustering', 'Caracterizar cada morfotipo', 'Proponer un vocabulario estándar'],
    datos: 'observaciones_caja_petri.',
    datosPublicos: ['BacDive (para nombrar morfotipos)'],
    literatura: ['radke24'], madurez: 'listo',
  },
  {
    id: 'u2', tipo: 'no-supervisado', titulo: 'Detección de anomalías en NanoDrop', icon: 'target',
    problema: 'Una lectura rara (error de pipeteo, muestra contaminada, burbuja) se mezcla con las normales.',
    sinModelo: 'Un dato malo se cuela y contamina promedios y decisiones posteriores.',
    conModelo: 'Marca lecturas estadísticamente atípicas para revisión.',
    ahorro: 'Limpia el dato antes de construir sobre él y atrapa errores de captura/medición a tiempo. Aplicable ya, con pocos datos.',
    pipeline: ['Modelar el rango normal de las lecturas', 'Calcular el grado de rareza', 'Marcar outliers', 'Mostrar para revisión', 'Confirmar error o caso real'],
    datos: 'lecturas_nanodrop.',
    datosPublicos: [],
    literatura: [], madurez: 'listo',
  },
  {
    id: 'u3', tipo: 'no-supervisado', estrella: true, titulo: 'Agrupar fagos por espectro de hospedador (cócteles)', icon: 'phage',
    problema: 'Diseñar un "cóctel" de fagos que cubra varias bacterias se hace a tientas.',
    sinModelo: 'No se sabe qué fagos se complementan para cubrir un grupo de patógenos.',
    conModelo: 'Agrupa fagos según qué bacterias lisan y revela familias complementarias.',
    ahorro: 'Base del producto terapéutico: cócteles que cubren grupos de bacterias y reducen la resistencia. Conecta con la sinergia que reportan Lin (fago+antibiótico) y Karthika.',
    pipeline: ['Reunir matriz fago × bacteria (lisis)', 'Calcular similitud de espectro', 'Clustering de fagos', 'Identificar familias complementarias', 'Proponer cócteles candidatos'],
    datos: 'Ensayos de lisis fago × aislado (a registrar).',
    datosPublicos: ['PhageScope', 'PhagesDB / INPHARED'],
    literatura: ['lin25', 'karthika23', 'zhao25'], madurez: 'historial',
  },
  {
    id: 'u4', tipo: 'no-supervisado', titulo: 'Agrupar aislados por perfil genómico (pangenoma)', icon: 'dna',
    problema: 'No se ve qué aislados son del mismo linaje/clon mirándolos uno por uno.',
    sinModelo: 'Brotes relacionados parecen casos sueltos; no se detecta el patrón.',
    conModelo: 'Agrupa genomas por similitud y revela linajes, clones y posibles fuentes comunes.',
    ahorro: 'Mapa epidemiológico: distingue un brote de un mismo clon de casos independientes, orientando la respuesta. Aprovecha el análisis comparativo que ya usan Kho y Radke.',
    pipeline: ['Reunir genomas de los aislados', 'Calcular distancias genómicas', 'Clustering / pangenoma', 'Caracterizar cada linaje', 'Rastrear fuentes comunes'],
    datos: 'secuenciaciones + aislamientos_bacterianos.',
    datosPublicos: ['NCBI GenBank', 'BacDive'],
    literatura: ['kho22', 'radke24'], madurez: 'historial',
  },
  {
    id: 'u5', tipo: 'no-supervisado', titulo: 'Visualizar las muestras en 2D (PCA / UMAP)', icon: 'grid',
    problema: 'Es imposible ver estructura en una tabla de cientos o miles de muestras.',
    sinModelo: 'Los patrones están en el dato pero nadie los ve mirando filas.',
    conModelo: 'Proyecta todas las muestras a un mapa 2D donde se ven agrupaciones y rarezas.',
    ahorro: 'Exploración visual rápida: revela qué variables importan y qué muestras se parecen, guiando qué modelo construir. Aplicable ya.',
    pipeline: ['Armar la matriz de variables', 'Aplicar PCA/UMAP', 'Graficar en 2D', 'Colorear por especie/medio', 'Interpretar agrupaciones'],
    datos: 'Todo el flujo (caja → nanodrop → pcr → blast).',
    datosPublicos: [],
    literatura: [], madurez: 'listo',
  },
  {
    id: 'u6', tipo: 'no-supervisado', titulo: 'Deriva del instrumento NanoDrop', icon: 'activity',
    problema: 'El equipo se descalibra lentamente y nadie lo nota a tiempo.',
    sinModelo: 'Las lecturas se van "corriendo" y las decisiones se sesgan sin aviso.',
    conModelo: 'Detecta cambios de tendencia/régimen en las lecturas a lo largo del tiempo.',
    ahorro: 'Alerta de "tus lecturas se están desviando desde tal fecha" → calibrar a tiempo y evitar decisiones sobre datos sesgados.',
    pipeline: ['Serie temporal de lecturas', 'Detección de cambio de régimen', 'Marcar el punto de quiebre', 'Avisar la deriva', 'Programar calibración'],
    datos: 'lecturas_nanodrop con fecha.',
    datosPublicos: [],
    literatura: [], madurez: 'listo',
  },
  {
    id: 'u7', tipo: 'no-supervisado', titulo: 'Agrupar el texto libre de observaciones', icon: 'book',
    problema: 'Las notas en lenguaje natural no se pueden sumar ni comparar.',
    sinModelo: 'El conocimiento de la doctora queda atrapado en texto suelto.',
    conModelo: 'Topic modeling descubre las frases e incidencias recurrentes.',
    ahorro: 'Convierte texto libre en un diccionario de incidencias accionable y estandariza la terminología del laboratorio.',
    pipeline: ['Reunir observaciones de texto', 'Embeddings de texto', 'Clustering de temas', 'Nombrar cada tema', 'Tablero de incidencias'],
    datos: 'Campos de observación de cajas/subcultivos.',
    datosPublicos: [],
    literatura: [], madurez: 'historial',
  },
  {
    id: 'u8', tipo: 'no-supervisado', titulo: 'Segmentar colonias en imágenes (sin etiquetas)', icon: 'eye',
    problema: 'Para medir o contar colonias normalmente hay que etiquetar a mano cada imagen.',
    sinModelo: 'El análisis de imagen depende de marcado manual previo, que casi nunca se hace.',
    conModelo: 'Separa automáticamente las colonias en la foto para medirlas y contarlas.',
    ahorro: 'Habilita medir tamaño/densidad de colonias sin trabajo de etiquetado previo, abriendo la puerta al análisis de imagen a gran escala.',
    pipeline: ['Reunir fotos de cajas', 'Segmentación no supervisada', 'Separar colonias del fondo', 'Medir tamaño/forma', 'Exportar mediciones'],
    datos: 'media_archivos (fotos de caja).',
    datosPublicos: ['Modelos de segmentación preentrenados'],
    literatura: ['radke24'], madurez: 'historial',
  },
  {
    id: 'u9', tipo: 'no-supervisado', titulo: 'Detectar lotes de medio defectuosos', icon: 'flask',
    problema: 'Un lote de medio malo arruina muchas cajas sin que se vea el patrón.',
    sinModelo: 'Se nota tarde, cuando el daño ya se repartió en muchos experimentos.',
    conModelo: 'Encuentra agrupaciones de resultados anómalos asociados a un mismo lote de medio.',
    ahorro: 'Aísla la causa raíz rápido ("las cajas de este lote rinden raro") y retira el lote antes de seguir contaminando resultados.',
    pipeline: ['Agrupar resultados por lote de medio', 'Comparar contra la norma', 'Detectar lotes anómalos', 'Rastrear la causa', 'Retirar/sustituir el lote'],
    datos: 'lotes_medio_cultivo + resultados de caja/subcultivo.',
    datosPublicos: [],
    literatura: [], madurez: 'listo',
  },
  {
    id: 'u10', tipo: 'no-supervisado', titulo: 'Patrones estacionales de patógenos', icon: 'calendar',
    problema: 'Los brotes parecen aleatorios; no se relacionan con la época o la temperatura del agua.',
    sinModelo: 'Cada brote se atiende de cero, sin anticipar qué patógeno esperar y cuándo.',
    conModelo: 'Descompone la serie y relaciona qué patógenos suben según estación y temperatura.',
    ahorro: 'Prevención anticipada: "tal patógeno se dispara en aguas cálidas de verano" orienta vigilancia y preparación. Conecta con el enfoque One-Health de Zhao.',
    pipeline: ['Serie temporal de identificaciones', 'Cruzar con temperatura del agua', 'Descomposición estacional', 'Asociar patógeno ↔ estación', 'Calendarizar vigilancia'],
    datos: 'resultados_blast + fechas + recepciones.',
    datosPublicos: ['Open-Meteo / temperatura del agua'],
    literatura: ['zhao25', 'quiroz26'], madurez: 'historial',
  },
  {
    id: 'u11', tipo: 'no-supervisado', titulo: 'Co-ocurrencia de genes de virulencia', icon: 'link',
    problema: 'No se sabe qué genes de virulencia tienden a aparecer juntos en los aislados.',
    sinModelo: 'Cada genoma se mira aislado; se pierden los patrones de combinación.',
    conModelo: 'Descubre qué genes de virulencia co-ocurren y definen perfiles de peligrosidad.',
    ahorro: 'Perfiles de riesgo que ayudan a priorizar qué aislados son más peligrosos y merecen fago primero. Extiende el hallazgo de genes de virulencia de Kho.',
    pipeline: ['Anotar genes de virulencia por genoma', 'Análisis de co-ocurrencia', 'Agrupar perfiles', 'Caracterizar peligrosidad', 'Priorizar aislados'],
    datos: 'secuenciaciones + anotación genómica.',
    datosPublicos: ['NCBI GenBank', 'CARD'],
    literatura: ['kho22'], madurez: 'futuro',
  },
]
