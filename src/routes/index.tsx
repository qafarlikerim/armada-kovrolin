import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { listProducts } from "@/lib/catalog.functions";
import { formatStock, matchesQuery, type CatalogProduct } from "@/lib/product-mapping";

const productsQueryOptions = queryOptions({
  queryKey: ["products"],
  queryFn: () => listProducts(),
  staleTime: 60_000,
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "АРМАДА — каталог ковролина и ковров" },
      {
        name: "description",
        content:
          "Каталог ковролина и ковров компании «Армада» с актуальными остатками на складе и быстрым поиском по коду, артикулу и виду номенклатуры.",
      },
      { property: "og:title", content: "АРМАДА — каталог ковролина и ковров" },
      {
        property: "og:description",
        content: "Актуальные остатки склада и быстрый поиск по каталогу компании «Армада».",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQueryOptions),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl p-10 text-center" role="alert">
      <h1 className="text-lg font-semibold">Каталог временно недоступен</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => <div className="p-10 text-center">Каталог пуст.</div>,
  component: CatalogPage,
});

function CatalogPage() {
  const { data } = useSuspenseQuery(productsQueryOptions);
  const [query, setQuery] = useState("");

  const results = useMemo(
    () => data.products.filter((product) => matchesQuery(product, query)),
    [data.products, query],
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-baseline gap-2">
            <span className="text-xl font-semibold tracking-[0.35em] text-foreground sm:text-2xl">
              АРМАДА
            </span>
            <span className="hidden text-xs uppercase tracking-widest text-muted-foreground sm:inline">
              ковролин и ковры
            </span>
          </Link>
          <Link
            to="/import"
            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            Импорт из 1С
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <section className="py-8 sm:py-12">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Каталог товаров
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Поиск по названию/коду, артикулу и виду номенклатуры. Остатки — по данным
            последней выгрузки из 1С.
          </p>

          <div className="relative mt-6">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Например: Hammer, 110, 123 Daliot"
              aria-label="Поиск по каталогу"
              className="h-14 w-full rounded-2xl border border-border bg-card pl-12 pr-4 text-base text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-ring/20 sm:h-16 sm:text-lg"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>Найдено: {results.length}</span>
            <span>Всего позиций: {data.products.length}</span>
            {data.syncedAt ? (
              <span>Обновлено: {new Date(data.syncedAt).toLocaleString("ru-RU")}</span>
            ) : null}
          </div>
        </section>

        {data.products.length === 0 ? (
          <EmptyState
            title="Каталог пока пуст"
            text="Загрузите JSON-выгрузку из 1С на странице импорта — товары появятся здесь автоматически."
          />
        ) : results.length === 0 ? (
          <EmptyState title="Ничего не найдено" text="Попробуйте изменить запрос." />
        ) : (
          <>
            <ul className="grid gap-3 sm:hidden">
              {results.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </ul>
            <div className="hidden overflow-hidden rounded-2xl border border-border bg-card sm:block">
              <table className="w-full text-sm">
                <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Вид номенклатуры</th>
                    <th className="px-5 py-3 font-medium">Название / код</th>
                    <th className="px-5 py-3 font-medium">Артикул</th>
                    <th className="px-5 py-3 font-medium">Длина</th>
                    <th className="px-5 py-3 text-right font-medium">Наличие</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((product) => (
                    <tr
                      key={product.id}
                      className="border-t border-border/70 transition-colors hover:bg-secondary/60"
                    >
                      <td className="px-5 py-3 text-muted-foreground">
                        {product.nomenclature_type || "—"}
                      </td>
                      <td className="px-5 py-3 font-medium text-foreground">
                        {product.code || "—"}
                      </td>
                      <td className="px-5 py-3 text-foreground">{product.article || "—"}</td>
                      <td className="px-5 py-3 tabular-nums text-foreground">
                        {product.length || "—"}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <StockBadge product={product} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function ProductCard({ product }: { product: CatalogProduct }) {
  return (
    <li className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {product.nomenclature_type || "—"}
          </p>
          <p className="mt-1 text-lg font-semibold text-foreground">{product.code || "—"}</p>
        </div>
        <StockBadge product={product} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Артикул</dt>
          <dd className="text-foreground">{product.article || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Длина</dt>
          <dd className="tabular-nums text-foreground">{product.length || "—"}</dd>
        </div>
      </dl>
    </li>
  );
}

function StockBadge({ product }: { product: CatalogProduct }) {
  const inStock = product.quantity > 0;
  return (
    <span
      className={
        inStock
          ? "inline-flex whitespace-nowrap rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground"
          : "inline-flex whitespace-nowrap rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
      }
    >
      {formatStock(product)}
    </span>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <p className="text-base font-medium text-foreground">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
