import { Directive, TemplateRef, inject, input } from '@angular/core';
import { VirtualHeaderContext } from '../models/virtual-scroll.models';

/**
 * Optional custom header label/content for a column.
 *
 * ```html
 * <ng-template gnxVirtualHeader column="status" let-col>
 *   <strong>{{ col.header }}</strong>
 * </ng-template>
 * ```
 */
@Directive({
  selector: 'ng-template[gnxVirtualHeader]',
})
export class VirtualHeaderDef<T = unknown> {
  readonly column = input.required<string>();
  readonly templateRef = inject(TemplateRef<VirtualHeaderContext<T>>);
}
