import { createServerFn } from "@tanstack/react-start";

import type { CatalogProduct } from "./product-mapping";

/** Публичный список каталога (только чтение, ключ anon + RLS). */
export const listProducts = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ products: CatalogProduct[]; syncedAt: string | null }> => {
    const { createPublicSupabaseClient } = await import("./catalog.server");
    const supabase = createPublicSupabaseClient();

    const { data, error } = await supabase
      .from("products")
      .select(
        "id, external_id, nomenclature_type, code, article, quantity, length, unit, image_url, category, synced_at",
      )
      .order("nomenclature_type", { ascending: true })
      .order("code", { ascending: true })
      .limit(5000);

    if (error) throw new Error(error.message);

    const products = (data ?? []).map((row) => ({
      ...row,
      quantity: Number(row.quantity),
    })) as CatalogProduct[];

    const syncedAt = products.reduce<string | null>(
      (latest, p) => (!latest || p.synced_at > latest ? p.synced_at : latest),
      null,
    );

    return { products, syncedAt };
  },
);

/** Импорт выгрузки 1С. Доступен только с токеном импорта. */
export const importProducts = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; payload: unknown; replaceMissing?: boolean }) => {
    if (!input || typeof input.token !== "string") throw new Error("Некорректный запрос");
    return input;
  })
  .handler(async ({ data }) => {
    const expected = process.env["ARMADA_IMPORT_TOKEN"];
    if (!expected || data.token !== expected) {
      throw new Error("Неверный код доступа к импорту");
    }

    const { normalizePayload } = await import("./product-mapping");
    const rows = normalizePayload(data.payload);
    if (rows.length === 0) {
      throw new Error("В файле не найдено ни одной корректной строки товара");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const syncedAt = new Date().toISOString();

    let upserted = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500).map((row) => ({
        ...row,
        raw: row.raw as never,
        source: "1c-json",
        synced_at: syncedAt,
      }));
      const { error } = await supabaseAdmin
        .from("products")
        .upsert(chunk, { onConflict: "external_id" });
      if (error) throw new Error(error.message);
      upserted += chunk.length;
    }

    let removed = 0;
    if (data.replaceMissing !== false) {
      const { data: deleted, error } = await supabaseAdmin
        .from("products")
        .delete()
        .lt("synced_at", syncedAt)
        .select("id");
      if (error) throw new Error(error.message);
      removed = deleted?.length ?? 0;
    }

    await supabaseAdmin.from("import_runs").insert({
      source: "manual-json",
      total_rows: rows.length,
      upserted_rows: upserted,
      removed_rows: removed,
      status: "success",
    });

    return { total: rows.length, upserted, removed, syncedAt };
  });
