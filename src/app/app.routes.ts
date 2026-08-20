import { Routes } from '@angular/router';
import { DemoShellComponent } from './layout/demo-shell';

export const routes: Routes = [
  {
    path: '',
    component: DemoShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'responsive' },
      {
        path: 'responsive',
        loadComponent: () =>
          import('./pages/responsive.page').then((m) => m.ResponsivePage),
      },
      {
        path: 'data-loading',
        loadComponent: () =>
          import('./pages/data-loading.page').then((m) => m.DataLoadingPage),
      },
      {
        path: 'frozen-columns',
        loadComponent: () =>
          import('./pages/frozen-columns.page').then((m) => m.FrozenColumnsPage),
      },
      {
        path: 'column-widths',
        loadComponent: () =>
          import('./pages/column-widths.page').then((m) => m.ColumnWidthsPage),
      },
      {
        path: 'sorting',
        loadComponent: () =>
          import('./pages/sorting.page').then((m) => m.SortingPage),
      },
      {
        path: 'filtering',
        loadComponent: () =>
          import('./pages/filtering.page').then((m) => m.FilteringPage),
      },
      {
        path: 'selection',
        loadComponent: () =>
          import('./pages/selection.page').then((m) => m.SelectionPage),
      },
      {
        path: 'custom-templates',
        loadComponent: () =>
          import('./pages/custom-templates.page').then(
            (m) => m.CustomTemplatesPage,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'responsive' },
];
