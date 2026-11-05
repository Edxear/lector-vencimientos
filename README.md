# Lector Vencimientos

Lector Vencimientos es una PWA Android-first pensada para controlar fechas de caducidad y evitar desperdicios en despensa, cocina, almacén o comercio. La app combina escaneo del producto, lectura OCR de la fecha, almacenamiento persistente por usuario y alertas inteligentes para avisar antes de que un alimento o producto caduque.

La idea central no es solo registrar productos: es transformar un problema cotidiano (olvidar la fecha real de vencimiento o no saber qué tiene que consumir antes) en un flujo rápido, práctico y confiable desde el móvil.

## Qué resuelve la app

- Registra productos por código de barras o ingreso manual.
- Toma fotos del producto y de la fecha de vencimiento.
- Permite recortar la zona exacta de la fecha para mejorar la lectura OCR.
- Detecta formatos de fecha reales y ambiguos (`DD/MM/YY`, `MM/DD/YY`, `YYYY-MM-DD`, abreviados, mes escrito, fechas con letras deformadas, etc.).
- Guarda los datos localmente y luego sincroniza con Supabase para persistencia por usuario.
- Envía avisos de vencimiento antes de la fecha límite.
- Ajusta alertas según el uso del usuario: hogar o comercio, con contexto y ubicación opcional.
- Organiza productos por áreas como almacén, frío, congelados, bazar, verdulería, carnicería y devolución proveedor.
- Permite importar productos desde tickets o texto para acelerar el alta masiva.
- Registra el costo por unidad y permite marcar lotes vencidos como desperdicio para consultar las pérdidas en una analítica mensual.

## Cambios significativos que se hacen en la app

A lo largo del desarrollo, la aplicación pasó de una idea de registro simple a una herramienta más robusta y útil para uso real. Los cambios principales fueron:

### 1) Mejoras en la lectura de fechas
Se implementó un sistema de análisis de fechas más sólido que no se limita a un formato único. La app:

- acepta varios patrones de fecha
- reintenta lecturas con reemplazos comunes de OCR (`O` por `0`, `I` por `1`, `S` por `5`, etc.)
- identifica fechas ambiguas y propone varias lecturas posibles si hace falta
- permite elegir el orden habitual del formato: DMY, MDY o YMD
- convierte textos con errores de impresión, letras deformadas o empaques arrugados en una fecha usable

Esto es clave porque en la vida real las fechas no siempre vienen perfectas: a veces están borrosas, en distintas posiciones o con formatos no estándar.

### 2) Captura visual tipo Google Lens
La toma de la fecha dejó de depender de una foto entera y difícil de leer. Ahora se incorpora un flujo visual con:

- cámara en vivo
- recuadro ajustable para seleccionar la zona exacta de la fecha
- OCR solo sobre el área elegida
- posibilidad de redimensionar y ajustar la imagen para facilitar la lectura
- refinamiento del resultado para obtener una fecha más confiable

Esto mejora mucho la precisión cuando el paquete es pequeño, los números están borrosos o la imagen completa es demasiado grande.

### 3) Sistema de notificaciones más inteligente
La app ya no solo avisa con un mensaje fijo. Se incorporó un enfoque más contextual:

- anticipación configurable por producto
- notificaciones diarias basadas en vencimiento
- avisos adaptados al uso del usuario (hogar, comercio, almacén, etc.)
- geolocalización opcional y punto de referencia para detectar contexto de entorno
- intención de notificar cuando el usuario está cerca de su punto de referencia (por ejemplo, cerca de la cocina o del comercio)

### 4) Persistencia local + sincronización en la nube
La app está diseñada como local-first:

- guarda los datos en Dexie localmente
- sincroniza con Supabase por usuario
- resiste fallas de conectividad y puede recuperar datos luego
- mantiene una cola de sincronización para no perder registros

Esto hace que el producto sea práctico en Android incluso si la conexión es intermitente.

### 5) Organización por áreas y productos
Se agregaron áreas para clasificarlos y filtrar rápidamente:

- Almacén
- Frío
- Congelados
- Bazar
- Verdulería
- Carnicería
- Devolución Proveedor

Además, cada producto puede tener datos propios como cantidad, foto, notas, zona, días de aviso y observaciones relevantes.

### 6) Importación de compras y tickets
La app incluye una capa de importación para no tener que cargar cada producto a mano:

- lectura de tickets o textos de compras
- extracción de nombres de productos
- detección de supermercado
- estimación de vencimiento según el tipo de producto
- alta de productos en lote desde un CSV o texto

Esto crea una diferencia importante frente a apps tradicionales: reduce mucho el trabajo manual y ayuda a la gestión del stock para compras frecuentes.

## Stack tecnológico

- Frontend: React + Vite + JavaScript
- PWA: `vite-plugin-pwa` y Service Worker
- Almacenamiento local: Dexie
- Base de datos y auth: Supabase (Postgres, Auth, RLS)
- OCR: Tesseract.js
- Parsing de fechas: lógica propia con validación multi-formato
- Notificaciones: Web Push + cron en Vercel
- Hosting: Vercel

## Arquitectura general

La aplicación se divide en varios bloques:

1. Frontend móvil/PWA
   - navegación y flujo de alta de productos
   - cámara, OCR, recorte y edición de fotos
   - gestión del inventario y filtros

2. Base local
   - almacenamiento persistente offline
   - sincronización con la nube
   - recuperación de datos ante cortes de conexión

3. Supabase
   - auth por usuario
   - tablas de productos e inventario
   - configuración de usuario, alertas y contexto
   - soporte para sincronización segura y escalable

4. Cron y notificaciones
   - chequeo diario de vencimientos
   - envío de avisos push
   - lógica contextual según hogar/comercio y configuración del usuario

5. Lógica de fechas y OCR
   - extracción del texto de la foto
   - limpieza y normalización
   - comparación de formatos
   - resolución de ambigüedades y corrección de errores comunes

## Funcionalidades principales

- Escaneo de código de barras por cámara.
- Carga manual y edición de productos.
- Foto del producto con ajuste de tamaño y calidad.
- Foto de la fecha con recorte tipo Lens.
- Lectura OCR de la fecha y validación del resultado.
- Guardado local y persistencia por usuario.
- Organización por áreas y categorías.
- Filtros por área y búsqueda.
- Configuración de alertas por días de anticipación.
- Permiso de ubicación y uso del entorno (hogar/comercio).
- Cron de notificaciones y mensajes contextuales.
- Importación de compras desde texto, ticket o CSV.
- Analítica de desperdicios por mes, basada en los lotes marcados explícitamente y en sus costos registrados.

Para instalaciones existentes que ya aplicaron `migration_v2.sql`, ejecutar `supabase/migration_v3.sql` en Supabase > SQL Editor antes de desplegar esta versión. Las instalaciones nuevas ya incluyen estos campos en `schema.sql`. Los productos anteriores no tienen costo asignado y no se incluirán en los importes hasta que se complete ese dato.


## Resultado final

Lector Vencimientos no es solo una app de control de inventario: es una herramienta móvil pensada para uso real en cocina, despensa, almacén o comercio, con foco en la lectura de fechas del mundo real, la usabilidad en Android y la automatización de alertas útiles para evitar desperdicios.
