import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { PatientDesktopTableComponent } from '../../demo/patient/patient-desktop-table';
import { PatientMobileListComponent } from '../../demo/patient/patient-mobile-list';

export type ViewportMode = 'desktop' | 'tablet' | 'mobile';

@Component({
  selector: 'app-viewport-switcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PatientDesktopTableComponent, PatientMobileListComponent],
  templateUrl: './viewport-switcher.html',
  styleUrl: './viewport-switcher.scss',
})
export class ViewportSwitcherComponent {
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);

  readonly mode = signal<ViewportMode>('desktop');

  constructor() {
    this.breakpoints
      .observe([
        '(min-width: 1024px)',
        '(min-width: 768px) and (max-width: 1023.98px)',
        '(max-width: 767.98px)',
      ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        if (state.breakpoints['(min-width: 1024px)']) {
          this.mode.set('desktop');
        } else if (state.breakpoints['(min-width: 768px) and (max-width: 1023.98px)']) {
          this.mode.set('tablet');
        } else {
          this.mode.set('mobile');
        }
      });
  }
}
