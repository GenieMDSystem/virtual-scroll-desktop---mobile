import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DesktopVirtualTableComponent,
  SortState,
  VirtualCellDef,
} from 'gnx-virtual-scroll';
import { PATIENT_COLUMNS } from './patient.columns';
import { PatientVirtualDataSource } from './patient.data-source';
import { Patient } from './patient.model';

@Component({
  selector: 'app-patient-desktop-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DesktopVirtualTableComponent,
    VirtualCellDef,
    DatePipe,
    DecimalPipe,
    FormsModule,
  ],
  templateUrl: './patient-desktop-table.html',
  styleUrl: './patient-desktop-table.scss',
})
export class PatientDesktopTableComponent {
  readonly dataSource = inject(PatientVirtualDataSource);
  readonly columns = PATIENT_COLUMNS;
  filterText = '';

  /**
   * ngx-datatable-style toggle:
   * - external=true → API/dataSource sorts (server-side)
   * - external=false → table sorts loaded rows client-side
   */
  readonly externalSorting = signal(true);

  readonly onExternalSort = (state: SortState | null): void => {
    this.dataSource.source.applySort(state);
  };

  setExternalSorting(external: boolean): void {
    this.externalSorting.set(external);
    // Clear any active sort when switching modes so state stays coherent
    this.dataSource.source.clearSort();
  }

  applyFilter(): void {
    this.dataSource.setFilter(this.filterText);
  }

  clearFilter(): void {
    this.filterText = '';
    this.dataSource.setFilter('');
  }

  clearSelection(): void {
    this.dataSource.selection.clear();
  }

  approve(patient: Patient, event: Event): void {
    event.stopPropagation();
    this.dataSource.approve(patient.id);
  }

  reject(patient: Patient, event: Event): void {
    event.stopPropagation();
    this.dataSource.reject(patient.id);
  }
}
