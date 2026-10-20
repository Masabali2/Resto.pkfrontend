import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-testing',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './testing.html',
  styleUrl: './testing.css'
})
export class Testing {}
