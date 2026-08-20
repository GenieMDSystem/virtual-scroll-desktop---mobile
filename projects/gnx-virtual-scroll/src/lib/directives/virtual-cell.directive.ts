import { Directive, TemplateRef, inject, input } from '@angular/core';
import { VirtualCellContext } from '../models/virtual-scroll.models';

/** Project a custom cell template into {@link DesktopVirtualTableComponent}. */
@Directive({
  selector: 'ng-template[gnxVirtualCell]',
})
export class VirtualCellDef<T = unknown> {
  readonly column = input.required<string>();
  readonly templateRef = inject(TemplateRef<VirtualCellContext<T>>);
}
