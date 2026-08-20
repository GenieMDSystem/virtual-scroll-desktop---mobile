import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import {
  ColumnDef,
  ColumnMode,
  DesktopVirtualTableComponent,
  VirtualCellDef,
  VirtualHeaderDef,
} from 'gnx-virtual-scroll';
import { PatientVirtualDataSource } from '../demo/patient/patient.data-source';
import { Patient } from '../demo/patient/patient.model';

/** Columns used for the custom-templates demo (subset + custom widths). */
const TEMPLATE_COLUMNS: ColumnDef<Patient>[] = [
  {
    key: 'id',
    header: 'ID',
    width: 110,
    minWidth: 88,
    frozen: 'left',
    flex: 0,
    sortable: true,
  },
  {
    key: 'patientName',
    header: 'Patient',
    width: 220,
    minWidth: 160,
    frozen: 'left',
    flex: 0,
    sortable: true,
  },
  {
    key: 'createdDate',
    header: 'Started',
    width: 160,
    minWidth: 130,
    flex: 1,
    sortable: true,
  },
  {
    key: 'department',
    header: 'Department',
    width: 150,
    minWidth: 120,
    flex: 1,
    sortable: true,
  },
  {
    key: 'status',
    header: 'Status',
    width: 130,
    minWidth: 110,
    flex: 0,
    sortable: true,
  },
  {
    key: 'notes',
    header: 'Notes',
    width: 200,
    minWidth: 140,
    flex: 1.2,
  },
  {
    key: 'actions',
    header: 'Actions',
    width: 200,
    minWidth: 180,
    maxWidth: 240,
    flex: 0,
    resizable: false,
  },
];

/**
 * ngx-datatable-style projected cell/header templates via
 * `gnxVirtualCell` / `gnxVirtualHeader` (let-row, let-value).
 */
@Component({
  selector: 'app-custom-templates-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DesktopVirtualTableComponent,
    VirtualCellDef,
    VirtualHeaderDef,
    DatePipe,
    TitleCasePipe,
  ],
  template: `
    <div class="page">
      <header class="page__header">
        <h2>Custom templates</h2>
        <p class="page__lead">
          User-defined column templates like ngx-datatable
          (<code>ngx-datatable-cell-template</code>). Project
          <code>gnxVirtualCell</code> / <code>gnxVirtualHeader</code> with
          <code>let-row</code>, <code>let-value="value"</code>, and
          <code>let-column="column"</code>.
        </p>
      </header>

      <div class="page__body tpl-demo">
        <gnx-desktop-virtual-table
          class="tpl-demo__table"
          [dataSource]="dataSource.source"
          [columns]="columns"
          [columnMode]="ColumnMode.force"
          [checkboxSelection]="false"
          title="Custom column templates"
          ariaLabel="Patient table with custom templates"
        >
          <!-- Header template -->
          <ng-template gnxVirtualHeader column="patientName" let-col>
            <span class="hdr-with-hint">
              {{ col.header }}
              <em>avatar + name</em>
            </span>
          </ng-template>

          <!-- Cell: patient with initials avatar (encounters-style) -->
          <ng-template
            gnxVirtualCell
            column="patientName"
            let-row
            let-value="value"
          >
            <div class="cell-user">
              <span class="cell-user__avatar" [attr.data-tone]="tone(row)">
                {{ initials(value) }}
              </span>
              <span class="cell-user__name">{{ value | titlecase }}</span>
            </div>
          </ng-template>

          <!-- Cell: formatted date via let-value -->
          <ng-template gnxVirtualCell column="createdDate" let-value="value">
            <span>{{ (value | date: 'medium') || '—' }}</span>
          </ng-template>

          <!-- Cell: status badge -->
          <ng-template gnxVirtualCell column="status" let-value="value">
            <span class="status" [attr.data-status]="value">{{ value }}</span>
          </ng-template>

          <!-- Cell: notes with fallback -->
          <ng-template gnxVirtualCell column="notes" let-value="value">
            <span class="notes">{{ value || '—' }}</span>
          </ng-template>

          <!-- Cell: action buttons (stopPropagation like encounters) -->
          <ng-template gnxVirtualCell column="actions" let-row>
            <div class="cell-actions">
              <button
                type="button"
                class="btn btn--primary"
                (click)="viewDetails(row, $event)"
              >
                Details
              </button>
              <button
                type="button"
                class="btn btn--ghost"
                (click)="approve(row, $event)"
              >
                Approve
              </button>
            </div>
          </ng-template>
        </gnx-desktop-virtual-table>
      </div>
    </div>
  `,
  styleUrls: ['./page-shared.scss', './custom-templates.page.scss'],
})
export class CustomTemplatesPage {
  readonly dataSource = inject(PatientVirtualDataSource);
  readonly columns = TEMPLATE_COLUMNS;
  readonly ColumnMode = ColumnMode;

  initials(name: unknown): string {
    const parts = String(name ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return '?';
    return parts
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join('');
  }

  tone(row: Patient): string {
    const n = row.id.charCodeAt(row.id.length - 1) % 3;
    return ['a', 'b', 'c'][n];
  }

  viewDetails(row: Patient, event: Event): void {
    event.stopPropagation();
    console.info('Details', row.id, row.patientName);
  }

  approve(row: Patient, event: Event): void {
    event.stopPropagation();
    this.dataSource.approve(row.id);
  }
}
