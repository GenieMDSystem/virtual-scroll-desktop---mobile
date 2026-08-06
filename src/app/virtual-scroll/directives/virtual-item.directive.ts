import { Directive, TemplateRef, inject } from '@angular/core';
import { VirtualItemContext } from '../models/virtual-scroll.models';

/** Project a custom item/card template into {@link MobileVirtualListComponent}. */
@Directive({
  selector: 'ng-template[gnxVirtualItem]',
})
export class VirtualItemDef<T = unknown> {
  readonly templateRef = inject(TemplateRef<VirtualItemContext<T>>);
}
