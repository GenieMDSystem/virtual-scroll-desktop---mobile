import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
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

/**
 * Shared desktop table host used by feature demo pages.
 * Feature-specific toolbars live on each page — not here.
 */
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

  readonly title = input('Desktop Virtual Table');
  readonly columnMode = input<ColumnMode | `${ColumnMode}`>(ColumnMode.force);
  readonly externalSorting = input(true);
  readonly sortType = input<SortType | `${SortType}`>(SortType.single);
  readonly checkboxSelection = input(true);
  /** Show a compact filter row above the table */
  readonly showFilter = input(false);
  /** Show selection count + clear */
  readonly showSelectionMeta = input(false);

  filterText = '';

  readonly onSort = (event: SortEvent<Patient>): void => {
    if (this.externalSorting()) {
      this.dataSource.source.applySorts(event.sorts);
    }
  };

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
