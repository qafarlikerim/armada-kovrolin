import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { listProducts } from "@/lib/catalog.functions";
import { formatStock, matchesQuery, type CatalogProduct } from "@/lib/product-mapping";

export const productsQueryOptions = queryOptions({
  queryKey: ["products"],
  queryFn: () => listProducts(),
  staleTime: 60_000,
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Armada" },
      {
        name: "description",
        content: "Armada şirkətinin məhsul kataloqu: anbar qalıqları və sürətli axtarış.",
      },
      { property: "og:title", content: "Armada" },
      {
        property: "og:description",
        content: "Armada kataloqunda anbar qalıqları və sürətli axtarış.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQueryOptions),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl p-10 text-center" role="alert">
      <h1 className="text-lg font-semibold">Kataloq müvəqqəti əlçatan deyil</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => <div className="p-10 text-center">Kataloq boşdur.</div>,
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
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_oklab,var(--gold)_14%,transparent),transparent_70%)]"
      />

      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 sm:py-5">
          <Link to="/" className="group flex flex-col">
            <span className="font-display text-2xl font-semibold uppercase leading-none tracking-[0.42em] text-gradient-gold sm:text-3xl">
              Armada
            </span>
            <span className="mt-1.5 text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
              Kataloq
            </span>
          </Link>
          <Link
            to="/import"
            className="rounded-full border border-gold/40 bg-card/60 px-4 py-2 text-xs font-medium tracking-wide text-gold transition-all hover:border-gold hover:shadow-[0_0_0_3px_color-mix(in_oklab,var(--gold)_12%,transparent)]"
          >
            1C-dən import
          </Link>
        </div>
        <div className="gold-rule opacity-70" />
      </header>

      <main className="relative mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <section className="py-10 sm:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-5 flex items-center justify-center gap-3">
              <span className="h-px w-10 bg-gold/50 sm:w-16" />
              <span className="text-[10px] uppercase tracking-[0.4em] text-gold/80">
                Armada
              </span>
              <span className="h-px w-10 bg-gold/50 sm:w-16" />
            </div>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
              Məhsul <span className="text-gradient-gold">kataloqu</span>
            </h1>
          </div>

          <div className="relative mx-auto mt-8 max-w-3xl sm:mt-10">
            <div
              aria-hidden
              className="absolute -inset-px rounded-[1.6rem] bg-[linear-gradient(120deg,color-mix(in_oklab,var(--gold)_55%,transparent),transparent_45%,color-mix(in_oklab,var(--gold)_40%,transparent))] opacity-70"
            />
            <div className="relative rounded-[1.55rem] bg-card p-1">
              <Search className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-gold" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Məsələn: Quality Hummer, 70-1, 4718"
                aria-label="Kataloq üzrə axtarış"
                className="h-14 w-full rounded-[1.4rem] bg-transparent pl-13 pr-5 text-base text-foreground outline-none placeholder:text-muted-foreground/70 sm:h-16 sm:text-lg"
              />
            </div>
          </div>

          <div className="mx-auto mt-5 flex max-w-3xl flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border/70 bg-card/50 px-3 py-1">
              Tapıldı: <span className="text-gold">{results.length}</span>
            </span>
            <span className="rounded-full border border-border/70 bg-card/50 px-3 py-1">
              Ümumi mövqe: <span className="text-gold">{data.products.length}</span>
            </span>
          </div>
        </section>

        {data.products.length === 0 ? (
          <EmptyState
            title="Kataloq hələ boşdur"
            text="Import səhifəsində 1C-dən JSON faylını yükləyin — məhsullar avtomatik görünəcək."
          />
        ) : results.length === 0 ? (
          <EmptyState title="Heç nə tapılmadı" text="Sorğunu dəyişməyə cəhd edin." />
        ) : query.trim() ? (
          <ProductList products={results} />
        ) : (
          <GroupedCatalog products={results} />
        )}

      </main>

      <footer className="relative border-t border-border/60 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <span className="font-display text-lg uppercase tracking-[0.42em] text-gradient-gold">
            Armada
          </span>
        </div>
      </footer>
    </div>
  );
}

/** Плоский список позиций — используется при активном поиске. */
function ProductList({ products }: { products: CatalogProduct[] }) {
  return (
    <>
      <ul className="grid gap-3 sm:hidden">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </ul>
      <div className="surface-panel hidden overflow-hidden rounded-3xl border border-gold/25 sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gold/25 bg-[color-mix(in_oklab,var(--gold)_7%,transparent)] text-left">
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
                Növ
              </th>
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
                Kod
              </th>
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
                Dalyot
              </th>
              <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
                Uzunluq
              </th>
              <th className="px-6 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
                Miqdar
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr
                key={product.id}
                className="border-t border-border/40 transition-colors hover:bg-[color-mix(in_oklab,var(--gold)_6%,transparent)]"
              >
                <td className="px-6 py-4 text-muted-foreground">
                  {product.nomenclature_type || "—"}
                </td>
                <td className="px-6 py-4 font-medium text-foreground">{product.code || "—"}</td>
                <td className="px-6 py-4 tabular-nums text-foreground">{product.article || "—"}</td>
                <td className="px-6 py-4 tabular-nums text-foreground">{product.length || "—"}</td>
                <td className="px-6 py-4 text-right">
                  <StockBadge product={product} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function parseLength(value: string): number {
  const parsed = Number.parseFloat(String(value).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value).replace(".", ",");
}

type CodeGroup = { code: string; items: CatalogProduct[]; totalLength: number };
type TypeGroup = { type: string; codes: CodeGroup[]; count: number; totalLength: number };

function isKece(product: CatalogProduct): boolean {
  return product.code.trim().toLowerCase() === "keçə";
}

function buildGroups(products: CatalogProduct[]): {
  groups: TypeGroup[];
  kece: CatalogProduct[];
} {
  const byType = new Map<string, Map<string, CatalogProduct[]>>();
  const kece: CatalogProduct[] = [];
  for (const product of products) {
    // Keçə не входит ни в одну группу — показывается отдельным разделом внизу.
    if (isKece(product)) {
      kece.push(product);
      continue;
    }
    const type = product.nomenclature_type || "—";
    const code = product.code || "—";
    if (!byType.has(type)) byType.set(type, new Map());
    const codes = byType.get(type)!;
    if (!codes.has(code)) codes.set(code, []);
    codes.get(code)!.push(product);
  }
  const groups = [...byType.entries()].map(([type, codes]) => {
    const codeGroups = [...codes.entries()]
      .map(([code, items]) => ({
        code,
        items,
        totalLength: items.reduce((sum, item) => sum + parseLength(item.length), 0),
      }))
      .sort((a, b) => a.code.localeCompare(b.code, "az", { numeric: true }));
    return {
      type,
      count: codeGroups.reduce((sum, g) => sum + g.items.length, 0),
      totalLength: codeGroups.reduce((sum, g) => sum + g.totalLength, 0),
      codes: codeGroups,
    };
  });
  return { groups, kece };
}

/** Свёрнутый каталог: вид номенклатуры → код → отдельные позиции. */
function GroupedCatalog({ products }: { products: CatalogProduct[] }) {
  const { groups, kece } = useMemo(() => buildGroups(products), [products]);
  const [openTypes, setOpenTypes] = useState<Record<string, boolean>>({});
  const [openCodes, setOpenCodes] = useState<Record<string, boolean>>({});

  return (
    <div className="grid gap-4">
      {groups.map((group) => {
        const open = openTypes[group.type] ?? false;
        return (
          <section
            key={group.type}
            className="surface-panel overflow-hidden rounded-3xl border border-gold/25"
          >
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpenTypes((prev) => ({ ...prev, [group.type]: !open }))}
              className="flex w-full items-center justify-between gap-4 bg-[color-mix(in_oklab,var(--gold)_7%,transparent)] px-5 py-4 text-left transition-colors hover:bg-[color-mix(in_oklab,var(--gold)_11%,transparent)] sm:px-6"
            >
              <span className="font-sans text-base font-semibold text-foreground sm:text-lg">
                {group.type}
              </span>
              <span className="flex items-center gap-3">
                <span className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
                  <span className="hidden sm:inline">Ümumi uzunluq: </span>
                  <span className="text-foreground">{formatNumber(group.totalLength)} m</span>
                </span>
                <span className="rounded-full border border-gold/40 px-3 py-1 text-xs text-gold">
                  {group.count}
                </span>
                <ChevronDown
                  className={`size-4 text-gold transition-transform ${open ? "rotate-180" : ""}`}
                />
              </span>
            </button>

            {open && (
              <div className="border-t border-gold/20">
                <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold sm:px-6">
                  <span>Kod</span>
                  <span className="text-right">Məhsul sayı</span>
                  <span className="text-right">Ümumi uzunluq</span>
                </div>
                <ul>
                  {group.codes.map((codeGroup) => {
                    const key = `${group.type}|${codeGroup.code}`;
                    const codeOpen = openCodes[key] ?? false;
                    return (
                      <li key={key} className="border-t border-border/40">
                        <button
                          type="button"
                          aria-expanded={codeOpen}
                          onClick={() =>
                            setOpenCodes((prev) => ({ ...prev, [key]: !codeOpen }))
                          }
                          className="grid w-full grid-cols-[1fr_auto_auto] items-center gap-x-4 px-5 py-3.5 text-left text-sm transition-colors hover:bg-[color-mix(in_oklab,var(--gold)_6%,transparent)] sm:px-6"
                        >
                          <span className="flex items-center gap-2 font-medium text-foreground">
                            <ChevronRight
                              className={`size-3.5 text-gold transition-transform ${codeOpen ? "rotate-90" : ""}`}
                            />
                            {codeGroup.code}
                          </span>
                          <span className="text-right tabular-nums text-muted-foreground">
                            {codeGroup.items.length}
                          </span>
                          <span className="text-right tabular-nums text-foreground">
                            {formatNumber(codeGroup.totalLength)} m
                          </span>
                        </button>

                        {codeOpen && (
                          <ul className="bg-[color-mix(in_oklab,var(--gold)_3%,transparent)] px-5 pb-3 sm:px-6">
                            {codeGroup.items.map((item) => (
                              <li
                                key={item.id}
                                className="flex flex-wrap items-center justify-between gap-2 border-t border-border/30 py-2.5 text-sm"
                              >
                                <span className="text-muted-foreground">
                                  {item.code || "—"}
                                  {item.article ? ` · ${item.article}` : ""}
                                </span>
                                <span className="flex items-center gap-3">
                                  <span className="tabular-nums text-foreground">
                                    {item.length || "—"} m
                                  </span>
                                  <StockBadge product={item} />
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}


function ProductCard({ product }: { product: CatalogProduct }) {
  return (
    <li className="surface-panel relative overflow-hidden rounded-2xl border border-gold/25 p-5">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-[var(--gradient-gold)] opacity-70"
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-gold/80">
            {product.nomenclature_type || "—"}
          </p>
          <p className="mt-1.5 font-sans text-xl font-semibold text-foreground">
            {product.code || "—"}
          </p>
        </div>
        <StockBadge product={product} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border/50 pt-4 text-sm">
        <div>
          <dt className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Dalyot
          </dt>
          <dd className="mt-1 tabular-nums text-foreground">{product.article || "—"}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Uzunluq
          </dt>
          <dd className="mt-1 tabular-nums text-foreground">{product.length || "—"}</dd>
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
          ? "inline-flex whitespace-nowrap rounded-full border border-gold/45 bg-[color-mix(in_oklab,var(--gold)_14%,transparent)] px-3.5 py-1.5 text-xs font-medium text-gold-soft"
          : "inline-flex whitespace-nowrap rounded-full border border-border/60 bg-muted/50 px-3.5 py-1.5 text-xs font-medium text-muted-foreground"
      }
    >
      {formatStock(product)}
    </span>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="surface-panel rounded-3xl border border-dashed border-gold/30 px-6 py-16 text-center">
      <p className="font-display text-xl font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
