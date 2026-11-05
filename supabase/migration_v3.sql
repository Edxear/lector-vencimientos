-- Analítica de desperdicios: costo por unidad y fecha de registro del descarte.
-- Ejecutar en Supabase > SQL Editor para actualizar instalaciones existentes.

alter table public.items add column if not exists unit_cost numeric(12,2);
alter table public.items add column if not exists wasted_at timestamptz;
