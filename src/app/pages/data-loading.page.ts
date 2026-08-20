import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { PaginationStrategy } from 'gnx-virtual-scroll';
import { PatientDesktopTableComponent } from '../demo/patient/patient-desktop-table';
import { PatientVirtualDataSource } from '../demo/patient/patient.data-source';

@Component({
  selector: 'app-data-loading-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PatientDesktopTableComponent, DecimalPipe],
  template: `
    <div class="page">
      <header class="page__header">
        <h2>Data loading</h2>
        <p class="page__lead">
          Choose how rows are fetched: infinite append, offset pages, cursor pages, or a full
          in-memory static array (still virtualized in the DOM).
        </p>
      </header>

      <div class="page__toolbar">
        <span class="page__label">Strategy</span>
        <div class="page__group" role="group" aria-label="Pagination strategy">
          @for (s of strategies; track s) {
            <button
              type="button"
              class="page__btn"
              [class.page__btn--active]="dataSource.strategy() === s"
              (click)="setStrategy(s)"
            >
              {{ s }}
            </button>
          }
        </div>

        <label class="page__select" [class.page__select--disabled]="dataSource.source.isStatic">
          <span>Items / page</span>
          <select
            [disabled]="dataSource.source.isStatic"
            [value]="dataSource.pageSize()"
            (change)="setPageSize(+$any($event.target).value)"
          >
            @for (n of pageSizeOptions; track n) {
              <option [value]="n" [selected]="dataSource.pageSize() === n">{{ n }}</option>
            }
          </select>
        </label>

        <label class="page__select" [class.page__select--disabled]="!dataSource.source.isStatic">
          <span>Static rows</span>
          <select
            [disabled]="!dataSource.source.isStatic"
            [value]="dataSource.staticCount()"
            (change)="setStaticCount(+$any($event.target).value)"
          >
            @for (n of staticCountOptions; track n) {
              <option [value]="n" [selected]="dataSource.staticCount() === n">
                {{ n | number }}
              </option>
            }
          </select>
        </label>

        <span class="page__meta">
          {{ dataSource.source.totalCount() | number }} total
          · loaded {{ dataSource.source.loadedCount() | number }}
        </span>
      </div>

      <div class="page__body">
        <app-patient-desktop-table title="Data loading" [checkboxSelection]="false" />
      </div>
    </div>
  `,
  styleUrl: './page-shared.scss',
})
export class DataLoadingPage {
  readonly dataSource = inject(PatientVirtualDataSource);
  readonly strategies: PaginationStrategy[] = [
    'infinite',
    'offset',
    'cursor',
    'static',
  ];
  readonly pageSizeOptions = [10, 25, 50, 100];
  readonly staticCountOptions = [100, 500, 1_000, 5_000, 10_000, 25_000];

  setStrategy(strategy: PaginationStrategy): void {
    this.dataSource.setStrategy(strategy);
  }

  setPageSize(size: number): void {
    this.dataSource.setPageSize(size);
  }

  setStaticCount(count: number): void {
    this.dataSource.setStaticCount(count);
  }
}
