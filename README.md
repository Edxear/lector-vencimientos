# Lector Vencimientos

PWA (Android primero) para controlar los vencimientos de productos: escanea el código de barras, lee la fecha con OCR recortando la zona con la cámara, guarda todo en la nube por usuario y avisa antes de que venza.

## Stack

- React + Vite (JavaScript) y `vite-plugin-pwa` (service worker propio)
- Dexie (caché local y cola de sincronización offline)
- Supabase (Postgres, Auth, RLS)
- Tesseract.js (OCR) y chrono-node (fechas)
- Open Food Facts (datos del producto por EAN)
- Vercel (hosting y cron diario que envía Web Push)

## Funciones

- Escaneo de códigos de barras con `BarcodeDetector`.
- Captura de fecha estilo Lens: cámara en vivo, recuadro ajustable y OCR solo de la zona elegida.
- Áreas: Almacén, Frío, Congelados, Bazar, Verdulería, Carnicería, Devolución Proveedor, con filtro en el inventario.
- Cantidad, notas, días de aviso por producto, fotos con tamaño y calidad ajustables.
- Avisos push desde el servidor (cron diario) y verificación local al abrir la app.

## Puesta en marcha

```bash
npm install
cp .env.example .env   # completar con tus claves
npm run dev
```

Variables (`.env` y Vercel):

| Variable | Uso |
| --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Cliente Supabase (clave pública) |
| `VITE_VAPID_PUBLIC_KEY` | Clave pública Web Push |
| `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Solo servidor (`api/cron.js`) |
| `CRON_SECRET` | Autoriza el cron y las funciones RPC |

## Base de datos

1. En Supabase > SQL Editor ejecutar `supabase/schema.sql` (solo una vez).
2. Ejecutar `supabase/migration_v2.sql` (idempotente).
3. Guardar el secreto del cron: `insert into public.private_config (key, value) values ('cron_secret', '<CRON_SECRET>') on conflict (key) do update set value = excluded.value;`

## Despliegue

```bash
npm run build
vercel deploy --prod
```

`vercel.json` programa `/api/cron` una vez al día (11:00 UTC).

Nunca subas `.env`, claves privadas ni `supabase/*.local.sql`.
