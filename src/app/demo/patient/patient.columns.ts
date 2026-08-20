import { ColumnDef } from '@gnx/virtual-scroll';
import { Patient } from './patient.model';

/**
 * Frozen left = fixed ID + Patient Name (flex: 0).
 * Center columns flex to fill parent on resize.
 * Frozen right = Status + Actions.
 */
export const PATIENT_COLUMNS: ColumnDef<Patient>[] = [
  {
    key: 'id',
    header: 'ID',
    width: 110,
    minWidth: 88,
    maxWidth: 200,
    frozen: 'left',
    flex: 0,
    sortable: true,
  },
  {
    key: 'patientName',
    header: 'Patient Name',
    width: 180,
    minWidth: 140,
    maxWidth: 320,
    frozen: 'left',
    flex: 0,
    sortable: true,
  },
  {
    key: 'createdDate',
    header: 'Created Date',
    width: 140,
    minWidth: 110,
    flex: 1,
    sortable: true,
    valueAccessor: (p) => p.createdDate,
  },
  {
    key: 'kByName',
    header: 'K By Name',
    width: 150,
    minWidth: 120,
    flex: 1,
    sortable: true,
  },
  { key: 'gender', header: 'Gender', width: 90, minWidth: 72, flex: 0.5, sortable: true },
  { key: 'age', header: 'Age', width: 70, minWidth: 56, flex: 0.4, sortable: true },
  {
    key: 'department',
    header: 'Department',
    width: 140,
    minWidth: 110,
    flex: 1.2,
    sortable: true,
  },
  { key: 'room', header: 'Room', width: 90, minWidth: 72, flex: 0.5, sortable: true },
  { key: 'notes', header: 'Notes', width: 180, minWidth: 120, flex: 1.4 },
  {
    key: 'status',
    header: 'Status',
    width: 110,
    minWidth: 96,
    maxWidth: 160,
    frozen: 'right',
    flex: 0,
    sortable: true,
  },
  {
    key: 'actions',
    header: 'Actions',
    width: 170,
    minWidth: 150,
    maxWidth: 220,
    frozen: 'right',
    flex: 0,
    resizable: true,
    cellClass: 'td--actions',
  },
];
