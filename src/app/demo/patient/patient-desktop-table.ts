import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ColumnMode,
  DesktopVirtualTableComponent,
  SortEvent,
  SortType,
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
  readonly ColumnMode = ColumnMode;
  readonly SortType = SortType;
  filterText = '';

  /**
   * ngx-datatable-style toggle:
   * - external=true → API/dataSource sorts (server-side)
   * - external=false → table sorts loaded rows client-side
   */
  readonly externalSorting = signal(true);
  readonly sortType = signal<SortType>(SortType.single);
  readonly columnMode = signal<ColumnMode>(ColumnMode.force);

  readonly onSort = (event: SortEvent<Patient>): void => {
    // External hosts apply the emitted sorts list
    if (this.externalSorting()) {
      this.dataSource.source.applySorts(event.sorts);
    }
  };

  setExternalSorting(external: boolean): void {
    this.externalSorting.set(external);
    this.dataSource.source.clearSort();
  }

  setSortType(type: SortType): void {
    this.sortType.set(type);
    this.dataSource.source.clearSort();
  }

  setColumnMode(mode: ColumnMode): void {
    this.columnMode.set(mode);
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
