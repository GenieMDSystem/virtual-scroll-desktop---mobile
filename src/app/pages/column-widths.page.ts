import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ColumnMode } from 'gnx-virtual-scroll';
import { PatientDesktopTableComponent } from '../demo/patient/patient-desktop-table';

@Component({
  selector: 'app-column-widths-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PatientDesktopTableComponent],
  template: `
    <div class="page">
      <header class="page__header">
        <h2>Column widths</h2>
        <p class="page__lead">
          ngx-datatable-style <code>ColumnMode</code>: standard (exact widths), flex (grow by
          weight), force (fill leftover). Drag any column edge to resize — siblings do not shrink.
        </p>
      </header>

      <div class="page__toolbar">
        <span class="page__label">ColumnMode</span>
        <div class="page__group" role="group" aria-label="Column width mode">
          @for (mode of modes; track mode) {
            <button
              type="button"
              class="page__btn"
              [class.page__btn--active]="columnMode() === mode"
              (click)="columnMode.set(mode)"
            >
              {{ mode }}
            </button>
          }
        </div>
      </div>

      <div class="page__body">
        <app-patient-desktop-table
          title="Column widths"
          [columnMode]="columnMode()"
          [checkboxSelection]="false"
        />
      </div>
    </div>
  `,
  styleUrl: './page-shared.scss',
})
export class ColumnWidthsPage {
  readonly modes = [ColumnMode.standard, ColumnMode.flex, ColumnMode.force] as const;
  readonly columnMode = signal<ColumnMode>(ColumnMode.force);
}
