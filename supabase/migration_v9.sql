-- Migracion v9: habilita la categoria de producto usada por el catalogo.
-- Ejecutar en Supabase > SQL Editor despues de las migraciones anteriores.

alter table public.products
  add column if not exists category text default '';
