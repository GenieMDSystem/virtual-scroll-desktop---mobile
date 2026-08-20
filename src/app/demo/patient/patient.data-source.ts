import { Injectable, signal } from '@angular/core';
import {
  PaginationStrategy,
  SelectionModel,
  SortState,
  VirtualDataSource,
} from 'gnx-virtual-scroll';
import {
  PATIENT_TOTAL_COUNT,
  buildPatientsArray,
  fetchPatientsPage,
  patchPatientStatus,
} from './patient.mock-api';
import { Patient, PatientStatus } from './patient.model';

/**
 * Patient-domain adapter over the generic {@link VirtualDataSource}.
 * Desktop table and mobile list both inject this shared instance.
 */
@Injectable({ providedIn: 'root' })
export class PatientVirtualDataSource {
  private readonly _strategy = signal<PaginationStrategy>('infinite');
  private readonly _pageSize = signal(25);

  readonly strategy = this._strategy.asReadonly();
  readonly pageSize = this._pageSize.asReadonly();

  readonly source = new VirtualDataSource<Patient>({
    fetchPage: (req) => fetchPatientsPage(req),
    trackBy: (p) => p.id,
    strategy: 'infinite',
    pageSize: 25,
    prefetchPages: 1,
    maxCachedPages: 24,
    loadMoreThreshold: 15,
    estimatedTotal: PATIENT_TOTAL_COUNT,
    filterFn: (p, q) =>
      `${p.id} ${p.patientName} ${p.kByName} ${p.department} ${p.status}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  });

  readonly selection = new SelectionModel<Patient>((p) => p.id);

  setStrategy(strategy: PaginationStrategy): void {
    this._strategy.set(strategy);

    if (strategy === 'static') {
      this.source.setData(buildPatientsArray());
      return;
    }

    this.source.reset(strategy);
  }

  setPageSize(size: number): void {
    this._pageSize.set(size);
    this.source.setPageSize(size);
  }

  setFilter(query: string): void {
    this.source.setFilter(query);
  }

  toggleSort(key: string): void {
    this.source.setSort(key);
  }

  applySort(state: SortState | null): void {
    this.source.applySort(state);
  }

  approve(id: string): void {
    this.patchStatus(id, 'approved');
  }

  reject(id: string): void {
    this.patchStatus(id, 'rejected');
  }

  private patchStatus(id: string, status: PatientStatus): void {
    patchPatientStatus(id, status);
    this.source.patchById(id, (p) => ({ ...p, status }));
  }
}
