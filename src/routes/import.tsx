import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { importProducts } from "@/lib/catalog.functions";

export const Route = createFileRoute("/import")({
  head: () => ({
    meta: [
      { title: "Импорт выгрузки 1С — АРМАДА" },
      {
        name: "description",
        content:
          "Загрузка JSON-выгрузки из 1С для обновления каталога и складских остатков компании «Армада».",
      },
      { property: "og:title", content: "Импорт выгрузки 1С — АРМАДА" },
      {
        property: "og:description",
        content: "Обновление каталога «Армада» из JSON-файла 1С.",
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
      setError("Выберите JSON-файл выгрузки из 1С");
      return;
    }
    setStatus("loading");
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const response = await runImport({ data: { token, payload, replaceMissing } });
      setResult(response);
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await router.invalidate();
    } catch (caught) {
      setError(
        caught instanceof SyntaxError
          ? "Файл не является корректным JSON"
          : caught instanceof Error
            ? caught.message
            : "Не удалось выполнить импорт",
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
            АРМАДА
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary">
            ← В каталог
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Импорт выгрузки из 1С
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Данные каталога обновляются только этим импортом и не редактируются вручную.
          Позже загрузку файла можно заменить автоматической синхронизацией с 1С.
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <div>
            <label htmlFor="token" className="text-sm font-medium text-foreground">
              Код доступа
            </label>
            <input
              id="token"
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-ring/20"
              placeholder="Код импорта"
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="file" className="text-sm font-medium text-foreground">
              JSON-файл из 1С
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
            Удалять позиции, отсутствующие в новом файле (полная замена каталога)
          </label>

          <button
            type="submit"
            disabled={status === "loading"}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {status === "loading" ? "Импортируем…" : "Загрузить и обновить каталог"}
          </button>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {result ? (
            <div className="rounded-xl bg-secondary p-4 text-sm text-secondary-foreground">
              Импорт завершён: строк в файле — {result.total}, обновлено — {result.upserted},
              удалено — {result.removed}.{" "}
              <Link to="/" className="underline">
                Открыть каталог
              </Link>
            </div>
          ) : null}
        </form>

        <section className="mt-8 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          <h2 className="text-sm font-semibold text-foreground">Формат файла</h2>
          <p className="mt-2">
            Поддерживается массив объектов или объект с массивом в поле{" "}
            <code>items</code>/<code>data</code>/<code>Товары</code>. Распознаются поля:
            вид номенклатуры, название/код, артикул, количество, длина. Длина сохраняется
            ровно в том виде, в котором она пришла из 1С.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-secondary p-4 text-xs text-secondary-foreground">
            {`[
  {
    "Вид номенклатуры": "Hammer",
    "Название/код": "110",
    "Артикул": "123 Daliot",
    "Количество": 15,
    "Длина": "35"
  }
]`}
          </pre>
        </section>
      </main>
    </div>
  );
}
