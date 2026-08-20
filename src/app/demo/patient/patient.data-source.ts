import { Injectable, signal } from '@angular/core';
import {
  PaginationStrategy,
  SelectionModel,
  SortState,
  VirtualDataSource,
} from 'gnx-virtual-scroll';
import {
  PATIENT_TOTAL_COUNT,
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

  readonly strategy = this._strategy.asReadonly();

  readonly source = new VirtualDataSource<Patient>({
    fetchPage: (req) => fetchPatientsPage(req),
    trackBy: (p) => p.id,
    strategy: 'infinite',
    pageSize: 50,
    prefetchPages: 1,
    maxCachedPages: 24,
    loadMoreThreshold: 20,
    estimatedTotal: PATIENT_TOTAL_COUNT,
  });

  readonly selection = new SelectionModel<Patient>((p) => p.id);

  setStrategy(strategy: PaginationStrategy): void {
    this._strategy.set(strategy);
    this.source.reset(strategy);
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
