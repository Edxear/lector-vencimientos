# Recepción y archivo de productos

Ejecutá `schema.sql` y luego las migraciones v2, v3, v4 y v5 en orden para una instalación nueva; en instalaciones existentes aplicá las pendientes en ese orden. Aplicá v5 antes de actualizar la app: si falta, la sincronización muestra un error y conserva la cola local. `schema.sql` no sustituye las migraciones anteriores.
Si ya aplicaste una versión anterior de v5, volvé a ejecutar v5 para actualizar los avisos push; la migración es idempotente.

La fecha de recepción es opcional, por lote y sin valor predeterminado; se puede editar o borrar. En compras se ingresa explícitamente, no se deduce de la fecha del ticket.

El inventario muestra los productos sin stock, incluidos los archivados. Un lote sin destino con cantidad cero no cuenta como stock, no genera una pérdida automática ni avisos y se conserva en «Lotes con cantidad cero», donde puede corregirse. Archivar no borra el producto ni sus lotes; solo se permite cuando no hay lotes sin destino con stock en el dispositivo. La cantidad desconocida no se considera cero. Se puede desarchivar o agregar un lote desde esa lista, o escanear el código existente. Guardar un lote con stock o restaurar uno cerrado con stock reactiva el producto y mantiene su código, foto, categoría e historial. El botón «Eliminar lote» sigue siendo una eliminación permanente, distinta del archivo.

Las operaciones y su cola se guardan en IndexedDB, también sin conexión. Como la comprobación de stock es local, dos dispositivos desconectados pueden archivar y agregar stock simultáneamente; no hay bloqueo distribuido ni resolución de conflictos. Un lote activo siempre se muestra aunque su producto figure archivado; revisá y desarchivá ante ese aviso. La sincronización existente usa la última escritura y no fusiona ediciones concurrentes. Esperá a sincronizar antes de trabajar en otro dispositivo.
