import { Directive, TemplateRef, inject, input } from '@angular/core';
import { VirtualCellContext } from '../models/virtual-scroll.models';

/**
 * Project a custom cell template into {@link DesktopVirtualTableComponent}.
 *
 * ngx-datatable-style usage:
 * ```html
 * <ng-template gnxVirtualCell column="status" let-row let-value="value">
 *   <span>{{ value }}</span>
 * </ng-template>
 * ```
 */
@Directive({
  selector: 'ng-template[gnxVirtualCell]',
})
export class VirtualCellDef<T = unknown> {
  /** Column `key` this template renders */
  readonly column = input.required<string>();
  readonly templateRef = inject(TemplateRef<VirtualCellContext<T>>);
}
