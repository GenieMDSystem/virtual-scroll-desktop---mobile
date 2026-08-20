import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PatientDesktopTableComponent } from '../demo/patient/patient-desktop-table';

@Component({
  selector: 'app-selection-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PatientDesktopTableComponent],
  template: `
    <div class="page">
      <header class="page__header">
        <h2>Selection</h2>
        <p class="page__lead">
          Checkbox column with header select-all (indeterminate when partial). Row click adds to
          selection; Shift range, ⌘/Ctrl+A, Esc clear.
        </p>
      </header>
      <div class="page__body">
        <app-patient-desktop-table
          title="Selection"
          [checkboxSelection]="true"
          [showSelectionMeta]="true"
        />
      </div>
    </div>
  `,
  styleUrl: './page-shared.scss',
})
export class SelectionPage {}
