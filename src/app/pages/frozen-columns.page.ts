import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PatientDesktopTableComponent } from '../demo/patient/patient-desktop-table';

@Component({
  selector: 'app-frozen-columns-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PatientDesktopTableComponent],
  template: `
    <div class="page">
      <header class="page__header">
        <h2>Frozen columns</h2>
        <p class="page__lead">
          ID and Patient Name are frozen left (PIN). Horizontal scroll moves center columns while
          frozen panes stay put — three synced CDK viewports.
        </p>
      </header>
      <div class="page__body">
        <app-patient-desktop-table title="Frozen columns" [checkboxSelection]="false" />
      </div>
    </div>
  `,
  styleUrl: './page-shared.scss',
})
export class FrozenColumnsPage {}
