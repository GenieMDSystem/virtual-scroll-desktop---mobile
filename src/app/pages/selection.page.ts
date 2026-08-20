import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { SelectionType } from 'gnx-virtual-scroll';
import { PatientDesktopTableComponent } from '../demo/patient/patient-desktop-table';
import { PatientVirtualDataSource } from '../demo/patient/patient.data-source';

@Component({
  selector: 'app-selection-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PatientDesktopTableComponent],
  template: `
    <div class="page">
      <header class="page__header">
        <h2>Selection</h2>
        <p class="page__lead">
          <strong>Multi</strong> — click row or checkbox to toggle; header select-all;
          Shift range; ⌘/Ctrl+A. <strong>Single</strong> — one row at a time; click again to
          clear. Esc clears in both modes.
        </p>
      </header>

      <div class="page__toolbar">
        <span class="page__label">SelectionType</span>
        <div class="page__group" role="group" aria-label="Selection type">
          <button
            type="button"
            class="page__btn"
            [class.page__btn--active]="selectionType() === SelectionType.single"
            (click)="setType(SelectionType.single)"
          >
            Single
          </button>
          <button
            type="button"
            class="page__btn"
            [class.page__btn--active]="selectionType() === SelectionType.multi"
            (click)="setType(SelectionType.multi)"
          >
            Multi
          </button>
        </div>
      </div>

      <div class="page__body">
        <app-patient-desktop-table
          title="Selection"
          [checkboxSelection]="true"
          [selectionType]="selectionType()"
          [showSelectionMeta]="true"
        />
      </div>
    </div>
  `,
  styleUrl: './page-shared.scss',
})
export class SelectionPage {
  readonly dataSource = inject(PatientVirtualDataSource);
  readonly SelectionType = SelectionType;
  readonly selectionType = signal<SelectionType>(SelectionType.multi);

  constructor() {
    effect(() => {
      void this.selectionType();
      this.dataSource.selection.clear();
    });
  }

  setType(type: SelectionType): void {
    this.selectionType.set(type);
  }
}
