# Armada carpet catalog

Static React + Vite catalog published at
<https://qafarlikerim.github.io/armada-kovrolin/>.

## Update the product catalog

The catalog source is [`public/data/stock.json`](./public/data/stock.json).
Replace its contents with the latest JSON export from 1C, save the file, and
commit/push the change to GitHub. GitHub Actions builds and publishes the
updated catalog. The site reads the file directly; it does not use a database,
API, import screen, or secrets.

The file can contain a top-level array of product rows, or an object whose
`items`, `data`, `products`, `rows`, `Товары`, or `Номенклатура` property is
the product array. For example:

```json
[
  {
    "type": "Quality Hummer(Platinum)",
    "name": "70-1",
    "article": "0637",
    "quantity": 15,
    "area": "35",
    "image_url": "/armada-kovrolin/images/70-1.jpg",
    "description": "Product description"
  }
]
```

The current 1C export has 170 rows with string fields `name`, `article`, and
`type`, and numeric fields `area` and `quantity`. The catalog maps these to
product code, article, nomenclature type, length, and stock, respectively.
The reader tolerates the UTF-8 BOM and 1C's non-breaking thousands separators
in unquoted numbers without modifying the source file.

Keep the original 1C fields and values. The existing field aliases and product
identity rules in `src/lib/product-mapping.ts` are used unchanged. Products
with different articles remain separate even when their names match.

This is a full-file replacement, not a database sync: a product omitted from
the new JSON will not be available on the site. If you need to keep an older
product visible as out of stock, include its row in the new JSON with a
zero quantity.

## Local development and checks

```sh
npm ci
npm run dev
npm run typecheck
npm run lint
npm run build
```

## GitHub Pages

In repository **Settings → Pages**, select **GitHub Actions** as the source.
Push to `main` or run **Deploy static site to GitHub Pages** from the Actions
tab. Vite uses the `/armada-kovrolin/` base path, and client-side hash routing
supports direct links and page reloads.
