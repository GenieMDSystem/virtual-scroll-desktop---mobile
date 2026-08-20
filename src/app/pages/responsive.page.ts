import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ViewportSwitcherComponent } from '../features/viewport/viewport-switcher';

@Component({
  selector: 'app-responsive-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ViewportSwitcherComponent],
  template: `
    <div class="page">
      <header class="page__header">
        <h2>Responsive</h2>
        <p class="page__lead">
          Switches UI by viewport: desktop/tablet use the virtual table; below 768px uses the
          mobile card list. Resize the browser to see the change.
        </p>
      </header>
      <div class="page__body">
        <app-viewport-switcher />
      </div>
    </div>
  `,
  styleUrl: './page-shared.scss',
})
export class ResponsivePage {}
