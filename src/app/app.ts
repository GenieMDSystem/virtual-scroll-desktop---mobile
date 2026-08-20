import { Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ViewportSwitcherComponent } from './features/viewport/viewport-switcher';
import { PatientVirtualDataSource } from './demo/patient/patient.data-source';
import { PaginationStrategy } from 'gnx-virtual-scroll';

@Component({
  selector: 'app-root',
  imports: [ViewportSwitcherComponent, DecimalPipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly title = 'Enterprise CDK Virtual Scroll — Segment 5';
  readonly dataSource = inject(PatientVirtualDataSource);

  readonly strategies: PaginationStrategy[] = [
    'infinite',
    'offset',
    'cursor',
    'static',
  ];

  setStrategy(strategy: PaginationStrategy): void {
    this.dataSource.setStrategy(strategy);
  }
}
