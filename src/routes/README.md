# Routes

The client-only TanStack React Router uses hash history for GitHub Pages.

| Route file | URL |
| --- | --- |
| `index.tsx` | `/#/` |

`routeTree.gen.ts` maps these route modules. When adding a route, update the
route tree and its route-type map; no server or SSR entry is required.
