import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { importProducts } from "@/lib/catalog.functions";

export const Route = createFileRoute("/import")({
  head: () => ({
    meta: [
      { title: "1C importu — Armada" },
      {
        name: "description",
        content:
          "Armada kataloqunu və anbar qalıqlarını yeniləmək üçün 1C JSON faylının yüklənməsi.",
      },
      { property: "og:title", content: "1C importu — Armada" },
      {
        property: "og:description",
        content: "Armada kataloqunun 1C JSON faylından yenilənməsi.",
      },
    ],
  }),
  component: ImportPage,
});

type Result = { total: number; upserted: number; removed: number };

function ImportPage() {
  const runImport = useServerFn(importProducts);
  const queryClient = useQueryClient();
  const router = useRouter();

  const [token, setToken] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [replaceMissing, setReplaceMissing] = useState(true);
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setResult(null);
    if (!file) {
      setError("1C-dən JSON faylını seçin");
      return;
    }
    setStatus("loading");
    try {
      const text = await file.text();
      // 1С иногда выгружает числа с разделителем разрядов («3 000»),
      // из-за чего JSON становится невалидным — убираем пробел внутри чисел.
      const sanitized = text
        .replace(/^\uFEFF/, "")
        .replace(/(\d)[\s\u00a0](?=\d)/g, "$1");
      const payload = JSON.parse(sanitized);
      const response = await runImport({ data: { token, payload, replaceMissing } });
      setResult(response);
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await router.invalidate();
    } catch (caught) {
      setError(
        caught instanceof SyntaxError
          ? "Fayl düzgün JSON deyil"
          : caught instanceof Error
            ? caught.message
            : "Import yerinə yetirilmədi",
      );
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="text-xl font-semibold tracking-[0.35em] text-foreground">
            Armada
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary">
            ← Kataloqa
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          1C-dən import
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Kataloq məlumatları yalnız bu import vasitəsilə yenilənir və əl ilə redaktə
          edilmir. Sonradan fayl yükləməsi 1C ilə avtomatik sinxronizasiya ilə əvəz oluna
          bilər.
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <div>
            <label htmlFor="token" className="text-sm font-medium text-foreground">
              Giriş kodu
            </label>
            <input
              id="token"
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-ring/20"
              placeholder="Import kodu"
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="file" className="text-sm font-medium text-foreground">
              1C-dən JSON faylı
            </label>
            <input
              id="file"
              type="file"
              accept="application/json,.json"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="mt-2 w-full rounded-xl border border-dashed border-border bg-background p-3 text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:text-secondary-foreground"
            />
          </div>

          <label className="flex items-start gap-3 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={replaceMissing}
              onChange={(event) => setReplaceMissing(event.target.checked)}
              className="mt-0.5 size-4 accent-[var(--primary)]"
            />
            Yeni faylda olmayan mövqeləri sil (kataloqun tam əvəzlənməsi)
          </label>

          <button
            type="submit"
            disabled={status === "loading"}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {status === "loading" ? "Yüklənir…" : "JSON yüklə və kataloqu yenilə"}
          </button>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {result ? (
            <div className="rounded-xl bg-secondary p-4 text-sm text-secondary-foreground">
              Import tamamlandı: fayldakı sətir — {result.total}, yeniləndi —{" "}
              {result.upserted}, silindi — {result.removed}.{" "}
              <Link to="/" className="underline">
                Kataloqu aç
              </Link>
            </div>
          ) : null}
        </form>

        <section className="mt-8 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          <h2 className="text-sm font-semibold text-foreground">Fayl formatı</h2>
          <p className="mt-2">
            Obyektlər massivi və ya <code>items</code>/<code>data</code> sahəsində massiv
            olan obyekt dəstəklənir. Tanınan sahələr: <code>type</code>, <code>name</code>,{" "}
            <code>article</code>, <code>quantity</code>, <code>area</code>. Artikül mətn kimi
            saxlanılır (öndəki sıfırlar itmir), <code>area</code> dəyəri isə 1C-dən gəldiyi
            kimi göstərilir.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-secondary p-4 text-xs text-secondary-foreground">
            {`[
  {
    "type": "Quality Hummer(Platinum)",
    "name": "70-1",
    "article": "0637",
    "quantity": 15,
    "area": "35"
  }
]`}
          </pre>
        </section>
      </main>
    </div>
  );
}
