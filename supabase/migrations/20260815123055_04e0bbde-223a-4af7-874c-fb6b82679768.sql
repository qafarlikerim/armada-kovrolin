CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text NOT NULL UNIQUE,
  nomenclature_type text NOT NULL DEFAULT '',
  code text NOT NULL DEFAULT '',
  article text NOT NULL DEFAULT '',
  quantity numeric NOT NULL DEFAULT 0,
  length text NOT NULL DEFAULT '',
  unit text NOT NULL DEFAULT 'шт.',
  image_url text,
  description text,
  category text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT '1c-json',
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX products_search_idx ON public.products USING gin (
  to_tsvector('simple', coalesce(code,'') || ' ' || coalesce(article,'') || ' ' || coalesce(nomenclature_type,''))
);
CREATE INDEX products_code_idx ON public.products (code);
CREATE INDEX products_article_idx ON public.products (article);

GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Catalog is publicly readable" ON public.products FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'manual-json',
  total_rows integer NOT NULL DEFAULT 0,
  upserted_rows integer NOT NULL DEFAULT 0,
  removed_rows integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'success',
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.import_runs TO anon;
GRANT SELECT ON public.import_runs TO authenticated;
GRANT ALL ON public.import_runs TO service_role;

ALTER TABLE public.import_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Import history is publicly readable" ON public.import_runs FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER products_set_updated_at BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();