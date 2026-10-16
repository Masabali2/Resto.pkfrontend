import { Component  , input} from '@angular/core';

@Component({
  imports: [],
  selector: 'app-inline-error',
  styleUrl: './inline-error.css',
  templateUrl: './inline-error.html',
})
export class InlineError {
  message = input<string | null>( null);
}
