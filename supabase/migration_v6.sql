-- Conserva el vencimiento original y los datos de apertura por lote.
-- expiry_date mantiene la fecha efectiva más temprana para avisos y cron.
alter table public.items add column if not exists sealed_expiry_date date;
alter table public.items add column if not exists opened_date date;
alter table public.items add column if not exists opened_days integer;
