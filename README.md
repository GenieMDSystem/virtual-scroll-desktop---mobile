# GNX Virtual Scroll

Monorepo with:

| Path | Role |
|---|---|
| `projects/gnx-virtual-scroll` | Publishable Angular library `gnx-virtual-scroll` |
| `src/` | Demo harness (patient desktop/mobile) |

## Develop

```bash
npm start                 # demo at http://localhost:4200
npm run build:lib         # build library → dist/gnx-virtual-scroll
npm run pack:lib          # build + npm pack (.tgz)
```

## Consume the package

Requires **Angular 19, 20, or 21** + matching `@angular/cdk`.

### From this repo (path alias)

Demo already imports `gnx-virtual-scroll` via `tsconfig.json` paths.

### From npm / local tarball

```bash
npm run pack:lib
# copy dist/gnx-virtual-scroll/*.tgz to your app
npm install ./gnx-virtual-scroll-0.1.1.tgz
npm install @angular/cdk   # use ^19 / ^20 / ^21 to match your Angular
```

```ts
import {
  DesktopVirtualTableComponent,
  VirtualDataSource,
  ColumnDef,
} from 'gnx-virtual-scroll';
```

## Publish

```bash
npm run build:lib
cd dist/gnx-virtual-scroll
npm publish
```
