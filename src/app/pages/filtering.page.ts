import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PatientDesktopTableComponent } from '../demo/patient/patient-desktop-table';

@Component({
  selector: 'app-filtering-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PatientDesktopTableComponent],
  template: `
    <div class="page">
      <header class="page__header">
        <h2>Filtering</h2>
        <p class="page__lead">
          Filter is applied on the shared data source (remote strategies re-query; static filters
          the in-memory array). Try name, ID, department, or status.
        </p>
      </header>
      <div class="page__body">
        <app-patient-desktop-table
          title="Filtering"
          [showFilter]="true"
          [checkboxSelection]="false"
        />
      </div>
    </div>
  `,
  styleUrl: './page-shared.scss',
})
export class FilteringPage {}
