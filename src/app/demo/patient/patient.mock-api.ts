import { Observable, delay, of } from 'rxjs';
import { PageRequest, PageResult, SortState } from 'gnx-virtual-scroll';
import { Patient, PatientStatus } from './patient.model';

const STATUSES: PatientStatus[] = ['pending', 'approved', 'rejected'];
const GENDERS: Array<Patient['gender']> = ['M', 'F', 'O'];
const DEPARTMENTS = [
  'Cardiology', 'Neurology', 'Oncology', 'Orthopedics', 'Pediatrics',
  'Radiology', 'Emergency', 'Dermatology', 'Psychiatry', 'General',
];
const FIRST_NAMES = [
  'Aarav', 'Priya', 'Rohan', 'Ananya', 'Vikram', 'Meera', 'Arjun', 'Sneha',
  'Karan', 'Isha', 'Nikhil', 'Pooja', 'Rahul', 'Neha', 'Aditya', 'Kavya',
];
const LAST_NAMES = [
  'Sharma', 'Patel', 'Singh', 'Reddy', 'Nair', 'Gupta', 'Iyer', 'Mehta',
  'Joshi', 'Kapoor', 'Desai', 'Malhotra', 'Chopra', 'Banerjee', 'Verma',
];

export const PATIENT_TOTAL_COUNT = 50_000;
const LATENCY_MS = 220;
const baseTime = Date.now();
const statusOverrides = new Map<string, PatientStatus>();

function buildPatient(i: number): Patient {
  const first = FIRST_NAMES[i % FIRST_NAMES.length];
  const last = LAST_NAMES[i % LAST_NAMES.length];
  const patient: Patient = {
    id: `P-${String(i + 1).padStart(6, '0')}`,
    patientName: `${first} ${last}`,
    createdDate: new Date(baseTime - i * 3_600_000),
    kByName: `Dr. ${LAST_NAMES[(i + 3) % LAST_NAMES.length]}`,
    status: STATUSES[i % STATUSES.length],
    gender: GENDERS[i % GENDERS.length],
    age: 18 + (i % 60),
    department: DEPARTMENTS[i % DEPARTMENTS.length],
    room: `${100 + (i % 40)}${String.fromCharCode(65 + (i % 4))}`,
    notes: i % 5 === 0 ? 'Follow-up required' : 'Routine checkup',
  };
  const override = statusOverrides.get(patient.id);
  if (override) {
    patient.status = override;
  }
  return patient;
}

function encodeCursor(offset: number): string {
  return btoa(String(offset));
}

function decodeCursor(cursor: string | null | undefined): number {
  if (!cursor) {
    return 0;
  }
  const n = Number(atob(cursor));
  return Number.isFinite(n) ? n : 0;
}

type IndexCache = { key: string; indices: number[] };
let indexCache: IndexCache | null = null;

function patientSortValue(p: Patient, key: string): string | number {
  const value = (p as unknown as Record<string, unknown>)[key];
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === 'number') {
    return value;
  }
  return String(value ?? '').toLowerCase();
}

function resolveIndices(filter?: string, sort?: SortState | null): number[] | null {
  const q = (filter ?? '').trim().toLowerCase();
  if (!q && !sort) {
    return null; // fast path: sequential indices 0..N
  }

  const key = `${q}|${sort?.key ?? ''}|${sort?.direction ?? ''}`;
  if (indexCache?.key === key) {
    return indexCache.indices;
  }

  let indices: number[];
  if (!q) {
    indices = Array.from({ length: PATIENT_TOTAL_COUNT }, (_, i) => i);
  } else {
    indices = [];
    for (let i = 0; i < PATIENT_TOTAL_COUNT; i++) {
      const p = buildPatient(i);
      const hay =
        `${p.id} ${p.patientName} ${p.kByName} ${p.department} ${p.status} ${p.notes}`.toLowerCase();
      if (hay.includes(q)) {
        indices.push(i);
      }
    }
  }

  if (sort) {
    const decorated = indices.map((i) => ({
      i,
      v: patientSortValue(buildPatient(i), sort.key),
    }));
    decorated.sort((a, b) => {
      let cmp = 0;
      if (a.v < b.v) cmp = -1;
      else if (a.v > b.v) cmp = 1;
      return sort.direction === 'asc' ? cmp : -cmp;
    });
    indices = decorated.map((d) => d.i);
  }

  indexCache = { key, indices };
  return indices;
}

/**
 * Mock patient API — offset/cursor pagination with filter + sort and latency.
 */
export function fetchPatientsPage(
  request: PageRequest,
): Observable<PageResult<Patient>> {
  const indices = resolveIndices(request.filter, request.sort);
  const start =
    request.cursor !== undefined
      ? decodeCursor(request.cursor)
      : (request.offset ?? 0);

  const total = indices?.length ?? PATIENT_TOTAL_COUNT;
  const end = Math.min(total, start + request.limit);
  const items: Patient[] = [];
  for (let pos = start; pos < end; pos++) {
    const sourceIndex = indices ? indices[pos] : pos;
    items.push(buildPatient(sourceIndex));
  }

  const nextStart = start + items.length;
  const hasMore = nextStart < total;

  return of({
    items,
    totalCount: total,
    hasMore,
    nextCursor: hasMore ? encodeCursor(nextStart) : null,
  }).pipe(delay(LATENCY_MS));
}

export function patchPatientStatus(id: string, status: PatientStatus): void {
  statusOverrides.set(id, status);
  indexCache = null;
}
