# Lector Vencimientos

Lector Vencimientos es una PWA Android-first enfocada en el control de stock, inventario y fechas de vencimiento para comercios. La app combina escaneo del producto, lectura OCR de la fecha, almacenamiento persistente por usuario y alertas para reducir pérdidas.

La idea central no es solo registrar productos: es transformar un problema cotidiano (olvidar la fecha real de vencimiento o no saber qué tiene que consumir antes) en un flujo rápido, práctico y confiable desde el móvil.

## Qué resuelve la app

- Registra productos por código de barras o ingreso manual.
- Toma fotos del producto y de la fecha de vencimiento.
- Permite recortar la zona exacta de la fecha para mejorar la lectura OCR.
- Detecta formatos de fecha reales y ambiguos (`DD/MM/YY`, `MM/DD/YY`, `YYYY-MM-DD`, abreviados, mes escrito, fechas con letras deformadas, etc.).
- Guarda los datos localmente y luego sincroniza con Supabase para persistencia por usuario.
- Envía avisos de vencimiento antes de la fecha límite.
- Ofrece alertas con ubicación opcional del local.
- Organiza productos por áreas comerciales (almacén, frío, congelados, bazar, verdulería, carnicería y devolución a proveedor). Las áreas antiguas de los lotes existentes se conservan y siguen disponibles al filtrarlos o editarlos.
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
- avisos adaptados al contexto del comercio
- geolocalización opcional y punto de referencia para detectar contexto de entorno
- intención de notificar cuando el usuario está cerca del local

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
   - lógica contextual según la ubicación y configuración del comercio

5. Lógica de fechas y OCR
   - extracción del texto de la foto
   - limpieza y normalización
   - comparación de formatos
   - resolución de ambigüedades y corrección de errores comunes

## Funcionalidades principales

- Escaneo de código de barras por cámara cuando el navegador admite `BarcodeDetector`. En otros navegadores se informa la limitación antes de pedir acceso a la cámara y se ofrece ingreso manual; esto no sustituye un escáner compatible.
- Carga manual y edición de productos.
- Foto del producto con ajuste de tamaño y calidad.
- Foto de la fecha con recorte tipo Lens.
- Carga conjunta de varias fechas y cantidades para un producto, como lotes independientes.
- Fecha de apertura y días de conservación opcionales por lote; se mantiene el vencimiento original y se usa la fecha más temprana para avisos y pérdidas. La apertura afecta a todas las unidades del lote.
- Lectura de códigos QR como identificadores de producto cuando el navegador admite ese formato; no se abren los enlaces contenidos en el código.
- Importación y exportación de inventario XLSX desde Ajustes, usando el archivo exportado como plantilla. La importación agrega únicamente productos y lotes nuevos; para importar lotes de otra cuenta hay que borrar `id_lote` para crearlos como nuevos. El Excel no incluye historial, fotos, recepción ni archivo de productos y no es una copia de seguridad completa.
- Sonido de alarma opcional mientras la app está visible, sujeto a las restricciones de audio del navegador. La notificación con la app cerrada usa el sonido configurado en el sistema.
- Lectura OCR de la fecha y validación del resultado.
- Guardado local y persistencia por usuario.
- Registro e inicio de sesión individuales. Desde Ajustes se puede solicitar un cambio de correo de la cuenta; la confirmación depende de la configuración de Supabase Auth y puede requerir revisar el correo anterior y el nuevo.
- Eliminación permanente de la cuenta y sus datos sincronizados desde Ajustes, con confirmación por correo. Las copias locales guardadas sin conexión en otros dispositivos deben borrarse allí.
- Bloqueo de pantalla opcional por cuenta y dispositivo tras 15 minutos de inactividad. Para desbloquear se necesita conexión y la contraseña de la cuenta. El bloqueo no cifra los datos guardados en el dispositivo.
- Organización por áreas y categorías.
- Filtros por área y búsqueda.
- Configuración de alertas por días de anticipación.
- Permiso de ubicación y referencia opcional del local.
- Cron de notificaciones y mensajes contextuales.
- Importación de compras desde texto, ticket o CSV.
- Analítica de desperdicios por mes, basada en los lotes marcados explícitamente y en sus costos registrados.

En Ajustes se muestran la versión y la fecha y hora del build. Esta información se genera durante la compilación.

Las preferencias de ubicación del modo anterior no se convierten automáticamente en una ubicación comercial: configurá el punto del local en Ajustes. Al sincronizar preferencias, la referencia anterior en la nube se reemplaza por la comercial o se elimina si no configuraste una. Los productos y lotes existentes no se borran ni cambian de área.

En Ajustes, la medición local del alta muestra intentos, tiempo medio de los completados, errores de escaneo, búsqueda, guardado y OCR, y la proporción de primeras sugerencias OCR confirmadas sin edición. Este indicador no mide la precisión: hay que contrastar con etiquetas reales. La duración incluye pausas y se mide desde la apertura del alta; los errores solo se cuentan en intentos finalizados. Los intentos sin cierre registrado se muestran como incompletos, no como abandonos confirmados. La exportación específica de métricas contiene identificadores aleatorios, momentos, etapas y resultados, sin códigos, fechas ni texto OCR; no se sincroniza y se borra al cerrar sesión. La exportación general de datos incluye además los eventos anteriores, que pueden contener códigos y texto OCR.

Para habilitar la eliminación de cuentas en Vercel, configurar `SUPABASE_SERVICE_ROLE_KEY` como variable de entorno del servidor. No usar el prefijo `VITE_` ni exponer esta clave al cliente: el endpoint de eliminación valida la sesión del usuario antes de borrar su cuenta y los datos relacionados.

Para instalaciones existentes, aplicar en Supabase > SQL Editor las migraciones `migration_v*.sql` pendientes en orden **antes de desplegar** esta versión. `migration_v6.sql` agrega los datos de apertura por lote; `migration_v7.sql` asegura el borrado en cascada de datos de usuario al eliminar la cuenta; `migration_v8.sql` establece los valores comerciales para nuevas preferencias sin modificar las existentes. Para instalaciones nuevas, ejecutar `schema.sql` y después todas las migraciones en orden; `schema.sql` no las sustituye. Los productos anteriores no tienen costo asignado y no se incluirán en los importes hasta que se complete ese dato.


## Resultado final

Lector Vencimientos es una herramienta móvil de inventario comercial, con foco en la lectura de fechas, la usabilidad en Android y las alertas para reducir pérdidas.
