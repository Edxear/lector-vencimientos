# Estudio comparativo de Lector Vencimientos

**Fecha de consulta:** 11 de noviembre de 2026  
**Objetivo:** evaluar las ventajas y desventajas de Lector Vencimientos frente a alternativas y recomendar una dirección de producto.

## Decisión ejecutiva

**Recomendación: avanzar, pero enfocar la siguiente etapa en el control confiable de vencimientos para hogares hispanohablantes y pequeños comercios; no intentar competir ahora como una app integral de cocina ni como una plataforma completa para cadenas de retail.**

La app tiene una combinación atractiva: lectura OCR de la fecha impresa, funcionamiento local-first con sincronización, alertas, importación de compras y seguimiento de desperdicio. Las alternativas revisadas suelen resolver solo una parte de ese problema: algunas tienen inventario, recetas y colaboración; otra ofrece OCR pero guarda los datos solo en el dispositivo; y las herramientas B2B se enfocan en operación de tiendas.

La diferenciación es una **hipótesis prometedora, no una ventaja competitiva ya demostrada**. Antes de invertir en expansión de funcionalidades hay que medir si las personas pueden registrar productos y fechas con rapidez y confianza, y resolver la compatibilidad del escaneo en dispositivos sin `BarcodeDetector`.

## Alcance y método

Este estudio combina:

1. **Revisión del producto y el código**, realizada por el agente mobile-analyst: capacidades, limitaciones y oportunidades con evidencia en el repositorio.
2. **Comparación de mercado**, realizada por el agente research: revisión de fuentes públicas oficiales de seis alternativas.
3. **Síntesis de producto**, centrada en ventajas, desventajas y una decisión priorizada.

La comparación de mercado es cualitativa. No se hicieron pruebas de uso lado a lado, mediciones independientes de precisión OCR, entrevistas con clientes ni verificación de precios en tiendas para todos los competidores. Los precios y funcionalidades pueden cambiar; se indica expresamente cuando un dato no se pudo confirmar con una fuente primaria.

## Qué ofrece actualmente Lector Vencimientos

La revisión del repositorio encontró estas capacidades implementadas:

- **Registro y captura:** escaneo de código de barras, búsqueda de producto y alta manual.
- **Lectura de fechas:** captura y recorte de la zona de vencimiento, OCR local con varias transformaciones de imagen y análisis de formatos de fecha ambiguos.
- **Inventario:** áreas para hogar y comercio, cantidad, precio/costo, notas y lotes abiertos con recálculo de vencimiento.
- **Continuidad:** base local con Dexie y cola de sincronización a Supabase; RLS por usuario.
- **Avisos:** notificaciones locales y push, vencimientos configurables y exportación de eventos a calendario.
- **Flujos de compra:** importación de tickets/texto con reglas heurísticas.
- **Prevención y análisis:** registro de desperdicio y analítica de pérdidas/ahorro.
- **Privacidad y cuenta:** bloqueo por inactividad, cambio y eliminación de cuenta.
- **Calidad técnica:** existen pruebas unitarias para lógica de fechas, sincronización, compras, desperdicio y otras funciones.

**Referencias del repositorio:** [README.md](./README.md), [src/lib/ocr.js](./src/lib/ocr.js), [src/lib/dates.js](./src/lib/dates.js), [src/lib/db.js](./src/lib/db.js), [src/lib/notifications.js](./src/lib/notifications.js), [src/lib/purchases.js](./src/lib/purchases.js), [src/lib/waste.js](./src/lib/waste.js), [src/views/ScannerView.jsx](./src/views/ScannerView.jsx).

## Comparación de alternativas

| Alternativa | Enfoque y fortalezas observadas | Límites frente a este producto | Tipo |
|---|---|---|---|
| [NoWaste](https://nowasteapp.com/home/) | Inventario doméstico, ubicaciones, listas, recetas, recordatorios, sincronización familiar y versión web. Publica plan gratuito y opciones Pro (US$44,99 pago único o US$9,99/año, según el sitio consultado). | No se encontró una función explícita de OCR de fechas impresas. La versión gratuita limita ubicaciones/listas y el acceso a funciones avanzadas. La disponibilidad de español no quedó confirmada. | Competidor directo |
| [Pantry Check](https://pantrycheck.com/) | Inventario de despensa, códigos de barras, fechas, notificaciones, listas de compra y catálogo colaborativo. Su sitio indica uso en iOS y Android. | El OCR de fecha no aparece explícitamente en la información consultada. El precio y los límites exactos de los planes pagos no quedaron confirmados. | Competidor directo |
| [KitchenPal](https://kitchenpalapp.com/en/compare.html) | Solución amplia: inventario, escaneo, recetas, planificación de comidas y filtros dietéticos. | Mayor amplitud puede significar más complejidad que un flujo centrado en registrar vencimientos. El precio mencionado en fuentes secundarias no se pudo confirmar en una página oficial de precios. Las comparaciones del propio proveedor son material comercial. | Competidor directo / sustituto |
| [Expiry Tracker](https://play.google.com/store/apps/details?id=com.expiry.expiry_tracker&hl=es) | Control multi-categoría, OCR de fecha, alertas y almacenamiento local; interfaz disponible en español según la ficha consultada. | Sin sincronización en nube ni inventario compartido, según la ficha. El modelo de precios no estaba claramente especificado. | Competidor directo |
| [USDA FoodKeeper](https://catalog.data.gov/dataset/foodkeeper) | Referencia gratuita de conservación de más de 650 alimentos; puede orientar sobre almacenamiento y vida útil. | No administra el inventario personal ni la fecha impresa del producto, por lo que sustituye solo la consulta de recomendaciones, no el control de vencimientos. | Sustituto / fuente de datos |
| [BEEP](https://beepscan.com/es) | Herramienta en español para comercios: escaneo, fechas, avisos y trabajo en equipo; enfocada en tiendas, supermercados y farmacias. | Está orientada a operación comercial. No se encontró evidencia explícita de OCR de fecha impresa ni se pudo confirmar el precio. | Sustituto B2B |

### Lectura de la comparación

- **OCR de la fecha impresa** puede diferenciar a Lector Vencimientos frente a apps de despensa donde el escaneo se centra en el código de barras. Expiry Tracker también anuncia OCR, pero no ofrece la misma sincronización según la información consultada.
- **Offline-first y sincronización** pueden combinar lo mejor de una app local con continuidad entre dispositivos. No obstante, la colaboración de Lector Vencimientos está limitada hoy por el modelo de datos por usuario: sincronizar una cuenta no equivale a compartir un inventario con familia o empleados.
- **En hogar**, NoWaste, Pantry Check y KitchenPal parecen más maduros en listas, recetas, ubicaciones o colaboración. Lector Vencimientos no debería competir en amplitud de funciones antes de demostrar un flujo de registro y alertas mejor.
- **En comercio pequeño**, BEEP señala demanda por trabajo en equipo, verificación y reducción de mermas. Lector Vencimientos contempla áreas comerciales y analítica, pero aún no tiene roles ni inventario compartido; no está listo para venderse como solución de equipo.
- **La propuesta en español** es relevante, pero no se debe asumir que los competidores carecen de español: en esta revisión no se confirmó el soporte lingüístico de todas las apps.

## Ventajas de Lector Vencimientos

1. **Se ocupa de la fecha real del envase**, no solo de identificar el producto por código de barras.
2. **Resiliencia sin conexión:** el almacenamiento local y la cola de sincronización corresponden a una decisión arquitectónica concreta, útil en móviles y conexiones inestables.
3. **Flujo de captura especializado:** recorte de la etiqueta, varias pasadas OCR y parsing de formatos variados se alinean directamente con el problema principal.
4. **Cubre el ciclo de desperdicio:** no solo alerta; también registra pérdidas y permite observar su impacto económico.
5. **Sirve para más de un contexto:** el producto ya contempla áreas domésticas y comerciales, con importación de compras y datos de costo.
6. **Base técnica verificable:** hay pruebas para lógica de negocio importante, en lugar de depender únicamente de validación manual.

## Desventajas y riesgos

1. **Escaneo de códigos no universal:** la ruta de cámara depende de `BarcodeDetector`; la falta de soporte puede impedir el escaneo en Safari/iOS y ciertos navegadores. La carga manual puede servir de alternativa parcial, pero no reemplaza la experiencia de escaneo.
2. **Precisión y rapidez del OCR no están demostradas en producción:** varias transformaciones pueden ayudar a leer etiquetas difíciles, pero también aumentar latencia y consumo de batería en teléfonos modestos. No se encontró una métrica de tasa de acierto.
3. **Importación basada en heurísticas:** las reglas de tickets pueden variar entre países, comercios y formatos; una clasificación o vida útil estimada equivocada puede erosionar la confianza.
4. **Colaboración comercial incompleta:** faltan espacios de equipo, roles y control de cambios compartidos. El uso individual y la sincronización de cuenta no bastan para un negocio con varios empleados.
5. **Propuesta demasiado amplia si se intenta vender a todos:** hogar, comercio, farmacia y almacén implican permisos, flujos y necesidades distintas. Atenderlos simultáneamente eleva el costo y dificulta el mensaje.
6. **Dependencia operativa de notificaciones push:** el servidor y sus secretos deben permanecer correctamente configurados; un fallo de entrega puede pasar inadvertido para el usuario si no hay diagnóstico visible.
7. **Competidores con ecosistemas más completos:** NoWaste y KitchenPal ofrecen funciones colaterales (listas, recetas y planificación) que pueden ser más atractivas para usuarios que buscan una app de cocina completa.

## Recomendación de producto

### Posicionamiento recomendado

**“Controlá lo que tenés y cuándo vence: escaneá o fotografiá la fecha, recibí avisos y reducí desperdicio, incluso con conexión inestable.”**

Priorizar hogares y pequeños comercios hispanohablantes como segmentos de validación, pero comenzar con **un solo flujo principal y una sola propuesta comercial**. La app puede conservar el modo hogar/comercio actual; eso no implica que deba prometer gestión colaborativa profesional antes de desarrollar y probar esa capacidad.

### Orden de decisiones

| Prioridad | Decisión | Motivo / criterio para avanzar |
|---|---|---|
| **P0** | Resolver el escaneo en navegadores sin `BarcodeDetector` con una alternativa compatible, o explicar el límite antes de pedir acceso a cámara. | El escaneo es parte central del alta. Probar como mínimo Android/Chrome y Safari/iOS; no dar por resuelto el soporte por tener una vía manual. |
| **P0** | Medir el flujo completo de alta: tiempo de registro, porcentaje de fechas confirmadas sin edición, errores y abandonos. | Diferenciar por OCR solo es defendible si se demuestra que es preciso y más cómodo. Evaluar etiquetas variadas y dispositivos de gama baja antes de optimizar a ciegas. |
| **P1** | Hacer visible la confianza del OCR: mostrar candidatos cuando haya ambigüedad y permitir corrección sencilla antes de guardar. | Reduce el riesgo de alertas falsas y permite saber dónde falla el reconocimiento. |
| **P1** | Mejorar transparencia y recuperación de notificaciones/sincronización: estado de permisos, última sincronización y errores accionables. | Las alertas son parte del valor esencial; los fallos no deben ser silenciosos. |
| **P1** | Validar tickets con muestras de varios países y comercios; permitir revisar las líneas y corregir fácilmente los datos inferidos. | Evita que una función de carga rápida genere errores difíciles de detectar. |
| **P2** | Si hogares muestran retención, explorar compartir inventario familiar. Si pequeños comercios muestran disposición a pagar, probar primero un espacio compartido sencillo con roles. | La colaboración es importante en competidores, pero agrega complejidad de permisos y sincronización. Elegir segmento según evidencia, no por intuición. |
| **P2** | Ampliar tendencias de desperdicio/ahorro con comparaciones simples y exportables. | Aprovecha datos ya existentes y refuerza el beneficio, sin desviar el foco a recetas o planificación de comidas. |

### Qué no priorizar ahora

- Construir un catálogo de recetas o un planificador de comidas para igualar a KitchenPal.
- Prometer gestión de farmacia/retail multiusuario hasta probar permisos, operación de equipo y necesidades regulatorias del segmento.
- Añadir más categorías o automatizaciones sin medir la tasa de error y el valor real del flujo actual.

## Veredicto

Lector Vencimientos tiene **una base funcional sólida y una oportunidad clara de diferenciación** en lectura de fecha impresa, uso offline y prevención de desperdicio. Su mejor decisión no es convertirse en otra app generalista de despensa ni presentarse ya como plataforma de retail: es demostrar primero que **registrar y confiar en las fechas es más fácil**, y que las alertas llegan cuando deben.

**Avanzar con foco y validación.** La prioridad inmediata es compatibilidad del escaneo, calidad medible del OCR y confiabilidad de alertas. La decisión entre crecer hacia familias o pequeños comercios debe depender de pruebas con usuarios y no del número de funciones ya implementadas.

## Fuentes de mercado

- NoWaste: [sitio oficial](https://nowasteapp.com/home/).
- Pantry Check: [sitio oficial](https://pantrycheck.com/).
- KitchenPal: [comparación oficial del proveedor](https://kitchenpalapp.com/en/compare.html); las afirmaciones comparativas son del propio competidor.
- Expiry Tracker: [ficha de Google Play en español](https://play.google.com/store/apps/details?id=com.expiry.expiry_tracker&hl=es).
- USDA FoodKeeper: [catálogo de datos del USDA](https://catalog.data.gov/dataset/foodkeeper). La página de FSIS sobre fechas de alimentos no pudo verificarse durante la consulta; se usaron recursos oficiales alternativos.
- BEEP: [sitio oficial en español](https://beepscan.com/es).

**Limitaciones de las fuentes:** precios y límites de Pantry Check, KitchenPal y BEEP no pudieron confirmarse con una página oficial de precios. Tampoco se verificó de forma concluyente la disponibilidad en español de NoWaste, Pantry Check o KitchenPal. Esta comparación describe información pública consultada el 11 de noviembre de 2026 y no constituye una prueba práctica independiente.
