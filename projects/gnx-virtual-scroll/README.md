# @gnx/virtual-scroll

Enterprise Angular CDK virtual scroll library — desktop virtualized table, mobile card list, shared data source, cache, frozen columns, resize, and internal/external sorting.

## Install

```bash
npm install @gnx/virtual-scroll @angular/cdk
```

Peer dependencies: `@angular/core`, `@angular/common`, `@angular/cdk`, `rxjs` (Angular 21+).

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
