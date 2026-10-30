import { normalizePayload, type CatalogProduct } from "./product-mapping";

export async function listProducts(): Promise<{
  products: CatalogProduct[];
  syncedAt: null;
}> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/stock.json`);
  if (!response.ok) {
    throw new Error(`1C kataloqu yüklənmədi (HTTP ${response.status})`);
  }

  const text = await response.text();
  const sanitized = text
    .replace(/^\uFEFF/, "")
    .replace(
      /(:\s*)(-?\d+(?:[\s\u00a0\u202f]+\d+)+)(?=\s*[,}])/g,
      (_match, prefix: string, value: string) => prefix + value.replace(/[\s\u00a0\u202f]/g, ""),
    );
  let payload: unknown;
  try {
    payload = JSON.parse(sanitized);
  } catch (error) {
    throw new Error(
      `public/data/stock.json düzgün JSON deyil: ${
        error instanceof Error ? error.message : "naməlum format xətası"
      }`,
    );
  }

  const products = normalizePayload(payload).map((product) => ({
    ...product,
    id: product.external_id,
    synced_at: "",
  }));

  return { products, syncedAt: null };
}
