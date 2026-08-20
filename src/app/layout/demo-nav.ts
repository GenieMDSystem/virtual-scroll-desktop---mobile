export interface DemoNavItem {
  path: string;
  label: string;
  blurb: string;
}

export const DEMO_NAV: DemoNavItem[] = [
  {
    path: 'responsive',
    label: 'Responsive',
    blurb: 'Desktop table ↔ mobile cards by breakpoint',
  },
  {
    path: 'data-loading',
    label: 'Data loading',
    blurb: 'Infinite, offset, cursor, and static strategies',
  },
  {
    path: 'frozen-columns',
    label: 'Frozen columns',
    blurb: 'Pinned left columns with synced panes',
  },
  {
    path: 'column-widths',
    label: 'Column widths',
    blurb: 'standard / flex / force + drag resize',
  },
  {
    path: 'sorting',
    label: 'Sorting',
    blurb: 'Internal vs external · single vs multi',
  },
  {
    path: 'filtering',
    label: 'Filtering',
    blurb: 'Client / remote filter against the data source',
  },
  {
    path: 'selection',
    label: 'Selection',
    blurb: 'Checkbox column, select-all, range select',
  },
];
