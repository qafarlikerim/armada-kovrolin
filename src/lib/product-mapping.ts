/**
 * Нормализация данных из выгрузки 1С.
 *
 * Здесь описан единственный слой сопоставления полей JSON-файла 1С и полей
 * каталога. Когда появится автоматическая синхронизация с 1С, достаточно
 * будет переиспользовать эту функцию — остальная часть приложения не меняется.
 */

export type CatalogProduct = {
  id: string;
  external_id: string;
  nomenclature_type: string;
  code: string;
  article: string;
  quantity: number;
  /** Длина отображается ровно так, как пришла из 1С — без пересчёта. */
  length: string;
  unit: string;
  image_url: string | null;
  category: string | null;
  synced_at: string;
};

export type NormalizedProduct = Omit<CatalogProduct, "id" | "synced_at"> & {
  raw: Record<string, unknown>;
};

type AnyRecord = Record<string, unknown>;

const FIELD_ALIASES = {
  nomenclature_type: [
    "вид номенклатуры",
    "видноменклатуры",
    "вид",
    "nomenclature_type",
    "nomenclaturetype",
    "type",
    "kind",
    "группа",
  ],
  code: [
    "название/код",
    "названиекод",
    "название",
    "наименование",
    "код",
    "name",
    "code",
    "title",
  ],
  article: ["артикул", "article", "sku", "art"],
  quantity: [
    "количество",
    "остаток",
    "колво",
    "кол-во",
    "quantity",
    "qty",
    "stock",
    "amount",
    "balance",
  ],
  length: ["длина", "length", "len", "метраж", "area", "площадь"],
  unit: ["единица", "единицаизмерения", "unit", "uom"],
  external_id: ["id", "guid", "ref", "ссылка", "уникальныйидентификатор", "external_id"],
  image_url: ["image", "image_url", "фото", "картинка"],
  category: ["категория", "category", "раздел"],
} as const;

function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[\s_\-.]/g, "");
}

function pick(row: AnyRecord, aliases: readonly string[]): unknown {
  const map = new Map<string, unknown>();
  for (const [key, value] of Object.entries(row)) {
    map.set(normalizeKey(key), value);
  }
  for (const alias of aliases) {
    const value = map.get(normalizeKey(alias));
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return undefined;
}

function asText(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = asText(value).replace(/\s/g, "").replace(",", ".");
  const parsed = Number.parseFloat(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Достаёт массив строк товаров из произвольной структуры JSON-файла 1С. */
export function extractRows(payload: unknown): AnyRecord[] {
  if (Array.isArray(payload)) return payload.filter(isRecord);
  if (isRecord(payload)) {
    for (const key of ["items", "data", "products", "rows", "Товары", "Номенклатура"]) {
      const value = payload[key];
      if (Array.isArray(value)) return value.filter(isRecord);
    }
    const firstArray = Object.values(payload).find(Array.isArray);
    if (firstArray) return (firstArray as unknown[]).filter(isRecord);
  }
  return [];
}

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeRow(row: AnyRecord): NormalizedProduct | null {
  const code = asText(pick(row, FIELD_ALIASES.code));
  const article = asText(pick(row, FIELD_ALIASES.article));
  const nomenclatureType = asText(pick(row, FIELD_ALIASES.nomenclature_type));

  if (!code && !article) return null;

  // Длина входит в ключ: в выгрузке 1С один и тот же артикул встречается
  // несколькими строками с разной длиной — они не должны склеиваться.
  const length = asText(pick(row, FIELD_ALIASES.length));

  const externalId =
    asText(pick(row, FIELD_ALIASES.external_id)) ||
    `${nomenclatureType}|${code}|${article}|${length}`.toLowerCase();

  return {
    external_id: externalId,
    nomenclature_type: nomenclatureType,
    code,
    article,
    quantity: asNumber(pick(row, FIELD_ALIASES.quantity)),
    // Длина сохраняется как строка — ровно в том виде, как в файле 1С.
    length,
    unit: unitFor(code),
    image_url: asText(pick(row, FIELD_ALIASES.image_url)) || null,
    category: asText(pick(row, FIELD_ALIASES.category)) || null,
    raw: row,
  };
}

export function normalizePayload(payload: unknown): NormalizedProduct[] {
  const seen = new Set<string>();
  const result: NormalizedProduct[] = [];
  for (const row of extractRows(payload)) {
    const normalized = normalizeRow(row);
    if (!normalized) continue;
    if (seen.has(normalized.external_id)) continue;
    seen.add(normalized.external_id);
    result.push(normalized);
  }
  return result;
}

/** «Keçə» учитывается в метрах, все остальные позиции — в штуках. */
export function unitFor(code: string): string {
  return normalizeKey(code) === normalizeKey("Keçə") ? "metr" : "ədəd";
}

export function matchesQuery(product: CatalogProduct, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const terms = q.split(/\s+/);
  const haystack = [product.nomenclature_type, product.code, product.article]
    .join(" ")
    .toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

export function formatStock(product: CatalogProduct): string {
  if (product.quantity > 0) {
    const value = Number.isInteger(product.quantity)
      ? String(product.quantity)
      : String(product.quantity).replace(".", ",");
    return `${value} ${unitFor(product.code)}`;
  }
  return "Stokda yoxdur";
}
