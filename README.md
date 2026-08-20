# GNX Virtual Scroll

Monorepo with:

| Path | Role |
|---|---|
| `projects/gnx-virtual-scroll` | Publishable Angular library `@gnx/virtual-scroll` |
| `src/` | Demo harness (patient desktop/mobile) |

## Develop

```bash
npm start                 # demo at http://localhost:4200
npm run build:lib         # build library → dist/gnx-virtual-scroll
npm run pack:lib          # build + npm pack (.tgz)
```

## Consume the package

### From this repo (path alias)

Demo already imports `@gnx/virtual-scroll` via `tsconfig.json` paths.

### From npm / local tarball

```bash
npm run pack:lib
# copy dist/gnx-virtual-scroll/gnx-virtual-scroll-0.1.0.tgz to your app
npm install ./gnx-virtual-scroll-0.1.0.tgz
npm install @angular/cdk
```

```ts
import {
  DesktopVirtualTableComponent,
  VirtualDataSource,
  ColumnDef,
} from '@gnx/virtual-scroll';
```

## Publish

```bash
npm run build:lib
cd dist/gnx-virtual-scroll
npm publish --access public
```
