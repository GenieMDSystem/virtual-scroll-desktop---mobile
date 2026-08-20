# @gnx/virtual-scroll

Enterprise Angular CDK virtual scroll library — desktop virtualized table, mobile card list, shared data source, cache, frozen columns, resize, and internal/external sorting.

## Angular support

| Angular | Supported |
|---|---|
| **19.x** | Yes |
| **20.x** | Yes |
| **21.x** | Yes (this repo’s demo) |

Use a matching `@angular/cdk` major (19 with Angular 19, etc.).

APIs used (signals, `input()` / `output()`, signal queries, `@if` / `@for`) all exist in Angular 19+.

## Install

```bash
npm install @gnx/virtual-scroll @angular/cdk
```

Peer dependencies: `@angular/core`, `@angular/common`, `@angular/cdk` **>=19 <22**, `rxjs` ^7.8.

### Angular 19 apps

```bash
npm install @gnx/virtual-scroll @angular/cdk@^19
```

If you hit Ivy compilation mismatches with a prebuilt `dist` from a newer Angular CLI, build the library in an Angular 19 workspace (or consume the `projects/gnx-virtual-scroll` sources via path mapping).

## Quick start

```ts
import {
  DesktopVirtualTableComponent,
  MobileVirtualListComponent,
  VirtualDataSource,
  VirtualCellDef,
  VirtualItemDef,
  ColumnDef,
} from '@gnx/virtual-scroll';
```

```html
<gnx-desktop-virtual-table
  [dataSource]="source"
  [columns]="columns"
  [externalSorting]="true"
  (sort)="onSort($event)"
>
  <ng-template gnxVirtualCell column="status" let-row>
    {{ row.status }}
  </ng-template>
</gnx-desktop-virtual-table>
```

## Build this package (from monorepo root)

```bash
npm run build:lib
```

Output: `dist/gnx-virtual-scroll`

## Publish

```bash
npm run build:lib
cd dist/gnx-virtual-scroll
npm publish --access public
```
