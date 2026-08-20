import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { SortType } from 'gnx-virtual-scroll';
import { PatientDesktopTableComponent } from '../demo/patient/patient-desktop-table';
import { PatientVirtualDataSource } from '../demo/patient/patient.data-source';

@Component({
  selector: 'app-sorting-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PatientDesktopTableComponent],
  template: `
    <div class="page">
      <header class="page__header">
        <h2>Sorting</h2>
        <p class="page__lead">
          Click column sort icons. Internal sorts the loaded window client-side; external emits
          <code>SortEvent</code> for the host/API. Single keeps one column; multi stacks sorts with
          order badges.
        </p>
      </header>

      <div class="page__toolbar">
        <span class="page__label">Mode</span>
        <div class="page__group" role="group" aria-label="Sorting mode">
          <button
            type="button"
            class="page__btn"
            [class.page__btn--active]="!externalSorting()"
            (click)="setExternal(false)"
          >
            Internal
          </button>
          <button
            type="button"
            class="page__btn"
            [class.page__btn--active]="externalSorting()"
            (click)="setExternal(true)"
          >
            External
          </button>
        </div>

        <span class="page__label">Type</span>
        <div class="page__group" role="group" aria-label="Sort type">
          <button
            type="button"
            class="page__btn"
            [class.page__btn--active]="sortType() === SortType.single"
            (click)="setSortType(SortType.single)"
          >
            Single
          </button>
          <button
            type="button"
            class="page__btn"
            [class.page__btn--active]="sortType() === SortType.multi"
            (click)="setSortType(SortType.multi)"
          >
            Multi
          </button>
        </div>

        @if (dataSource.source.sorts(); as sorts) {
          @if (sorts.length) {
            <span class="page__meta">
              Active:
              @for (s of sorts; track s.prop; let i = $index) {
                @if (i > 0) {
                  ,
                }
                {{ s.prop }} {{ s.dir }}
              }
            </span>
          }
        }
      </div>

      <div class="page__body">
        <app-patient-desktop-table
          title="Sorting"
          [externalSorting]="externalSorting()"
          [sortType]="sortType()"
          [checkboxSelection]="false"
        />
      </div>
    </div>
  `,
  styleUrl: './page-shared.scss',
})
export class SortingPage {
  readonly dataSource = inject(PatientVirtualDataSource);
  readonly SortType = SortType;
  readonly externalSorting = signal(true);
  readonly sortType = signal<SortType>(SortType.single);

  setExternal(external: boolean): void {
    this.externalSorting.set(external);
    this.dataSource.source.clearSort();
  }

  setSortType(type: SortType): void {
    this.sortType.set(type);
    this.dataSource.source.clearSort();
  }
}
