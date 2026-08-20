import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { DEMO_NAV } from './demo-nav';

@Component({
  selector: 'app-demo-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './demo-shell.html',
  styleUrl: './demo-shell.scss',
})
export class DemoShellComponent {
  readonly nav = DEMO_NAV;
}
