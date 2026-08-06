import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  MobileVirtualListComponent,
  VirtualItemDef,
} from '../../virtual-scroll';
import { PatientVirtualDataSource } from './patient.data-source';
import { Patient } from './patient.model';

@Component({
  selector: 'app-patient-mobile-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MobileVirtualListComponent, VirtualItemDef, DatePipe],
  templateUrl: './patient-mobile-list.html',
  styleUrl: './patient-mobile-list.scss',
})
export class PatientMobileListComponent {
  readonly dataSource = inject(PatientVirtualDataSource);
  readonly cardHeight = 156;

  approve(patient: Patient): void {
    this.dataSource.approve(patient.id);
  }

  reject(patient: Patient): void {
    this.dataSource.reject(patient.id);
  }

  report(patient: Patient): void {
    console.info('Report patient', patient.id);
  }
}
