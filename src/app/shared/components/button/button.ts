
import { Component, input } from '@angular/core';
import { LoadingSpinner } from '../loading-spinner/loading-spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonType = 'button' | 'submit' | 'reset';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [LoadingSpinner],
  templateUrl: './button.html',
  styleUrl: './button.css',
  host: {
    '[class.button-full-width]': 'fullWidth()'
  }
})
export class Button {
  variant = input<ButtonVariant>('primary');
  size = input<ButtonSize>('md');
  type = input<ButtonType>('button');
  loading = input(false);
  disabled = input(false);
  fullWidth = input(true);
  loadingText = input('Loading...');
}
